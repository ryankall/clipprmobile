import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Camera, Plus, Filter, Grid, List, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGalleryPhotoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GalleryPhoto, Client } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const photoFormSchema = insertGalleryPhotoSchema.extend({
  userId: z.number().optional(),
});

export default function Gallery() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: photos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<z.infer<typeof photoFormSchema>>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      type: "portfolio",
      description: "",
      isPublic: false,
    },
  });

  const createPhotoMutation = useMutation({
    mutationFn: async (data: z.infer<typeof photoFormSchema>) => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('type', data.type);
      formData.append('description', data.description || '');
      formData.append('isPublic', data.isPublic?.toString() || 'false');
      
      if (data.clientId) {
        formData.append('clientId', data.clientId.toString());
      }

      const response = await fetch('/api/gallery', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Photo Added",
        description: "Photo has been added to your gallery",
      });
      setIsDialogOpen(false);
      setSelectedFile(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add photo",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return apiRequest("DELETE", `/api/gallery/${photoId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Photo Deleted",
        description: "Photo has been removed from your gallery",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const filteredPhotos = photos?.filter(photo => 
    filterType === 'all' || photo.type === filterType
  ) || [];

  const onSubmit = (data: z.infer<typeof photoFormSchema>) => {
    createPhotoMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Gallery</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className={`text-steel hover:text-white ${viewMode === 'grid' ? 'text-gold' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`text-steel hover:text-white ${viewMode === 'list' ? 'text-gold' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-dark-card border-steel/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Photo</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <PhotoUpload
                      onPhotoSelected={(file) => {
                        setSelectedFile(file);
                        // Store file reference in form for validation
                        form.setValue('photoUrl', file.name);
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Select photo type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              <SelectItem value="before" className="text-white hover:bg-steel/20">Before</SelectItem>
                              <SelectItem value="after" className="text-white hover:bg-steel/20">After</SelectItem>
                              <SelectItem value="portfolio" className="text-white hover:bg-steel/20">Portfolio</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Client (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()} className="text-white hover:bg-steel/20">
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="Describe the style or work done"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-steel/40 text-black hover:bg-charcoal/80 tap-feedback"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 gradient-gold text-charcoal tap-feedback"
                        disabled={createPhotoMutation.isPending}
                      >
                        {createPhotoMutation.isPending ? "Adding..." : "Add Photo"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Filter */}
        <div className="flex items-center space-x-4">
          <Filter className="w-4 h-4 text-steel" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-dark-card border-steel/40 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-steel/40">
              <SelectItem value="all">All Photos</SelectItem>
              <SelectItem value="before">Before</SelectItem>
              <SelectItem value="after">After</SelectItem>
              <SelectItem value="portfolio">Portfolio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gallery Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {photos?.length || 0}
              </div>
              <div className="text-xs text-steel">Total Photos</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {photos?.filter(p => p.type === 'portfolio').length || 0}
              </div>
              <div className="text-xs text-steel">Portfolio</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {photos?.filter(p => p.isPublic).length || 0}
              </div>
              <div className="text-xs text-steel">Public</div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Gallery */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">
              Photos ({filteredPhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : filteredPhotos.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPhotos.map((photo) => (
                    <div key={photo.id} className="polaroid card-shadow relative group">
                      <img 
                        src={photo.photoUrl} 
                        alt={photo.description || "Gallery photo"} 
                        className="w-full h-32 object-cover rounded" 
                      />
                      <div className="text-xs text-center mt-2 text-steel truncate">
                        {photo.description || format(new Date(photo.createdAt!), 'MMM d, yyyy')}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600 text-white"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPhotos.map((photo) => (
                    <div key={photo.id} className="flex items-center space-x-4 p-3 bg-charcoal rounded-lg">
                      <img 
                        src={photo.photoUrl} 
                        alt={photo.description || "Gallery photo"} 
                        className="w-16 h-16 object-cover rounded" 
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {photo.description || 'Untitled'}
                        </div>
                        <div className="text-sm text-steel">
                          {photo.type} • {format(new Date(photo.createdAt!), 'MMM d, yyyy')}
                        </div>
                        {photo.clientId && clients && (
                          <div className="text-xs text-gold">
                            {clients.find(c => c.id === photo.clientId)?.name}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-steel hover:text-red-400"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-steel">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {filterType === 'all' ? "No photos uploaded yet" : `No ${filterType} photos found`}
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="link"
                  className="text-gold text-sm mt-2 p-0 h-auto"
                >
                  Add your first photo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentPath="/gallery" />
    </div>
  );
}
