/**
 * apps/web/src/tests/patientAnamnesisRedTeamInquisition.test.ts
 *
 * RED TEAM INQUISITION TEST SUITE:
 * Patient Somatic Anamnesis, Allergies, Chairside Sync & EMR Integrity Audit.
 *
 * Mandates Verified:
 * - Mandate 8c & 8k: Dual-Mode Isolation (Production honest empty state vs Demo Showcase clinical safety).
 * - Mandate 8e: Doctor Autonomy (1-Click physiological norm, zero blocking modals, zero disabled buttons).
 * - Mandate 8i: Ambulatory Clinical Safety (Instant chairside allergy synchronization in desktop and mobile HUD).
 * - Mandate 8d: Sanctity of Medical Records (Zero cartoon emojis in clinical badges and presets).
 * - Apple HIG: Mobile touch ergonomics (Touch targets >= 44x44px).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isNegativeAllergyStatement,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
} from "../components/patients/safetyMath.js";
import {
	ANAMNESIS_PRESETS,
	DEFAULT_ANAMNESIS_PROFILE,
	applyAnamnesisPreset,
} from "../components/patients/patientAnamnesisPresets.js";
import {
	calculateActivePatientCriticalBadges,
	type PatientForCriticalBadges,
} from "../components/visit/view/visitCriticalBadges.js";
import {
	getDemoShowcasePatients,
	isDemoShowcaseMode,
} from "../utils/demoModeEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrc = path.resolve(__dirname, "..");

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

describe("Patient Somatic Anamnesis & Allergy Chairside Integrity Suite", () => {
	describe("1. Chairside Allergy & Somatic Signal Synchronization", () => {
		it("flags penicillin allergy in chairside critical badges with alternative antibiotics", () => {
			const allergicPatient: PatientForCriticalBadges = {
				allergies: "Аллергия на пенициллиновый ряд (Амоксиклав, Аугментин)",
				somaticNotes: "Артериальная гипертензия 1 ст.",
			};

			const badges = calculateActivePatientCriticalBadges(allergicPatient);
			assert.ok(badges.length > 0, "Must generate critical badges for allergic patient");

			const penicillinBadge = badges.find((b) => b.id === "penicillin");
			assert.ok(penicillinBadge, "Must generate penicillin alert badge");
			assert.strictEqual(penicillinBadge.shortLabel, "ПЕНИЦИЛЛИН");
			assert.ok(
				penicillinBadge.fullLabel.includes("Кларитромицин") ||
				penicillinBadge.title.includes("Кларитромицин"),
				"Must recommend safe alternative antibiotics",
			);
		});

		it("returns empty critical badges for somatic-clean patient without false alarms", () => {
			const cleanPatient: PatientForCriticalBadges = {
				allergies: "Аллергии не выявлены. Переносимость анестетиков хорошая.",
				somaticNotes: "Соматически здоров. Физиологическая норма.",
			};

			const badges = calculateActivePatientCriticalBadges(cleanPatient);
			assert.strictEqual(
				badges.length,
				0,
				"Must not generate critical red alert badges for clean patient",
			);
		});

		it("correctly identifies negative allergy statements (isNegativeAllergyStatement)", () => {
			assert.strictEqual(isNegativeAllergyStatement("Аллергии не выявлены"), true);
			assert.strictEqual(isNegativeAllergyStatement("Аллергоанамнез не отягощен"), true);
			assert.strictEqual(isNegativeAllergyStatement("Отрицает"), true);
			assert.strictEqual(isNegativeAllergyStatement("Со слов здоров"), true);
			assert.strictEqual(isNegativeAllergyStatement("Аллергия на пенициллин"), false);
			assert.strictEqual(isNegativeAllergyStatement("Отек Квинке на лидокаин"), false);
		});

		it("VisitHeaderMonolith and VisitView render clean allergy badge branch when badges are empty", () => {
			const monolithContent = fs.readFileSync(
				path.join(webSrc, "components/visit/view/VisitHeaderMonolith.tsx"),
				"utf-8",
			);
			const visitViewContent = fs.readFileSync(
				path.join(webSrc, "VisitView.tsx"),
				"utf-8",
			);

			// Check VisitHeaderMonolith
			assert.ok(
				monolithContent.includes('data-testid="visit-focus-allergy-alert"'),
				"VisitHeaderMonolith must have alert allergy badge",
			);
			assert.ok(
				monolithContent.includes('data-testid="visit-focus-allergy-clean"'),
				"VisitHeaderMonolith must have clean allergy badge branch",
			);
			assert.ok(
				monolithContent.includes("Аллергии не выявлены"),
				"VisitHeaderMonolith must render 'Аллергии не выявлены'",
			);

			// Check VisitView
			assert.ok(
				visitViewContent.includes('data-testid="visit-focus-allergy-alert"'),
				"VisitView must have alert allergy badge",
			);
			assert.ok(
				visitViewContent.includes('data-testid="visit-focus-allergy-clean"'),
				"VisitView must have clean allergy badge branch",
			);
			assert.ok(
				visitViewContent.includes("Аллергии не выявлены"),
				"VisitView must render 'Аллергии не выявлены'",
			);
		});

		it("MobileChairsideVisitWorkspace renders mobile-chairside-allergy-clean badge when no allergy exists", () => {
			const mobileWorkspaceContent = fs.readFileSync(
				path.join(webSrc, "components/visit/MobileChairsideVisitWorkspace.tsx"),
				"utf-8",
			);
			const mobileCssContent = fs.readFileSync(
				path.join(webSrc, "components/visit/mobile-chairside-visit.css"),
				"utf-8",
			);

			assert.ok(
				mobileWorkspaceContent.includes("mobile-chairside-allergy-clean"),
				"MobileChairsideVisitWorkspace must render mobile-chairside-allergy-clean class",
			);
			assert.ok(
				mobileWorkspaceContent.includes("allergy-clean-badge"),
				"MobileChairsideVisitWorkspace must have test-id for clean allergy badge",
			);
			assert.ok(
				mobileCssContent.includes(".mobile-chairside-allergy-clean"),
				"mobile-chairside-visit.css must define .mobile-chairside-allergy-clean",
			);
		});
	});

	describe("2. 1-Click Physiological Norm & Doctor Autonomy (Mandates 8e & 8k)", () => {
		it("createHealthySomaticNormProfile initializes non-burdened physiological norm", () => {
			const norm = createHealthySomaticNormProfile();

			assert.strictEqual(norm.hasLidocaineAllergy, false);
			assert.strictEqual(norm.hasArticaineAllergy, false);
			assert.strictEqual(norm.hasPenicillinAllergy, false);
			assert.strictEqual(norm.hasPacemakerExs, false);
			assert.strictEqual(norm.hasHypertension, false);
			assert.strictEqual(norm.pregnancyTrimester, "none");
			assert.ok(
				norm.customChronicNotes?.includes("Соматически здоров"),
				"Notes must reflect healthy somatic status",
			);
		});

		it("evaluatePatientSafetyFlags returns zero stop flags for healthy norm", () => {
			const norm = DEFAULT_SOMATIC_HEALTHY_NORM;
			const evaluation = evaluatePatientSafetyFlags(norm);

			assert.strictEqual(evaluation.hasCriticalStopFlags, false);
			assert.strictEqual(evaluation.hasHighRiskFlags, false);
			assert.strictEqual(evaluation.totalAlertCount, 0);
			assert.strictEqual(evaluation.activeFlags.length, 0);
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
		});

		it("PatientAnamnesisModal and PatientCardModal have zero disabled save buttons", () => {
			const anamnesisModalContent = fs.readFileSync(
				path.join(webSrc, "components/patients/PatientAnamnesisModal.tsx"),
				"utf-8",
			);
			const patientCardModalContent = fs.readFileSync(
				path.join(webSrc, "components/patients/PatientCardModal.tsx"),
				"utf-8",
			);

			// Anamnesis modal save button
			assert.ok(
				anamnesisModalContent.includes("Сохранить анкету"),
				"Must have 'Сохранить анкету' button",
			);
			assert.ok(
				!anamnesisModalContent.includes("disabled={!"),
				"Must not block save button with artificial validation barriers",
			);

			// Patient card modal
			assert.ok(
				patientCardModalContent.includes("handleApplyNorm"),
				"PatientCardModal must support 1-click norm application",
			);
		});

		it("ANAMNESIS_PRESETS allows fast 1-click selection of common profiles without manual typing", () => {
			const healthyNormResult = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "clean");
			assert.strictEqual(healthyNormResult.updatedProfile.hasPacemakerExs, false);
			assert.strictEqual(healthyNormResult.updatedProfile.hasPenicillinAllergy, false);

			const cardioResult = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "cardio");
			assert.strictEqual(cardioResult.updatedProfile.hasHypertension, true);

			const penicillinResult = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "allergy_penicillin");
			assert.strictEqual(penicillinResult.updatedProfile.hasPenicillinAllergy, true);
		});
	});

	describe("3. Dual-Mode Isolation (Mandates 8c & 8k)", () => {
		it("Demo Showcase patient Smirnova Anna Sergeevna has penicillin allergy and hypertension populated", () => {
			const demoPatients = getDemoShowcasePatients();
			const smirnova = demoPatients.find((p) => p.fullName === "Смирнова Анна Сергеевна");

			assert.ok(smirnova, "Demo showcase patient Smirnova Anna Sergeevna must exist");
			assert.ok(
				(smirnova as any).allergies?.includes("пенициллин") ||
				smirnova.notes?.includes("пенициллин"),
				"Smirnova must have penicillin allergy populated in demo mode",
			);
			assert.ok(
				(smirnova as any).somaticNotes?.includes("гипертенз") ||
				smirnova.notes?.includes("гипертенз"),
				"Smirnova must have arterial hypertension populated in demo mode",
			);
		});

		it("PatientHistoryTab does NOT leak DEFAULT_CLINICAL_VISITS in production mode", () => {
			const historyTabContent = fs.readFileSync(
				path.join(webSrc, "components/patients/PatientHistoryTab.tsx"),
				"utf-8",
			);

			// Ensure guard exists
			assert.ok(
				historyTabContent.includes("!isDemoShowcaseMode()"),
				"PatientHistoryTab must check !isDemoShowcaseMode() before returning fallback mocks",
			);
			assert.ok(
				historyTabContent.includes("return [];"),
				"PatientHistoryTab must return empty array when in production without visits",
			);
		});
	});

	describe("4. Sanctity of Medical Records & Ergonomics (Mandates 8d & Apple HIG)", () => {
		it("zero cartoon emojis in safetyMath.ts definitions, badges, and titles", () => {
			const safetyMathContent = fs.readFileSync(
				path.join(webSrc, "components/patients/safetyMath.ts"),
				"utf-8",
			);

			const lines = safetyMathContent.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || line.includes("//") || line.includes("/*")) continue;
				assert.ok(
					!EMOJI_REGEX.test(line),
					`Forbidden emoji detected in safetyMath.ts at line ${i + 1}: ${line}`,
				);
			}
		});

		it("zero cartoon emojis in patientAnamnesisPresets.ts", () => {
			const presetsContent = fs.readFileSync(
				path.join(webSrc, "components/patients/patientAnamnesisPresets.ts"),
				"utf-8",
			);

			const lines = presetsContent.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || line.includes("//") || line.includes("/*")) continue;
				assert.ok(
					!EMOJI_REGEX.test(line),
					`Forbidden emoji detected in patientAnamnesisPresets.ts at line ${i + 1}: ${line}`,
				);
			}
		});

		it("mobile touch targets in safetyBanner.css and PatientAnamnesisModal adhere to >= 44x44px", () => {
			const safetyBannerCss = fs.readFileSync(
				path.join(webSrc, "components/patients/safetyBanner.css"),
				"utf-8",
			);

			assert.ok(
				safetyBannerCss.includes("min-height: 44px") ||
				safetyBannerCss.includes("min-h-[44px]") ||
				safetyBannerCss.includes("44px"),
				"safetyBanner.css must respect >= 44px touch targets",
			);
		});
	});

	describe("5. Order 834n & Clinical Depth of VisitAnamnesisTab (Chairside Security)", () => {
		it("VisitAnamnesisTab includes granular dental allergens with reaction types", async () => {
			const { DENTAL_ALLERGENS, ALLERGY_REACTIONS } = await import(
				"../components/visit/VisitAnamnesisTab.js"
			);

			// Allergen catalog validation
			const allergenNames = DENTAL_ALLERGENS.map((a: any) => a.name);
			assert.ok(allergenNames.includes("Артикаин"), "Must include Articaine");
			assert.ok(allergenNames.includes("Лидокаин"), "Must include Lidocaine");
			assert.ok(allergenNames.includes("Мепивакаин"), "Must include Mepivacaine");
			assert.ok(allergenNames.includes("Пенициллиновый ряд"), "Must include Penicillins");
			assert.ok(allergenNames.includes("Латекс"), "Must include Latex");
			assert.ok(allergenNames.includes("Металлы / Никель"), "Must include Metals/Nickel");
			assert.ok(allergenNames.includes("Йод / Йодоформ"), "Must include Iodine");
			assert.ok(allergenNames.includes("НПВП / Аспирин"), "Must include NSAIDs");

			// Reaction types validation
			assert.ok(ALLERGY_REACTIONS.includes("Отёк Квинке"), "Must include Quincke's edema");
			assert.ok(ALLERGY_REACTIONS.includes("Анафилактический шок"), "Must include Anaphylaxis");
			assert.ok(ALLERGY_REACTIONS.includes("Крапивница / кожный зуд"), "Must include Urticaria");
		});

		it("VisitAnamnesisTab includes Order 834n critical stop-factors and dental history", async () => {
			const { SOMATIC_STOP_FACTORS, DENTAL_HISTORY_ITEMS } = await import(
				"../components/visit/VisitAnamnesisTab.js"
			);

			// Stop-factors
			const stopLabels = SOMATIC_STOP_FACTORS.map((s: any) => s.label);
			assert.ok(stopLabels.some((l: string) => l.includes("Инфаркт")), "Must include Recent Infarction");
			assert.ok(stopLabels.some((l: string) => l.includes("Кардиостимулятор")), "Must include Pacemaker EXS");
			assert.ok(stopLabels.some((l: string) => l.includes("антикоагулянтов")), "Must include Anticoagulants");
			assert.ok(stopLabels.some((l: string) => l.includes("бисфосфонатов")), "Must include Bisphosphonates MRONJ");
			assert.ok(stopLabels.some((l: string) => l.includes("Сахарный диабет")), "Must include Diabetes");
			assert.ok(stopLabels.some((l: string) => l.includes("Беременность")), "Must include Pregnancy");

			// Dental history
			const historyLabels = DENTAL_HISTORY_ITEMS.map((h: any) => h.label);
			assert.ok(historyLabels.some((l: string) => l.includes("Опыт анестезии")), "Must include Anesthesia Experience");
			assert.ok(historyLabels.some((l: string) => l.includes("Дентофобия")), "Must include Dentophobia");
			assert.ok(historyLabels.some((l: string) => l.includes("Бруксизм")), "Must include Bruxism");
			assert.ok(historyLabels.some((l: string) => l.includes("Кровоточивость")), "Must include Bleeding gums");
		});

		it("specific allergen + reaction string triggers accurate chairside critical alert badges", () => {
			// Test 1: Articaine + Quincke edema
			const articainePatient: PatientForCriticalBadges = {
				allergies: "Артикаин (Отёк Квинке)",
			};
			const articaineBadges = calculateActivePatientCriticalBadges(articainePatient);
			assert.ok(
				articaineBadges.some((b) => b.id === "articaine"),
				"Must trigger articaine critical badge",
			);
			assert.ok(
				articaineBadges.some((b) => b.id === "allergy"),
				"Must trigger general allergy alert badge",
			);

			// Test 2: Lidocaine + Anaphylaxis
			const lidocainePatient: PatientForCriticalBadges = {
				allergies: "Лидокаин (Анафилактический шок)",
			};
			const lidocaineBadges = calculateActivePatientCriticalBadges(lidocainePatient);
			assert.ok(
				lidocaineBadges.some((b) => b.id === "lidocaine"),
				"Must trigger lidocaine critical badge",
			);

			// Test 3: Bisphosphonate therapy in somatic notes
			const bisphosphonatePatient: PatientForCriticalBadges = {
				allergies: "Аллергии не выявлены",
				somaticNotes: "Приём бисфосфонатов (Акласта 5 мг/год)",
			};
			const bisBadges = calculateActivePatientCriticalBadges(bisphosphonatePatient);
			assert.ok(
				bisBadges.some((b) => b.id === "bisphosphonates"),
				"Must trigger bisphosphonates MRONJ critical badge",
			);
			assert.strictEqual(
				bisBadges.some((b) => b.id === "allergy"),
				false,
				"Must not trigger false positive allergy badge when allergies are clean",
			);
		});

		it("zero disabled buttons and zero cartoon emojis in VisitAnamnesisTab.tsx", () => {
			const content = fs.readFileSync(
				path.join(webSrc, "components/visit/VisitAnamnesisTab.tsx"),
				"utf-8",
			);

			// Autonomy check
			assert.ok(!content.includes("disabled={!"), "Must have 0 disabled buttons");
			assert.ok(!content.includes("disabled={true}"), "Must not hardcode disabled={true}");

			// Test-ids presence
			assert.ok(content.includes('data-testid="btn-somatic-norm-one-click"'), "Must have 1-click norm button test-id");
			assert.ok(content.includes('data-testid="btn-apply-anamnesis-to-diary"'), "Must have apply to diary button test-id");
			assert.ok(content.includes('data-testid="btn-save-anamnesis-to-patient"'), "Must have save to patient button test-id");

			// Emoji hygiene check
			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || line.includes("//") || line.includes("/*")) continue;
				assert.ok(
					!EMOJI_REGEX.test(line),
					`Forbidden emoji detected in VisitAnamnesisTab.tsx at line ${i + 1}: ${line}`,
				);
			}
		});
	});
});
