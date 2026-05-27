import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const communicationsSource = readFileSync("apps/web/src/CommunicationsView.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'lazy(() => import("./CommunicationsView")', "App.tsx must lazy-load CommunicationsView");
requireIn(appSource, "<Suspense", "App.tsx must wrap lazy communication view in Suspense");
requireIn(appSource, 'aria-busy="true"', "Communication fallback must expose busy state");
requireIn(appSource, "<CommunicationsView", "App.tsx must render the lazy communication boundary");
requireIn(appSource, "sortedCommunicationTasks={sortedCommunicationTasks}", "App.tsx must pass sorted communication tasks");
requireIn(appSource, "onCommunicationNoteChange={setCommunicationNote}", "App.tsx must keep closing note controlled");
requireIn(appSource, "completeCommunicationTask={completeCommunicationTask}", "App.tsx must keep task completion wired");
requireIn(appSource, "communicationSavingTaskId", "App.tsx must track the communication task currently being saved");
requireIn(appSource, "setCommunicationSavingTaskId(taskId)", "App.tsx must mark the exact communication task being closed");
requireIn(appSource, 'responseErrorMessage(response, "Задача связи не закрыта")', "Communication completion must surface readable API errors");
requireIn(appSource, "Дождитесь завершения текущего закрытия задачи связи.", "Communication completion must explain duplicate close attempts");
requireIn(appSource, "openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}", "App.tsx must keep document workflow action wired");
forbidIn(appSource, 'className="communications-summary-grid"', "App.tsx must not inline communication summary cards");
forbidIn(appSource, "sortedCommunicationTasks.map((task)", "App.tsx must not inline communication task cards");
forbidIn(appSource, 'className="communication-side"', "App.tsx must not inline communication side rail");

requireIn(communicationsSource, "export function CommunicationsView", "CommunicationsView must export the route component");
requireIn(communicationsSource, '<div className="panel communications-panel" id="communications">', "CommunicationsView must own panel markup");
requireIn(communicationsSource, 'className="communications-summary-grid"', "CommunicationsView must own summary cards");
requireIn(communicationsSource, 'className="communication-task-list"', "CommunicationsView must own task list");
requireIn(communicationsSource, 'className="communication-empty-state"', "CommunicationsView must show an explicit empty state");
requireIn(communicationsSource, "Очередь связи пуста", "CommunicationsView must explain empty communication queue");
requireIn(communicationsSource, "function ruCount", "CommunicationsView must own Russian count formatting");
requireIn(communicationsSource, "documentKindsForCommunicationTask(task)", "CommunicationsView must preserve document task actions");
requireIn(communicationsSource, "openCommunicationTaskDocumentWorkflow(task, kind)", "CommunicationsView must keep document workflow callbacks");
requireIn(communicationsSource, "completeCommunicationTask(task.id)", "CommunicationsView must keep completion callbacks");
requireIn(communicationsSource, "communicationSavingTaskId === task.id", "CommunicationsView must identify which task is closing");
requireIn(communicationsSource, 'className="communication-task-saving"', "CommunicationsView must render row-local closing feedback");
requireIn(communicationsSource, 'aria-busy={isTaskSaving || undefined}', "CommunicationsView close button must expose busy state");
requireIn(communicationsSource, 'disabled={communicationSaveInProgress}', "CommunicationsView must block duplicate communication closes while saving");

requireIn(cssSource, ".communication-empty-state", "CSS must style communication empty state");
requireIn(cssSource, ".communication-task-saving", "CSS must style row-local communication save feedback");

if (missing.length > 0) {
  console.error("Communications view source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  communicationsViewLazy: true,
  communicationQueueEmptyState: true,
  rowLocalCloseFeedback: true,
  documentWorkflowActionsPreserved: true
});
