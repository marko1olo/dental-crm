import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffRole } from "@dental/shared";
import { applyClinicModeToFlags, clinicCapabilities, clinicModes, describeHiddenCapabilities, hasCapability, type ClinicMode, visibleStaffRoles } from "../lib/clinicCapabilities.js";
import type { WorkspaceFeatureFlags } from "../hooks/useWorkspaceProfile.js";
import { appViews, getFilteredAppViews, getRailViewsHiddenByMode, getVisibleRailViews, viewLabels } from "../workspaceShell.js";

/*
 * Режим клиники против состава экрана.
 *
 * ЧТО БЫЛО. Режим клиники не влиял на меню вообще: getFilteredAppViews
 * фильтровал разделы только по роли, а переключатель роли в шапке всегда
 * предлагал все пять ролей. Отдельный врач получал ту же рельсу из одиннадцати
 * разделов и тот же выбор «Ассистент / Администратор / Управляющий», что и сеть
 * филиалов, — при том что ни одного такого сотрудника у него нет.
 *
 * Тест печатает оба состава целиком: смысл правки виден только сравнением
 * списков, а не фактом прохождения проверки.
 *
 * Названия проверок по-русски намеренно: они читаются как утверждения о
 * продукте, а не о коде.
 */

const roleFocusOrder: StaffRole[] = ["doctor", "administrator", "assistant", "manager", "owner"];

/** Разделы, без которых врач не проведёт приём. Их режим скрывать не вправе. */
const clinicalViews = ["schedule", "patients", "imaging", "visit", "documents", "finance"] as const;

const railFor = (mode: ClinicMode | null): string[] => {
	const seen = new Set<string>();
	for (const role of visibleStaffRoles(roleFocusOrder, mode)) {
		for (const view of getVisibleRailViews(role, mode)) seen.add(view);
	}
	return appViews.filter((view) => seen.has(view));
};

const named = (views: readonly string[]): string => views.map((view) => viewLabels[view as (typeof appViews)[number]]).join(", ");

/*
 * ВТОРАЯ СИСТЕМА МОДУЛЬНОСТИ — ПРИЗНАКИ МОДУЛЕЙ.
 *
 * Состав экрана решают не только режим и роль: часть вкладок настроек прячется по
 * признакам из `hooks/useWorkspaceProfile.ts` (`SettingsView.tsx:1201` строит
 * список вкладок, `:1512` — сами панели). Поэтому «что видно отдельному врачу»
 * без признаков не посчитать.
 *
 * Значения здесь — фикстура, а не выдумка про продукт: `GET
 * /api/workspace/profile` (`apps/api/src/routes/workspaceProfile.ts:451`) отдаёт
 * признаки константой, все включённые, любой организации. Проверяется ровно одно:
 * какие из них снимает режим. Тип взят из настоящего интерфейса, поэтому
 * переименование признака ломает фикстуру, а не проходит молча.
 */
type ModuleFlagFixture = Pick<
	WorkspaceFeatureFlags,
	| "hasMarketingModule"
	| "hasPayrollModule"
	| "hasAnalyticsModule"
	| "hasInventoryModule"
	| "hasOrthodontics"
	| "hasDentalLab"
	| "hasPediatricMode"
	| "aiEnableTreatmentPlan"
	| "aiEnableRecommendations"
	| "aiEnableDocuments"
>;

const serverFlags: ModuleFlagFixture = {
	hasMarketingModule: true,
	hasPayrollModule: true,
	hasAnalyticsModule: true,
	hasInventoryModule: true,
	hasOrthodontics: true,
	hasDentalLab: true,
	hasPediatricMode: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true
};

const flagKeys = Object.keys(serverFlags) as Array<keyof ModuleFlagFixture>;

/** Клинические признаки: лечение режимом не упрощается, снять их он не вправе. */
const clinicalFlags: ReadonlyArray<keyof ModuleFlagFixture> = [
	"hasOrthodontics",
	"hasDentalLab",
	"hasPediatricMode",
	"aiEnableTreatmentPlan",
	"aiEnableRecommendations",
	"aiEnableDocuments"
];

/**
 * Всё, что клиника при этом режиме видит, одним списком: разделы меню, роли в
 * переключателях, возможности внутри разделов и признаки модулей. Сравнение двух
 * таких списков и есть смысл режима — по нему видно, что именно убрано.
 */
