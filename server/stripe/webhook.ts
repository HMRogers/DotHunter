import type { Express, Request, Response } from "express";
import express from "express";
import { getStripe } from "./client";
import { markUserUnlocked } from "../db";

/**
 * Register the Stripe webhook endpoint.
 * MUST be registered BEFORE express.json() middleware to preserve raw body for signature verification.
 */
export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.warn("[Webhook] Missing signature or webhook secret");
        res.status(400).json({ error: "Missing signature or webhook secret" });
        return;
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Webhook] Signature verification failed:", err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
      }

      // Handle test events for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const userId = session.metadata?.user_id;
            if (userId) {
              await markUserUnlocked(parseInt(userId, 10));
              console.log(`[Webhook] User ${userId} unlocked via checkout session ${session.id}`);
            } else {
              console.warn("[Webhook] checkout.session.completed missing user_id in metadata");
            }
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;
            console.log(`[Webhook] PaymentIntent succeeded: ${paymentIntent.id}`);
            break;
          }

          default:
            console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error("[Webhook] Error processing event:", err);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );
}
