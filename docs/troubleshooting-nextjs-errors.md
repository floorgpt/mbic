# Troubleshooting Next.js Errors

## Common Errors and Solutions

### 1. "Cannot read properties of undefined (reading 'call')"

**Symptom**: Runtime error during page load, often with framer-motion or other animation libraries.

**Root Cause**: Server-side rendering (SSR) trying to execute browser-only code.

**Solution**: Use dynamic imports with `ssr: false`

```tsx
// ❌ Static import (causes SSR errors)
import { ChatSheet } from "@/components/ui/chat-sheet";

// ✅ Dynamic import (works correctly)
const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);
```

**When to use**:
- Components using framer-motion
- Components using browser APIs (window, document, localStorage)
- Components using libraries like Leaflet, D3, etc.

---

### 2. "Cannot find module './XXXX.js'"

**Symptom**: Error mentioning missing webpack chunks during dev server startup.

**Root Cause**: Corrupted `.next` build artifacts, usually after:
- Installing new dependencies
- Modifying dynamic imports
- Dev server crashes or errors

**Solution**: Clean build artifacts and rebuild

```bash
# Clean Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build
```

**Prevention**:
- Restart dev server after installing dependencies
- Use `npm run build` to verify before committing
- Add `.next/` to `.gitignore`

---

### 3. "Hydration failed because the initial UI does not match"

**Symptom**: Console warnings about hydration mismatch, duplicate content rendering.

**Root Cause**: Server-rendered HTML differs from client-rendered HTML.

**Common Causes**:
- Using browser APIs (window, localStorage) during render
- Conditional rendering based on client-side state
- Date/time formatting differences between server and client

**Solution**:

```tsx
// ❌ Causes hydration mismatch
function MyComponent() {
  const isClient = typeof window !== 'undefined';
  return <div>{isClient ? 'Client' : 'Server'}</div>;
}

// ✅ Use useEffect for client-only code
function MyComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div>Loading...</div>;
  return <div>Client content</div>;
}
```

---

### 4. "Module not found: Can't resolve 'X'"

**Symptom**: Build fails with missing module error.

**Root Cause**: Missing dependency or incorrect import path.

**Solution**:

1. **Check if dependency is installed**:
   ```bash
   npm list <package-name>
   ```

2. **Install if missing**:
   ```bash
   npm install <package-name>
   ```

3. **Verify import path**:
   ```tsx
   // ❌ Incorrect path
   import { Button } from "components/ui/button";

   // ✅ Correct path with @/ alias
   import { Button } from "@/components/ui/button";
   ```

---

### 5. "You are importing a component that needs useState/useEffect"

**Symptom**: Error about using hooks in a Server Component.

**Root Cause**: Component uses React hooks but doesn't have `"use client"` directive.

**Solution**:

```tsx
// ❌ Missing "use client"
import { useState } from "react";

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ✅ Add "use client" directive
"use client";

import { useState } from "react";

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

### 6. Framer Motion Errors

**Common Errors**:
- `motion.div is not a function`
- `AnimatePresence is not defined`
- Runtime errors with animations

**Root Cause**: SSR attempting to render framer-motion components.

**Solution**: Always use dynamic imports for framer-motion components

```tsx
// Component using framer-motion
"use client";

import { motion, AnimatePresence } from "framer-motion";

export function AnimatedComponent({ isOpen }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          Content
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Parent component importing it
import dynamic from "next/dynamic";

const AnimatedComponent = dynamic(
  () => import("./AnimatedComponent").then((mod) => ({ default: mod.AnimatedComponent })),
  { ssr: false }
);
```

---

## General Debugging Steps

### 1. Check the Console

**Development**:
- Browser console (F12)
- Terminal running dev server
- Look for stack traces and error messages

### 2. Clean Build

```bash
# Full clean
rm -rf .next node_modules/.cache
npm run build

# If issues persist, reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 3. Verify Environment

```bash
# Check Node version (should be 18+)
node --version

# Check Next.js version
npm list next

# Check for peer dependency warnings
npm install
```

### 4. Incremental Testing

1. Comment out recent changes
2. Test if app works
3. Uncomment changes one by one
4. Identify the breaking change

### 5. Enable Verbose Logging

```bash
# Dev server with verbose output
npm run dev -- --debug

# Build with verbose output
npm run build -- --debug
```

---

## Prevention Best Practices

### 1. Always Use Dynamic Imports for Client-Only Libraries

```tsx
// Leaflet, D3, framer-motion, chart libraries, etc.
const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });
```

### 2. Add "use client" Directive When Needed

```tsx
// Any component using:
// - useState, useEffect, useReducer, etc.
// - Event handlers (onClick, onChange)
// - Browser APIs (window, document, localStorage)
"use client";
```

### 3. Test Builds Regularly

```bash
# Before committing
npm run build

# Before deploying
npm run build && npm run start
```

### 4. Use TypeScript

- Catches import errors at compile time
- Prevents prop type mismatches
- Provides better IDE autocomplete

### 5. Clean Builds After Dependency Changes

```bash
# After npm install or package.json changes
rm -rf .next
npm run dev
```

---

## Project-Specific Issues

### Florida Regional Sales Map

**Issue**: Map doesn't render or shows blank screen

**Checklist**:
1. ✅ All Leaflet components dynamically imported with `ssr: false`
2. ✅ GeoJSON files exist in `public/geo/` directory
3. ✅ Component has `"use client"` directive
4. ✅ Browser console shows GeoJSON loaded logs
5. ✅ `isMounted` state prevents SSR rendering

### Chat Components (ChatSheet, FloatingNudge)

**Issue**: Runtime errors or components don't render

**Checklist**:
1. ✅ Components dynamically imported with `ssr: false`
2. ✅ framer-motion installed (`npm list framer-motion`)
3. ✅ Components have `"use client"` directive
4. ✅ AnimatePresence wraps conditional rendering
5. ✅ Parent component manages `isOpen` state correctly

---

## Helpful Commands

```bash
# Clean everything and start fresh
rm -rf .next node_modules/.cache node_modules package-lock.json
npm install
npm run build

# Check for outdated dependencies
npm outdated

# Update Next.js
npm install next@latest react@latest react-dom@latest

# Verify TypeScript
npm run type-check

# Run linter
npm run lint
```

---

## Getting Help

When reporting issues:

1. **Include error message** (full stack trace)
2. **Include Next.js version** (`npm list next`)
3. **Include steps to reproduce**
4. **Include relevant code snippets**
5. **Include browser console logs**
6. **Mention recent changes** (new dependencies, code modifications)

Example issue report:
```
Error: Cannot find module './5611.js'

Next.js version: 15.5.4
Node version: 18.17.0
Browser: Chrome 120

Steps to reproduce:
1. Added framer-motion dependency
2. Started dev server
3. Navigated to dashboard

Recent changes:
- Added ChatSheet component using framer-motion
- Modified florida-regional-sales-map.tsx

Solution attempted:
- Cleaned .next directory
- Rebuilt successfully
```
