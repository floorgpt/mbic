"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingNudgeProps = {
  /** Controls whether the nudge is visible */
  isVisible: boolean;
  /** The insight text to display */
  text: string;
  /** Callback when nudge is clicked */
  onClick: () => void;
  /** Optional custom positioning class */
  className?: string;
};

export function FloatingNudge({
  isVisible,
  text,
  onClick,
  className,
}: FloatingNudgeProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 400,
          }}
          onClick={onClick}
          className={cn(
            "group flex items-center gap-2 px-4 py-2.5 rounded-full",
            "bg-gradient-to-r from-primary to-primary/90",
            "text-primary-foreground text-sm font-medium",
            "shadow-lg hover:shadow-xl",
            "border border-primary-foreground/20",
            "transition-all duration-200",
            "hover:scale-105 active:scale-95",
            "z-10",
            className
          )}
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>{text}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
