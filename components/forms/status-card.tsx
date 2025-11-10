"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FormsStatusChip = {
  id: string;
  label: string;
  ok: boolean;
  status: number;
  count: number;
  err: string | null;
  intent?: "required" | "optional";
};

type FormsStatusCardProps = {
  chips: FormsStatusChip[];
  messages?: string[];
};

export function FormsStatusCard({ chips, messages = [] }: FormsStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const uniqueMessages = Array.from(new Set(messages.filter(Boolean)));

  if (!chips.length && uniqueMessages.length === 0) {
    return null;
  }

  // Count critical errors (required endpoints that failed)
  const criticalErrors = chips.filter(
    (chip) => chip.intent === "required" && !chip.ok
  ).length;

  return (
    <Card className="border-border/60 bg-muted/30">
      <CardContent className="space-y-3 p-4">
        {/* Collapse/Expand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Estado de Dependencias</h3>
            {criticalErrors > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalErrors} error{criticalErrors > 1 ? "es" : ""}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2 text-xs"
          >
            {isExpanded ? (
              <>
                <span className="mr-1">Ocultar</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="mr-1">Ver detalles</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Chips - only visible when expanded */}
        {isExpanded && chips.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:justify-start">
            {chips.map((chip) => {
              const variant =
                chip.ok || chip.intent === "optional" ? "outline" : "destructive";
              const text = chip.ok
                ? chip.err ?? String(chip.count)
                : chip.err ?? "offline";
              return (
                <Badge key={chip.id} variant={variant}>
                  {chip.label}: {text}
                  {chip.status ? ` (HTTP ${chip.status})` : null}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Error Messages - always visible if exist */}
        {uniqueMessages.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
