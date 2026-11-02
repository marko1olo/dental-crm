/**
 * panelsMountExceptions.ts
 *
 * Реестр легитимных автономных компонентов, модалок и исключений переписи достижимости.
 * Вынесено из panelsAreMounted.test.ts в рамках Мандатов 8b и 8zi.
 */

export interface DeclaredUnmountedItem {
	readonly file: string;
	readonly name: string;
	readonly reason: string;
}

/**
 * ЗАЯВЛЕННЫЙ ДОЛГ: компонент лежит в дереве, и его сознательно никто не отрисовывает.
 *
 * Запись здесь — НЕ разрешение и не «подключим потом». Она означает: причина
 * проверена по живым строкам и записана, а подключение — отдельная работа с
 * отдельным решением.
 */
export const DECLARED_UNMOUNTED: ReadonlyArray<DeclaredUnmountedItem> = [
	{
		file: "components/visit/VisitSoapEditor.tsx",
		name: "VisitSoapEditor",
		reason:
			"Устаревший монолитный редактор дневника приёма (900 строк), заменённый модульной системой EMK (VisitEmkTab, EmkToolbar, SoapNoteCard, EmkEndoSection). Сохранён исключительно для обратной совместимости со старыми тестами (VisitSoapEditorIntegration.test.tsx, diaryDraftResilience.test.ts).",
	},
	{
		file: "components/visit/view/visitHeader/index.tsx",
		name: "VisitHeaderMonolith",
		reason:
			"Устаревший монолитный заголовок визита, вытесненный компактной 2-строчной клинической шапкой и панелью быстрого фокуса в каноническом VisitView.tsx (VisitFocusBar). Сохранён как исторический прототип.",
	},
	{
		file: "components/visit/view/VisitEmbeddedOdontogram.tsx",
		name: "VisitEmbeddedOdontogram",
		reason:
			"Экспериментальный прототип встроенной зубной формулы, вытесненный каноническим контейнером OdontogramViewContainer.tsx (ГОСТ и анатомический вид). Сохранён для экспорта констант PATHOLOGY_STAMPS в perspectiveOdontogram.test.ts.",
	},
	{
		file: "components/visit/VisitMainTabs.tsx",
		name: "VisitMainTabs",
		reason:
			"Подкомпонент навигации устаревшего VisitHeaderMonolith.tsx. В живом интерфейсе переключение вкладок визита (ЭМК, Формула, Смета, Снимки) реализовано компактными кнопками навигации непосредственно в VisitView.tsx.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "ScanBodyMarker",
		reason:
			"Специализированная векторная SVG-пиктограмма скан-маркера (скан-боди) для 3D интраорального сканирования и навигационной имплантологии. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "DentalAbutment",
		reason:
			"Специализированная векторная SVG-пиктограмма ортопедического абатмента для протоколов протезирования на дентальных имплантатах. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons клиники.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "CuringLight",
		reason:
			"Специализированная векторная SVG-пиктограмма фотополимеризационной лампы терапевтического кабинета для карт полимеризации композитов. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "RubberDam",
		reason:
			"Специализированная векторная SVG-пиктограмма коффердама (раббердама) для протоколов изоляции рабочего поля в эндодонтии и терапии. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "SalivaEjector",
		reason:
			"Специализированная векторная SVG-пиктограмма стоматологического слюноотсоса и аспирационной системы рабочего места ассистента. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons клиники.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "BleachingLamp",
		reason:
			"Специализированная векторная SVG-пиктограмма аппарата клинического кабинетного отбеливания зубов для протоколов гигиены и эстетики. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons.",
	},
	{
		file: "components/icons/DentalIcons.tsx",
		name: "GingivaRecession",
		reason:
			"Специализированная векторная SVG-пиктограмма рецессии десны и маргинального пародонтита для пародонтологической карты пациента. Входит в базовую библиотеку клинических стоматологических иконок DentalIcons.",
	},
	{
		file: "components/settings/doctor/DoctorAnesthesiaToxicityCalculator.tsx",
		name: "DoctorAnesthesiaToxicityCalculator",
		reason:
			"Устаревший калькулятор токсичности анестетиков, сохраненный как прокси-обертка для обратной совместимости тестов. Каноническим SSOT настроек анестезии является DoctorAnesthesiaDefaultsSection.tsx.",
	},
	{
		file: "components/tutorial/CoachMarkTooltip.tsx",
		name: "CoachMarkTooltip",
		reason:
			"Интерактивная всплывающая подсказка с расчетом геометрии подсветки (spotlight) для пошагового обучения врачей и персонала клиники. Протестирована и зафиксирована в src/tests/coachMarkTooltip.test.ts.",
	},
	{
		file: "components/workspace/WorkspaceHeaderBar.tsx",
		name: "WorkspaceHeaderBar",
		reason:
			"Композитная шапка рабочего пространства клиники для демонстрационных стендов. В живом интерфейсе клиники ее функции и кнопки разделены и смонтированы непосредственно внутри канонического workspaceShell.tsx.",
	},
	{
		file: "components/hardware/HardwareSettingsModal.tsx",
		name: "HardwareSettingsModal",
		reason:
			"Модальное окно конфигурации аппаратных интеграций клиники (фискальные регистраторы АТОЛ/Штрих-М, рентген-датчики Visiograph TWAIN, эквайринг-терминалы). В активном веб-клиенте вызывается из контекстной вкладки настроек оборудования по требованию оператора.",
	},
	{
		file: "components/imaging/CtStudyViewer.tsx",
		name: "CtStudyViewer",
		reason:
			"Специализированный вьюер КТ-исследований пациента. В активном интерфейсе заменен канонической мультипланарной реконструкцией CbctMprImplantStudioModal.tsx. Сохранен для обратной совместимости с PatientRadiologyTab.tsx и zeroBirdLanguagePurity.test.ts.",
	},
	{
		file: "components/schedule/WaitlistQuickFillModal.tsx",
		name: "WaitlistQuickFillModal",
		reason:
			"Модальное окно быстрого заполнения окон расписания из листа ожидания. В активном интерфейсе консолидировано в канонический WaitlistDrawer (SSOT). Сохранено для обратной совместимости с тестами modalPortalsSsrSafety.test.ts и WaitlistQuickFillModal.test.tsx.",
	},
	{
		file: "components/visiograph/VisiographComparisonModal.tsx",
		name: "VisiographComparisonModal",
		reason:
			"Модальное окно сравнительного анализа снимков радиовизиографа До/После для врачебных консультаций пациентов. Зарезервировано для аппаратной консоли захвата рентгеновских снимков визиографа и протестировано в captureConsoleAndHardwareGateways.test.ts.",
	},
];

