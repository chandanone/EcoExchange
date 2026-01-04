'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createSwapRequestSchema,
  updateSwapRequestSchema,
  type CreateSwapRequestInput,
  type UpdateSwapRequestInput,
} from '@/lib/validations';
import { ActionResponse, SafeSwapRequest } from '@/types';
import { deductCredits } from './credit-actions';

export async function createSwapRequest(
  input: CreateSwapRequestInput
): Promise<ActionResponse<SafeSwapRequest>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = createSwapRequestSchema.parse(input);

    // Get plant details
    const plant = await prisma.plant.findUnique({
      where: { id: validatedData.plantId },
      select: { donorId: true, status: true },
    });

    if (!plant) {
      return { success: false, error: 'Plant not found' };
    }

    if (plant.status !== 'APPROVED') {
      return { success: false, error: 'Plant is not available for swapping' };
    }

    if (plant.donorId === session.user.id) {
      return { success: false, error: 'You cannot request your own plant' };
    }

    // Check if user has sufficient credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user || user.credits < 1) {
      return {
        success: false,
        error: 'Insufficient credits. Please top up to make swap requests.',
      };
    }

    // Create swap request
    const swapRequest = await prisma.swapRequest.create({
      data: {
        plantId: validatedData.plantId,
        requesterId: session.user.id,
        ownerId: plant.donorId,
        message: validatedData.message,
        status: 'PENDING',
      },
      include: {
        plant: {
          select: {
            id: true,
            species: true,
            commonName: true,
            imageUrl: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    revalidatePath('/swap-requests');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: swapRequest as SafeSwapRequest,
    };
  } catch (error) {
    console.error('Create swap request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create swap request',
    };
  }
}

export async function updateSwapRequest(
  input: UpdateSwapRequestInput
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = updateSwapRequestSchema.parse(input);

    // Verify ownership
    const existingRequest = await prisma.swapRequest.findUnique({
      where: { id: validatedData.requestId },
      select: {
        ownerId: true,
        requesterId: true,
        status: true,
      },
    });

    if (!existingRequest) {
      return { success: false, error: 'Swap request not found' };
    }

    // Only owner can accept/reject, only requester can cancel
    if (
      (validatedData.status === 'CANCELLED' &&
        existingRequest.requesterId !== session.user.id) ||
      ((validatedData.status === 'ACCEPTED' || validatedData.status === 'REJECTED') &&
        existingRequest.ownerId !== session.user.id)
    ) {
      return { success: false, error: 'Forbidden' };
    }

    // Update swap request
    await prisma.swapRequest.update({
      where: { id: validatedData.requestId },
      data: {
        status: validatedData.status,
        ownerNotes: validatedData.ownerNotes,
      },
    });

    // Deduct credit if accepted
    if (validatedData.status === 'ACCEPTED') {
      const deductResult = await deductCredits(
        existingRequest.requesterId,
        1,
        `Swap request accepted for request ${validatedData.requestId}`
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: 'Failed to deduct credit',
        };
      }
    }

    revalidatePath('/swap-requests');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Update swap request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update swap request',
    };
  }
}

export async function getMySwapRequests(): Promise<ActionResponse<SafeSwapRequest[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const requests = await prisma.swapRequest.findMany({
      where: {
        OR: [{ requesterId: session.user.id }, { ownerId: session.user.id }],
      },
      include: {
        plant: {
          select: {
            id: true,
            species: true,
            commonName: true,
            imageUrl: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: requests as SafeSwapRequest[],
    };
  } catch (error) {
    console.error('Get swap requests error:', error);
    return {
      success: false,
      error: 'Failed to fetch swap requests',
    };
  }
}
