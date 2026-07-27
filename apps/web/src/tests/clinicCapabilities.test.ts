import assert from "node:assert/strict";
import test from "node:test";
import {
	clinicCapabilities,
	describeHiddenCapabilities,
	hasCapability,
	type ClinicCapability,
	type ClinicMode
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

const ALL_MODES: ClinicMode[] = ["solo_doctor", "one_chair", "small_clinic", "network_clinic"];

test("основные инструменты доступны в любом режиме", () => {
	// Напоминания и обзвон нужны и отдельному врачу: он звонит сам.
	for (const mode of ALL_MODES) {
		assert.equal(hasCapability(mode, "callList"), true, `${mode}: нет обзвона`);
		assert.equal(hasCapability(mode, "messaging"), true, `${mode}: нет отправки сообщений`);
		assert.equal(hasCapability(mode, "managerReports"), true, `${mode}: нет отчётов`);
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
		"chairUtilisation"
	];
	for (const capability of capabilities) {
		assert.equal(hasCapability(null, capability), true, `null: нет ${capability}`);
		assert.equal(hasCapability(undefined, capability), true, `undefined: нет ${capability}`);
		// Значение из старой записи в базе, которого нет в перечислении.
		assert.equal(hasCapability("legacy_mode" as ClinicMode, capability), true, `неизвестный режим: нет ${capability}`);
	}
});

test("набор возможностей растёт от отдельного врача к сети", () => {
	// Свойство таблицы: чем крупнее клиника, тем больше доступно. Нарушение
	// означает, что где-то в правилах опечатка.
	const sizes = ALL_MODES.map((mode) => clinicCapabilities(mode).length);
	for (let index = 1; index < sizes.length; index += 1) {
		const previous = sizes[index - 1] ?? 0;
		const current = sizes[index] ?? 0;
		assert.ok(current >= previous, `${ALL_MODES[index]} доступно меньше, чем ${ALL_MODES[index - 1]}`);
	}
});

test("скрытое перечисляется словами — для объяснения в настройках", () => {
	// Пропажа раздела не должна выглядеть поломкой: она объясняется режимом.
	const hiddenForSolo = describeHiddenCapabilities("solo_doctor");
	assert.ok(hiddenForSolo.includes("рассылки по базе пациентов"), JSON.stringify(hiddenForSolo));
	assert.ok(hiddenForSolo.includes("занятость кресел"), JSON.stringify(hiddenForSolo));
	assert.deepEqual(describeHiddenCapabilities("network_clinic"), []);
});
