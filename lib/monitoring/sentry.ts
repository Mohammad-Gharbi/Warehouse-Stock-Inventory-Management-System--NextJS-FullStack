/**
 * Sentry helpers for app code (logger, ErrorBoundary, API routes).
 * Requires Sentry.init from instrumentation / sentry.*.config when DSN is set.
 */

import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, isSentryEnabled } from "./sentry-config";

export {
  getSentryDsn,
  isSentryEnabled as isSentryConfigured,
  SENTRY_TUNNEL_PATH,
} from "./sentry-config";

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    if (context) {
      Sentry.captureException(error, {
        contexts: { custom: context },
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // SDK not initialized
  }
}

export function captureMessage(
  message: string,
  level: "error" | "warning" | "info" = "error",
  context?: Record<string, unknown>,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    if (context) {
      Sentry.captureMessage(message, {
        level,
        contexts: { custom: context },
      });
    } else {
      Sentry.captureMessage(message, { level });
    }
  } catch {
    // SDK not initialized
  }
}

export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  name?: string;
}): void {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username || user.name,
    });
  } catch {
    // SDK not initialized
  }
}

export function clearUserContext(): void {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    Sentry.setUser(null);
  } catch {
    // SDK not initialized
  }
}

export function addBreadcrumb(
  message: string,
  category?: string,
  level: "error" | "warning" | "info" | "debug" = "info",
  data?: Record<string, unknown>,
): void {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    });
  } catch {
    // SDK not initialized
  }
}
