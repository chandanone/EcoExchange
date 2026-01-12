import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import {
  Leaf,
  Home,
  Package,
  ShoppingBag,
  CreditCard,
  Shield,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";
import MobileNav from "@/components/dashboard/mobile-nav"; // We will create this below

function getIcon(name: string) {
  switch (name) {
    case "Home":
      return Home;
    case "Package":
      return Package;
    case "ShoppingBag":
      return ShoppingBag;
    case "ArrowLeftRight":
      return ArrowLeftRight;
    case "CreditCard":
      return CreditCard;
    default:
      return Home;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Icons are now strings, which are "Plain Objects"
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", iconName: "Home" },
    { href: "/plants", label: "My Plants", iconName: "Package" },
    { href: "/marketplace", label: "Marketplace", iconName: "ShoppingBag" },
    { href: "/swap-requests", label: "Swaps", iconName: "ArrowLeftRight" },
    { href: "/subscription", label: "Subscription", iconName: "CreditCard" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b bg-white px-4">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center">
            {/* Pass the serialized links array */}
            <MobileNav
              links={navLinks}
              isAdmin={session.user.role === "ADMIN"}
            />

            <Link href="/dashboard" className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold hidden sm:block">
                EcoExchange
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              // 1. Run the logic inside the function body, before the return
              const Icon = getIcon(link.iconName);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary text-gray-600"
                >
                  {/* 2. Use the variable 'Icon' directly, not 'link.Icon' */}
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin/approval"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-4">
            {/* User Info & Credits */}
            <div className="flex flex-col text-right">
              <p className="text-sm font-semibold leading-none text-gray-900">
                {session.user.name}
              </p>
              {/* Removed 'hidden' classes - this will now always show */}
              <p className="text-xs font-bold text-primary mt-1">
                {session.user.credits} credits
              </p>
            </div>

            {/* Sign Out Button - Always Visible */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" size="sm" className="h-9 px-3">
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
