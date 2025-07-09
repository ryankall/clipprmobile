export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isPhoneVerificationError(error: any): boolean {
  return error?.message?.includes('Phone verification required') || 
         error?.error === 'Phone verification required' ||
         error?.action === 'verify_phone';
}

export function getPhoneVerificationMessage(error: any): string {
  if (error?.message) {
    return error.message;
  }
  return 'You must verify your phone number before proceeding. Go to Settings > Phone Verification to complete this step.';
}

export function getErrorRedirectPath(error: any): string {
  return error?.redirectTo || '/settings';
}