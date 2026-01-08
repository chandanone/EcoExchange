// src/lib/enum-mappers.ts

import { Sunlight, Difficulty, WaterNeeds } from "@prisma/client";

export const SunlightMap = {
  [Sunlight.Full_Sun]: "Full Sun",
  [Sunlight.Partial]: "Partial",
  [Sunlight.Shade]: "Shade",
} as const;

export type SunlightLabel = (typeof SunlightMap)[keyof typeof SunlightMap];

export const SunlightToPrisma = {
  "Full Sun": Sunlight.Full_Sun,
  Partial: Sunlight.Partial,
  Shade: Sunlight.Shade,
} as const;

export const DifficultyToPrisma = {
  Easy: Difficulty.Easy,
  Moderate: Difficulty.Moderate,
  Hard: Difficulty.Hard,
} as const;

export const WaterNeedsToPrisma = {
  Low: WaterNeeds.Low,
  Medium: WaterNeeds.Medium,
  High: WaterNeeds.High,
} as const;
