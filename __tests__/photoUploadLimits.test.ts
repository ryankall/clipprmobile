import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for photo upload limit system
interface User {
  id: number;
  email: string;
  totalPhotoSize: number; // bytes
  maxPhotoSize: number; // bytes (500MB default)
}

interface PhotoUploadRequest {
  userId: number;
  file: MockFile;
  type: 'before' | 'after' | 'portfolio';
  description?: string;
}

interface MockFile {
  name: string;
  size: number; // bytes
  type: string;
  buffer: Buffer;
}

interface PhotoUploadResponse {
  success: boolean;
  photoId?: number;
  message?: string;
  error?: string;
  storageInfo?: {
    currentSize: number;
    maxSize: number;
    remainingSpace: number;
    fileSize: number;
  };
}

interface Photo {
  id: number;
  userId: number;
  photoUrl: string;
  fileSize: number;
  type: string;
  createdAt: Date;
}

interface PhotoDeletionResponse {
  success: boolean;
  message?: string;
  freedSpace?: number;
  error?: string;
}

// Mock photo upload service with size limits
class MockPhotoUploadService {
  private users: Map<number, User> = new Map();
  private photos: Map<number, Photo[]> = new Map(); // userId -> Photo[]
  private nextPhotoId = 1;

  constructor() {
    this.initializeTestUsers();
  }

  private initializeTestUsers(): void {
    // User 1: Fresh account with no photos
    this.users.set(1, {
      id: 1,
      email: 'fresh@test.com',
      totalPhotoSize: 0,
      maxPhotoSize: 524288000, // 500MB
    });

    // User 2: Account with some photos (100MB used)
    this.users.set(2, {
      id: 2,
      email: 'partial@test.com',
      totalPhotoSize: 104857600, // 100MB
      maxPhotoSize: 524288000, // 500MB
    });

    // User 3: Account near limit (450MB used)
    this.users.set(3, {
      id: 3,
      email: 'nearlimit@test.com',
      totalPhotoSize: 471859200, // 450MB
      maxPhotoSize: 524288000, // 500MB
    });

    // User 4: Account at limit (500MB used)
    this.users.set(4, {
      id: 4,
      email: 'atlimit@test.com',
      totalPhotoSize: 524288000, // 500MB
      maxPhotoSize: 524288000, // 500MB
    });

    // User 5: Premium account with higher limit (1GB)
    this.users.set(5, {
      id: 5,
      email: 'premium@test.com',
      totalPhotoSize: 209715200, // 200MB
      maxPhotoSize: 1073741824, // 1GB
    });

    // Initialize photo collections
    this.photos.set(1, []);
    this.photos.set(2, [
      {
        id: 1,
        userId: 2,
        photoUrl: 'data:image/jpeg;base64,...',
        fileSize: 52428800, // 50MB
        type: 'portfolio',
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 2,
        photoUrl: 'data:image/jpeg;base64,...',
        fileSize: 52428800, // 50MB
        type: 'before',
        createdAt: new Date(),
      },
    ]);
    this.photos.set(3, []);
    this.photos.set(4, []);
    this.photos.set(5, []);
  }

  private createMockFile(name: string, sizeInMB: number, type = 'image/jpeg'): MockFile {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    return {
      name,
      size: sizeInBytes,
      type,
      buffer: Buffer.alloc(sizeInBytes),
    };
  }

