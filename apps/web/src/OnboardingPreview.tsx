/**
 * DEV-ONLY: Onboarding Wizard Preview page
 * Accessible at http://localhost:5174/#onboarding-preview
 */
import React, { useEffect, useState } from "react";
import { OnboardingSetupWizard } from "./components/workspace/OnboardingSetupWizard";

function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches ||
         document.documentElement.getAttribute("data-theme") === "dark"
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    // Also watch data-theme changes
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark" || mq.matches);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => { mq.removeEventListener("change", handler); observer.disconnect(); };
  }, []);
  return dark;
}

export function OnboardingPreview() {
  const isDark = useDarkMode();
  return (
    <OnboardingSetupWizard
      isDark={isDark}
      onComplete={() => console.log("[OnboardingPreview] Completed")}
    />
  );
}
