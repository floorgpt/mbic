import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { EventWidget } from "@/components/widgets/event-widget";
import { SyncButton } from "@/components/sync-button";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <MobileNav />
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
          <div className="flex items-center gap-4">
            <SyncButton />
            <EventWidget />
            <ThemeToggle />
            <div className="hidden md:flex flex-col text-right text-xs text-muted-foreground">
              <span>Retell AI Ready</span>
              <span>Data refreshed hourly</span>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 py-6 sm:px-5 lg:px-7">
        <aside className="hidden md:flex md:w-72 md:shrink-0">
          <div className="sticky top-24 h-[calc(100vh-6rem)] w-full rounded-2xl border bg-background/80 px-4 pb-6 pt-4 shadow-sm backdrop-blur">
            <div className="mb-4">
              <p className="font-montserrat text-sm font-semibold text-muted-foreground">
                Navigation
              </p>
            </div>
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
