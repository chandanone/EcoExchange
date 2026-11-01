import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { stripe, SUBSCRIPTION_PRICES } from "@/lib/stripe";
import Stripe from "stripe";

function normalizeTier(value?: string | null): "MONTHLY" | "YEARLY" | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "MONTHLY" || normalized === "YEARLY") {
    return normalized;
  }
  return null;
}

async function resolveUserIdFromStripe({
  subscriptionId,
  customerId,
  fallbackUserId,
}: {
  subscriptionId?: string | null;
  customerId?: string | null;
  fallbackUserId?: string | null;
}) {
  if (fallbackUserId) {
    return fallbackUserId;
  }

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      if (userId) return userId;
    } catch (error) {
      console.error("Failed to retrieve Stripe subscription during user resolution:", error);
    }
  }

  if (customerId) {
    const userByCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (userByCustomer?.id) return userByCustomer.id;
  }

  if (subscriptionId) {
    const userBySubscription = await prisma.user.findFirst({
      where: {
        OR: [{ stripeSubscriptionId: subscriptionId }, { stripeCustomerId: customerId || undefined }],
      },
      select: { id: true },
    });

    if (userBySubscription?.id) return userBySubscription.id;
  }

  return null;
}

async function resolveTierForSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === SUBSCRIPTION_PRICES.YEARLY) return "YEARLY" as const;
    if (priceId === SUBSCRIPTION_PRICES.MONTHLY) return "MONTHLY" as const;

    const metadataTier = normalizeTier(subscription.metadata?.tier);
    if (metadataTier) return metadataTier;
  } catch (error) {
    console.error("Failed to resolve subscription tier from Stripe:", error);
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  let userId = session.metadata?.userId;

  if (!userId && session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    userId = subscription.metadata?.userId;
  }

  if (!userId && session.customer) {
    const userByCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId: session.customer as string },
      select: { id: true },
    });
    userId = userByCustomer?.id;
  }

  if (!userId) {
    console.error(
      "CRITICAL: No userId found in session, subscription, or database for customer:",
      session.customer
    );
    return;
  }

  if (session.mode === "subscription") {
    const subscriptionId = session.subscription as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, subscriptionTier: true },
    });

    if (!user?.stripeSubscriptionId || user.subscriptionTier === "FREE") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeSubscriptionId: subscriptionId,
        },
      });
    }
  } else if (session.mode === "payment") {
    const credits = parseInt(session.metadata?.credits || "0");
    const paymentIntentId = session.payment_intent as string;

    if (credits > 0) {
      const existingTransaction = await prisma.creditTransaction.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (existingTransaction) {
        console.log(`Payment intent ${paymentIntentId} already processed. Skipping.`);
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: credits,
            },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            amount: credits,
            type: "TOP_UP",
            stripePaymentIntentId: paymentIntentId,
            description: `Credit top-up - ${credits} credits added`,
          },
        }),
      ]);
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const metadataUserId =
    (invoice as any).subscription_details?.metadata?.userId ||
    (invoice as any).metadata?.userId;

  const userId = await resolveUserIdFromStripe({
    subscriptionId,
    customerId: invoice.customer as string | null,
    fallbackUserId: metadataUserId,
  });

  if (!userId) {
    console.error("CRITICAL: Failed to resolve user from invoice:", invoice.id);
    return;
  }

  // Prefer Stripe subscription metadata over invoice heuristics to avoid wrong tier assignment.
  const tier =
    (await resolveTierForSubscription(subscriptionId)) ||
    normalizeTier((invoice as any).metadata?.tier) ||
    normalizeTier((invoice as any).subscription_details?.metadata?.tier) ||
    normalizeTier((invoice.lines.data[0] as any)?.metadata?.tier);

  if (!tier) {
    console.error("CRITICAL: Could not resolve subscription tier for invoice:", invoice.id);
    return;
  }

  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) {
    console.log(`Zero-amount invoice ${invoice.id} for user ${userId}. Skipping crediting.`);
    return;
  }

  const paymentIntentId = invoice.payment_intent as string;
  if (paymentIntentId) {
    const existingTransaction = await prisma.creditTransaction.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (existingTransaction) {
      console.log(`Invoice ${invoice.id} already processed via payment intent ${paymentIntentId}. Skipping.`);
      return;
    }
  }

  const creditsToAdd = tier === "YEARLY" ? 250 : 20;
  const line = invoice.lines.data[0];
  const validityStart = line ? new Date(line.period.start * 1000) : null;
  const validityEnd = line ? new Date(line.period.end * 1000) : null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionEndsAt: validityEnd,
        subscriptionTier: tier,
        credits: { increment: creditsToAdd },
        stripeSubscriptionId: subscriptionId,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: creditsToAdd,
        type: "SUBSCRIPTION",
        stripePaymentIntentId: paymentIntentId,
        validityStart,
        validityEnd,
        description: `Subscription (${tier}) activated - ₹${amountPaid / 100} paid - ${creditsToAdd} credits added`,
      },
    }),
  ]);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    console.log(`Payment failed for user ${user.id}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) return;

  // Treat subscription lifecycle as the source of truth for plan status.
  // Canceled/unpaid/incomplete states must not leave the user marked as active.
  const isCanceled =
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired";

  const resolvedTier =
    (await resolveTierForSubscription(subscription.id)) ?? user.subscriptionTier;

  if (isCanceled) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: "FREE",
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: resolvedTier,
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "FREE",
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
}
