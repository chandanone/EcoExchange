'use cache';

import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function MarketplacePage() {
  const plants = await prisma.plant.findMany({
    where: { status: 'APPROVED' },
    include: {
      donor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Plant Marketplace</h1>
        <p className="mt-2 text-gray-600">
          Browse {plants.length} approved plants available for swapping
        </p>
      </div>

      {plants.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-600">No plants available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plants.map((plant) => (
            <Card key={plant.id} className="overflow-hidden">
              <div className="relative">
                {plant.imageUrl ? (
                  <img
                    src={plant.imageUrl}
                    alt={plant.species}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-gray-200">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <Badge className="absolute top-2 right-2">{plant.healthScore}%</Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-1">{plant.species}</CardTitle>
                {plant.commonName && (
                  <p className="text-sm text-gray-600">{plant.commonName}</p>
                )}
              </CardHeader>
              
              <CardContent>
                <p className="mb-4 text-sm text-gray-700 line-clamp-2">
                  {plant.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {plant.difficulty && (
                    <Badge variant="outline">{plant.difficulty}</Badge>
                  )}
                  {plant.sunlight && (
                    <Badge variant="outline">{plant.sunlight}</Badge>
                  )}
                  {plant.waterNeeds && (
                    <Badge variant="outline">{plant.waterNeeds}</Badge>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <div className="text-xs text-gray-600">
                  by {plant.donor.name}
                </div>
                <Link href={`/plants/${plant.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const revalidate = 3600; // Revalidate every hour
