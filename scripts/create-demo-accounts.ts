/**
 * Create Demo Accounts (Client & Supplier)
 *
 * Creates two users in the DB for the login dropdown demo. Run this after you
 * have created your own admin account (e.g. via Register). Does not create
 * admin — new signups already get admin role.
 *
 * Creates:
 *   - test@client.com  / 12345678  / "Test Client"  / role: client
 *   - test@supplier.com / 12345678 / "Test Supplier" / role: supplier
 *
 * For the supplier portal to work, links the first existing Supplier to
 * test@supplier.com (or creates a "Demo Supplier" if none exist).
 *
 * Usage (from project root, same DB as app/VPS). Loads .env for Supabase keys:
 *   npx tsx --env-file=.env scripts/create-demo-accounts.ts
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Credentials live in Supabase Auth; create accounts there, then set profile role.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const PASSWORD_PLAIN = "12345678";

const DEMO_USERS = [
  {
    email: "test@client.com",
    name: "Test Client",
    username: "testclient",
    role: "client",
  },
  {
    email: "test@supplier.com",
    name: "Test Supplier",
    username: "testsupplier",
    role: "supplier",
  },
] as const;

async function main() {
  console.log("\n📦 Create demo accounts (client + supplier)\n");

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      console.log(`   ⏭ ${u.email} already exists (${existing.name}, role: ${existing.role ?? "—"}). Skipping.`);
      continue;
    }

    // Create the auth user (the trigger inserts the "User" profile)...
    const { data: created, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD_PLAIN,
      email_confirm: true,
      user_metadata: { name: u.name },
    });

    if (error || !created.user) {
      console.log(`   ❌ ${u.email} failed: ${error?.message ?? "unknown"}`);
      continue;
    }

    // ...then set username + role on the profile.
    await prisma.user.update({
      where: { id: created.user.id },
      data: { username: u.username, role: u.role },
    });
    console.log(`   ✅ Created ${u.email} (${u.name}, role: ${u.role})`);
  }

  const supplierUser = await prisma.user.findUnique({
    where: { email: "test@supplier.com" },
    select: { id: true },
  });

  if (supplierUser) {
    const firstSupplier = await prisma.supplier.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (firstSupplier) {
      await prisma.supplier.update({
        where: { id: firstSupplier.id },
        data: {
          userId: supplierUser.id,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Linked supplier "${firstSupplier.name}" to test@supplier.com`);
    } else {
      await prisma.supplier.create({
        data: {
          name: "Demo Supplier",
          userId: supplierUser.id,
          status: true,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Created "Demo Supplier" and linked to test@supplier.com`);
    }
  }

  console.log("\n   Password for both demo accounts: " + PASSWORD_PLAIN);
  console.log("   Use the login dropdown to sign in as Admin (your account), Client, or Supplier.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
