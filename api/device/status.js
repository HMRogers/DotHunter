/**
 * Vercel Serverless Function — Device Status Check
 *
 * Simple GET endpoint to check if a device is unlocked.
 * Used as a fallback / direct check outside of tRPC.
 *
 * GET /api/device/status?deviceId=xxx
 */
import { getDeviceStatus } from "../lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-device-id");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const deviceId = req.query.deviceId || req.headers["x-device-id"];

  if (!deviceId) {
    return res.status(400).json({ error: "Missing deviceId parameter" });
  }

  try {
    const status = await getDeviceStatus(deviceId);
    return res.status(200).json({
      deviceId,
      gameUnlocked: status.gameUnlocked,
    });
  } catch (e) {
    console.error("[device/status] Error:", e.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
