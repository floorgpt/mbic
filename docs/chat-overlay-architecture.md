# Chat Overlay Architecture - iOS Maps / Linear.app Pattern

## Overview

The AI Chat interface has been refactored from a "Persistent Bottom Widget" to a modern "Overlay Sheet & Trigger" pattern, inspired by iOS Maps and linear.app. This provides a cleaner, more focused UX with contextual AI nudges.

---

## Architecture Components

### 1. The Trigger (Header Button)

**Location**: Drawer header (SheetHeader), next to the title
**Component**: Sparkles icon button

**Visual States**:
- **Inactive**: Muted foreground color
- **Active (chat open)**: Primary color
- **Hover**: Transitions to primary color

**Behavior**:
- Clicking toggles `isChatOpen` state
- Only visible in region mode (not ZIP mode)

**Code**:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 group"
  onClick={() => setIsChatOpen(!isChatOpen)}
  title="Chat with AI"
>
  <Sparkles className={cn(
    "h-4 w-4 transition-colors",
    isChatOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary"
  )} />
</Button>
```

---

### 2. The Overlay Sheet (ChatSheet)

**Component**: `components/ui/chat-sheet.tsx`
**Positioning**: `absolute bottom-0 left-0 right-0`
**Dimensions**: Width 100%, Height 70vh

**Visual Design**:
- **Glassmorphism**: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md`
- **Shape**: Large top border radius (`rounded-t-3xl`)
- **Shadow**: Heavy shadow (`shadow-2xl`) for elevation
- **Border**: Top border for definition

**Layout Structure**:
```
┌─────────────────────────────────┐
│     Drag Handle (pill)          │
├─────────────────────────────────┤
│  Header (Bot icon + Title + X)  │
├─────────────────────────────────┤
│                                 │
│   Message History (scrollable)  │
│   OR                            │
│   Discovery (ice breaker chips) │
│                                 │
├─────────────────────────────────┤
│  Input Field + Send Button      │
└─────────────────────────────────┘
```

**Animation** (Framer Motion):
```tsx
initial={{ y: "100%" }}
animate={{ y: "0%" }}
exit={{ y: "100%" }}
transition={{ type: "spring", damping: 30, stiffness: 300 }}
```

**Key Features**:
1. **Drag Handle**: Visual affordance (12px wide, 6px high pill)
2. **Message History**: Chat bubbles with user (right) and assistant (left) messages
3. **Ice Breakers**: Up to 4 suggestion chips when no messages
4. **Auto-scroll**: Scrolls to latest message automatically
5. **Auto-focus**: Input field focuses when sheet opens
6. **Initial Query**: Can accept pre-filled query from FloatingNudge

---

### 3. Contextual Nudges (FloatingNudge)

**Component**: `components/ui/floating-nudge.tsx`
**Positioning**: `absolute bottom-6 left-1/2 -translate-x-1/2` (bottom center)
**Z-Index**: 10 (above table, below ChatSheet)

**Visual Design**:
- **Shape**: Pill-shaped button (`rounded-full`)
- **Background**: Gradient from primary to primary/90
- **Text**: Primary foreground, small font, medium weight
- **Icon**: Sparkles with pulse animation
- **Shadow**: Large shadow with hover enhancement
- **Border**: Subtle border with primary foreground opacity

**Logic** (Mock for POC):
```tsx
isVisible={sortedCounties.length > 0 && sortedCounties[0].revenue > 50000}
```

**Behavior**:
- Only shows when chat is closed
- High-value insight detection (e.g., top city has >$50k revenue)
- Clicking sets initial query and opens chat
- Hover: Scale up to 105%
- Active: Scale down to 95%

**Animation** (Framer Motion):
```tsx
initial={{ opacity: 0, scale: 0.9, y: 20 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.9, y: 20 }}
transition={{ type: "spring", damping: 25, stiffness: 400 }}
```

---

## State Management

### Key States

```tsx
const [isChatOpen, setIsChatOpen] = useState(false);
const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
```

### State Flow