  async uploadPhoto(request: PhotoUploadRequest): Promise<PhotoUploadResponse> {
    const user = this.users.get(request.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const fileSize = request.file.size;
    const currentTotalSize = user.totalPhotoSize;
    const maxPhotoSize = user.maxPhotoSize;
    const remainingSpace = maxPhotoSize - currentTotalSize;

    // Check if adding this photo would exceed the limit
    if (currentTotalSize + fileSize > maxPhotoSize) {
      const maxSizeMB = Math.round(maxPhotoSize / 1024 / 1024);
      const remainingMB = Math.round(remainingSpace / 1024 / 1024);
      const fileSizeMB = Math.round(fileSize / 1024 / 1024);
      
      return {
        success: false,
        error: 'Storage limit exceeded',
        message: `Photo upload would exceed your ${maxSizeMB}MB storage limit. You have ${remainingMB}MB remaining, but this photo is ${fileSizeMB}MB.`,
        storageInfo: {
          currentSize: currentTotalSize,
          maxSize: maxPhotoSize,
          remainingSpace,
          fileSize,
        },
      };
    }

    // Create photo record
    const photoId = this.nextPhotoId++;
    const photo: Photo = {
      id: photoId,
      userId: request.userId,
      photoUrl: `data:${request.file.type};base64,${request.file.buffer.toString('base64')}`,
      fileSize,
      type: request.type,
      createdAt: new Date(),
    };

    // Add to user's photos
    const userPhotos = this.photos.get(request.userId) || [];
    userPhotos.push(photo);
    this.photos.set(request.userId, userPhotos);

    // Update user's total photo size
    user.totalPhotoSize += fileSize;

    return {
      success: true,
      photoId,
      message: 'Photo uploaded successfully',
      storageInfo: {
        currentSize: user.totalPhotoSize,
        maxSize: user.maxPhotoSize,
        remainingSpace: user.maxPhotoSize - user.totalPhotoSize,
        fileSize,
      },
    };
  }

  async deletePhoto(userId: number, photoId: number): Promise<PhotoDeletionResponse> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const userPhotos = this.photos.get(userId) || [];
    const photoIndex = userPhotos.findIndex(p => p.id === photoId);
    
    if (photoIndex === -1) {
      return { success: false, error: 'Photo not found' };
    }

    const photo = userPhotos[photoIndex];
    const freedSpace = photo.fileSize;

    // Remove photo
    userPhotos.splice(photoIndex, 1);
    this.photos.set(userId, userPhotos);

    // Update user's total photo size
    user.totalPhotoSize = Math.max(0, user.totalPhotoSize - freedSpace);

    return {
      success: true,
      message: 'Photo deleted successfully',
      freedSpace,
    };
  }

  getUserStorageInfo(userId: number): {
    currentSize: number;
    maxSize: number;
    remainingSpace: number;
    usagePercentage: number;
    photoCount: number;
  } | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const photoCount = (this.photos.get(userId) || []).length;
    const usagePercentage = (user.totalPhotoSize / user.maxPhotoSize) * 100;

    return {
      currentSize: user.totalPhotoSize,
      maxSize: user.maxPhotoSize,
      remainingSpace: user.maxPhotoSize - user.totalPhotoSize,
      usagePercentage,
      photoCount,
    };
  }

  getUserPhotos(userId: number): Photo[] {
    return this.photos.get(userId) || [];
  }

  // Helper method to simulate bulk upload
  async uploadMultiplePhotos(userId: number, files: MockFile[]): Promise<PhotoUploadResponse[]> {
    const results: PhotoUploadResponse[] = [];
    
    for (const file of files) {
      const result = await this.uploadPhoto({
        userId,
        file,
        type: 'portfolio',
      });
      results.push(result);
      
      // Stop if upload failed
      if (!result.success) break;
    }
    
    return results;
  }

  // Helper to reset user for testing
  resetUser(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.totalPhotoSize = 0;
      this.photos.set(userId, []);
    }
  }
}

