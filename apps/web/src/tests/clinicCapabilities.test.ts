import assert from "node:assert/strict";
import test from "node:test";
import type { StaffRole } from "@dental/shared";
import { clinicModeSchema } from "@dental/shared";
import {
	type ClinicCapability,
	type ClinicMode,
	clinicCapabilities,
	clinicModes,
	describeHiddenCapabilities,
	hasCapability,
	resolveClinicMode,
	staffRoleChoices,
	visibleStaffRoles,
} from "../lib/clinicCapabilities.js";

/**
 * Таблица «режим клиники → доступные разделы».
 *
 * ЗАЧЕМ ТЕСТ. До этого режим проверялся россыпью прямых сравнений
 * `profile.mode !== "solo_doctor"` в четырёх местах разметки. Такие правила
 * невозможно ни увидеть целиком, ни проверить. Здесь они закреплены.
 *
 * ГЛАВНОЕ ПРАВИЛО, которое проверяется ниже: скрывается только то, что при
 * данном режиме бессмысленно ПО УСТРОЙСТВУ. Пустое не скрывается — «приёмов за
 * период не было» это ответ, а исчезнувший раздел выглядит как поломка.
 */

/*
 * Список берётся из самого модуля, а не переписывается здесь копией: копия
 * промолчала бы про добавленный режим, и «во всех режимах» означало бы «во всех,
 * какие я помнил, когда писал тест».
 */
const ALL_MODES: readonly ClinicMode[] = clinicModes;

test("перечисление режимов не расходится со схемой сервера", () => {
	/*
	 * В этом файле лежала своя копия объединения из четырёх строк, а рядом — ещё
	 * один такой же список для проверки чужого значения. Настоящее перечисление
	 * при этом живёт в packages/shared (clinicModeSchema), и по нему сервер
	 * разбирает колонку organizations.clinic_mode. Три копии одного перечисления
	 * расходятся молча: рукописная копия списка разделов appViews в этом проекте
	 * уже разъехалась и уронила сборку.
	 */
	assert.deepEqual([...clinicModes], [...clinicModeSchema.options]);
	console.log(`  режимы из схемы сервера: ${clinicModes.join(", ")}`);
	for (const mode of clinicModeSchema.options) {
		assert.equal(
			resolveClinicMode(mode),
			mode,
			`режим ${mode} не признан своим`,
		);
		assert.ok(
			clinicCapabilities(mode).length > 0,
			`${mode}: пустой набор возможностей`,
		);
		assert.ok(
			visibleStaffRoles(
				["doctor", "administrator", "assistant", "manager", "owner"],
				mode,
			).length > 0,
			`${mode}: ни одной роли`,
		);
	}
});

test("основные инструменты доступны в любом режиме", () => {
	// Напоминания и обзвон нужны и отдельному врачу: он звонит сам.
	for (const mode of ALL_MODES) {
		assert.equal(hasCapability(mode, "callList"), true, `${mode}: нет обзвона`);
		assert.equal(
			hasCapability(mode, "messaging"),
			true,
			`${mode}: нет отправки сообщений`,
		);
		assert.equal(
			hasCapability(mode, "managerReports"),
			true,
			`${mode}: нет отчётов`,
		);
	}
});

test("отдельному врачу не показываются рассылки по базе", () => {
	// Его режим описан в интерфейсе как «минимум экранов». Маркетинга у него нет,
	// а лишний раздел стоит дороже отсутствующей возможности.
	assert.equal(hasCapability("solo_doctor", "massCampaigns"), false);
	assert.equal(hasCapability("one_chair", "massCampaigns"), true);
	assert.equal(hasCapability("small_clinic", "massCampaigns"), true);
	assert.equal(hasCapability("network_clinic", "massCampaigns"), true);
});

test("занятость кресел скрыта там, где кресло одно", () => {
	// Процент занятости единственного кресла — всегда одно и то же число.
	assert.equal(hasCapability("solo_doctor", "chairUtilisation"), false);
	assert.equal(hasCapability("one_chair", "chairUtilisation"), false);
	assert.equal(hasCapability("small_clinic", "chairUtilisation"), true);
	assert.equal(hasCapability("network_clinic", "chairUtilisation"), true);
});

test("разрез по врачам скрыт только у отдельного врача", () => {
	// В одном кабинете врачи могут меняться по сменам — сравнивать есть что.
	assert.equal(hasCapability("solo_doctor", "doctorBreakdown"), false);
	assert.equal(hasCapability("one_chair", "doctorBreakdown"), true);
	assert.equal(hasCapability("small_clinic", "doctorBreakdown"), true);
});

test("неизвестный режим не отнимает возможностей", () => {
	// Спрятать раздел у клиники, которая ещё не прошла настройку, значит отнять
	// работающую возможность без объяснения. Лишний раздел заметят и настроят,
	// пропавший будут искать.
	const capabilities: ClinicCapability[] = [
		"callList",
		"messaging",
		"massCampaigns",
		"managerReports",
		"doctorBreakdown",
		"chairUtilisation",
	];
	for (const capability of capabilities) {
		assert.equal(
			hasCapability(null, capability),
			true,
			`null: нет ${capability}`,
		);
		assert.equal(
			hasCapability(undefined, capability),
			true,
			`undefined: нет ${capability}`,
		);
		// Значение из старой записи в базе, которого нет в перечислении.
		assert.equal(
			hasCapability("legacy_mode" as ClinicMode, capability),
			true,
			`неизвестный режим: нет ${capability}`,
		);
	}
});

