"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/** Friendly messages for OAuth errors surfaced by the Google callback redirect. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Google OAuth is not configured. Please contact support.",
  oauth_failed: "Google sign-in was cancelled or failed. Please try again.",
  invalid_state: "Invalid OAuth state. Please try again.",
  no_code: "OAuth authorization code missing. Please try again.",
  token_exchange_failed: "Failed to exchange OAuth token. Please try again.",
  fetch_user_failed:
    "Failed to fetch user information from Google. Please try again.",
  no_email: "Google account email is required. Please try again.",
  oauth_processing_failed:
    "An error occurred during OAuth processing. Please try again.",
  oauth_error: "An error occurred during OAuth processing. Please try again.",
};

/** Destination dashboard for a given role after login. */
const destForRole = (role?: string) =>
  role === "client" ? "/client" : role === "supplier" ? "/supplier" : "/";

/**
 * Login page client component (uses useSearchParams for OAuth/redirect).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const { login, isLoggedIn, user } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const navigatingFromSubmitRef = useRef(false);

  // Redirect if already logged in (e.g. landed on /login with a session).
  useEffect(() => {
    if (isLoggedIn && !navigatingFromSubmitRef.current) {
      window.location.href = destForRole(user?.role);
    }
  }, [isLoggedIn, user]);

  // Surface OAuth errors passed back by the Google callback.
  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    toast({
      title: "Google Sign-In Failed",
      description:
        OAUTH_ERROR_MESSAGES[error] ?? `OAuth error: ${error}. Please try again.`,
      variant: "destructive",
    });
    router.replace("/login");
  }, [searchParams, router, toast]);

  /** Redirect into the Google OAuth flow. */
  const handleGoogleSignIn = () => {
    const redirectUrl = searchParams.get("redirect") || "/";
    window.location.href = `/api/auth/oauth/google?callback=${encodeURIComponent(
      redirectUrl,
    )}`;
  };

  /** Handle email/password login. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userData = await login(email, password);
      const userName = userData.name || userData.email.split("@")[0] || "User";

      navigatingFromSubmitRef.current = true;
      setIsNavigatingToHome(true);

      toast({
        title: `Welcome back, ${userName}! 👋`,
        description: "You have successfully logged in. Enjoy your stay!",
      });

      // Full-page navigation bypasses the Next.js RSC cache, which can hold a
      // stale 307 redirect from before login and cause a redirect loop.
      window.location.href = destForRole(userData.role);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Login Failed",
        description:
          axiosErr?.response?.data?.error ||
          "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (!navigatingFromSubmitRef.current) setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1 text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome Back
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
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
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isNavigatingToHome}
          >
            {isNavigatingToHome ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Dashboard…
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isNavigatingToHome}
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
