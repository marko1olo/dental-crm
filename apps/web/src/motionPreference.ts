export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function motionSafeScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function motionSafeScrollIntoView(target: Element | null | undefined, options: Omit<ScrollIntoViewOptions, "behavior"> = {}) {
  target?.scrollIntoView({ ...options, behavior: motionSafeScrollBehavior() });
}
