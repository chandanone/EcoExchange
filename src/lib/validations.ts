import { Difficulty, Sunlight, WaterNeeds } from "@prisma/client";
import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Plant schemas
export const createPlantSchema = z.object({
  species: z.string().min(2, "Species name is required"),
  commonName: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  healthScore: z.number().int().min(0).max(100).default(100),
  imageUrl: z.string().url().optional(),
  // ✅ Prisma enums ONLY
  difficulty: z.nativeEnum(Difficulty).optional(),
  sunlight: z.nativeEnum(Sunlight).optional(),
  waterNeeds: z.nativeEnum(WaterNeeds).optional(),
  category: z.string().optional(),
});

export const updatePlantSchema = createPlantSchema.partial().extend({
  id: z.string().cuid(),
});

export const approvalSchema = z.object({
  plantId: z.string().cuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().optional(),
});

// Swap request schemas
export const createSwapRequestSchema = z.object({
  plantId: z.string().cuid(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const updateSwapRequestSchema = z.object({
  requestId: z.string().cuid(),
  status: z.enum(["ACCEPTED", "REJECTED", "CANCELLED"]),
  ownerNotes: z.string().optional(),
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  tier: z.enum(["MONTHLY", "YEARLY"]),
});

// Credit top-up schemas
export const creditTopUpSchema = z.object({
  package: z.enum(["SMALL", "MEDIUM", "LARGE"]),
});

// Webhook schemas
export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>;
export type UpdateSwapRequestInput = z.infer<typeof updateSwapRequestSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CreditTopUpInput = z.infer<typeof creditTopUpSchema>;
