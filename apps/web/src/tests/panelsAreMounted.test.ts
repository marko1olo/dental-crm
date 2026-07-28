import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	componentReachability,
	isMounted,
	webSrcRoot,
} from "./utils/componentReachability";

/**
 * Страж: панель или раздел, которых никто не отрисовывает, — это несделанная работа.
 *
 * ЧТО СЛУЧИЛОСЬ В ПЕРВЫЙ РАЗ. Панель утреннего обзвона и панель отчётов
 * руководителю были добавлены в AppRouter.tsx. Файл выглядел как маршрутизатор
 * приложения: импортировал представления, переключал их по currentView, лежал
 * рядом с App.tsx. Его НЕ ИМПОРТИРОВАЛ НИКТО — разделы отрисовывает App.tsx.
 * Обе панели прошли typecheck, прошли сборку, прошли тесты оформления — и не
 * появлялись на экране вообще. Выяснилось только на снимке живого приложения,
 * то есть могло не выясниться никогда.
 *
 * ЧТО СЛУЧИЛОСЬ ВО ВТОРОЙ РАЗ, ХОТЯ ЭТОТ ФАЙЛ УЖЕ СУЩЕСТВОВАЛ. Той же дорогой
 * ушли три целых раздела: склад (1487 строк), журнал стерилизации и воронка
 * обращений. Они были подключены только в том же мёртвом AppRouter.tsx, а в
 * реестре workspaceShell.appViews их не было — значит, и по адресу #inventory
 * приложение откатывалось на «Смену».
 *
 * ЧТО СЛУЧИЛОСЬ В ТРЕТИЙ РАЗ. Из PatientsView.tsx вынесли пять форм, в тот же
 * день удалили как мёртвый код, а следующий слепой `chore: sync` вернул в дерево
 * две. Одна из вернувшихся была НАДМНОЖЕСТВОМ смонтированной: пять полей
 * реквизитов существовали в схеме, в колонке, в черновике, в запросе и в
 * валидаторе, а ввести их было нечем ни на одном экране. Прежняя редакция этого
 * стража проверяла ПОИМЁННЫЙ список из семи панелей — перечень этих имён не
 * знал, и искать было нечего.
 *
 * ПОЧЕМУ ТЕПЕРЬ ПЕРЕПИСЬ, А НЕ СПИСОК. Поимённый список структурно не способен
 * заметить файл, которого в списке нет, — а именно так дефект приходит каждый
 * раз. Здесь берётся полная перепись компонентов
 * (tests/utils/componentReachability.ts, разбор @babel/parser) и проверяется
 * обратное утверждение: НИ ОДИН компонент apps/web/src не остаётся
 * несмонтированным, кроме прямо перечисленных ниже. Семь бывших имён списка
 * покрыты этим утверждением как частный случай.
 *
 * ЧЕМ ЭТО ЗАМЕНИЛО ВНЕШНЕГО СТРАЖА. В дереве жил третий владелец того же
 * инварианта — scripts/check-component-mount-reachability.mjs с правилами
 * ast-grep. Он удалён вместе с правилами и своим тестом, и вот почему:
 *   1. перепись у него была ложной по построению. Шаблон
 *      `export const $NAME = ($$$PARAMS) => $$$BODY` не совпадает, если на имени
 *      стоит аннотация типа, а `export const X: React.FC = () => {}` — вторая по
 *      частоте форма в этом дереве (34 объявления на день удаления). Он не видел ни
 *      pages/PublicBookingWidget.tsx, ни components/plan/ComparativePlannerDashboard.tsx
 *      — ровно те две сироты, что нашлись руками;
 *   2. пустая причина в его списке исключений гасила нарушение: объект записи
 *      был проверкой на истинность, а сама причина не проверялась, и
 *      `{ path: "apps/web/src", reason: "" }` четырьмя строками глушил все
 *      нарушения сразу, потому что путь сравнивался по префиксу;
 *   3. он не был подключён ни к одному гейту — ни в package.json, ни в CI, а его
 *      собственный тест шёл 4 м 33 с и не запускался ничем.
 * Проверка ниже живёт внутри `npm test -w @dental/web`, разбирает всё дерево за
 * секунды (замер печатается тестом «перепись не выродилась») и сравнивает пути
 * ЦЕЛИКОМ, а не по префиксу: запись про один файл не может погасить другой.
 *
 * Раздел живёт ровно в трёх местах, и все три обязательны:
 *   workspaceShell.appViews  — иначе viewFromHash() не пустит по адресу;
 *   App.tsx currentView === — иначе открывать нечего;
 *   workspacePreload.ts      — иначе Vite грузит модуль на лету, с прыжком вёрстки.
 */

