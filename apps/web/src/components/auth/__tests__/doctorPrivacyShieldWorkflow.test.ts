import assert from "node:assert";
import { describe, it } from "node:test";
import {
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	formatDoctorRole,
	getDoctorInitials,
	getInactivityTimeoutMs,
} from "../DoctorPrivacyShield";
import { selectAuthArt } from "../authArtSelector";
import * as AppHeaderModule from "../../AppHeader";

describe("DoctorPrivacyShield Workflow & Integration (152-ФЗ)", () => {
	it("AppHeader.tsx корректно реэкспортирует компоненты Header и предоставляет фасад AppHeader", () => {
		assert.ok(AppHeaderModule.AppHeader, "AppHeader должен быть экспортирован");
		assert.ok(AppHeaderModule.ClinicControlPill, "ClinicControlPill должен быть экспортирован");
		assert.strictEqual(
			AppHeaderModule.AppHeader,
			AppHeaderModule.ClinicControlPill,
			"AppHeader должен указывать на канонический ClinicControlPill",
		);
	});

	it("selectAuthArt принимает { pack: 'dental-epic' } без обязательного указания остальных опций", () => {
		const mockManifest = [
			{
				pack: "dental-epic",
				slot: "day",
				avif: "epic1.avif",
				webp: "epic1.webp",
				lqip: "",
				dominantColor: "#0a0f1d",
				width: 1920,
				height: 1080,
			},
			{
				pack: "dental-epic",
				slot: "evening",
				avif: "epic2.avif",
				webp: "epic2.webp",
				lqip: "",
				dominantColor: "#090d16",
				width: 1920,
				height: 1080,
			},
		];

		const selected = selectAuthArt(mockManifest, { pack: "dental-epic" });
		assert.ok(selected, "Должен быть выбран элемент из набора dental-epic");
		assert.strictEqual(selected?.pack, "dental-epic");
	});

	it("таймаут неактивности по умолчанию составляет 5 минут (300 000 мс)", () => {
		const timeoutMs = getInactivityTimeoutMs();
		assert.strictEqual(timeoutMs, 5 * 60 * 1000);
	});

	it("инициалы формируются корректно для врачей со сложными именами", () => {
		assert.strictEqual(getDoctorInitials("Петров-Водкин Сергей"), "ПС");
		assert.strictEqual(getDoctorInitials("Иван"), "ИВ");
		assert.strictEqual(getDoctorInitials(""), "ВР");
	});

	it("роли врачей и руководства имеют понятные русские названия", () => {
		assert.strictEqual(formatDoctorRole("doctor"), "Врач-стоматолог");
		assert.strictEqual(formatDoctorRole("admin"), "Администратор клиники");
		assert.strictEqual(formatDoctorRole("assistant"), "Ассистент врача");
		assert.strictEqual(formatDoctorRole("owner"), "Главный врач / Руководитель");
	});

	it("константы ключей localStorage соответствуют спецификации 152-ФЗ", () => {
		assert.strictEqual(DENTE_INACTIVITY_TIMEOUT_KEY, "dente_inactivity_timeout_minutes");
		assert.strictEqual(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "dente_privacy_shield_locked");
	});
});
