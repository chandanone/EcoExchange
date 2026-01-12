import { Prisma } from "@prisma/client";
import { SafePlant } from "@/types";
import { SunlightLabelMap } from "@/lib/enum-mappers";

type PlantWithDonor = Prisma.PlantGetPayload<{
  include: {
    donor: {
      select: {
        id: true;
        name: true;
        image: true;
      };
    };
  };
}>;

export function toSafePlant(plant: PlantWithDonor): SafePlant {
  return {
    id: plant.id,
    species: plant.species,
    commonName: plant.commonName,
    description: plant.description,
    healthScore: plant.healthScore,
    imageUrl: plant.imageUrl,
    status: plant.status,
    difficulty: plant.difficulty,
    sunlight: plant.sunlight ? SunlightLabelMap[plant.sunlight] : null,
    waterNeeds: plant.waterNeeds,
    category: plant.category,
    createdAt: plant.createdAt,
    updatedAt: plant.updatedAt,
    donor: {
      id: plant.donor.id,
      name: plant.donor.name,
      image: plant.donor.image,
    },
  };
}
