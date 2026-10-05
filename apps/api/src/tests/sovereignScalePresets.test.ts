import assert from "node:assert/strict";
import test from "node:test";
import {
	applyClinicScalePresetSchema,
	sovereignScalePresetIdSchema,
} from "@dental/shared";
import { applyClinicScalePreset, buildClinicSettings } from "../sampleData.js";

test("Мандат 8n: валидация схемы суверенных пресетов масштаба", () => {
	assert.equal(sovereignScalePresetIdSchema.safeParse("solo_doctor").success, true);
	assert.equal(sovereignScalePresetIdSchema.safeParse("standard_clinic").success, true);
	assert.equal(sovereignScalePresetIdSchema.safeParse("network_center").success, true);
	assert.equal(sovereignScalePresetIdSchema.safeParse("invalid_preset").success, false);

	assert.equal(
		applyClinicScalePresetSchema.safeParse({ preset: "solo_doctor" }).success,
		true,
	);
	assert.equal(
		applyClinicScalePresetSchema.safeParse({ preset: "standard_clinic", confirmResetExtraChairs: true }).success,
		true,
	);
	assert.equal(
		applyClinicScalePresetSchema.safeParse({ preset: "unknown" }).success,
		false,
	);
});

test("Мандат 8e / 8n: применение пресета «Соло-врач / Частный кабинет» адаптирует профиль клиники под 1 кресло", () => {
	const settings = applyClinicScalePreset("solo_doctor");

	assert.equal(settings.profile.mode, "solo_doctor", "Режим должен быть solo_doctor");
	assert.equal(settings.profile.defaultVisitMinutes, 30, "Для соло шаг приема 30 минут");
	assert.equal(settings.soloDoctorMode, true, "soloDoctorMode должен быть true");

	const activeChairs = settings.chairs.filter((c) => c.active);
	assert.equal(activeChairs.length, 1, "Должно остаться ровно 1 активное кресло");
});

test("Мандат 8n: применение пресета «Стандартная клиника» активирует 3 кресла и командный режим", () => {
	const settings = applyClinicScalePreset("standard_clinic");

	assert.equal(settings.profile.mode, "small_clinic", "Режим должен быть small_clinic");
	assert.equal(settings.profile.defaultVisitMinutes, 45, "Для стандартной клиники шаг 45 минут");

	const activeChairs = settings.chairs.filter((c) => c.active);
	assert.ok(activeChairs.length >= 3, "Должно быть не менее 3 активных кресел");
});

test("Мандат 8n: применение пресета «Многопрофильный центр / Сеть» активирует сетевой масштаб", () => {
	const settings = applyClinicScalePreset("network_center");

	assert.equal(settings.profile.mode, "network_clinic", "Режим должен быть network_clinic");
	assert.equal(settings.profile.defaultVisitMinutes, 60, "Для сети базовый шаг 60 минут");

	const activeChairs = settings.chairs.filter((c) => c.active);
	assert.ok(activeChairs.length >= 5, "В сети должно быть не менее 5 активных кресел");
});
