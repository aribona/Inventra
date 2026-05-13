import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // Upsert the demo organization
  await db.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Demo Workspace",
      planTier: "FREE",
    },
  });

  // Upsert the demo user
  await db.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@inventra.app",
      name: "Demo User",
    },
  });

  // Upsert the membership linking them
  await db.organizationMember.upsert({
    where: { orgId_userId: { orgId: "demo-org", userId: "demo-user" } },
    update: {},
    create: {
      orgId: "demo-org",
      userId: "demo-user",
      role: "OWNER",
    },
  });

  console.log("✅ Demo org and user seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
