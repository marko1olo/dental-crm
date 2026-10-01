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
});
