'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { approvalSchema, type ApprovalInput } from '@/lib/validations';
import { ActionResponse, PendingPlant } from '@/types';
import { PlantStatus } from '@prisma/client';

export async function getPendingPlants(): Promise<ActionResponse<PendingPlant[]>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const plants = await prisma.plant.findMany({
      where: { status: 'PENDING' },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: plants as PendingPlant[],
    };
  } catch (error) {
    console.error('Get pending plants error:', error);
    return {
      success: false,
      error: 'Failed to fetch pending plants',
    };
  }
}

export async function approvePlant(input: ApprovalInput): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const validatedData = approvalSchema.parse(input);

    const plant = await prisma.plant.update({
      where: { id: validatedData.plantId },
      data: {
        status: validatedData.status as PlantStatus,
        adminNotes: validatedData.adminNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath('/admin/approval');
    revalidatePath('/marketplace');
    revalidatePath('/plants');

    return {
      success: true,
      data: plant,
    };
  } catch (error) {
    console.error('Approve plant error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process approval',
    };
  }
}

export async function bulkApprovePlants(plantIds: string[]): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.plant.updateMany({
      where: {
        id: { in: plantIds },
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath('/admin/approval');
    revalidatePath('/marketplace');

    return { success: true };
  } catch (error) {
    console.error('Bulk approve error:', error);
    return {
      success: false,
      error: 'Failed to bulk approve plants',
    };
  }
}

export async function getAdminStats(): Promise<
  ActionResponse<{
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalUsers: number;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const [pendingCount, approvedCount, rejectedCount, totalUsers] = await Promise.all([
      prisma.plant.count({ where: { status: 'PENDING' } }),
      prisma.plant.count({ where: { status: 'APPROVED' } }),
      prisma.plant.count({ where: { status: 'REJECTED' } }),
      prisma.user.count(),
    ]);

    return {
      success: true,
      data: {
        pendingCount,
        approvedCount,
        rejectedCount,
        totalUsers,
      },
    };
  } catch (error) {
    console.error('Get admin stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch stats',
    };
  }
}
