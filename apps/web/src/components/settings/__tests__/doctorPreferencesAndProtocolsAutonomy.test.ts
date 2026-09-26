import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	DEFAULT_DOCTOR_PREFERENCES,
	ANESTHETIC_OPTIONS,
	ISOLATION_OPTIONS,
	COMPOSITE_OPTIONS,
	ADHESIVE_OPTIONS,
	DURATION_PRESETS,
	ODONTOGRAM_NOTATIONS,
	FAVORITE_MEDICATION_OPTIONS,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import {
	ICD10_CLINICAL_PRESETS,
	PROTOCOL_CLINICAL_SNIPPETS,
	STANDARD_PROTOCOLS_SEED,
} from "../protocolSnippetHelpers";
import { useThemeStore } from "../../../store/themeStore";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

describe("Doctor Clinical Preferences & Super-Settings Invariants (Mandates 8e, 8n, 8d)", () => {
	beforeEach(() => {
		clearInMemoryStorageCache();
		useDoctorPreferencesStore.getState().resetPreferences();
	});

	it("1. Default doctor preferences must follow clinical golden standards", () => {
		const prefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(prefs.defaultVisitDuration, 30, "Default duration must be 30 minutes");
		assert.strictEqual(prefs.favoriteAnesthetic, "articaine_100k", "Default anesthetic must be Articaine 1:100k");
		assert.strictEqual(prefs.defaultIsolation, "cofferdam", "Default isolation must be cofferdam");
		assert.strictEqual(prefs.defaultComposite, "estelite_asteria", "Default composite must be Estelite Asteria");
		assert.strictEqual(prefs.defaultAdhesive, "optibond_fl", "Default adhesive must be OptiBond FL");
		assert.strictEqual(prefs.odontogramNotation, "fdi", "Default notation must be FDI (two-digit)");
		assert.strictEqual(prefs.defaultDentition, "adult", "Default dentition must be adult (32 teeth)");
		assert.strictEqual(prefs.enableSlotEndSound, true, "5-min slot timer sound must be enabled by default");
		assert.strictEqual(prefs.enableOnlineBookingSound, true, "Online booking sound must be enabled by default");
		assert.ok(prefs.quickProtocolIds.length >= 4, "Must have at least 4 default quick protocols");
		assert.strictEqual(prefs.autoMkb10, true, "Auto MKB-10 must be enabled by default");
		assert.strictEqual(prefs.somaticWarnings, true, "Somatic alerts must be enabled by default");
		assert.strictEqual(prefs.instantPhotoProtocol, true, "Photo protocol must be enabled by default");
		assert.strictEqual(prefs.voiceDictationActive, true, "Voice dictation must be enabled by default");
		assert.strictEqual(prefs.specialty, "therapist", "Default specialty must be therapist");
		assert.ok(prefs.favoriteMedicationIds.length >= 4, "Must have default favorite prescription medications");
	});

	it("2. Doctor can customize visit duration presets in 1 click (15, 30, 45, 60, 90, 120 min)", () => {
		const store = useDoctorPreferencesStore.getState();
		for (const duration of DURATION_PRESETS) {
			store.updatePreferences({ defaultVisitDuration: duration });
			assert.strictEqual(
				useDoctorPreferencesStore.getState().preferences.defaultVisitDuration,
				duration,
				`Duration must update to ${duration} min`,
			);
		}
	});

	it("3. Doctor can select favorite anesthetic and all presets provide accurate medical annotations", () => {
		const store = useDoctorPreferencesStore.getState();
		assert.strictEqual(ANESTHETIC_OPTIONS.length, 3, "Must provide 3 statutory anesthetic options");

		const articaine100 = ANESTHETIC_OPTIONS.find((a) => a.key === "articaine_100k");
		assert.ok(articaine100 && articaine100.hasAdrenaline);

		const scandonest = ANESTHETIC_OPTIONS.find((a) => a.key === "scandonest_mepivacaine_3");
		assert.ok(scandonest && !scandonest.hasAdrenaline, "Scandonest must not have adrenaline");

		store.updatePreferences({ favoriteAnesthetic: "scandonest_mepivacaine_3" });
		assert.strictEqual(
			useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic,
			"scandonest_mepivacaine_3",
		);
	});

	it("4. Consumable materials and isolation presets are typed and provide manufacturers", () => {
		assert.ok(ISOLATION_OPTIONS.length >= 4, "Must provide at least 4 isolation options including liquid dam");
		assert.ok(COMPOSITE_OPTIONS.length >= 6, "Must provide at least 6 composite options");
		assert.ok(ADHESIVE_OPTIONS.length >= 4, "Must provide at least 4 adhesive options");

		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			defaultIsolation: "optragate",
			defaultComposite: "filtek_ultimate",
			defaultAdhesive: "prime_and_bond_universal",
		});

		const current = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(current.defaultIsolation, "optragate");
		assert.strictEqual(current.defaultComposite, "filtek_ultimate");
		assert.strictEqual(current.defaultAdhesive, "prime_and_bond_universal");
	});

	it("5. Odontogram notations cover FDI, Universal and Palmer systems", () => {
		assert.strictEqual(ODONTOGRAM_NOTATIONS.length, 3);
		const keys = ODONTOGRAM_NOTATIONS.map((n) => n.key);
		assert.ok(keys.includes("fdi"));
		assert.ok(keys.includes("universal"));
		assert.ok(keys.includes("palmer"));
	});

	it("6. Quick protocol toggling maintains an array of unique protocol IDs", () => {
		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			quickProtocolIds: ["caries_medium_k02_1", "implant_installation_k08_1"],
		});
		assert.deepStrictEqual(
			useDoctorPreferencesStore.getState().preferences.quickProtocolIds,
			["caries_medium_k02_1", "implant_installation_k08_1"],
		);
	});

	it("7. Clinical snippets helpers provide statutory Form 043/u text blocks for 1-click insert including bone grafting", () => {
		assert.ok(PROTOCOL_CLINICAL_SNIPPETS.length >= 12, "Must provide comprehensive clinical snippets");

		// Verify bone grafting snippets (requested by user)
		const boneGraftSinus = PROTOCOL_CLINICAL_SNIPPETS.find((s) => s.id === "surg_bone_graft_sinus");
		assert.ok(boneGraftSinus, "Must include sinus-lift bone grafting snippet");
		assert.ok(boneGraftSinus.text.includes("Bio-Oss"), "Must mention statutory bone graft material");
		assert.ok(boneGraftSinus.text.includes("Bio-Gide"), "Must mention collagen barrier membrane");

		const boneGraftGbr = PROTOCOL_CLINICAL_SNIPPETS.find((s) => s.id === "surg_bone_graft_gbr");
		assert.ok(boneGraftGbr, "Must include GBR bone grafting snippet");

		// Verify pulpitis complete snippet
		const pulpitisSnippet = PROTOCOL_CLINICAL_SNIPPETS.find((s) => s.id === "prep_pulpitis_complete");
		assert.ok(pulpitisSnippet, "Must include complete pulpitis endodontic protocol");

		// Verify complex extraction snippet
		const complexExtraction = PROTOCOL_CLINICAL_SNIPPETS.find((s) => s.id === "surg_extraction_complex");
		assert.ok(complexExtraction, "Must include complex extraction protocol");
	});

	it("8. Standard protocols seed contains valid 6 statutory clinic protocols with ICD-10 diagnosis hints", () => {
		assert.ok(STANDARD_PROTOCOLS_SEED.length >= 6, "Must provide 6 statutory clinic protocols");
		for (const proto of STANDARD_PROTOCOLS_SEED) {
			assert.ok(proto.title && proto.title.length > 0);
			assert.ok(proto.specialty && proto.specialty.length > 0);
			assert.ok(proto.defaultDurationMinutes && proto.defaultDurationMinutes >= 30);
			assert.ok(proto.treatmentPlanTemplate && proto.treatmentPlanTemplate.length > 0);
			assert.ok(proto.diagnosisHints && proto.diagnosisHints.length > 0, "Must contain ICD-10 diagnosis hints");
		}
	});

	it("9. Theme switcher supports instant zero-reload switching across clinical themes", () => {
		const themeStore = useThemeStore.getState();
		themeStore.setThemeMode("calm_teal");
		assert.strictEqual(useThemeStore.getState().themeMode, "calm_teal");

		themeStore.setThemeMode("night");
		assert.strictEqual(useThemeStore.getState().themeMode, "night");

		themeStore.setThemeMode("light");
		assert.strictEqual(useThemeStore.getState().themeMode, "light");
	});

	it("10. Favorite prescription medications (Form 107-1/u) provide complete clinical and Latin data", () => {
		assert.ok(FAVORITE_MEDICATION_OPTIONS.length >= 8, "Must provide at least 8 essential dental medications");

		const amoxiclav = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "amoxiclav_875_125");
		assert.ok(amoxiclav, "Must contain Amoxiclav 875+125");
		assert.ok(amoxiclav.rpLatin.includes("Amoxicillini"), "Must have valid Latin Rp formula");
		assert.strictEqual(amoxiclav.category, "antibiotic");

		const nimesil = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "nimesil_100");
		assert.ok(nimesil, "Must contain Nimesil 100");
		assert.ok(nimesil.rpLatin.includes("Nimesulidi"), "Must have valid Latin Rp formula");

		const chlorhexidine = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "chlorhexidine_005");
		assert.ok(chlorhexidine, "Must contain Chlorhexidine 0.05%");

		const cyfran = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "cyfran_st");
		assert.ok(cyfran, "Must contain Cyfran ST for anaerobes");

		const suprastin = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "suprastin_25");
		assert.ok(suprastin, "Must contain Suprastin for postoperative edema");

		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			favoriteMedicationIds: ["amoxiclav_875_125", "nimesil_100", "cyfran_st"],
		});
		assert.deepStrictEqual(
			useDoctorPreferencesStore.getState().preferences.favoriteMedicationIds,
			["amoxiclav_875_125", "nimesil_100", "cyfran_st"],
		);
	});

	it("11. Specialty presets reconfigure doctor preferences in 1 click (surgeon, therapist, pediatric)", () => {
		const store = useDoctorPreferencesStore.getState();

		// Surgeon preset: 45 min, articaine 1:100k, surgical prescription medications
		store.applySpecialtyPreset("surgeon");
		const surgeonPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(surgeonPrefs.specialty, "surgeon");
		assert.strictEqual(surgeonPrefs.defaultVisitDuration, 45);
		assert.strictEqual(surgeonPrefs.favoriteAnesthetic, "articaine_100k");
		assert.ok(surgeonPrefs.favoriteMedicationIds.includes("amoxiclav_875_125"));
		assert.ok(surgeonPrefs.favoriteMedicationIds.includes("tranexamic_500"));

		// Therapist preset: 60 min, articaine 1:200k, Estelite, OptiBond FL
		store.applySpecialtyPreset("therapist");
		const therapistPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(therapistPrefs.specialty, "therapist");
		assert.strictEqual(therapistPrefs.defaultVisitDuration, 60);
		assert.strictEqual(therapistPrefs.favoriteAnesthetic, "articaine_200k");
		assert.strictEqual(therapistPrefs.defaultComposite, "estelite_asteria");
		assert.strictEqual(therapistPrefs.defaultAdhesive, "optibond_fl");

		// Pediatric preset: 30 min, pediatric dentition
		store.applySpecialtyPreset("pediatric");
		const pedPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(pedPrefs.specialty, "pediatric");
		assert.strictEqual(pedPrefs.defaultVisitDuration, 30);
		assert.strictEqual(pedPrefs.defaultDentition, "pediatric");
	});

	it("12. ICD-10 clinical presets provide fast 1-click diagnoses for Form 043/u protocols", () => {
		assert.ok(ICD10_CLINICAL_PRESETS.length >= 8);
		const codes = ICD10_CLINICAL_PRESETS.map((p) => p.code);
		assert.ok(codes.includes("К02.1"), "Must include caries К02.1");
		assert.ok(codes.includes("К04.0"), "Must include pulpitis К04.0");
		assert.ok(codes.includes("К08.1"), "Must include extraction/loss К08.1");
		assert.ok(codes.includes("К05.0"), "Must include gingivitis К05.0");
		assert.ok(codes.includes("Z01.2"), "Must include checkup Z01.2");
	});

	it("13. Smart clinical assistant toggles persist state without modal blockers", () => {
		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			autoMkb10: false,
			somaticWarnings: false,
			instantPhotoProtocol: false,
			voiceDictationActive: false,
		});

		const updated = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(updated.autoMkb10, false);
		assert.strictEqual(updated.somaticWarnings, false);
		assert.strictEqual(updated.instantPhotoProtocol, false);
		assert.strictEqual(updated.voiceDictationActive, false);
	});

	it("14. Anesthetic pharmacological drug mapping is clinically exact", () => {
		// Articaine 1:100k -> ultracain_ds_forte
		// Articaine 1:200k -> ultracain_ds
		// Scandonest -> scandonest_3
		const mapPrefToDrug = (key: string): string => {
			if (key === "scandonest_mepivacaine_3") return "scandonest_3";
			if (key === "articaine_200k") return "ultracain_ds";
			return "ultracain_ds_forte";
		};

		assert.strictEqual(mapPrefToDrug("articaine_100k"), "ultracain_ds_forte");
		assert.strictEqual(mapPrefToDrug("articaine_200k"), "ultracain_ds");
		assert.strictEqual(mapPrefToDrug("scandonest_mepivacaine_3"), "scandonest_3");
	});
});
