"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SalesRepRow } from "@/types/database";

type SalesRepSelectorProps = {
  reps: SalesRepRow[];
  selected: string;
  className?: string;
};

export function SalesRepSelector({
  reps,
  selected,
  className,
}: SalesRepSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("rep", value);
      } else {
        params.delete("rep");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select sales rep" />
      </SelectTrigger>
      <SelectContent>
        {reps.map((rep) => (
          <SelectItem key={rep.rep_id} value={rep.rep_name}>
            {rep.rep_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