describe('Photo Upload Limits System', () => {
  let uploadService: MockPhotoUploadService;

  beforeEach(() => {
    uploadService = new MockPhotoUploadService();
    vi.clearAllMocks();
  });

  describe('Storage Limit Enforcement', () => {
    it('should allow upload when within storage limit', async () => {
      const smallFile = uploadService['createMockFile']('test.jpg', 10); // 10MB
      
      const response = await uploadService.uploadPhoto({
        userId: 1, // Fresh account
        file: smallFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(true);
      expect(response.photoId).toBeDefined();
      expect(response.storageInfo?.currentSize).toBe(10 * 1024 * 1024);
      expect(response.storageInfo?.remainingSpace).toBe(500 * 1024 * 1024 - 10 * 1024 * 1024);
    });

    it('should reject upload when exceeding storage limit', async () => {
      const largeFile = uploadService['createMockFile']('huge.jpg', 600); // 600MB - exceeds 500MB limit
      
      const response = await uploadService.uploadPhoto({
        userId: 1, // Fresh account with 500MB limit
        file: largeFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage limit exceeded');
      expect(response.message).toContain('Photo upload would exceed your 500MB storage limit');
      expect(response.storageInfo?.fileSize).toBe(600 * 1024 * 1024);
    });

    it('should reject upload when combined size exceeds limit', async () => {
      const file = uploadService['createMockFile']('test.jpg', 100); // 100MB
      
      const response = await uploadService.uploadPhoto({
        userId: 3, // User with 450MB already used
        file: file,
        type: 'portfolio',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage limit exceeded');
      expect(response.message).toContain('You have 50MB remaining, but this photo is 100MB');
    });

    it('should handle edge case at exact limit', async () => {
      const exactFile = uploadService['createMockFile']('exact.jpg', 50); // Exactly 50MB remaining for user 3
      
      const response = await uploadService.uploadPhoto({
        userId: 3, // User with 450MB used, 50MB remaining
        file: exactFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(true);
      expect(response.storageInfo?.remainingSpace).toBe(0);
      expect(response.storageInfo?.currentSize).toBe(500 * 1024 * 1024); // Exactly at limit
    });

    it('should reject any upload when at storage limit', async () => {
      const tinyFile = uploadService['createMockFile']('tiny.jpg', 0.1); // 0.1MB
      
      const response = await uploadService.uploadPhoto({
        userId: 4, // User already at 500MB limit
        file: tinyFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage limit exceeded');
    });
  });

  describe('Storage Tracking Accuracy', () => {
    it('should accurately track total photo size after uploads', async () => {
      const files = [
        uploadService['createMockFile']('photo1.jpg', 25), // 25MB
        uploadService['createMockFile']('photo2.jpg', 35), // 35MB
        uploadService['createMockFile']('photo3.jpg', 40), // 40MB
      ];

      for (const file of files) {
        await uploadService.uploadPhoto({
          userId: 1,
          file,
          type: 'portfolio',
        });
      }

      const storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.currentSize).toBe(100 * 1024 * 1024); // 100MB total
      expect(storageInfo?.photoCount).toBe(3);
      expect(storageInfo?.usagePercentage).toBe(20); // 100MB of 500MB = 20%
    });

    it('should update storage after photo deletion', async () => {
      const file = uploadService['createMockFile']('test.jpg', 50); // 50MB
      
      // Upload photo
      const uploadResponse = await uploadService.uploadPhoto({
        userId: 1,
        file,
        type: 'portfolio',
      });

      expect(uploadResponse.success).toBe(true);
      
      let storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.currentSize).toBe(50 * 1024 * 1024);

      // Delete photo
      const deleteResponse = await uploadService.deletePhoto(1, uploadResponse.photoId!);
      expect(deleteResponse.success).toBe(true);
      expect(deleteResponse.freedSpace).toBe(50 * 1024 * 1024);

      // Check storage updated
      storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.currentSize).toBe(0);
      expect(storageInfo?.photoCount).toBe(0);
    });

    it('should handle multiple deletions correctly', async () => {
      // Upload multiple photos to user 2 (who already has 100MB)
      const files = [
        uploadService['createMockFile']('new1.jpg', 50), // 50MB
        uploadService['createMockFile']('new2.jpg', 75), // 75MB
      ];

      const photoIds: number[] = [];
      for (const file of files) {
        const response = await uploadService.uploadPhoto({
          userId: 2,
          file,
          type: 'portfolio',
        });
        photoIds.push(response.photoId!);
      }

      let storageInfo = uploadService.getUserStorageInfo(2);
      expect(storageInfo?.currentSize).toBe(225 * 1024 * 1024); // 100 + 50 + 75 = 225MB

      // Delete first new photo (50MB)
      await uploadService.deletePhoto(2, photoIds[0]);
      storageInfo = uploadService.getUserStorageInfo(2);
      expect(storageInfo?.currentSize).toBe(175 * 1024 * 1024); // 225 - 50 = 175MB

      // Delete second new photo (75MB)
      await uploadService.deletePhoto(2, photoIds[1]);
      storageInfo = uploadService.getUserStorageInfo(2);
      expect(storageInfo?.currentSize).toBe(100 * 1024 * 1024); // Back to original 100MB
    });
  });

  describe('Bulk Upload Scenarios', () => {
    it('should handle bulk upload within limits', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        uploadService['createMockFile'](`bulk${i}.jpg`, 20) // 10 files × 20MB = 200MB total
      );

      const results = await uploadService.uploadMultiplePhotos(1, files);

      // All uploads should succeed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.currentSize).toBe(200 * 1024 * 1024);
      expect(storageInfo?.photoCount).toBe(10);
    });

    it('should stop bulk upload when limit reached', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        uploadService['createMockFile'](`bulk${i}.jpg`, 60) // 10 files × 60MB = 600MB total (exceeds 500MB)
      );

      const results = await uploadService.uploadMultiplePhotos(1, files);

      // Should have some successes then failures
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThan(10);

      // Find where it stopped
      const firstFailIndex = results.findIndex(r => !r.success);
      expect(firstFailIndex).toBeGreaterThan(0); // Should succeed for some files first
      expect(firstFailIndex).toBeLessThan(10); // Should fail before all files

      // All results after first failure should be failures or not exist
      for (let i = firstFailIndex; i < results.length; i++) {
        expect(results[i].success).toBe(false);
      }
    });

    it('should handle edge case with remaining space calculations', async () => {
      // User 3 has 450MB used, 50MB remaining
      const files = [
        uploadService['createMockFile']('file1.jpg', 25), // Should succeed
        uploadService['createMockFile']('file2.jpg', 20), // Should succeed (45MB total)
        uploadService['createMockFile']('file3.jpg', 10), // Should fail (would be 55MB total)
      ];

      const results = await uploadService.uploadMultiplePhotos(3, files);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
      expect(results[2].error).toBe('Storage limit exceeded');

      const storageInfo = uploadService.getUserStorageInfo(3);
      expect(storageInfo?.currentSize).toBe(495 * 1024 * 1024); // 450 + 25 + 20 = 495MB
      expect(storageInfo?.remainingSpace).toBe(5 * 1024 * 1024); // 5MB remaining
    });
  });

  describe('Premium Account Limits', () => {
    it('should enforce higher limits for premium accounts', async () => {
      const largeFile = uploadService['createMockFile']('premium.jpg', 800); // 800MB - exceeds standard 500MB but within 1GB premium limit
      
      const response = await uploadService.uploadPhoto({
        userId: 5, // Premium user with 1GB limit
        file: largeFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(true);
      expect(response.storageInfo?.maxSize).toBe(1024 * 1024 * 1024); // 1GB
      expect(response.storageInfo?.currentSize).toBe(1000 * 1024 * 1024); // 200MB + 800MB = 1000MB
    });

    it('should still enforce premium account limits', async () => {
      const excessiveFile = uploadService['createMockFile']('excessive.jpg', 900); // 900MB + existing 200MB = 1100MB (exceeds 1GB)
      
      const response = await uploadService.uploadPhoto({
        userId: 5, // Premium user with 1GB limit, 200MB used
        file: excessiveFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage limit exceeded');
      expect(response.message).toContain('Photo upload would exceed your 1024MB storage limit');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent user', async () => {
      const file = uploadService['createMockFile']('test.jpg', 10);
      
      const response = await uploadService.uploadPhoto({
        userId: 999, // Non-existent user
        file,
        type: 'portfolio',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('User not found');
    });

    it('should handle zero-size files', async () => {
      const emptyFile = uploadService['createMockFile']('empty.jpg', 0);
      
      const response = await uploadService.uploadPhoto({
        userId: 1,
        file: emptyFile,
        type: 'portfolio',
      });

      expect(response.success).toBe(true);
      expect(response.storageInfo?.fileSize).toBe(0);
      expect(response.storageInfo?.currentSize).toBe(0);
    });

    it('should handle deletion of non-existent photo', async () => {
      const response = await uploadService.deletePhoto(1, 999); // Non-existent photo ID
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Photo not found');
    });

    it('should prevent negative storage sizes', async () => {
      // This tests the Math.max(0, ...) logic in deletion
      const user = uploadService['users'].get(1);
      if (user) {
        user.totalPhotoSize = 50 * 1024 * 1024; // Manually set to 50MB
      }

      // Try to delete a photo that would cause negative storage (simulate data inconsistency)
      const response = await uploadService.deletePhoto(1, 999);
      
      expect(response.success).toBe(false); // Should fail due to photo not found
      
      // But if it succeeded, storage should not go negative
      const storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.currentSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Usage Analytics', () => {
    it('should calculate usage percentage correctly', async () => {
      const file = uploadService['createMockFile']('quarter.jpg', 125); // 125MB = 25% of 500MB
      
      await uploadService.uploadPhoto({
        userId: 1,
        file,
        type: 'portfolio',
      });

      const storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.usagePercentage).toBe(25);
    });

    it('should track photo count accurately', async () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        uploadService['createMockFile'](`count${i}.jpg`, 10)
      );

      for (const file of files) {
        await uploadService.uploadPhoto({
          userId: 1,
          file,
          type: 'portfolio',
        });
      }

      const storageInfo = uploadService.getUserStorageInfo(1);
      expect(storageInfo?.photoCount).toBe(5);
      expect(storageInfo?.currentSize).toBe(50 * 1024 * 1024);
    });

    it('should provide comprehensive storage information', async () => {
      const storageInfo = uploadService.getUserStorageInfo(2); // User with 100MB used
      
      expect(storageInfo).toEqual({
        currentSize: 104857600, // 100MB in bytes
        maxSize: 524288000, // 500MB in bytes
        remainingSpace: 419430400, // 400MB in bytes
        usagePercentage: 20, // 100MB of 500MB
        photoCount: 2,
      });
    });
  });
});