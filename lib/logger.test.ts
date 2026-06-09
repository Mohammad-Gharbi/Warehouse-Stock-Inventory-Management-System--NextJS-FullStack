import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
const captureMessage = vi.fn();

vi.mock("@/lib/monitoring/sentry", () => ({
  captureException,
  captureMessage,
}));

describe("logger production 4xx guard", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    captureException.mockClear();
    captureMessage.mockClear();
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("skips Sentry for 400 Axios errors", async () => {
    const { logger } = await import("@/lib/logger");
    const axiosError = {
      isAxiosError: true,
      response: { status: 400, data: { error: "Missing required fields" } },
    };
    logger.error("Product operation error:", axiosError);
    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("reports 500 Axios errors to Sentry", async () => {
    const { logger } = await import("@/lib/logger");
    const serverError = new Error("Internal server error");
    logger.error("Product operation error:", serverError);
    expect(captureException).toHaveBeenCalledWith(serverError, {
      label: "Product operation error:",
    });
  });
});