test("набор возможностей растёт от отдельного врача к сети", () => {
	// Свойство таблицы: чем крупнее клиника, тем больше доступно. Нарушение
	// означает, что где-то в правилах опечатка.
	const sizes = ALL_MODES.map((mode) => clinicCapabilities(mode).length);
	for (let index = 1; index < sizes.length; index += 1) {
		const previous = sizes[index - 1] ?? 0;
		const current = sizes[index] ?? 0;
		assert.ok(
			current >= previous,
			`${ALL_MODES[index]} доступно меньше, чем ${ALL_MODES[index - 1]}`,
		);
	}
});

test("скрытое перечисляется словами — для объяснения в настройках", () => {
	// Пропажа раздела не должна выглядеть поломкой: она объясняется режимом.
	const hiddenForSolo = describeHiddenCapabilities("solo_doctor");
	assert.ok(
		hiddenForSolo.includes("рассылки по базе пациентов"),
		JSON.stringify(hiddenForSolo),
	);
	assert.ok(
		hiddenForSolo.includes("занятость кресел"),
		JSON.stringify(hiddenForSolo),
	);
	assert.deepEqual(describeHiddenCapabilities("network_clinic"), []);
});

test("раздел продвижения скрыт только у отдельного врача", () => {
	// Продвижением занимается тот, у кого есть кому его поручить. У отдельного
	// врача уже скрыты рассылки по базе — раздел продвижения уходит по той же
	// причине, чтобы правило не расходилось само с собой.
	assert.equal(hasCapability("solo_doctor", "marketingSection"), false);
	assert.equal(hasCapability("one_chair", "marketingSection"), true);
	assert.equal(hasCapability("small_clinic", "marketingSection"), true);
	assert.equal(hasCapability("network_clinic", "marketingSection"), true);
	/*
	 * Подпись обязана называть ОБА раздела, которые уходят по этому правилу.
	 * Раньше она называла только продвижение, и воронка обращений исчезала из
	 * меню без единого слова — человек искал раздел, про который ему не сказали.
	 */
	const hidden = describeHiddenCapabilities("solo_doctor");
	console.log(`  что скрыто у отдельного врача: ${hidden.join(", ")}`);
	assert.ok(
		hidden.includes("раздел продвижения и воронка обращений"),
		JSON.stringify(hidden),
	);
});

test("текущая роль не исчезает из переключателя при переходе на меньший режим", () => {
	/*
	 * ДОСТИЖИМЫЙ СЛУЧАЙ, А НЕ ТЕОРИЯ. Роль хранится отдельно от режима и
	 * выбирается в мастере настройки. Клиника могла выбрать «Управляющий», а потом
	 * сменить режим на «Отдельный врач», где управляющего нет. Тогда шапка
	 * показывала «Роль: Управляющий», предлагала «Врач» и «Владелец», и ни одна
	 * кнопка не была подсвечена: человек видит своё положение и не находит его в
	 * списке.
	 */
	const stranded = staffRoleChoices(roleFocusOrder, "solo_doctor", "manager");
	console.log(`  отдельный врач, выбран управляющий: ${stranded.join(", ")}`);
	assert.deepEqual(stranded, ["doctor", "manager", "owner"]);
	// Порядок не переставлен: управляющий стоит на своём месте из roleFocusOrder,
	// а не дописан в конец.
	assert.deepEqual(
		stranded.map((role) => roleFocusOrder.indexOf(role)),
		[...stranded.map((role) => roleFocusOrder.indexOf(role))].sort(
			(a, b) => a - b,
		),
	);
	// Если выбранная роль при режиме и так есть, список не расширяется ни на что.
	assert.deepEqual(
		staffRoleChoices(roleFocusOrder, "solo_doctor", "doctor"),
		visibleStaffRoles(roleFocusOrder, "solo_doctor"),
	);
	assert.deepEqual(
		staffRoleChoices(roleFocusOrder, "solo_doctor", "owner"),
		visibleStaffRoles(roleFocusOrder, "solo_doctor"),
	);
	assert.deepEqual(
		staffRoleChoices(roleFocusOrder, "network_clinic", "manager"),
		roleFocusOrder,
	);
	// Роль не выбрана и режим не известен — поведение не меняется.
	assert.deepEqual(
		staffRoleChoices(roleFocusOrder, "solo_doctor", null),
		visibleStaffRoles(roleFocusOrder, "solo_doctor"),
	);
	assert.deepEqual(
		staffRoleChoices(roleFocusOrder, null, "manager"),
		roleFocusOrder,
	);
	// Ровно одна кнопка подсвечена в любом режиме при любой сохранённой роли:
	// именно этого и не было в шапке.
	for (const mode of ALL_MODES) {
		for (const selected of roleFocusOrder) {
			const choices = staffRoleChoices(roleFocusOrder, mode, selected);
			assert.equal(
				choices.filter((role) => role === selected).length,
				1,
				`${mode}/${selected}: выбранной роли нет в списке`,
			);
		}
	}
});

