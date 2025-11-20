# DataChat 3-State System Implementation

## Overview

The DataChat component implements a progressive disclosure pattern with three distinct states that guide users from discovery to active conversation.

## The 3 States

### 1. Minimized State
**Height**: 60px
**Behavior**: Compact input bar fixed at the bottom of the container

**Visual Elements**:
- Bot icon (primary color)
- Placeholder text: "Ask about South Florida data..." (customizable)
- Chevron down icon (hint for expansion)

**Interaction**:
- Clicking anywhere on the bar → transitions to Discovery mode
- Hover effect provides visual feedback

**Use Case**: Default state when drawer opens, minimal footprint

---

### 2. Discovery Mode
**Height**: 300px (standard) or 80vh (maximized)
**Behavior**: Expands to show "Ice Breaker" suggestion chips

**Visual Elements**:
- Header with title, maximize, reset (disabled), and minimize buttons
- Bot icon (large, centered) with descriptive text
- Up to 4 suggestion chips displayed as outline buttons
- Input field with send button (always present)

**Interaction**:
- Clicking a suggestion chip → sends that question and transitions to Active mode
- Typing and sending a message → transitions to Active mode
- Minimize button → returns to Minimized state
- Maximize button → expands to 80vh height

**Use Case**: Encourages exploration with preset queries, reduces cognitive load for new users

---

### 3. Active Chat Mode
**Height**: 300px (standard) or 80vh (maximized)
**Behavior**: Message history replaces suggestion chips

**Visual Elements**:
- Header with title, maximize, reset (enabled), and minimize buttons
- Scrollable message history area
- User messages (right-aligned, primary background)
- Assistant messages (left-aligned, muted background)
- Processing indicator (animated dots)
- Input field with send button (always present)

**Interaction**:
- Typing and sending messages → adds to history
- Reset button → clears history and returns to Discovery mode
- Minimize button → returns to Minimized state
- Auto-scroll to latest message

**Use Case**: Full conversational interface for ongoing dialogue

---

## State Transitions

```
┌─────────────┐
│  Minimized  │ ←──────────────────────┐
└──────┬──────┘                        │
       │ Click bar                     │
       ↓                               │ Minimize button
┌─────────────┐                        │
│  Discovery  │                        │
└──────┬──────┘                        │
       │ Click chip OR send message    │
       ↓                               │
┌─────────────┐                        │
│   Active    │ ───────────────────────┘
└──────┬──────┘    Minimize button
       │
       │ Reset button
       ↓
┌─────────────┐
│  Discovery  │
└─────────────┘
```

---

## Dynamic Props

### `suggestions?: string[]`
Array of suggestion strings to display as ice breaker chips in Discovery mode.

**Example**:
```tsx
<DataChat
  suggestions={[
    "What are the top cities?",
    "How many dealers are active?",
    "Show me sales trends"
  ]}
/>
```

**Default Behavior**: If not provided, suggestions are derived from `seededQuestions.map(qa => qa.question)`

---

### `seededQuestions?: SeededQA[]`
Array of Q&A pairs for automatic responses (POC feature).

**Type**:
```typescript
type SeededQA = {
  question: string;
  answer: string;
};
```

**Example**:
```tsx
<DataChat
  seededQuestions={[
    {
      question: "What are the top cities in South Florida?",
      answer: "The top performing cities are Miami, Fort Lauderdale, and West Palm Beach..."
    },
    {
      question: "How many dealers are active?",
      answer: "There are 99 active dealers generating 733 orders..."
    }
  ]}
/>
```

**Matching Logic**: Uses case-insensitive substring matching between user input and question text

---

### `placeholder?: string`
Placeholder text for input field (displayed in all states).

**Default**: `"Ask about South Florida data..."`

---

### `title?: string`
Title displayed in header (Discovery and Active modes).

**Default**: `"Chat with my Data (POC)"`

---

### `className?: string`
Additional CSS classes applied to container.

---

## Maximize Feature

The maximize button (expand/arrows icon) toggles between two height modes:

- **Standard**: 300px (good for 3-5 messages)
- **Maximized**: 80vh (accommodates long conversations)

**Behavior**:
- Available in both Discovery and Active modes
- Icon changes: Maximize2 → Minimize2
- Smooth transition via CSS
- State persists until reset or minimize

---

## Visual Polish & Animations

### CSS Transitions
- Container height: `transition-all duration-300 ease-in-out`
- Button hover states: `duration-200`
- State content: Uses Tailwind's `animate-in` utilities

### Animations
1. **Discovery → Active**: Ice breaker buttons fade out, messages fade in with slide-up
2. **Processing Indicator**: Three dots with staggered bounce animation (0ms, 150ms, 300ms delays)
3. **Message Appearance**: Each new message fades in with subtle slide-up

### Auto-scroll
- Messages container auto-scrolls to bottom when new messages arrive
- Smooth behavior for better UX

### Auto-focus
- Input field automatically focuses when entering Discovery or Active mode

---

## Usage Example (Florida Regional Sales Map)

```tsx
<DataChat
  seededQuestions={[
    {
      question: `What are the top cities in ${selectedRegion.region}?`,
      answer: `In ${selectedRegion.region}, the top performing cities are ${topCities}. The region generated ${revenue} in total revenue.`
    },
    {
      question: "How many dealers are active?",
      answer: `There are ${dealerCount} active dealers in ${region}, generating ${orderCount} orders with total revenue of ${revenue}.`
    },
    {
      question: "Show me county performance",
      answer: `${region} has ${countyCount} counties. The top performing county is ${topCounty}.`
    }
  ]}
  placeholder={`Ask about ${selectedRegion.region} data...`}
  title={`Chat about ${selectedRegion.region}`}
/>
```

---

## Implementation Notes

1. **State Management**: Uses `useState<ChatMode>` with type-safe transitions
2. **Refs**: Uses `useRef` for message container (auto-scroll) and input field (auto-focus)
3. **Effects**: Two `useEffect` hooks for auto-scroll and auto-focus behaviors
4. **No External Dependencies**: Pure React + Tailwind, no Framer Motion required
5. **Accessibility**: Proper button labels, keyboard support (Enter to send)

---

## Future Enhancements (Production)

1. Replace seeded Q&A with real AI API integration
2. Add typing indicators with real-time streaming
3. Support markdown rendering in assistant messages
4. Add conversation persistence (localStorage or backend)
5. Implement message timestamps and read receipts
6. Add voice input capability
7. Support file/image attachments for context