/** Ключ компонента в переписи: путь от apps/web/src и имя объявления. */
function keyOf(component: { readonly file: string; readonly name: string }): string {
	return `${component.file}:${component.name}`;
}

/**
 * ЗАЯВЛЕННЫЙ ДОЛГ: компонент лежит в дереве, и его сознательно никто не
 * отрисовывает.
 *
 * Запись здесь — НЕ разрешение и не «подключим потом». Она означает: причина
 * проверена по живым строкам и записана, а подключение — отдельная работа с
 * отдельным решением. Общая причина вроде «нужно доработать» здесь хуже, чем
 * отсутствие записи: она гасит стража, ничего не сообщая. Тест ниже требует,
 * чтобы причина была непустой и содержательной, чтобы файл существовал и чтобы
 * компонент действительно оставался несмонтированным.
 */
const DECLARED_UNMOUNTED: ReadonlyArray<{
	readonly file: string;
	readonly name: string;
	readonly reason: string;
}> = [
	{
		file: "components/plan/ComparativePlannerDashboard.tsx",
		name: "ComparativePlannerDashboard",
		reason:
			"Сравнительный конструктор смет: несколько альтернативных планов рядом, " +
			"покрытие ДМС, жизненный цикл «утвердить / архивировать / восстановить», " +
			"печать и выгрузка CSV. Адреса на сервере рабочие " +
			"(GET/POST /api/patients/:patientId/treatment-plans, GET /api/insurance/contracts), " +
			"и он единственный читатель очереди pendingPlanSuggestions, которую наполняет " +
			"смонтированная зубная формула, — то есть мост «диагноз → смета» сейчас оборван. " +
			"Подключать всё равно нельзя, осталось три проверенных блокера:\n" +
			"1. Смена статуса плана (updatePlanStatus, :243) отправляет запрос без названия, " +
			"а серверная схема apps/api/src/routes/odontogram.ts:120-125 не знает поля status " +
			"вообще и подставляет name по умолчанию «Комплексный план лечения». Каждая кнопка " +
			"статуса молча ПЕРЕИМЕНОВЫВАЕТ план и статус не сохраняет.\n" +
			"2. Статус в базе хранится строчными (schema.ts:1404, default «draft»), а экран " +
			"сравнивает с «Draft» (:48, :120, :976-980, :1241): у загруженного плана не видно " +
			"ни подписи статуса, ни кнопок жизненного цикла.\n" +
			"3. Полис ДМС берётся первым из списка договоров клиники (contractsArray[0], :227) " +
			"и применяется любому пациенту, хотя связи «пациент → договор» в схеме нет: " +
			"пациенту могут назвать скидку по чужому полису.\n" +
			"Денежный блокер снят коммитом a37f358aa: пять захардкоженных сумм и чтение " +
			"несуществующего поля priceRub вместо basePriceRub убраны, расчёт вынесен в " +
			"components/plan/planPricing.ts и закреплён src/tests/planPricing.test.ts. " +
			"Вдобавок точка монтирования и POST-адрес общие с TreatmentEstimator, который уже " +
			"смонтирован в components/odontogram/OdontogramModule.tsx, — разграничение двух " +
			"планировщиков решает ведущий, а не этот файл.",
	},
	{
		file: "pages/PublicBookingWidget.tsx",
		name: "PublicBookingWidget",
		reason:
			"Онлайн-запись пациента с сайта клиники: три шага (врач → дата и свободное " +
			"время → ФИО, телефон, комментарий), состояния загрузки, ошибки и пустоты на " +
			"каждом шаге, человеческий текст вместо кодов, разбор 409 «время только что " +
			"заняли» с возвратом на выбор времени и перезапросом слотов, дата собирается по " +
			"МЕСТНОМУ времени пациента (иначе ночью в UTC+4 клиника выглядела закрытой). " +
			"Адреса на сервере живые: apps/api/src/server.ts:457 регистрирует префикс " +
			"/api/public/booking, и apps/api/src/tests/webCallsExistingRoutes.test.ts:110 " +
			"держит его в списке зарегистрированных. Удалять работающую функцию, которую " +
			"продукт хочет, ради зелёного стража нельзя.\n" +
			"Почему не подключён: это ЕДИНСТВЕННЫЙ экран приложения, который открывает " +
			"ПАЦИЕНТ, а не клиника, и второго контура для него в сборке нет. У apps/web одна " +
			"точка входа (apps/web/index.html), в vite.config.ts задан только manualChunks " +
			"без rollupOptions.input, а main.tsx:33-39 сначала вызывает installApiAuthFetch() " +
			"— он подставляет токен кабинета и сотрудника во все запросы к /api/ — и лишь " +
			"потом безусловно рендерит AppShell, то есть рабочее место клиники. Смонтировать " +
			"виджет внутрь этого же контура значит либо отдать пациенту клиничеcкий токен, " +
			"либо завести вторую точку входа Vite, либо развилку по адресу до AppShell. " +
			"Любой из трёх вариантов — решение об архитектуре публичного контура и о том, " +
			"какие данные клиники видны анонимному посетителю; такое решение принимает " +
			"ведущий, и оно правится не в этом файле, а в main.tsx / AppShell.tsx / " +
			"vite.config.ts, которые в это задание не входят.",
	},
];

