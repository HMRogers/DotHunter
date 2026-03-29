/**
 * Vercel Serverless Function — tRPC-compatible API handler
 *
 * Returns responses in the tRPC/superjson wire format so the existing
 * React frontend (which uses @trpc/react-query) works without changes.
 *
 * Implements:
 *   auth.me          → always null (no login system)
 *   auth.logout       → no-op success
 *   purchase.status   → checks device unlock status in Neon DB
 *   purchase.createCheckout → creates a Stripe Checkout session
 */
import { getOrCreateDevice, getDeviceStatus, setDeviceStripeCustomerId } from "../lib/db.js";
import { getStripe, DOTHUNTER_PRODUCT } from "../lib/stripe.js";

function superjson(data) {
  return { json: data };
}

function ok(data) {
  return { result: { data: superjson(data) } };
}

function err(code, message) {
  return {
    error: {
      message,
      code: -32600,
      data: { code, httpStatus: code === "UNAUTHORIZED" ? 401 : 400, path: "" },
    },
  };
}

// Parse the device_id from the request (sent as a custom header or query param)
function getDeviceId(req) {
  return req.headers["x-device-id"] || req.query.deviceId || null;
}

// ── Procedure handlers ──────────────────────────────────────────────

async function handleAuthMe() {
  // No login system — always unauthenticated
  return ok(null);
}

async function handleAuthLogout() {
  return ok({ success: true });
}

async function handlePurchaseStatus(req) {
  const deviceId = getDeviceId(req);
  if (!deviceId) {
    return ok({ gameUnlocked: false });
  }
  try {
    const status = await getDeviceStatus(deviceId);
    return ok({ gameUnlocked: status.gameUnlocked });
  } catch (e) {
    console.error("[purchase.status] DB error:", e.message);
    return ok({ gameUnlocked: false });
  }
}

async function handlePurchaseCreateCheckout(req) {
  const deviceId = getDeviceId(req);
  if (!deviceId) {
    return err("BAD_REQUEST", "Missing device ID");
  }

  try {
    const stripe = getStripe();
    const origin =
      req.headers.origin ||
      req.headers.referer?.replace(/\/$/, "") ||
      "https://dothunter-six.vercel.app";

    // Get or create device record
    const device = await getOrCreateDevice(deviceId);

    // Already unlocked?
    if (device.game_unlocked) {
      return ok({ alreadyUnlocked: true, url: null });
    }

    // Get or create Stripe customer (anonymous — no email required)
    let customerId = device.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { device_id: deviceId },
      });
      customerId = customer.id;
      await setDeviceStripeCustomerId(deviceId, customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: deviceId,
      mode: "payment",
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
        device_id: deviceId,
        product_type: "game_unlock",
      },
      success_url: `${origin}/play?payment=success`,
      cancel_url: `${origin}/play?payment=cancelled`,
    });

    return ok({ alreadyUnlocked: false, url: session.url });
  } catch (e) {
    console.error("[purchase.createCheckout] Error:", e.message);
    return err("INTERNAL_SERVER_ERROR", "Failed to create checkout session");
  }
}

// ── Handler map ─────────────────────────────────────────────────────

const handlers = {
  "auth.me": handleAuthMe,
  "auth.logout": handleAuthLogout,
  "purchase.status": handlePurchaseStatus,
  "purchase.createCheckout": handlePurchaseCreateCheckout,
  "system.health": async () => ok({ status: "ok" }),
};

// ── Main handler ────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-device-id");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract procedure name(s) from URL
  let procedures = req.query.trpc || req.query.path;
  if (!procedures) {
    const urlPath = req.url.split("?")[0];
    const match = urlPath.match(/\/api\/trpc\/(.+)/);
    if (match) procedures = match[1];
  }

  if (!procedures) {
    return res.status(400).json({ error: "No procedure specified" });
  }

  const procedureList = procedures.split(",");
  const isBatch = req.query.batch === "1";

  const results = await Promise.all(
    procedureList.map(async (proc) => {
      const trimmed = proc.trim();
      const h = handlers[trimmed];
      if (h) {
        return h(req);
      }
      return ok(null);
    })
  );

  res.setHeader("Content-Type", "application/json");

  if (isBatch) {
    return res.status(200).json(results);
  }
  return res.status(200).json(results[0]);
}
