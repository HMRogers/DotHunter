import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getStripe } from "./stripe/client";
import { DOTHUNTER_PRODUCT } from "./stripe/products";
import { getUserPurchaseStatus, setStripeCustomerId, markUserUnlocked } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  purchase: router({
    /** Check if the current user has unlocked the game */
    status: protectedProcedure.query(async ({ ctx }) => {
      const result = await getUserPurchaseStatus(ctx.user.id);
      return { gameUnlocked: result.gameUnlocked };
    }),

    /** Create a Stripe Checkout session for the $1.99 game unlock */
    createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
      const stripe = getStripe();
      const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "http://localhost:3000";

      // Check if already unlocked
      const purchaseStatus = await getUserPurchaseStatus(ctx.user.id);
      if (purchaseStatus.gameUnlocked) {
        return { alreadyUnlocked: true, url: null };
      }

      // Get or create Stripe customer
      let customerId = purchaseStatus.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email || undefined,
          name: ctx.user.name || undefined,
          metadata: {
            user_id: ctx.user.id.toString(),
            open_id: ctx.user.openId,
          },
        });
        customerId = customer.id;
        await setStripeCustomerId(ctx.user.id, customerId);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        client_reference_id: ctx.user.id.toString(),
        mode: "payment",
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: DOTHUNTER_PRODUCT.price.currency,
              unit_amount: DOTHUNTER_PRODUCT.price.amount,
              product_data: {
                name: DOTHUNTER_PRODUCT.name,
                description: DOTHUNTER_PRODUCT.description,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          product_type: "game_unlock",
        },
        success_url: `${origin}/play?payment=success`,
        cancel_url: `${origin}/play?payment=cancelled`,
      });

      return { alreadyUnlocked: false, url: session.url };
    }),

    /** Admin: manually unlock a user (for testing) */
    adminUnlock: protectedProcedure.mutation(async ({ ctx }) => {
      // Only owner/admin can use this
      if (ctx.user.role !== "admin") {
        throw new Error("Not authorized");
      }
      await markUserUnlocked(ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
