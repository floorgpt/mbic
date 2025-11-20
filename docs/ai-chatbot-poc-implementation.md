# AI Chatbot POC - Reusable Component Guide

## Overview

The AI Chatbot POC is a reusable conversational interface that can be embedded in any Sheet/Drawer component. It features a premium "magic" AI trigger button, glassmorphism overlay chat interface, contextual floating nudges, and seeded Q&A for prototype demonstrations.

**Status**: POC (Proof of Concept) - Uses seeded Q&A responses
**Production Ready**: No - Requires real AI API integration
**Reusable**: Yes - Can be integrated into any parent Sheet/Drawer

---

## Architecture Pattern

### Component Structure

```
Parent Drawer (e.g., FloridaRegionalSalesMap)
├── Sheet (Radix UI Dialog)
│   └── SheetContent
│       ├── SheetHeader
│       │   ├── Title (Left)
│       │   └── Actions Container (Right)
│       │       ├── AI Trigger Button ← Magic button to open chat
│       │       └── Close Button (X)
│       ├── Main Content Area (Table, Charts, etc.)
│       ├── FloatingNudge ← Contextual AI prompts
│       └── ChatSheet ← Overlay chat interface
```

### Key Components

1. **AI Trigger Button** - Premium gradient button in drawer header
2. **ChatSheet** - Slide-up overlay with glassmorphism
3. **FloatingNudge** - Contextual prompts that appear above content

---

## Component APIs

### 1. ChatSheet Component

**File**: `components/ui/chat-sheet.tsx`

#### Props

```typescript
type ChatSheetProps = {
  /** Controls whether the chat sheet is open */
  isOpen: boolean;

  /** Callback when user wants to close the chat */
  onClose: () => void;

  /** Array of suggestion strings to display as ice breaker chips */
  suggestions?: string[];

  /** Optional seeded Q&A pairs for automatic responses (POC) */
  seededQuestions?: SeededQA[];

  /** Placeholder text for input field */
  placeholder?: string;

  /** Title displayed in header */
  title?: string;

  /** Optional pre-filled query to send immediately on open */
  initialQuery?: string;
};

type SeededQA = {
  question: string;
  answer: string;
};
```

#### Features

- **Slide-up animation** from bottom (70vh height)
- **Glassmorphism** (`bg-white/95 backdrop-blur-md`)
- **Auto-scroll** to latest message
- **Auto-focus** input on open
- **Ice breaker chips** for quick questions (max 4 shown)
- **Message history** with user/assistant bubbles
- **Processing indicator** with animated dots
- **Initial query** support (for FloatingNudge integration)

#### Usage Example

```tsx
import dynamic from "next/dynamic";

const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);

function MyDrawer() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>();

  return (
    <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">
      {/* Main content */}

      <ChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        seededQuestions={[
          {
            question: "What are the top performers?",
            answer: `The top performers are X, Y, Z with $100k in revenue.`
          },
          {
            question: "How many dealers are active?",
            answer: `There are 99 active dealers generating 733 orders.`
          }
        ]}
        placeholder="Ask about your data..."
        title="Chat about South Florida"
        initialQuery={chatInitialQuery}
      />
    </SheetContent>
  );
}
```

---

### 2. FloatingNudge Component

**File**: `components/ui/floating-nudge.tsx`

#### Props

```typescript
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
```

#### Features

- **Pill-shaped button** with gradient background
- **Sparkles icon** with pulse animation
- **Pop-in animation** (fade + scale + slide)
- **Hover/tap effects** (scale on hover, scale down on tap)
- **Contextual visibility** (only shows when chat closed)

#### Usage Example

