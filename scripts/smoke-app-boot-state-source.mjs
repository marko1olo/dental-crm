import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const bootSource = readFileSync("apps/web/src/AppBootState.tsx", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'from "./AppBootState"', "App.tsx must import boot state boundaries");
requireIn(appSource, "<AppUnlockState", "App.tsx must delegate clinical unlock UI");
requireIn(appSource, '<AppLoadingState message={`API недоступен: ${error}`} />', "App.tsx must delegate API error boot UI");
requireIn(appSource, '<AppLoadingState message="Загрузка рабочей смены" />', "App.tsx must delegate dashboard loading UI");
forbidIn(appSource, 'className="boot-state boot-unlock-state"', "App.tsx must not inline unlock boot markup");
forbidIn(appSource, 'className="boot-unlock-form"', "App.tsx must not inline unlock form markup");
forbidIn(appSource, '<main className="boot-state">', "App.tsx must not inline generic boot markup");

requireIn(bootSource, "export function AppLoadingState", "AppBootState must export loading state");
requireIn(bootSource, "export function AppUnlockState", "AppBootState must export unlock state");
requireIn(bootSource, 'className="boot-state boot-unlock-state"', "AppBootState must own unlock layout class");
requireIn(bootSource, 'className="boot-unlock-form"', "AppBootState must own unlock form class");
requireIn(bootSource, "onAdminSecretChange(event.target.value)", "AppBootState must keep secret input controlled by props");
requireIn(bootSource, "const secretReady = adminSecretDraft.trim().length > 0;", "AppBootState must use a named unlock readiness guard");
requireIn(bootSource, "if (!secretReady) return;", "AppBootState form submit must not call unlock with an empty secret");
requireIn(bootSource, "onUnlock();", "AppBootState must submit through callback, not own API state");
requireIn(bootSource, 'aria-describedby={!secretReady ? "boot-unlock-guidance" : undefined}', "AppBootState secret input must point to empty-secret guidance");
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
