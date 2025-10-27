"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PanelLeft, PanelRight } from "lucide-react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { EventWidget } from "@/components/widgets/event-widget";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
};

const NAV_STORAGE_KEY = "mbic-nav-collapsed";

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(NAV_STORAGE_KEY);
    if (stored != null) {
      setCollapsed(stored === "1");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(NAV_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed, hydrated]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <MobileNav />
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={toggleCollapsed}
              className="hidden size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 md:inline-flex"
              aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
            >
              {collapsed ? <PanelRight className="size-5" /> : <PanelLeft className="size-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="relative size-8 overflow-hidden rounded-md border border-border/40 bg-background">
                <Image
                  src="https://res.cloudinary.com/dy7cv4bih/image/upload/v1760108643/CPF_Launchpad_logo_Square_zqb1zk.png"
                  alt="CPF Floors Launchpad logo"
                  fill
                  sizes="32px"
                  className="object-cover"
                  priority
                />
              </div>
              <span
                className={cn(
                  "font-montserrat text-lg font-semibold",
                  "tracking-tight text-foreground",
                )}
              >
                CPF Floors MBIC
              </span>
            </Link>
            <Badge
              variant="secondary"
              className="hidden border-primary/30 bg-primary/10 text-primary sm:inline-flex"
            >
              Dashboard
            </Badge>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <EventWidget />
            <div className="hidden flex-col text-end text-[11px] leading-tight text-muted-foreground md:flex">
              <span className="font-medium text-foreground">Retell AI Ready</span>
              <span>Data refreshed hourly</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-1 gap-4 px-3 py-6 sm:px-5 lg:px-6",
          collapsed && "md:gap-3",
        )}
      >
        <aside
          className={cn(
            "hidden md:flex md:shrink-0",
            collapsed ? "md:w-16" : "md:w-72",
          )}
        >
          <div
            className={cn(
              "sticky top-24 flex h-[calc(100vh-6rem)] w-full flex-col rounded-2xl border bg-background/80 shadow-sm backdrop-blur transition-all duration-200",
              collapsed ? "items-center gap-4 px-2 py-4" : "px-4 pb-6 pt-4",
            )}
            data-collapsed={collapsed ? "true" : "false"}
          >
            {!collapsed ? (
              <div className="w-full">
                <p className="font-montserrat text-sm font-semibold text-muted-foreground">
                  Navigation
                </p>
              </div>
            ) : null}
            <SidebarNav collapsed={collapsed} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 pb-12">{children}</main>
      </div>
    </div>
  );
}
