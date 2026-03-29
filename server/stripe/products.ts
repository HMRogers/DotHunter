/**
 * DotHunter Stripe Product Configuration
 * Centralized product/price definitions for the $1.99 game unlock
 */

export const DOTHUNTER_PRODUCT = {
  name: "DotHunter Full Game Unlock",
  description: "Unlimited rounds in all 3 game modes — Classic Focus, Color Filter, and Dual Hunt. No ads, no interruptions.",
  price: {
    amount: 199, // $1.99 in cents
    currency: "usd",
  },
  metadata: {
    product_type: "game_unlock",
    version: "1.0",
  },
};
