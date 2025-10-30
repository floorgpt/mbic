"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type FormsStatusChip = {
  id: string;
  label: string;
  ok: boolean;
  status: number;
  count: number;
  err: string | null;
};

type FormsStatusCardProps = {
  chips: FormsStatusChip[];
  messages?: string[];
};

export function FormsStatusCard({ chips, messages = [] }: FormsStatusCardProps) {
  const uniqueMessages = Array.from(new Set(messages.filter(Boolean)));

  if (!chips.length && uniqueMessages.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/60 bg-muted/30">
      <CardContent className="space-y-3 p-4">
        {chips.length ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:justify-start">
            {chips.map((chip) => (
              <Badge key={chip.id} variant={chip.ok ? "outline" : "destructive"}>
                {chip.label}: {chip.ok ? chip.count : chip.err ?? "offline"}
                {chip.status ? ` (HTTP ${chip.status})` : null}
              </Badge>
            ))}
          </div>
        ) : null}
        {uniqueMessages.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
