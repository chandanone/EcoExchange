import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deletePlant } from "@/actions/plant-actions";
import { createSwapRequest } from "@/actions/swap-actions";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  User,
  Calendar,
  Droplets,
  Sun,
  TrendingUp,
} from "lucide-react";
import SwapRequestButton from "@/components/plants/swap-request-button";

export default async function PlantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const plant = await prisma.plant.findUnique({
    where: { id: id },
    include: {
      donor: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      swapRequests: {
        where: {
          requesterId: session.user.id,
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!plant) {
    notFound();
  }

  const isOwner = plant.donorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const canEdit = isOwner || isAdmin;
  const hasActiveRequest = plant.swapRequests.length > 0;
  const canRequestSwap =
    !isOwner && plant.status === "APPROVED" && !hasActiveRequest;

  async function handleDelete() {
    "use server";
    await deletePlant(id);
    redirect("/plants");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back Button */}
      <Link href={isOwner ? "/plants" : "/marketplace"}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {isOwner ? "My Plants" : "Marketplace"}
        </Button>
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Image Section */}
        <div className="space-y-4">
          {plant.imageUrl ? (
            <img
              src={plant.imageUrl}
              alt={plant.species}
              className="w-full rounded-lg object-cover"
              style={{ aspectRatio: "4/3" }}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-gray-200">
              <span className="text-gray-400">No image available</span>
            </div>
          )}

          {/* Owner Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listed By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {plant.donor.image ? (
                  <img
                    src={plant.donor.image}
                    alt={plant.donor.name || "User"}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{plant.donor.name}</p>
                  {isOwner && (
                    <p className="text-sm text-gray-600">{plant.donor.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="mb-2 flex items-start justify-between">
              <h1 className="text-3xl font-bold">{plant.species}</h1>
              <Badge
                variant={
                  plant.status === "APPROVED"
                    ? "default"
                    : plant.status === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
              >
                {plant.status}
              </Badge>
            </div>
            {plant.commonName && (
              <p className="text-lg text-gray-600">{plant.commonName}</p>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{plant.description}</p>
            </CardContent>
          </Card>

          {/* Plant Details Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plant Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-600">Health Score</p>
                    <p className="font-semibold">{plant.healthScore}%</p>
                  </div>
                </div>

                {plant.difficulty && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-600">Difficulty</p>
                      <p className="font-semibold">{plant.difficulty}</p>
                    </div>
                  </div>
                )}

                {plant.sunlight && (
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-600">Sunlight</p>
                      <p className="font-semibold">{plant.sunlight}</p>
                    </div>
                  </div>
                )}

                {plant.waterNeeds && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-600">Water Needs</p>
                      <p className="font-semibold">{plant.waterNeeds}</p>
                    </div>
                  </div>
                )}

                {plant.category && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600">Category</p>
                    <p className="font-semibold">{plant.category}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes (if rejected) */}
          {plant.status === "REJECTED" && plant.adminNotes && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  Rejection Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{plant.adminNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {canRequestSwap && (
              <SwapRequestButton
                plantId={plant.id}
                userCredits={session.user.credits}
              />
            )}

            {hasActiveRequest && !isOwner && (
              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                You have already requested to swap this plant. Check your swap
                requests page for status.
              </div>
            )}

            {canEdit && (
              <div className="flex gap-2">
                <Link href={`/plants/${plant.id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Edit Plant
                  </Button>
                </Link>
                <form action={handleDelete}>
                  <Button variant="destructive" type="submit">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-600">
            <p>Listed on {new Date(plant.createdAt).toLocaleDateString()}</p>
            {plant.updatedAt !== plant.createdAt && (
              <p>
                Last updated {new Date(plant.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
