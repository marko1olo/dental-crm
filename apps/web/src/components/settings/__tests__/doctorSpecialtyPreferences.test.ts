import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_NEEDLE_OPTIONS,
	type DoctorSpecialtyKey,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";

describe("Doctor Specialty Preferences & Autonomy", () => {
	const specialties: DoctorSpecialtyKey[] = [
		"therapist",
		"orthopedist",
		"surgeon",
		"orthodontist",
		"periodontist",
		"pediatric",
	];

	it("Поддерживает все 6 клинических специальностей врачей", () => {
		assert.equal(specialties.length, 6);
	});

	it("1-клик активация пресета 'therapist' калибрует терапевтический кабинет", () => {
		const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
		applySpecialtyPreset("therapist");
		const state = useDoctorPreferencesStore.getState().preferences;
		assert.equal(state.specialty, "therapist");
		assert.equal(state.defaultVisitDuration, 60);
		assert.equal(state.favoriteAnesthetic, "articaine_200k");
		assert.equal(state.defaultIsolation, "cofferdam");
		assert.equal(state.defaultComposite, "estelite_asteria");
		assert.equal(state.defaultAdhesive, "optibond_fl");
	});

	it("1-клик активация пресета 'surgeon' калибрует хирургический кабинет", () => {
		const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
		applySpecialtyPreset("surgeon");
		const state = useDoctorPreferencesStore.getState().preferences;
		assert.equal(state.specialty, "surgeon");
		assert.equal(state.defaultVisitDuration, 45);
		assert.equal(state.favoriteAnesthetic, "articaine_100k");
		assert.ok(state.favoriteMedicationIds.includes("amoxiclav_875_125"));
		assert.ok(state.favoriteMedicationIds.includes("nimesil_100"));
		assert.ok(state.favoriteMedicationIds.includes("suprastin_25"));
	});

	it("1-клик активация пресета 'pediatric' калибрует детский приём", () => {
		const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
		applySpecialtyPreset("pediatric");
		const state = useDoctorPreferencesStore.getState().preferences;
		assert.equal(state.specialty, "pediatric");
		assert.equal(state.defaultVisitDuration, 30);
		assert.equal(state.defaultDentition, "pediatric");
	});

	it("1-клик активация пресета 'periodontist' калибрует пародонтологический профиль", () => {
		const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
		applySpecialtyPreset("periodontist");
		const state = useDoctorPreferencesStore.getState().preferences;
		assert.equal(state.specialty, "periodontist");
		assert.equal(state.defaultVisitDuration, 45);
		assert.equal(state.defaultIsolation, "optragate");
		assert.ok(state.favoriteMedicationIds.includes("chlorhexidine_005"));
		assert.ok(state.favoriteMedicationIds.includes("metrogyl_denta"));
	});

	it("Поддерживает ключевые анестетики и карпульные иглы РФ/СНГ", () => {
		const { updatePreferences } = useDoctorPreferencesStore.getState();
		updatePreferences({ favoriteAnesthetic: "articaine_200k" });
		assert.equal(useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic, "articaine_200k");
		updatePreferences({ favoriteAnesthetic: "scandonest_mepivacaine_3" });
		assert.equal(useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic, "scandonest_mepivacaine_3");

		assert.ok(DENTAL_NEEDLE_OPTIONS.length >= 4);
		const shortNeedle = DENTAL_NEEDLE_OPTIONS.find((n) => n.id === "septoject_30g_short");
		assert.ok(shortNeedle && shortNeedle.gauge === "30G (0.3 мм)");
	});

	it("Пресеты специальностей калибруют анестетик и иглы в 1 клик", () => {
		const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
		applySpecialtyPreset("surgeon");
		let s = useDoctorPreferencesStore.getState().preferences;
		assert.equal(s.favoriteAnesthetic, "articaine_100k");
		assert.equal(s.favoriteNeedleType, "septoject_27g_long");

		applySpecialtyPreset("pediatric");
		s = useDoctorPreferencesStore.getState().preferences;
		assert.equal(s.favoriteNeedleType, "septoject_30g_extra_short");
	});
});
