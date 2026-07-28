import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffRole } from "@dental/shared";
import { type ClinicMode, visibleStaffRoles } from "../lib/clinicCapabilities.js";
import { appViews, getFilteredAppViews, getVisibleRailViews, viewLabels } from "../workspaceShell.js";

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

describe("состав рабочего экрана по режиму клиники", () => {
	it("печатает оба состава: отдельный врач против сети", () => {
		const solo = railFor("solo_doctor");
		const network = railFor("network_clinic");
		console.log(`  отдельный врач (${solo.length}): ${named(solo)}`);
		console.log(`  сеть           (${network.length}): ${named(network)}`);
		console.log(`  роли, отдельный врач: ${visibleStaffRoles(roleFocusOrder, "solo_doctor").join(", ")}`);
		console.log(`  роли, сеть:           ${visibleStaffRoles(roleFocusOrder, "network_clinic").join(", ")}`);
		assert.ok(solo.length > 0);
		assert.ok(network.length > 0);
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
