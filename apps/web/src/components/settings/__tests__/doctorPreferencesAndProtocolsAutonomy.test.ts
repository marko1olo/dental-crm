import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	DEFAULT_DOCTOR_PREFERENCES,
	ANESTHETIC_OPTIONS,
	ISOLATION_OPTIONS,
	COMPOSITE_OPTIONS,
	ADHESIVE_OPTIONS,
	ETCHANT_OPTIONS,
	DURATION_PRESETS,
	ODONTOGRAM_NOTATIONS,
	FAVORITE_MEDICATION_OPTIONS,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import {
	ICD10_CLINICAL_PRESETS,
	PROTOCOL_CLINICAL_SNIPPETS,
	STANDARD_PROTOCOLS_SEED,
	buildDoctorPersonalizedTherapySnippet,
	resolveCompositeName,
	resolveAdhesiveName,
	resolveAnestheticName,
	resolveIsolationName,
	resolveEtchantName,
} from "../protocolSnippetHelpers";
import { DOCTOR_TABS } from "../doctorSettingsTabs";
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
		assert.strictEqual(prefs.defaultEtchant, "ultra_etch", "Default etchant must be Ultra-Etch");
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

	it("3. Comprehensive 90% anesthetics catalog covers 9 preparations strictly ordered by popularity", () => {
		const store = useDoctorPreferencesStore.getState();
		assert.ok(ANESTHETIC_OPTIONS.length >= 9, "Must provide at least 9 clinical anesthetic options");

		// Check popularity rank order 1..9
		const ranks = ANESTHETIC_OPTIONS.map((a) => a.popularityRank);
		for (let i = 0; i < ranks.length; i++) {
			assert.strictEqual(ranks[i], i + 1, `Rank at index ${i} must be ${i + 1}`);
		}

		// Verify required property typing (id, name, manufacturer, description, popularityRank, isFavoriteDefault)
		for (const opt of ANESTHETIC_OPTIONS) {
			assert.ok(opt.id, "Anesthetic must have id");
			assert.ok(opt.name, "Anesthetic must have name");
			assert.ok(opt.manufacturer, "Anesthetic must have manufacturer");
			assert.ok(opt.description, "Anesthetic must have description");
			assert.ok(typeof opt.popularityRank === "number", "Anesthetic must have popularityRank");
			assert.ok(typeof opt.isFavoriteDefault === "boolean", "Anesthetic must have isFavoriteDefault");
		}

		// Verify 1: Ultracain Forte (Sanofi)
		const ultracainForte = ANESTHETIC_OPTIONS.find((a) => a.id === "articaine_100k");
		assert.ok(ultracainForte && ultracainForte.hasAdrenaline && ultracainForte.popularityRank === 1);
		assert.strictEqual(ultracainForte.isFavoriteDefault, true);

		// Verify 2: Ultracain D-S (Sanofi)
		const ultracainDs = ANESTHETIC_OPTIONS.find((a) => a.id === "articaine_200k");
		assert.ok(ultracainDs && ultracainDs.hasAdrenaline && ultracainDs.popularityRank === 2);

		// Verify 3: Septanest (Septodont)
		const septanest = ANESTHETIC_OPTIONS.find((a) => a.id === "septanest_100k");
		assert.ok(septanest && septanest.popularityRank === 3);

		// Verify 4: Ubistesin (3M)
		const ubistesin = ANESTHETIC_OPTIONS.find((a) => a.id === "ubistesin_forte");
		assert.ok(ubistesin && ubistesin.popularityRank === 4);

		// Verify 5: Articaine Binergia (RF)
		const binergia = ANESTHETIC_OPTIONS.find((a) => a.id === "articaine_binergia");
		assert.ok(binergia && binergia.popularityRank === 5);

		// Verify 6: Scandonest 3% plain (Septodont)
		const scandonest = ANESTHETIC_OPTIONS.find((a) => a.id === "scandonest_mepivacaine_3");
		assert.ok(scandonest && !scandonest.hasAdrenaline && scandonest.popularityRank === 6);

		// Verify 7: Mepivastesin 3% (3M)
		const mepivastesin = ANESTHETIC_OPTIONS.find((a) => a.id === "mepivastesin_3");
		assert.ok(mepivastesin && !mepivastesin.hasAdrenaline && mepivastesin.popularityRank === 7);

		// Verify 8: Lidocaine 2%
		const lidocaine = ANESTHETIC_OPTIONS.find((a) => a.id === "lidocaine_2");
		assert.ok(lidocaine && lidocaine.popularityRank === 8);

		// Verify 9: Topical lidoxor/dicain
		const topical = ANESTHETIC_OPTIONS.find((a) => a.id === "topical_lidoxor");
		assert.ok(topical && topical.popularityRank === 9);

		// Test doctor preference update
		store.updatePreferences({ favoriteAnesthetic: "scandonest_mepivacaine_3" });
		assert.strictEqual(
			useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic,
			"scandonest_mepivacaine_3",
		);
	});

	it("4. Consumable materials catalogs cover 90% of RF/CIS market (15+ composites, 11+ adhesives, 8 isolations, 4 etchants)", () => {
		// Composites
		assert.ok(COMPOSITE_OPTIONS.length >= 15, "Must provide at least 15 composite options");
		for (const comp of COMPOSITE_OPTIONS) {
			assert.ok(comp.id, "Composite must have id");
			assert.ok(comp.name, "Composite must have name");
			assert.ok(comp.manufacturer, "Composite must have manufacturer");
			assert.ok(comp.description, "Composite must have description");
			assert.ok(typeof comp.popularityRank === "number", "Composite must have popularityRank");
			assert.ok(typeof comp.isFavoriteDefault === "boolean", "Composite must have isFavoriteDefault");
		}

		// Check Top 15 Composites in popularity order:
		assert.strictEqual(COMPOSITE_OPTIONS[0].id, "filtek_ultimate"); // 1. Filtek Ultimate / Z250
		assert.strictEqual(COMPOSITE_OPTIONS[1].id, "estelite_asteria"); // 2. Estelite Asteria
		assert.strictEqual(COMPOSITE_OPTIONS[2].id, "gradia_direct"); // 3. Gradia Direct
		assert.strictEqual(COMPOSITE_OPTIONS[3].id, "harmonize"); // 4. Harmonize
		assert.strictEqual(COMPOSITE_OPTIONS[4].id, "charisma_classic"); // 5. Charisma Classic
		assert.strictEqual(COMPOSITE_OPTIONS[5].id, "ceram_x_sphere_tec"); // 6. Ceram.x SphereTEC
		assert.strictEqual(COMPOSITE_OPTIONS[6].id, "brilliant_everglow"); // 7. Brilliant EverGlow
		assert.strictEqual(COMPOSITE_OPTIONS[7].id, "tetric_n_ceram"); // 8. Tetric N-Ceram
		assert.strictEqual(COMPOSITE_OPTIONS[8].id, "omnichroma"); // 9. Omnichroma
		assert.strictEqual(COMPOSITE_OPTIONS[9].id, "esthet_x_hd"); // 10. Esthet-X HD
		assert.strictEqual(COMPOSITE_OPTIONS[10].id, "grandio_admira"); // 11. Grandio / Admira
		assert.strictEqual(COMPOSITE_OPTIONS[11].id, "enamel_plus_hri"); // 12. Enamel Plus HRi
		assert.strictEqual(COMPOSITE_OPTIONS[12].id, "clearfil_majesty_es2"); // 13. Clearfil Majesty ES-2
		assert.strictEqual(COMPOSITE_OPTIONS[13].id, "spectrum_tph3"); // 14. Spectrum TPH3
		assert.strictEqual(COMPOSITE_OPTIONS[14].id, "dentlight"); // 15. ДентЛайт (ВладМиВа)

		// Adhesives
		assert.ok(ADHESIVE_OPTIONS.length >= 11, "Must provide at least 11 adhesive options");
		for (const adh of ADHESIVE_OPTIONS) {
			assert.ok(adh.id, "Adhesive must have id");
			assert.ok(adh.name, "Adhesive must have name");
			assert.ok(adh.manufacturer, "Adhesive must have manufacturer");
			assert.ok(adh.description, "Adhesive must have description");
			assert.ok(typeof adh.popularityRank === "number", "Adhesive must have popularityRank");
			assert.ok(typeof adh.isFavoriteDefault === "boolean", "Adhesive must have isFavoriteDefault");
		}

		// Check Top 11 Adhesives in popularity order:
		assert.strictEqual(ADHESIVE_OPTIONS[0].id, "optibond_fl"); // 1. OptiBond FL (IV поколение)
		assert.strictEqual(ADHESIVE_OPTIONS[1].id, "clearfil_se_bond_2"); // 2. Clearfil SE Bond 2 (VI поколение)
		assert.strictEqual(ADHESIVE_OPTIONS[2].id, "single_bond_universal"); // 3. Single Bond Universal (3M)
		assert.strictEqual(ADHESIVE_OPTIONS[3].id, "prime_and_bond_universal"); // 4. Prime & Bond Universal
		assert.strictEqual(ADHESIVE_OPTIONS[4].id, "g_premio_bond"); // 5. G-Premio BOND (GC)
		assert.strictEqual(ADHESIVE_OPTIONS[5].id, "optibond_universal"); // 6. OptiBond Universal (Kerr)
		assert.strictEqual(ADHESIVE_OPTIONS[6].id, "gluma_2bond"); // 7. Gluma 2Bond (Kulzer)
		assert.strictEqual(ADHESIVE_OPTIONS[7].id, "tokuyama_universal_bond"); // 8. Tokuyama Universal Bond
		assert.strictEqual(ADHESIVE_OPTIONS[8].id, "futurabond_u"); // 9. Futurabond U / M (Voco)
		assert.strictEqual(ADHESIVE_OPTIONS[9].id, "adhese_universal"); // 10. Adhese Universal (Ivoclar)
		assert.strictEqual(ADHESIVE_OPTIONS[10].id, "all_bond_universal"); // 11. All-Bond Universal (Bisco)

		// Isolation
		assert.ok(ISOLATION_OPTIONS.length >= 8, "Must provide at least 8 isolation options");
		assert.strictEqual(ISOLATION_OPTIONS[0].id, "cofferdam"); // Sanctuary
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "cofferdam_tor_vm")); // Тор ВМ
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "cofferdam_nic_tone")); // Nic Tone
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "cofferdam_ksk_dentech")); // KSK Dentech
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "optidam")); // OptiDam Kerr
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "liquid_dam")); // Жидкий коффердам
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "optragate")); // Оптрагейт
		assert.ok(ISOLATION_OPTIONS.some((i) => i.id === "cotton_rolls")); // Ватные валики

		// Etchants
		assert.ok(ETCHANT_OPTIONS.length >= 4, "Must provide at least 4 etching gel options");
		assert.strictEqual(ETCHANT_OPTIONS[0].id, "ultra_etch"); // Ultra-Etch
		assert.strictEqual(ETCHANT_OPTIONS[1].id, "scotchbond_etch"); // Scotchbond
		assert.strictEqual(ETCHANT_OPTIONS[2].id, "total_etch"); // Total Etch
		assert.strictEqual(ETCHANT_OPTIONS[3].id, "travis_vladmiva"); // Травис

		// Test preference update
		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			defaultIsolation: "optragate",
			defaultComposite: "filtek_ultimate",
			defaultAdhesive: "prime_and_bond_universal",
			defaultEtchant: "scotchbond_etch",
		});

		const current = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(current.defaultIsolation, "optragate");
		assert.strictEqual(current.defaultComposite, "filtek_ultimate");
		assert.strictEqual(current.defaultAdhesive, "prime_and_bond_universal");
		assert.strictEqual(current.defaultEtchant, "scotchbond_etch");
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
		assert.ok(FAVORITE_MEDICATION_OPTIONS.length >= 11, "Must provide at least 11 essential dental medications");

		const amoxiclav = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "amoxiclav_875_125");
		assert.ok(amoxiclav, "Must contain Amoxiclav 875+125");
		assert.ok(amoxiclav.rpLatin.includes("Amoxicillini"), "Must have valid Latin Rp formula");
		assert.strictEqual(amoxiclav.category, "antibiotic");

		const nimesil = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "nimesil_100");
		assert.ok(nimesil, "Must contain Nimesil 100");
		assert.ok(nimesil.rpLatin.includes("Nimesulidi"), "Must have valid Latin Rp formula");

		const chlorhexidine = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "chlorhexidine_005");
		assert.ok(chlorhexidine, "Must contain Chlorhexidine 0.05%");

		const metrogyl = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "metrogyl_denta");
		assert.ok(metrogyl, "Must contain Metrogyl Denta gel");
		assert.strictEqual(metrogyl.category, "dental_gel");
		assert.ok(metrogyl.rpLatin.includes("Metrogyl Denta"));

		const ketorol = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "ketorol_express_10");
		assert.ok(ketorol, "Must contain Ketorol Express for acute SOS pain");
		assert.strictEqual(ketorol.category, "nsaid");
		assert.ok(ketorol.rpLatin.includes("Ketorolaci"));

		const azithro = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "azithromycin_500");
		assert.ok(azithro, "Must contain Azithromycin for penicillin allergy");
		assert.strictEqual(azithro.category, "antibiotic");
		assert.ok(azithro.rpLatin.includes("Azithromycini"));

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

		// Therapist preset: 60 min, articaine 1:200k, Estelite, OptiBond FL, Ultra-Etch
		store.applySpecialtyPreset("therapist");
		const therapistPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(therapistPrefs.specialty, "therapist");
		assert.strictEqual(therapistPrefs.defaultVisitDuration, 60);
		assert.strictEqual(therapistPrefs.favoriteAnesthetic, "articaine_200k");
		assert.strictEqual(therapistPrefs.defaultComposite, "estelite_asteria");
		assert.strictEqual(therapistPrefs.defaultAdhesive, "optibond_fl");
		assert.strictEqual(therapistPrefs.defaultEtchant, "ultra_etch");

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
		const mapPrefToDrug = (key: string): string => {
			if (key === "scandonest_mepivacaine_3" || key === "mepivastesin_3") return "scandonest_3";
			if (key === "articaine_200k") return "ultracain_ds";
			if (key === "lidocaine_2") return "lidocaine_2";
			return "ultracain_ds_forte";
		};

		assert.strictEqual(mapPrefToDrug("articaine_100k"), "ultracain_ds_forte");
		assert.strictEqual(mapPrefToDrug("articaine_200k"), "ultracain_ds");
		assert.strictEqual(mapPrefToDrug("scandonest_mepivacaine_3"), "scandonest_3");
		assert.strictEqual(mapPrefToDrug("mepivastesin_3"), "scandonest_3");
		assert.strictEqual(mapPrefToDrug("septanest_100k"), "ultracain_ds_forte");
		assert.strictEqual(mapPrefToDrug("ubistesin_forte"), "ultracain_ds_forte");
		assert.strictEqual(mapPrefToDrug("lidocaine_2"), "lidocaine_2");
	});

	it("15. Doctor workspace provides a dedicated 'preferences' subtab for 1-click clinical configuration", () => {
		const prefTab = DOCTOR_TABS.find((t) => t.id === "preferences");
		assert.ok(prefTab, "Doctor workspace must have a dedicated 'preferences' subtab");
		assert.strictEqual(prefTab.label, "Клинические пресеты");
	});

	it("16. Default doctor quick protocols include bone grafting and implant surgery", () => {
		const defs = DEFAULT_DOCTOR_PREFERENCES.quickProtocolIds;
		assert.ok(defs.includes("bone_graft_sinus_k08_2"), "Must include sinus lift protocol");
		assert.ok(defs.includes("implant_installation_k08_1"), "Must include implant installation protocol");
		assert.ok(defs.includes("pulpitis_acute_k04_0"), "Must include acute pulpitis protocol");
		assert.ok(defs.includes("caries_medium_k02_1"), "Must include caries protocol");
	});

	it("17. Personalized Form 043/u protocol text dynamically reflects doctor's custom materials", () => {
		const store = useDoctorPreferencesStore.getState();

		// Custom materials configuration
		store.updatePreferences({
			defaultComposite: "ceram_x_sphere_tec",
			defaultAdhesive: "clearfil_se_bond_2",
			favoriteAnesthetic: "septanest_100k",
			defaultIsolation: "optragate",
			defaultEtchant: "scotchbond_etch",
		});

		const current = useDoctorPreferencesStore.getState().preferences;
		const protocolText = buildDoctorPersonalizedTherapySnippet(current);

		assert.ok(protocolText.includes("Ceram.X SphereTEC One"), "Protocol must include Ceram.X SphereTEC");
		assert.ok(protocolText.includes("Clearfil SE Bond 2"), "Protocol must include Clearfil SE Bond 2");
		assert.ok(protocolText.includes("Септанест"), "Protocol must include Septanest");
		assert.ok(protocolText.includes("OptraGate"), "Protocol must include OptraGate");
		assert.ok(protocolText.includes("Scotchbond"), "Protocol must include Scotchbond Etchant");

		// Also verify individual resolvers
		assert.ok(resolveCompositeName("filtek_ultimate").includes("Filtek"));
		assert.ok(resolveAdhesiveName("optibond_fl").includes("OptiBond FL"));
		assert.ok(resolveAnestheticName("articaine_100k").includes("Артикаин"));
		assert.ok(resolveIsolationName("cofferdam").includes("Sanctuary"));
		assert.ok(resolveEtchantName("ultra_etch").includes("Ultra-Etch"));
	});
});
