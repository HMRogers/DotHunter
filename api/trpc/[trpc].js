/**
 * Vercel Serverless Function — tRPC stub handler
 * 
 * This provides minimal tRPC-compatible responses so the frontend
 * can load and run the game without a full Express backend.
 * 
 * The game logic is 100% client-side (localStorage). The backend
 * is only used for optional auth + Stripe payment. This stub
 * returns "not authenticated" for auth queries and graceful
 * responses for purchase queries, allowing the game to be fully
 * playable in its free-tier mode.
 */

function superjsonSerialize(data) {
  return { json: data };
}

function makeTrpcResult(data) {
  return {
    result: {
      data: superjsonSerialize(data),
    },
  };
}

function makeTrpcError(code, message) {
  return {
    error: {
      message,
      code: -32600,
      data: {
        code,
        httpStatus: code === "UNAUTHORIZED" ? 401 : 400,
        path: "",
      },
    },
  };
}

// Route handlers for each tRPC procedure
const handlers = {
  "auth.me": () => makeTrpcResult(null),
  "auth.logout": () => makeTrpcResult({ success: true }),
  "purchase.status": () => makeTrpcResult({ gameUnlocked: false }),
  "purchase.createCheckout": () =>
    makeTrpcError("UNAUTHORIZED", "Please login (10001)"),
  "purchase.adminUnlock": () =>
    makeTrpcError("UNAUTHORIZED", "Please login (10001)"),
  "system.health": () => makeTrpcResult({ status: "ok" }),
};

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Vercel routes /api/trpc/auth.me to this function with different query params:
  // - "trpc" param from the catch-all route: /api/trpc/[trpc] -> trpc=auth.me
  // - "path" param from the rewrite rule: ?path=auth.me
  // Also check the URL path directly as fallback
  let procedures = req.query.trpc || req.query.path;

  if (!procedures) {
    // Extract from the URL path: /api/trpc/auth.me -> auth.me
    const urlPath = req.url.split("?")[0];
    const match = urlPath.match(/\/api\/trpc\/(.+)/);
    if (match) {
      procedures = match[1];
    }
  }

  if (!procedures) {
    return res.status(400).json({ error: "No procedure specified" });
  }

  const procedureList = procedures.split(",");
  const isBatch = req.query.batch === "1";

  const results = procedureList.map((proc) => {
    const trimmed = proc.trim();
    const h = handlers[trimmed];
    if (h) {
      return h();
    }
    // Unknown procedure — return null result gracefully
    return makeTrpcResult(null);
  });

  res.setHeader("Content-Type", "application/json");

  if (isBatch) {
    return res.status(200).json(results);
  }

  return res.status(200).json(results[0]);
}
