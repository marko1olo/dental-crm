import { readFileSync } from "node:fs";

const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8")
].join("\n");
const browserContinuitySource = readFileSync("apps/web/src/browserContinuity.ts", "utf8");
const bootSource = readFileSync("apps/web/src/AppBootState.tsx", "utf8");
const runtimeSource = `${appSource}\n${browserContinuitySource}`;

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'from "./AppBootState"', "App.tsx must import boot state boundaries");
requireIn(appSource, 'from "./browserContinuity"', "App.tsx must import browser continuity helpers instead of owning browser probes inline");
requireIn(appSource, "<AppUnlockState", "App.tsx must delegate clinical unlock UI");
requireIn(appSource, '<AppLoadingState\n        message={`Рабочий сервер недоступен: ${error}`}', "App.tsx must delegate server error boot UI without API jargon");
requireIn(appSource, 'actionLabel="Повторить загрузку"', "App boot server-error state must offer an explicit retry action");
requireIn(appSource, "setError(null);\n          void loadDashboard().catch", "App boot retry must clear stale error and retry dashboard loading");
requireIn(appSource, 'operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError)', "App boot retry failure must stay operator-readable");
requireIn(appSource, '<AppLoadingState message="Загрузка рабочей смены" />', "App.tsx must delegate dashboard loading UI");
requireIn(browserContinuitySource, "export async function inspectBrowserContinuity", "Browser continuity probes must stay in a dedicated helper chunk.");
requireIn(browserContinuitySource, "Браузер не дает сохранить экран для работы без сети", "App browser continuity warnings must explain offline screen storage without cache jargon.");
requireIn(browserContinuitySource, "Браузер не дает сохранить аудио для отправки позже", "App browser continuity warnings must explain offline audio storage without IndexedDB jargon.");
requireIn(browserContinuitySource, "Место для локальных черновиков почти заполнено", "App browser continuity warnings must explain storage pressure without quota jargon.");
requireIn(appSource, "очистить локальное хранилище", "App storage persistence failure must describe the operator-visible effect.");
requireIn(browserContinuitySource, "browserContinuityRegistrationLabels", "App continuity status card must map service worker states to readable labels.");
requireIn(appSource, 'label: "Работа без сети"', "App continuity status card must avoid PWA jargon.");
requireIn(appSource, 'label: "Память для офлайна"', "App continuity storage card must avoid cache jargon.");
requireIn(appSource, 'label: "Место"', "App continuity storage usage card must avoid quota jargon.");
forbidIn(runtimeSource, "API недоступен", "App boot failure copy must not expose API jargon.");
forbidIn(runtimeSource, "Очередь аудио в IndexedDB недоступна", "App browser continuity warnings must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "IndexedDB недоступен", "App audio queue errors must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "Запись в IndexedDB", "App audio queue errors must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "Обновление IndexedDB", "App audio queue errors must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "Удаление из IndexedDB", "App audio queue errors must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "Транзакция IndexedDB", "App audio queue errors must not expose IndexedDB jargon.");
forbidIn(runtimeSource, "Статус service worker недоступен", "App browser continuity warnings must not expose service worker jargon.");
forbidIn(runtimeSource, "Квота хранилища браузера почти заполнена", "App browser continuity warnings must not expose quota jargon.");
forbidIn(runtimeSource, "Офлайн-кэш оболочки", "App browser continuity warnings must not expose cache jargon.");
forbidIn(runtimeSource, "очистить кэш", "App storage persistence failure must not expose cache jargon.");
forbidIn(appSource, 'label: "Кэш"', "App continuity status card must not expose cache jargon.");
forbidIn(appSource, 'label: "PWA-оболочка"', "App continuity status card must not expose PWA jargon.");
forbidIn(appSource, 'label: "Квота"', "App continuity status card must not expose quota jargon.");
forbidIn(appSource, "очередь IndexedDB", "App continuity status card must not expose IndexedDB jargon.");
forbidIn(appSource, "async function inspectBrowserContinuity", "App.tsx must not inline browser continuity probes in the workspace chunk.");
forbidIn(appSource, "function browserLocalStorageWritable", "App.tsx must not inline localStorage probe implementation.");
forbidIn(appSource, 'className="boot-state boot-unlock-state"', "App.tsx must not inline unlock boot markup");
forbidIn(appSource, 'className="boot-unlock-form"', "App.tsx must not inline unlock form markup");
forbidIn(appSource, '<main className="boot-state">', "App.tsx must not inline generic boot markup");

requireIn(bootSource, "export function AppLoadingState", "AppBootState must export loading state");
requireIn(bootSource, "type AppLoadingStateProps", "AppBootState loading state must type optional recovery actions");
requireIn(bootSource, 'aria-busy={onAction ? undefined : "true"}', "AppBootState must expose busy state only for non-recoverable loading");
requireIn(bootSource, 'className="secondary-button boot-retry-button"', "AppBootState retry action must use the shared button styling");
requireIn(bootSource, 'actionLabel ?? "Повторить"', "AppBootState retry action must have a safe default label");
requireIn(bootSource, "export function AppUnlockState", "AppBootState must export unlock state");
requireIn(bootSource, 'className="boot-state boot-unlock-state"', "AppBootState must own unlock layout class");
requireIn(bootSource, 'className="boot-unlock-form"', "AppBootState must own unlock form class");
requireIn(bootSource, "onAdminSecretChange(event.target.value)", "AppBootState must keep secret input controlled by props");
requireIn(bootSource, "const secretReady = adminSecretDraft.trim().length > 0;", "AppBootState must use a named unlock readiness guard");
requireIn(bootSource, "if (!secretReady) return;", "AppBootState form submit must not call unlock with an empty secret");
requireIn(bootSource, "onUnlock();", "AppBootState must submit through callback, not own API state");
requireIn(bootSource, 'aria-describedby={!secretReady ? "boot-unlock-guidance" : undefined}', "AppBootState secret input must point to empty-secret guidance");
requireIn(bootSource, "Введите секрет администратора для этой сессии.", "AppBootState fallback copy must avoid raw header names.");
requireIn(bootSource, 'placeholder="введите секрет администратора"', "AppBootState placeholder must avoid raw header names.");
forbidIn(bootSource, "x-dente-admin-secret", "AppBootState must not expose the raw header name to operators.");
requireIn(bootSource, 'id="boot-unlock-guidance"', "AppBootState must render empty-secret guidance");
requireIn(bootSource, "Введите секрет доступа, который выдал администратор клиники.", "AppBootState must explain where the secret comes from");
requireIn(bootSource, "disabled={!secretReady}", "AppBootState unlock button must use the readiness guard");
requireIn(bootSource, "Секрет хранится только в памяти вкладки", "AppBootState must show session-only secret warning");

if (missing.length > 0) {
  console.error("App boot state source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  unlockDelegated: true,
  loadingDelegated: true,
  bootUiStateless: true
});