```tsx
import dynamic from "next/dynamic";

const FloatingNudge = dynamic(
  () => import("@/components/ui/floating-nudge").then((mod) => ({ default: mod.FloatingNudge })),
  { ssr: false }
);

function MyDrawer() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>();
  const topPerformer = data[0]; // Your data logic

  return (
    <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">
      {/* Main content */}

      <FloatingNudge
        isVisible={!isChatOpen && topPerformer.revenue > 50000}
        text={`✨ Analyze ${topPerformer.name}'s performance?`}
        onClick={() => {
          setChatInitialQuery(`Why is ${topPerformer.name} performing so well?`);
          setIsChatOpen(true);
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      />
    </SheetContent>
  );
}
```

---

### 3. AI Trigger Button (Premium Magic Button)

**File**: Inline in parent drawer header

#### Implementation

```tsx
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function DrawerHeader() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <SheetHeader className="space-y-3 flex-shrink-0 pb-4">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Title */}
        <SheetTitle>My Drawer Title</SheetTitle>

        {/* Right: AI Button + Close Button */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50",
              "dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50",
              "border border-white/50 dark:border-white/10",
              "shadow-sm hover:shadow-md",
              "transition-shadow duration-200",
              isChatOpen && "ring-2 ring-indigo-400/50"
            )}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            title="Analyze with AI"
          >
            <Sparkles className={cn(
              "h-5 w-5 transition-colors",
              isChatOpen
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-indigo-500 dark:text-indigo-400"
            )} />
          </motion.button>
        </div>
      </div>
    </SheetHeader>
  );
}
```

#### Features

- **Circle shape** (w-10 h-10, rounded-full)
- **Magical gradient** (indigo → purple → pink)
- **Dark mode support** with darker gradients
- **Ring indicator** when chat is open
- **Framer Motion animations**:
  - Hover: `scale: 1.05` + `rotate: 5°`
  - Tap: `scale: 0.95`
- **Tooltip** via `title` attribute
- **Proper spacing**: `gap-4` (16px) from close button

---

## Integration Checklist

### Step 1: Install Dependencies

```bash
npm install framer-motion
```

### Step 2: Add State Management

```tsx
const [isChatOpen, setIsChatOpen] = useState(false);
const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>();
```

### Step 3: Import Components (with SSR disabled)

```tsx
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);

const FloatingNudge = dynamic(
  () => import("@/components/ui/floating-nudge").then((mod) => ({ default: mod.FloatingNudge })),
  { ssr: false }
);
```

### Step 4: Add AI Button to Header

```tsx
<SheetHeader className="space-y-3 flex-shrink-0 pb-4">
  <div className="flex items-center justify-between gap-2">
    <SheetTitle>Your Title</SheetTitle>

    <div className="flex items-center gap-4">
      {/* AI Trigger Button (see implementation above) */}
      <motion.button onClick={() => setIsChatOpen(!isChatOpen)} {...}>
        <Sparkles />
      </motion.button>
    </div>
  </div>
</SheetHeader>
```

### Step 5: Add FloatingNudge (before closing SheetContent)

```tsx
<FloatingNudge
  isVisible={!isChatOpen && /* your condition */}
  text="✨ Your insight text"
  onClick={() => {
    setChatInitialQuery("Your pre-filled question");
    setIsChatOpen(true);
  }}
  className="absolute bottom-6 left-1/2 -translate-x-1/2"
/>
```

### Step 6: Add ChatSheet (before closing SheetContent)

```tsx
<ChatSheet
  isOpen={isChatOpen}
  onClose={() => setIsChatOpen(false)}
  seededQuestions={[
    { question: "Question 1?", answer: "Answer 1..." },
    { question: "Question 2?", answer: "Answer 2..." }
  ]}
  placeholder="Ask about your data..."
  title="Chat Title"
  initialQuery={chatInitialQuery}
/>
```

### Step 7: Ensure SheetContent Classes

**CRITICAL**: Do NOT add `relative` or custom z-index to SheetContent

```tsx
// ✅ CORRECT
<SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">

