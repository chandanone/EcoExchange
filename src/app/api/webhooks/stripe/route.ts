import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  if (session.mode === 'subscription') {
    // Handle subscription checkout
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const tier = session.metadata?.tier === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    const creditsToAdd = tier === 'YEARLY' ? 250 : 20;

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionTier: tier,
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        credits: {
          increment: creditsToAdd,
        },
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: creditsToAdd,
        type: 'SUBSCRIPTION',
        description: `${tier} subscription activated - ${creditsToAdd} credits added`,
      },
    });
  } else if (session.mode === 'payment') {
    // Handle one-time credit purchase
    const credits = parseInt(session.metadata?.credits || '0');
    const paymentIntentId = session.payment_intent as string;

    if (credits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: credits,
          },
        },
      });

      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: 'TOP_UP',
          stripePaymentIntentId: paymentIntentId,
          description: `Credit top-up - ${credits} credits added`,
        },
      });
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) {
    // Try to find user by customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!user) {
      console.error('No user found for subscription');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
      },
    });
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
      subscriptionTier: 'FREE',
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // This is already handled in checkout.session.completed for our use case
  // But we can add additional logging or processing here if needed
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
}
