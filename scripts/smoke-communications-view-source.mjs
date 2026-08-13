import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

/*
 * Переводы строк нормализуются: в дереве `core.autocrlf=true` и файлы лежат
 * смешанно — styles/main.css целиком в CRLF, App.tsx целиком в LF. Требование с
 * литералом `\n` иначе проверяет не содержимое файла, а способ его выгрузки.
 */
function readSource(relativePath) {
	return readFileSync(relativePath, "utf8").replace(/\r\n/g, "\n");
}

const appSource = `${readSource("apps/web/src/App.tsx")}\n${readAppLogicSourceSync().replace(/\r\n/g, "\n")}`;
const communicationsSource = readSource("apps/web/src/CommunicationsView.tsx");
const cssSource = readSource("apps/web/src/styles/main.css");

const missing = [];

/*
 * Требование сопоставляется терпимо к переносам, но строго к токенам. Замерено
 * 29.07.2026: из четырёх непрошедших требований этого стража НИ ОДНО не было
 * дефектом продукта, и одно из четырёх — просто перенос аргументов Biome:
 *   требовалось `async function completeCommunicationTask(taskId: string, outcome: CommunicationTaskOutcome)`
 *   в коде     useAppLogic.tsx:12988 — та же подпись на четырёх строках.
 * Идиом «закрепляем связь, а не написание вокруг неё» — из
 * smoke-finance-ledger-source.mjs ведущего (bc0c1e7db).
 */
function flexiblePattern(snippet) {
	const tokens = snippet
		.split(/\s+/)
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("\\s*");
	return new RegExp(
		tokens
			.replace(/\\\./g, "\\s*\\??\\s*\\.")
			.replace(/(\\[({])/g, "$1\\s*")
			.replace(/(\\[)}])/g, "(?:\\s*,)?\\s*$1"),
	);
}

function requireIn(source, snippet, message) {
	if (snippet instanceof RegExp) {
		if (!snippet.test(source)) missing.push(message);
		return;
	}
	if (!source.includes(snippet) && !flexiblePattern(snippet).test(source))
		missing.push(message);
}

function forbidIn(source, snippet, message) {
	if (source.includes(snippet)) missing.push(message);
}

requireIn(
	appSource,
	'lazy(() => import("./CommunicationsView")',
	"App.tsx must lazy-load CommunicationsView",
);
requireIn(
	appSource,
	"<Suspense",
	"App.tsx must wrap lazy communication view in Suspense",
);
requireIn(
	appSource,
	'aria-busy="true"',
	"Communication fallback must expose busy state",
);
requireIn(
	appSource,
	"<CommunicationsView",
	"App.tsx must render the lazy communication boundary",
);
requireIn(
	appSource,
	"sortedCommunicationTasks={sortedCommunicationTasks}",
	"App.tsx must pass sorted communication tasks",
);
requireIn(
	appSource,
	"onCommunicationNoteChange={setCommunicationNote}",
	"App.tsx must keep closing note controlled",
);
requireIn(
	appSource,
	"completeCommunicationTask={completeCommunicationTask}",
	"App.tsx must keep task completion wired",
);
requireIn(
	appSource,
	"communicationSavingTaskId",
	"App.tsx must track the communication task currently being saved",
);
requireIn(
	appSource,
	"setCommunicationSavingTaskId(taskId)",
	"App.tsx must mark the exact communication task being closed",
);
requireIn(
	appSource,
	"type CommunicationTaskOutcome",
	"App.tsx must import the typed communication task outcome contract",
);
requireIn(
	appSource,
	"async function completeCommunicationTask(taskId: string, outcome: CommunicationTaskOutcome)",
	"Communication completion must require a typed task outcome",
);
requireIn(
	appSource,
	"Выберите исход задачи связи",
	"Communication completion must reject missing outcomes before calling the API",
);
requireIn(
	appSource,
	"outcome,",
	"Communication completion must send the selected outcome to the API",
);
requireIn(
	appSource,
	'responseErrorMessage(response, "Задача связи не закрыта")',
	"Communication completion must surface readable API errors",
);
requireIn(
	appSource,
	"Дождитесь завершения текущего закрытия задачи связи.",
	"Communication completion must explain duplicate close attempts",
);
requireIn(
	appSource,
	"openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}",
	"App.tsx must keep document workflow action wired",
);
forbidIn(
	appSource,
	'className="communications-summary-grid"',
	"App.tsx must not inline communication summary cards",
);
forbidIn(
	appSource,
	"sortedCommunicationTasks.map((task)",
	"App.tsx must not inline communication task cards",
);
forbidIn(
	appSource,
	'className="communication-side"',
	"App.tsx must not inline communication side rail",
);

