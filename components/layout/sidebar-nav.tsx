"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DASHBOARD_NAV, SECONDARY_NAV } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  collapsed?: boolean;
};

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <nav className={cn("flex flex-col gap-1 text-sm", collapsed && "items-center gap-2")}>
        {DASHBOARD_NAV.map(({ icon: Icon, ...item }) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                collapsed && "justify-center gap-0 px-2 py-3 text-xs",
              )}
            >
              <Icon className="size-4" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <nav
        className={cn(
          "mt-auto flex flex-col gap-1 border-t pt-4 text-sm text-muted-foreground",
          collapsed ? "items-center border-transparent pt-2" : "pb-6",
        )}
      >
        {SECONDARY_NAV.map(({ icon: Icon, ...item }) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const isLogout = item.href === "/logout";

          return isLogout ? (
            <button
              key={item.href}
              type="button"
              aria-label="Logout"
              title="Logout"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70",
                collapsed && "justify-center gap-0 px-2 py-3",
              )}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.alert("Logout functionality coming soon.");
                }
              }}
            >
              <Icon className="size-4" />
              {!collapsed && <span>Logout</span>}
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/60 hover:text-foreground",
                collapsed && "justify-center gap-0 px-2 py-3 text-xs",
              )}
            >
              <Icon className="size-4" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
