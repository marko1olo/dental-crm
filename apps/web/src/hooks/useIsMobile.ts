import { useState, useEffect } from "react";

/**
 * Responsive hook for mobile viewport detection with Apple HIG ergonomics.
 * Standard mobile breakpoint is <= 768px.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateMatches = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    updateMatches();
    window.addEventListener("resize", updateMatches);

    if (typeof window.matchMedia === "function") {
      const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
      if (query.addEventListener) {
        query.addEventListener("change", updateMatches);
        return () => {
          window.removeEventListener("resize", updateMatches);
          query.removeEventListener("change", updateMatches);
        };
      }
      query.addListener(updateMatches);
      return () => {
        window.removeEventListener("resize", updateMatches);
        query.removeListener(updateMatches);
      };
    }

    return () => window.removeEventListener("resize", updateMatches);
  }, [breakpoint]);

  return isMobile;
}
