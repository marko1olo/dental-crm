import fs from "node:fs";

const appSource = [
  fs.readFileSync("apps/web/src/App.tsx", "utf8"),
  fs.readFileSync("apps/web/src/useAppLogic.tsx", "utf8"),
  fs.readFileSync("apps/web/src/AppHelpers.tsx", "utf8")
].join("\n");
const styleSource = fs.readFileSync("apps/web/src/styles/main.css", "utf8");

const missing = [];

const requiredAppSnippets = [
  'type DenteTelegramPortalSection = "home" | "documents" | "tax" | "billing" | "care" | "schedule"',
  "denteTelegramHandoffTargets",
  'section: "home"',
  'view: "shift"',
  'section: "tax"',
  'view: "documents"',
  'documentKind: "tax_deduction_certificate"',
  'section: "billing"',
  'view: "finance"',
  'section: "care"',
  'view: "communications"',
  'url.searchParams.get("dente_source") !== "telegram"',
  'url.searchParams.get("dente_section")',
  "stripDenteTelegramHandoffQuery",
  "initialTelegramHandoffTargetRef.current ?? readDenteTelegramHandoffTarget()",
  'url.search = ""',
  'url.hash = `#${target.hash}`',
  "window.history.replaceState",
  "setTelegramHandoffNotice",
  "telegram-handoff-notice",
  "Ссылка не содержит",
  "пациента, документ, запись или оплату"
];

for (const snippet of requiredAppSnippets) {
  if (!appSource.includes(snippet)) missing.push(`App.tsx missing ${snippet}`);
}

const forbiddenAppPatterns = [
  /searchParams\.get\(["']patient/i,
  /searchParams\.get\(["']document/i,
  /searchParams\.get\(["']appointment/i,
  /searchParams\.get\(["']payment/i,
  /localStorage\.[gs]etItem\([^)]*dente_section/i,
  /localStorage\.[gs]etItem\([^)]*dente_source/i
];

for (const pattern of forbiddenAppPatterns) {
  if (pattern.test(appSource)) missing.push(`App.tsx forbidden Telegram handoff pattern: ${pattern}`);
}

if (!styleSource.includes(".telegram-handoff-notice")) {
  missing.push("main.css missing Telegram handoff notice style");
}

if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "Telegram dente_section web handoff opens safe sections and strips query identifiers"
    },
    null,
    2
  )
);
