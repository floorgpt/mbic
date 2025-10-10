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

type DealerSelectorProps = {
  dealers: string[];
  selected: string | undefined;
  className?: string;
};

export function DealerSelector({
  dealers,
  selected,
  className,
}: DealerSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("dealer", value);
      } else {
        params.delete("dealer");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select dealer" />
      </SelectTrigger>
      <SelectContent>
        {dealers.map((dealer) => (
          <SelectItem key={dealer} value={dealer}>
            {dealer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
