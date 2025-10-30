"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  controlId?: string;
  label: ReactNode;
  required?: boolean;
  className?: string;
  description?: ReactNode;
  error?: string | null;
  children: ReactNode;
};

export function Field({
  controlId,
  label,
  required,
  className,
  description,
  error,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        className="text-sm font-medium text-foreground"
        htmlFor={controlId}
      >
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <div>{children}</div>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type FieldGroupProps = {
  className?: string;
  children: ReactNode;
};

export function FieldGroup({ className, children }: FieldGroupProps) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
