/**
 * Stripe client singleton for Vercel serverless functions.
 */
import Stripe from "stripe";

let _stripe = null;

export function getStripe() {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2024-12-18.acacia",
    });
  }
  return _stripe;
}

export const DOTHUNTER_PRODUCT = {
  name: "DotHunter Full Game Unlock",
  description:
    "Unlimited rounds in all 3 game modes — Classic Focus, Color Filter, and Dual Hunt. No ads, no interruptions.",
  price: {
    amount: 199, // $1.99 in cents
    currency: "usd",
  },
};
