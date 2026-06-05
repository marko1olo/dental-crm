import fs from "node:fs";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const saveStart = appSource.indexOf("async function saveTelegramSettings");
const saveEnd = appSource.indexOf("async function sendTelegramOutboxItem", saveStart);
assert(saveStart >= 0 && saveEnd > saveStart, "saveTelegramSettings body not found");
const saveBody = appSource.slice(saveStart, saveEnd);

const helperSnippets = [
  "function normalizeTelegramPublicHttpsUrlDraft",
  "telegramPublicUrlSensitiveQueryKeys",
  "telegramPublicUrlSensitivePathSegments",
  "parsed.protocol !== \"https:\"",
  "parsed.username || parsed.password",
  "patient/visit/document/token",
  "compactDigits.length >= 10",
  "parsed.hash = \"\"",
  "function normalizeTelegramVisualCardUrlDraftsForSave",
  "function normalizeTelegramBotUsernameDraft",
  "Telegram-бота без ссылки",
  "/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/"
];

for (const snippet of helperSnippets) {
  assert(appSource.includes(snippet), `Telegram URL UI validation missing ${snippet}`);
}

const saveSnippets = [
  'normalizeTelegramPublicHttpsUrlDraft("Адрес приема сообщений Telegram", telegramWebhookBaseUrlDraft)',
  'normalizeTelegramPublicHttpsUrlDraft("Портал пациента", telegramPatientPortalBaseUrlDraft)',
  'normalizeTelegramPublicHttpsUrlDraft("Картинка приветствия", telegramWelcomeImageUrlDraft)',
  "normalizeTelegramVisualCardUrlDraftsForSave(telegramVisualCardUrlDrafts)",
  'normalizeTelegramPublicHttpsUrlDraft("Ссылка на отзыв", telegramReviewUrlDraft)',
  'normalizeTelegramPublicHttpsUrlDraft("Ссылка на карту", telegramMapsUrlDraft)',
  "setTelegramSettingsSaveState(\"error\")",
  "setTelegramSettingsSaveError(message)",
  "return false;",
  "botUsername = normalizeTelegramBotUsernameDraft",
  "ownBotUsername = normalizeTelegramBotUsernameDraft",
  "botUsername,",
  "ownBotUsername,",
  "webhookBaseUrl,",
  "patientPortalBaseUrl,",
  "welcomeImageUrl,",
  "visualCardUrls,",
  "clinicReviewUrl,",
  "clinicMapsUrl,"
];

for (const snippet of saveSnippets) {
  assert(saveBody.includes(snippet), `saveTelegramSettings missing normalized URL path ${snippet}`);
}

for (const stalePayload of [
  "webhookBaseUrl: telegramWebhookBaseUrlDraft.trim() || null",
  "botUsername: telegramBotUsernameDraft.trim().replace(/^@/, \"\") || null",
  "ownBotUsername: telegramOwnBotUsernameDraft.trim().replace(/^@/, \"\") || null",
  "patientPortalBaseUrl: telegramPatientPortalBaseUrlDraft.trim() || null",
  "welcomeImageUrl: telegramWelcomeImageUrlDraft.trim() || null",
  "visualCardUrls: telegramVisualCardUrlDrafts",
  "clinicReviewUrl: telegramReviewUrlDraft.trim() || null",
  "clinicMapsUrl: telegramMapsUrlDraft.trim() || null"
]) {
  assert(!saveBody.includes(stalePayload), `saveTelegramSettings still sends raw URL draft: ${stalePayload}`);
}

const fetchIndex = saveBody.indexOf('fetch("/api/settings/telegram"');
assert(fetchIndex > saveBody.indexOf("normalizeTelegramPublicHttpsUrlDraft"), "URL validation must happen before settings PUT");

console.log("smoke:telegram-url-ui-source passed");
