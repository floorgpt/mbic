"use client";

import * as React from "react";
import { BellPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EventCard } from "@/components/widgets/event-card";

export function EventWidget() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
          aria-label="Open upcoming events"
        >
          <BellPlus className="size-5" />
          <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
            1
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-full max-w-md flex-col gap-6 border-l border-border/60 bg-background/95"
        side="right"
      >
        <SheetHeader className="space-y-2">
          <SheetTitle className="font-montserrat text-xl">
            Team Events
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Upcoming sessions from CPF Launchpad and MBIC enablement.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <EventCard />
        </div>
      </SheetContent>
    </Sheet>
  );
}
