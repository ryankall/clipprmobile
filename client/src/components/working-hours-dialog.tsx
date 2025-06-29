import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkingHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

interface WorkingHoursDialogProps {
  currentHours?: any;
}

export function WorkingHoursDialog({ currentHours }: WorkingHoursDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { start: "09:00", end: "18:00", enabled: true },
    tuesday: { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday: { start: "09:00", end: "18:00", enabled: true },
    friday: { start: "09:00", end: "18:00", enabled: true },
    saturday: { start: "10:00", end: "16:00", enabled: true },
    sunday: { start: "10:00", end: "16:00", enabled: false },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize working hours from user profile
  useEffect(() => {
    if (currentHours && typeof currentHours === 'object') {
      setWorkingHours(prev => ({ ...prev, ...currentHours }));
    }
  }, [currentHours]);

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (hours: WorkingHours) => {
      const token = localStorage.getItem("token");
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ workingHours: hours }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Working Hours Updated",
        description: "Your working hours have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update working hours",
        variant: "destructive",
      });
    },
  });

  const validateTimeRange = (start: string, end: string): boolean => {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return startMinutes < endMinutes;
  };

  const handleSave = () => {
    // Validate all enabled days have valid time ranges
    const invalidDays: string[] = [];
    Object.entries(workingHours).forEach(([day, hours]) => {
      if (hours.enabled && !validateTimeRange(hours.start, hours.end)) {
        invalidDays.push(day.charAt(0).toUpperCase() + day.slice(1));
      }
    });

    if (invalidDays.length > 0) {
      toast({
        title: "Invalid Time Range",
        description: `Start time must be before end time for: ${invalidDays.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    updateWorkingHoursMutation.mutate(workingHours);
  };

  const updateDayHours = (day: keyof WorkingHours, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-charcoal border-steel/40 text-white hover:border-gold/50">
          <Clock className="w-4 h-4 mr-2" />
          Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-dark-card border-steel/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Working Hours</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {days.map((day) => {
            const dayKey = day.toLowerCase() as keyof WorkingHours;
            const dayHours = workingHours[dayKey];
            
            return (
              <div key={day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={dayHours.enabled}
                      onCheckedChange={(checked) => updateDayHours(dayKey, 'enabled', checked)}
                    />
                    <span className="font-medium text-white">{day}</span>
                  </div>
                  {dayHours.enabled && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={dayHours.start}
                        onChange={(e) => updateDayHours(dayKey, 'start', e.target.value)}
                        className="w-24 bg-dark-card border-steel/40 text-white text-sm"
                      />
                      <span className="text-steel">to</span>
                      <Input
                        type="time"
                        value={dayHours.end}
                        onChange={(e) => updateDayHours(dayKey, 'end', e.target.value)}
                        className="w-24 bg-dark-card border-steel/40 text-white text-sm"
                      />
                    </div>
                  )}
                </div>
                {!dayHours.enabled && (
                  <div className="text-steel text-sm ml-6">Closed</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="bg-charcoal border-steel/40 text-white hover:border-steel/60"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateWorkingHoursMutation.isPending}
            className="gradient-gold text-charcoal"
          >
            {updateWorkingHoursMutation.isPending ? "Saving..." : "Save Hours"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}