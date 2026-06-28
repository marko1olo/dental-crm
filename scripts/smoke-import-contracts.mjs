import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTAL_MIGRATION_NETWORK_ROOTS;
delete process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS;
delete process.env.DENTAL_MIGRATION_WORKSTATION_APPS;
delete process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS;
delete process.env.DENTAL_DADATA_API_KEY;
delete process.env.DADATA_API_KEY;

const routeFiles = {
  imports: path.resolve("apps/api/dist/routes/imports.js"),
  smartImports: path.resolve("apps/api/dist/routes/smartImports.js")
};
const sharedPath = path.resolve("packages/shared/dist/index.js");
const smartImportsSource = readFileSync("apps/api/src/routes/smartImports.ts", "utf8");
const importsSource = readFileSync("apps/api/src/routes/imports.ts", "utf8");
const documentExtractorSource = readFileSync("apps/api/src/ingestion/documentExtractor.ts", "utf8");
const sharedSource = readFileSync("packages/shared/src/index.ts", "utf8");
const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8"),
  readFileSync("apps/web/src/AppHelpers.tsx", "utf8")
].join("\n");
const settingsSource = readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const systemSource = readFileSync("apps/api/src/routes/system.ts", "utf8");

for (const [label, routePath] of Object.entries(routeFiles)) {
  if (!existsSync(routePath)) throw new Error(`Build API first: npm run build (${label} missing)`);
}
if (!existsSync(sharedPath)) throw new Error("Build shared first: npm run build");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const [{ registerImportRoutes }, { registerSmartImportRoutes }, shared] = await Promise.all([
  import(pathToFileURL(routeFiles.imports).href),
  import(pathToFileURL(routeFiles.smartImports).href),
  import(pathToFileURL(sharedPath).href)
]);

const { importPreviewRequestSchema, importIntakeRequestSchema, smartImportRequestSchema } = shared;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!importPreviewRequestSchema.safeParse({ rawText: "   " }).success, "patient import must reject blank raw text");
assert(
  !importPreviewRequestSchema.safeParse({ rawText: "x".repeat(120001) }).success,
  "patient import must reject oversized raw text"
);
assert(
  !importPreviewRequestSchema.safeParse({ sourceName: "x".repeat(161), rawText: "full name;phone\nIvan;+79001112233" }).success,
  "patient import must reject oversized source names"
);
const patientParsed = importPreviewRequestSchema.parse({
  sourceName: "  front desk csv  ",
  rawText: "  full name;phone\nIvan Petrov;+79001112233  "
});
assert(patientParsed.sourceName === "front desk csv", "patient import must trim source names");
assert(patientParsed.rawText.startsWith("full name;phone"), "patient import must trim raw text edges");

assert(
  !importIntakeRequestSchema.safeParse({ sourceKind: "free_text", rawText: "   " }).success,
  "patient intake import must reject blank raw text"
);
assert(
  !importIntakeRequestSchema.safeParse({ sourceKind: "free_text", rawText: "Ivan Petrov", fileName: "   " }).success,
  "patient intake import must reject blank file names"
);
assert(
  importIntakeRequestSchema.parse({ sourceKind: "free_text", rawText: " Ivan Petrov ", fileName: " import.txt " }).fileName ===
    "import.txt",
  "patient intake import must trim file names"
);

assert(!smartImportRequestSchema.safeParse({ rawText: "   " }).success, "smart import must reject blank raw text");
assert(!smartImportRequestSchema.safeParse({ rawText: "x".repeat(120001) }).success, "smart import must reject oversized raw text");
const smartParsed = smartImportRequestSchema.parse({ sourceName: "  mixed export  ", rawText: " Ivan Petrov +79001112233 " });
assert(smartParsed.sourceName === "mixed export", "smart import must trim source names");
assert(importsSource.includes("parseImportPayload("), "patient import routes must own payload validation copy.");
assert(smartImportsSource.includes("parseSmartImportPayload("), "smart import routes must own payload validation copy.");
for (const rawRouteParse of [
  "importIntakeRequestSchema.parse(request.body)",
  "importPreviewRequestSchema.parse(request.body)",
  "importCommitRequestSchema.parse(request.body)",
  "smartImportRequestSchema.parse(request.body)",
  "migrationLocalSourceDiscoveryRequestSchema.parse(request.body ?? {})",
  "migrationLocalSourceWorkupRequestSchema.parse(request.body)",
  "migrationLocalSourceProbeRequestSchema.parse(request.body)",
  "migrationAutopilotRequestSchema.parse(request.body ?? {})",
  "clinicPublicLookupRequestSchema.parse(request.body)"
]) {
  assert(!importsSource.includes(rawRouteParse), `patient import route must not leak raw zod validation through ${rawRouteParse}`);
  assert(!smartImportsSource.includes(rawRouteParse), `smart import route must not leak raw zod validation through ${rawRouteParse}`);
}

assert(
  appSource.includes("Источник старой системы: ${browserMigrationSourceTitles[sourceKind]}") &&
    appSource.includes("код источника browser-local:${fingerprint}") &&
    appSource.includes("старых баз=${stats.databaseFiles}") &&
    appSource.includes("КТ/снимков=${stats.dicomLikeFiles}"),
  "browser-local smart import handoff line must be readable for clinic admins while keeping the safe source token."
);
assert(
  !appSource.includes("legacy source ${browserMigrationSourceTitles[sourceKind]} browser-local:${fingerprint}"),
  "browser-local smart import handoff line must not expose English parser jargon in the admin textarea."
);
assert(
  appSource.includes("отправьте его в умный разбор как список найденных файлов.") &&
    !appSource.includes("отправьте его в умный парсер как список найденных файлов."),
  "browser-local migration next action must use clinic-readable smart-import wording instead of parser jargon."
);
assert(
  !appSource.includes("КТ/DICOM=${stats.dicomLikeFiles}") && !appSource.includes("БД=${stats.databaseFiles}"),
  "browser-local smart import handoff line must not expose DICOM/DB abbreviations in the admin textarea."
);
assert(
  smartImportsSource.includes("(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source)") &&
    smartImportsSource.includes("старая серверная база программы") &&
    smartImportsSource.includes("старая настольная база") &&
    smartImportsSource.includes("локальная база программы") &&
    smartImportsSource.includes("резервная копия старой базы"),
  "smart import parser must understand readable browser-local source handoff lines."
);

