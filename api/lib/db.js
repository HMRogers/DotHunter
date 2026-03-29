/**
 * Database helper for Vercel serverless functions.
 * Uses pg (node-postgres) with Neon PostgreSQL.
 * Connection is pooled across invocations within the same lambda instance.
 */
import pg from "pg";
const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1, // Serverless: keep pool small
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Get or create a device record by device_id.
 * Returns { id, device_id, stripe_customer_id, game_unlocked, unlocked_at }
 */
export async function getOrCreateDevice(deviceId) {
  const p = getPool();
  // Try to find existing device
  const existing = await p.query(
    "SELECT id, device_id, stripe_customer_id, game_unlocked, unlocked_at FROM devices WHERE device_id = $1",
    [deviceId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }
  // Create new device record
  const inserted = await p.query(
    "INSERT INTO devices (device_id) VALUES ($1) ON CONFLICT (device_id) DO NOTHING RETURNING id, device_id, stripe_customer_id, game_unlocked, unlocked_at",
    [deviceId]
  );
  if (inserted.rows.length > 0) {
    return inserted.rows[0];
  }
  // Race condition: another request created it first
  const retry = await p.query(
    "SELECT id, device_id, stripe_customer_id, game_unlocked, unlocked_at FROM devices WHERE device_id = $1",
    [deviceId]
  );
  return retry.rows[0];
}

/**
 * Check if a device is unlocked.
 */
export async function getDeviceStatus(deviceId) {
  const p = getPool();
  const result = await p.query(
    "SELECT game_unlocked, stripe_customer_id FROM devices WHERE device_id = $1",
    [deviceId]
  );
  if (result.rows.length === 0) {
    return { gameUnlocked: false, stripeCustomerId: null };
  }
  return {
    gameUnlocked: result.rows[0].game_unlocked || false,
    stripeCustomerId: result.rows[0].stripe_customer_id || null,
  };
}

/**
 * Set the Stripe customer ID for a device.
 */
export async function setDeviceStripeCustomerId(deviceId, stripeCustomerId) {
  const p = getPool();
  await p.query(
    "UPDATE devices SET stripe_customer_id = $1, updated_at = NOW() WHERE device_id = $2",
    [stripeCustomerId, deviceId]
  );
}

/**
 * Mark a device as unlocked after successful payment.
 */
export async function markDeviceUnlocked(deviceId) {
  const p = getPool();
  await p.query(
    "UPDATE devices SET game_unlocked = TRUE, unlocked_at = NOW(), updated_at = NOW() WHERE device_id = $1",
    [deviceId]
  );
}

/**
 * Record a payment in the payments audit table.
 */
export async function recordPayment(deviceId, sessionId, paymentIntentId, status) {
  const p = getPool();
  await p.query(
    `INSERT INTO payments (device_id, stripe_session_id, stripe_payment_intent_id, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stripe_session_id) DO UPDATE SET status = $4`,
    [deviceId, sessionId, paymentIntentId || null, status]
  );
}
