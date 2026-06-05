import fs from "node:fs";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const settingsSource = fs.readFileSync("apps/web/src/SettingsView.tsx", "utf8");

const requiredSnippets = [
  '{currentView === "shift" ? (',
  '{["shift", "patients"].includes(currentView) ? (',
  '{currentView === "imaging" ? (',
  '{["schedule", "patients", "visit", "documents", "finance", "communications"].includes(currentView) ? (',
  '{currentView === "schedule" ? (',
  '{currentView === "patients" ? (',
  '{currentView === "visit" ? (',
  '{currentView === "documents" ? (',
  '{currentView === "finance" ? (',
  '{currentView === "communications" ? (',
  '{["documents", "finance", "communications", "settings"].includes(currentView) ? (',
  '<details className="compliance-bar" aria-label="Контроль">',
  '{currentView === "settings" ? ('
];

const requiredSettingsTabSnippets = [
  '{settingsTab === "clinic" ? (\n          <section className="clinic-config"',
  '{settingsTab === "access" ? (\n          <section className="access-settings"',
  '{settingsTab === "telegram" ? (\n          <section className="telegram-settings"',
  '{settingsTab === "protocols" ? (\n          <section className="protocol-settings"',
  '{settingsTab === "rules" ? (\n          <section className="rule-studio"',
  '{settingsTab === "prices" ? (\n          <section className="pricelist-studio"',
  '{settingsTab === "sources" ? (\n          <section className="connector-grid"',
  '{settingsTab === "sources" ? (\n          <section className="dicom-capability-panel"',
  '{settingsTab === "sources" && typedDicomViewerToolStateBundle ? (\n            <section className="dicom-toolstate-result"',
  '{settingsTab === "sources" ? (\n          <section className="integration-presets"',
  '{settingsTab === "ai" ? (\n          <section className="recognition-lab"',
  '{settingsTab === "imports" ? (\n          <section className="import-studio smart-import-studio"',
  '{["imports", "sources"].includes(settingsTab) ? (',
  '{settingsTab === "audit" ? (\n          <section className="ops-grid"',
  '{settingsTab === "imports" ? (\n          <section className="import-studio"'
];

const forbiddenSnippets = [
  'className="shift-hero" id="shift" hidden={currentView !== "shift"}',
  'className="care-path" aria-label="Путь приема" hidden={currentView !== "shift"}',
  'className="role-focus-strip" aria-label="Фокус текущей роли" hidden={currentView !== "shift"}',
  'className="shift-intelligence" aria-label="Операционный контроль смены" hidden={currentView !== "shift"}',
  'className="patient-cockpit" aria-label="Карточка пациента" hidden={currentView !== "shift" && currentView !== "patients"}',
  'className="imaging-panel" id="imaging" aria-label="Снимки пациента" hidden={currentView !== "imaging"}',
  'className="work-grid page-grid" hidden=',
  'className="panel schedule-panel" id="schedule" hidden={currentView !== "schedule"}',
  'className="panel patients-panel" id="patients" hidden={currentView !== "patients"}',
  'className="panel visit-panel" id="visit" hidden={currentView !== "visit"}',
  'className="panel documents-panel" id="documents" hidden={currentView !== "documents"}',
  'className="panel finance-panel" id="finance" hidden={currentView !== "finance"}',
  'className="panel communications-panel" id="communications" hidden={currentView !== "communications"}',
  'className="compliance-bar" aria-label="Контроль" hidden=',
  'className="settings-zone" id="settings" aria-label="Настройки и перенос данных" hidden={currentView !== "settings"}'
];

const forbiddenSettingsTabSnippets = [
  "hidden={settingsTab !==",
  'hidden={settingsTab !== "imports" && settingsTab !== "sources"}',
  'className="clinic-config" aria-label="Аккаунт клиники и команда" hidden=',
  'className="access-settings" aria-label="Доступы, рабочие профили и роли" hidden=',
  'className="telegram-settings" aria-label="Telegram-бот клиники" hidden=',
  'className="protocol-settings" aria-label="Библиотека клинических протоколов" hidden=',
  'className="rule-studio" aria-label="Редактор клинических правил" hidden=',
  'className="pricelist-studio" aria-label="Разбор прайс-листа клиники" hidden=',
  'className="connector-grid" aria-label="Интеграции снимков" hidden=',
  'className="dicom-capability-panel" aria-label="Рентген и КТ-просмотрщик" hidden=',
  'className="dicom-toolstate-result" aria-label="Состояние инструментов КТ-просмотрщика" hidden=',
  'className="integration-presets" aria-label="Пресеты миграции и внешних систем" hidden=',
  'className="recognition-lab" aria-label="ИИ-распознавание диктовки, журнала и снимков" hidden=',
  'className="import-studio smart-import-studio" aria-label="Умный разбор смешанной выгрузки" hidden=',
  'className="import-studio imaging-import-studio" hidden=',
  'className="ops-grid" aria-label="Журнал операций" hidden=',
  'className="import-studio" aria-label="Миграция из старой программы" hidden='
];

function countOccurrences(source, snippet) {
  return source.split(snippet).length - 1;
}

const missingRequired = requiredSnippets.filter((snippet) => !appSource.includes(snippet));
const missingSettingsTabs = requiredSettingsTabSnippets.filter((snippet) => !settingsSource.includes(snippet));
const forbiddenPresent = forbiddenSnippets.filter((snippet) => appSource.includes(snippet));
const forbiddenSettingsTabsPresent = forbiddenSettingsTabSnippets.filter(
  (snippet) => appSource.includes(snippet) || settingsSource.includes(snippet)
);
const appNoticeAlertCount = countOccurrences(appSource, '<section className="app-notice" role="alert" aria-live="assertive">');

if (
  missingRequired.length ||
  missingSettingsTabs.length ||
  forbiddenPresent.length ||
  forbiddenSettingsTabsPresent.length ||
  appNoticeAlertCount < 2
) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missingRequired,
        missingSettingsTabs,
        forbiddenPresent,
        forbiddenSettingsTabsPresent,
        appNoticeAlertCount
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      gatedTopLevelSections: requiredSnippets.length,
      gatedSettingsSections: requiredSettingsTabSnippets.length,
      appNoticeAlerts: appNoticeAlertCount
    },
    null,
    2
  )
);