assert(!appSource.includes("legacy-источник"), "browser migration source labels must not expose legacy jargon in Russian UI.");
assert(!appSource.includes("Vendor-система снимков"), "browser migration source labels must not expose vendor jargon in Russian UI.");
assert(!appSource.includes("SQL dump или backup"), "browser migration source labels must not expose dump/backup jargon in Russian UI.");
assert(!appSource.includes('firebird_database: "Firebird/InterBase база"'), "browser migration labels must not expose database engine names.");
assert(!appSource.includes('access_database: "Access MDB/ACCDB база"'), "browser migration labels must not expose Access file extensions.");
assert(!appSource.includes('sqlite_database: "SQLite база"'), "browser migration labels must not expose SQLite as the user-facing source title.");
assert(!appSource.includes('sql_dump: "SQL-выгрузка или резервная копия"'), "browser migration labels must not expose SQL as the user-facing source title.");
assert(!appSource.includes('csv_export: "CSV/TSV выгрузка"'), "browser migration labels must not expose CSV/TSV jargon in the main app.");
assert(!settingsSource.includes('csv_export: "CSV/TSV выгрузка"'), "settings migration labels must not expose CSV/TSV jargon.");
assert(!appSource.includes('title: "CSV / Excel"'), "patient import source title must use table wording instead of CSV-first wording.");
assert(importsSource.includes("Поддержаны табличные выгрузки"), "patient import intake notes must explain table exports without CSV-first wording.");
assert(
  appSource.includes("Неопознанный источник старой системы"),
  "browser migration unknown source label must use clinic-readable Russian copy."
);
assert(appSource.includes("browserLocalSourceErrorMessage"), "browser-local migration/imaging picker failures must share one readable error helper.");
assert(
  appSource.includes("Проверьте, что браузеру разрешено читать выбранный источник, или выберите файлы вручную."),
  "browser-local picker failures must tell admins how to recover without raw DOM/FileSystem errors."
);
assert(
  !appSource.includes("setError(pickerError instanceof Error ? pickerError.message"),
  "browser-local picker failures must not expose raw browser exception messages."
);
assert(appSource.includes("operatorWorkflowFailureMessage"), "migration and imaging workflows must share one operator-readable failure helper.");
assert(appSource.includes("operatorReadableErrorDetail(detail)"), "API response error details must be filtered before reaching operator UI.");
assert(appSource.includes("technicalWorkflowFailurePattern"), "operator workflow failures must filter raw browser/network exception text.");
assert(appSource.includes("[A-Za-z]:\\\\"), "operator workflow failures must filter raw Windows local paths from migration errors.");
assert(
  appSource.includes('operatorWorkflowFailureMessage("Автоплан миграции не построен", autopilotError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Импорт не проверен", importError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Умный импорт не проверен", importError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Отчет переноса по импорту не создан", reportError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Поиск старых источников не выполнен", discoveryError)') &&
    appSource.includes('operatorWorkflowFailureMessage("План переноса источника не построен", workupError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Проверка источника не выполнена", probeError)') &&
    appSource.includes('operatorWorkflowFailureMessage("Публичный поиск клиники не выполнен", lookupError)'),
  "migration workflow failures must keep readable server messages but hide raw fetch/DOM/stack failures."
);
assert(
  !appSource.includes("setError(autopilotError instanceof Error ? autopilotError.message") &&
    !appSource.includes("setError(importError instanceof Error ? importError.message : \"Импорт не проверен") &&
    !appSource.includes("setError(importError instanceof Error ? importError.message : \"Умный импорт не проверен") &&
    !appSource.includes("setError(reportError instanceof Error ? reportError.message : \"Отчет переноса по импорту не создан") &&
    !appSource.includes("setError(discoveryError instanceof Error ? discoveryError.message : \"Поиск старых источников не выполнен") &&
    !appSource.includes("setError(workupError instanceof Error ? workupError.message : \"План переноса источника не построен") &&
    !appSource.includes("setError(probeError instanceof Error ? probeError.message") &&
    !appSource.includes("setError(lookupError instanceof Error ? lookupError.message"),
  "migration workflow failures must not expose raw exception messages in the operator UI."
);
assert(appSource.includes("Программа снимков"), "browser migration imaging source label must use clinic-readable Russian copy.");
assert(
  smartImportsSource.includes('firebird_database: "Старая серверная база программы"') &&
    smartImportsSource.includes('access_database: "Старая настольная база"') &&
    smartImportsSource.includes('sqlite_database: "Локальная база программы"') &&
    smartImportsSource.includes('sql_dump: "Резервная копия старой базы"') &&
    appSource.includes('firebird_database: "Старая серверная база программы"') &&
    appSource.includes('access_database: "Старая настольная база"') &&
    appSource.includes('sqlite_database: "Локальная база программы"') &&
    appSource.includes('sql_dump: "Резервная копия старой базы"'),
  "smart import database source labels must match clinic-readable Russian copy in API and web."
);
assert(smartParsed.rawText === "Ivan Petrov +79001112233", "smart import must trim raw text edges");
assert(!smartImportsSource.includes("mapDadataPartySuggestion(item: any)"), "DaData party suggestions must not be parsed through any.");
assert(!smartImportsSource.includes("response.json()) as any"), "DaData JSON payload must be treated as unknown before field extraction.");
assert(smartImportsSource.includes("const payload = (await response.json()) as unknown"), "DaData JSON payload must stay behind an unknown boundary.");
assert(smartImportsSource.includes("Ключ сервиса реквизитов для серверного поиска не настроен"), "Clinic lookup must explain missing requisites-service key without raw env names.");
assert(smartImportsSource.includes("настроить ключ сервиса реквизитов в серверных настройках"), "Clinic lookup next action must use operator-readable server settings wording.");
assert(!smartImportsSource.includes("DENTAL_DADATA_API_KEY/DADATA_API_KEY не задан"), "Clinic lookup warnings must not expose raw env variable names.");
assert(!smartImportsSource.includes("настроить DENTAL_DADATA_API_KEY"), "Clinic lookup next action must not expose raw env variable names.");
assert(!smartImportsSource.includes("DaData lookup returned HTTP"), "Clinic lookup errors must not expose English internal lookup copy.");
assert(!smartImportsSource.includes("DaData lookup failed"), "Clinic lookup errors must not expose English internal lookup copy.");
assert(!smartImportsSource.includes("Сервис DaData вернул ответ"), "Clinic lookup warnings must not expose provider brand as the main operator concept.");
assert(!smartImportsSource.includes("Поиск DaData не выполнен"), "Clinic lookup errors must use operator-readable requisites wording.");
assert(!smartImportsSource.includes("dadata_findById_or_suggest_when_token_configured"), "Clinic lookup response must not expose a provider-specific raw id.");
assert(!smartImportsSource.includes("Поиск реквизитов не выполнен: ${error.message}"), "Clinic lookup warnings must not expose raw network/provider errors.");
assert(!smartImportsSource.includes("Probe failed for ${candidate.safeDisplayName}: ${error.message}"), "Migration autopilot probe warnings must not expose raw exception messages.");
assert(!smartImportsSource.includes("discovery продолжил"), "migration warnings must not expose discovery implementation jargon.");
assert(!smartImportsSource.includes("папкам/shortcuts"), "migration warnings must not expose shortcuts implementation jargon.");
assert(!smartImportsSource.includes("ручным rootPaths"), "migration warnings must not expose rootPaths implementation jargon.");
assert(!smartImportsSource.includes("maxFolders="), "migration warnings must not expose maxFolders implementation jargon.");
assert(!smartImportsSource.includes("maxFiles="), "migration warnings must not expose maxFiles implementation jargon.");
assert(!smartImportsSource.includes("Probe остановлен"), "migration source probe warnings must be written for clinic operators, not developers.");
assert(!smartImportsSource.includes("указать rootPaths старой МИС"), "migration autopilot next action must not ask admins for rootPaths.");
assert(smartImportsSource.includes("Проверка источника остановлена после"), "migration probe limit warnings must use clinic-readable wording.");
assert(
  smartImportsSource.includes("быстрая проверка не завершилась. Откройте план источника или выберите папку вручную."),
  "Migration autopilot probe failures must give an operator-readable recovery action."
);
assert(smartImportsSource.includes('provider: "server_requisites_lookup_when_configured"'), "Clinic lookup response must use a generic server requisites provider id.");
assert(
  smartImportsSource.includes("Поиск реквизитов временно недоступен; используйте подготовленные публичные ссылки для ручной сверки."),
  "Clinic lookup network failures must stay operator-readable."
);
assert(/Morita\/i-Dixel/.test(smartImportsSource), "migration discovery must know Morita/i-Dixel workstation and CBCT exports.");
assert(/NewTom\/NNT\/MyRay/.test(smartImportsSource), "migration discovery must know NewTom/NNT/MyRay workstation and CBCT exports.");
assert(/DEXIS\/KaVo\/Gendex/.test(smartImportsSource), "migration discovery must know DEXIS/KaVo/Gendex imaging workstations.");
assert(/Acteon\/SOPRO\/SOPIX\/PSPIX\/X-Mind/.test(smartImportsSource), "migration discovery must know Acteon/SOPRO/SOPIX/PSPIX/X-Mind imaging workstations.");
assert(/Open Dental\/Dentrix\/Eaglesoft/.test(smartImportsSource), "migration discovery must know Open Dental/Dentrix/Eaglesoft PMS exports.");
assert(/SoftDent/.test(smartImportsSource), "migration discovery must know SoftDent workstation and export folders.");
assert(/PracticeWorks/.test(smartImportsSource), "migration discovery must know PracticeWorks workstation and export folders.");
assert(/Curve Dental/.test(smartImportsSource), "migration discovery must know Curve Dental workstation and export folders.");
assert(/Denticon/.test(smartImportsSource), "migration discovery must know Denticon workstation and export folders.");
assert(/tab32/.test(smartImportsSource), "migration discovery must know tab32 workstation and export folders.");
assert(/Dolphin Management/.test(smartImportsSource), "migration discovery must know Dolphin Management workstation folders.");
assert(/Dolphin Imaging/.test(smartImportsSource), "migration discovery must know Dolphin Imaging workstation folders.");
assert(/OpenDentImages AtoZ/.test(smartImportsSource), "migration discovery must search OpenDentImages AtoZ roots without making admins browse manually.");
assert(/DBF\/FoxPro\/Clipper/.test(smartImportsSource), "migration discovery must know DBF/FoxPro/Clipper legacy database folders.");
assert(!/dÃ(?:¼|ƒÂ¼)rr/i.test(smartImportsSource), "DBSWIN/VistaSoft matching must not keep mojibake Dürr aliases.");
assert(/Infodent|ИНФОДЕНТ\/Denta Office/i.test(smartImportsSource), "migration discovery must know Infodent/Denta Office legacy MIS folders.");
assert(/Sycret Dent/.test(smartImportsSource), "migration discovery must know Sycret Dent legacy MIS folders.");
assert(/Адента Профессионал/.test(smartImportsSource), "migration discovery must know Адента legacy MIS folders.");
assert(/DentCRM24\/Dent\.CRM24/.test(smartImportsSource), "migration discovery must know DentCRM24 legacy MIS folders.");
assert(/Клиентикс Улыбка/.test(smartImportsSource), "migration discovery must know Клиентикс Улыбка legacy MIS folders.");
assert(/Future IT Dent/.test(smartImportsSource), "migration discovery must know Future IT Dent legacy MIS folders.");
assert(/32top/.test(smartImportsSource), "migration discovery must know 32top legacy MIS folders.");
assert(/MEDODS/.test(smartImportsSource), "migration discovery must know MEDODS legacy MIS folders.");
assert(/DentalTap/.test(smartImportsSource), "migration discovery must know DentalTap legacy MIS folders.");
assert(/iStom/.test(smartImportsSource), "migration discovery must know iStom legacy MIS folders.");
assert(/QStoma/.test(smartImportsSource), "migration discovery must know QStoma legacy MIS folders.");
assert(/БИТ\.Стоматология/.test(smartImportsSource), "migration discovery must know БИТ.Стоматология legacy MIS folders.");
assert(/MacDent/.test(smartImportsSource), "migration discovery must know MacDent legacy MIS folders.");
assert(/Stombox/.test(smartImportsSource), "migration discovery must know Stombox legacy MIS folders.");
assert(smartImportsSource.includes("legacyMisTextPattern"), "smart import must keep a shared legacy dental MIS text detector.");
assert(/legacyMisTextPattern\.test\(text\)/.test(smartImportsSource), "smart import line scoring must use the legacy MIS text detector.");
assert(/legacyMisTextPattern\.test\(normalized\)/.test(smartImportsSource), "local migration folder scoring must reuse the legacy MIS text detector.");
assert(/legacyMisTextPattern\.test\(value\)/.test(smartImportsSource), "smart import evidence must use the legacy MIS text detector.");
assert(
  smartImportsSource.includes("legacySourceSupplementalKeywordPattern.test(text) || legacyMisTextPattern.test(text)"),
  "local migration source kind inference must reuse the same legacy PMS/MIS detectors as text smart import."
);
assert(appSource.includes("browserLegacyMisTextPattern"), "browser folder import must keep a local legacy dental MIS detector.");
assert(/browserLegacyMisTextPattern\.test\(normalized\)/.test(appSource), "browser folder scoring must use the legacy MIS detector.");
assert(/browserLegacyMisTextPattern\.test\(text\)/.test(appSource), "browser folder source kind inference must use the legacy MIS detector.");
assert(
  /browserLegacyMisTextPattern[\s\S]*dental\\s\*soft[\s\S]*clinic\\s\*365[\s\S]*mac\\s\*dent[\s\S]*stom\\s\*box/.test(appSource),
  "browser folder detector must recognize newer dental MIS folder names, not just old 1C/Infodent names."
);
assert(
  /browserLegacyMisTextPattern[\s\S]*open\\s\*dent[\s\S]*atoz[\s\S]*dentrix[\s\S]*softdent[\s\S]*dolphin\\s\*/.test(appSource),
  "browser folder detector must recognize OpenDental/Dentrix/SoftDent style migration folders."
);
assert(/контейнер резервных копий, выгрузок или данных клиники/.test(smartImportsSource), "migration discovery must recognize generic clinic data/export/backup containers in clinic language.");
assert(!smartImportsSource.includes("backup/dump файлов"), "migration discovery reasons must not expose backup/dump jargon.");
assert(smartImportsSource.includes("файлов резервной копии"), "migration discovery reasons must describe backup/dump files in clinic language.");
assert(!smartImportsSource.includes("Артефакт backup/dump"), "migration probe artifact titles must not expose backup/dump jargon.");
assert(smartImportsSource.includes("Резервная копия старой базы"), "migration probe artifact titles must describe dump files in clinic language.");
assert(!smartImportsSource.includes("SQL text dump"), "migration probe format signals must not expose SQL text dump jargon.");
assert(smartImportsSource.includes("SQL текстовая выгрузка"), "migration probe format signals must describe SQL dumps in clinic language.");
assert(!smartImportsSource.includes("Shortcut/папка программы"), "migration readiness must not expose shortcut jargon.");
assert(!smartImportsSource.includes("БД/dump"), "migration operator packet must not expose DB/dump jargon.");
assert(!smartImportsSource.includes("backup/snapshot"), "migration operator packet must not expose backup/snapshot jargon.");
assert(!smartImportsSource.includes("offline-копия"), "migration operator copy must not expose offline-copy jargon.");
assert(!smartImportsSource.includes("offline backup/copy"), "migration operator copy must not expose offline backup/copy jargon.");
assert(!smartImportsSource.includes("Старые БД и выгрузки"), "migration operator lane titles must not expose DB abbreviations.");
assert(smartImportsSource.includes("Старые базы и выгрузки"), "migration operator lane titles must use everyday clinic language.");
assert(!smartImportsSource.includes("Артефакт БД"), "migration probe artifact labels must not expose DB abbreviations.");
assert(smartImportsSource.includes("Файл старой базы"), "migration probe artifact labels must explain database files in clinic language.");
assert(!smartImportsSource.includes("Публичный lookup"), "migration operator copy must not expose lookup jargon.");
assert(!smartImportsSource.includes("public lookup."), "migration operator copy must not expose English lookup jargon.");
assert(smartImportsSource.includes("Публичный поиск реквизитов не запускался"), "migration operator copy must describe public lookup in Russian.");
assert(!smartImportsSource.includes("SQLite header"), "migration format signals must not expose parser header jargon.");
assert(!smartImportsSource.includes("DICOM preamble"), "migration format signals must not expose parser preamble jargon.");
assert(!smartImportsSource.includes("Office OpenXML extension"), "migration format signals must not expose extension jargon.");
assert(!smartImportsSource.includes("ZIP/OpenXML контейнер"), "migration format signals must not expose ZIP/OpenXML jargon.");
assert(smartImportsSource.includes("локальная база программы"), "migration format signals must explain SQLite sources in clinic language.");
assert(!smartImportsSource.includes('signals.push("SQLite база")'), "migration format signals must not expose SQLite as parser-facing copy.");
assert(!smartImportsSource.includes('signals.push("Firebird/InterBase база")'), "migration format signals must not expose Firebird/InterBase as parser-facing copy.");
assert(smartImportsSource.includes("сигнатура файла снимков"), "migration format signals must explain image-file signatures in clinic language.");
assert(smartImportsSource.includes("Office таблица/документ"), "migration format signals must explain Office containers in clinic language.");
assert(smartImportsSource.includes("архив или Office-файл"), "migration format signals must explain ZIP/OpenXML signatures in clinic language.");
assert(/\.dbt.*\.fpt.*\.cdx.*\.idx.*\.ntx.*\.ndx.*\.mdx/s.test(smartImportsSource), "migration discovery must keep DBF memo/index companion files in source detection.");
assert(/\"ib\"[\s\S]*\"dbt\"[\s\S]*\"fpt\"[\s\S]*\"cdx\"[\s\S]*\"idx\"[\s\S]*\"ntx\"[\s\S]*\"ndx\"[\s\S]*\"mdx\"/.test(appSource), "browser migration file classifier must recognize InterBase database and DBF companion files.");
assert(/\"xlsx\"[\s\S]*\"xlsm\"[\s\S]*\"xlsb\"/.test(appSource), "browser migration file classifier must recognize macro-enabled and binary spreadsheet exports.");
assert(/\.xlsm[\s\S]*\.xlsb/.test(smartImportsSource), "server migration discovery must recognize macro-enabled and binary spreadsheet exports.");
assert(settingsSource.includes(".xlsx,.xlsm,.xlsb"), "settings import file picker must allow binary spreadsheet exports, not only XLSX/XLSM.");
assert(smartImportsSource.includes("DBF/FoxPro сопутствующий файл"), "migration probe must explain DBF/FoxPro companion files in clinic language.");
assert(/\"ibk\"[\s\S]*\"gbk\"/.test(appSource), "browser migration file classifier must recognize InterBase backup files.");
assert(/База пациентов/.test(smartImportsSource), "migration discovery must recognize everyday Russian patient-base folder names.");
assert(/КЛКТ/.test(smartImportsSource) && /ОПТГ/.test(smartImportsSource), "migration discovery must recognize everyday Russian CT and panoramic image folder names.");
assert(/\.ib.*\.ibk.*\.gbk/s.test(smartImportsSource), "migration discovery must recognize InterBase database and backup extensions beyond .fdb/.fbk.");
assert(/\.myd.*\.myi.*\.frm.*\.ibd/s.test(smartImportsSource), "migration discovery must recognize MySQL/MariaDB data-file folders used by some legacy dental systems.");
assert(/\"myd\"[\s\S]*\"myi\"[\s\S]*\"frm\"[\s\S]*\"ibd\"/.test(appSource), "browser migration file classifier must recognize MySQL/MariaDB database files.");
assert(sharedSource.includes("migrationAutopilotDryRunSummarySchema"), "migration operator packet contract must include a dry-run effort summary.");
assert(smartImportsSource.includes("buildMigrationDryRunSummary"), "migration autopilot must build the dry-run effort summary server-side.");
assert(smartImportsSource.includes("локальный модуль только для чтения"), "migration copy must describe local read-only module in clinic language.");
assert(smartImportsSource.includes("Проверка КЛКТ/КТ"), "migration probe must label DICOM/CBCT checks in clinic language.");
assert(smartImportsSource.includes("найдена старая программа снимков"), "migration source reasons must describe imaging vendor systems in clinic language.");
assert(smartImportsSource.includes("старая программа снимков указана как папка или выгрузка"), "migration source reasons must avoid vendor-system jargon.");
assert(!smartImportsSource.includes("looks like"), "migration source reasons must not expose English detector copy.");
assert(!/reason:\s*"[^"]*\bimaging\b/i.test(smartImportsSource), "migration source reasons must not expose English imaging jargon.");
assert(!smartImportsSource.includes("RVG/imaging"), "migration source reasons must not mix RVG with English imaging jargon.");
assert(smartImportsSource.includes("похоже на программу КЛКТ NewTom/NNT/MyRay"), "migration source reasons must describe CT imaging vendors in Russian.");
assert(smartImportsSource.includes("похоже на программу снимков Sidexis/Sirona"), "migration source reasons must describe common imaging vendors in Russian.");
assert(smartImportsSource.includes("похоже на файловую базу DBF/FoxPro/Clipper"), "migration source reasons must describe DBF/FoxPro sources in Russian.");
assert(smartImportsSource.includes("DBF/FoxPro нужно переносить всей папкой"), "DBF/FoxPro migration discovery must preserve memo/index files by routing the folder.");
assert(smartImportsSource.includes("профиль старой программы ${guidance.label}"), "migration probe signatures must describe workstation profiles in Russian.");
assert(!smartImportsSource.includes("workstation profile ${guidance.label}"), "migration probe signatures must not expose English workstation profile wording.");
assert(smartImportsSource.includes("нормализованный табличный черновик"), "migration staging output must not expose CSV/JSON implementation jargon.");
assert(!smartImportsSource.includes("CSV-список"), "migration staging output must say tabular list, not CSV-list, in operator copy.");
assert(!smartImportsSource.includes("ручной CSV/список"), "manual migration fallback must not expose CSV slash-copy.");
assert(!smartImportsSource.includes("CSV/XML-список"), "imaging migration playbook must not expose CSV/XML-first source wording.");
assert(!smartImportsSource.includes("CSV/XML списка"), "vendor guidance must not expose CSV/XML-first source wording.");
assert(!smartImportsSource.includes("если программа дает CSV/XML"), "vendor guidance must say table export instead of CSV/XML.");
assert(!smartImportsSource.includes("CSV/XLSX/XML"), "legacy MIS playbook must not expose raw table/export extension soup.");
assert(!smartImportsSource.includes("CSV/XML/SQL выгрузка"), "PMS migration guidance must not expose raw export extension soup.");
assert(!smartImportsSource.includes("CSV/Excel выгрузки"), "1C migration guidance must use table wording instead of CSV/Excel.");
assert(!smartImportsSource.includes("соседний CSV"), "image archive playbook must use table wording for patient-file matching.");
assert(!smartImportsSource.includes("Оригинальный архив ZIP/7z/RAR"), "archive migration playbook must not expose raw archive extension soup.");
assert(!smartImportsSource.includes("CSV/XLSX-copy"), "patient migration fallback must not expose CSV/XLSX-copy jargon.");
assert(!smartImportsSource.includes("Безопасный CSV для передачи"), "safe handoff copy must use report wording instead of CSV-first wording.");
assert(!smartImportsSource.includes("внутренний CSV"), "safe handoff copy must call the clinic-only artifact an internal report.");
assert(!smartImportsSource.includes("В этом CSV"), "migration handoff privacy copy must use report wording instead of CSV-first wording.");
assert(!smartImportsSource.includes("CSV или список из локального модуля"), "local DB handoff hint must use table-list wording.");
assert(!smartImportsSource.includes("CSV-выгрузка из Access"), "Access migration tool copy must use table export wording.");
assert(!smartImportsSource.includes("CSV-отчет диагностики"), "table-like migration route must call diagnostics a report, not CSV-first.");
assert(!appSource.includes("PDF, XLSX, DOCX, ZIP или фото"), "onboarding document route copy must not expose raw extension soup.");
assert(appSource.includes("распознанный документ, таблицу, архив или фото"), "onboarding document route copy must use operator-readable file categories.");
assert(!appSource.includes('spreadsheet_export: "Excel/XLSX выгрузка"'), "browser migration spreadsheet label must not expose XLSX jargon.");
assert(!settingsSource.includes('spreadsheet_export: "Excel/таблица"'), "settings migration spreadsheet label must not keep mixed extension wording.");
assert(!settingsSource.includes("CSV-список пациентов"), "SettingsView migration humanizer must not translate manifests back into CSV-first wording.");
assert(smartImportsSource.includes("табличный список пациентов и исследований"), "imaging migration playbook must ask for a tabular patient/study list.");
assert(smartImportsSource.includes("соседняя таблица связи пациент-файл"), "image archive playbook must ask for a neighboring patient-file matching table.");
assert(smartImportsSource.includes("Табличный отчет для передачи"), "safe handoff copy must describe the handoff as a tabular report.");
assert(smartImportsSource.includes("табличный список из локального модуля базы"), "local DB handoff hint must use table-list wording.");
assert(appSource.includes('spreadsheet_export: "Табличная выгрузка"'), "browser migration spreadsheet label must use operator-readable table wording.");
assert(settingsSource.includes('spreadsheet_export: "Табличная выгрузка"'), "settings migration spreadsheet label must use operator-readable table wording.");
assert(systemSource.includes("табличный предпросмотр"), "local migration helper boundary must describe table preview instead of CSV preview.");
assert(!systemSource.includes("CSV-предпросмотр"), "local migration helper boundary must not expose CSV preview jargon.");
assert(smartImportsSource.includes("табличный список пациентов, визитов, оплат, документов и снимков"), "legacy DB adapter output must be clinic-readable.");
assert(smartImportsSource.includes("тяжелые данные остаются локально до явного выбора исследования"), "migration imaging probe must explain heavy image data stays local.");
assert(smartImportsSource.includes("тяжелых данных снимков и содержимого старых баз"), "migration safe handoff report must avoid raw pixel wording.");
assert(smartImportsSource.includes("Источник миграции из текста"), "migration kit must label text-derived sources in clinic language.");
assert(smartImportsSource.includes("Сетевая папка только для чтения"), "migration kit must label network share sources in clinic language.");
assert(smartImportsSource.includes("Локальный разбор старой базы"), "migration probe must label legacy DB parsing in clinic language.");
assert(smartImportsSource.includes("безопасная сводка миграции"), "migration handoff report must use clinic-readable summary copy.");
assert(smartImportsSource.includes("В публичные сервисы отправляются только реквизиты клиники."), "migration public lookup policy must be clinic-readable.");
assert(smartImportsSource.includes("Уберите эти данные перед поиском в картах, поиске или внешних сервисах."), "migration public lookup blocker must be clinic-readable.");
assert(!smartImportsSource.includes("read-only bridge"), "migration operator copy must not expose read-only bridge jargon.");
assert(!smartImportsSource.includes("DICOM/CBCT workup"), "migration operator copy must not expose DICOM/CBCT workup jargon.");
assert(!smartImportsSource.includes("Legacy DB staging bridge"), "migration operator copy must not expose DB staging bridge jargon.");
assert(!smartImportsSource.includes("Browser-local manifest bridge"), "migration operator copy must not expose browser manifest bridge jargon.");
assert(!smartImportsSource.includes("Text-derived migration source kit"), "migration operator copy must not expose text-derived kit jargon.");
assert(!smartImportsSource.includes("Manual staging manifest"), "migration operator copy must not expose manual manifest jargon.");
assert(!smartImportsSource.includes("Only clinic requisites may go to public services."), "migration report must not expose English public lookup policy copy.");
assert(!smartImportsSource.includes("Run clinic public lookup with INN"), "migration report must not expose English public lookup next action.");
assert(!smartImportsSource.includes("Remove forbidden data before any maps/search/API lookup."), "migration report must not expose English public lookup blocker copy.");
assert(!smartImportsSource.includes("Role script is written for admin/assistant/doctor execution"), "migration report must not expose English role-script copy.");
assert(!smartImportsSource.includes("vendor-система"), "migration operator copy must not expose vendor-system jargon.");
assert(!smartImportsSource.includes("SQL-бэкапа"), "migration operator copy must not expose backup jargon.");
assert(!smartImportsSource.includes("нормализованные CSV/JSON строки"), "migration staging output must not expose CSV/JSON implementation jargon.");
assert(!smartImportsSource.includes("Пиксели не копируются"), "migration imaging safety must not expose raw pixel wording.");
assert(!smartImportsSource.includes("пиксели остаются локально"), "migration imaging next action must not expose raw pixel wording.");
assert(!smartImportsSource.includes("пиксели не копировать"), "migration imaging route must not expose raw pixel wording.");
assert(!smartImportsSource.includes("CSV/TSV/JSON/XML/XLSX/ODS/ZIP/OpenXML"), "migration document adapter input must not expose raw extension soup.");
assert(documentExtractorSource.includes("локальным модулем только для чтения"), "document extractor migration next action must use clinic-readable read-only module wording.");
assert(!documentExtractorSource.includes("read-only bridge"), "document extractor migration next action must not expose bridge jargon.");
assert(!documentExtractorSource.includes("smart import preview"), "document extractor migration next action must not expose smart import preview jargon.");
assert(!documentExtractorSource.includes("media paths"), "document extractor migration next action must not expose media paths jargon.");
assert(!documentExtractorSource.includes("Legacy migration source"), "document extractor legacy manifest must not expose English migration source jargon.");
assert(!documentExtractorSource.includes("staging parser"), "document extractor legacy manifest must not expose staging parser jargon.");
assert(!documentExtractorSource.includes("Use a local read-only"), "document extractor parser notes must not expose English local parser jargon.");

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
});
await registerImportRoutes(app);
await registerSmartImportRoutes(app);

const headers = { "x-dente-admin-secret": "synthetic-clinical-secret" };

function assertRouteValidationResponse(response, label, expectedMessage) {
  assert(response.statusCode === 400, `${label} must fail with 400, got ${response.statusCode}`);
  const body = response.json();
  assert(body?.message === expectedMessage, `${label} must return operator-readable validation copy`);
  assert(!("issues" in body), `${label} must not expose raw zod issues`);
  assert(!("path" in body), `${label} must not expose raw validation path`);
  assert(!("code" in body), `${label} must not expose raw validation code`);
  assert(
    !/ZodError|too_small|invalid_type|rawText|sourceName|rootPaths|maxFolders|maxFiles|sourceRef|clinicName|safeParse|request\.body/i.test(response.body),
    `${label} must not expose schema fields or parser tokens`
  );
}

const blankPatientPreview = await app.inject({
  method: "POST",
  url: "/api/imports/patients/preview",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankPatientPreview,
  "blank patient preview",
  "Предпросмотр импорта пациентов не построен: передайте непустой текст или табличную выгрузку до 120000 символов."
);

const blankPatientIntake = await app.inject({
  method: "POST",
  url: "/api/imports/patients/intake",
  headers,
  payload: { sourceKind: "free_text", rawText: "   " }
});
assertRouteValidationResponse(
  blankPatientIntake,
  "blank patient intake",
  "Импорт пациентов не проверен: передайте текст, таблицу или распознанную диктовку с названием источника."
);

const blankPatientCommit = await app.inject({
  method: "POST",
  url: "/api/imports/patients/commit",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankPatientCommit,
  "blank patient commit",
  "Импорт пациентов не выполнен: повторно передайте ту же непустую выгрузку перед записью."
);

const patientPreview = await app.inject({
  method: "POST",
  url: "/api/imports/patients/preview",
  headers,
  payload: {
    sourceName: "  front desk csv  ",
    rawText: "  full name;phone\nIvan Petrov;+79001112233  "
  }
});
assert(patientPreview.statusCode === 200, `valid patient preview failed: ${patientPreview.statusCode}`);
assert(patientPreview.json().sourceName === "front desk csv", "patient preview API must use trimmed source name");

const blankSmartPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankSmartPreview,
  "blank smart preview",
  "Умный импорт не проверен: передайте непустой текст, таблицу или описание источника до 120000 символов."
);

const blankSmartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankSmartReport,
  "blank smart report",
  "Отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника."
);

const blankSafeSmartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.safe.csv",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankSafeSmartReport,
  "blank safe smart report",
  "Безопасный отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника."
);

