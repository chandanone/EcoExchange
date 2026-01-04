import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, ShoppingBag, CreditCard, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();

  const [myPlantsCount, pendingSwaps, approvedPlants] = await Promise.all([
    prisma.plant.count({
      where: { donorId: session!.user.id },
    }),
    prisma.swapRequest.count({
      where: {
        OR: [
          { requesterId: session!.user.id, status: 'PENDING' },
          { ownerId: session!.user.id, status: 'PENDING' },
        ],
      },
    }),
    prisma.plant.count({
      where: { status: 'APPROVED' },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {session!.user.name}!</h1>
        <p className="mt-2 text-gray-600">Here's what's happening with your plant collection</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session!.user.credits}</div>
            <p className="text-xs text-gray-600">Ready to swap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Plants</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPlantsCount}</div>
            <p className="text-xs text-gray-600">Listed plants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Swaps</CardTitle>
            <ShoppingBag className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSwaps}</div>
            <p className="text-xs text-gray-600">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedPlants}</div>
            <p className="text-xs text-gray-600">Available plants</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <Link href="/plants/new">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Package className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">List a Plant</h3>
                <p className="text-center text-sm text-gray-600">
                  Share your plant cuttings with the community
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <Link href="/marketplace">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <ShoppingBag className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Browse Plants</h3>
                <p className="text-center text-sm text-gray-600">
                  Discover new plants to add to your collection
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <Link href="/subscription">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <CreditCard className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Top Up Credits</h3>
                <p className="text-center text-sm text-gray-600">
                  Get more credits for plant swapping
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Current Plan: <span className="text-primary">{session!.user.subscriptionTier}</span>
              </p>
              <p className="text-sm text-gray-600">
                {session!.user.subscriptionTier === 'FREE'
                  ? 'Upgrade to get more credits and exclusive features'
                  : 'Thank you for being a premium member!'}
              </p>
            </div>
            {session!.user.subscriptionTier === 'FREE' && (
              <Link href="/subscription">
                <Button>Upgrade</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
