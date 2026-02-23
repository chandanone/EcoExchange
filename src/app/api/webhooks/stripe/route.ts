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

  // Fallback for subscriptions where metadata might be in subscription_data
  if (!userId && session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    userId = subscription.metadata?.userId;
  }

  if (!userId) {
    console.error("No userId found in session or subscription metadata");
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

  // 1. Identify the User
  let userId = invoice.subscription_details?.metadata?.userId;
  let tier: string | undefined = invoice.subscription_details?.metadata?.tier;

  // Fallback: Check all line items for Price IDs (Most reliable)
  let foundTierFromPrice = false;
  console.log(`Invoice lines count: ${invoice.lines.data.length}`);

  for (const line of invoice.lines.data) {
    const pId = line.price?.id;
    console.log(`Checking line item price ID: ${pId}`);
    if (pId === SUBSCRIPTION_PRICES.YEARLY) {
      tier = "YEARLY";
      foundTierFromPrice = true;
      console.log("Matched YEARLY price ID");
      break;
    } else if (pId === SUBSCRIPTION_PRICES.MONTHLY) {
      tier = "MONTHLY";
      foundTierFromPrice = true;
      console.log("Matched MONTHLY price ID");
      break;
    }
  }

  // Fallback: Fetch from subscription object if still missing userId
  if (!userId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = subscription.metadata?.userId;
    if (!tier) tier = subscription.metadata?.tier;
  }

  // 1.5 Safety Fallback: Use amount paid to confirm tier (Most resilient against metadata/price ID sync issues)
  const amountPaid = invoice.amount_paid; // in paise (e.g., 100000 = ₹1000)
  console.log(`Amount paid: ${amountPaid}`);

  if (amountPaid >= 100000) {
    console.log("Amount matches YEARLY plan (>= ₹1000). Forcing tier to YEARLY.");
    tier = "YEARLY";
  } else if (amountPaid >= 30000 && amountPaid < 100000) {
    console.log("Amount matches MONTHLY plan (>= ₹300). Forcing tier to MONTHLY.");
    tier = "MONTHLY";
  }

  console.log(`Final resolution: userId=${userId}, tier=${tier}, foundFromPrice=${foundTierFromPrice}, amountPaid=${amountPaid}`);

  if (!userId || !tier) {
    console.error(
      "Critical: Could not find userId or tier for subscription fulfillment:",
      { subscriptionId, userId, tier }
    );
    return;
  }

  // 2. Map Tiers to Credit Amounts
  const creditsMap: Record<string, number> = {
    YEARLY: 250,
    MONTHLY: 20,
  };

  const creditsToAdd = creditsMap[tier.toUpperCase()];

  if (!creditsToAdd) {
    console.error(`No credit rule defined for tier: ${tier}`);
    return;
  }

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
