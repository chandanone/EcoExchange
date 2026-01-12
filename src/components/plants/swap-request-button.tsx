"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createSwapRequest } from "@/actions/swap-actions";
import { Heart } from "lucide-react";

interface SwapRequestButtonProps {
  plantId: string;
  userCredits: number;
}

export default function SwapRequestButton({
  plantId,
  userCredits,
}: SwapRequestButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message") as string;

    const result = await createSwapRequest({
      plantId,
      message,
    });

    if (result.success) {
      setIsOpen(false);
      router.push("/swap-requests");
      router.refresh();
    } else {
      setError(result.error || "Failed to create swap request");
    }

    setIsLoading(false);
  }

  if (userCredits < 1) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">
            Insufficient Credits
          </p>
          <p className="mt-1 text-xs text-yellow-700">
            You need at least 1 credit to request a swap. Top up your credits to
            continue.
          </p>
        </div>
        <Button
          onClick={() => router.push("/subscription")}
          className="w-full"
          variant="outline"
        >
          Top Up Credits
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Heart className="mr-2 h-5 w-5" />
          Request Swap (1 Credit)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Plant Swap</DialogTitle>
            <DialogDescription>
              Send a swap request to the plant owner. You have {userCredits}{" "}
              {userCredits === 1 ? "credit" : "credits"} available.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message to Owner *</Label>
              <textarea
                id="message"
                name="message"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Introduce yourself and explain why you'd like this plant..."
                required
                disabled={isLoading}
                minLength={10}
              />
              <p className="text-xs text-gray-600">
                Minimum 10 characters. Be friendly and explain your interest!
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">
                What happens next?
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>• The owner will receive your swap request</li>
                <li>• They can accept or decline your request</li>
                <li>• If accepted, 1 credit will be deducted</li>
                <li>• You'll be notified of their decision</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