const blankSmartCommit = await app.inject({
  method: "POST",
  url: "/api/imports/smart/commit",
  headers,
  payload: { rawText: "   " }
});
assertRouteValidationResponse(
  blankSmartCommit,
  "blank smart commit",
  "Умный импорт не записан: повторно передайте ту же непустую выгрузку перед записью."
);

const invalidLocalDiscovery = await app.inject({
  method: "POST",
  url: "/api/imports/smart/local-source-discovery",
  headers,
  payload: { maxFolders: 0 }
});
assertRouteValidationResponse(
  invalidLocalDiscovery,
  "invalid local source discovery",
  "Поиск старых источников не запущен: проверьте корни поиска и лимиты обхода."
);

const blankLocalWorkup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/local-source-workup",
  headers,
  payload: {}
});
assertRouteValidationResponse(
  blankLocalWorkup,
  "blank local source workup",
  "План источника не построен: выберите источник из последнего поиска или безопасный код browser-local."
);

const blankLocalProbe = await app.inject({
  method: "POST",
  url: "/api/imports/smart/local-source-probe",
  headers,
  payload: {}
});
assertRouteValidationResponse(
  blankLocalProbe,
  "blank local source probe",
  "Проверка источника не выполнена: выберите источник из последнего поиска или безопасный код browser-local."
);

const invalidAutopilot = await app.inject({
  method: "POST",
  url: "/api/imports/smart/migration-autopilot",
  headers,
  payload: { maxFolders: 0 }
});
assertRouteValidationResponse(
  invalidAutopilot,
  "invalid migration autopilot",
  "Автоплан миграции не построен: проверьте входные данные источников, клиники и лимиты поиска."
);

const invalidAutopilotReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/migration-autopilot/report.csv",
  headers,
  payload: { maxFolders: 0 }
});
assertRouteValidationResponse(
  invalidAutopilotReport,
  "invalid migration autopilot report",
  "Отчет миграции не создан: проверьте входные данные источников, клиники и лимиты поиска."
);

const blankClinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {}
});
assertRouteValidationResponse(
  blankClinicPublicLookup,
  "blank clinic public lookup",
  "Поиск реквизитов не выполнен: передайте ИНН, ОГРН, КПП, название, адрес или лицензию клиники."
);

const smartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: {
    sourceName: '  bad "name"\r\n.csv  ',
    rawText: "Ivan Petrov +79001112233\nC:\\cases\\ivan\\36.dcm cbct 36"
  }
});
assert(smartReport.statusCode === 200, `smart report failed: ${smartReport.statusCode}`);
const disposition = smartReport.headers["content-disposition"];
assert(typeof disposition === "string", "smart report must return Content-Disposition");
assert(!/[\r\n]/.test(disposition), "smart report Content-Disposition must not contain line breaks");
assert(!disposition.includes('bad "name"'), "smart report Content-Disposition must not contain raw source names");
assert(disposition.includes("bad_name_report.csv"), `smart report filename must be sanitized without duplicating source extension, got ${disposition}`);

const pathLikeSmartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: {
    sourceName: "../CON.csv",
    rawText: "Ivan Petrov +79001112233"
  }
});
assert(pathLikeSmartReport.statusCode === 200, `path-like smart report failed: ${pathLikeSmartReport.statusCode}`);
const pathLikeDisposition = String(pathLikeSmartReport.headers["content-disposition"] ?? "");
assert(pathLikeDisposition === 'attachment; filename="smart_import_report.csv"', `smart report reserved/path-like filename must fall back to a static safe name, got ${pathLikeDisposition}`);

const safeSmartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.safe.csv",
  headers,
  payload: {
    sourceName: '  bad "name"\r\n.csv  ',
    rawText: [
      "Ivan Petrov +79001112233 01.02.1980 migration",
      "C:\\cases\\ivan\\36.dcm cbct 36",
      "Старая база C:\\Legacy\\clinic_2024.fdb",
      "Dental clinic Smile Center INN 1234567890 Address: Samara, Lenina 1"
    ].join("\n")
  }
});
assert(safeSmartReport.statusCode === 200, `safe smart handoff report failed: ${safeSmartReport.statusCode}`);
assert(
  safeSmartReport.headers["content-disposition"] === 'attachment; filename="smart_import_safe_handoff.csv"',
  "safe smart handoff report filename must be static"
);
assert(safeSmartReport.body.startsWith("\uFEFFsection;"), "safe smart handoff report must be a BOM-prefixed CSV");
assert(safeSmartReport.body.includes("patient_row"), "safe smart handoff report must include patient row status without identity");
assert(safeSmartReport.body.includes("imaging_row"), "safe smart handoff report must include imaging row status without file paths");
assert(safeSmartReport.body.includes("legacy_source"), "safe smart handoff report must include legacy source aliases");
assert(
  !/Ivan|Petrov|\+79001112233|79001112233|01\.02\.1980|C:\\|cases|36\.dcm|clinic_2024\.fdb/i.test(safeSmartReport.body),
  "safe smart handoff report must not leak patient identity, birth dates, local paths, file names, or raw DB names"
);

const migrationPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: {
    sourceName: "migration cockpit",
    mode: "auto",
    rawText: [
      "Старая МИС: Firebird резервная копия C:\\Legacy\\clinic_2024.fdb",
      "PACS Orthanc DICOMweb http://127.0.0.1:8042/dicom-web",
      "DICOMDIR folder \\\\NAS\\CBCT\\Archive\\DICOMDIR",
      "Sidexis export folder C:\\XRay\\Sidexis\\2024",
      "Old RVG image archive \\\\NAS\\XRay\\RVG",
      "DentalSoft workstation export",
      "Clinic365 Dental Cloud workstation",
      "MedAngel Medialog Arnica registry",
      "iStom QStoma MacDent Stombox desktop",
      "Dental clinic Smile Center",
      "INN 1234567890 KPP 123456789 OGRN 1234567890123",
      "Address: Samara, Lenina 1",
      "Phone +7 927 222-33-44 email info@smile.example website smile.example",
      "License L-63-01-123456 issued 12.05.2020",
      "Ivan Petrov +7 900 111-22-33 01.02.1980 legacy MIS",
      "Ivan Petrov +7 900 111-22-33 CBCT 36 12.05.2026 C:\\CBCT\\ivan\\IMG0001.dcm"
    ].join("\n")
  }
});
assert(migrationPreview.statusCode === 200, `smart migration preview failed: ${migrationPreview.statusCode}`);
const migration = migrationPreview.json();
assert(migration.lineClassifications.some((line) => line.kind === "clinic"), "smart import must classify clinic profile lines");
assert(migration.lineClassifications.some((line) => line.kind === "legacy_source"), "smart import must classify legacy source lines");
assert(migration.clinicRawText.includes("INN 1234567890"), "smart import must keep clinic raw text separate");
assert(migration.legacySourceRawText.includes("clinic_2024.fdb"), "smart import must keep legacy source raw text separate");
assert(migration.legacySourceRawText.includes("DICOMDIR"), "smart import must keep DICOM folder source in legacy raw text");
assert(migration.legacySourceRawText.includes("Sidexis"), "smart import must keep vendor imaging source in legacy raw text");
assert(migration.legacySourceRawText.includes("Old RVG image archive"), "smart import must keep x-ray archive source in legacy raw text");
assert(migration.legacySourceRawText.includes("DentalSoft workstation export"), "smart import must keep DentalSoft source hints in legacy raw text");
assert(migration.legacySourceRawText.includes("Clinic365 Dental Cloud workstation"), "smart import must keep Clinic365/Dental Cloud source hints in legacy raw text");
assert(migration.legacySourceRawText.includes("MedAngel Medialog Arnica registry"), "smart import must keep MedAngel/Medialog/Arnica source hints in legacy raw text");
assert(migration.legacySourceRawText.includes("iStom QStoma MacDent Stombox desktop"), "smart import must keep iStom/QStoma/MacDent/Stombox source hints in legacy raw text");
assert(migration.clinicSuggestion?.fields?.clinicName === "Dental clinic Smile Center", "smart import must suggest clinic name");
assert(migration.clinicSuggestion?.fields?.inn === "1234567890", "smart import must extract clinic INN");
assert(migration.clinicSuggestion?.fields?.kpp === "123456789", "smart import must extract clinic KPP");
assert(migration.clinicSuggestion?.fields?.phone === "+79272223344", "smart import must extract clinic phone");
assert(migration.clinicSuggestion?.fields?.email === "info@smile.example", "smart import must extract clinic email");
assert(migration.clinicSuggestion?.fields?.website === "https://smile.example", "smart import must normalize clinic website");
assert(migration.publicLookupTargets.some((target) => target.kind === "maps"), "smart import must prepare safe maps lookup");
assert(
  migration.publicLookupTargets.some((target) => target.kind === "maps" && /2ГИС/.test(target.title)),
  "smart import must prepare 2GIS public lookup"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "maps" && /Яндекс\.Карты/.test(target.title)),
  "smart import must prepare Yandex Maps public lookup"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "company_registry" && /egrul\.nalog\.ru/.test(target.url)),
  "smart import must prepare official company registry lookup by INN"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "medical_license_registry" && /roszdravnadzor\.gov\.ru/.test(target.url)),
  "smart import must prepare medical license registry lookup"
);
assert(
  migration.publicLookupTargets.every((target) => target.query === "1234567890" || !/Ivan|Petrov|\+7 900|79001112233|IMG0001|CBCT/i.test(`${target.query} ${target.url}`)),
  "migration public lookup targets must not echo patient data"
);
assert(migration.migrationPlan.coverage.clinicProfile, "migration plan must mark clinic profile coverage");
assert(migration.migrationPlan.coverage.publicLookup, "migration plan must mark public lookup coverage");
assert(migration.migrationPlan.coverage.patients, "migration plan must mark patient coverage");
assert(migration.migrationPlan.coverage.imaging, "migration plan must mark imaging coverage");
assert(migration.migrationPlan.coverage.legacySources, "migration plan must mark legacy source coverage");

const legalClinicPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: {
    sourceName: "legal clinic requisites",
    mode: "auto",
    rawText: [
      "ООО Смайл Дент ИНН 6312345678 КПП 631201001 ОГРН 1236300000000",
      "Юр. адрес: Самара, ул. Победы, 10 телефон +7 846 222-33-44 email office@smile.example",
      "Лицензия № Л041-01137-63/00345678 выдана 12.05.2024 Министерство здравоохранения Самарской области",
      "Пациент Иван Петров +7 900 111-22-33 01.02.1980"
    ].join("\n")
  }
});
assert(legalClinicPreview.statusCode === 200, `legal clinic requisites preview failed: ${legalClinicPreview.statusCode}`);
const legalClinic = legalClinicPreview.json();
assert(legalClinic.clinicSuggestion?.fields?.legalName === "ООО Смайл Дент", "legal clinic line must cut INN/KPP/OGRN tail from legal name");
assert(legalClinic.clinicSuggestion?.fields?.inn === "6312345678", "legal clinic line must extract INN");
assert(legalClinic.clinicSuggestion?.fields?.kpp === "631201001", "legal clinic line must extract KPP");
assert(legalClinic.clinicSuggestion?.fields?.ogrn === "1236300000000", "legal clinic line must extract OGRN");
assert(legalClinic.clinicSuggestion?.fields?.address === "Самара, ул. Победы, 10", "legal clinic line must extract address without phone/email tail");
assert(legalClinic.clinicSuggestion?.fields?.phone === "+78462223344", "legal clinic line must extract clinic phone");
assert(legalClinic.clinicSuggestion?.fields?.email === "office@smile.example", "legal clinic line must extract clinic email");
assert(legalClinic.clinicSuggestion?.fields?.medicalLicenseNumber === "Л041-01137-63/00345678", "legal clinic line must extract medical license number");
assert(legalClinic.clinicSuggestion?.fields?.medicalLicenseIssuedAt === "12.05.2024", "legal clinic line must extract medical license issue date");
assert(
  legalClinic.clinicSuggestion?.fields?.medicalLicenseIssuer === "Министерство здравоохранения Самарской области",
  "legal clinic line must extract medical license issuer without the issue date"
);
assert(
  legalClinic.publicLookupTargets.every((target) => !/Иван|Петров|\+7 900|79001112233/.test(`${target.query} ${target.url}`)),
  "legal clinic public lookup targets must not echo patient identity"
);
assert(
  migration.legacySources.some((source) => source.kind === "firebird_database" && source.automationLevel === "needs_local_bridge"),
  "smart import must suggest read-only local bridge for Firebird backups"
);
assert(
  migration.legacySources.some(
    (source) => source.kind === "mis_database" && source.evidence.some((item) => /старая МИС|старая стоматологическая программа/.test(item))
  ),
  "smart import must turn text-only legacy dental MIS names into old database migration sources"
);
assert(
  migration.legacySources.some((source) => source.kind === "pacs_dicom" && source.requiredArtifacts.some((item) => /папка исследования|архив снимков/i.test(item))),
  "smart import must suggest imaging archive artifacts"
);
assert(
  migration.legacySources.some((source) => source.kind === "dicom_folder" && /список серии/i.test(source.recommendedRoute)),
  "smart import must suggest series-list-first DICOM folder workup"
);
assert(
  migration.legacySources.some((source) => source.kind === "vendor_imaging_system" && /штатн.*выгрузк.*снимк/i.test(source.recommendedRoute)),
  "smart import must suggest vendor imaging export route"
);
assert(
  migration.legacySources.some((source) => source.kind === "xray_image_archive" && /список снимков|список/i.test(source.recommendedRoute)),
  "smart import must suggest x-ray image archive list route"
);
assert(
  migration.legacySources.every((source) => !source.sourceRef || (source.safeSourceAlias && !/C:\\|\\\\NAS|clinic_2024|IMG0001|Ivan|Petrov/i.test(source.safeSourceAlias))),
  "smart import legacy sources must expose a safe alias for UI/report handoff instead of raw paths or patient-like names"
);
assert(
  migration.lineClassifications.some((line) => line.kind === "imaging" && /IMG0001\.dcm/.test(line.text)),
  "smart import must keep a concrete patient DICOM file as imaging row"
);
assert(
  migration.migrationPlan.privacyWarnings.every((warning) => !/Ivan|Petrov|\+7 900/.test(warning)),
  "migration public lookup warnings must not echo patient data"
);

