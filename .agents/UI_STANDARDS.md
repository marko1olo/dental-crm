# 🎨 Web UI Standards & State Management

This document defines user interface styling policies, component organization, and state rules.

---

## 🎨 UI Styling: Tailwind CSS

The frontend uses **Tailwind CSS** for layout, spacing, and colors.

### 💅 Guidelines
1.  **Tailwind Over Inline Styles:** Inline styles (`style={{ ... }}`) are discouraged unless dynamically calculating layout values (e.g., coordinates, scale). Always use Tailwind classes for typography, margins, backgrounds, and flex configurations.
2.  **Color Consistency:** Follow the existing clinic theme colors (Emerald for positive states, Slate/Gray for cards, Red/Orange for alerts).
3.  **Responsive Layouts:** All new interfaces must use Tailwind responsive modifiers (`sm:`, `md:`, `lg:`) to adapt to different screen dimensions. Test your layouts for both desktop viewports and mobile widths.

---

## 🧠 State Management: AppLogicContext

DENTE relies on a single massive React context (`AppLogicContext`) backed by the `useAppLogic` hook.

### 🚨 The God-Context Constraints
*   **The Return Object:** `useAppLogic` returns an object of over 500 fields. Because the return is typeless (`any` in context), any missing shorthands will compile successfully in Vite dev-server but **fail in production build typechecks**.
*   **Modifying Context:** If you must add state:
    1.  Declare the state inside `useAppLogic.tsx`.
    2.  Add it to the return statement.
    3.  Run `npm run typecheck` immediately to ensure no shorthand breaks.
*   **Do not break bindings:** Never delete return values or variables from `useAppLogic` without verifying no components use them.

---

## 🚀 Route Gating & View Preloading

### 📂 View Preloading (`apps/web/src/workspacePreload.ts`)
To eliminate component mounting delays inside the app's shell, DENTE imports views beforehand:
```typescript
import "./workspaceShell";
import "./ScheduleView";
import "./PatientsView";
// ...
```
*   **CRITICAL RULE:** If you create a new root view/page, you **MUST** register its import in `workspacePreload.ts`. If you skip this, Vite will dynamically lazy-load it, triggering Cumulative Layout Shift (CLS) warnings.
