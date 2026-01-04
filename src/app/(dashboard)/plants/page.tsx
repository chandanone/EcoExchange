import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default async function MyPlantsPage() {
  const session = await auth();

  const plants = await prisma.plant.findMany({
    where: { donorId: session!.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Plants</h1>
          <p className="mt-2 text-gray-600">
            Manage your plant listings
          </p>
        </div>
        <Link href="/plants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Plant
          </Button>
        </Link>
      </div>

      {plants.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-600 mb-4">You haven't listed any plants yet</p>
          <Link href="/plants/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              List Your First Plant
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <Card key={plant.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">{plant.species}</CardTitle>
                  <Badge
                    variant={
                      plant.status === 'APPROVED'
                        ? 'default'
                        : plant.status === 'PENDING'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {plant.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 line-clamp-3">{plant.description}</p>
                {plant.adminNotes && plant.status === 'REJECTED' && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-800">Admin Notes:</p>
                    <p className="text-xs text-red-700">{plant.adminNotes}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href={`/plants/${plant.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
