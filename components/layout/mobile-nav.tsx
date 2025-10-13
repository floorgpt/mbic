"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASHBOARD_NAV, SECONDARY_NAV } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg border bg-background hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-2"
        sideOffset={12}
        collisionPadding={12}
      >
        <div className="flex flex-col gap-1">
          {DASHBOARD_NAV.map(({ icon: Icon, ...item }) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className={cn(
                  "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
                  active && "bg-primary/10 text-primary",
                )}
              >
                <Link href={item.href} className="flex items-center gap-3 py-2">
                  <Icon className="size-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
          <div className="mt-2 border-t pt-2">
            {SECONDARY_NAV.map(({ icon: Icon, ...item }) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              if (item.href === "/logout") {
                return (
                  <DropdownMenuItem key={item.href} className="p-0">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-rose-600 transition-colors hover:bg-rose-500/10"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.alert("Logout functionality coming soon.");
                        }
                      }}
                    >
                      <Icon className="size-4" />
                      <span>Logout</span>
                    </button>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={item.href}
                  asChild
                  className={cn(
                    "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
                    active && "bg-primary/10 text-primary",
                  )}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 py-2"
                  >
                    <Icon className="size-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