```
1. User clicks FloatingNudge
   ↓
   setChatInitialQuery("Why is Miami performing so well?")
   setIsChatOpen(true)
   ↓
   ChatSheet opens with initial query pre-filled
   ↓
   Initial query is sent automatically

2. User clicks Sparkle button in header
   ↓
   setIsChatOpen(!isChatOpen)
   ↓
   ChatSheet toggles (slide up/down)

3. User clicks X in ChatSheet
   ↓
   onClose() → setIsChatOpen(false)
   ↓
   ChatSheet slides down and unmounts
```

---

## Integration Example (Florida Regional Sales Map)

### Prerequisites

1. **Parent container** must have `relative` positioning
2. **Data table** takes 100% height when chat closed
3. **Framer Motion** installed (`npm install framer-motion`)

### Implementation

```tsx
import { ChatSheet } from "@/components/ui/chat-sheet";
import { FloatingNudge } from "@/components/ui/floating-nudge";
import { Sparkles } from "lucide-react";

// State
const [isChatOpen, setIsChatOpen] = useState(false);
const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>();

// In SheetHeader
<Button
  variant="ghost"
  size="icon"
  onClick={() => setIsChatOpen(!isChatOpen)}
>
  <Sparkles className={isChatOpen ? "text-primary" : "text-muted-foreground"} />
</Button>

// Before closing </SheetContent>
<FloatingNudge
  isVisible={!isChatOpen && hasHighValueInsight}
  text="✨ Analyze top performer?"
  onClick={() => {
    setChatInitialQuery("Why is this city performing well?");
    setIsChatOpen(true);
  }}
  className="absolute bottom-6 left-1/2 -translate-x-1/2"
/>

<ChatSheet
  isOpen={isChatOpen}
  onClose={() => setIsChatOpen(false)}
  seededQuestions={[...]}
  placeholder="Ask about your data..."
  title="Chat with Data"
  initialQuery={chatInitialQuery}
/>
```

---

## Props Reference

### ChatSheet Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls sheet visibility |
| `onClose` | `() => void` | Yes | Callback when user closes sheet |
| `suggestions` | `string[]` | No | Ice breaker chip texts (falls back to seededQuestions) |
| `seededQuestions` | `SeededQA[]` | No | Q&A pairs for automatic responses |
| `placeholder` | `string` | No | Input placeholder (default: "Ask about your data...") |
| `title` | `string` | No | Header title (default: "Chat with Data") |
| `initialQuery` | `string` | No | Pre-filled query to send on open |

### FloatingNudge Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isVisible` | `boolean` | Yes | Controls nudge visibility |
| `text` | `string` | Yes | Insight text to display |
| `onClick` | `() => void` | Yes | Callback when nudge clicked |
| `className` | `string` | No | Additional CSS classes for positioning |

---

## Animation Details

### ChatSheet Slide-Up

- **Type**: Spring animation
- **Damping**: 30 (smooth deceleration)
- **Stiffness**: 300 (medium bounce)
- **Duration**: ~400ms
- **Effect**: Slides up from bottom (y: 100% → 0%)

### FloatingNudge Pop-In

- **Type**: Spring animation
- **Damping**: 25 (slightly bouncy)
- **Stiffness**: 400 (snappy)
- **Duration**: ~300ms
- **Effect**: Fade in + scale up + slide up

### Message Appearance

- **Type**: Fade + slide
- **Duration**: 200ms
- **Effect**: Each message fades in with subtle slide-up
- **Stagger**: 100ms delay for ice breaker chips

---

## UX Benefits

### Compared to Persistent Widget

1. **Cleaner Interface**: Data table has 100% vertical space when chat closed
2. **Contextual Discovery**: FloatingNudge appears only when relevant insights exist
3. **Focused Interaction**: Full 70vh height for chat provides better conversation view
4. **Progressive Disclosure**: Users discover chat through sparkle button or nudge
5. **Modern Feel**: Glassmorphism and smooth animations match contemporary design standards

### Key User Flows

**Flow 1: Nudge-Driven**
```
View data → See floating nudge → Click nudge → Chat opens with query → Get answer
```

**Flow 2: Header-Driven**
```
View data → Click sparkle button → Chat opens → Browse chips → Ask question
```