const moduleSurface = (mode: ClinicMode | null): string[] => {
	const flags = applyClinicModeToFlags(serverFlags, mode);
	return [
		...railFor(mode).map((view) => `меню: ${viewLabels[view as (typeof appViews)[number]]}`),
		...visibleStaffRoles(roleFocusOrder, mode).map((role) => `роль: ${role}`),
		...clinicCapabilities(mode).map((capability) => `возможность: ${capability}`),
		...flagKeys.filter((key) => flags[key]).map((key) => `модуль: ${key}`)
	];
};

describe("состав рабочего экрана по режиму клиники", () => {
	it("видимое отдельному врачу — строгое подмножество видимого сети, лечение целиком", () => {
		/*
		 * ГЛАВНАЯ ПРОВЕРКА РЕЖИМА, И ОНА ЗДЕСЬ ИМЕННО ПЕЧАТЬЮ СПИСКОВ. Зелёная
		 * проверка, которая ничего не печатает, не доказывает ничего: «режим прячет
		 * лишнее» — это утверждение о двух составах экрана, и увидеть его можно
		 * только положив их рядом.
		 *
		 * Держится ровно две вещи, обе продуктовые. Первое: отдельный врач не видит
		 * НИЧЕГО, чего не видит сеть, — упрощение не вправе отнимать произвольное.
		 * Второе: он видит ВСЁ лечение — разделы приёма и клинические признаки
		 * (ортодонтия, зуботехническая лаборатория, детский режим, помощь ИИ)
		 * остаются на месте. Скрывается организационная обвязка: продвижение,
		 * воронка обращений, роли отсутствующих сотрудников.
		 */
		const solo = moduleSurface("solo_doctor");
		const network = moduleSurface("network_clinic");
		const removed = network.filter((entry) => !solo.includes(entry));
		console.log(`  ВИДИТ ОТДЕЛЬНЫЙ ВРАЧ (${solo.length}):`);
		for (const entry of solo) console.log(`      ${entry}`);
		console.log(`  ВИДИТ СЕТЬ ФИЛИАЛОВ (${network.length}):`);
		for (const entry of network) console.log(`      ${entry}`);
		console.log(`  РЕЖИМ УБРАЛ (${removed.length}): ${removed.join(" | ")}`);

		for (const entry of solo) {
			assert.ok(network.includes(entry), `«${entry}» есть у отдельного врача и нет у сети`);
		}
		assert.ok(solo.length < network.length, "режим не убрал ни одного пункта — флаг ничем не управляет");
		for (const view of clinicalViews) {
			assert.ok(solo.includes(`меню: ${viewLabels[view]}`), `у отдельного врача пропал раздел «${viewLabels[view]}»`);
		}
		for (const flag of clinicalFlags) {
			assert.ok(solo.includes(`модуль: ${flag}`), `режим снял клинический признак ${flag}`);
		}
	});

	it("режим только снимает признак модуля: не поднимает и не трогает клинические", () => {
		/*
		 * Правило жило выражением внутри React-хука `useWorkspaceProfile`, и потому
		 * не проверялось ничем: убедиться, что режим снимает ровно один признак,
		 * можно было только отрисовкой. Теперь это функция, и держится тремя
		 * утверждениями.
		 *
		 * Ссылка на объект сохраняется, когда менять нечего, — результат идёт в
		 * useMemo, и новый объект на каждый рендер перерисовывал бы всех
		 * потребителей признаков.
		 */
		assert.equal(applyClinicModeToFlags(serverFlags, "network_clinic"), serverFlags);
		assert.equal(applyClinicModeToFlags(serverFlags, "one_chair"), serverFlags);
		assert.equal(applyClinicModeToFlags(serverFlags, null), serverFlags, "неизвестный режим не смеет ничего снимать");

		// Клиника выключила маркетинг вручную — режим сети не включает его обратно.
		const manuallyOff: ModuleFlagFixture = { ...serverFlags, hasMarketingModule: false };
		assert.equal(applyClinicModeToFlags(manuallyOff, "network_clinic"), manuallyOff);

		const solo = applyClinicModeToFlags(serverFlags, "solo_doctor");
		assert.equal(solo.hasMarketingModule, false, "вкладка настроек «Маркетинг» осталась у отдельного врача");
		const touched = flagKeys.filter((key) => key !== "hasMarketingModule" && solo[key] !== serverFlags[key]);
		assert.deepEqual(touched, [], `режим тронул признаки помимо маркетинга: ${touched.join(", ")}`);
		console.log(`  снято режимом «отдельный врач»: hasMarketingModule (вкладка настроек «Маркетинг» уходит вместе с разделом меню)`);
		console.log(`  остальные ${flagKeys.length - 1} признака не тронуты: ${flagKeys.filter((key) => key !== "hasMarketingModule").join(", ")}`);
	});

	it("печатает оба состава: отдельный врач против сети", () => {
		const solo = railFor("solo_doctor");
		const network = railFor("network_clinic");
		console.log(`  отдельный врач (${solo.length}): ${named(solo)}`);
		console.log(`  сеть           (${network.length}): ${named(network)}`);
		console.log(`  роли, отдельный врач: ${visibleStaffRoles(roleFocusOrder, "solo_doctor").join(", ")}`);
		console.log(`  роли, сеть:           ${visibleStaffRoles(roleFocusOrder, "network_clinic").join(", ")}`);
		console.log(`  возможности, отдельный врач (${clinicCapabilities("solo_doctor").length}): ${clinicCapabilities("solo_doctor").join(", ")}`);
		console.log(`  возможности, сеть          (${clinicCapabilities("network_clinic").length}): ${clinicCapabilities("network_clinic").join(", ")}`);
		assert.ok(solo.length > 0);
		assert.ok(network.length > 0);
	});

	it("скрытое режимом перечисляется точно, а не общей фразой", () => {
		/*
		 * Раздел, исчезнувший без объяснения, читается как поломка. Подпись про
		 * скрытое в проекте была (describeHiddenCapabilities), но её не вызывал
		 * никто, и меню молча становилось короче.
		 *
		 * Список скрытого ВЫЧИСЛЯЕТСЯ разностью «право роли» минус «видно в меню»,
		 * а не выписывается третьим перечислением: иначе подпись обещала бы одно, а
		 * меню показывало другое.
		 */
		for (const mode of clinicModes) {
			for (const role of roleFocusOrder) {
				const hidden = getRailViewsHiddenByMode(role, mode);
				const visible = getVisibleRailViews(role, mode);
				const byRole = getFilteredAppViews(role);
				assert.deepEqual(
					[...hidden, ...visible].sort(),
					[...byRole].sort(),
					`${mode}/${role}: скрытое и видимое вместе не равны праву роли`
				);
				for (const view of hidden) {
					assert.ok(viewLabels[view], `${mode}/${role}: скрытый раздел ${view} нечем назвать человеку`);
				}
			}
		}
		const ownerHiddenSolo = getRailViewsHiddenByMode("owner", "solo_doctor");
		console.log(`  скрыто у владельца, отдельный врач: ${named(ownerHiddenSolo)}`);
		console.log(`  словами: ${describeHiddenCapabilities("solo_doctor").join(", ")}`);
		assert.deepEqual(named(ownerHiddenSolo), "Обращения, Маркетинг/SEO");
		// Оба скрытых раздела названы в подписи, а не только один из них.
		assert.ok(describeHiddenCapabilities("solo_doctor").includes("раздел продвижения и воронка обращений"));
		// Сети скрывать нечего — строки объяснения в интерфейсе не будет.
		assert.deepEqual(getRailViewsHiddenByMode("owner", "network_clinic"), []);
		assert.deepEqual(describeHiddenCapabilities("network_clinic"), []);
	});

	it("вкладку настроек «Маркетинг» и раздел меню решает одна возможность, а не два флага", () => {
		/*
		 * ЧТО БЫЛО. Тот же продуктовый вопрос решали две системы: возможность
		 * marketingSection (боковое меню) и флаг hasMarketingModule из
		 * hooks/useWorkspaceProfile (вкладка настроек, SettingsView.tsx:1201/1512).
		 * У отдельного врача они расходились — раздела в меню нет, вкладка
		 * настроек маркетинга на месте, потому что сервер отдаёт флаг равным true
		 * любой организации.
		 *
		 * Здесь закреплено само правило: решение о разделе «Маркетинг/SEO» в меню
		 * принимает ровно та возможность, по которой useWorkspaceProfile опускает
		 * флаг. Разойтись они теперь могут только если кто-то заведёт третье
		 * правило — и тогда покраснеет эта проверка.
		 */
		for (const mode of clinicModes) {
			const railHasMarketing = getVisibleRailViews("owner", mode).includes("marketing");
			const railHasLeads = getVisibleRailViews("owner", mode).includes("leads");
			const capability = hasCapability(mode, "marketingSection");
			console.log(`  ${mode}: возможность=${capability} меню-маркетинг=${railHasMarketing} меню-обращения=${railHasLeads}`);
			assert.equal(railHasMarketing, capability, `${mode}: меню и возможность разошлись`);
			assert.equal(railHasLeads, capability, `${mode}: воронка обращений живёт по своему правилу`);
		}
	});

	it("у отдельного врача разделов строго меньше, чем у сети", () => {
		const solo = railFor("solo_doctor");
		const network = railFor("network_clinic");
		for (const view of solo) {
			assert.ok(network.includes(view), `«${viewLabels[view as (typeof appViews)[number]]}» есть у врача и нет у сети`);
		}
		assert.ok(solo.length < network.length, `состав не сократился: ${named(solo)}`);
	});

	it("ни один раздел лечения не скрыт ни в одном режиме", () => {
		// Прячется организационная обвязка. Лечение не трогается: снимки и приём
		// нужны отдельному врачу ровно так же, как клинике.
		const modes: ClinicMode[] = ["solo_doctor", "one_chair", "small_clinic", "network_clinic"];
		for (const mode of modes) {
			const rail = railFor(mode);
			for (const view of clinicalViews) {
				assert.ok(rail.includes(view), `${mode}: пропал раздел «${viewLabels[view]}»`);
			}
		}
	});

	it("настройки остаются доступны — иначе режим нельзя вернуть", () => {
		// Роль задаёт состав разделов, а «Настройки» есть не у каждой роли. Если
		// сокращение ролей отрежет настройки, клиника не сможет сменить режим
		// обратно: это была бы ловушка, а не упрощение.
		const modes: ClinicMode[] = ["solo_doctor", "one_chair", "small_clinic", "network_clinic"];
		for (const mode of modes) {
			const roles = visibleStaffRoles(roleFocusOrder, mode);
			assert.ok(roles.length > 0, `${mode}: не осталось ни одной роли`);
			const reachable = roles.some((role) => getVisibleRailViews(role, mode).includes("settings"));
			assert.ok(reachable, `${mode}: ни одна доступная роль не открывает «Настройки»`);
		}
	});

	it("у отдельного врача не предлагаются роли отсутствующих сотрудников", () => {
		const solo = visibleStaffRoles(roleFocusOrder, "solo_doctor");
		assert.deepEqual(solo, ["doctor", "owner"]);
		for (const role of ["assistant", "administrator", "manager"] as StaffRole[]) {
			assert.ok(!solo.includes(role), `отдельному врачу предложена роль ${role}`);
		}
		// Управляющий над одним кабинетом — тоже никто, а ассистент уже возможен.
		assert.deepEqual(visibleStaffRoles(roleFocusOrder, "one_chair"), ["doctor", "administrator", "assistant", "owner"]);
		assert.deepEqual(visibleStaffRoles(roleFocusOrder, "small_clinic"), roleFocusOrder);
	});

	it("неизвестный режим не отнимает ни разделов, ни ролей", () => {
		// Клиника, которая ещё не прошла настройку, должна видеть всё: пропавший
		// раздел ищут, лишний — замечают и настраивают.
		assert.deepEqual(railFor(null), railFor("network_clinic"));
		assert.deepEqual(visibleStaffRoles(roleFocusOrder, null), roleFocusOrder);
		assert.deepEqual(visibleStaffRoles(roleFocusOrder, "legacy_mode" as ClinicMode), roleFocusOrder);
		for (const role of roleFocusOrder) {
			assert.deepEqual(getVisibleRailViews(role, null), getFilteredAppViews(role));
		}
	});

	it("право открыть раздел режимом не отбирается — это скрытие, а не удаление", () => {
		// getFilteredAppViews работает охранником маршрута в useAppLogic. Если бы
		// режим влиял и на него, адрес #marketing выбрасывал бы на «Смену», то
		// есть раздел был бы удалён, а не убран с глаз.
		assert.ok(getFilteredAppViews("owner").includes("marketing"));
		assert.ok(!getVisibleRailViews("owner", "solo_doctor").includes("marketing"));
		assert.ok(getVisibleRailViews("owner", "one_chair").includes("marketing"));
	});
});
