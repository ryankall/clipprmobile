import { Home, Calendar, Users, Receipt, MessageCircle, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface BottomNavigationProps {
  currentPath: string;
}

export function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/clients", icon: Users, label: "Clients" },
    { path: "/invoice", icon: Receipt, label: "Invoice" },
    { 
      path: "/messages", 
      icon: MessageCircle, 
      label: "Messages", 
      ...(unreadCount > 0 && { badge: unreadCount })
    },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-charcoal border-t border-steel/20 px-4 py-2 mobile-safe-area glass-effect">
      <div className="flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label, badge }) => {
          const isActive = currentPath === path;
          
          return (
            <Link key={path} href={path}>
              <Button
                variant="ghost"
                className={`flex flex-col items-center space-y-1 p-2 touch-target h-auto tap-feedback relative ${
                  isActive ? "text-gold" : "text-steel hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge !== undefined && badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white rounded-full"
                    >
                      {badge > 99 ? "99+" : badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
