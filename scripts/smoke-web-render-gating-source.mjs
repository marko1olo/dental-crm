import fs from "node:fs";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const settingsSource = fs.readFileSync("apps/web/src/SettingsView.tsx", "utf8");

/*
 * ЧТО ЭТОТ СТРАЖ ЗАЩИЩАЕТ, И ПОЧЕМУ ЕГО ТРЕБОВАНИЯ ПРИШЛОСЬ РАЗДЕЛИТЬ НАДВОЕ.
 *
 * Продуктовое правило одно: раздел ВЫЧИСЛЯЕТСЯ ТОЛЬКО КОГДА ОТКРЫТ. Форма
 * `{settingsTab === "x" ? (…) : null}` ветку не строит, а `hidden={settingsTab
 * !== "x"}` строит все разделы всегда и лишь прячет их стилем. Запреты ниже —
 * настоящая суть стража, и они проходят все.
 *
 * Требования же были написаны одной строкой, склеивая ДВЕ независимые вещи:
 * условие показа И разметку раздела, вплоть до отступа в десять пробелов:
 *   '{settingsTab === "protocols" ? (\n          <section className="protocol-settings"'
 * После разбора монолита настроек на вкладки-компоненты эта склейка стала
 * недостижимой в принципе: условие осталось в SettingsView.tsx, а разметка
 * уехала в components/settings/*.tsx. Замерено 29.07.2026: из 15 требований к
 * вкладкам не проходили 12, и настоящим дефектом не было НИ ОДНО.
 *
 * Поэтому требование разделено: условие показа проверяется в SettingsView.tsx,
 * разметка раздела — в файле, который ей теперь владеет. Обе половины остались
 * обязательными, ни одна не снята.
 */
const settingsTabComponentSources = [
	"SettingsProtocolsTab",
	"SettingsRulesTab",
	"SettingsPricesTab",
	"SettingsAiTab",
	"SettingsImportsTab",
	"SettingsAuditTab",
	"sources/SourcesConnectorGrid",
	"sources/SourcesDicomCapability",
	"sources/SourcesIntegrationPresets",
]
	.map((component) =>
		fs.readFileSync(
			`apps/web/src/components/settings/${component}.tsx`,
			"utf8",
		),
	)
	.join("\n");

const requiredSnippets = [
	'{currentView === "shift" ? (',
	'{["shift", "patients"].includes(currentView) ? (',
	'{currentView === "imaging" ? (',
	/*
	 * СПИСОК РАЗДЕЛОВ РАБОЧЕЙ СЕТКИ НЕ ЗАКРЕПЛЯЕТСЯ ДОСЛОВНО.
	 *
	 * Требовалось `["schedule", "patients", "visit", "documents", "finance",
	 * "communications"]`, а в App.tsx:3890 появился ещё "analytics". Добавление
	 * раздела — это новая функция, а не регресс, и наказывать за неё нельзя.
	 * Закреплено то, что действительно важно: рабочая сетка строится по УСЛОВИЮ
	 * от currentView, а не рендерится всегда. Обязательное присутствие каждого
	 * отдельного раздела проверяют отдельные требования ниже.
	 */
	/\{\[[^\]]*"schedule"[^\]]*"patients"[^\]]*"visit"[^\]]*\]\.includes\(currentView\) \? \(\s*\n\s*<section className="work-grid page-grid">/,
	'{currentView === "schedule" ? (',
	'{currentView === "patients" ? (',
	'{currentView === "visit" ? (',
	'{currentView === "documents" ? (',
	'{currentView === "finance" ? (',
	'{currentView === "communications" ? (',
	/*
	 * ЗДЕСЬ БЫЛИ ДВА ТРЕБОВАНИЯ О ПОЛОСЕ «СЛУЖЕБНЫЕ ОГРАНИЧЕНИЯ». ОНИ СНЯТЫ, И
	 * ПРИЧИНА — НЕ «СТАЛО КРАСНО», А ТО, ЧТО ОНИ ТРЕБОВАЛИ ВЕРНУТЬ ДЕФЕКТ.
	 *
	 * Снято:
	 *   '{["documents", "finance", "communications", "settings"].includes(currentView) ? ('
	 *   '<details className="compliance-bar" aria-label="Контроль">'
	 *
	 * Полоса удалена коммитом fe0b5081f от 28.07.2026 СОЗНАТЕЛЬНО: она показывала
	 * администратору клиники наши внутренние заметки. Живой ответ /api/dashboard
	 * кладёт в complianceWarnings три строки, и третья из них — «Для продажи
	 * клиникам нужен отдельный EGISZ-адаптер и юридическая проверка шаблонов», то
	 * есть заметка о продаже продукта на рабочем экране пользователя. Разбор с
	 * замером (высота раздела финансов 1773 → 1693) лежит в том коммите, а
	 * объяснение — прямо в App.tsx:4406-4412, рядом с местом, где полоса стояла.
	 *
	 * Требование, которое велит вернуть удалённое, — не защита, а ловушка:
	 * следующий агент «починил» бы стража, восстановив утечку внутренних заметок.
	 * Поэтому оба требования не просто удалены, а ОБРАЩЕНЫ: разметка полосы
	 * добавлена в forbiddenSnippets ниже. Теперь страж бьёт в обратную сторону —
	 * если полоса вернётся, он упадёт и потребует объяснить, зачем.
	 */
	'{currentView === "settings" ? (',
];