// ❌ WRONG - breaks overlay positioning
<SheetContent className="w-full sm:max-w-2xl flex flex-col z-50 px-6 relative">
```

---

## Seeded Q&A Pattern (POC)

### Dynamic Answers Based on Data

```tsx
const seededQuestions = [
  {
    question: `What are the top cities in ${regionName}?`,
    answer: `In ${regionName}, the top performing cities are ${
      topCities.map(c => c.name).join(", ")
    }. The region generated ${formatCurrency(totalRevenue)} in total revenue.`
  },
  {
    question: "How many dealers are active?",
    answer: `There are ${dealerCount} active dealers in ${regionName}, ` +
           `generating ${orderCount} orders with total revenue of ${formatCurrency(revenue)}.`
  },
  {
    question: `Why is ${topCity} performing so well?`,
    answer: `${topCity} is the top performer with ${formatCurrency(topRevenue)} in revenue. ` +
           `This represents a strong market presence with ${dealerCount} active dealers ` +
           `and ${orderCount} orders.`
  }
];
```

### Matching Logic

The ChatSheet uses fuzzy matching (case-insensitive substring):

```typescript
const seededAnswer = seededQuestions.find((qa) =>
  qa.question.toLowerCase().includes(queryText.toLowerCase()) ||
  queryText.toLowerCase().includes(qa.question.toLowerCase())
);
```

If no match found, returns fallback message:
> "I understand your question. In the production version, I'll be able to analyze your data in real-time using AI. For now, try asking about the available insights."

---

## Visual Design System

### Color Palette (AI Theme)

```css
/* Gradients */
--ai-gradient-light: from-indigo-50 via-purple-50 to-pink-50
--ai-gradient-dark: from-indigo-950/50 via-purple-950/50 to-pink-950/50

/* Icon Colors */
--ai-icon-active: text-indigo-600 dark:text-indigo-400
--ai-icon-inactive: text-indigo-500 dark:text-indigo-400

/* Ring (Active State) */
--ai-ring: ring-2 ring-indigo-400/50

/* Nudge Gradient */
--nudge-gradient: from-primary to-primary/90
```

### Glassmorphism Effect

```css
/* ChatSheet Overlay */
bg-white/95 dark:bg-zinc-900/95
backdrop-blur-md
rounded-t-3xl
shadow-2xl
border-t border-border
```

### Spacing Standards

```css
/* Header Actions Container */
gap-4  /* 16px between AI button and close button */

/* AI Button Size */
w-10 h-10  /* 40px × 40px touch target */

/* Icon Size */
h-5 w-5  /* 20px × 20px (larger than typical h-4 w-4) */

/* FloatingNudge Positioning */
bottom-6 left-1/2 -translate-x-1/2  /* Bottom center, 24px from edge */
```

---

## Animation Specifications

### AI Button Animations

```typescript
// Hover
whileHover={{ scale: 1.05, rotate: 5 }}

// Tap
whileTap={{ scale: 0.95 }}

// Transition
transition-shadow duration-200
```

### ChatSheet Slide-Up

```typescript
initial={{ y: "100%" }}
animate={{ y: "0%" }}
exit={{ y: "100%" }}
transition={{ type: "spring", damping: 30, stiffness: 300 }}
```

### FloatingNudge Pop-In

```typescript
initial={{ opacity: 0, scale: 0.9, y: 20 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.9, y: 20 }}
transition={{ type: "spring", damping: 25, stiffness: 400 }}
```

### Message Appearance (In ChatSheet)

```typescript
// Each message
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}

// Ice breaker chips (staggered)
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: idx * 0.1 }}  // 0ms, 100ms, 200ms, 300ms
```

---

## Production Migration Path

### Replace Seeded Q&A with Real AI

**Current (POC)**:
```typescript
// ChatSheet uses local matching
const seededAnswer = seededQuestions.find(...);
```

**Production (Future)**:
```typescript
// Replace with OpenAI/Claude API
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: queryText,
    context: {
      region: selectedRegion,
      data: relevantData,
      // Pass actual data context
    }
  })
});

const { answer } = await response.json();
```

### Streaming Responses (Optional)

```typescript
// Use ReadableStream for real-time typing effect
const stream = await fetch('/api/chat/stream', { ... });
const reader = stream.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  setMessages(prev => {
    const lastMessage = prev[prev.length - 1];
    return [...prev.slice(0, -1), {
      ...lastMessage,
      content: lastMessage.content + chunk
    }];
  });
}
```

### Context-Aware Prompts

```typescript
// System prompt with data context
const systemPrompt = `You are an AI assistant analyzing sales data for ${region}.

Current Data Context:
- Total Revenue: ${revenue}
- Active Dealers: ${dealerCount}
- Orders: ${orderCount}
- Top Performers: ${topCities.join(", ")}

Answer questions concisely and cite specific numbers from the data.`;
```

---

## Accessibility

### Keyboard Support

- **Enter key**: Send message
- **Tab navigation**: Through ice breaker chips
- **ESC key**: Close chat (future enhancement)

### Screen Reader Support

```tsx
// Button labels
title="Analyze Region with AI"
title="Close chat"

