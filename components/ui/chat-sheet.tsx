"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, X } from "lucide-react";
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

type ChatSheetProps = {
  /** Controls whether the chat sheet is open */
  isOpen: boolean;
  /** Callback when user wants to close the chat */
  onClose: () => void;
  /** Array of suggestion strings to display as ice breaker chips */
  suggestions?: string[];
  /** Optional seeded Q&A pairs for automatic responses */
  seededQuestions?: SeededQA[];
  /** Placeholder text for input field */
  placeholder?: string;
  /** Title displayed in header */
  title?: string;
  /** Optional pre-filled query to send immediately on open */
  initialQuery?: string;
};

export function ChatSheet({
  isOpen,
  onClose,
  suggestions,
  seededQuestions = [],
  placeholder = "Ask about your data...",
  title = "Chat with Data",
  initialQuery,
}: ChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasProcessedInitialQuery = useRef(false);

  // Derive suggestions from seededQuestions if not provided
  const displaySuggestions = suggestions || seededQuestions.map((qa) => qa.question);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Process initial query when sheet opens
  useEffect(() => {
    if (isOpen && initialQuery && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;
      handleSend(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuery]);

  // Reset processed flag when sheet closes
  useEffect(() => {
    if (!isOpen) {
      hasProcessedInitialQuery.current = false;
    }
  }, [isOpen]);

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
        "I understand your question. In the production version, I'll be able to analyze your data in real-time using AI. For now, try asking about the available insights.",
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 h-[70vh] z-40 flex flex-col"
        >
          {/* Glassmorphism Container */}
          <div className="h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-border flex flex-col">
            {/* Drag Handle */}
            <div className="flex items-center justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">{title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
              {messages.length === 0 && !isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4 opacity-60" />
                  <p className="text-sm text-muted-foreground mb-6">
                    Ask questions to uncover insights
                  </p>
                  {displaySuggestions.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                      {displaySuggestions.slice(0, 4).map((suggestion, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSend(suggestion)}
                            className="w-full text-xs h-auto py-3 px-4 whitespace-normal text-left justify-start hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                          >
                            {suggestion}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex gap-3 items-start",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 max-w-[75%] text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                      {message.role === "user" && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Processing Indicator */}
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 items-start"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 bg-muted text-sm shadow-sm">
                        <span className="flex gap-1">
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0 bg-background/50">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                className="flex-1 h-11"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isProcessing}
                className="flex-shrink-0 h-11 w-11"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
