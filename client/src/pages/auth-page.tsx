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
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const formVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

const heroVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  }
};

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
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{
            backgroundImage: [
              "radial-gradient(circle at 0% 0%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, hsl(var(--primary)) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, hsl(var(--primary)) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 opacity-20 dark:opacity-10"
        />
      </div>

      {/* Login/Register Form */}
      <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "register"}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-md"
          >
            <Card className="backdrop-blur-md bg-card/95">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                  {isLogin ? "Welcome back" : "Create an account"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Input
                        placeholder="Username"
                        {...form.register("username")}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        {...form.register("password")}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending || registerMutation.isPending}
                      >
                        {isLogin ? "Sign In" : "Sign Up"}
                      </Button>
                    </motion.div>
                  </form>
                </Form>
                <motion.div 
                  className="mt-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm"
                  >
                    {isLogin ? "Need an account?" : "Already have an account?"}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hero Section - Only visible on larger screens */}
      <motion.div 
        variants={heroVariants}
        initial="initial"
        animate="animate"
        className="hidden lg:flex flex-1 bg-primary/95 backdrop-blur items-center justify-center text-primary-foreground relative"
      >
        <div className="max-w-md p-8 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <MessageSquare className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Modern Messaging Platform</h2>
            <p className="text-lg opacity-90">
              Connect with others through our secure and feature-rich messaging platform
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}