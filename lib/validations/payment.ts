/**
 * Payment API validation schemas
 */

import { z } from "zod";

export const createCheckoutBodySchema = z.object({
  type: z.enum(["order", "invoice"], {
    errorMap: () => ({ message: "Type must be order or invoice" }),
  }),
  id: z.string().min(1, "Order or invoice ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