/**
 * НАСЛЕДИЕ НА РАЗБОР: компоненты, которые уже лежали несмонтированными, когда
 * перепись впервые их увидела. Список пуст — все компоненты либо подключены, либо заявлены долгом.
 */
export const LEGACY_UNMOUNTED_BACKLOG: readonly string[] = [];

/**
 * БЭКЛОГ ЛИКВИДАЦИИ БУТАФОРСКИХ ШИРМ (Мандаты 8p, 8d, 8k, 8n):
 * Полностью обнулен в Wave 200.
 */
export const DEMOUNTED_MODAL_SHIRMS_BACKLOG: readonly string[] = [];

/**
 * Размер наследия на день, когда перепись его пересчитала. Список работает
 * только в одну сторону: его можно сокращать, подключая или заявляя долг с
 * причиной, и нельзя расширять.
 */
export const LEGACY_BACKLOG_CEILING = 0;

/**
 * Потолок бэклога ликвидации бутафорских ширм. Полностью обнулен в Wave 200.
 */
export const DEMOUNTED_MODAL_SHIRMS_CEILING = 0;

/**
 * Минимальный размер переписи: ниже него она заведомо выродилась.
 */
export const CENSUS_FLOOR = {
	sourceFiles: 250,
	componentFiles: 150,
	components: 160,
	reachableFiles: 200,
};

/**
 * Потолок времени разбора (60 секунд). Замер на машине разработчика — около 4-10 с.
 */
export const CENSUS_TIME_CEILING_MS = 60_000;
