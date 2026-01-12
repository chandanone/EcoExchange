"use client";

import { useState } from "react";
import {
  Menu,
  Leaf,
  Home,
  Package,
  ShoppingBag,
  ArrowLeftRight,
  CreditCard,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Helper to map string names to Icon Components
const IconMap: Record<string, any> = {
  Home,
  Package,
  ShoppingBag,
  ArrowLeftRight,
  CreditCard,
  Shield,
};

export default function MobileNav({
  links,
  isAdmin,
}: {
  links: any[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden mr-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px]">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span>EcoExchange</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-2">
            {links.map((link) => {
              const Icon = IconMap[link.iconName] || Home; // Fallback to Home if not found
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-md font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-5 w-5 text-gray-500" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
