'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { creditTopUpSchema, type CreditTopUpInput } from '@/lib/validations';
import { ActionResponse } from '@/types';

export async function createCreditTopUp(
  input: CreditTopUpInput
): Promise<ActionResponse<{ sessionUrl: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = creditTopUpSchema.parse(input);
    const packageDetails = CREDIT_PACKAGES[validatedData.package];

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

    // Create Stripe Checkout Session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${packageDetails.credits} Swap Credits`,
              description: `Top up ${packageDetails.credits} credits for plant swapping`,
            },
            unit_amount: packageDetails.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_added=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cancelled=true`,
      metadata: {
        userId: session.user.id,
        credits: packageDetails.credits.toString(),
        type: 'CREDIT_TOP_UP',
      },
    });

    return {
      success: true,
      data: { sessionUrl: checkoutSession.url! },
    };
  } catch (error) {
    console.error('Create credit top-up error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credit top-up',
    };
  }
}

export async function addCreditsToUser(
  userId: string,
  credits: number,
  type: string,
  paymentIntentId?: string
): Promise<ActionResponse> {
  try {
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
          type,
          stripePaymentIntentId: paymentIntentId,
          description: `Added ${credits} credits via ${type}`,
        },
      }),
    ]);

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Add credits error:', error);
    return {
      success: false,
      error: 'Failed to add credits',
    };
  }
}

export async function deductCredits(
  userId: string,
  credits: number,
  reason: string
): Promise<ActionResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.credits < credits) {
      return { success: false, error: 'Insufficient credits' };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: credits,
          },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -credits,
          type: 'SWAP_DEDUCTION',
          description: reason,
        },
      }),
    ]);

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Deduct credits error:', error);
    return {
      success: false,
      error: 'Failed to deduct credits',
    };
  }
}

export async function getCreditHistory(): Promise<
  ActionResponse<
    Array<{
      id: string;
      amount: number;
      type: string;
      description: string | null;
      createdAt: Date;
    }>
  >
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error('Get credit history error:', error);
    return {
      success: false,
      error: 'Failed to fetch credit history',
    };
  }
}