/**
 * НАСЛЕДИЕ НА РАЗБОР: компоненты, которые уже лежали несмонтированными, когда
 * перепись впервые их увидела.
 *
 * ЗАЧЕМ ЭТО ОТДЕЛЬНЫЙ СПИСОК, А НЕ ТОТ ЖЕ. Здесь СОЗНАТЕЛЬНО НЕТ поля причины.
 * Тридцать три ненаписанных причины были бы отпиской на тридцать три строки, а
 * отписка гасит стража ровно так же, как пустая строка в удалённом внешнем
 * страже. Список говорит правду: эти файлы никто не разбирал. Он существует
 * только для того, чтобы СЛЕДУЮЩАЯ сирота не спряталась среди старых, и он
 * работает в одну сторону — тест ниже запрещает ему расти. Новый
 * несмонтированный компонент идёт в DECLARED_UNMOUNTED с проверенной причиной
 * либо подключается; дописать его сюда нельзя.
 *
 * Что здесь видно из самой переписи, без дополнительных утверждений:
 * десять записей components/workspace/onboarding/** и OnboardingSetupWizard.tsx —
 * это ОДНА ветка: её корень OnboardingPreview.tsx не импортирует никто, и всё
 * поддерево висит на нём. Отдельный владелец есть у
 * components/documents/DocumentUkepSignButton.tsx — он записан исключением с
 * причиной в src/tests/documentsViewDecomposition.test.ts, и обе проверки теперь
 * говорят о нём одно и то же.
 */
