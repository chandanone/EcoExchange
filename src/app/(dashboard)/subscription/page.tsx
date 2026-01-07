"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { createSubscription } from "@/actions/subscription-actions";
import { createCreditTopUp } from "@/actions/credit-actions";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubscribe(tier: "MONTHLY" | "YEARLY") {
    setIsLoading(true);
    const result = await createSubscription({ tier });

    if (result.success && result.data?.sessionUrl) {
      window.location.href = result.data.sessionUrl;
    }
    setIsLoading(false);
  }

  async function handleCreditTopUp(packageType: "SMALL" | "MEDIUM" | "LARGE") {
    setIsLoading(true);
    const result = await createCreditTopUp({ package: packageType });

    if (result.success && result.data?.sessionUrl) {
      window.location.href = result.data.sessionUrl;
    }
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscription & Credits</h1>
        <p className="mt-2 text-gray-600">
          Choose a plan or top up your credits
        </p>
      </div>

      {/* Subscription Plans */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Subscription Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-gray-600">/forever</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">5 starting credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Basic listings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Community access</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-2 border-primary">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2"></div>
            <CardHeader>
              <Badge>Most Popular</Badge>
              <CardTitle>Monthly</CardTitle>
              <CardDescription>For active swappers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹300</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">20 monthly credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Priority listings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Advanced search</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Plant care tips</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("MONTHLY")}
                disabled={isLoading}
              >
                Subscribe
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yearly</CardTitle>
              <CardDescription>Best value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹1000</span>
                <span className="text-gray-600">/year</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">250 yearly credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">All Monthly features</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Exclusive events</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Personal consultant</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("YEARLY")}
                disabled={isLoading}
              >
                Subscribe
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Credit Top-ups */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">Credit Top-ups</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>10 Credits</CardTitle>
              <CardDescription>Small pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">₹100</span>
              </div>
              <p className="text-sm text-gray-600">
                Perfect for occasional swaps
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCreditTopUp("SMALL")}
                disabled={isLoading}
              >
                Buy Now
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>25 Credits</CardTitle>
              <CardDescription>Medium pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">₹200</span>
              </div>
              <p className="text-sm text-gray-600">
                Great value for regular users
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCreditTopUp("MEDIUM")}
                disabled={isLoading}
              >
                Buy Now
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>50 Credits</CardTitle>
              <CardDescription>Large pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">₹350</span>
              </div>
              <p className="text-sm text-gray-600">Best value per credit</p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCreditTopUp("LARGE")}
                disabled={isLoading}
              >
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}
