import {
  PrismaClient,
  Role,
  SubscriptionTier,
  PlantStatus,
  SwapStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // -------------------
  // USERS
  // -------------------
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: passwordHash,
      name: "Admin User",
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.YEARLY,
      credits: 100,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: passwordHash,
      name: "Regular User",
      role: Role.USER,
      subscriptionTier: SubscriptionTier.FREE,
      credits: 5,
    },
  });

  // -------------------
  // PLANTS
  // -------------------
  const plant1 = await prisma.plant.upsert({
    where: { id: "plant1" },
    update: {},
    create: {
      id: "plant1",
      species: "Ficus lyrata",
      commonName: "Fiddle Leaf Fig",
      description: "A popular indoor plant with large, violin-shaped leaves.",
      healthScore: 90,
      donorId: admin.id,
      status: PlantStatus.APPROVED,
      difficulty: "Moderate",
      sunlight: "Partial",
      waterNeeds: "Medium",
      category: "Indoor",
    },
  });

  const plant2 = await prisma.plant.upsert({
    where: { id: "plant2" },
    update: {},
    create: {
      id: "plant2",
      species: "Monstera deliciosa",
      commonName: "Swiss Cheese Plant",
      description: "Tropical vine with characteristic perforated leaves.",
      healthScore: 85,
      donorId: user.id,
      status: PlantStatus.PENDING,
      difficulty: "Moderate",
      sunlight: "Partial",
      waterNeeds: "Medium",
      category: "Indoor",
    },
  });

  // -------------------
  // SWAP REQUEST
  // -------------------
  await prisma.swapRequest.upsert({
    where: { id: "swap1" },
    update: {},
    create: {
      id: "swap1",
      plantId: plant1.id,
      requesterId: user.id,
      ownerId: admin.id,
      status: SwapStatus.PENDING,
      message: "I would love to swap for this plant!",
    },
  });

  // -------------------
  // CREDIT TRANSACTIONS
  // -------------------
  await prisma.creditTransaction.createMany({
    data: [
      {
        userId: user.id,
        amount: 10,
        type: "TOP_UP",
        description: "Initial credit top-up",
      },
      {
        userId: admin.id,
        amount: 50,
        type: "SUBSCRIPTION",
        description: "Admin subscription bonus",
      },
    ],
  });

  console.log("Seeding finished!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