const LEGACY_UNMOUNTED_BACKLOG: readonly string[] = [
	"GuestLabPortal.tsx:GuestLabPortal",
	"OnboardingPreview.tsx:OnboardingPreview",
	"components/AudioWaveform.tsx:AudioWaveform",
	"components/Badge.tsx:Badge",
	"components/HelpHUD.tsx:HelpHUD",
	"components/Odontogram.tsx:Odontogram",
	"components/QrGatewayPanel.tsx:QrGatewayPanel",
	"components/TourEngine.tsx:TourEngine",
	"components/crm/CustomCrmTaskTypesWidget.tsx:CustomCrmTaskTypesWidget",
	"components/dicom/DicomToolbar.tsx:DicomToolbar",
	"components/dicom/ViewportOverlays.tsx:ViewportOverlays",
	"components/documents/DocumentUkepSignButton.tsx:DocumentUkepSignButton",
	"components/integrations/DadataGeocodedAddressesWidget.tsx:DadataGeocodedAddressesWidget",
	"components/integrations/LandingFieldMappingsWidget.tsx:LandingFieldMappingsWidget",
	"components/marketing/FamilyRecommendationSourcesWidget.tsx:FamilyRecommendationSourcesWidget",
	"components/settings/LegacyMigrationStudio.tsx:LegacyMigrationStudio",
	"components/settings/SingleSessionEnforcementsWidget.tsx:SingleSessionEnforcementsWidget",
	"components/settings/SmartImportStudio.tsx:SmartImportStudio",
	"components/visit/DoctorDesktopHeader.tsx:DoctorDesktopHeader",
	"components/visit/VisitDictation.tsx:VisitDictation",
	"components/workspace/OnboardingSetupWizard.tsx:OnboardingSetupWizard",
	"components/workspace/onboarding/steps/Step1Specializations.tsx:Step1Specializations",
	"components/workspace/onboarding/steps/Step2Infrastructure.tsx:Step2Infrastructure",
	"components/workspace/onboarding/steps/Step3Modules.tsx:Step3Modules",
	"components/workspace/onboarding/steps/Step4Branding.tsx:Step4Branding",
	"components/workspace/onboarding/steps/Step5Staff.tsx:Step5Staff",
	"components/workspace/onboarding/steps/Step6Legal.tsx:Step6Legal",
	"components/workspace/onboarding/steps/Step7Migration.tsx:Step7Migration",
	"components/workspace/onboarding/ui/SharedOnboardingUI.tsx:GlassCard",
	"components/workspace/onboarding/ui/SharedOnboardingUI.tsx:SliderControl",
	"components/workspace/shift/RoleFocusStrip.tsx:RoleFocusStrip",
	"components/workspace/shift/ShiftIntelligence.tsx:ShiftIntelligence",
];

/**
 * Размер наследия на день, когда перепись его пересчитала. Список работает
 * только в одну сторону: его можно сокращать, подключая или заявляя долг с
 * причиной, и нельзя расширять. Без этого числа список стал бы той самой
 * лазейкой, из-за которой удалён внешний страж.
 */
const LEGACY_BACKLOG_CEILING = 32;

/** Минимальный размер переписи: ниже него она заведомо выродилась. */
const CENSUS_FLOOR = {
	sourceFiles: 250,
	componentFiles: 150,
	components: 170,
	reachableFiles: 200,
};

/**
 * Потолок времени разбора. Замер на машине разработчика — около 4 с на 314
 * файлов; удалённый внешний страж на той же задаче шёл 4 м 33 с, потому что
 * поднимал подпроцесс ast-grep. Потолок стоит с запасом на медленный диск и
 * ловит именно возврат к процессу-на-файл, а не обычный разброс.
 */
const CENSUS_TIME_CEILING_MS = 60_000;

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

/**
 * Реестр разделов читается из исходника, а не импортируется: страж обязан
 * работать и тогда, когда workspaceShell.tsx не собирается — именно в такой
 * момент в него и добавляют раздел наугад.
 */
function registeredAppViews(): string[] {
	const source = readSource("workspaceShell.tsx");
	const declaration = /export const appViews = \[([^\]]*)\] as const;/.exec(source)?.[1] ?? "";
	assert.ok(
		declaration,
		"В workspaceShell.tsx не найдено объявление `export const appViews = [...] as const;` — " +
			"реестр разделов переехал или переименован, и этот страж больше ничего не охраняет",
	);
	const views = [...declaration.matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
	assert.ok(views.length >= 11, `реестр разделов разобран неполно: ${views.length} записей`);
	return views;
}