const tempMigrationRoot = mkdtempSync(path.join(tmpdir(), "dental-crm-migration-smoke-"));
try {
  const emptyMigrationRoot = path.join(tempMigrationRoot, "empty-operator-script-root");
  mkdirSync(emptyMigrationRoot, { recursive: true });
  const emptyMigrationAutopilotResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot",
    headers,
    payload: {
      rootPaths: [emptyMigrationRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 8,
      maxCandidates: 4,
      maxProbeCandidates: 1,
      includeWorkstationSignals: false
    }
  });
  assert(emptyMigrationAutopilotResponse.statusCode === 200, `empty migration autopilot failed: ${emptyMigrationAutopilotResponse.statusCode}`);
  const emptyMigrationAutopilot = emptyMigrationAutopilotResponse.json();
  assert(
    emptyMigrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "discover_sources") &&
      emptyMigrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "pick_source") &&
      !emptyMigrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "build_preview"),
    "empty migration operator script must offer PC discovery and folder picking without a dead preview action"
  );

  const firebirdFolder = path.join(tempMigrationRoot, "LegacyDental");
  const dicomFolder = path.join(tempMigrationRoot, "Ivan Petrov Sidexis export");
  const rvgFolder = path.join(tempMigrationRoot, "RVG_ARCHIVE_Petrov");
  const oneCFolder = path.join(tempMigrationRoot, "1C Dentistry Base");
  const carestreamFolder = path.join(tempMigrationRoot, "Carestream export");
  const sqliteFolder = path.join(tempMigrationRoot, "DentalPro sqlite backup");
  const dbfFolder = path.join(tempMigrationRoot, "Old FoxPro DBF clinic archive");
  mkdirSync(firebirdFolder, { recursive: true });
  mkdirSync(dicomFolder, { recursive: true });
  mkdirSync(rvgFolder, { recursive: true });
  mkdirSync(oneCFolder, { recursive: true });
  mkdirSync(carestreamFolder, { recursive: true });
  mkdirSync(sqliteFolder, { recursive: true });
  mkdirSync(dbfFolder, { recursive: true });
  writeFileSync(path.join(firebirdFolder, "clinic.fdb"), "synthetic-firebird-placeholder");
  writeFileSync(path.join(dicomFolder, "DICOMDIR"), "synthetic-dicomdir-placeholder");
  writeFileSync(path.join(rvgFolder, "pano001.png"), "synthetic-png-placeholder");
  writeFileSync(path.join(oneCFolder, "clinic.1cd"), "synthetic-1c-placeholder");
  writeFileSync(path.join(carestreamFolder, "study.dc3"), "synthetic-carestream-dicom-placeholder");
  writeFileSync(path.join(sqliteFolder, "clinic.sqlite"), Buffer.concat([Buffer.from("SQLite format 3\0", "latin1"), Buffer.alloc(64)]));
  writeFileSync(path.join(dbfFolder, "PATIENTS.DBF"), "synthetic-dbf-placeholder");
  writeFileSync(path.join(dbfFolder, "PATIENTS.FPT"), "synthetic-foxpro-memo-placeholder");
  writeFileSync(path.join(dbfFolder, "PATIENTS.NTX"), "synthetic-clipper-index-placeholder");
  writeFileSync(path.join(dbfFolder, "PATIENTS.MDX"), "synthetic-dbf-index-placeholder");

  const localSourceDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [tempMigrationRoot],
      maxDepth: 4,
      maxFolders: 80,
      maxFilesPerFolder: 40,
      maxCandidates: 12,
      includeWorkstationSignals: false
    }
  });
  assert(localSourceDiscovery.statusCode === 200, `local source discovery failed: ${localSourceDiscovery.statusCode}`);
  const discovery = localSourceDiscovery.json();
  const discoveryKinds = new Set(discovery.candidates.map((candidate) => candidate.sourceKind));
  assert(discovery.scannedFolders >= 3, "local source discovery must scan the synthetic folders");
  assert(discovery.roots.some((root) => /^local-root:[A-F0-9]{10}$/i.test(root)), "local source discovery must return safe root aliases");
  assert(
    discovery.roots.every((root) => !root.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental/i.test(root)),
    "local source discovery roots must not expose raw local paths or patient-like folder names"
  );
  assert(discovery.candidates.length >= 4, "local source discovery must find DB, CT/images, RVG, and legacy MIS candidates");
  assert(discoveryKinds.has("firebird_database"), "local source discovery must detect Firebird/InterBase DBs");
  assert(discoveryKinds.has("sqlite_database"), "local source discovery must detect SQLite DBs");
  assert(discoveryKinds.has("mis_database"), "local source discovery must detect 1C/legacy MIS databases");
  const dbfCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "mis_database" && candidate.safeDisplayName.includes("DBF/FoxPro/Clipper"));
  assert(dbfCandidate, "local source discovery must label DBF/FoxPro/Clipper folders as legacy MIS databases");
  assert(
    dbfCandidate.sourceLabel.includes("Папка") && dbfCandidate.reasons.some((reason) => reason.includes("DBF/FoxPro нужно переносить всей папкой")),
    "DBF/FoxPro/Clipper discovery must route the whole folder, not a single DBF table"
  );
  assert(dbfCandidate.databaseFiles >= 4, "DBF/FoxPro/Clipper discovery must count DBF memo and index companion files");
  assert(
    discoveryKinds.has("dicom_folder") || discoveryKinds.has("vendor_imaging_system"),
    "local source discovery must detect DICOMDIR/vendor imaging folders"
  );
  assert(discoveryKinds.has("vendor_imaging_system"), "local source discovery must detect known imaging vendor folders");
  assert(discoveryKinds.has("xray_image_archive"), "local source discovery must detect RVG/OPG/photo archives");
  assert(
    discovery.candidates.every((candidate) => candidate.smartImportLine && candidate.sourceFingerprint && candidate.safeDisplayName),
    "local source discovery candidates must be actionable"
  );
  assert(
    discovery.candidates.every((candidate) => !candidate.safeDisplayName.includes(tempMigrationRoot) && !/Ivan|Petrov/i.test(candidate.safeDisplayName)),
    "local source discovery safe display names must not expose raw paths or patient-like folder names"
  );
  assert(
    discovery.candidates
      .filter((candidate) => !candidate.sourceRef.startsWith("workstation-"))
      .every((candidate) => /^migration-source:[A-F0-9]{10}$/i.test(candidate.sourceRef)),
    "local source discovery candidates must return safe route tokens instead of raw sourceRef paths"
  );
  assert(
    discovery.candidates.every(
      (candidate) => !candidate.sourceRef.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental|clinic_2024|36\.dcm/i.test(candidate.sourceRef)
    ),
    "local source discovery sourceRef must not expose raw local paths, patient-like folders, DB names, or file names"
  );
  assert(
    discovery.candidates.every(
      (candidate) => !candidate.smartImportLine.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental|clinic_2024|36\.dcm/i.test(candidate.smartImportLine)
    ),
    "local source discovery smart parser lines must use safe route tokens"
  );

  const noisyLimitedRoot = path.join(tempMigrationRoot, "Noisy DentalSoft Export");
  mkdirSync(noisyLimitedRoot, { recursive: true });
  for (let index = 0; index < 60; index += 1) {
    writeFileSync(path.join(noisyLimitedRoot, `${String(index).padStart(3, "0")}_plain_note.txt`), "noise");
  }
  writeFileSync(path.join(noisyLimitedRoot, "zzzz_legacy_clinic.fdb"), "synthetic-firebird-at-end-placeholder");
  const noisyLimitedDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [noisyLimitedRoot],
      maxDepth: 0,
      maxFolders: 3,
      maxFilesPerFolder: 5,
      maxCandidates: 3,
      includeWorkstationSignals: false
    }
  });
  assert(noisyLimitedDiscovery.statusCode === 200, `noisy limited folder discovery failed: ${noisyLimitedDiscovery.statusCode}`);
  const noisyLimitedCandidate = noisyLimitedDiscovery.json().candidates.find((candidate) => candidate.databaseFiles > 0);
  assert(
    noisyLimitedCandidate,
    "local source discovery must prioritize likely DB/DICOM/export artifacts before generic files under maxFilesPerFolder"
  );
  const noisyLimitedProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: noisyLimitedRoot,
      sourceKind: "firebird_database",
      safeDisplayName: "Noisy DentalSoft Export #SMOKE",
      maxDepth: 0,
      maxFolders: 1,
      maxFiles: 5,
      maxSampleArtifacts: 3,
      readHeaderBytes: 128
    }
  });
  assert(noisyLimitedProbe.statusCode === 200, `noisy limited folder probe failed: ${noisyLimitedProbe.statusCode}`);
  const noisyLimitedProbeBody = noisyLimitedProbe.json();
  assert(
    noisyLimitedProbeBody.counts.databases > 0 && noisyLimitedProbeBody.artifactSamples.some((artifact) => artifact.kind === "database"),
    "local source probe must prioritize likely DB/DICOM/export artifacts before generic files under maxFiles"
  );

  const networkRoot = path.join(tempMigrationRoot, "mapped-network-share");
  const networkLegacyRoot = path.join(networkRoot, "DentalBackup");
  mkdirSync(networkLegacyRoot, { recursive: true });
  writeFileSync(path.join(networkLegacyRoot, "clinic_network.fdb"), "synthetic-firebird-over-network-placeholder");
  process.env.DENTAL_MIGRATION_NETWORK_ROOTS = networkRoot;
  const networkRootDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      maxDepth: 2,
      maxFolders: 30,
      maxFilesPerFolder: 20,
      maxCandidates: 8,
      includeWorkstationSignals: false
    }
  });
  process.env.DENTAL_MIGRATION_NETWORK_ROOTS = "";
  assert(networkRootDiscovery.statusCode === 200, `network root discovery failed: ${networkRootDiscovery.statusCode}`);
  const networkDiscovery = networkRootDiscovery.json();
  const networkCandidate = networkDiscovery.candidates.find((candidate) => candidate.sourceKind === "firebird_database");
  assert(networkCandidate, "local source discovery must include configured network/share roots without asking admins to browse manually");
  assert(
    networkDiscovery.roots.every((root) => !root.includes(networkRoot) && !/DentalBackup|clinic_network/i.test(root)),
    "network root discovery must return safe root aliases instead of raw share paths"
  );
  assert(
    /^migration-source:[A-F0-9]{10}$/i.test(networkCandidate.sourceRef),
    "network root discovery candidates must use route tokens for source handoff"
  );
  assert(
    !`${networkCandidate.safeDisplayName} ${networkCandidate.smartImportLine}`.includes(networkRoot) &&
      !/DentalBackup|clinic_network/i.test(`${networkCandidate.safeDisplayName} ${networkCandidate.smartImportLine}`),
    "network root discovery must not leak share folders or DB file names in UI handoff"
  );

  const configuredAutosearchRoot = path.join(tempMigrationRoot, "configured-auto-search-root");
  const configuredPracticeWorksRoot = path.join(configuredAutosearchRoot, "PracticeWorks", "Data");
  mkdirSync(configuredPracticeWorksRoot, { recursive: true });
  writeFileSync(path.join(configuredPracticeWorksRoot, "clinic.MYD"), "synthetic-mysql-myisam-placeholder");
  const previousDiscoveryRoots = process.env.DENTAL_MIGRATION_DISCOVERY_ROOTS ?? "";
  process.env.DENTAL_MIGRATION_DISCOVERY_ROOTS = configuredAutosearchRoot;
  const configuredAutosearchDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      maxDepth: 3,
      maxFolders: 30,
      maxFilesPerFolder: 20,
      maxCandidates: 8,
      includeWorkstationSignals: false
    }
  });
  process.env.DENTAL_MIGRATION_DISCOVERY_ROOTS = previousDiscoveryRoots;
  assert(configuredAutosearchDiscovery.statusCode === 200, `configured auto-search discovery failed: ${configuredAutosearchDiscovery.statusCode}`);
  const configuredAutosearch = configuredAutosearchDiscovery.json();
  const configuredPracticeWorks = configuredAutosearch.candidates.find(
    (candidate) => candidate.sourceKind === "mis_database" && /PracticeWorks/i.test(candidate.safeDisplayName)
  );
  assert(configuredPracticeWorks, "local source discovery must find configured PracticeWorks/MySQL roots without manual rootPaths");
  assert(configuredPracticeWorks.databaseFiles > 0, "configured PracticeWorks/MySQL roots must count MySQL database files");
  assert(
    /^migration-source:[A-F0-9]{10}$/i.test(configuredPracticeWorks.sourceRef) &&
      !/PracticeWorks|clinic\.MYD|configured-auto-search-root/i.test(`${configuredPracticeWorks.sourceRef} ${configuredPracticeWorks.smartImportLine}`),
    "configured PracticeWorks/MySQL discovery must hand off tokenized source refs, not raw workstation paths"
  );

  const noisyRoot = path.join(tempMigrationRoot, "noisy-workstation-root");
  mkdirSync(noisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(noisyRoot, `ordinary-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(noisyRoot, "zz Sidexis Workstation"), { recursive: true });
  const workstationProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [noisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(workstationProfileDiscovery.statusCode === 200, `workstation profile discovery failed: ${workstationProfileDiscovery.statusCode}`);
  const workstationProfiles = workstationProfileDiscovery.json();
  const sidexisProfile = workstationProfiles.candidates.find((candidate) => candidate.sourceKind === "vendor_imaging_system");
  assert(sidexisProfile, "local source discovery must prioritize known workstation profile folders before exhausting maxFolders");
  assert(sidexisProfile.matchedFiles === 0, "profile-only workstation candidates must be allowed without fake file counts");
  assert(sidexisProfile.sourceLabel === "Папка профиля старой системы", "profile-only workstation candidates must label the source boundary");
  assert(
    sidexisProfile.reasons.some((reason) => /Sidexis|profile|похоже/i.test(reason)),
    "profile-only workstation candidates must explain the matched legacy system profile"
  );
  const moritaNoisyRoot = path.join(tempMigrationRoot, "noisy-morita-workstation-root");
  mkdirSync(moritaNoisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(moritaNoisyRoot, `ordinary-morita-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(moritaNoisyRoot, "zz Morita i-Dixel Workstation"), { recursive: true });
  const moritaProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [moritaNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(moritaProfileDiscovery.statusCode === 200, `Morita/i-Dixel profile discovery failed: ${moritaProfileDiscovery.statusCode}`);
  const moritaProfile = moritaProfileDiscovery.json().candidates.find((candidate) => /Morita|i-Dixel/i.test(candidate.safeDisplayName));
  assert(moritaProfile, "local source discovery must recognize Morita/i-Dixel workstation folders before maxFolders is exhausted");
  assert(moritaProfile.sourceKind === "vendor_imaging_system", "Morita/i-Dixel folders must be treated as vendor imaging sources");
  assert(moritaProfile.matchedFiles === 0, "Morita/i-Dixel profile-only candidates must not fake file counts");
  assert(
    !`${moritaProfile.safeDisplayName} ${moritaProfile.sourceRef} ${moritaProfile.smartImportLine}`.includes(moritaNoisyRoot) &&
      !/ordinary-morita-folder|zz Morita/i.test(`${moritaProfile.safeDisplayName} ${moritaProfile.sourceRef} ${moritaProfile.smartImportLine}`),
    "Morita/i-Dixel profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const dexisNoisyRoot = path.join(tempMigrationRoot, "noisy-dexis-workstation-root");
  mkdirSync(dexisNoisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(dexisNoisyRoot, `ordinary-dexis-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(dexisNoisyRoot, "zz DEXIS KaVo Imaging"), { recursive: true });
  const dexisProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [dexisNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(dexisProfileDiscovery.statusCode === 200, `DEXIS/KaVo/Gendex profile discovery failed: ${dexisProfileDiscovery.statusCode}`);
  const dexisProfile = dexisProfileDiscovery.json().candidates.find((candidate) => /DEXIS|KaVo|Gendex/i.test(candidate.safeDisplayName));
  assert(dexisProfile, "local source discovery must recognize DEXIS/KaVo/Gendex workstation folders before maxFolders is exhausted");
  assert(dexisProfile.sourceKind === "vendor_imaging_system", "DEXIS/KaVo/Gendex folders must be treated as vendor imaging sources");
  assert(dexisProfile.matchedFiles === 0, "DEXIS/KaVo/Gendex profile-only candidates must not fake file counts");
  assert(
    !`${dexisProfile.safeDisplayName} ${dexisProfile.sourceRef} ${dexisProfile.smartImportLine}`.includes(dexisNoisyRoot) &&
      !/ordinary-dexis-folder|zz DEXIS/i.test(`${dexisProfile.safeDisplayName} ${dexisProfile.sourceRef} ${dexisProfile.smartImportLine}`),
    "DEXIS/KaVo/Gendex profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const infodentNoisyRoot = path.join(tempMigrationRoot, "noisy-infodent-workstation-root");
  mkdirSync(infodentNoisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(infodentNoisyRoot, `ordinary-infodent-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(infodentNoisyRoot, "zz Infodent Denta Office"), { recursive: true });
  const infodentProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [infodentNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(infodentProfileDiscovery.statusCode === 200, `Infodent/Denta Office profile discovery failed: ${infodentProfileDiscovery.statusCode}`);
  const infodentProfile = infodentProfileDiscovery.json().candidates.find((candidate) => /Infodent|Denta Office|ИНФОДЕНТ/i.test(candidate.safeDisplayName));
  assert(infodentProfile, "local source discovery must recognize Infodent/Denta Office workstation folders before maxFolders is exhausted");
  assert(infodentProfile.sourceKind === "mis_database", "Infodent/Denta Office folders must be treated as legacy MIS/database sources");
  assert(infodentProfile.matchedFiles === 0, "Infodent/Denta Office profile-only candidates must not fake file counts");
  assert(
    !`${infodentProfile.safeDisplayName} ${infodentProfile.sourceRef} ${infodentProfile.smartImportLine}`.includes(infodentNoisyRoot) &&
      !/ordinary-infodent-folder|zz Infodent/i.test(`${infodentProfile.safeDisplayName} ${infodentProfile.sourceRef} ${infodentProfile.smartImportLine}`),
    "Infodent/Denta Office profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const ruMisNoisyRoot = path.join(tempMigrationRoot, "noisy-ru-mis-workstation-root");
  mkdirSync(ruMisNoisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(ruMisNoisyRoot, `ordinary-ru-mis-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(ruMisNoisyRoot, "zz iStom Workstation"), { recursive: true });
  const ruMisProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [ruMisNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(ruMisProfileDiscovery.statusCode === 200, `Russian dental MIS profile discovery failed: ${ruMisProfileDiscovery.statusCode}`);
  const ruMisProfile = ruMisProfileDiscovery.json().candidates.find((candidate) => /iStom/i.test(candidate.safeDisplayName));
  assert(ruMisProfile, "local source discovery must recognize iStom workstation folders before maxFolders is exhausted");
  assert(ruMisProfile.sourceKind === "mis_database", "iStom folders must be treated as legacy MIS/database sources");
  assert(ruMisProfile.matchedFiles === 0, "iStom profile-only candidates must not fake file counts");
  assert(
    !`${ruMisProfile.safeDisplayName} ${ruMisProfile.sourceRef} ${ruMisProfile.smartImportLine}`.includes(ruMisNoisyRoot) &&
      !/ordinary-ru-mis-folder|zz iStom/i.test(`${ruMisProfile.safeDisplayName} ${ruMisProfile.sourceRef} ${ruMisProfile.smartImportLine}`),
    "iStom profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const newerRuMisNoisyRoot = path.join(tempMigrationRoot, "noisy-newer-ru-mis-workstation-root");
  mkdirSync(newerRuMisNoisyRoot, { recursive: true });
  for (let index = 0; index < 24; index += 1) {
    mkdirSync(path.join(newerRuMisNoisyRoot, `ordinary-newer-ru-mis-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(newerRuMisNoisyRoot, "zz Sycret Dent Workstation"), { recursive: true });
  const newerRuMisProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [newerRuMisNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(newerRuMisProfileDiscovery.statusCode === 200, `newer Russian dental MIS profile discovery failed: ${newerRuMisProfileDiscovery.statusCode}`);
  const newerRuMisProfile = newerRuMisProfileDiscovery.json().candidates.find((candidate) => /Sycret Dent/i.test(candidate.safeDisplayName));
  assert(newerRuMisProfile, "local source discovery must recognize Sycret Dent workstation folders before maxFolders is exhausted");
  assert(newerRuMisProfile.sourceKind === "mis_database", "Sycret Dent folders must be treated as legacy MIS/database sources");
  assert(
    !`${newerRuMisProfile.safeDisplayName} ${newerRuMisProfile.sourceRef} ${newerRuMisProfile.smartImportLine}`.includes(newerRuMisNoisyRoot) &&
      !/ordinary-newer-ru-mis-folder|zz Sycret Dent/i.test(
        `${newerRuMisProfile.safeDisplayName} ${newerRuMisProfile.sourceRef} ${newerRuMisProfile.smartImportLine}`
      ),
    "Sycret Dent profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const openDentalNoisyRoot = path.join(tempMigrationRoot, "noisy-opendental-workstation-root");
  mkdirSync(openDentalNoisyRoot, { recursive: true });
  for (let index = 0; index < 28; index += 1) {
    mkdirSync(path.join(openDentalNoisyRoot, `ordinary-opendental-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(openDentalNoisyRoot, "zz OpenDentImages AtoZ"), { recursive: true });
  const openDentalProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [openDentalNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(openDentalProfileDiscovery.statusCode === 200, `OpenDental/OpenDentImages profile discovery failed: ${openDentalProfileDiscovery.statusCode}`);
  const openDentalProfile = openDentalProfileDiscovery.json().candidates.find((candidate) => /Open Dental|SoftDent|Dentrix|Eaglesoft/i.test(candidate.safeDisplayName));
  assert(openDentalProfile, "local source discovery must recognize OpenDentImages/AtoZ workstation folders before maxFolders is exhausted");
  assert(openDentalProfile.sourceKind === "mis_database", "OpenDentImages/AtoZ folders must be treated as legacy MIS/database sources");
  assert(openDentalProfile.matchedFiles === 0, "OpenDentImages/AtoZ profile-only candidates must not fake file counts");
  assert(
    !`${openDentalProfile.safeDisplayName} ${openDentalProfile.sourceRef} ${openDentalProfile.smartImportLine}`.includes(openDentalNoisyRoot) &&
      !/ordinary-opendental-folder|zz OpenDentImages|AtoZ/i.test(`${openDentalProfile.safeDisplayName} ${openDentalProfile.sourceRef} ${openDentalProfile.smartImportLine}`),
    "OpenDentImages/AtoZ profile-only handoff must stay tokenized and not leak workstation folder names"
  );

  const genericBackupNoisyRoot = path.join(tempMigrationRoot, "noisy-generic-backup-root");
  mkdirSync(genericBackupNoisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(genericBackupNoisyRoot, `ordinary-generic-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(genericBackupNoisyRoot, "zz Dental Backup Export"), { recursive: true });
  const genericBackupDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [genericBackupNoisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(genericBackupDiscovery.statusCode === 200, `generic clinic backup/export discovery failed: ${genericBackupDiscovery.statusCode}`);
  const genericBackupCandidate = genericBackupDiscovery.json().candidates.find((candidate) =>
    candidate.reasons.some((reason) => /контейнер резервных копий, выгрузок или данных клиники/i.test(reason))
  );
  assert(genericBackupCandidate, "local source discovery must recognize generic clinic backup/export folders before maxFolders is exhausted");
  assert(genericBackupCandidate.sourceKind === "unknown_legacy_source", "generic backup/export folders without files must stay manual-review unknown sources");
  assert(genericBackupCandidate.matchedFiles === 0, "generic backup/export profile-only candidates must not fake file counts");
  assert(
    genericBackupCandidate.warnings.some((warning) => /контейнер старой клиники/i.test(warning)),
    "generic backup/export candidates must explain that a deeper root, export, backup, or data folder is needed"
  );
  assert(
    !`${genericBackupCandidate.safeDisplayName} ${genericBackupCandidate.sourceRef} ${genericBackupCandidate.smartImportLine}`.includes(genericBackupNoisyRoot) &&
      !/ordinary-generic-folder|zz Dental Backup/i.test(`${genericBackupCandidate.safeDisplayName} ${genericBackupCandidate.sourceRef} ${genericBackupCandidate.smartImportLine}`),
    "generic backup/export handoff must stay tokenized and not leak workstation folder names"
  );

  const russianEverydayRoot = path.join(tempMigrationRoot, "noisy-russian-everyday-root");
  mkdirSync(russianEverydayRoot, { recursive: true });
  for (let index = 0; index < 24; index += 1) {
    mkdirSync(path.join(russianEverydayRoot, `ordinary-russian-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  const russianEverydayDataFolder = path.join(russianEverydayRoot, "zz Старая база пациентов");
  mkdirSync(russianEverydayDataFolder, { recursive: true });
  writeFileSync(path.join(russianEverydayDataFolder, "patients.ib"), "synthetic-interbase-placeholder");
  writeFileSync(path.join(russianEverydayDataFolder, "clinic.gbk"), "synthetic-gbak-placeholder");
  const russianEverydayDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [russianEverydayRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 8,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(russianEverydayDiscovery.statusCode === 200, `Russian everyday old database folder discovery failed: ${russianEverydayDiscovery.statusCode}`);
  const russianEverydayCandidate = russianEverydayDiscovery
    .json()
    .candidates.find((candidate) => candidate.sourceKind === "firebird_database" && candidate.databaseFiles >= 1 && candidate.dumpFiles >= 1);
  assert(
    russianEverydayCandidate,
    "local source discovery must prioritize Russian folders like 'Старая база пациентов' and detect .ib/.gbk old database files"
  );
  assert(
    russianEverydayCandidate.reasons.some((reason) => /старой базы|резервной копии|имя папки похоже/i.test(reason)),
    "Russian everyday old database candidates must explain why the folder was selected"
  );
  assert(
    !`${russianEverydayCandidate.safeDisplayName} ${russianEverydayCandidate.sourceRef} ${russianEverydayCandidate.smartImportLine}`.includes(russianEverydayRoot) &&
      !/Старая база пациентов|patients\.ib|clinic\.gbk/i.test(
        `${russianEverydayCandidate.safeDisplayName} ${russianEverydayCandidate.sourceRef} ${russianEverydayCandidate.smartImportLine}`
      ),
    "Russian everyday old database handoff must stay tokenized and not leak raw folder or file names"
  );

  const startMenuRoot = path.join(tempMigrationRoot, "Start Menu", "Programs");
  mkdirSync(startMenuRoot, { recursive: true });
  writeFileSync(path.join(startMenuRoot, "Romexis Imaging.lnk"), "synthetic-shortcut");
  const workstationShortcutDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [startMenuRoot],
      maxDepth: 1,
      maxFolders: 4,
      maxFilesPerFolder: 20,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(workstationShortcutDiscovery.statusCode === 200, `workstation shortcut discovery failed: ${workstationShortcutDiscovery.statusCode}`);
  const shortcutProfile = workstationShortcutDiscovery.json().candidates.find((candidate) => candidate.sourceRef.startsWith("workstation-profile:"));
  assert(shortcutProfile, "local source discovery must turn Start Menu shortcuts into safe workstation-profile hints");
  assert(shortcutProfile.sourceKind === "vendor_imaging_system", "workstation shortcut hints must keep the matched vendor/source kind");
  assert(shortcutProfile.sourceLabel === "След установленной системы", "workstation shortcut hints must not pretend to be a data folder");
  assert(/Romexis|Planmeca/i.test(shortcutProfile.safeDisplayName), "workstation shortcut hints must keep a safe vendor label in the alias");

  const workstationSignalRoot = path.join(tempMigrationRoot, "empty-signal-root");
  mkdirSync(workstationSignalRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS = "Romexis Imaging Service";
  const workstationSignalDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationSignalRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationSignalDiscovery.statusCode === 200, `workstation signal discovery failed: ${workstationSignalDiscovery.statusCode}`);
  const workstationSignal = workstationSignalDiscovery.json().candidates.find((candidate) => candidate.sourceRef.startsWith("workstation-signal:"));
  assert(workstationSignal, "local source discovery must turn configured workstation signals into safe migration hints");
  assert(workstationSignal.sourceKind === "vendor_imaging_system", "workstation signal hints must keep the matched vendor/source kind");
  assert(workstationSignal.sourceLabel === "Системный след рабочей станции", "workstation signal hints must not pretend to be a data folder");
  assert(workstationSignal.matchedFiles === 0, "workstation signal hints must not fake file counts");
  assert(/Romexis|Planmeca/i.test(workstationSignal.safeDisplayName), "workstation signal hints must keep a safe vendor label in the alias");
  assert(
    workstationSignal.warnings.every((warning) => !/Romexis Imaging Service/i.test(warning)),
    "workstation signal warnings must not echo raw process/service names"
  );

  const workstationSignalWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: workstationSignal.sourceRef,
      sourceKind: workstationSignal.sourceKind,
      safeDisplayName: workstationSignal.safeDisplayName
    }
  });
  assert(workstationSignalWorkup.statusCode === 200, `workstation signal workup failed: ${workstationSignalWorkup.statusCode}`);
  const workstationSignalPlan = workstationSignalWorkup.json();
  assert(workstationSignalPlan.sourceLabel === "Системный след рабочей станции", "workstation signal workup must preserve the trace boundary");
  assert(workstationSignalPlan.readiness.level === "needs_export", "workstation signal workup must require export/data folder");
  assert(workstationSignalPlan.bridgeKit.kind === "dicom_export", "workstation signal workup bridge kit must direct admins to the imaging export route");

  const workstationSignalProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: workstationSignal.sourceRef,
      sourceKind: workstationSignal.sourceKind,
      safeDisplayName: workstationSignal.safeDisplayName,
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(workstationSignalProbe.statusCode === 200, `workstation signal probe failed: ${workstationSignalProbe.statusCode}`);
  const workstationSignalProbeBody = workstationSignalProbe.json();
  assert(workstationSignalProbeBody.sourceLabel === "Системный след рабочей станции", "workstation signal probe must preserve the trace boundary");
  assert(workstationSignalProbeBody.readiness.level === "needs_export", "workstation signal probe must require export/data folder");
  assert(workstationSignalProbeBody.bridgeKit.kind === "dicom_export", "workstation signal probe bridge kit must preserve the imaging export route");

  const workstationAppRoot = path.join(tempMigrationRoot, "empty-installed-app-root");
  mkdirSync(workstationAppRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS = "";
  process.env.DENTAL_MIGRATION_WORKSTATION_APPS = "Sidexis XG Installed Suite";
  const workstationAppDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationAppRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationAppDiscovery.statusCode === 200, `workstation installed-app discovery failed: ${workstationAppDiscovery.statusCode}`);
  const workstationAppSignal = workstationAppDiscovery.json().candidates.find((candidate) =>
    candidate.reasons.some((reason) => /установленная программа/i.test(reason))
  );
  assert(workstationAppSignal, "local source discovery must turn installed Windows app names into safe migration hints");
  assert(workstationAppSignal.sourceKind === "vendor_imaging_system", "installed app hints must keep the matched vendor/source kind");
  assert(workstationAppSignal.sourceLabel === "Системный след рабочей станции", "installed app hints must not pretend to be a data folder");
  assert(/Sidexis|Sirona/i.test(workstationAppSignal.safeDisplayName), "installed app hints must keep a safe vendor label in the alias");
  assert(
    workstationAppSignal.warnings.every((warning) => !/Sidexis XG Installed Suite/i.test(warning)),
    "installed app warnings must not echo raw Windows DisplayName values"
  );

  const workstationActeonAppRoot = path.join(tempMigrationRoot, "empty-installed-acteon-app-root");
  mkdirSync(workstationActeonAppRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_APPS = "Acteon SOPRO Imaging Suite";
  const workstationActeonAppDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationActeonAppRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationActeonAppDiscovery.statusCode === 200, `Acteon/SOPRO installed-app discovery failed: ${workstationActeonAppDiscovery.statusCode}`);
  const workstationActeonAppSignal = workstationActeonAppDiscovery.json().candidates.find((candidate) => /Acteon|SOPRO|SOPIX|PSPIX|X-Mind/i.test(candidate.safeDisplayName));
  assert(workstationActeonAppSignal, "local source discovery must turn Acteon/SOPRO installed app names into safe migration hints");
  assert(workstationActeonAppSignal.sourceKind === "vendor_imaging_system", "Acteon/SOPRO installed app hints must keep the vendor imaging source kind");
  assert(workstationActeonAppSignal.sourceLabel === "Системный след рабочей станции", "Acteon/SOPRO installed app hints must not pretend to be a data folder");
  assert(
    workstationActeonAppSignal.warnings.every((warning) => !/Acteon SOPRO Imaging Suite/i.test(warning)),
    "Acteon/SOPRO installed app warnings must not echo raw Windows DisplayName values"
  );

  const workstationMisAppRoot = path.join(tempMigrationRoot, "empty-installed-mis-app-root");
  mkdirSync(workstationMisAppRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_APPS = "Open Dental Practice Management";
  const workstationMisAppDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationMisAppRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationMisAppDiscovery.statusCode === 200, `workstation installed MIS app discovery failed: ${workstationMisAppDiscovery.statusCode}`);
  const workstationMisAppSignal = workstationMisAppDiscovery.json().candidates.find((candidate) => /Open Dental|Dentrix|Eaglesoft/i.test(candidate.safeDisplayName));
  assert(workstationMisAppSignal, "local source discovery must turn Open Dental/Dentrix/Eaglesoft installed app names into safe migration hints");
  assert(workstationMisAppSignal.sourceKind === "mis_database", "installed PMS app hints must keep the MIS/database source kind");
  assert(workstationMisAppSignal.matchedFiles === 0, "installed PMS app hints must not pretend to be discovered data files");
  assert(
    workstationMisAppSignal.warnings.every((warning) => !/Open Dental Practice Management/i.test(warning)),
    "installed PMS app warnings must not echo raw Windows DisplayName values"
  );

  const workstationShortcutSignalRoot = path.join(tempMigrationRoot, "empty-shortcut-target-root");
  mkdirSync(workstationShortcutSignalRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_APPS = "";
  process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = "C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe";
  const workstationShortcutSignalDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationShortcutSignalRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationShortcutSignalDiscovery.statusCode === 200, `workstation shortcut-target discovery failed: ${workstationShortcutSignalDiscovery.statusCode}`);
  const workstationShortcutSignal = workstationShortcutSignalDiscovery.json().candidates.find((candidate) =>
    candidate.reasons.some((reason) => /ярлык ОС/i.test(reason))
  );
  assert(workstationShortcutSignal, "local source discovery must turn shortcut targets into safe migration hints");
  assert(workstationShortcutSignal.sourceKind === "vendor_imaging_system", "shortcut target hints must keep the matched vendor/source kind");
  assert(workstationShortcutSignal.sourceLabel === "Системный след рабочей станции", "shortcut target hints must not pretend to be a data folder");
  assert(/Romexis|Planmeca/i.test(workstationShortcutSignal.safeDisplayName), "shortcut target hints must keep a safe vendor label in the alias");
  assert(
    workstationShortcutSignal.warnings.every((warning) => !/Romexis\.exe|Program Files/i.test(warning)),
    "shortcut target warnings must not echo raw shortcut paths"
  );
  process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = "";

  const workstationPathHintRoot = path.join(tempMigrationRoot, "workstation-path-hint-root");
  const workstationAppDir = path.join(workstationPathHintRoot, "Planmeca", "Romexis");
  const workstationDataDir = path.join(workstationPathHintRoot, "Planmeca", "RomexisData");
  const workstationManualRoot = path.join(tempMigrationRoot, "empty-derived-root-control");
  mkdirSync(workstationAppDir, { recursive: true });
  mkdirSync(workstationDataDir, { recursive: true });
  mkdirSync(workstationManualRoot, { recursive: true });
  const workstationAppExe = path.join(workstationAppDir, "Romexis.exe");
  writeFileSync(workstationAppExe, "synthetic-romexis-exe");
  writeFileSync(path.join(workstationDataDir, "clinic_from_shortcut.sqlite"), Buffer.concat([Buffer.from("SQLite format 3\0", "latin1"), Buffer.alloc(64)]));
  process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = workstationAppExe;
  const workstationPathHintDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationManualRoot],
      maxDepth: 2,
      maxFolders: 30,
      maxFilesPerFolder: 20,
      maxCandidates: 8,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = "";
  assert(workstationPathHintDiscovery.statusCode === 200, `workstation shortcut-derived root discovery failed: ${workstationPathHintDiscovery.statusCode}`);
  const workstationPathHintBody = workstationPathHintDiscovery.json();
  const workstationPathHintCandidate = workstationPathHintBody.candidates.find(
    (candidate) => candidate.matchedFiles > 0 && /^migration-source:[A-F0-9]{10}$/i.test(candidate.sourceRef)
  );
  assert(
    workstationPathHintCandidate,
    "shortcut/app target paths must expand discovery into nearby data folders, not only emit workstation-signal hints"
  );
  assert(
    workstationPathHintBody.roots.every((root) => !root.includes(workstationPathHintRoot) && !/RomexisData|clinic_from_shortcut/i.test(root)),
    "shortcut-derived root discovery must return safe root aliases only"
  );
  assert(
    !`${workstationPathHintCandidate.safeDisplayName} ${workstationPathHintCandidate.sourceRef} ${workstationPathHintCandidate.smartImportLine}`.includes(workstationPathHintRoot) &&
      !/RomexisData|clinic_from_shortcut/i.test(
        `${workstationPathHintCandidate.safeDisplayName} ${workstationPathHintCandidate.sourceRef} ${workstationPathHintCandidate.smartImportLine}`
      ),
    "shortcut-derived data candidates must not leak raw paths, sibling data folders, or DB file names"
  );

  const originalProgramData = process.env.ProgramData;
  const workstationProgramDataRoot = path.join(tempMigrationRoot, "synthetic-programdata");
  const workstationProgramDataRomexisRoot = path.join(workstationProgramDataRoot, "Planmeca", "RomexisData");
  const workstationProgramDataManualRoot = path.join(tempMigrationRoot, "empty-programdata-derived-root-control");
  mkdirSync(workstationProgramDataRomexisRoot, { recursive: true });
  mkdirSync(workstationProgramDataManualRoot, { recursive: true });
  writeFileSync(path.join(workstationProgramDataRomexisRoot, "romexis_programdata.sqlite"), Buffer.concat([Buffer.from("SQLite format 3\0", "latin1"), Buffer.alloc(64)]));
  let workstationProgramDataDiscoveryBody;
  try {
    process.env.ProgramData = workstationProgramDataRoot;
    process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = "C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe";
    const workstationProgramDataDiscovery = await app.inject({
      method: "POST",
      url: "/api/imports/smart/local-source-discovery",
      headers,
      payload: {
        rootPaths: [workstationProgramDataManualRoot],
        maxDepth: 2,
        maxFolders: 30,
        maxFilesPerFolder: 20,
        maxCandidates: 8,
        includeWorkstationSignals: true,
        maxWorkstationSignals: 5
      }
    });
    assert(workstationProgramDataDiscovery.statusCode === 200, `workstation ProgramData-derived root discovery failed: ${workstationProgramDataDiscovery.statusCode}`);
    workstationProgramDataDiscoveryBody = workstationProgramDataDiscovery.json();
  } finally {
    process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS = "";
    if (originalProgramData === undefined) delete process.env.ProgramData;
    else process.env.ProgramData = originalProgramData;
  }
  const workstationProgramDataCandidate = workstationProgramDataDiscoveryBody.candidates.find(
    (candidate) => candidate.matchedFiles > 0 && /^migration-source:[A-F0-9]{10}$/i.test(candidate.sourceRef)
  );
  assert(
    workstationProgramDataCandidate,
    "workstation vendor hints must expand into common ProgramData data roots even when the chosen manual root is empty"
  );
  assert(
    workstationProgramDataDiscoveryBody.roots.every((root) => !root.includes(workstationProgramDataRoot) && !/RomexisData|romexis_programdata/i.test(root)),
    "ProgramData-derived discovery roots must stay safe aliases"
  );
  assert(
    !`${workstationProgramDataCandidate.safeDisplayName} ${workstationProgramDataCandidate.sourceRef} ${workstationProgramDataCandidate.smartImportLine}`.includes(
      workstationProgramDataRoot
    ) &&
      !/RomexisData|romexis_programdata/i.test(
        `${workstationProgramDataCandidate.safeDisplayName} ${workstationProgramDataCandidate.sourceRef} ${workstationProgramDataCandidate.smartImportLine}`
      ),
    "ProgramData-derived candidates must not leak raw ProgramData paths or DB file names"
  );

  const workstationProfileWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: shortcutProfile.sourceRef,
      sourceKind: shortcutProfile.sourceKind,
      safeDisplayName: shortcutProfile.safeDisplayName
    }
  });
  assert(workstationProfileWorkup.statusCode === 200, `workstation profile workup failed: ${workstationProfileWorkup.statusCode}`);
  const workstationProfilePlan = workstationProfileWorkup.json();
  assert(workstationProfilePlan.sourceLabel === "След установленной системы", "workstation profile workup must preserve the hint boundary");
assert(
    workstationProfilePlan.warnings.some((warning) => /след установленной системы|локальный модуль|выгрузк|резервн/i.test(warning)),
    "workstation profile workup must explain that the hint still needs a local module, export, backup, or data folder"
  );
  assert(
    workstationProfilePlan.requiredArtifacts.some((artifact) => /Romexis|Planmeca|выгрузк|папк/i.test(artifact)),
    "workstation profile workup must add vendor-specific export/data-folder guidance"
  );
  assert(
    /Romexis|Planmeca|выгрузк|папк|снимк/i.test(workstationProfilePlan.nextAction),
    "workstation profile workup must choose a vendor-specific next action"
  );
  assert(workstationProfilePlan.readiness.level === "needs_export", "workstation profile workup readiness must require export/data folder");
  assert(workstationProfilePlan.bridgeKit.kind === "dicom_export", "workstation profile workup bridge kit must direct admins to the imaging export route");
  assert(workstationProfilePlan.bridgeKit.status === "needs_export", "workstation profile bridge kit must not mark shortcut-only evidence ready");
  assert(
    workstationProfilePlan.bridgeKit.outputManifest.forbiddenFields.some((field) => /pixel|path|public/i.test(field)),
    "workstation profile bridge kit must forbid raw pixels, paths, and public lookup leakage"
  );
assert(
    workstationProfilePlan.readiness.blockers.some((item) => /след старой программы|ярлык|данных|выгрузк/i.test(`${item.title} ${item.detail} ${item.nextAction}`)),
    "workstation profile readiness must not pretend that a shortcut is data"
  );

  const workstationProfileProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: shortcutProfile.sourceRef,
      sourceKind: shortcutProfile.sourceKind,
      safeDisplayName: shortcutProfile.safeDisplayName,
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(workstationProfileProbe.statusCode === 200, `workstation profile probe failed: ${workstationProfileProbe.statusCode}`);
  const workstationProfileProbeBody = workstationProfileProbe.json();
  assert(workstationProfileProbeBody.sourceLabel === "След установленной системы", "workstation profile probe must preserve the hint boundary");
  assert(
    workstationProfileProbeBody.formatSignals.some((signal) => /Romexis|Planmeca/i.test(signal)),
    "workstation profile probe must expose the matched safe vendor profile"
  );
  assert(workstationProfileProbeBody.readiness.level === "needs_export", "workstation profile probe readiness must require export/data folder");
  assert(workstationProfileProbeBody.bridgeKit.kind === "dicom_export", "workstation profile probe bridge kit must preserve the imaging export route");

  const firebirdCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "firebird_database");
  assert(firebirdCandidate, "local source discovery must return an actionable Firebird candidate");
  const localSourceWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: firebirdCandidate.sourceRef,
      sourceKind: firebirdCandidate.sourceKind,
      safeDisplayName: firebirdCandidate.safeDisplayName
    }
  });
  assert(localSourceWorkup.statusCode === 200, `local source workup failed: ${localSourceWorkup.statusCode}`);
  const workup = localSourceWorkup.json();
  assert(workup.sourceKind === "firebird_database", "local source workup must preserve the selected source kind");
  assert(workup.extractableEntities.includes("patients"), "local source workup must describe extractable patients for DB imports");
  assert(workup.extractableEntities.includes("visits"), "local source workup must describe extractable visits for DB imports");
  assert(
    workup.steps.some((step) => step.status === "needs_bridge"),
    "local source workup must require a local staging bridge for DB imports"
  );
  assert(workup.readiness.level === "needs_bridge", "local source workup readiness must mark DB imports as bridge-gated");
  assert(workup.bridgeKit.kind === "local_db_bridge", "local source workup bridge kit must produce a DB bridge plan");
  assert(
    workup.bridgeKit.adminActions.some((action) => /копи|резервн/i.test(`${action.title} ${action.detail}`)),
    "local source workup bridge kit must make offline backup/copy the first admin action"
  );
  assert(
    workup.bridgeKit.outputManifest.requiredColumns.includes("source_row_hash"),
    "local source workup bridge kit must require source_row_hash for staging traceability"
  );
assert(
    workup.readiness.blockers.some((item) => /локальный черновой разбор|локальный модуль|базу старой МИС|отдельная копия|резервная копия/i.test(`${item.title} ${item.detail} ${item.nextAction}`)),
    "local source workup readiness must block direct DB commit until local draft parsing"
  );
  assert(
    workup.readiness.warnings.some((item) => item.owner === "doctor" && /контрольная выборка|10-20 карт/i.test(`${item.title} ${item.detail}`)),
    "local source workup readiness must require doctor control-sample review"
  );
  assert(
    workup.privacyWarnings.every((warning) => !/Ivan|Petrov|\+7 900/.test(warning)),
    "local source workup privacy warnings must not echo patient data"
  );
  assert(
    /^.+migration-source:[A-F0-9]{10}$/i.test(workup.smartImportLine) &&
      !/C:\\|clinic_2024|LegacyDental|Ivan|Petrov/i.test(workup.smartImportLine),
    "local source workup smartImportLine must carry the safe route token, not the raw path"
  );

  const vendorCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "vendor_imaging_system");
  assert(vendorCandidate, "local source discovery must return an actionable vendor imaging candidate");
  const vendorWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: vendorCandidate.sourceRef,
      sourceKind: vendorCandidate.sourceKind,
      safeDisplayName: vendorCandidate.safeDisplayName
    }
  });
  assert(vendorWorkup.statusCode === 200, `vendor imaging workup failed: ${vendorWorkup.statusCode}`);
  assert(
    vendorWorkup.json().handoffs.some((handoff) => handoff.endpoint === "/api/imaging/dicom/folder-workup-plan"),
    "vendor imaging workup must hand off to the DICOM folder workup planner"
  );

  const sqliteCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "sqlite_database");
  assert(sqliteCandidate, "local source discovery must return an actionable SQLite candidate");
  const localSourceProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: sqliteCandidate.sourceRef,
      sourceKind: sqliteCandidate.sourceKind,
      safeDisplayName: sqliteCandidate.safeDisplayName,
      maxDepth: 1,
      maxFolders: 20,
      maxFiles: 40,
      maxSampleArtifacts: 8,
      readHeaderBytes: 128
    }
  });
  assert(localSourceProbe.statusCode === 200, `local source probe failed: ${localSourceProbe.statusCode}`);
  const probe = localSourceProbe.json();
  assert(probe.version === "dental-crm-migration-source-probe-v1", "local source probe must expose the v1 contract");
  assert(probe.counts.databases >= 1, "local source probe must count database artifacts");
  assert(probe.formatSignals.includes("локальная база программы"), "local source probe must inspect database headers with clinic-readable wording");
  assert(
    probe.adapters.some((adapter) => adapter.id === "legacy_db_staging_bridge"),
    "local source probe must choose a DB staging bridge for legacy DB files"
  );
  assert(probe.readiness.level === "needs_bridge", "local source probe readiness must mark SQLite DB imports as bridge-gated");
  assert(probe.bridgeKit.kind === "local_db_bridge", "local source probe bridge kit must keep SQLite on the DB bridge route");
  assert(
    probe.bridgeKit.outputManifest.forbiddenFields.includes("live_db_connection_string"),
    "local source probe bridge kit must forbid live DB connection strings in staging output"
  );
  assert(
    probe.readiness.ready.some((item) => item.id === "public_lookup_scope"),
    "local source probe readiness must prove that public lookup stays clinic-only"
  );
  assert(
    probe.artifactSamples.every((artifact) => !artifact.safeName.includes(tempMigrationRoot) && !/Ivan|Petrov/i.test(artifact.safeName)),
    "local source probe artifact samples must not expose raw paths or patient-like file/folder names"
  );
assert(
    probe.warnings.some((warning) => /внутренний номер|сырой локальный путь/i.test(warning)),
    "local source probe must record that the raw path stayed server-side behind an internal source number"
  );

  const browserManifestWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: "browser-local:ABCDEF12",
      sourceKind: "dicom_folder",
    safeDisplayName: "Браузерный список #ABCDEF12"
    }
  });
  assert(browserManifestWorkup.statusCode === 200, `browser manifest workup failed: ${browserManifestWorkup.statusCode}`);
  const browserWorkup = browserManifestWorkup.json();
  assert(browserWorkup.sourceExists === true, "browser-local manifest workup must not be marked as a missing filesystem path");
  assert(browserWorkup.sourceLabel === "Браузерный список", "browser-local manifest workup must label its boundary clearly");
  assert(browserWorkup.readiness.level === "needs_bridge", "browser-local manifest workup readiness must require bridge/reselection before durable staging");
  assert(browserWorkup.bridgeKit.kind === "browser_manifest_bridge", "browser-local manifest workup bridge kit must expose the browser handle boundary");
assert(
    browserWorkup.warnings.some((warning) => /локальный модуль|браузерный список|выбор папки/i.test(warning)),
    "browser-local manifest workup must explain that real staging needs a local module or repeated folder selection"
  );

  const browserManifestProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: "browser-local:ABCDEF12",
      sourceKind: "dicom_folder",
      safeDisplayName: "Браузерный список #ABCDEF12",
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(browserManifestProbe.statusCode === 200, `browser manifest probe failed: ${browserManifestProbe.statusCode}`);
  const browserProbe = browserManifestProbe.json();
  assert(browserProbe.sourceExists === true, "browser-local manifest probe must be an adapter-plan, not a broken local path");
  assert(browserProbe.readiness.level === "needs_bridge", "browser-local manifest probe readiness must keep the browser boundary visible");
  assert(browserProbe.bridgeKit.kind === "browser_manifest_bridge", "browser-local manifest probe bridge kit must keep the browser handle boundary");
  assert(
    browserProbe.adapters.some((adapter) => adapter.id === "dicom_folder_workup"),
    "browser-local DICOM manifest probe must still route to DICOM workup"
  );

  const browserManifestPreview = await app.inject({
    method: "POST",
    url: "/api/imports/smart/preview",
    headers,
    payload: {
      sourceName: "browser manifest",
      mode: "auto",
      rawText: "legacy source DICOMDIR browser-local:ABCDEF12 files=10 dicom=10 images=0"
    }
  });
  assert(browserManifestPreview.statusCode === 200, `browser manifest smart preview failed: ${browserManifestPreview.statusCode}`);
  assert(
    browserManifestPreview.json().legacySources.some((source) => source.sourceRef === "browser-local:ABCDEF12"),
    "smart import must preserve browser-local manifest refs as migration sources"
  );

  const readableBrowserManifestPreview = await app.inject({
    method: "POST",
    url: "/api/imports/smart/preview",
    headers,
    payload: {
      sourceName: "browser manifest readable",
      mode: "auto",
      rawText: "Источник старой системы: Папка КЛКТ/снимков; код источника browser-local:ABCDEF13; файлов=10; КТ/снимков=10; изображений=0"
    }
  });
  assert(
    readableBrowserManifestPreview.statusCode === 200,
    `readable browser manifest smart preview failed: ${readableBrowserManifestPreview.statusCode}`
  );
  assert(
    readableBrowserManifestPreview
      .json()
      .legacySources.some((source) => source.sourceRef === "browser-local:ABCDEF13" && source.kind === "dicom_folder"),
    "smart import must parse readable browser-local source lines without English parser wording"
  );

  const smartTextOnlyRoot = path.join(tempMigrationRoot, "empty-smart-text-root");
  mkdirSync(smartTextOnlyRoot, { recursive: true });
  const textOnlyMigrationAutopilotPayload = {
    rootPaths: [smartTextOnlyRoot],
    maxDepth: 1,
    maxFolders: 8,
    maxFilesPerFolder: 8,
    maxCandidates: 8,
    maxProbeCandidates: 4,
    includeWorkstationSignals: false,
    smartImport: {
      sourceName: "pasted legacy migration note",
      mode: "auto",
      rawText: [
        "Old Firebird database C:\\LegacyDental\\clinic_2024.fdb",
        "CBCT DICOMDIR archive \\\\NAS-CT\\Studies\\DICOMDIR",
        "Клиника Smile Dental ИНН 1234567890 адрес: Самара, Ленина 1"
      ].join("\n")
    }
  };
  const textOnlyMigrationAutopilotResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot",
    headers,
    payload: textOnlyMigrationAutopilotPayload
  });
  assert(textOnlyMigrationAutopilotResponse.statusCode === 200, `text-only migration autopilot failed: ${textOnlyMigrationAutopilotResponse.statusCode}`);
  const textOnlyMigrationAutopilot = textOnlyMigrationAutopilotResponse.json();
  assert(
    textOnlyMigrationAutopilot.sources.some((source) => /^smart-preview:[A-F0-9]{10}$/i.test(source.candidate.sourceRef)),
    "migration autopilot must convert pasted legacy-source text into smart-preview candidates"
  );
  assert(
    textOnlyMigrationAutopilot.sources.some((source) => source.candidate.sourceKind === "firebird_database") &&
      textOnlyMigrationAutopilot.sources.some((source) => source.candidate.sourceKind === "dicom_folder"),
    "text-only migration autopilot must preserve DB and DICOM source types from smart import"
  );
  assert(
    textOnlyMigrationAutopilot.discovery.roots.some((root) => /^smart-preview:[A-F0-9]{10}$/i.test(root)),
    "text-only migration autopilot must expose smart-preview roots in the safe discovery summary"
  );
  assert(
    textOnlyMigrationAutopilot.operatorPacket.totals.smartPreviewSources >= 2 &&
      textOnlyMigrationAutopilot.operatorPacket.dataClasses.smartPreviewSources === true,
    "text-only migration autopilot must count pasted text/OCR sources separately for the operator packet"
  );
  assert(
    textOnlyMigrationAutopilot.operatorPacket.lanes.some(
      (lane) =>
        lane.id === "legacy-sources" &&
        /из текста\/OCR\s+[1-9]/i.test(lane.detail) &&
        /подтвердить реальн|подтвердить фактическ/i.test(lane.nextAction)
    ) &&
      textOnlyMigrationAutopilot.operatorPacket.lanes.some(
        (lane) => lane.id === "imaging" && /из текста\/OCR\s+[1-9]/i.test(lane.detail) && /снимк|RVG|КТ|КЛКТ/i.test(lane.nextAction)
      ),
    "text-only migration autopilot must explain text/OCR-derived DB and imaging hints as sources that still need real files or exports"
  );
assert(
    textOnlyMigrationAutopilot.operatorPacket.firstActions.some((action) => /текста\/OCR|фактический файл|выгрузк|локальный модуль/i.test(action)) &&
      /Текст\/OCR подсказал/i.test(textOnlyMigrationAutopilot.operatorPacket.operatorScript.headline) &&
      textOnlyMigrationAutopilot.operatorPacket.operatorScript.steps.some(
        (step) => step.action === "open_probe" && step.buttonLabel === "Подтвердить источник" && /распознанный тип из текста\/OCR/i.test(step.detail)
      ),
    "text-only migration autopilot must make the operator script explicit about confirming text/OCR hints before preview"
  );
  assert(
    textOnlyMigrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "build_preview" && step.sourceFingerprint),
    "text-only migration autopilot must still give admins a clickable preview path"
  );
  const textOnlyPreviewSourceLines = textOnlyMigrationAutopilot.sources
    .filter((source) => /^smart-preview:[A-F0-9]{10}$/i.test(source.candidate.sourceRef))
    .map((source) => source.candidate.smartImportLine)
    .join("\n");
  const textOnlyPreviewFromAutopilot = await app.inject({
    method: "POST",
    url: "/api/imports/smart/preview",
    headers,
    payload: {
      sourceName: "autopilot smart-preview lines",
      mode: "auto",
      rawText: textOnlyPreviewSourceLines
    }
  });
  assert(textOnlyPreviewFromAutopilot.statusCode === 200, `smart-preview follow-up preview failed: ${textOnlyPreviewFromAutopilot.statusCode}`);
  const textOnlyPreviewFromAutopilotBody = textOnlyPreviewFromAutopilot.json();
  assert(
    textOnlyPreviewFromAutopilotBody.legacySources.some(
      (source) => /^smart-preview:[A-F0-9]{10}$/i.test(source.sourceRef) && source.safeSourceAlias && !/^smart-preview:/i.test(source.safeSourceAlias)
    ),
    "smart-preview follow-up preview must preserve the token internally but show a human source alias"
  );
  assert(textOnlyMigrationAutopilot.clinicLookup?.safeQuery === "1234567890", "text-only migration autopilot must reuse clinic requisites from smart import text");
  const textOnlyMigrationAutopilotJson = JSON.stringify(textOnlyMigrationAutopilot);
  assert(
    !textOnlyMigrationAutopilotJson.includes("clinic_2024") &&
      !textOnlyMigrationAutopilotJson.includes("LegacyDental") &&
      !textOnlyMigrationAutopilotJson.includes("NAS-CT"),
    "text-only migration autopilot must not echo raw legacy paths or DB file names"
  );
  const textOnlyMigrationAutopilotReportResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot/report.csv",
    headers,
    payload: textOnlyMigrationAutopilotPayload
  });
  assert(
    textOnlyMigrationAutopilotReportResponse.statusCode === 200,
    `text-only migration handoff report failed: ${textOnlyMigrationAutopilotReportResponse.statusCode}`
  );
  const textOnlyMigrationAutopilotReportCsv = textOnlyMigrationAutopilotReportResponse.body;
  assert(
    /подсказок из текста\/OCR [2-9]/i.test(textOnlyMigrationAutopilotReportCsv) &&
      textOnlyMigrationAutopilotReportCsv.includes("из текста/OCR") &&
      textOnlyMigrationAutopilotReportCsv.includes("Подтвердить источник"),
    "text-only migration handoff report must preserve text/OCR source hints and confirmation actions for the clinic migration team"
  );
  assert(
    !textOnlyMigrationAutopilotReportCsv.includes("clinic_2024") &&
      !textOnlyMigrationAutopilotReportCsv.includes("LegacyDental") &&
      !textOnlyMigrationAutopilotReportCsv.includes("NAS-CT"),
    "text-only migration handoff report must not echo raw legacy paths or DB file names"
  );

  const migrationAutopilotPayload = {
    rootPaths: [tempMigrationRoot],
    maxDepth: 4,
    maxFolders: 80,
    maxFilesPerFolder: 40,
    maxCandidates: 12,
    maxProbeCandidates: 4,
    knownScannedFolders: 3,
    knownSources: [
      {
        sourceRef: "browser-local:ABCDEF12",
        safeDisplayName: "Браузерный список #ABCDEF12",
        sourceKind: "dicom_folder",
        sourceLabel: "Браузерный список",
        sourceFingerprint: "ABCDEF12",
        depth: 0,
        confidence: 0.91,
        matchedFiles: 10,
        databaseFiles: 0,
        dumpFiles: 0,
        tableFiles: 0,
        archiveFiles: 0,
        dicomLikeFiles: 10,
        imageFiles: 0,
        hasDicomDir: true,
        latestModifiedAt: null,
        reasons: ["браузерный список метаданных"],
        warnings: ["полный локальный путь намеренно недоступен серверу"],
        smartImportLine: "legacy source DICOMDIR browser-local:ABCDEF12 files=10 dicom=10 images=0"
      }
    ],
    clinic: {
      inn: "1234567890",
      clinicName: "Smile Clinic patient Ivan Petrov +7 900 111-22-33",
      address: "Samara, Lenina 1"
    }
  };
  const migrationAutopilotResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot",
    headers,
    payload: migrationAutopilotPayload
  });
  assert(migrationAutopilotResponse.statusCode === 200, `migration autopilot failed: ${migrationAutopilotResponse.statusCode}`);
  const migrationAutopilot = migrationAutopilotResponse.json();
  assert(migrationAutopilot.version === "dental-crm-migration-autopilot-v1", "migration autopilot must expose the v1 contract");
  assert(migrationAutopilot.discovery.candidateCount >= 4, "migration autopilot must reuse local source discovery");
  assert(migrationAutopilot.discovery.probedCount > 0, "migration autopilot must probe top candidates");
  assert(migrationAutopilot.discovery.roots.includes("browser-local:ABCDEF12"), "migration autopilot must include browser-local known roots");
  assert(
    migrationAutopilot.discovery.roots.every((root) => !root.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental/i.test(root)),
    "migration autopilot discovery roots must be safe aliases, not raw filesystem roots"
  );
  assert(migrationAutopilot.discovery.scannedFolders >= 3, "migration autopilot must include browser-local scanned folder counts");
  assert(migrationAutopilot.sources.length > 0, "migration autopilot must return ranked migration sources");
  assert(
    migrationAutopilot.sources.every(
      (source) => !source.candidate.sourceRef.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental|clinic_2024|36\.dcm/i.test(source.candidate.sourceRef)
    ),
    "migration autopilot source refs must stay tokenized and must not expose raw local paths, DB names, or file names"
  );
  assert(
    migrationAutopilot.sources.some(
      (source) => source.candidate.sourceRef === "browser-local:ABCDEF12" && source.probe?.sourceLabel === "Браузерный список"
    ),
    "migration autopilot must carry browser-local manifest candidates into ranking and probe planning"
  );
  assert(
    migrationAutopilot.sources.some((source) =>
      source.probe?.adapters.some((adapter) => adapter.id === "legacy_db_staging_bridge" || adapter.id === "dicom_folder_workup")
    ),
    "migration autopilot must surface built-in handoff adapters"
  );
  assert(
    migrationAutopilot.sources.some((source) => source.readiness && ["needs_bridge", "needs_export", "ready_for_preview"].includes(source.readiness.level)),
    "migration autopilot must rank sources with explicit readiness"
  );
  assert(
    migrationAutopilot.sources.some((source) => source.bridgeKit?.kind === "local_db_bridge" || source.bridgeKit?.kind === "dicom_export"),
    "migration autopilot must rank sources with concrete bridge/export kits"
  );
  assert(
    migrationAutopilot.steps.some((step) => step.owner === "doctor" && step.blocking),
    "migration autopilot must require doctor control-sample review before mass commit"
  );
  assert(migrationAutopilot.operatorPacket?.totals.sources === migrationAutopilot.sources.length, "migration autopilot must return an operator migration packet");
  assert(
    migrationAutopilot.operatorPacket.totals.databaseSources > 0 && migrationAutopilot.operatorPacket.totals.mediaSources > 0,
    "migration operator packet must summarize old DB and imaging lanes"
  );
  assert(
    migrationAutopilot.operatorPacket.lanes.some((lane) => lane.id === "clinic-requisites") &&
      migrationAutopilot.operatorPacket.lanes.some((lane) => lane.id === "bridge-export") &&
      migrationAutopilot.operatorPacket.firstActions.some((action) => /чернов|предпросмотр|контрольной выборки|резервн|снимк|КТ/i.test(action)),
    "migration operator packet must give admin/doctor first actions"
  );
  assert(
    migrationAutopilot.operatorPacket.operatorScript?.title === "Что делать сейчас" &&
      migrationAutopilot.operatorPacket.operatorScript.totalEstimatedMinutes > 0 &&
      migrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "open_plan" && step.owner === "administrator") &&
      migrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "open_probe") &&
      migrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "build_preview" && step.sourceFingerprint) &&
      migrationAutopilot.operatorPacket.operatorScript.steps.some((step) => step.action === "doctor_review" && step.owner === "doctor"),
    "migration operator packet must include a role-based clickable action script for non-technical clinic users"
  );
  assert(
    migrationAutopilot.operatorPacket.dryRun.previewableSources > 0 &&
      migrationAutopilot.operatorPacket.dryRun.adminBlockedSources >= 0 &&
      migrationAutopilot.operatorPacket.dryRun.doctorReviewRequiredSources > 0 &&
      migrationAutopilot.operatorPacket.dryRun.estimatedOperatorMinutes === migrationAutopilot.operatorPacket.operatorScript.totalEstimatedMinutes &&
      Number.isInteger(migrationAutopilot.operatorPacket.dryRun.estimatedClinicDowntimeMinutes) &&
      /предпросмотр|выгрузк|подключение|поиск/i.test(migrationAutopilot.operatorPacket.dryRun.fastestRoute) &&
      migrationAutopilot.operatorPacket.dryRun.nextBestAction.includes(":"),
    "migration operator packet must include a practical dry-run route, effort, and next action"
  );
  assert(
    migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "clinic_requisites" && /ИНН|ОГРН|лиценз/i.test(item.requiredArtifact)) &&
      migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "export_or_bridge" || item.phase === "source_access") &&
      migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "doctor_control" && item.blocking),
    "migration operator packet must include clinic, export/bridge, and doctor handoff checklist items"
  );
  assert(
    migrationAutopilot.operatorPacket.onlineLookupPolicy.allowed.some((item) => /ИНН|ОГРН/.test(item)) &&
      migrationAutopilot.operatorPacket.onlineLookupPolicy.forbidden.some((item) => /пациент|снимк|КТ|база/i.test(item)),
    "migration operator packet must define public lookup boundaries"
  );
  assert(migrationAutopilot.clinicLookup?.safeQuery === "1234567890", "migration autopilot must run safe clinic lookup when clinic fields are provided");
  assert(
    !/Ivan|Petrov|\+7 900|79001112233/.test(
      `${migrationAutopilot.clinicLookup?.safeQuery ?? ""} ${JSON.stringify(migrationAutopilot.clinicLookup?.publicLookupTargets ?? [])} ${JSON.stringify(migrationAutopilot.operatorPacket ?? {})} ${migrationAutopilot.privacyWarnings.join(" ")}`
    ),
    "migration autopilot must not echo patient identity into public clinic lookup fields or operator packet"
  );

  const migrationAutopilotReportResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot/report.csv",
    headers,
    payload: migrationAutopilotPayload
  });
  assert(migrationAutopilotReportResponse.statusCode === 200, `migration handoff report failed: ${migrationAutopilotReportResponse.statusCode}`);
  const reportDisposition = String(migrationAutopilotReportResponse.headers["content-disposition"] ?? "");
  assert(
    reportDisposition === 'attachment; filename="migration_autopilot_handoff.csv"',
    "migration handoff report filename must be static and safe"
  );
  assert(!/[\r\n]/.test(reportDisposition), "migration handoff report disposition must reject header injection shape");
  const migrationAutopilotReportCsv = migrationAutopilotReportResponse.body;
  assert(migrationAutopilotReportCsv.startsWith("\uFEFFsection;"), "migration handoff report must be a BOM-prefixed CSV");
  assert(migrationAutopilotReportCsv.includes("handoff_checklist"), "migration handoff report must include the handoff checklist");
  assert(migrationAutopilotReportCsv.includes("operator_script"), "migration handoff report must include the role-based operator script");
  assert(migrationAutopilotReportCsv.includes("dry_run"), "migration handoff report must include the dry-run effort summary");
  assert(migrationAutopilotReportCsv.includes("clinic_public_lookup_policy"), "migration handoff report must include public lookup policy");
  assert(migrationAutopilotReportCsv.includes("безопасная сводка миграции"), "migration handoff report must use clinic-readable Russian copy");
  assert(
    migrationAutopilotReportCsv.includes("В публичные сервисы отправляются только реквизиты клиники.") &&
      migrationAutopilotReportCsv.includes("Уберите эти данные перед поиском в картах, поиске или внешних сервисах."),
    "migration handoff report must explain online lookup boundaries in administrator language"
  );
  assert(
    !/Only clinic requisites|Run clinic public lookup|Remove forbidden data|Role script is written/i.test(migrationAutopilotReportCsv),
    "migration handoff report must not expose English implementation copy to clinic operators"
  );
  assert(migrationAutopilotReportCsv.includes("sourceFingerprint"), "migration handoff report must expose fingerprinted source references");
  assert(
    !/Ivan|Petrov|\+7 900|79001112233/.test(migrationAutopilotReportCsv),
    "migration handoff report must not leak patient identity from clinic lookup input"
  );
  assert(!migrationAutopilotReportCsv.includes(tempMigrationRoot), "migration handoff report must not leak raw local roots");
} finally {
  rmSync(tempMigrationRoot, { recursive: true, force: true });
}

const clinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    inn: "1234567890",
    clinicName: "Smile Clinic patient Ivan Petrov +7 900 111-22-33",
    address: "Samara, Lenina 1",
    medicalLicenseNumber: "L-63-01-123456"
  }
});
assert(clinicPublicLookup.statusCode === 200, `clinic public lookup failed: ${clinicPublicLookup.statusCode}`);
const clinicLookup = clinicPublicLookup.json();
assert(clinicLookup.providerStatus === "not_configured", "clinic public lookup smoke must not depend on an external API token");
assert(clinicLookup.safeQuery === "1234567890", "clinic public lookup must prefer sanitized INN as the safe query");
assert(
  clinicLookup.suggestions.some((suggestion) => suggestion.source === "manual_public_targets"),
  "clinic public lookup must return a manual sanitized suggestion when external API is not configured"
);
const manualClinicSuggestion = clinicLookup.suggestions.find((suggestion) => suggestion.source === "manual_public_targets");
assert(manualClinicSuggestion?.fields?.inn === "1234567890", "manual clinic lookup suggestion must keep sanitized clinic INN");
assert(manualClinicSuggestion?.fields?.clinicName === "Smile Clinic", "manual clinic lookup suggestion must cut patient tail from clinic name");
assert(
  clinicLookup.publicLookupTargets.some((target) => target.kind === "company_registry" && /egrul\.nalog\.ru/.test(target.url)),
  "clinic public lookup must include official FNS registry target"
);
assert(
  clinicLookup.publicLookupTargets.some((target) => target.kind === "medical_license_registry" && /roszdravnadzor\.gov\.ru/.test(target.url)),
  "clinic public lookup must include Roszdravnadzor license target"
);
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(`${clinicLookup.safeQuery} ${JSON.stringify(clinicLookup.publicLookupTargets)}`),
  "clinic public lookup must not echo patient identity into public requests"
);
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(JSON.stringify(clinicLookup.suggestions)),
  "clinic public lookup suggestions must not echo patient identity"
);

const russianClinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    inn: "6312345678",
    clinicName: "Смайл Клиник Пациент Иван Петров +7 900 111-22-33",
    address: "Самара, Победы 10 пациент Иван Петров +7 900 111-22-33"
  }
});
assert(russianClinicPublicLookup.statusCode === 200, `russian clinic public lookup failed: ${russianClinicPublicLookup.statusCode}`);
const russianClinicLookup = russianClinicPublicLookup.json();
const russianManualClinicSuggestion = russianClinicLookup.suggestions.find((suggestion) => suggestion.source === "manual_public_targets");
assert(
  russianManualClinicSuggestion?.fields?.clinicName === "Смайл Клиник",
  "manual clinic lookup suggestion must cut Russian patient tail from clinic name"
);
assert(
  russianManualClinicSuggestion?.fields?.address === "Самара, Победы 10",
  "manual clinic lookup suggestion must cut Russian patient tail from address"
);
assert(
  !/Иван|Петров|\+7 900|79001112233/.test(`${russianClinicLookup.safeQuery} ${JSON.stringify(russianClinicLookup.publicLookupTargets)} ${JSON.stringify(russianClinicLookup.suggestions)}`),
  "clinic public lookup must not echo Russian patient identity"
);

const noisyImagingClinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    clinicName: "Смайл Клиник КЛКТ ОПТГ DICOMDIR",
    address: "Самара, Победы 10 C:\\CBCT\\IMG0001.dcm рентген снимок patient Иван Петров +7 900 111-22-33"
  }
});
assert(noisyImagingClinicPublicLookup.statusCode === 200, `noisy imaging clinic public lookup failed: ${noisyImagingClinicPublicLookup.statusCode}`);
const noisyImagingClinicLookup = noisyImagingClinicPublicLookup.json();
const noisyImagingClinicLookupBlob = `${noisyImagingClinicLookup.safeQuery} ${JSON.stringify(noisyImagingClinicLookup.publicLookupTargets)} ${JSON.stringify(noisyImagingClinicLookup.suggestions)}`;
assert(/Смайл Клиник/.test(noisyImagingClinicLookup.safeQuery), "clinic public lookup must keep the clinic name after stripping imaging noise");
assert(/Самара.*Победы\s+10/.test(noisyImagingClinicLookup.safeQuery), "clinic public lookup must keep the clinic address after stripping imaging noise");
assert(
  !/КЛКТ|ОПТГ|DICOMDIR|CBCT|рентген|снимок|IMG0001|Иван|Петров|\+7 900|79001112233|C:\\/i.test(noisyImagingClinicLookupBlob),
  "clinic public lookup must strip imaging, local path, and patient noise before maps/search/API targets"
);

const embeddedRequisitesClinicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    clinicName: "ООО Смайл Дент ИНН 6312345678 КПП 631201001",
    address: "Самара, Победы 10 ОГРН 1236300000000 пациент Иван Петров +7 900 111-22-33"
  }
});
assert(embeddedRequisitesClinicLookup.statusCode === 200, `embedded requisites clinic public lookup failed: ${embeddedRequisitesClinicLookup.statusCode}`);
const embeddedClinicLookup = embeddedRequisitesClinicLookup.json();
const embeddedManualClinicSuggestion = embeddedClinicLookup.suggestions.find((suggestion) => suggestion.source === "manual_public_targets");
assert(embeddedClinicLookup.safeQuery === "6312345678", "clinic public lookup must extract labeled INN from pasted requisites fields");
assert(embeddedManualClinicSuggestion?.fields?.inn === "6312345678", "manual clinic lookup suggestion must keep INN pasted into clinic name");
assert(embeddedManualClinicSuggestion?.fields?.kpp === "631201001", "manual clinic lookup suggestion must keep KPP pasted into clinic name");
assert(embeddedManualClinicSuggestion?.fields?.ogrn === "1236300000000", "manual clinic lookup suggestion must keep OGRN pasted into address");
assert(
  embeddedClinicLookup.publicLookupTargets.some((target) => target.kind === "company_registry" && target.query === "6312345678"),
  "clinic public lookup must build official registry target from embedded INN"
);
assert(
  !/Иван|Петров|\+7 900|79001112233/.test(`${embeddedClinicLookup.safeQuery} ${JSON.stringify(embeddedClinicLookup.publicLookupTargets)} ${JSON.stringify(embeddedClinicLookup.suggestions)}`),
  "embedded requisites clinic public lookup must not echo patient identity"
);

const kppOnlyClinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    kpp: "631201001"
  }
});
assert(kppOnlyClinicPublicLookup.statusCode === 200, `KPP-only clinic public lookup failed: ${kppOnlyClinicPublicLookup.statusCode}`);
const kppOnlyClinicLookup = kppOnlyClinicPublicLookup.json();
const kppOnlyManualSuggestion = kppOnlyClinicLookup.suggestions.find((suggestion) => suggestion.source === "manual_public_targets");
assert(kppOnlyClinicLookup.safeQuery === "631201001", "clinic public lookup must allow KPP as a standalone clinic requisite");
assert(kppOnlyManualSuggestion?.fields?.kpp === "631201001", "manual clinic lookup suggestion must keep standalone KPP");

const riskyClinicLookupPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: {
    sourceName: "dirty clinic card",
    mode: "auto",
    rawText: "Клиника Белая улыбка address Samara, Lenina 1 INN 1234567890 patient Ivan Petrov +7 900 111-22-33"
  }
});
assert(riskyClinicLookupPreview.statusCode === 200, `risky clinic preview failed: ${riskyClinicLookupPreview.statusCode}`);
const riskyClinicLookup = riskyClinicLookupPreview.json();
assert(riskyClinicLookup.clinicSuggestion?.fields?.clinicName === "Клиника Белая улыбка", "dirty clinic line must keep clinic name");
assert(riskyClinicLookup.clinicSuggestion?.fields?.address === "Samara, Lenina 1", "dirty clinic line must keep clinic address");
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(riskyClinicLookup.clinicSuggestion?.fields?.address ?? ""),
  "dirty clinic line must cut patient tail from address"
);
assert(!riskyClinicLookup.clinicSuggestion?.fields?.phone, "dirty clinic line must not suggest a patient phone as clinic phone");
assert(riskyClinicLookup.publicLookupTargets.length > 0, "dirty clinic line must still prepare safe public lookup");
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(JSON.stringify(riskyClinicLookup.publicLookupTargets)),
  "dirty clinic public lookup targets must not echo patient identity"
);

const migrationReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: {
    sourceName: "migration cockpit",
    mode: "auto",
    rawText: [
      "Старая база C:\\Legacy\\clinic_2024.fdb",
      "Dental clinic Smile Center",
      "INN 1234567890 KPP 123456789",
      "Address: Samara, Lenina 1",
      "Ivan Petrov +7 900 111-22-33"
    ].join("\n")
  }
});
assert(migrationReport.statusCode === 200, `smart migration report failed: ${migrationReport.statusCode}`);
assert(migrationReport.body.includes("clinic_profile_suggestion"), "smart import report must include clinic suggestions");
assert(migrationReport.body.includes("public_lookup"), "smart import report must include public lookup rows");
assert(migrationReport.body.includes("legacy_source"), "smart import report must include legacy source rows");
assert(!/C:\\Legacy|clinic_2024\.fdb/i.test(migrationReport.body), "smart import report legacy source rows must not leak raw local DB paths");

console.log(
  JSON.stringify({
    ok: true,
    checked: "import contracts",
    patientRows: patientPreview.json().totalRows,
    contentDisposition: disposition
  })
);
