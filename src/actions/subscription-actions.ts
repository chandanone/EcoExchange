'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, SUBSCRIPTION_PRICES } from '@/lib/stripe';
import { createSubscriptionSchema, type CreateSubscriptionInput } from '@/lib/validations';
import { ActionResponse } from '@/types';

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<ActionResponse<{ sessionUrl: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = createSubscriptionSchema.parse(input);

    // Get or create Stripe customer
    let stripeCustomerId = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true },
      })
      .then((user) => user?.stripeCustomerId);

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId },
      });
    }

    // Create Stripe Checkout Session
    const priceId =
      validatedData.tier === 'MONTHLY'
        ? SUBSCRIPTION_PRICES.MONTHLY
        : SUBSCRIPTION_PRICES.YEARLY;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?cancelled=true`,
      metadata: {
        userId: session.user.id,
        tier: validatedData.tier,
      },
    });

    return {
      success: true,
      data: { sessionUrl: checkoutSession.url! },
    };
  } catch (error) {
    console.error('Create subscription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
}

export async function cancelSubscription(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId) {
      return { success: false, error: 'No active subscription found' };
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    revalidatePath('/subscription');

    return { success: true };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
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
      return { success: false, error: 'Unauthorized' };
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
      return { success: false, error: 'User not found' };
    }

    let subscriptionDetails = {
      tier: user.subscriptionTier,
      status: 'active',
      currentPeriodEnd: user.subscriptionEndsAt || undefined,
      cancelAtPeriodEnd: false,
    };

    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
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
    console.error('Get subscription details error:', error);
    return {
      success: false,
      error: 'Failed to fetch subscription details',
    };
  }
}

export async function createBillingPortalSession(): Promise<
  ActionResponse<{ sessionUrl: string }>
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return { success: false, error: 'No Stripe customer found' };
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
    console.error('Create portal session error:', error);
    return {
      success: false,
      error: 'Failed to create billing portal session',
    };
  }
}
