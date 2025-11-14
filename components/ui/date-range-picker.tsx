"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
};

export type PresetOption = {
  id: string;
  label: string;
  getValue: () => DateRange;
};

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  presets?: PresetOption[];
}

// Default preset options matching Google Ads pattern
const defaultPresets: PresetOption[] = [
  {
    id: "today",
    label: "Today",
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    id: "last-7-days",
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    id: "last-30-days",
    label: "Last 30 days",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    id: "this-month",
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    id: "last-month",
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    id: "this-year",
    label: "This year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = defaultPresets,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(value);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(value?.from);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(value?.to);

  // Format the display text for the button
  const displayText = useMemo(() => {
    if (!value) return "Select date range";

    const fromStr = format(value.from, "MMM d, yyyy");
    const toStr = format(value.to, "MMM d, yyyy");

    // Check if it matches a preset
    for (const preset of presets) {
      const presetRange = preset.getValue();
      if (
        format(presetRange.from, "yyyy-MM-dd") === format(value.from, "yyyy-MM-dd") &&
        format(presetRange.to, "yyyy-MM-dd") === format(value.to, "yyyy-MM-dd")
      ) {
        return preset.label;
      }
    }

    return `${fromStr} - ${toStr}`;
  }, [value, presets]);

  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getValue();
    setSelectedPreset(preset.id);
    setCustomRange(range);
    setTempStartDate(range.from);
    setTempEndDate(range.to);
  };

  const handleCustomClick = () => {
    setSelectedPreset("custom");
  };

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      const range = { from: tempStartDate, to: tempEndDate };
      onChange(range);
      setCustomRange(range);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setTempStartDate(value?.from);
    setTempEndDate(value?.to);
    setOpen(false);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setTempStartDate(date);
    setSelectedPreset("custom");

    // If end date is before start date, update end date
    if (date && tempEndDate && date > tempEndDate) {
      setTempEndDate(date);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setTempEndDate(date);
    setSelectedPreset("custom");

    // If start date is after end date, update start date
    if (date && tempStartDate && date < tempStartDate) {
      setTempStartDate(date);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="justify-between min-w-[240px] font-normal"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          {displayText}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[500px] p-0" showCloseButton={false}>
          <div className="flex flex-col md:flex-row">
            {/* Left Sidebar - Preset Options */}
            <div className="w-full md:w-44 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
              <DialogHeader className="p-3 pb-2 border-b border-gray-200">
                <DialogTitle className="text-sm font-medium">Date Range</DialogTitle>
              </DialogHeader>
              <div className="p-2">
                <button
                  onClick={handleCustomClick}
                  className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPreset === "custom"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Custom
                </button>
                <div className="my-1.5 border-t border-gray-200" />
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                      selectedPreset === preset.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side - Calendar and Date Inputs */}
            <div className="flex-1 p-4">
              <div className="space-y-4">
                {/* Date Input Fields - Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-date" className="text-xs text-gray-600 mb-1.5 block">
                      Start date
                    </Label>
                    <Input
                      id="start-date"
                      type="text"
                      value={tempStartDate ? format(tempStartDate, "MMM d, yyyy") : ""}
                      readOnly
                      className="text-sm w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs text-gray-600 mb-1.5 block">
                      End date
                    </Label>
                    <Input
                      id="end-date"
                      type="text"
                      value={tempEndDate ? format(tempEndDate, "MMM d, yyyy") : ""}
                      readOnly
                      className="text-sm w-full"
                    />
                  </div>
                </div>

                {/* Stacked Calendars - Mobile First */}
                <div className="flex flex-col gap-3">
                  <Calendar
                    mode="single"
                    selected={tempStartDate}
                    onSelect={handleStartDateSelect}
                    disabled={(date) =>
                      tempEndDate ? date > tempEndDate : date > new Date()
                    }
                    initialFocus
                    className="mx-auto"
                  />
                  <Calendar
                    mode="single"
                    selected={tempEndDate}
                    onSelect={handleEndDateSelect}
                    disabled={(date) =>
                      tempStartDate ? date < tempStartDate || date > new Date() : date > new Date()
                    }
                    className="mx-auto"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                  <Button variant="outline" onClick={handleCancel} size="sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={!tempStartDate || !tempEndDate}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
