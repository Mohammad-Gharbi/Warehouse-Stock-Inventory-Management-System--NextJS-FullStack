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
  oauth_not_configured:
    "Google OAuth is not configured. Please contact support.",
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
        OAUTH_ERROR_MESSAGES[error] ??
        `OAuth error: ${error}. Please try again.`,
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
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
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

        <div className="mt-2 text-center text-sm text-muted-foreground">
          <Link
            href="register"
            className="font-medium text-primary hover:underline"
          >
            Devenir Partenaire
          </Link>
        </div>
      </div>
    </div>
  );
}
