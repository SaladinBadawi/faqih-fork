import Stripe from "stripe";

let client: Stripe | null = null;

// Lazily created so the app runs without Stripe keys when payments are disabled.
export const getStripe = () => {
  if (!process.env.STRIPE_API_SECRET_KEY)
    throw new Error("STRIPE_API_SECRET_KEY is not set.");

  client ??= new Stripe(process.env.STRIPE_API_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return client;
};
