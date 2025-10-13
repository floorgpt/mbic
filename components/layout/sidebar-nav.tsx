"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DASHBOARD_NAV, SECONDARY_NAV } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between">
      <nav className="flex flex-col gap-1 text-sm">
        {DASHBOARD_NAV.map(({ icon: Icon, ...item }) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <nav className="mt-6 flex flex-col gap-1 border-t pt-6 pb-6 text-sm text-muted-foreground">
        {SECONDARY_NAV.map(({ icon: Icon, ...item }) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const isLogout = item.href === "/logout";

          return isLogout ? (
            <button
              key={item.href}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.alert("Logout functionality coming soon.");
                }
              }}
            >
              <Icon className="size-4" />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
