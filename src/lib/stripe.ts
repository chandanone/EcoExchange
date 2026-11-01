import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const STRIPE_PLACEHOLDER_PRICE_IDS = new Set(["price_monthly", "price_yearly"]);

function getRequiredStripeEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing Stripe environment variable: ${name}. Add it to your environment before starting the app.`
    );
  }

  if (STRIPE_PLACEHOLDER_PRICE_IDS.has(value)) {
    throw new Error(
      `Placeholder Stripe price ID detected for ${name}. Replace it with a real Stripe Price ID.`
    );
  }

  return value;
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export const SUBSCRIPTION_PRICES = {
  MONTHLY: getRequiredStripeEnv("STRIPE_MONTHLY_PRICE_ID"),
  YEARLY: getRequiredStripeEnv("STRIPE_YEARLY_PRICE_ID"),
} as const;

export function resolveSubscriptionPriceId(
  tier: "MONTHLY" | "YEARLY"
): string {
  const priceId =
    tier === "MONTHLY" ? SUBSCRIPTION_PRICES.MONTHLY : SUBSCRIPTION_PRICES.YEARLY;

  if (!priceId || STRIPE_PLACEHOLDER_PRICE_IDS.has(priceId)) {
    throw new Error(
      `Stripe ${tier.toLowerCase()} price is not configured. Check STRIPE_${tier}_PRICE_ID in your environment.`
    );
  }

  return priceId;
}

export const CREDIT_PACKAGES = {
  SMALL: { credits: 10, amount: 10000 }, // ₹100
  MEDIUM: { credits: 25, amount: 20000 }, // ₹200
  LARGE: { credits: 50, amount: 35000 }, // ₹350
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;
