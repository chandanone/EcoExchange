import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Shield, CreditCard, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EcoExchange</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Exchange Plant Cuttings with
            <span className="text-primary"> Confidence</span>
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            Join India's first curated marketplace for plant enthusiasts. Share, swap, and
            grow your collection with verified listings and secure transactions.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg">
                Start Swapping
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="text-lg">
                Browse Plants
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Why EcoExchange?</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Shield className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold">Admin Approved</h3>
            <p className="text-gray-600">
              Every listing is reviewed by our team to ensure quality and authenticity.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <CreditCard className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold">Credit System</h3>
            <p className="text-gray-600">
              Fair and transparent credit-based swapping. Top up anytime via Stripe.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Users className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold">Community Driven</h3>
            <p className="text-gray-600">
              Connect with fellow plant lovers and share growing tips.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Leaf className="mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-xl font-semibold">Premium Plans</h3>
            <p className="text-gray-600">
              Get more credits and exclusive features with our subscription tiers.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Simple, Transparent Pricing</h2>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <h3 className="mb-2 text-2xl font-bold">Free</h3>
            <p className="mb-4 text-gray-600">Perfect for getting started</p>
            <p className="mb-6 text-4xl font-bold">₹0</p>
            <ul className="mb-8 space-y-2 text-gray-600">
              <li>✓ 5 starting credits</li>
              <li>✓ Basic listings</li>
              <li>✓ Community access</li>
            </ul>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="relative rounded-lg border-2 border-primary bg-white p-8 shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-white">
              Popular
            </div>
            <h3 className="mb-2 text-2xl font-bold">Monthly</h3>
            <p className="mb-4 text-gray-600">For active swappers</p>
            <p className="mb-6 text-4xl font-bold">₹300/mo</p>
            <ul className="mb-8 space-y-2 text-gray-600">
              <li>✓ 20 monthly credits</li>
              <li>✓ Priority listings</li>
              <li>✓ Advanced search</li>
              <li>✓ Plant care tips</li>
            </ul>
            <Link href="/register">
              <Button className="w-full">Subscribe Now</Button>
            </Link>
          </div>

          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <h3 className="mb-2 text-2xl font-bold">Yearly</h3>
            <p className="mb-4 text-gray-600">Best value for enthusiasts</p>
            <p className="mb-6 text-4xl font-bold">₹1000/yr</p>
            <ul className="mb-8 space-y-2 text-gray-600">
              <li>✓ 250 yearly credits</li>
              <li>✓ All Monthly features</li>
              <li>✓ Exclusive events</li>
              <li>✓ Personal consultant</li>
            </ul>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Subscribe Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2026 EcoExchange. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
