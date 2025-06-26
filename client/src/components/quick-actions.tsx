import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
  const { toast } = useToast();

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; type: string }) => {
      return apiRequest("POST", "/api/quick-actions/send-message", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleQuickMessage = (message: string, type: string) => {
    // In a real app, you'd select a client first
    // For demo purposes, we'll show the toast
    toast({
      title: "Quick Message",
      description: `"${message}" ready to send`,
    });
  };

  return (
    <Card className="bg-dark-card border-steel/20 card-shadow">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-1 tap-feedback hover:bg-charcoal/80"
            onClick={() => handleQuickMessage("On my way! See you in 15 minutes.", "on_my_way")}
          >
            <Car className="w-4 h-4 text-gold" />
            <span className="text-xs">On My Way</span>
          </Button>
          <Button
            variant="outline"
            className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-1 tap-feedback hover:bg-charcoal/80"
            onClick={() => handleQuickMessage("Running about 10 minutes late. Sorry for the delay!", "running_late")}
          >
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-xs">Running Late</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
