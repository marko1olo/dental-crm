import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const scheduleViewSource = readFileSync("apps/web/src/ScheduleView.tsx", "utf8");
const settingsViewSource = readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const shellSource = readFileSync("apps/web/src/workspaceShell.tsx", "utf8");
const continuityStripSource = readFileSync("apps/web/src/workspaceContinuityStrip.tsx", "utf8");
const routeErrorBoundarySource = readFileSync("apps/web/src/workspaceRouteErrorBoundary.tsx", "utf8");
const preloadSource = readFileSync("apps/web/src/workspacePreload.ts", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
const motionPreferenceSource = readFileSync("apps/web/src/motionPreference.ts", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'from "./workspaceShell"', "App.tsx must import workspace shell boundaries");
requireIn(appSource, 'from "./workspacePreload"', "App.tsx must import route preloading from the dedicated helper chunk");
// WorkspaceSidebar must receive currentView and onViewIntent (role prop is allowed)
requireIn(appSource, "<WorkspaceSidebar currentView={currentView}", "App.tsx must delegate sidebar rendering and route preloading");
requireIn(appSource, "onViewIntent={preloadWorkspaceView}", "App.tsx must wire preload intent into the sidebar");
requireIn(appSource, "<WorkspaceTopbar", "App.tsx must delegate topbar rendering");
requireIn(preloadSource, "const workspaceViewPreloaders", "Workspace preload helper must own lazy route preload mapping next to route imports");
requireIn(preloadSource, 'export type WorkspacePreloadIntent = "explicit" | "idle"', "Workspace preload helper must distinguish user-intent and idle route preloading");
requireIn(preloadSource, "type NetworkAwareNavigator", "Workspace preload helper must read browser network hints without unsafe navigator.connection access");
requireIn(preloadSource, "connection.saveData", "Workspace preload helper must respect Save-Data before route preloading");
requireIn(preloadSource, 'intent === "idle" && (effectiveType === "slow-2g" || effectiveType === "2g")', "Workspace preload helper must avoid idle route preloading on very slow links");
requireIn(preloadSource, 'export function preloadWorkspaceView(view: AppView, intent: WorkspacePreloadIntent = "explicit")', "Workspace preload helper must expose one network-aware route preload callback to shell chrome");
requireIn(preloadSource, "const idleWorkspacePreloadPlan", "Workspace preload helper must preload likely next lazy routes during browser idle time");
requireIn(preloadSource, "requestIdleCallback", "Workspace preload helper must use idle time for speculative route preloading");
requireIn(preloadSource, "window.setTimeout(preloadLikelyRoutes, 1200)", "Workspace preload helper must keep a timer fallback for browsers without requestIdleCallback");
requireIn(preloadSource, 'preloadViews.forEach((view) => preloadWorkspaceView(view, "idle"))', "Workspace preload helper must mark speculative idle route preloads separately from user intent");
requireIn(preloadSource, 'schedule: () => import("./ScheduleView")', "Workspace preload helper must preload ScheduleView on navigation intent");
requireIn(preloadSource, 'patients: () => import("./PatientsView")', "Workspace preload helper must preload PatientsView on navigation intent");
requireIn(preloadSource, 'documents: () => import("./DocumentsView")', "Workspace preload helper must preload DocumentsView on navigation intent");
requireIn(preloadSource, 'finance: () => import("./FinanceView")', "Workspace preload helper must preload FinanceView on navigation intent");
requireIn(preloadSource, 'communications: () => import("./CommunicationsView")', "Workspace preload helper must preload CommunicationsView on navigation intent");
requireIn(preloadSource, 'settings: () => import("./SettingsView")', "Workspace preload helper must preload SettingsView on navigation intent");
requireIn(appSource, "useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);", "App.tsx must delegate idle route preloading to the helper chunk");
requireIn(appSource, 'from "./workspaceRouteErrorBoundary"', "App.tsx must import the shared route error boundary outside the heavy route bodies");
requireIn(routeErrorBoundarySource, "class WorkspaceRouteErrorBoundary", "App.tsx must isolate lazy route failures from the whole workspace");
requireIn(routeErrorBoundarySource, "workspaceRouteErrorDetail", "Route error boundary must explain lazy route failures with operator-readable copy");
requireIn(routeErrorBoundarySource, "componentDidCatch(error: unknown, errorInfo: ErrorInfo)", "Workspace route error boundary must catch route runtime failures");
requireIn(routeErrorBoundarySource, "window.location.reload()", "Workspace route error boundary must offer deterministic recovery");
requireIn(routeErrorBoundarySource, "Раздел временно не открылся. Уже введенные данные не менялись.", "Workspace route error state must avoid raw chunk/error jargon");
for (const view of ["schedule", "patients", "documents", "finance", "communications", "settings"]) {
  requireIn(appSource, `<WorkspaceRouteErrorBoundary view="${view}"`, `Lazy ${view} route must be wrapped in a route error boundary`);
}
requireIn(
  continuityStripSource,
  "visible = !isOnline || pendingVisitSaveCount > 0 || pendingSpeechChunkCount > 0 || browserContinuityCritical",
  "Workspace must show a persistent continuity strip for offline mode, queued visit saves, queued audio, and local-storage risks"
);
requireIn(appSource, "<WorkspaceContinuityStrip", "App.tsx must mount the shared continuity strip outside individual routes");
requireIn(continuityStripSource, 'className={`workspace-continuity-strip ${!isOnline ? "offline" : "queued"}`}', "Workspace continuity strip must expose stable offline/queued states");
requireIn(continuityStripSource, "Можно продолжать прием: черновики и аудио остаются на этом устройстве", "Workspace offline strip must explain that clinical work can continue");
requireIn(continuityStripSource, "Отправить приемы", "Workspace continuity strip must offer queued visit sync without hunting inside the visit screen");
requireIn(continuityStripSource, "Отправить аудио", "Workspace continuity strip must offer queued audio sync without hunting inside the visit screen");
requireIn(continuityStripSource, "Проверить это устройство", "Workspace continuity strip must offer a device continuity check");
requireIn(continuityStripSource, "aria-describedby={!isOnline ? workspaceContinuityOfflineGuidanceId : undefined}", "Disabled continuity sync actions must point to offline guidance");
requireIn(appSource, "onViewIntent={preloadWorkspaceView}", "App.tsx must wire preload intent into shell chrome");
requireIn(appSource, 'className="skip-link"', "App.tsx must expose a keyboard skip link before the sidebar");
requireIn(appSource, 'href="#workspace-content"', "Keyboard skip link must target the workspace content region");
requireIn(appSource, 'id="workspace-content"', "Workspace region must be addressable by the skip link");
requireIn(appSource, "tabIndex={-1}", "Workspace region must be programmatically focusable for skip-link navigation");
requireIn(appSource, 'aria-label="Рабочая область"', "Workspace region must expose a readable landmark label");
forbidIn(appSource, 'className="sidebar"', "App.tsx must not inline sidebar markup");
forbidIn(appSource, 'className="topbar"', "App.tsx must not inline topbar markup");
forbidIn(appSource, "function ActionIcon", "App.tsx must not own the navigation action icon component");
forbidIn(appSource, "const workspaceViewPreloaders", "App.tsx must not inline route preload mapping in the workspace chunk");
forbidIn(appSource, "function shouldPreloadWorkspaceRoutes", "App.tsx must not inline network-aware preload policy in the workspace chunk");
forbidIn(appSource, "requestIdleCallback", "App.tsx must not inline idle preload scheduling in the workspace chunk");

requireIn(shellSource, "export const appViews", "workspaceShell must own app view registry");
requireIn(shellSource, "export const viewLabels", "workspaceShell must own app view labels");
requireIn(shellSource, "export const viewHints", "workspaceShell must own short operator hints for each app view");
requireIn(shellSource, "type WorkspaceViewIntentHandler = (view: AppView) => void", "workspaceShell must type route-intent preloading without owning route modules");
requireIn(shellSource, "export function ActionIcon", "workspaceShell must export action icon mapping");
requireIn(shellSource, "export function WorkspaceSidebar", "workspaceShell must export sidebar component");
requireIn(shellSource, "export function WorkspaceTopbar", "workspaceShell must export topbar component");
requireIn(shellSource, "appViews.map", "workspaceShell sidebar must render from the app view registry");
requireIn(shellSource, 'href={`#${view}`}', "workspaceShell sidebar links must stay hash-routed");
requireIn(shellSource, "onViewIntent?: WorkspaceViewIntentHandler", "workspaceShell must accept optional route preload intent callbacks");
requireIn(shellSource, "onPointerEnter={() => onViewIntent?.(view)}", "workspaceShell sidebar must preload lazy views on pointer intent");
requireIn(shellSource, "onFocus={() => onViewIntent?.(view)}", "workspaceShell sidebar must preload lazy views on keyboard focus");
requireIn(shellSource, "onTouchStart={() => onViewIntent?.(view)}", "workspaceShell sidebar must preload lazy views on touch intent");
requireIn(shellSource, 'onViewIntent?.("settings")', "workspaceShell top settings shortcut must preload SettingsView before navigation");
requireIn(shellSource, 'onViewIntent?.("schedule")', "workspaceShell top appointment shortcut must preload ScheduleView before navigation");
requireIn(shellSource, 'aria-current={currentView === view ? "page" : undefined}', "workspaceShell sidebar must announce the active page");
requireIn(shellSource, 'aria-label={`${viewLabels[view]}: ${viewHints[view]}`}', "workspaceShell sidebar links must explain each section beyond the short label");
requireIn(shellSource, 'title={`${viewLabels[view]}: ${viewHints[view]}`}', "workspaceShell sidebar links must expose hover hints for low-confidence users");
requireIn(shellSource, 'className="nav-copy"', "workspaceShell sidebar must render a visible label and desktop hint group");
requireIn(shellSource, 'aria-label="Настройки импорта и экспорта"', "workspaceShell icon-only settings shortcut must have an accessible name");
requireIn(shellSource, "onRoleChange(role)", "workspaceShell topbar must report role changes through props");
requireIn(shellSource, "aria-pressed={selectedWorkspaceRole === role}", "workspaceShell role buttons must expose selected state without relying on color");
requireIn(shellSource, "aria-label={`Рабочий режим: ${staffRoleLabels[role]}`}", "workspaceShell role buttons must have explicit action names");
requireIn(shellSource, "onGoToDictation", "workspaceShell topbar must keep dictation shortcut externalized");
requireIn(shellSource, "top-dictation-button", "workspaceShell topbar must expose a testable dictation shortcut");
requireIn(shellSource, "onGoToSchedule", "workspaceShell topbar must keep schedule shortcut externalized");
requireIn(shellSource, "onGoToVisit", "workspaceShell topbar must keep visit shortcut externalized");
requireIn(appSource, "goToVisitDictation", "App.tsx must wire the topbar dictation shortcut");
requireIn(appSource, 'scrollToVisitArea(".dictation-box")', "Topbar dictation shortcut must open the visit dictation area");
requireIn(cssSource, ":focus-visible", "Global CSS must expose visible keyboard focus");
requireIn(cssSource, ".skip-link:focus-visible", "Skip link must become visible on keyboard focus");
requireIn(cssSource, ".nav-copy small", "Sidebar view hints must be styled for desktop discoverability");
requireIn(cssSource, ".nav-copy small {\n    display: none;", "Sidebar view hints must collapse on mobile to protect bottom navigation");
requireIn(cssSource, ".workspace-route-error", "Route error panel must have a stable layout class");
requireIn(cssSource, ".status-needs_review", "Route error status pill must have an explicit warning style");
requireIn(cssSource, "max-width: min(640px, calc(100vw - 40px));", "Route error copy must keep a readable measure on mobile and desktop");
requireIn(cssSource, ".workspace-continuity-strip", "Workspace continuity strip must have a stable layout class");
requireIn(cssSource, ".workspace-continuity-strip.offline", "Workspace continuity strip must visually distinguish offline mode");
requireIn(cssSource, ".workspace-continuity-actions", "Workspace continuity actions must stay grouped and responsive");
requireIn(cssSource, "@media (prefers-reduced-motion: reduce)", "Global CSS must respect reduced-motion accessibility preferences");
requireIn(cssSource, "scroll-behavior: auto !important", "Reduced-motion mode must disable smooth scroll");
requireIn(cssSource, "transition-duration: 0.01ms !important", "Reduced-motion mode must suppress transitions");
requireIn(motionPreferenceSource, 'window.matchMedia("(prefers-reduced-motion: reduce)")', "Programmatic scroll helper must read the reduced-motion preference");
requireIn(motionPreferenceSource, "motionSafeScrollIntoView", "Programmatic scroll helper must expose one safe route");
requireIn(appSource, 'from "./motionPreference"', "App.tsx must use the reduced-motion aware scroll helper");
requireIn(financeViewSource, 'from "./motionPreference"', "FinanceView must use the reduced-motion aware scroll helper");
requireIn(scheduleViewSource, 'from "./motionPreference"', "ScheduleView must use the reduced-motion aware scroll helper");
requireIn(settingsViewSource, 'from "./motionPreference"', "SettingsView must use the reduced-motion aware scroll helper");
forbidIn(appSource, 'scrollIntoView({ behavior: "smooth"', "App.tsx must not force smooth programmatic scrolling");
forbidIn(financeViewSource, 'scrollIntoView({ behavior: "smooth"', "FinanceView must not force smooth programmatic scrolling");
forbidIn(scheduleViewSource, 'scrollIntoView({ behavior: "smooth"', "ScheduleView must not force smooth programmatic scrolling");
forbidIn(settingsViewSource, 'scrollIntoView({ behavior: "smooth"', "SettingsView must not force smooth programmatic scrolling");

if (missing.length > 0) {
  console.error("Workspace shell source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  sidebarDelegated: true,
  topbarDelegated: true,
  routeErrorRecovery: true,
  workspaceContinuityStrip: true,
  appViewRegistryOwnedByShell: true
});
