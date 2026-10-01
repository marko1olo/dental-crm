import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	cacheClinicDashboard,
	getCachedClinicDashboard,
	getCachedStaffList,
	cacheActiveStaffUser,
	getCachedActiveStaffUser,
	createOfflineFallbackDashboard,
	clearOfflineClinicCaches,
	setOfflineAutonomyMode,
	isOfflineAutonomyMode,
} from "../lib/offlineStorage.js";
import { clearInMemoryStorageCache } from "../lib/safeLocalStorage.js";

describe("offlineStorage: resilient offline caching", () => {
	beforeEach(() => {
		clearInMemoryStorageCache();
		clearOfflineClinicCaches();
	});

	it("cacheClinicDashboard сохраняет Dashboard, профиль и персонал, getCachedClinicDashboard возвращает их", () => {
		const sampleDashboard: any = {
			clinicSettings: {
				profile: { organizationId: "org-123", clinicName: "Стоматология Проф", mode: "solo_doctor" },
				staff: [{ id: "doc-1", fullName: "Д-р Иванов", role: "doctor", active: true }],
			},
			appointments: [],
			patients: [],
		};

		cacheClinicDashboard(sampleDashboard);

		const cached = getCachedClinicDashboard();
		assert.ok(cached);
		assert.equal(cached.clinicSettings?.profile?.clinicName, "Стоматология Проф");

		const staff = getCachedStaffList();
		assert.ok(Array.isArray(staff));
		assert.equal(staff.length, 1);
		assert.equal((staff[0] as any).fullName, "Д-р Иванов");
	});

	it("cacheActiveStaffUser и getCachedActiveStaffUser сохраняют и восстанавливают профиль врача", () => {
		const user = { id: "u-99", fullName: "Д-р Петров", role: "doctor" };
		cacheActiveStaffUser(user);

		const recovered = getCachedActiveStaffUser();
		assert.deepEqual(recovered, user);
	});

	it("setOfflineAutonomyMode и isOfflineAutonomyMode управляют флагом автономности", () => {
		assert.equal(isOfflineAutonomyMode(), false);
		setOfflineAutonomyMode(true);
		assert.equal(isOfflineAutonomyMode(), true);
		setOfflineAutonomyMode(false);
		assert.equal(isOfflineAutonomyMode(), false);
	});

	it("createOfflineFallbackDashboard формирует валидный рабочий дашборд без сбоев (Zero Dead-Ends)", () => {
		const fallback = createOfflineFallbackDashboard();
		assert.ok(fallback);
		assert.ok(fallback.clinicSettings?.staff?.length);
		assert.equal(fallback.clinicSettings?.staff?.[0]?.id, "demo-doctor-chief");
		assert.ok(fallback.clinicSettings?.chairs?.length);
	});

	it("createOfflineFallbackDashboard поддерживает режим соло-врача с ровно 1 креслом (Мандат 8n)", () => {
		const solo = createOfflineFallbackDashboard({ scale: "solo", name: "Кабинет Д-ра Смирнова" });
		assert.equal(solo.clinicSettings?.profile?.mode, "solo_doctor");
		assert.equal(solo.clinicSettings?.chairs?.length, 1);
		assert.equal(solo.clinicSettings?.chairs?.[0]?.name, "Кресло 1 (Основное)");
		assert.equal(solo.clinicSettings?.profile?.clinicName, "Кабинет Д-ра Смирнова");
	});

	it("createOfflineFallbackDashboard сеет 4 демо-пациента и приёмы при hasDemoData: true (Zero Dead-Ends)", () => {
		const demo = createOfflineFallbackDashboard({ scale: "solo", hasDemoData: true });
		assert.equal(demo.patients?.length, 4);
		assert.equal(demo.appointments?.length, 4);
		const names = demo.patients.map((p) => p.fullName);
		assert.ok(names.includes("Иванов Алексей Сергеевич"));
		assert.ok(names.includes("Смирнова Елена Викторовна"));
		assert.ok(names.includes("Кузнецов Дмитрий Михайлович"));
		assert.ok(names.includes("Морозова Анна Александровна"));
	});
});
