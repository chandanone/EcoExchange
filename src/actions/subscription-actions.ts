"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, SUBSCRIPTION_PRICES } from "@/lib/stripe";
import {
  createSubscriptionSchema,
  type CreateSubscriptionInput,
} from "@/lib/validations";
import { ActionResponse } from "@/types";

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<ActionResponse<{ sessionUrl: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createSubscriptionSchema.parse(input);

    // Get or create Stripe customer
    let stripeCustomerId = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true, stripeSubscriptionId: true },
      })
      .then((user) => ({ customerId: user?.stripeCustomerId, subscriptionId: user?.stripeSubscriptionId }));

    if (!stripeCustomerId?.customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id },
      });

      stripeCustomerId = { customerId: customer.id, subscriptionId: null };
    }

    // Handle existing subscription
    let newSubStartTimestamp: number | undefined = undefined;

    if (stripeCustomerId.subscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(stripeCustomerId.subscriptionId);

        if (existingSub.status === "active" || existingSub.status === "trialing") {
          // Check what tier the existing subscription is
          const existingPriceId = existingSub.items.data[0]?.price?.id;
          const requestedPriceId = validatedData.tier === "MONTHLY"
            ? SUBSCRIPTION_PRICES.MONTHLY
            : SUBSCRIPTION_PRICES.YEARLY;

          // Block if user already has the same plan
          if (existingPriceId === requestedPriceId) {
            return {
              success: false,
              error: `You already have an active ${validatedData.tier.toLowerCase()} subscription.`,
            };
          }

          // Switching to a different tier: let current plan finish, then start new one
          await stripe.subscriptions.update(stripeCustomerId.subscriptionId, {
            cancel_at_period_end: true,
          });
          console.log(`Existing subscription set to cancel at period end: ${new Date(existingSub.current_period_end * 1000).toISOString()}`);

          newSubStartTimestamp = existingSub.current_period_end;
        }
      } catch (err) {
        console.log("Could not retrieve existing subscription, proceeding with new one");
      }
    }

    // Create Stripe Checkout Session
    const priceId =
      validatedData.tier === "MONTHLY"
        ? SUBSCRIPTION_PRICES.MONTHLY
        : SUBSCRIPTION_PRICES.YEARLY;

    let appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Explicit safety check: some environments might return '"undefined"' or actual undefined
    if (!appUrl || appUrl.includes('undefined')) {
      appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    }

    console.log(`Creating subscription session: tier=${validatedData.tier}, priceId=${priceId}, appUrl=${appUrl}`);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId.customerId!,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/subscription?success=true`,
      cancel_url: `${appUrl}/subscription?cancelled=true`,
      metadata: {
        userId: session.user.id,
        tier: validatedData.tier,
      },
      // CRITICAL: Metadata for the Subscription (recurring use)
      // This ensures invoice.paid always knows which userId to credit
      subscription_data: {
        metadata: {
          userId: session.user.id,
          tier: validatedData.tier,
        },
        // If there's an existing sub, defer billing until it expires
        // trial_end means "don't charge until this date"
        ...(newSubStartTimestamp ? { trial_end: newSubStartTimestamp } : {}),
      },
    });

    return {
      success: true,
      data: { sessionUrl: checkoutSession.url! },
    };
  } catch (error) {
    console.error("Create subscription error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create subscription",
    };
  }
}

export async function cancelSubscription(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId) {
      return { success: false, error: "No active subscription found" };
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    revalidatePath("/subscription");

    return { success: true };
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
    };
  }
}

export async function getSubscriptionDetails(): Promise<
  ActionResponse<{
    tier: string;
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        stripeSubscriptionId: true,
        subscriptionEndsAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    let subscriptionDetails = {
      tier: user.subscriptionTier,
      status: "active",
      currentPeriodEnd: user.subscriptionEndsAt || undefined,
      cancelAtPeriodEnd: false,
    };

    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      );
      subscriptionDetails = {
        tier: user.subscriptionTier,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }

    return {
      success: true,
      data: subscriptionDetails,
    };
  } catch (error) {
    console.error("Get subscription details error:", error);
    return {
      success: false,
      error: "Failed to fetch subscription details",
    };
  }
}

export async function createBillingPortalSession(): Promise<
  ActionResponse<{ sessionUrl: string }>
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return { success: false, error: "No Stripe customer found" };
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    });

    return {
      success: true,
      data: { sessionUrl: portalSession.url },
    };
  } catch (error) {
    console.error("Create portal session error:", error);
    return {
      success: false,
      error: "Failed to create billing portal session",
    };
  }
}
