import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Minus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BreakTime {
  start: string;
  end: string;
  label: string;
}

interface DayHours {
  start: string;
  end: string;
  enabled: boolean;
  breaks?: BreakTime[];
}

interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface WorkingHoursDialogProps {
  open: boolean;
  onClose: () => void;
  workingHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  currentHours?: any;
}

export function WorkingHoursDialog({ open, onClose, workingHours: initialWorkingHours, currentHours }: WorkingHoursDialogProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { start: "09:00", end: "18:00", enabled: true, breaks: [] },
    tuesday: { start: "09:00", end: "18:00", enabled: true, breaks: [] },
    wednesday: { start: "09:00", end: "18:00", enabled: true, breaks: [] },
    thursday: { start: "09:00", end: "18:00", enabled: true, breaks: [] },
    friday: { start: "09:00", end: "18:00", enabled: true, breaks: [] },
    saturday: { start: "10:00", end: "16:00", enabled: true, breaks: [] },
    sunday: { start: "10:00", end: "16:00", enabled: false, breaks: [] },
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
      onClose();
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
    const invalidBreaks: string[] = [];
    
    Object.entries(workingHours).forEach(([day, hours]) => {
      if (hours.enabled) {
        if (!validateTimeRange(hours.start, hours.end)) {
          invalidDays.push(day.charAt(0).toUpperCase() + day.slice(1));
        }
        
        // Validate break times
        if (hours.breaks) {
          hours.breaks.forEach((breakTime, index) => {
            if (!validateTimeRange(breakTime.start, breakTime.end)) {
              invalidBreaks.push(`${day.charAt(0).toUpperCase() + day.slice(1)} - Block ${index + 1}`);
            }
          });
        }
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

    if (invalidBreaks.length > 0) {
      toast({
        title: "Invalid Block Time",
        description: `Block time start must be before end time for: ${invalidBreaks.join(', ')}`,
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

  const addBreakTime = (day: keyof WorkingHours) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [
          ...(prev[day].breaks || []),
          { start: "12:00", end: "13:00", label: "Lunch Break" }
        ]
      }
    }));
  };

  const removeBreakTime = (day: keyof WorkingHours, index: number) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const updateBreakTime = (day: keyof WorkingHours, index: number, field: 'start' | 'end' | 'label', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.map((breakTime, i) => 
          i === index ? { ...breakTime, [field]: value } : breakTime
        ) || []
      }
    }));
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                
                {/* Block Times Section */}
                {dayHours.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel">Block Times</span>
                      <Button
                        onClick={() => addBreakTime(dayKey)}
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-gold hover:text-gold hover:bg-gold/20"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Block
                      </Button>
                    </div>
                    
                    {dayHours.breaks && dayHours.breaks.length > 0 && (
                      <div className="space-y-2">
                        {dayHours.breaks.map((breakTime, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-charcoal/50 rounded-md border border-steel/20">
                            <div className="flex items-center space-x-1 text-red-400">
                              <div className="w-3 h-3 rounded-full border border-red-400 flex items-center justify-around">
                                <div className="w-2 h-0.5 bg-red-400 rotate-45"></div>
                              </div>
                            </div>
                            <Input
                              type="time"
                              value={breakTime.start}
                              onChange={(e) => updateBreakTime(dayKey, index, 'start', e.target.value)}
                              className="w-20 bg-dark-card border-steel/40 text-white text-xs"
                            />
                            <span className="text-steel text-xs">to</span>
                            <Input
                              type="time"
                              value={breakTime.end}
                              onChange={(e) => updateBreakTime(dayKey, index, 'end', e.target.value)}
                              className="w-20 bg-dark-card border-steel/40 text-white text-xs"
                            />
                            <Input
                              type="text"
                              value={breakTime.label}
                              onChange={(e) => updateBreakTime(dayKey, index, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1 bg-dark-card border-steel/40 text-white text-xs"
                            />
                            <Button
                              onClick={() => removeBreakTime(dayKey, index)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
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