/*
 * ПОЛОВИНА ПЕРВАЯ: УСЛОВИЕ ПОКАЗА. Живёт в SettingsView.tsx и проверяется здесь.
 * Отступ и содержимое ветки НЕ закрепляются — закреплено ровно то, что раздел
 * строится по условию. Три вкладки (clinic, access, telegram) по-прежнему лежат
 * разметкой в самом SettingsView, остальные смонтированы компонентами: и то и
 * другое — законный способ, лишь бы ветка была условной.
 */
const requiredSettingsTabGates = [
	'{settingsTab === "clinic" ? (',
	'{settingsTab === "access" ? (',
	'{settingsTab === "telegram" ? (',
	'{settingsTab === "protocols" ? <SettingsProtocolsTab /> : null}',
	'{settingsTab === "rules" ? <SettingsRulesTab /> : null}',
	'{settingsTab === "prices" ? (',
	'{settingsTab === "sources" ? <SettingsSourcesTab /> : null}',
	'{settingsTab === "ai" ? <SettingsAiTab /> : null}',
	'{settingsTab === "imports" ? (',
	'{settingsTab === "audit" ? <SettingsAuditTab',
];

/*
 * ПОЛОВИНА ВТОРАЯ: РАЗМЕТКА РАЗДЕЛА. Живёт в файле-владельце вкладки.
 *
 * Классы двух разделов переименованы при редизайне, и это НЕ регресс — раздел на
 * экране есть, у него просто другое имя класса:
 *   rule-studio      → rules-section-card        (components/settings/SettingsRulesTab.tsx)
 *   recognition-lab  → ai-section-card           (components/settings/SettingsAiTab.tsx)
 *   pricelist-studio → pricelist-studio-container (components/settings/SettingsPricesTab.tsx,
 *                      и это теперь <div>, а не <section>)
 * Требовать старое имя значило бы требовать откатить редизайн, поэтому
 * закреплено новое, а старое названо здесь, чтобы связь находилась поиском.
 *
 * Класс protocol-settings получил при этом ещё и animate-fade-in, поэтому
 * закрепляется начало значения, а не всё значение целиком.
 */