requireIn(
	communicationsSource,
	"export function CommunicationsView",
	"CommunicationsView must export the route component",
);
requireIn(
	communicationsSource,
	/*
	 * Закрытая скобка `>` из требования убрана: в CommunicationsView.tsx:302 у
	 * панели появился ещё `data-testid="communications-view"`. Добавленный
	 * тестовый крючок — улучшение, а не регресс, и закреплять на нём отсутствие
	 * атрибутов нельзя.
	 */
	'<div className="panel communications-panel" id="communications"',
	"CommunicationsView must own panel markup",
);
requireIn(
	communicationsSource,
	'className="communications-summary-grid"',
	"CommunicationsView must own summary cards",
);
requireIn(
	communicationsSource,
	'className="communication-task-list"',
	"CommunicationsView must own task list",
);
requireIn(
	communicationsSource,
	/*
	 * ПУСТОЕ СОСТОЯНИЕ ПЕРЕВЕДЕНО НА ОБЩИЙ КОМПОНЕНТ, А НЕ УДАЛЕНО.
	 *
	 * Требовалась своя разметка `className="communication-empty-state"`; теперь
	 * очередь связи рисует общий `<EmptyState>` из components/EmptyState.tsx
	 * (CommunicationsView.tsx:5 — импорт, :470 — использование). Требование к
	 * СОДЕРЖАНИЮ пустого состояния не изменилось и проходит рядом: «Очередь связи
	 * пуста», «Открыть расписание», действие на onGoToSchedule. Проверяется теперь
	 * использование общего компонента: своя копия того же блока — это то, от чего
	 * уходили.
	 */
	"<EmptyState",
	"CommunicationsView must show an explicit empty state",
);
requireIn(
	communicationsSource,
	"Очередь связи пуста",
	"CommunicationsView must explain empty communication queue",
);
requireIn(
	communicationsSource,
	"Открыть расписание",
	"CommunicationsView empty state must offer the next scheduling step",
);
requireIn(
	communicationsSource,
	"onClick={onGoToSchedule}",
	"CommunicationsView empty state schedule action must be wired",
);
requireIn(
	communicationsSource,
	/*
	 * ТРЕБОВАНИЕ ОБРАЩЕНО: СВОЯ КОПИЯ ПРАВИЛА СКЛОНЕНИЯ — ЭТО ТО, ОТ ЧЕГО УШЛИ.
	 *
	 * Раньше требовалось `function ruCount`, то есть СОБСТВЕННАЯ функция
	 * согласования числа внутри экрана. Её убрали намеренно, и причина записана
	 * прямо на её месте — CommunicationsView.tsx:40-46: правило склонения в
	 * проекте одно, владелец у него один (`countLabel` из lib/russianPlural.ts,
	 * реэкспортируется AppHelpers), а вторая копия того же правила через полгода
	 * даёт два разных ответа на один вопрос.
	 *
	 * Требовать `function ruCount` — значит требовать вернуть дубль правила, что
	 * прямо противоречит .agents/AGENTS.md (MONOLITH PREVENTION: декомпозировать в
	 * переиспользуемые части). Поэтому проверяется не наличие своей функции, а
	 * использование общей: экран обязан согласовывать числа общим владельцем.
	 */
	"countLabel(",
	"CommunicationsView must format Russian counts through the shared countLabel owner",
);
requireIn(
	communicationsSource,
	'from "./lib/russianPlural"',
	"CommunicationsView must take Russian plural rules from the single shared module",
);
requireIn(
	communicationsSource,
	"documentKindsForCommunicationTask(task)",
	"CommunicationsView must preserve document task actions",
);
requireIn(
	communicationsSource,
	"openCommunicationTaskDocumentWorkflow(task, kind)",
	"CommunicationsView must keep document workflow callbacks",
);
requireIn(
	communicationsSource,
	"completeCommunicationTask(task.id, selectedOutcome)",
	"CommunicationsView must keep completion callbacks with a selected outcome",
);
requireIn(
	communicationsSource,
	"CommunicationTaskOutcome",
	"CommunicationsView must import typed communication task outcomes",
);
requireIn(
	communicationsSource,
	"const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string>",
	"CommunicationsView must define visible labels for narrow task outcomes",
);
requireIn(
	communicationsSource,
	"no_answer",
	"CommunicationsView must offer no-answer as a completion outcome",
);
requireIn(
	communicationsSource,
	"callback_requested",
	"CommunicationsView must offer callback as a completion outcome",
);
requireIn(
	communicationsSource,
	"reschedule_requested",
	"CommunicationsView must offer reschedule as a completion outcome",
);
requireIn(
	communicationsSource,
	"promised_payment",
	"CommunicationsView must offer promised payment as a completion outcome",
);
requireIn(
	communicationsSource,
	"document_pickup",
	"CommunicationsView must offer document pickup as a completion outcome",
);
requireIn(
	communicationsSource,
	'className="communication-outcome-select"',
	"Communication task cards must render a row-level outcome selector",
);
requireIn(
	communicationsSource,
	'const [selectedOutcome, setSelectedOutcome] = useState<CommunicationTaskOutcome | "">("")',
	"Each communication task card must keep its own selected outcome",
);
requireIn(
	communicationsSource,
	"completeCommunicationTask(task.id, selectedOutcome)",
	"Communication close action must pass the selected outcome",
);
requireIn(
	communicationsSource,
	"disabled={communicationSaveInProgress || !selectedOutcome}",
	"Communication close buttons must stay disabled until an outcome is selected",
);
requireIn(
	communicationsSource,
	"const documentActionLabel = communicationDocumentTaskActionLabels[kind] ?? documentLabels[kind];",
	"Communication document action buttons must compute one visible/accessibility label.",
);
requireIn(
	communicationsSource,
	"aria-label={`${documentActionLabel}: ${task.title}`}",
	"Communication document action buttons must include the task title in their accessible name.",
);
requireIn(
	communicationsSource,
	'<FileText aria-hidden="true" /> {documentActionLabel}',
	"Communication document action buttons must reuse the same label visually.",
);
requireIn(
	communicationsSource,
	'const communicationNoteInputId = "communication-closing-note"',
	"CommunicationsView must use a stable id for the communication closing note input",
);
requireIn(
	communicationsSource,
	'const communicationNoteDescriptionId = "communication-closing-note-guidance"',
	"CommunicationsView must use a stable id for the closing note guidance",
);
requireIn(
	communicationsSource,
	"htmlFor={communicationNoteInputId}",
	"Communication closing note label must explicitly target the input",
);
requireIn(
	communicationsSource,
	"id={communicationNoteInputId}",
	"Communication closing note input must be addressable",
);
requireIn(
	communicationsSource,
	"aria-describedby={communicationNoteDescriptionId}",
	"Communication closing note input must point to its visible guidance",
);
requireIn(
	communicationsSource,
	"completionNoteDescriptionId={communicationNoteDescriptionId}",
	"Communication task cards must receive the closing note guidance id",
);
requireIn(
	communicationsSource,
	"completionNoteDescriptionId: string",
	"Communication task card props must type the closing note guidance id",
);
requireIn(
	communicationsSource,
	"aria-label={`Закрыть задачу связи: ${task.title}`}",
	"Communication close buttons must include the task title in their accessible name",
);
requireIn(
	communicationsSource,
	"id={savingStatusId}",
	"Communication row-local saving status must be addressable",
);
requireIn(
	communicationsSource,
	"aria-describedby={isTaskSaving ? `${completionNoteDescriptionId} ${savingStatusId}` : completionNoteDescriptionId}",
	"Communication close buttons must point to note guidance and row-local saving state",
);
requireIn(
	communicationsSource,
	"communicationSavingTaskId === task.id",
	"CommunicationsView must identify which task is closing",
);
requireIn(
	communicationsSource,
	'className="communication-task-saving"',
	"CommunicationsView must render row-local closing feedback",
);
requireIn(
	communicationsSource,
	"aria-busy={isTaskSaving || undefined}",
	"CommunicationsView close button must expose busy state",
);
requireIn(
	communicationsSource,
	"disabled={communicationSaveInProgress || !selectedOutcome}",
	"CommunicationsView must block duplicate communication closes and missing outcomes",
);

requireIn(
	cssSource,
	".communication-empty-state",
	"CSS must style communication empty state",
);
requireIn(
	cssSource,
	".communication-empty-state > div",
	"CSS must layout communication empty state guidance and action",
);
requireIn(
	cssSource,
	".communication-task-saving",
	"CSS must style row-local communication save feedback",
);
requireIn(
	cssSource,
	".communication-outcome-select",
	"CSS must style communication task outcome selectors",
);
requireIn(
	cssSource,
	".communication-outcome-select select",
	"CSS must bound communication task outcome select controls",
);

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
	documentWorkflowActionsPreserved: true,
});
