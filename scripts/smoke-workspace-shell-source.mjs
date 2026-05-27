import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const shellSource = readFileSync("apps/web/src/workspaceShell.tsx", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'from "./workspaceShell"', "App.tsx must import workspace shell boundaries");
requireIn(appSource, "<WorkspaceSidebar currentView={currentView} />", "App.tsx must delegate sidebar rendering");
requireIn(appSource, "<WorkspaceTopbar", "App.tsx must delegate topbar rendering");
forbidIn(appSource, 'className="sidebar"', "App.tsx must not inline sidebar markup");
forbidIn(appSource, 'className="topbar"', "App.tsx must not inline topbar markup");
forbidIn(appSource, "function ActionIcon", "App.tsx must not own the navigation action icon component");

requireIn(shellSource, "export const appViews", "workspaceShell must own app view registry");
requireIn(shellSource, "export const viewLabels", "workspaceShell must own app view labels");
requireIn(shellSource, "export function ActionIcon", "workspaceShell must export action icon mapping");
requireIn(shellSource, "export function WorkspaceSidebar", "workspaceShell must export sidebar component");
requireIn(shellSource, "export function WorkspaceTopbar", "workspaceShell must export topbar component");
requireIn(shellSource, "appViews.map", "workspaceShell sidebar must render from the app view registry");
requireIn(shellSource, 'href={`#${view}`}', "workspaceShell sidebar links must stay hash-routed");
requireIn(shellSource, "onRoleChange(role)", "workspaceShell topbar must report role changes through props");
requireIn(shellSource, "onGoToDictation", "workspaceShell topbar must keep dictation shortcut externalized");
requireIn(shellSource, "top-dictation-button", "workspaceShell topbar must expose a testable dictation shortcut");
requireIn(shellSource, "onGoToSchedule", "workspaceShell topbar must keep schedule shortcut externalized");
requireIn(shellSource, "onGoToVisit", "workspaceShell topbar must keep visit shortcut externalized");
requireIn(appSource, "goToVisitDictation", "App.tsx must wire the topbar dictation shortcut");
requireIn(appSource, 'scrollToVisitArea(".dictation-box")', "Topbar dictation shortcut must open the visit dictation area");

if (missing.length > 0) {
  console.error("Workspace shell source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  sidebarDelegated: true,
  topbarDelegated: true,
  appViewRegistryOwnedByShell: true
});
