import { db } from "@/server/db";
import type { User } from "@supabase/supabase-js";

export async function provisionUser(supabaseUser: User): Promise<void> {
  const userId = supabaseUser.id;
  const email = supabaseUser.email ?? "";
  const name =
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    (supabaseUser.user_metadata?.name as string | undefined) ??
    email.split("@")[0] ??
    "User";
  const orgName =
    (supabaseUser.user_metadata?.org_name as string | undefined) ??
    `${name}'s Workspace`;

  await db.user.upsert({
    where: { id: userId },
    update: { email, name },
    create: { id: userId, email, name },
  });

  const existingMembership = await db.organizationMember.findFirst({
    where: { userId },
  });

  if (!existingMembership) {
    const org = await db.organization.create({
      data: { name: orgName, planTier: "FREE" },
    });
    await db.organizationMember.create({
      data: { orgId: org.id, userId, role: "OWNER" },
    });
  }
}