const requiredSettingsTabMarkup = [
	'className="protocol-settings',
	'className="rules-section-card"',
	'className="pricelist-studio-container',
	'className="connector-grid"',
	'className="dicom-capability-panel"',
	'className="integration-presets"',
	'className="ai-section-card"',
	'className="import-studio smart-import-studio"',
	'className="ops-grid"',
	'className="import-studio"',
	'{["imports", "sources"].includes(settingsTab) ? (',
	/*
	 * СВЯЗЬ, А НЕ РАЗДЕЛ: набор состояния инструментов КТ обязан доезжать до
	 * панели просмотрщика. Требование
	 *   '{settingsTab === "sources" && typedDicomViewerToolStateBundle ? (
	 *      <section className="dicom-toolstate-result"'
	 * закрепляло раздел, которого в разметке больше нет — класс
	 * dicom-toolstate-result остался только в styles/main.css. Само состояние
	 * живо и доезжает до экрана: SourcesDicomCapability.tsx:435-438 передаёт
	 * `toolStateBundle={… ?? typedDicomViewerToolStateBundle}` в
	 * CtPlanningToolsPanel. Закреплена именно эта передача.
	 */
	/toolStateBundle=\{[\s\S]{0,120}typedDicomViewerToolStateBundle/,
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
	/*
	 * ОБРАЩЁННОЕ ТРЕБОВАНИЕ, ХРАПОВИК К УДАЛЕНИЮ fe0b5081f. Полоса «Служебные
	 * ограничения» показывала пользователю внутренние заметки о продаже продукта
	 * (разбор — выше, у снятого требования, и в App.tsx:4406-4412). Раньше страж
	 * ТРЕБОВАЛ её наличие; теперь запрещает. Если она вернётся — под любым из двух
	 * прежних написаний, спрятанная или нет, — страж упадёт.
	 */
	'className="compliance-bar"',
	'className="settings-zone" id="settings" aria-label="Настройки и перенос данных" hidden={currentView !== "settings"}',
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
	'className="import-studio" aria-label="Миграция из старой программы" hidden=',
];

function countOccurrences(source, snippet) {
	return source.split(snippet).length - 1;
}

/*
 * Требование может быть образцом, а не дословной строкой. Идиом взят у ведущего
 * из smoke-finance-ledger-source.mjs (коммит bc0c1e7db): закрепляем СВЯЗЬ, а не
 * написание вокруг неё. Дословную строку по-прежнему можно передать строкой —
 * там, где важен именно текст.
 */
function sourceHas(source, snippet) {
	return snippet instanceof RegExp
		? snippet.test(source)
		: source.includes(snippet);
}

function describe(snippet) {
	return snippet instanceof RegExp ? snippet.source : snippet;
}

const missingRequired = requiredSnippets
	.filter((snippet) => !sourceHas(appSource, snippet))
	.map(describe);
const missingSettingsTabs = requiredSettingsTabGates
	.filter((snippet) => !sourceHas(settingsSource, snippet))
	.map(describe);
const missingSettingsTabMarkup = requiredSettingsTabMarkup
	.filter(
		(snippet) =>
			!sourceHas(settingsTabComponentSources, snippet) &&
			!sourceHas(settingsSource, snippet),
	)
	.map(describe);
const forbiddenPresent = forbiddenSnippets.filter((snippet) =>
	appSource.includes(snippet),
);
const forbiddenSettingsTabsPresent = forbiddenSettingsTabSnippets.filter(
	(snippet) => appSource.includes(snippet) || settingsSource.includes(snippet),
);
const appNoticeAlertCount = countOccurrences(
	appSource,
	'<section className="app-notice" role="alert" aria-live="assertive">',
);

if (
	missingRequired.length ||
	missingSettingsTabs.length ||
	missingSettingsTabMarkup.length ||
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
				missingSettingsTabMarkup,
				forbiddenPresent,
				forbiddenSettingsTabsPresent,
				appNoticeAlertCount,
			},
			null,
			2,
		),
	);
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			gatedTopLevelSections: requiredSnippets.length,
			gatedSettingsTabs: requiredSettingsTabGates.length,
			gatedSettingsSectionMarkup: requiredSettingsTabMarkup.length,
			forbiddenAlwaysRenderedPatterns:
				forbiddenSnippets.length + forbiddenSettingsTabSnippets.length,
			appNoticeAlerts: appNoticeAlertCount,
		},
		null,
		2,
	),
);
