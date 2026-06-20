import type { AppView } from "./workspaceShell";

const workspaceViewPreloaders: Partial<Record<AppView, () => Promise<unknown>>> = {
  schedule: () => import("./ScheduleView"),
  patients: () => import("./PatientsView"),
  documents: () => import("./DocumentsView"),
  finance: () => import("./FinanceView"),
  communications: () => import("./CommunicationsView"),
  settings: () => import("./SettingsView"),
  marketing: () => import("./MarketingView")
};

const idleWorkspacePreloadPlan: Partial<Record<AppView, AppView[]>> = {
  shift: ["schedule", "patients"],
  schedule: ["patients"],
  patients: ["schedule", "documents"],
  imaging: ["settings"],
  visit: ["documents", "finance"],
  documents: ["finance"],
  finance: ["documents"],
  communications: ["patients"],
  settings: ["schedule", "marketing"],
  marketing: ["settings", "schedule"]
};

type IdlePreloadWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export type WorkspacePreloadIntent = "explicit" | "idle";

type NetworkAwareNavigator = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

function shouldPreloadWorkspaceRoutes(intent: WorkspacePreloadIntent): boolean {
  if (typeof navigator === "undefined") return true;
  const connection = (navigator as NetworkAwareNavigator).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
  if (intent === "idle" && (effectiveType === "slow-2g" || effectiveType === "2g")) return false;
  return true;
}

export function preloadWorkspaceView(view: AppView, intent: WorkspacePreloadIntent = "explicit") {
  if (!shouldPreloadWorkspaceRoutes(intent)) return;
  void workspaceViewPreloaders[view]?.();
}

export function scheduleIdleWorkspacePreload(currentView: AppView): (() => void) | undefined {
  if (typeof window === "undefined") return undefined;
  if (!shouldPreloadWorkspaceRoutes("idle")) return undefined;
  const preloadViews = idleWorkspacePreloadPlan[currentView] ?? [];
  if (!preloadViews.length) return undefined;
  const idleWindow = window as IdlePreloadWindow;
  const preloadLikelyRoutes = () => {
    preloadViews.forEach((view) => preloadWorkspaceView(view, "idle"));
  };
  if (idleWindow.requestIdleCallback) {
    const idleHandle = idleWindow.requestIdleCallback(preloadLikelyRoutes, { timeout: 1600 });
    return () => idleWindow.cancelIdleCallback?.(idleHandle);
  }
  const preloadTimer = window.setTimeout(preloadLikelyRoutes, 1200);
  return () => window.clearTimeout(preloadTimer);
}
