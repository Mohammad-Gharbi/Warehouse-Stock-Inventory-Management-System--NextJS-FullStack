/**
 * Partner Request Prisma Utilities
 * Helper functions for partner account application database operations.
 */

import { prisma } from "@/prisma/client";
import type { Prisma } from "@prisma/client";
import type {
  CreatePartnerRequestInput,
  PartnerRequestStatus,
  UpdatePartnerRequestInput,
} from "@/types";

/**
 * Create a new partner request (status defaults to "pending").
 */
export async function createPartnerRequest(data: CreatePartnerRequestInput) {
  return prisma.partnerRequest.create({
    data: {
      userId: data.userId,
      companyName: data.companyName,
      rc: data.rc,
      nif: data.nif,
      nis: data.nis,
      contact: data.contact,
      status: "pending",
      updatedAt: new Date(),
    },
  });
}

/**
 * Get partner requests (admin list) with optional status filter + pagination.
 */
export async function getPartnerRequests(filters: {
  status?: PartnerRequestStatus;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: Prisma.PartnerRequestWhereInput = {};
  if (filters.status) where.status = filters.status;

  const [requests, total] = await Promise.all([
    prisma.partnerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.partnerRequest.count({ where }),
  ]);

  return {
    requests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single partner request by ID.
 */
export async function getPartnerRequestById(id: string) {
  return prisma.partnerRequest.findUnique({
    where: { id },
  });
}

/**
 * Get the user's pending partner request, if any (duplicate-submission guard).
 */
export async function getPendingRequestForUser(userId: string) {
  return prisma.partnerRequest.findFirst({
    where: { userId, status: "pending" },
  });
}

/**
 * Update a partner request (status / review fields).
 */
export async function updatePartnerRequest(
  id: string,
  data: UpdatePartnerRequestInput,
) {
  const updateData: Prisma.PartnerRequestUpdateInput = {
    updatedAt: new Date(),
  };
  if (data.status != null) updateData.status = data.status;
  if (data.reviewNotes !== undefined) updateData.reviewNotes = data.reviewNotes;
  if (data.reviewedBy != null) updateData.reviewedBy = data.reviewedBy;
  if (data.reviewedAt != null) updateData.reviewedAt = data.reviewedAt;

  return prisma.partnerRequest.update({
    where: { id },
    data: updateData,
  });
}
