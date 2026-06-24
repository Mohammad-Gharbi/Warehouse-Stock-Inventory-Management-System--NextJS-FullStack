/**
 * User Management (admin) Prisma helpers
 * List users, get by id, create, update (role, name), delete. Never expose password.
 */

import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import type { UpdateUserAdminInput, CreateUserAdminInput } from "@/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  image: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getAllUsers(limit = 200) {
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });
}

export async function updateUserAdmin(id: string, data: UpdateUserAdminInput) {
  const payload: Prisma.UserUpdateInput = { updatedAt: new Date() };
  if (data.role !== undefined)
    payload.role = data.role as Prisma.UserUpdateInput["role"];
  if (data.name !== undefined) payload.name = data.name;

  return prisma.user.update({
    where: { id },
    data: payload,
    select: USER_SELECT,
  });
}

/**
 * Create a new user (admin action).
 * Credentials live in Supabase Auth, so the account is created there (which
 * fires the trigger that inserts the "User" profile); we then set the profile's
 * username/role.
 */
export async function createUserAdmin(data: CreateUserAdminInput) {
  const admin = createSupabaseAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name },
  });

  if (error || !created.user) {
    throw new Error(error?.message ?? "Failed to create user");
  }

  return prisma.user.update({
    where: { id: created.user.id },
    data: {
      name: data.name,
      username: data.username || null,
      role: (data.role as Prisma.UserUpdateInput["role"]) ?? "user",
    },
    select: USER_SELECT,
  });
}

/**
 * Delete a user by ID (admin action)
 * Note: This is a hard delete. Use cautiously.
 */
export async function deleteUserAdmin(id: string) {
  return prisma.user.delete({
    where: { id },
    select: USER_SELECT,
  });
}

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!user;
}

/**
 * Check if username already exists
 */
export async function usernameExists(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !!user;
}
