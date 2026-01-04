import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Subscription price IDs (set these in Stripe Dashboard)
export const SUBSCRIPTION_PRICES = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
  YEARLY: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly',
} as const;

// Credit top-up amounts (in INR)
export const CREDIT_PACKAGES = {
  SMALL: { credits: 10, amount: 10000 }, // ₹100
  MEDIUM: { credits: 25, amount: 20000 }, // ₹200
  LARGE: { credits: 50, amount: 35000 }, // ₹350
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;
