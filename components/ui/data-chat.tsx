"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Maximize2, Minimize2, RotateCcw, ChevronDown } from "lucide-react";
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

type ChatMode = "minimized" | "discovery" | "active";

type DataChatProps = {
  /** Array of suggestion strings to display as ice breaker chips */
  suggestions?: string[];
  /** Optional seeded Q&A pairs for automatic responses */
  seededQuestions?: SeededQA[];
  /** Placeholder text for input field */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Title displayed in header */
  title?: string;
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
  suggestions,
  seededQuestions = DEFAULT_SEEDED_QA,
  placeholder = "Ask about South Florida data...",
  className,
  title = "Chat with my Data (POC)"
}: DataChatProps) {
  const [mode, setMode] = useState<ChatMode>("minimized");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive suggestions from seededQuestions if not provided
  const displaySuggestions = suggestions || seededQuestions.map((qa) => qa.question);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (mode === "active" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mode]);

  // Focus input when entering discovery or active mode
  useEffect(() => {
    if ((mode === "discovery" || mode === "active") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleReset = () => {
    setMessages([]);
    setInputValue("");
    setMode("discovery");
    setIsMaximized(false);
  };

  const handleSend = async (question?: string) => {
    const queryText = question || inputValue.trim();
    if (!queryText) return;

    // Transition to active mode if sending a message
    if (mode !== "active") {
      setMode("active");
    }

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

  const handleMinimizedClick = () => {
    setMode("discovery");
  };

  const handleMinimize = () => {
    setMode("minimized");
    setIsMaximized(false);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Calculate dynamic height based on mode and maximized state
  const getContainerHeight = () => {
    if (mode === "minimized") return "h-[60px]";
    if (isMaximized) return "h-[80vh]";
    return "h-[300px]";
  };

  return (
    <div
      className={cn(
        "flex flex-col border rounded-lg bg-background shadow-sm transition-all duration-300 ease-in-out",
        getContainerHeight(),
        className
      )}
    >
      {/* Minimized State */}
      {mode === "minimized" && (
        <button
          onClick={handleMinimizedClick}
          className="flex items-center gap-3 px-4 py-3 w-full h-full hover:bg-muted/50 transition-colors rounded-lg group"
        >
          <Bot className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground flex-1 text-left">{placeholder}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      )}

      {/* Discovery & Active States */}
      {mode !== "minimized" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">{title}</h4>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleMaximize}
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReset}
                title="Reset conversation"
                disabled={messages.length === 0}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleMinimize}
                title="Minimize"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {/* Discovery Mode - Ice Breakers */}
            {mode === "discovery" && (
              <div
                className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-300"
              >
                <Bot className="h-12 w-12 text-muted-foreground mb-3 opacity-80" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ask questions about your data
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                  {displaySuggestions.slice(0, 4).map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(suggestion)}
                      className="text-xs h-auto py-2.5 px-3 whitespace-normal text-left justify-start hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Mode - Message History */}
            {mode === "active" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 items-start animate-in fade-in slide-in-from-bottom-1 duration-200",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[80%] text-sm shadow-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex gap-2 items-start animate-in fade-in duration-200">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted text-sm shadow-sm">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Always visible in discovery and active modes */}
          <div className="flex gap-2 px-4 py-3 border-t flex-shrink-0 bg-background">
            <Input
              ref={inputRef}
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
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
