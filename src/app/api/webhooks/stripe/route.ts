import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, SUBSCRIPTION_PRICES } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

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

  // Fallback for sub or session missing metadata
  if (!userId && session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    userId = subscription.metadata?.userId;
  }

  // Database fallback if still no userId
  if (!userId && session.customer) {
    const userByCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId: session.customer as string },
      select: { id: true }
    });
    userId = userByCustomer?.id;
  }

  if (!userId) {
    console.error("CRITICAL: No userId found in session, subscription, or database for customer:", session.customer);
    return;
  }

  if (session.mode === "subscription") {
    // Handle subscription checkout
    const subscriptionId = session.subscription as string;
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscriptionId,
      },
    });
  } else if (session.mode === "payment") {
    // Handle one-time credit purchase
    const credits = parseInt(session.metadata?.credits || "0");
    const paymentIntentId = session.payment_intent as string;

    if (credits > 0) {
      // Idempotency check
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

  // 1. Identify the User - Multiple Fallback Strategy
  let userId = invoice.subscription_details?.metadata?.userId || (invoice as any).metadata?.userId;
  const amountPaid = invoice.amount_paid; // in paise

  console.log("========== WEBHOOK DEBUG START ==========");
  console.log(`Invoice ID: ${invoice.id}, Subscription ID: ${subscriptionId}`);
  console.log(`Initial UserId from metadata: ${userId || 'MISSING'}`);
  console.log(`Amount Paid: ₹${amountPaid / 100}`);

  // Fallback 1: Fetch from subscription object from Stripe
  if (!userId && subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.userId;
      console.log(`UserId from subscription retrieve: ${userId || 'MISSING'}`);
    } catch (err) {
      console.error(`Error retrieving subscription ${subscriptionId}:`, err);
    }
  }

  // Fallback 2: Find user in database by stripeSubscriptionId
  if (!userId && subscriptionId) {
    const userBySubscription = await prisma.user.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          { stripeCustomerId: invoice.customer as string }
        ]
      },
      select: { id: true }
    });
    userId = userBySubscription?.id;
    console.log(`UserId from database lookup: ${userId || 'MISSING'} (checked via subscriptionId or customerId)`);
  }

  // === TIER RESOLUTION WITH FULL DEBUG ===
  console.log(`ENV YEARLY Price ID: "${SUBSCRIPTION_PRICES.YEARLY}"`);
  console.log(`ENV MONTHLY Price ID: "${SUBSCRIPTION_PRICES.MONTHLY}"`);

  let resolvedTier: string | undefined = undefined;
  let resolutionMethod = "NONE";

  // Step 1: Check Price IDs from invoice line items
  for (const line of invoice.lines.data) {
    const pId = line.price?.id;
    console.log(`Invoice Line Price ID: "${pId}"`);

    if (pId === SUBSCRIPTION_PRICES.YEARLY || pId === process.env.STRIPE_YEARLY_PRICE_ID) {
      resolvedTier = "YEARLY";
      resolutionMethod = "PRICE_ID";
      break;
    } else if (pId === SUBSCRIPTION_PRICES.MONTHLY || pId === process.env.STRIPE_MONTHLY_PRICE_ID) {
      resolvedTier = "MONTHLY";
      resolutionMethod = "PRICE_ID";
      break;
    }
  }

  // Step 2: Fallback to Metadata
  if (!resolvedTier) {
    const metaTier = invoice.subscription_details?.metadata?.tier || (invoice as any).metadata?.tier || (invoice.lines.data[0]?.metadata?.tier);
    console.log(`Metadata tier from all locations: "${metaTier || 'MISSING'}"`);
    resolvedTier = metaTier as string;
    if (resolvedTier) resolutionMethod = "METADATA";
  }

  // Step 3: Fallback to Amount (Multi-currency safe-ish ranges for INR)
  if (!resolvedTier) {
    console.log(`No tier from Price ID or Metadata. Using amount fallback: ${amountPaid}`);
    // ₹1000 = 100,000 paise. (Yearly)
    // ₹300 = 30,000 paise. (Monthly)
    if (amountPaid >= 80000) {
      resolvedTier = "YEARLY";
      resolutionMethod = "AMOUNT";
    } else if (amountPaid >= 20000) {
      resolvedTier = "MONTHLY";
      resolutionMethod = "AMOUNT";
    }
  }

  // Normalize tier to uppercase
  const tier = resolvedTier?.toUpperCase();
  console.log(`FINAL TIER Resolved: "${tier || 'UNKNOWN'}" (via: ${resolutionMethod})`);
  console.log("========== WEBHOOK DEBUG END ==========")

  if (!userId || !tier) {
    console.error("CRITICAL: Failed to resolve userId or tier after all fallbacks:", { userId, tier });
    return;
  }

  // Explicit credit assignment
  let creditsToAdd: number;
  if (tier === "YEARLY") {
    creditsToAdd = 250;
  } else if (tier === "MONTHLY") {
    creditsToAdd = 20;
  } else {
    console.error(`Unknown tier "${tier}" - skipping credits`);
    return;
  }

  console.log(`CREDITS TO ADD: ${creditsToAdd} for tier "${tier}"`);
  console.log("========== WEBHOOK DEBUG END ==========")

  // 3. Prevent Double Crediting (Idempotency)
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

  // 4. Atomic Database Update
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionEndsAt: new Date(invoice.lines.data[0].period.end * 1000),
          subscriptionTier: tier as any, // Casts to your Prisma Enum
          credits: { increment: creditsToAdd },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: creditsToAdd,
          type: "SUBSCRIPTION",
          stripePaymentIntentId: paymentIntentId,
          description: `Subscription (${tier}) activated - ₹${amountPaid / 100} paid - ${creditsToAdd} credits added`,
        },
      }),
    ]);
    console.log(`Successfully credited ${creditsToAdd} to user ${userId}`);
  } catch (error) {
    console.error("Failed to update database for invoice:", invoice.id, error);
    throw error; // Re-throw so Stripe knows the webhook failed and will retry
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    // Optionally send notification to user about payment failure
    console.log(`Payment failed for user ${user.id}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
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

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  // This is already handled in checkout.session.completed for our use case
  // But we can add additional logging or processing here if needed
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
}
