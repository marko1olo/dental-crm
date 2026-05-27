import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const settingsSource = readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

requireIn(appSource, 'lazy(() => import("./SettingsView")', "App.tsx must lazy-load SettingsView.");
requireIn(appSource, "<SettingsView", "App.tsx must render the lazy settings boundary.");
requireIn(appSource, 'className="settings-zone"', "Settings route fallback must preserve settings shell styling.");
requireIn(appSource, 'aria-busy="true"', "Settings route fallback must expose loading state.");
forbidIn(appSource, 'className="settings-tabs"', "App.tsx must not inline settings tabs.");
forbidIn(appSource, 'className="connector-grid"', "App.tsx must not inline heavy settings source integrations.");
forbidIn(appSource, 'className="telegram-settings"', "App.tsx must not inline Telegram control UI.");

requireIn(settingsSource, "export function SettingsView", "SettingsView must export the route component.");
requireIn(settingsSource, '<section className="settings-zone" id="settings"', "SettingsView must own settings shell.");
requireIn(settingsSource, 'className="settings-tabs"', "SettingsView must own settings navigation.");
requireIn(settingsSource, 'settingsTab === "sources"', "SettingsView must preserve source integrations section.");
requireIn(settingsSource, 'settingsTab === "telegram"', "SettingsView must preserve Telegram control section.");
requireIn(settingsSource, "buildDicomViewerWorkbenchManifest", "SettingsView must preserve DICOM workbench actions.");
requireIn(settingsSource, "analyzePricelist", "SettingsView must preserve pricelist analyzer action.");
requireIn(settingsSource, "type MprProjection = DicomMprProjection;", "SettingsView must use the shared DICOM MPR projection contract.");
requireIn(settingsSource, "type MprWindowPreset = Extract<ImagingViewerWindowPreset", "SettingsView must use the shared imaging window preset contract.");
requireIn(settingsSource, "const staffCreationRoles: StaffRole[]", "SettingsView must keep staff role creation typed.");
requireIn(settingsSource, "const clinicalRuleOwnerRoles: StaffRole[]", "SettingsView must keep clinical rule owners typed.");
requireIn(settingsSource, "recognitionInputReady", "SettingsView must guard empty AI recognition input.");
requireIn(settingsSource, "smartImportInputReady", "SettingsView must guard empty smart import input.");
requireIn(settingsSource, "runMigrationAutopilot", "SettingsView must expose one-click migration autopilot.");
requireIn(settingsSource, "migrationAutopilot", "SettingsView must render migration autopilot results.");
requireIn(settingsSource, "migrationAutopilot.operatorPacket", "SettingsView must render the migration operator packet.");
requireIn(settingsSource, "migrationAutopilot.operatorPacket.handoffChecklist", "SettingsView must render the migration handoff checklist.");
requireIn(settingsSource, "pickBrowserMigrationSource", "SettingsView must expose browser-local legacy source manifest selection.");
requireIn(settingsSource, "browserMigrationDiscovery", "SettingsView must render browser-local migration manifest results.");
requireIn(settingsSource, "discoverMigrationSources", "SettingsView must expose local migration source discovery.");
requireIn(settingsSource, "migrationSourceDiscovery", "SettingsView must render local migration source discovery results.");
requireIn(settingsSource, "planMigrationDiscoveryCandidate", "SettingsView must build a safe workup plan for discovered migration sources.");
requireIn(settingsSource, "migrationSourceWorkup", "SettingsView must render migration source workup results.");
requireIn(settingsSource, "probeMigrationDiscoveryCandidate", "SettingsView must run read-only probes for discovered migration sources.");
requireIn(settingsSource, "migrationSourceProbe", "SettingsView must render migration source probe results.");
requireIn(settingsSource, "addMigrationDiscoveryCandidateToSmartImport", "SettingsView must let admins send discovered sources to smart import.");
requireIn(settingsSource, "lookupClinicPublicProfile", "SettingsView must expose public clinic-profile lookup.");
requireIn(settingsSource, "clinicPublicLookup", "SettingsView must render public clinic lookup results.");
requireIn(settingsSource, "data-testid=\"run-migration-autopilot\"", "SettingsView must test-tag the migration autopilot action.");
requireIn(settingsSource, "data-testid=\"migration-autopilot-result\"", "SettingsView must test-tag migration autopilot results.");
requireIn(settingsSource, "data-testid=\"migration-autopilot-operator-packet\"", "SettingsView must test-tag migration operator packet results.");
requireIn(settingsSource, "data-testid=\"migration-autopilot-handoff-checklist\"", "SettingsView must test-tag migration handoff checklist results.");
requireIn(settingsSource, "data-testid=\"pick-browser-migration-source\"", "SettingsView must test-tag browser migration source picker.");
requireIn(settingsSource, "data-testid=\"browser-migration-manifest-result\"", "SettingsView must test-tag browser migration manifest results.");
requireIn(settingsSource, "data-testid=\"migration-source-discovery-result\"", "SettingsView must test-tag migration discovery results.");
requireIn(settingsSource, "data-testid=\"migration-source-workup-result\"", "SettingsView must test-tag migration workup results.");
requireIn(settingsSource, "data-testid=\"migration-source-probe-result\"", "SettingsView must test-tag migration probe results.");
requireIn(settingsSource, "Путь к папке и имена, похожие на данные пациента, скрыты до выбора", "SettingsView must avoid exposing raw local paths in discovery cards.");
requireIn(settingsSource, "imagingImportInputReady", "SettingsView must guard empty imaging import input.");
requireIn(settingsSource, "patientImportInputReady", "SettingsView must guard empty patient import input.");
requireIn(settingsSource, "isImportDictating", "SettingsView must expose patient import dictation busy state.");
requireIn(settingsSource, "newStaffReadyToCreate", "SettingsView must guard empty staff creation.");
requireIn(settingsSource, "newChairReadyToCreate", "SettingsView must guard empty chair creation.");
requireIn(settingsSource, "adminSecretReady", "SettingsView must guard empty admin unlock secret.");
requireIn(settingsSource, "import-empty-guidance", "SettingsView must explain why import actions are blocked.");
requireIn(settingsSource, "quick-create-guidance", "SettingsView must explain why quick creation is blocked.");
requireIn(settingsSource, "admin-unlock-guidance", "SettingsView must explain why admin unlock is blocked.");
requireIn(settingsSource, "disabled={isImportLoading || !patientImportInputReady}", "Patient import preview must be disabled when input is empty.");
requireIn(settingsSource, "disabled={isImportDictating}", "Patient import dictation must be disabled while recognition is active.");
requireIn(settingsSource, "aria-busy={isImportDictating || undefined}", "Patient import dictation must expose busy state.");
requireIn(settingsSource, "disabled={isImagingImportLoading || !imagingImportInputReady}", "Imaging import preview must be disabled when input is empty.");
requireIn(settingsSource, "disabled={isSmartImportLoading || !smartImportInputReady}", "Smart import preview must be disabled when input is empty.");
requireIn(settingsSource, "disabled={isRecognitionLoading || !recognitionInputReady}", "AI recognition must be disabled when input is empty.");
requireIn(settingsSource, "disabled={!dicomViewerWorkbenchManifest}", "DICOM workbench JSON download must be disabled until a manifest exists.");
requireIn(settingsSource, "disabled={!dicomViewerToolStateBundle}", "DICOM tool-state JSON download must be disabled until a tool-state bundle exists.");
requireIn(settingsSource, "disabled={!newStaffReadyToCreate}", "Staff quick-create must be disabled until a name is entered.");
requireIn(settingsSource, "disabled={!newChairReadyToCreate}", "Chair quick-create must be disabled until a name is entered.");
requireIn(settingsSource, "disabled={!adminSecretReady}", "Admin unlock must be disabled until a secret is entered.");
requireIn(settingsSource, "aria-busy={isPersistenceExporting || undefined}", "Persistence export button must expose busy state.");
requireIn(settingsSource, 'aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}', "Settings admin unlock input must point to missing-secret guidance.");
requireIn(settingsSource, "Введите секрет администратора клиники, чтобы менять защищенные настройки и Telegram.", "Settings admin unlock guidance must explain why the secret is needed.");
requireIn(settingsSource, 'aria-label="Добавить сотрудника"', "Staff icon quick-create must have an accessible label.");
requireIn(settingsSource, 'aria-label="Добавить кресло или кабинет"', "Chair icon quick-create must have an accessible label.");
requireIn(appSource, "Введите ФИО сотрудника перед добавлением в команду.", "Staff creation handler must fail visibly if called without a name.");
requireIn(appSource, "Введите название кресла или кабинета перед добавлением.", "Chair creation handler must fail visibly if called without a name.");
requireIn(appSource, "Режим клиники не сохранен:", "Clinic mode change must catch network failures visibly.");
requireIn(appSource, "Сотрудник не добавлен:", "Staff creation must catch network failures visibly.");
requireIn(appSource, "Кресло не добавлено:", "Chair creation must catch network failures visibly.");
requireIn(appSource, "Данные клиники еще не загружены. Повторите создание правила после загрузки настроек.", "Clinical rule creation must fail visibly while dashboard data is missing.");
requireIn(appSource, "Дождитесь завершения текущей записи клинического правила.", "Clinical rule actions must explain duplicate submit attempts.");
requireIn(appSource, "Вставьте текст, OCR или диктовку перед распознаванием.", "AI recognition handler must fail visibly when invoked without input.");
requireIn(appSource, "Вставьте прайс-лист или загрузите фото прайса перед разбором.", "Pricelist analyzer handler must fail visibly when invoked without input.");
requireIn(appSource, "Дождитесь завершения текущей диктовки импорта.", "Patient import dictation must guard duplicate starts.");
requireIn(appSource, "Браузерная диктовка импорта недоступна. Вставьте список пациентов вручную или загрузите OCR.", "Patient import dictation must explain unsupported browsers.");
requireIn(appSource, "Диктовка импорта не распознана. Вставьте список вручную или загрузите OCR.", "Patient import dictation must fail visibly on recognition errors.");
requireIn(appSource, "Браузер не смог запустить микрофон для импорта. Вставьте список пациентов вручную или загрузите файл.", "Patient import dictation must fail visibly when the microphone cannot start.");
requireIn(appSource, "Дождитесь завершения текущего экспорта резервной копии.", "Persistence export must explain duplicate export attempts.");
requireIn(appSource, "Сервер вернул пустой файл резервной копии.", "Persistence export must reject empty backup files.");
requireIn(appSource, "Сначала проверьте импорт пациентов, чтобы увидеть готовые и проблемные строки.", "Patient import commit must require preview before writing.");
requireIn(appSource, "Дождитесь завершения текущей записи импорта пациентов.", "Patient import commit must explain duplicate submit attempts.");
requireIn(appSource, "Сначала разберите умный импорт, чтобы увидеть готовые строки и пропуски.", "Smart import commit must require preview before writing.");
requireIn(appSource, "Дождитесь завершения текущей записи умного импорта.", "Smart import commit must explain duplicate submit attempts.");
requireIn(appSource, "Сначала проверьте импорт снимков, чтобы увидеть готовые и проблемные строки.", "Imaging import commit must require preview before writing.");
requireIn(appSource, "Дождитесь завершения текущей привязки снимков.", "Imaging import commit must explain duplicate submit attempts.");
requireIn(appSource, "Укажите корень DICOMweb перед проверкой архива.", "DICOMweb check handler must fail visibly without endpoint.");
requireIn(appSource, "Сначала проверьте серии DICOM и выберите готовую КТ/CBCT-серию.", "DICOM workbench handlers must fail visibly without a selected series.");
requireIn(appSource, "Перед планом быстрой загрузки DICOM:", "DICOM cache plan handler must explain missing prerequisites.");
requireIn(appSource, "Сначала соберите состояние инструментов DICOM-просмотрщика, затем скачайте JSON.", "DICOM tool-state download handler must fail visibly before export is ready.");
requireIn(appSource, "Сначала соберите рабочий набор CBCT/MPR, затем скачайте JSON.", "DICOM workbench JSON download handler must fail visibly before manifest is ready.");
requireIn(appSource, "disabled={!newStaffReadyToCreate}", "Onboarding staff creation must be disabled until a name is entered.");
requireIn(appSource, "disabled={!newChairReadyToCreate}", "Onboarding chair creation must be disabled until a name is entered.");
requireIn(cssSource, ".import-empty-guidance", "Import empty-state guidance must be styled.");
requireIn(cssSource, ".quick-create-guidance", "Quick-create empty-state guidance must be styled.");
requireIn(cssSource, ".admin-unlock-guidance", "Admin unlock empty-state guidance must be styled.");
forbidIn(settingsSource, "type MprProjection = any", "SettingsView must not weaken MPR projection typing.");
forbidIn(settingsSource, "type MprWindowPreset = any", "SettingsView must not weaken MPR window preset typing.");
forbidIn(settingsSource, "StaffRole[]).map((role: any", "SettingsView must not erase StaffRole while rendering role choices.");

console.log(
  JSON.stringify(
    {
      ok: true,
      settingsViewLazy: true,
      appSettingsSectionsRemoved: true,
      integrationsPreserved: true,
      importEmptyGuards: true,
      patientImportDictationGuarded: true,
      quickCreateGuards: true
    },
    null,
    2
  )
);
