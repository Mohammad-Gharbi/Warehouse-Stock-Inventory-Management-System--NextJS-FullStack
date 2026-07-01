"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/utils/axiosInstance";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Create Supabase client on the browser
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Password confirmation check
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // 1. Register the new user
      const response = await axiosInstance.post("/auth/register", {
        name,
        email,
        password,
      });

      if (response.status !== 201) {
        throw new Error("Registration failed");
      }

      // 2. Auto‑login: sign in with the same credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      toast({
        title: "Account Created Successfully! 🎉",
        description: "You are now logged in. Redirecting to dashboard...",
      });

      // 3. Redirect to the protected dashboard
      router.push("/partner-signup");
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { error?: string }; status?: number };
      };
      const serverMessage =
        axiosErr?.response?.data?.error || (error as Error).message;

      toast({
        title: "Registration Failed",
        description:
          serverMessage || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 w-full">
        {/* Centered form container */}
        <div className="w-full flex items-center justify-center p-0 sm:p-8 lg:p-12">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-emerald-400/30 dark:border-white/10 bg-card backdrop-blur-sm shadow-sm dark:shadow-lg p-4 sm:p-8 transition-all duration-300 hover:border-emerald-300/50 dark:hover:border-emerald-300/30">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-2xl font-semibold text-gray-900 dark:text-white text-center">
                Create Account
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-white/70 text-center">
                Sign up to get started with your inventory dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-white/80"
                >
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-emerald-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-sm"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-white/80"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-emerald-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-sm"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 dark:text-white/80"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-emerald-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-sm"
                />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-700 dark:text-white/80"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-emerald-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-sm"
                />
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                className="w-full rounded-xl border border-emerald-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-emerald-300/40"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center text-sm">
              <p className="text-gray-600 dark:text-white/70">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-emerald-600 dark:text-sky-400 hover:text-emerald-700 dark:hover:text-sky-300 transition-colors font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
