import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Scissors, Mail, Lock, User, Phone, Apple } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

// Validation schemas
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const { toast } = useToast();

  // Sign in form
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Sign up form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async (data: SignInFormData) => {
      return apiRequest("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });
      
      // Store token and redirect
      localStorage.setItem("token", response.token);
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your email and password.",
        variant: "destructive",
      });
    },
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpFormData) => {
      return apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Account created!",
        description: "Welcome to Clippr. Your account has been created successfully.",
      });
      
      // Store token and redirect
      localStorage.setItem("token", response.token);
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSignIn = (data: SignInFormData) => {
    signInMutation.mutate(data);
  };

  const handleSignUp = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  const handleAppleAuth = () => {
    window.location.href = "/api/auth/apple";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-charcoal dark:to-steel/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal dark:text-white">Clippr</h1>
          </div>
          <p className="text-steel dark:text-steel/70">
            Professional barber management made simple
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-white/80 dark:bg-charcoal/80 backdrop-blur-sm border-steel/20">
          <CardHeader className="text-center">
            <CardTitle className="text-charcoal dark:text-white">
              {activeTab === "signin" ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription>
              {activeTab === "signin" 
                ? "Sign in to manage your business" 
                : "Join Clippr to streamline your barber business"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              {/* Sign In Form */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signin-email"
                        placeholder="Enter your email"
                        className="pl-10"
                        {...signInForm.register("email")}
                      />
                    </div>
                    {signInForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{signInForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10"
                        {...signInForm.register("password")}
                      />
                    </div>
                    {signInForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{signInForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gradient-gold text-charcoal font-semibold"
                    disabled={signInMutation.isPending}
                  >
                    {signInMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Sign Up Form */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-steel" />
                        <Input
                          id="signup-firstName"
                          placeholder="First name"
                          className="pl-10"
                          {...signUpForm.register("firstName")}
                        />
                      </div>
                      {signUpForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{signUpForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-steel" />
                        <Input
                          id="signup-lastName"
                          placeholder="Last name"
                          className="pl-10"
                          {...signUpForm.register("lastName")}
                        />
                      </div>
                      {signUpForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{signUpForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signup-email"
                        placeholder="Enter your email"
                        className="pl-10"
                        {...signUpForm.register("email")}
                      />
                    </div>
                    {signUpForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{signUpForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signup-phone"
                        placeholder="Enter your phone number"
                        className="pl-10"
                        {...signUpForm.register("phone")}
                      />
                    </div>
                    {signUpForm.formState.errors.phone && (
                      <p className="text-sm text-red-500">{signUpForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        className="pl-10"
                        {...signUpForm.register("password")}
                      />
                    </div>
                    {signUpForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{signUpForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-steel" />
                      <Input
                        id="signup-confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        className="pl-10"
                        {...signUpForm.register("confirmPassword")}
                      />
                    </div>
                    {signUpForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500">{signUpForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gradient-gold text-charcoal font-semibold"
                    disabled={signUpMutation.isPending}
                  >
                    {signUpMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Social Login */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-steel/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-charcoal px-2 text-steel">Or continue with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleGoogleAuth}
                  className="w-full border-steel/40 text-charcoal bg-white hover:bg-steel/10"
                >
                  <FaGoogle className="mr-2 h-4 w-4" />
                  Google
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAppleAuth}
                  className="w-full border-steel/40 text-charcoal bg-white hover:bg-steel/10"
                >
                  <Apple className="mr-2 h-4 w-4" />
                  Apple
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}