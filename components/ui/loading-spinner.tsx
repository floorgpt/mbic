"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
  "Thinking",
  "Crunching Numbers",
  "Analyzing Data",
  "Processing",
  "Computing Results",
  "Loading Insights",
  "Gathering Intel",
];

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ message, size = "md", className = "" }: LoadingSpinnerProps) {
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    // Pick a random message on mount
    const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setLoadingMessage(randomMessage);
  }, []);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {(message || loadingMessage) && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message || loadingMessage}...
        </p>
      )}
    </div>
  );
}