test("перепись компонентов не выродилась и не поднимает процесс на файл", () => {
	const census = componentReachability();

	assert.equal(
		census.parsedFiles,
		census.scannedFiles,
		`разобрано ${census.parsedFiles} файлов из ${census.scannedFiles}. Пропущенный файл — дырка ` +
			"в переписи, а перепись с дыркой хуже отсутствующей: она выдаёт зелёный на непроверенном",
	);
	assert.ok(
		census.scannedFiles >= CENSUS_FLOOR.sourceFiles,
		`в apps/web/src найдено ${census.scannedFiles} исходников — обход дерева сломался`,
	);
	assert.ok(
		census.componentFiles >= CENSUS_FLOOR.componentFiles,
		`файлов с компонентами найдено ${census.componentFiles} — разбор объявлений сломался, ` +
			"и проверка ниже пройдёт, ничего не проверив",
	);
	assert.ok(
		census.verdicts.length >= CENSUS_FLOOR.components,
		`компонентов найдено ${census.verdicts.length} — разбор объявлений сломался. Именно так ` +
			"промолчал удалённый внешний страж: его шаблон не видел форму `export const X: React.FC`",
	);
	assert.ok(
		census.reachableFiles.size >= CENSUS_FLOOR.reachableFiles,
		`от ${census.entry} достижимо ${census.reachableFiles.size} файлов — обход импортов сломался, ` +
			"и тогда несмонтированным окажется всё дерево",
	);
	assert.ok(
		census.wallClockMs < CENSUS_TIME_CEILING_MS,
		`перепись заняла ${census.wallClockMs} мс. Столько стоит только процесс на каждый файл — ` +
			"ровно из-за этого предыдущий страж шёл 4 м 33 с и его никто не запускал",
	);

	// Замер печатается, чтобы стоимость гейта была видна, а не предполагалась.
	console.log(
		`перепись: ${census.scannedFiles} файлов, ${census.verdicts.length} компонентов, ${census.wallClockMs} мс`,
	);
});

test("ни один компонент apps/web/src не остаётся несмонтированным незаявленно", () => {
	const census = componentReachability();

	const declaredKeys = new Set(DECLARED_UNMOUNTED.map((debt) => keyOf({ file: debt.file, name: debt.name })));
	const knownKeys = new Set([...declaredKeys, ...LEGACY_UNMOUNTED_BACKLOG]);

	const measured = census.verdicts.filter((verdict) => !isMounted(verdict.state));
	const measuredKeys = new Set(measured.map(keyOf));

	const appeared = measured
		.filter((verdict) => !knownKeys.has(keyOf(verdict)))
		.map((verdict) => `${verdict.file}:${verdict.line} ${verdict.name} [${verdict.state}] ${verdict.detail}`)
		.sort();

	assert.deepEqual(
		appeared,
		[],
		`Компонент существует, и пользователь его увидеть не может:\n  ${appeared.join("\n  ")}\n` +
			"Такой файл проходит typecheck, сборку и все остальные тесты, а на экране его нет — так " +
			"дважды терялись готовые разделы и полтора года пролежала форма реквизитов, которая умела " +
			"больше смонтированной. Выхода два: отрисовать компонент из модуля, достижимого от main.tsx, " +
			"или внести его в DECLARED_UNMOUNTED вместе с проверенной причиной. Дописывать в " +
			"LEGACY_UNMOUNTED_BACKLOG нельзя — он только сокращается.",
	);

	const stale = [...knownKeys].filter((key) => !measuredKeys.has(key)).sort();
	assert.deepEqual(
		stale,
		[],
		`Компонент записан несмонтированным, но перепись его так уже не видит: ${stale.join(", ")}. ` +
			"Либо его подключили — тогда уберите строку, иначе страж перестаёт следить за этим файлом и " +
			"следующая поломка монтирования пройдёт молча; либо файл или объявление переименовали — " +
			"тогда поправьте строку, потому что сейчас она охраняет несуществующее имя.",
	);
});

