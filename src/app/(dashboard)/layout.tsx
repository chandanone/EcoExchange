import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { Leaf, Home, Package, ShoppingBag, CreditCard, Shield } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EcoExchange</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/plants" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <Package className="h-4 w-4" />
              My Plants
            </Link>
            <Link href="/marketplace" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ShoppingBag className="h-4 w-4" />
              Marketplace
            </Link>
            <Link href="/subscription" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <CreditCard className="h-4 w-4" />
              Subscription
            </Link>
            {session.user.role === 'ADMIN' && (
              <Link href="/admin/approval" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-gray-600">{session.user.credits} credits</p>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      
      <main>{children}</main>
    </div>
  );
}
