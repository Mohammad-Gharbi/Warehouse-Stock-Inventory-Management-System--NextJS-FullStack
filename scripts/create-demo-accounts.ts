/**
 * Create Demo Account (Client)
 *
 * Creates a client user in the DB for the login dropdown demo. Run this after
 * you have created your own admin account (e.g. via Register). Does not create
 * admin — new signups already get admin role.
 *
 * Creates:
 *   - test@client.com  / 12345678  / "Test Client"  / role: client
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
] as const;

async function main() {
  console.log("\n📦 Create demo account (client)\n");

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

  console.log("\n   Password for the demo account: " + PASSWORD_PLAIN);
  console.log("   Use the login dropdown to sign in as Admin (your account) or Client.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
