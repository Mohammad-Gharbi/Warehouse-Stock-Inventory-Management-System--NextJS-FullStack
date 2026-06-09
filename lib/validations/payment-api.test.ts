import { describe, expect, it } from "vitest";
import { createCheckoutBodySchema } from "./payment";

describe("createCheckoutBodySchema", () => {
  it("accepts valid checkout payload", () => {
    const result = createCheckoutBodySchema.safeParse({
      type: "order",
      id: "507f1f77bcf86cd799439011",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = createCheckoutBodySchema.safeParse({ type: "order" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createCheckoutBodySchema.safeParse({
      type: "subscription",
      id: "abc",
    });
    expect(result.success).toBe(false);
  });
});
