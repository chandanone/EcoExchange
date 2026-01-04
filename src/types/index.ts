import { Role, SubscriptionTier, PlantStatus, SwapStatus } from '@prisma/client';

export type { Role, SubscriptionTier, PlantStatus, SwapStatus };

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  subscriptionTier: SubscriptionTier;
  credits: number;
  createdAt: Date;
}

export interface SafePlant {
  id: string;
  species: string;
  commonName: string | null;
  description: string;
  healthScore: number;
  imageUrl: string | null;
  status: PlantStatus;
  difficulty: string | null;
  sunlight: string | null;
  waterNeeds: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  donor: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface SafeSwapRequest {
  id: string;
  status: SwapStatus;
  message: string | null;
  ownerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  plant: {
    id: string;
    species: string;
    commonName: string | null;
    imageUrl: string | null;
  };
  requester: {
    id: string;
    name: string | null;
    image: string | null;
  };
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface PendingPlant {
  id: string;
  species: string;
  commonName: string | null;
  description: string;
  healthScore: number;
  imageUrl: string | null;
  difficulty: string | null;
  sunlight: string | null;
  waterNeeds: string | null;
  createdAt: Date;
  donor: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
