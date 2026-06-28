/**
 * Partner Request type definitions
 * A partner account application submitted by a user (or new visitor), reviewed
 * manually by an admin (pending -> approved | rejected).
 */

export type PartnerRequestStatus = "pending" | "approved" | "rejected";

export interface PartnerRequest {
  id: string;
  userId: string;
  companyName: string;
  /** Registre de Commerce */
  rc: string;
  /** Numéro d'Identification Fiscale */
  nif: string;
  /** Numéro d'Identification Statistique */
  nis: string;
  /** Contact dans l'entreprise (name and/or email/phone) */
  contact: string;
  status: PartnerRequestStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Present when the API returns detail/list (applicant display). */
  applicantName?: string | null;
  /** Present when the API returns detail/list. */
  applicantEmail?: string;
}

export interface CreatePartnerRequestInput {
  userId: string;
  companyName: string;
  rc: string;
  nif: string;
  nis: string;
  contact: string;
}

export interface UpdatePartnerRequestInput {
  status?: PartnerRequestStatus;
  reviewNotes?: string | null;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface PartnerRequestFilters {
  status?: PartnerRequestStatus;
  page?: number;
  limit?: number;
}
