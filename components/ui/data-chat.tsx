"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Maximize2, Minimize2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type SeededQA = {
  question: string;
  answer: string;
};

type DataChatProps = {
  seededQuestions?: SeededQA[];
  placeholder?: string;
  className?: string;
  onClose?: () => void;
};

// Default seeded questions for POC
const DEFAULT_SEEDED_QA: SeededQA[] = [
  {
    question: "What are the top performing cities?",
    answer: "Based on the current data, the top performing cities are Miami, Fort Lauderdale, and West Palm Beach, with Miami leading in total revenue at $313,277."
  },
  {
    question: "How many dealers are in South Florida?",
    answer: "There are currently 99 active dealers in the South Florida region, generating a total of 733 orders."
  },
  {
    question: "Which county has the highest revenue?",
    answer: "Miami-Dade County has the highest revenue with $313,277, representing 64.4% of the South Florida regional revenue."
  },
  {
    question: "Show me sales trends",
    answer: "Sales trends show consistent growth in Q1-Q2, with a peak in June at 24.1% dealer activity. The goal is to maintain 55% active dealer engagement."
  },
];

export function DataChat({
  seededQuestions = DEFAULT_SEEDED_QA,
  placeholder = "Ask a question about your data...",
  className,
  onClose
}: DataChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = () => {
    setMessages([]);
    setInputValue("");
  };

  const handleSend = async (question?: string) => {
    const queryText = question || inputValue.trim();
    if (!queryText) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find matching seeded answer or provide default
    const seededAnswer = seededQuestions.find((qa) =>
      qa.question.toLowerCase().includes(queryText.toLowerCase()) ||
      queryText.toLowerCase().includes(qa.question.toLowerCase())
    );

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: seededAnswer?.answer ||
        "I understand your question. In the production version, I'll be able to analyze your data in real-time using AI. For now, try asking about top performing cities, dealer counts, or sales trends.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Chat with my Data (POC)</h4>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleReset}
            title="Reset conversation"
            disabled={messages.length === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
              title="Close chat"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area - Hidden when collapsed */}
      {!isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ask questions about your data
                </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {seededQuestions.slice(0, 3).map((qa, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(qa.question)}
                      className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start"
                    >
                      {qa.question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 items-start",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        {isProcessing && (
          <div className="flex gap-2 items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-muted text-sm">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2 flex-shrink-0">
            <Input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Collapsed State */}
      {isExpanded && (
        <div className="flex items-center justify-center text-sm text-muted-foreground py-2">
          <p>Chat minimized - Click maximize to continue</p>
        </div>
      )}
    </div>
  );
}
