import assert from "node:assert";
import { describe, it } from "node:test";
import {
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	formatDoctorRole,
	getDoctorInitials,
	getInactivityTimeoutMs,
} from "../DoctorPrivacyShield";

describe("DoctorPrivacyShield helper functions", () => {
	it("правильно извлекает инициалы врача из полного имени", () => {
		assert.strictEqual(getDoctorInitials("Иванов Иван Иванович"), "ИИ");
		assert.strictEqual(getDoctorInitials("Смирнова Анна"), "СА");
		assert.strictEqual(getDoctorInitials("Доктор"), "ДО");
		assert.strictEqual(getDoctorInitials(""), "ВР");
		assert.strictEqual(getDoctorInitials(null), "ВР");
		assert.strictEqual(getDoctorInitials(undefined), "ВР");
	});

	it("форматирует роли сотрудников клиники на русский язык", () => {
		assert.strictEqual(formatDoctorRole("doctor"), "Врач-стоматолог");
		assert.strictEqual(formatDoctorRole("assistant"), "Ассистент врача");
		assert.strictEqual(formatDoctorRole("admin"), "Администратор клиники");
		assert.strictEqual(formatDoctorRole("owner"), "Главный врач / Руководитель");
		assert.strictEqual(formatDoctorRole("director"), "Главный врач / Руководитель");
		assert.strictEqual(formatDoctorRole(null), "Клинический специалист");
	});

	it("возвращает дефолтный таймаут неактивности (5 минут = 300_000 мс) при пустом localStorage", () => {
		if (typeof window !== "undefined") {
			window.localStorage.removeItem(DENTE_INACTIVITY_TIMEOUT_KEY);
		}
		const timeout = getInactivityTimeoutMs();
		assert.strictEqual(timeout, 5 * 60 * 1000);
	});

	it("корректно читает настроенный таймаут неактивности из localStorage", () => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem(DENTE_INACTIVITY_TIMEOUT_KEY, "3");
			const timeout = getInactivityTimeoutMs();
			assert.strictEqual(timeout, 3 * 60 * 1000);
			window.localStorage.removeItem(DENTE_INACTIVITY_TIMEOUT_KEY);
		}
	});

	it("имеет правильные имена констант localStorage для экрана приватности", () => {
		assert.strictEqual(DENTE_INACTIVITY_TIMEOUT_KEY, "dente_inactivity_timeout_minutes");
		assert.strictEqual(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "dente_privacy_shield_locked");
	});
});