// ARIA roles (future enhancement)
role="dialog"
aria-labelledby="chat-title"
aria-describedby="chat-description"

// Message history
role="log"
aria-live="polite"
```

### Focus Management

- Input auto-focuses when sheet opens
- Focus returns to trigger button on close (future enhancement)

---

## Troubleshooting

### Issue: Chat doesn't open / Gray overlay only

**Cause**: SheetContent has `relative` positioning

**Fix**: Remove `relative` from SheetContent className
```tsx
// ❌ BROKEN
<SheetContent className="... relative">

// ✅ FIXED
<SheetContent className="... overflow-hidden">
```

See: [drawer-positioning-fix.md](./drawer-positioning-fix.md)

### Issue: Animations stuttering

**Cause**: GPU acceleration not enabled

**Fix**: Ensure `transform` properties are used (handled by Framer Motion)

### Issue: Framer Motion SSR errors

**Cause**: Components imported statically instead of dynamically

**Fix**: Use `dynamic` import with `ssr: false`
```tsx
const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);
```

---

## Reference Implementation

**File**: `components/dashboard/florida-regional-sales-map.tsx`

**Key Sections**:
- Lines 9: Framer Motion import
- Lines 69-76: Dynamic imports (ChatSheet, FloatingNudge)
- Lines 136-137: State management (isChatOpen, chatInitialQuery)
- Lines 714-733: AI Trigger Button implementation
- Lines 1283-1291: FloatingNudge implementation
- Lines 1294-1325: ChatSheet implementation with seeded Q&A

---

## Related Documentation

- [Chat Overlay Architecture](./chat-overlay-architecture.md) - Original iOS Maps pattern design
- [Drawer Positioning Fix](./drawer-positioning-fix.md) - Critical SheetContent CSS fix
- [Troubleshooting Next.js Errors](./troubleshooting-nextjs-errors.md) - SSR/framer-motion issues
- [Florida Regional Map Architecture](./florida-regional-map-architecture.md) - Full map component details

---

## Quick Copy-Paste Template

```tsx
// 1. Imports
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);
const FloatingNudge = dynamic(
  () => import("@/components/ui/floating-nudge").then((mod) => ({ default: mod.FloatingNudge })),
  { ssr: false }
);

// 2. State
const [isChatOpen, setIsChatOpen] = useState(false);
const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>();

// 3. Header Button
<div className="flex items-center gap-4">
  <motion.button
    onClick={() => setIsChatOpen(!isChatOpen)}
    className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center",
      "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50",
      "dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50",
      "border border-white/50 dark:border-white/10",
      "shadow-sm hover:shadow-md transition-shadow duration-200",
      isChatOpen && "ring-2 ring-indigo-400/50"
    )}
    whileHover={{ scale: 1.05, rotate: 5 }}
    whileTap={{ scale: 0.95 }}
    title="Analyze with AI"
  >
    <Sparkles className={cn(
      "h-5 w-5 transition-colors",
      isChatOpen ? "text-indigo-600 dark:text-indigo-400" : "text-indigo-500 dark:text-indigo-400"
    )} />
  </motion.button>
</div>

// 4. FloatingNudge
<FloatingNudge
  isVisible={!isChatOpen && /* condition */}
  text="✨ Your insight"
  onClick={() => {
    setChatInitialQuery("Your question");
    setIsChatOpen(true);
  }}
  className="absolute bottom-6 left-1/2 -translate-x-1/2"
/>

// 5. ChatSheet
<ChatSheet
  isOpen={isChatOpen}
  onClose={() => setIsChatOpen(false)}
  seededQuestions={[
    { question: "Q1?", answer: "A1" },
    { question: "Q2?", answer: "A2" }
  ]}
  placeholder="Ask about your data..."
  title="Chat Title"
  initialQuery={chatInitialQuery}
/>
```

---

**Last Updated**: 2025-11-20
**Status**: POC - Ready for reuse across drawers
**Next Steps**: Real AI API integration for production
