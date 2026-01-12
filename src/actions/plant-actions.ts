"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createPlantSchema,
  updatePlantSchema,
  type CreatePlantInput,
  type UpdatePlantInput,
} from "@/lib/validations";
import { ActionResponse, SafePlant } from "@/types";
import {
  SunlightToPrisma,
  DifficultyToPrisma,
  WaterNeedsToPrisma,
} from "@/lib/enum-mappers";

import { toSafePlant } from "@/lib/safe-mappers";

export async function createPlant(
  input: CreatePlantInput
): Promise<ActionResponse<SafePlant>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createPlantSchema.parse(input);

    const plant = await prisma.plant.create({
      data: {
        species: validatedData.species,
        description: validatedData.description,
        healthScore: validatedData.healthScore,
        commonName: validatedData.commonName,
        imageUrl: validatedData.imageUrl,
        category: validatedData.category,

        difficulty: validatedData.difficulty
          ? DifficultyToPrisma[validatedData.difficulty]
          : undefined,

        sunlight: validatedData.sunlight
          ? SunlightToPrisma[
              validatedData.sunlight as keyof typeof SunlightToPrisma
            ]
          : undefined,

        waterNeeds: validatedData.waterNeeds
          ? WaterNeedsToPrisma[validatedData.waterNeeds]
          : undefined,

        donorId: session.user.id,
        status: "PENDING",
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    revalidatePath("/plants");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: toSafePlant(plant),
    };
  } catch (error) {
    console.error("Create plant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create plant",
    };
  }
}

export async function updatePlant(
  input: UpdatePlantInput
): Promise<ActionResponse<SafePlant>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updatePlantSchema.parse(input);
    const { id, ...updateData } = validatedData;

    // Verify ownership
    const existingPlant = await prisma.plant.findUnique({
      where: { id },
      select: { donorId: true },
    });

    if (!existingPlant) {
      return { success: false, error: "Plant not found" };
    }

    if (
      existingPlant.donorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return { success: false, error: "Forbidden" };
    }

    const plant = await prisma.plant.update({
      where: { id },
      data: {
        ...updateData,
        sunlight: updateData.sunlight
          ? SunlightToPrisma[
              updateData.sunlight as keyof typeof SunlightToPrisma
            ]
          : undefined,

        difficulty: updateData.difficulty
          ? DifficultyToPrisma[
              updateData.difficulty as keyof typeof DifficultyToPrisma
            ]
          : undefined,

        waterNeeds: updateData.waterNeeds
          ? WaterNeedsToPrisma[
              updateData.waterNeeds as keyof typeof WaterNeedsToPrisma
            ]
          : undefined,
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    revalidatePath("/plants");
    revalidatePath(`/plants/${id}`);

    return {
      success: true,
      data: toSafePlant(plant),
    };
  } catch (error) {
    console.error("Update plant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update plant",
    };
  }
}

export async function deletePlant(plantId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
      select: { donorId: true },
    });

    if (!plant) {
      return { success: false, error: "Plant not found" };
    }

    if (plant.donorId !== session.user.id && session.user.role !== "ADMIN") {
      return { success: false, error: "Forbidden" };
    }

    await prisma.plant.delete({
      where: { id: plantId },
    });

    revalidatePath("/plants");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Delete plant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete plant",
    };
  }
}

export async function getMyPlants(): Promise<ActionResponse<SafePlant[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const plants = await prisma.plant.findMany({
      where: { donorId: session.user.id },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: plants.map(toSafePlant),
    };
  } catch (error) {
    console.error("Get my plants error:", error);
    return {
      success: false,
      error: "Failed to fetch plants",
    };
  }
}

export async function getPlantById(
  plantId: string
): Promise<ActionResponse<SafePlant>> {
  try {
    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!plant) {
      return { success: false, error: "Plant not found" };
    }

    return {
      success: true,
      data: toSafePlant(plant),
    };
  } catch (error) {
    console.error("Get plant error:", error);
    return {
      success: false,
      error: "Failed to fetch plant",
    };
  }
}
