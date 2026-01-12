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
import { updateSwapRequest } from "@/actions/swap-actions";
import { Check, X } from "lucide-react";

interface SwapRequestActionsProps {
  requestId: string;
  isOwner: boolean;
}

export default function SwapRequestActions({
  requestId,
  isOwner,
}: SwapRequestActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<"ACCEPTED" | "REJECTED" | "CANCELLED">(
    "ACCEPTED"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const ownerNotes = formData.get("ownerNotes") as string;

    const result = await updateSwapRequest({
      requestId,
      status: action,
      ownerNotes: ownerNotes || undefined,
    });

    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to update swap request");
    }

    setIsLoading(false);
  }

  function openDialog(actionType: "ACCEPTED" | "REJECTED" | "CANCELLED") {
    setAction(actionType);
    setIsOpen(true);
    setError("");
  }

  if (isOwner) {
    return (
      <div className="flex gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button
            size="sm"
            onClick={() => openDialog("ACCEPTED")}
            className="flex-1"
          >
            <Check className="mr-1 h-4 w-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => openDialog("REJECTED")}
            className="flex-1"
          >
            <X className="mr-1 h-4 w-4" />
            Reject
          </Button>

          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {action === "ACCEPTED" ? "Accept" : "Reject"} Swap Request
                </DialogTitle>
                <DialogDescription>
                  {action === "ACCEPTED"
                    ? "Accept this swap request. The requester will be charged 1 credit."
                    : "Reject this swap request. You can provide a reason below."}
                </DialogDescription>
              </DialogHeader>

              <div className="my-6 space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ownerNotes">
                    Message{" "}
                    {action === "REJECTED" ? "(Optional)" : "(Optional)"}
                  </Label>
                  <textarea
                    id="ownerNotes"
                    name="ownerNotes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={
                      action === "ACCEPTED"
                        ? "Add any instructions for the swap..."
                        : "Let them know why you're declining..."
                    }
                    disabled={isLoading}
                  />
                </div>

                {action === "ACCEPTED" && (
                  <div className="rounded-md bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">
                      What happens next?
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-green-700">
                      <li>• The requester will be charged 1 credit</li>
                      <li>• They'll receive a notification</li>
                      <li>• You can coordinate the plant exchange</li>
                    </ul>
                  </div>
                )}
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
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant={action === "REJECTED" ? "destructive" : "default"}
                >
                  {isLoading
                    ? "Processing..."
                    : action === "ACCEPTED"
                    ? "Accept Request"
                    : "Reject Request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Requester can only cancel
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAction("CANCELLED")}
        >
          Cancel Request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cancel Swap Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this swap request?
            </DialogDescription>
          </DialogHeader>

          <div className="my-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Go Back
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? "Cancelling..." : "Yes, Cancel Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
