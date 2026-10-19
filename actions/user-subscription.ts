"use server";

import { APP_NAME, features } from "@/config";
import { getUserSubscription } from "@/db/queries";
import { getAuth, getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

const returnUrl = absoluteUrl("/shop");

export const createStripeUrl = async () => {
  if (!features.payments) throw new Error("Payments are disabled.");

  const { userId } = await getAuth();
  const user = await getCurrentUser();

  if (!userId || !user) throw new Error("Unauthorized.");

  const userSubscription = await getUserSubscription();

  // redirect user to customer portal who already have a subscription
  if (userSubscription && userSubscription.stripeCustomerId) {
    const stripeSession = await getStripe().billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { data: stripeSession.url };
  }

  // checkout
  const stripeSession = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "USD",
          product_data: {
            name: `${APP_NAME} Pro`,
            description: "Unlimited hearts.",
          },
          unit_amount: 2000, // $20.00 USD
          recurring: {
            interval: "month",
          },
        },
      },
    ],
    metadata: {
      userId,
    },
    success_url: returnUrl,
    cancel_url: returnUrl,
  });

  return { data: stripeSession.url };
};