test("список наследия только сокращается", () => {
	assert.ok(
		LEGACY_UNMOUNTED_BACKLOG.length <= LEGACY_BACKLOG_CEILING,
		`в LEGACY_UNMOUNTED_BACKLOG ${LEGACY_UNMOUNTED_BACKLOG.length} записей при потолке ` +
			`${LEGACY_BACKLOG_CEILING}. Этот список — не место для новой сироты: у него нет поля причины, ` +
			"и запись в нём означает «никто не разбирал». Новый несмонтированный компонент идёт в " +
			"DECLARED_UNMOUNTED с причиной либо подключается.",
	);

	const duplicated = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key, index) => LEGACY_UNMOUNTED_BACKLOG.indexOf(key) !== index,
	);
	assert.deepEqual(duplicated, [], `в LEGACY_UNMOUNTED_BACKLOG повторы: ${duplicated.join(", ")}`);

	const declaredKeys = new Set(DECLARED_UNMOUNTED.map((debt) => keyOf({ file: debt.file, name: debt.name })));
	const inBothLists = LEGACY_UNMOUNTED_BACKLOG.filter((key) => declaredKeys.has(key));
	assert.deepEqual(
		inBothLists,
		[],
		`Компонент записан и как заявленный долг, и как неразобранное наследие: ${inBothLists.join(", ")}. ` +
			"Причина уже написана — уберите строку из наследия, иначе потолок наследия перестаёт что-либо значить.",
	);

	const missingFiles = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key) => !existsSync(path.join(webSrcRoot, key.slice(0, key.lastIndexOf(":")))),
	);
	assert.deepEqual(
		missingFiles,
		[],
		`Наследие записано на файл, которого в дереве нет: ${missingFiles.join(", ")}. Файл удалён — ` +
			"удалите и строку, иначе список начинает врать о составе дерева.",
	);
});

test("заявленные долги существуют, объяснены и не устарели", () => {
	const census = componentReachability();
	const byKey = new Map(census.verdicts.map((verdict) => [keyOf(verdict), verdict]));

	const missingFiles: string[] = [];
	const missingDeclarations: string[] = [];
	const emptyReasons: string[] = [];
	const shallowReasons: string[] = [];

	for (const debt of DECLARED_UNMOUNTED) {
		const key = keyOf({ file: debt.file, name: debt.name });
		if (!existsSync(path.join(webSrcRoot, debt.file))) {
			missingFiles.push(debt.file);
			continue;
		}
		if (!byKey.has(key)) missingDeclarations.push(key);
		// Пустая или пробельная причина — не причина. Из-за того, что удалённый
		// внешний страж проверял на истинность ОБЪЕКТ записи, а не эту строку,
		// `reason: ""` гасил нарушение и прогон завершался нулём.
		if (debt.reason.trim().length === 0) {
			emptyReasons.push(key);
			continue;
		}
		if (debt.reason.trim().length < 120) shallowReasons.push(key);
	}

	assert.deepEqual(
		missingFiles,
		[],
		`Долг заявлен на файл, которого в дереве нет: ${missingFiles.join(", ")}. Файл удалён — удалите ` +
			"и запись, иначе список долгов начинает врать о составе дерева.",
	);
	assert.deepEqual(
		missingDeclarations,
		[],
		`Долг заявлен на объявление, которого перепись не находит: ${missingDeclarations.join(", ")}. ` +
			"Компонент переименован или удалён — поправьте запись, сейчас она охраняет несуществующее имя.",
	);
	assert.deepEqual(
		emptyReasons,
		[],
		`Долг заявлен с пустой причиной: ${emptyReasons.join(", ")}. Пустая строка гасит проверку и ` +
			"ничего не сообщает — это и есть дефект, из-за которого удалён внешний страж.",
	);
	assert.deepEqual(
		shallowReasons,
		[],
		`Долг заявлен отпиской вместо причины: ${shallowReasons.join(", ")}. Причина обязана называть, ` +
			"что именно мешает подключению и чем это подтверждено — файл, строка, ответ сервера.",
	);
});