test("неизвестное значение режима не превращается в режим", () => {
	/*
	 * ЗАЧЕМ. В store/settingsStore.ts поле clinicMode по умолчанию равнялось
	 * "network_clinic" — неизвестный режим подменялся самым крупным из четырёх.
	 * Одно место должно отвечать на неизвестное значение null, иначе подстановка
	 * заводится заново при каждом новом потребителе.
	 */
	assert.equal(resolveClinicMode("solo_doctor"), "solo_doctor");
	assert.equal(resolveClinicMode("network_clinic"), "network_clinic");
	assert.equal(resolveClinicMode(undefined), null);
	assert.equal(resolveClinicMode(null), null);
	assert.equal(resolveClinicMode(""), null);
	// Значение из старой записи в базе, которого нет в перечислении.
	assert.equal(resolveClinicMode("single"), null);
	assert.equal(resolveClinicMode("network"), null);
	// Имя свойства прототипа не должно проходить за режим.
	assert.equal(resolveClinicMode("toString"), null);
	assert.equal(resolveClinicMode(42), null);
});

const roleFocusOrder: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"owner",
];

test("роли предлагаются только те, что при этом режиме существуют", () => {
	/*
	 * Переключатель роли в шапке предлагал все пять ролей всегда. У отдельного
	 * врача нет ни ассистента, ни администратора, ни управляющего: три кнопки из
	 * пяти предлагали переключиться на несуществующего сотрудника.
	 *
	 * Списки печатаются: смысл правки виден сравнением составов, а не тем, что
	 * проверка прошла.
	 */
	const solo = visibleStaffRoles(roleFocusOrder, "solo_doctor");
	const oneChair = visibleStaffRoles(roleFocusOrder, "one_chair");
	console.log(`  отдельный врач: ${solo.join(", ")}`);
	console.log(`  один кабинет:   ${oneChair.join(", ")}`);
	console.log(
		`  малая клиника:  ${visibleStaffRoles(roleFocusOrder, "small_clinic").join(", ")}`,
	);
	console.log(
		`  сеть:           ${visibleStaffRoles(roleFocusOrder, "network_clinic").join(", ")}`,
	);

	assert.deepEqual(solo, ["doctor", "owner"]);
	// Управляющий над одним кабинетом — тоже никто, а ассистент уже возможен.
	assert.deepEqual(oneChair, ["doctor", "administrator", "assistant", "owner"]);
	assert.deepEqual(
		visibleStaffRoles(roleFocusOrder, "small_clinic"),
		roleFocusOrder,
	);
	assert.deepEqual(
		visibleStaffRoles(roleFocusOrder, "network_clinic"),
		roleFocusOrder,
	);
});

test("сокращение ролей не отрезает владельца — иначе режим нельзя вернуть", () => {
	// Роль задаёт состав разделов, и «Настройки» есть не у каждой роли. Если у
	// режима не останется роли, которая открывает настройки, сменить режим
	// обратно будет нечем: это ловушка, а не упрощение.
	const modes: ClinicMode[] = [
		"solo_doctor",
		"one_chair",
		"small_clinic",
		"network_clinic",
	];
	for (const mode of modes) {
		const roles = visibleStaffRoles(roleFocusOrder, mode);
		assert.ok(roles.length > 0, `${mode}: не осталось ни одной роли`);
		assert.ok(
			roles.includes("owner"),
			`${mode}: владелец убран из переключателя`,
		);
	}
});

test("набор ролей растёт от отдельного врача к сети, и порядок не переставляется", () => {
	const modes: ClinicMode[] = [
		"solo_doctor",
		"one_chair",
		"small_clinic",
		"network_clinic",
	];
	const sizes = modes.map(
		(mode) => visibleStaffRoles(roleFocusOrder, mode).length,
	);
	for (let index = 1; index < sizes.length; index += 1) {
		assert.ok(
			(sizes[index] ?? 0) >= (sizes[index - 1] ?? 0),
			`${modes[index]}: ролей меньше, чем у ${modes[index - 1]}`,
		);
	}
	// Порядок задан частотой использования в AppHelpers, а не алфавитом.
	for (const mode of modes) {
		const roles = visibleStaffRoles(roleFocusOrder, mode);
		const positions = roles.map((role) => roleFocusOrder.indexOf(role));
		assert.deepEqual(
			positions,
			[...positions].sort((a, b) => a - b),
			`${mode}: порядок ролей переставлен`,
		);
	}
});

test("неизвестный режим не отнимает ни одной роли", () => {
	assert.deepEqual(visibleStaffRoles(roleFocusOrder, null), roleFocusOrder);
	assert.deepEqual(
		visibleStaffRoles(roleFocusOrder, undefined),
		roleFocusOrder,
	);
	assert.deepEqual(
		visibleStaffRoles(roleFocusOrder, "legacy_mode" as ClinicMode),
		roleFocusOrder,
	);
});
