import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SwapRequestActions from "@/components/plants/swap-request-actions";

export default async function SwapRequestsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [requestsMade, requestsReceived] = await Promise.all([
    // Requests I made to others
    prisma.swapRequest.findMany({
      where: { requesterId: session.user.id },
      include: {
        plant: {
          select: {
            id: true,
            species: true,
            commonName: true,
            imageUrl: true,
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
      orderBy: { createdAt: "desc" },
    }),
    // Requests others made to my plants
    prisma.swapRequest.findMany({
      where: { ownerId: session.user.id },
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
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "ACCEPTED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Swap Requests</h1>
        <p className="mt-2 text-gray-600">
          Manage your plant exchange requests
        </p>
      </div>

      <div className="space-y-8">
        {/* Requests I Received */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">
            Requests for My Plants ({requestsReceived.length})
          </h2>
          {requestsReceived.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">
                No swap requests received yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requestsReceived.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <Link href={`/plants/${request.plant.id}`}>
                          {request.plant.imageUrl ? (
                            <img
                              src={request.plant.imageUrl}
                              alt={request.plant.species}
                              className="h-20 w-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </Link>

                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <Link href={`/plants/${request.plant.id}`}>
                                <h3 className="font-semibold hover:text-primary">
                                  {request.plant.species}
                                </h3>
                              </Link>
                              {request.plant.commonName && (
                                <p className="text-sm text-gray-600">
                                  {request.plant.commonName}
                                </p>
                              )}
                            </div>
                            <Badge variant={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>

                          <div className="mb-3 rounded-md bg-gray-50 p-3">
                            <p className="mb-1 text-xs font-semibold text-gray-700">
                              Request from: {request.requester.name}
                            </p>
                            <p className="text-sm text-gray-700">
                              {request.message}
                            </p>
                          </div>

                          {request.ownerNotes && (
                            <div className="mb-3 rounded-md bg-blue-50 p-3">
                              <p className="mb-1 text-xs font-semibold text-blue-800">
                                Your response:
                              </p>
                              <p className="text-sm text-blue-700">
                                {request.ownerNotes}
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-gray-600">
                            Requested on{" "}
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {request.status === "PENDING" && (
                        <SwapRequestActions
                          requestId={request.id}
                          isOwner={true}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Requests I Made */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">
            My Requests ({requestsMade.length})
          </h2>
          {requestsMade.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="mb-4 text-gray-600">
                  You haven't made any swap requests yet
                </p>
                <Link href="/marketplace">
                  <Button>Browse Plants</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requestsMade.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <Link href={`/plants/${request.plant.id}`}>
                          {request.plant.imageUrl ? (
                            <img
                              src={request.plant.imageUrl}
                              alt={request.plant.species}
                              className="h-20 w-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </Link>

                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <Link href={`/plants/${request.plant.id}`}>
                                <h3 className="font-semibold hover:text-primary">
                                  {request.plant.species}
                                </h3>
                              </Link>
                              {request.plant.commonName && (
                                <p className="text-sm text-gray-600">
                                  {request.plant.commonName}
                                </p>
                              )}
                            </div>
                            <Badge variant={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>

                          <div className="mb-3 rounded-md bg-gray-50 p-3">
                            <p className="mb-1 text-xs font-semibold text-gray-700">
                              Your message:
                            </p>
                            <p className="text-sm text-gray-700">
                              {request.message}
                            </p>
                          </div>

                          {request.ownerNotes && (
                            <div
                              className={`mb-3 rounded-md p-3 ${
                                request.status === "ACCEPTED"
                                  ? "bg-green-50"
                                  : "bg-red-50"
                              }`}
                            >
                              <p
                                className={`mb-1 text-xs font-semibold ${
                                  request.status === "ACCEPTED"
                                    ? "text-green-800"
                                    : "text-red-800"
                                }`}
                              >
                                Owner's response:
                              </p>
                              <p
                                className={`text-sm ${
                                  request.status === "ACCEPTED"
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                {request.ownerNotes}
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-gray-600">
                            Sent to {request.owner.name} on{" "}
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {request.status === "PENDING" && (
                        <SwapRequestActions
                          requestId={request.id}
                          isOwner={false}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
