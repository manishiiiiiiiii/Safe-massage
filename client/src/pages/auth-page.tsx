import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (data: any) => {
    if (isLogin) {
      await loginMutation.mutateAsync(data);
    } else {
      await registerMutation.mutateAsync(data);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Animated background circles */}
      <motion.div 
        className="absolute inset-0 opacity-20 dark:opacity-10 overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-primary"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            easings: ["easeInOut"],
          }}
          style={{ top: "10%", left: "60%" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full bg-primary"
          animate={{
            x: [0, -50, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            easings: ["easeInOut"],
          }}
          style={{ top: "50%", left: "20%" }}
        />
      </motion.div>

      {/* Login/Register Form */}
      <div className="flex-1 p-4 sm:p-8 flex items-center justify-center z-10">
        <Card className="w-full max-w-md backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isLogin ? "Welcome back" : "Create an account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Username"
                    {...form.register("username")}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    {...form.register("password")}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || registerMutation.isPending}
                >
                  {isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm"
              >
                {isLogin ? "Need an account?" : "Already have an account?"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hero Section - Only visible on larger screens */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex flex-1 bg-primary items-center justify-center text-primary-foreground relative z-10"
      >
        <div className="max-w-md p-8 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Modern Messaging Platform</h2>
          <p className="text-lg opacity-90">
            Connect with others through our secure and feature-rich messaging platform
          </p>
        </div>
      </motion.div>
    </div>
  );
}