test("каждый раздел из реестра отрисовывается в App.tsx", () => {
	const appSource = readSource("App.tsx");
	const missing = registeredAppViews().filter(
		(view) => !appSource.includes(`currentView === "${view}"`),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но App.tsx их не отрисовывает: ${missing.join(", ")}. ` +
			"Такой раздел открывается по адресу и показывает пустую рабочую область — " +
			"ровно так пропали склад, стерилизация и воронка обращений.",
	);
});

test("каждый раздел из реестра умеет предзагружаться", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const missing = registeredAppViews().filter(
		(view) => !new RegExp(`\\b${view}: \\(\\) => import\\(`).test(preloadSource),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но не зарегистрированы в workspacePreload.ts: ${missing.join(", ")}. ` +
			"Vite будет грузить их модуль на лету, с прыжком вёрстки при первом открытии " +
			"(правило записано в .agents/UI_STANDARDS.md).",
	);
});

test("модуль каждого предзагружаемого раздела действительно существует", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const census = componentReachability();

	const broken: string[] = [];
	for (const match of preloadSource.matchAll(/(\w+): \(\) => import\("(\.[^"]+)"\)/g)) {
		const view = match[1] as string;
		const specifier = match[2] as string;
		const target = path.posix.join(
			path.posix.dirname("workspacePreload.ts"),
			specifier.replace(/^\.\//, ""),
		);
		const exists = [`${target}.tsx`, `${target}.ts`, `${target}/index.tsx`, `${target}/index.ts`].some(
			(candidate) => census.facts.has(candidate),
		);
		if (!exists) broken.push(`${view} → ${specifier}`);
	}

	assert.deepEqual(
		broken,
		[],
		"Предзагрузчик ссылается на модуль, которого в apps/web/src нет: " +
			`${broken.join(", ")}. Опечатка в пути молчит: import() внутри void-вызова только отклоняет промис.`,
	);
});

test("второго маршрутизатора рядом с App.tsx больше нет", () => {
	/*
	 * AppRouter.tsx удалён вместе с двумя разделами-пустышками, которые в нём
	 * лежали (зарплаты и омниканальный инбокс — их адреса на сервере отвечают
	 * 404). Файл вернуть нельзя: пока он не импортирован, всё добавленное в него
	 * не отрисовывается, а выглядит подключённым — на этом уже дважды потеряли
	 * готовую работу. Разделы объявляются в workspaceShell.appViews и
	 * отрисовываются в App.tsx, и это закрыто тестами выше.
	 */
	assert.equal(
		existsSync(path.join(webSrcRoot, "AppRouter.tsx")),
		false,
		"AppRouter.tsx создан заново. Второй файл с цепочкой по currentView не участвует в отрисовке: " +
			"добавьте раздел в workspaceShell.appViews и ветку в App.tsx.",
	);
});

test("внешнего стража достижимости в дереве больше нет", () => {
	/*
	 * Третий владелец одного инварианта — это не подстраховка, а расхождение:
	 * DocumentUkepSignButton был «[НАРУШЕНИЕ]» для внешнего стража и принятым
	 * исключением с причиной для тестов рядом. Если файлы вернутся, вернётся и
	 * ложная перепись по шаблонам ast-grep, и лазейка пустой причины.
	 */
	const repoRoot = path.join(webSrcRoot, "..", "..", "..");
	for (const removed of [
		"scripts/check-component-mount-reachability.mjs",
		"scripts/lib/component-mount-rules.yml",
		"scripts/tests/check-component-mount-reachability.test.mjs",
	]) {
		assert.equal(
			existsSync(path.join(repoRoot, removed)),
			false,
			`${removed} вернулся в дерево. Достижимость компонентов проверяется этим файлом, внутри ` +
				"`npm test -w @dental/web`: перепись из tests/utils/componentReachability.ts видит все " +
				"формы объявления и сравнивает пути целиком. Второй владелец инварианта снова начнёт " +
				"спорить с этим — и проиграет молча, потому что ни к одному гейту он подключён не был.",
		);
	}
});
