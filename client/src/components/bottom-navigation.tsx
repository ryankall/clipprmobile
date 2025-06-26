import { Home, Calendar, Users, Camera, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  currentPath: string;
}

export function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/clients", icon: Users, label: "Clients" },
    { path: "/gallery", icon: Camera, label: "Gallery" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-charcoal border-t border-steel/20 px-4 py-2 mobile-safe-area glass-effect">
      <div className="flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = currentPath === path;
          
          return (
            <Link key={path} href={path}>
              <Button
                variant="ghost"
                className={`flex flex-col items-center space-y-1 p-2 touch-target h-auto tap-feedback ${
                  isActive ? "text-gold" : "text-steel hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
