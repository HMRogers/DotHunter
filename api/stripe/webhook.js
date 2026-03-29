/**
 * Vercel Serverless Function — Stripe Webhook Handler
 *
 * Listens for checkout.session.completed events and marks
 * the device as unlocked in the database.
 *
 * IMPORTANT: This endpoint must receive the raw body for
 * Stripe signature verification. Vercel config disables
 * automatic body parsing for this route.
 */
import { getStripe } from "../lib/stripe.js";
import { markDeviceUnlocked, recordPayment } from "../lib/db.js";

// Disable Vercel's automatic body parsing — we need the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read the raw body from the request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    console.warn("[Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  if (!webhookSecret) {
    console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const deviceId =
          session.metadata?.device_id || session.client_reference_id;

        if (deviceId) {
          // Mark device as unlocked
          await markDeviceUnlocked(deviceId);

          // Record payment for audit
          await recordPayment(
            deviceId,
            session.id,
            session.payment_intent,
            "completed"
          );

          console.log(
            `[Webhook] Device ${deviceId} unlocked via session ${session.id}`
          );
        } else {
          console.warn(
            "[Webhook] checkout.session.completed missing device_id in metadata"
          );
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        console.log(`[Webhook] PaymentIntent succeeded: ${pi.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