**Flow 3: Return User**
```
View data → Chat opens → Previous conversation visible → Continue chat
```

---

## Accessibility

1. **Keyboard Support**:
   - Enter key sends message
   - Tab navigation through chips
   - ESC key closes sheet (future enhancement)

2. **Screen Readers**:
   - Proper button labels ("Chat with AI", "Close chat")
   - ARIA roles for message history
   - Semantic HTML for structure

3. **Focus Management**:
   - Input auto-focuses on sheet open
   - Focus returns to trigger button on close (future enhancement)

---

## Future Enhancements

### Production Roadmap

1. **Real AI Integration**
   - Replace seeded Q&A with OpenAI/Claude API
   - Streaming responses for real-time feel
   - Context-aware query understanding

2. **Advanced Gestures**
   - Drag handle for manual sheet resizing
   - Swipe down to close
   - Tap outside to dismiss

3. **Conversation Features**
   - Persistence (localStorage or backend)
   - Message timestamps
   - Copy message content
   - Regenerate response

4. **Smart Nudges**
   - ML-based insight detection
   - Multiple concurrent nudges
   - Nudge dismissal with "not interested" feedback

5. **Multimodal Support**
   - Voice input (Web Speech API)
   - Chart/table attachments in messages
   - Export conversation to PDF

---

## Technical Notes

### Performance

- **AnimatePresence**: Ensures smooth unmounting animations
- **Conditional Rendering**: ChatSheet only renders when region mode active
- **Memo Optimization**: Consider memoizing seededQuestions for large datasets

### Browser Compatibility

- **Backdrop Filter**: Requires modern browsers (Safari 9+, Chrome 76+, Firefox 103+)
- **Fallback**: Use solid background if backdrop-filter not supported
- **Spring Animations**: Gracefully degrades to CSS transitions

### Mobile Considerations

- **Touch Targets**: All buttons meet 44x44px minimum
- **Viewport Height**: 70vh may need adjustment for mobile keyboards
- **Scroll Behavior**: Ensure message history scrolls smoothly on iOS

---

## Migration from DataChat

### Breaking Changes

1. **Component Name**: `DataChat` → `ChatSheet`
2. **Required Props**: Now requires `isOpen` and `onClose`
3. **Positioning**: Changed from inline to absolute overlay
4. **Height Management**: No longer controlled by parent container

### Migration Checklist

- [ ] Install framer-motion
- [ ] Add `relative` class to parent container (SheetContent)
- [ ] Add `isChatOpen` state to parent
- [ ] Add sparkle button to header
- [ ] Replace DataChat with ChatSheet
- [ ] Add FloatingNudge component
- [ ] Remove inline chat container/border styling
- [ ] Test animations and positioning

---

## Example Output

### Seeded Q&A Example

**Region**: South Florida

**Questions**:
1. "What are the top cities in South Florida?"
2. "How many dealers are active?"
3. "Show me county performance"
4. "Why is Miami performing so well in South Florida?"

**Answers** (Dynamic based on data):
```
Q: What are the top cities in South Florida?
A: In South Florida, the top performing cities are Miami, Fort Lauderdale,
   West Palm Beach. The region generated $486,307 in total revenue.

Q: How many dealers are active?
A: There are 99 active dealers in South Florida, generating 733 orders
   with total revenue of $486,307.

Q: Why is Miami performing so well in South Florida?
A: Miami is the top performer with $313,277 in revenue. This represents
   a strong market presence with 64 active dealers and 421 orders.
```

---

## Troubleshooting

### Chat Not Opening

1. Check `isChatOpen` state is updating
2. Verify `SheetContent` has `relative` class
3. Ensure `drawerMode === "region"`
4. Check browser console for framer-motion errors

### Nudge Not Appearing

1. Verify `isChatOpen === false`
2. Check insight detection logic
3. Ensure `sortedCounties` has data
4. Verify z-index stacking

### Animation Stuttering

1. Reduce spring stiffness value
2. Check for parent container scroll conflicts
3. Ensure GPU acceleration (transform properties)
4. Test with `AnimatePresence` mode="wait"
