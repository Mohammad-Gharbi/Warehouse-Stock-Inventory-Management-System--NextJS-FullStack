/**
 * Partner request validation schemas
 * Zod schemas for the partner signup form/API and admin review action.
 */

import { z } from "zod";

/**
 * Company details collected on the partner onboarding form (French labels).
 */
export const partnerCompanySchema = z.object({
  companyName: z
    .string()
    .min(1, "Le nom de l'entreprise est requis")
    .max(200, "200 caractères maximum"),
  rc: z
    .string()
    .min(1, "Le RC est requis")
    .max(100, "100 caractères maximum"),
  nif: z
    .string()
    .min(1, "Le NIF est requis")
    .max(100, "100 caractères maximum"),
  nis: z
    .string()
    .min(1, "Le NIS est requis")
    .max(100, "100 caractères maximum"),
  contact: z
    .string()
    .min(1, "Le contact dans l'entreprise est requis")
    .max(300, "300 caractères maximum"),
});

/**
 * Partner signup payload. Company fields are always required. Account fields are
 * optional here and required at the route level only for anonymous (logged-out)
 * applicants — a logged-in applicant reuses their existing account.
 */
export const partnerSignupSchema = partnerCompanySchema.extend({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "100 caractères maximum")
    .optional(),
  email: z.string().email("Adresse e-mail invalide").optional(),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(100, "100 caractères maximum")
    .optional(),
});

export type PartnerSignupFormData = z.infer<typeof partnerSignupSchema>;

/** API body alias for POST /api/partner-requests */
export const partnerSignupBodySchema = partnerSignupSchema;

/**
 * Admin review action: approve or reject, with an optional note.
 */
export const updatePartnerRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().max(1000, "1000 caractères maximum").optional(),
});

export type UpdatePartnerRequestFormData = z.infer<
  typeof updatePartnerRequestSchema
>;
