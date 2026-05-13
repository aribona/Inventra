import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { provisionUser } from "@/server/services/provisioning.service";
import { db } from "@/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  let user: { id: string; email: string; name: string } | null = null;
  let orgId: string | null = null;

  if (supabaseUser) {
    let membership = await db.organizationMember.findFirst({
      where: { userId: supabaseUser.id },
      include: { user: true },
    });

    if (!membership) {
      await provisionUser(supabaseUser);
      membership = await db.organizationMember.findFirst({
        where: { userId: supabaseUser.id },
        include: { user: true },
      });
    }

    if (membership) {
      user = {
        id: membership.userId,
        email: membership.user.email,
        name: membership.user.name,
      };
      orgId = membership.orgId;
    }
  }

  return { headers: opts.headers, user, orgId };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      orgId: ctx.orgId,
    },
  });
});
