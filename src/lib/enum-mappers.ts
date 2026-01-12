// src/lib/enum-mappers.ts
import { Sunlight, Difficulty, WaterNeeds } from "@prisma/client";

/* ---------- SUNLIGHT ---------- */

export const SunlightLabelMap = {
  [Sunlight.Full_Sun]: "Full Sun",
  [Sunlight.Partial]: "Partial",
  [Sunlight.Shade]: "Shade",
} as const;

export type SunlightLabel =
  (typeof SunlightLabelMap)[keyof typeof SunlightLabelMap];

export const SunlightToPrisma = {
  "Full Sun": Sunlight.Full_Sun,
  Partial: Sunlight.Partial,
  Shade: Sunlight.Shade,
} as const;

/* ---------- DIFFICULTY ---------- */

export const DifficultyLabelMap = {
  [Difficulty.Easy]: "Easy",
  [Difficulty.Moderate]: "Moderate",
  [Difficulty.Hard]: "Hard",
} as const;

export type DifficultyLabel =
  (typeof DifficultyLabelMap)[keyof typeof DifficultyLabelMap];

export const DifficultyToPrisma = {
  Easy: Difficulty.Easy,
  Moderate: Difficulty.Moderate,
  Hard: Difficulty.Hard,
} as const;

/* ---------- WATER NEEDS ---------- */

export const WaterNeedsLabelMap = {
  [WaterNeeds.Low]: "Low",
  [WaterNeeds.Medium]: "Medium",
  [WaterNeeds.High]: "High",
} as const;

export type WaterNeedsLabel =
  (typeof WaterNeedsLabelMap)[keyof typeof WaterNeedsLabelMap];

export const WaterNeedsToPrisma = {
  Low: WaterNeeds.Low,
  Medium: WaterNeeds.Medium,
  High: WaterNeeds.High,
} as const;
