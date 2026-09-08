/**
 * outpatientAutonomyWave42.test.tsx
 *
 * Unit tests for Outpatient Doctor Autonomy & Blocker Eraser (Wave 42):
 *
 * CONSTITUTIONAL MANDATES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e п. 5: «Печать в любой момент: Форма 043/у, согласия и сметы печатаются
 *   в любой момент: если приём не закрыт — со штампом «ЧЕРНОВИК», если закрыт — «ПОДПИСАНО ВРАЧОМ»».
 * - Mandate 8e п. 2: Никаких заблокированных кнопок без причины (disabled={false}).
 * - Mandate 8e п. 3 & Mandate 8k: Физиологическая норма в 1 клик («Соматически здоров / норма»),
 *   снимающая необходимость ручного прокликивания 50 пунктов соматической анкеты.
 * - Mandate 8e п. 8 & Mandate 8n: Печать договоров и согласий ИДС без 403-ошибок, со строками «_______»
 *   для ручной подписи доктора и пациента при пустом паспорте или СНИЛС.
 * - Mandate 8d п. 7: Ноль мультяшных эмодзи в медицинских картах и официальных актах (только Lucide).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	Form043PrintModal,
	DEFAULT_043_DATA,
} from "../../emr/Form043PrintModal";
import {
	generatePrintableHtml043,
} from "../../emr/emr043Math";
import {
	InformedConsentModal,
	buildAutonomousConsentContext,
	generateSimpleConsentHash,
	OUTPATIENT_CONSENT_TEMPLATES,
} from "../InformedConsentModal";
import {
	PatientDetailModal,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	isSomaticProfilePhysiologicalNorm,
} from "../PatientDetailModal";
import {
	evaluatePatientSafetyFlags,
} from "../safetyMath";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Emoji detection regex per Mandate 8d item 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

export function sanitizeDocumentText(text: string): string {
	return text.replace(new RegExp(CARTOON_EMOJI_REGEX, "gu"), "").replace(/ {2,}/g, " ").trim();
}

describe("Wave 42: Outpatient Doctor Autonomy & Blocker Eraser", () => {
	const form043Path = path.resolve(__dirname, "../../emr/Form043PrintModal.tsx");
	const form043Source = fs.readFileSync(form043Path, "utf8");

	const consentPath = path.resolve(__dirname, "../InformedConsentModal.tsx");
	const consentSource = fs.readFileSync(consentPath, "utf8");

	const patientDetailPath = path.resolve(__dirname, "../PatientDetailModal.tsx");
	const patientDetailSource = fs.readFileSync(patientDetailPath, "utf8");

	const anamnesisPath = path.resolve(__dirname, "../PatientAnamnesisModal.tsx");
	const anamnesisSource = fs.readFileSync(anamnesisPath, "utf8");

	// ─── 1. ТЕСТЫ АВТОНОМИИ ПЕЧАТИ КАРТЫ 043/У (МАНДАТ 8e п. 5, МАНДАТ 8d п. 7) ───
	describe("1. Form 043/u Print Autonomy & Draft/Signed Watermark (Mandate 8e)", () => {
		it("1.1. guarantees handlePrint in Form043PrintModal includes effectiveIsDraft in dependencies (no stale closures)", () => {
			assert.ok(
				form043Source.includes("}, [formData, effectiveIsDraft]);"),
				"Expected handlePrint useCallback dependencies to include [formData, effectiveIsDraft]",
			);
		});

		it("1.2. guarantees Form 043/u print button is NEVER disabled in Form043PrintModal", () => {
			assert.ok(
				form043Source.includes('data-testid="btn-print-043-card"'),
				"Expected Form043PrintModal to have data-testid='btn-print-043-card'",
			);
			assert.ok(
				form043Source.includes('disabled={false}'),
				"Print button must have disabled={false}",
			);
			assert.ok(
				!form043Source.includes('data-testid="btn-print-043-card"\n\t\t\t\t\t\t\t\tdisabled={true}'),
				"Print button must not be hard-disabled",
			);
		});

		it("1.3. guarantees generatePrintableHtml043 produces ЧЕРНОВИК watermark when visit is not closed / draft", () => {
			const draftHtml = generatePrintableHtml043(DEFAULT_043_DATA, {
				isLocked: false,
			});
			assert.ok(
				draftHtml.includes('class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'),
				"Draft print must contain ЧЕРНОВИК watermark",
			);
			assert.ok(
				!draftHtml.includes("ПОДПИСАНО ВРАЧОМ</div>"),
				"Draft print must not claim to be signed",
			);
		});

		it("1.4. guarantees generatePrintableHtml043 produces ПОДПИСАНО ВРАЧОМ watermark when visit is signed/closed", () => {
			const signedHtml = generatePrintableHtml043(DEFAULT_043_DATA, {
				isLocked: true,
			});
			assert.ok(
				signedHtml.includes("ПОДПИСАНО ВРАЧОМ</div>"),
				"Closed print must contain ПОДПИСАНО ВРАЧОМ watermark",
			);
		});

		it("1.5. guarantees DEFAULT_043_DATA populates non-blocking defaults for secondary fields", () => {
			assert.strictEqual(DEFAULT_043_DATA.formNumber, "043/у");
			assert.strictEqual(DEFAULT_043_DATA.clinic.clinicName, "Стоматологическая клиника «ДЕНТЕ»");
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.odontogramTeeth.length, 32);
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.dmftIndex.totalDmft, 0);
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.cpitnIndex.treatmentNeedCategory, "0_none");
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.biteType, "orthognathic");
		});

		it("1.6. guarantees ZERO cartoon emojis in Form 043/u & Consent sources (Mandate 8d п. 7)", () => {
			const cleanText = "Медицинская карта 043/у. Диагноз: K02.1 Кариес дентина.";
			assert.strictEqual(hasCartoonEmojis(cleanText), false);
			assert.strictEqual(sanitizeDocumentText(cleanText), cleanText);

			// Test with illegal cartoon emojis
			const dirtyText = "Зуб 16 🦷 кариес 🎉🚀";
			assert.strictEqual(hasCartoonEmojis(dirtyText), true);
			const sanitized = sanitizeDocumentText(dirtyText);
			assert.strictEqual(sanitized, "Зуб 16 кариес");
			assert.strictEqual(hasCartoonEmojis(sanitized), false);

			// Ensure no emojis exist in component source files
			assert.strictEqual(hasCartoonEmojis(form043Source), false);
			assert.strictEqual(hasCartoonEmojis(consentSource), false);
		});

		it("1.7. renders Form043PrintModal with non-disabled print button and draft status badge", () => {
			const html = renderToString(
				React.createElement(Form043PrintModal, {
					isOpen: true,
					onClose: () => {},
					initialData: {
						passport: {
							...DEFAULT_043_DATA.passport,
							patientFullName: "Кузнецов Дмитрий Иванович",
						},
					},
					isDraft: true,
					status: "draft",
				}),
			);

			assert.ok(html.includes("data-testid=\"btn-print-043-card\""));
			assert.ok(!html.includes("data-testid=\"btn-print-043-card\" disabled"));
			assert.ok(html.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)"));
			assert.ok(html.includes("data-testid=\"badge-043-draft-status\""));
		});

		it("1.8. renders Form043PrintModal with signed status badge when closed", () => {
			const html = renderToString(
				React.createElement(Form043PrintModal, {
					isOpen: true,
					onClose: () => {},
					initialData: {
						passport: {
							...DEFAULT_043_DATA.passport,
							patientFullName: "Кузнецов Дмитрий Иванович",
						},
					},
					isDraft: false,
					status: "signed",
					isLocked: true,
				}),
			);

			assert.ok(html.includes("data-testid=\"btn-print-043-card\""));
			assert.ok(!html.includes("data-testid=\"btn-print-043-card\" disabled"));
			assert.ok(html.includes("ПОДПИСАНО ВРАЧОМ"));
			assert.ok(html.includes("data-testid=\"badge-043-draft-status\""));
		});
	});

	// ─── 2. ТЕСТЫ АВТОНОМИИ ПЕЧАТИ ИДС (МАНДАТ 8e п. 8, МАНДАТ 8n) ───
	describe("2. Informed Consent (ИДС) Print Autonomy & Blank Lines (Mandates 8e, 8n)", () => {
		it("2.1. guarantees buildAutonomousConsentContext generates manual underline strings when patient fields are missing", () => {
			// Empty patient object
			const context = buildAutonomousConsentContext({}, false);

			assert.strictEqual(context.patientName, "________________________________________");
			assert.strictEqual(context.passport, "серия ____ № __________, выдан ________________________________");
			assert.strictEqual(context.snils, "___-___-___ __");
			assert.strictEqual(context.address, "________________________________________");
			assert.strictEqual(context.doctorName, "Врач-стоматолог");
			assert.ok(context.date.length >= 8);
		});

		it("2.2. guarantees buildAutonomousConsentContext with isBlank=true generates full manual fill lines", () => {
			const blankContext = buildAutonomousConsentContext(
				{
					patientName: "Иванов Иван",
					doctorName: "Петров Пётр",
				},
				true,
			);

			assert.strictEqual(blankContext.patientName, "________________________________________");
			assert.strictEqual(blankContext.doctorName, "____________________");
			assert.strictEqual(blankContext.passport, "серия ____ № __________, выдан ________________________________");
			assert.strictEqual(blankContext.snils, "___-___-___ __");
		});

		it("2.3. guarantees generateSimpleConsentHash produces deterministic SHA-256 integrity hash", () => {
			const hash1 = generateSimpleConsentHash("CONSENT_THERAPY|Иванов|12.01.2026");
			assert.ok(hash1.startsWith("ids-sha256-"));
			assert.ok(hash1.length >= 18);
		});

		it("2.4. guarantees OUTPATIENT_CONSENT_TEMPLATES contains all primary dental consent categories", () => {
			const keys = OUTPATIENT_CONSENT_TEMPLATES.map((t) => t.key);
			assert.ok(keys.includes("CONSENT_THERAPY"));
			assert.ok(keys.includes("CONSENT_SURGERY_IMPLANT"));
			assert.ok(keys.includes("CONSENT_ANESTHESIA"));
			assert.ok(keys.includes("CONSENT_ORTHOPEDICS"));
			assert.ok(keys.includes("CONSENT_HYGIENE_BLEACHING"));
			assert.ok(keys.includes("CONSENT_PERSONAL_DATA"));
			assert.ok(keys.includes("CONSENT_INSPECTION_1051N"));
		});

		it("2.5. renders InformedConsentModal with non-disabled print buttons even with zero passport data", () => {
			const html = renderToString(
				React.createElement(InformedConsentModal, {
					isOpen: true,
					onClose: () => {},
					patient: null, // No passport, no SNILS!
				}),
			);

			// Check btn-print-blank-consent exists and is NOT disabled
			assert.ok(html.includes("data-testid=\"btn-print-blank-consent\""));
			assert.ok(!html.includes("data-testid=\"btn-print-blank-consent\" disabled"));

			// Check btn-print-consent-a4 exists and is NOT disabled
			assert.ok(html.includes("data-testid=\"btn-print-consent-a4\""));
			assert.ok(!html.includes("data-testid=\"btn-print-consent-a4\" disabled"));

			// Check 1-click paper confirmation button
			assert.ok(html.includes("data-testid=\"btn-confirm-consent-paper\""));

			// Check manual underscore lines are present in the output HTML
			assert.ok(html.includes("серия ____ № __________, выдан ________________________________"));
			assert.ok(html.includes("___-___-___ __"));
		});
	});

	// ─── 3. ТЕСТЫ 1-КЛИК НОРМЫ СОМАТИЧЕСКОГО АНАМНЕЗА (МАНДАТ 8e п. 3, 8k, 8n) ───
	describe("3. Somatic Anamnesis 1-Click Physiological Norm (Mandates 8e, 8k, 8n)", () => {
		it("3.1. guarantees createHealthySomaticNormProfile produces 100% clean profile", () => {
			const norm = createHealthySomaticNormProfile();

			// Zero allergies
			assert.strictEqual(norm.hasLidocaineAllergy, false);
			assert.strictEqual(norm.hasArticaineAllergy, false);
			assert.strictEqual(norm.hasMepivacaineAllergy, false);
			assert.strictEqual(norm.hasSulfiteAllergy, false);
			assert.strictEqual(norm.hasAnaphylaxisHistory, false);
			assert.strictEqual(norm.hasPenicillinAllergy, false);
			assert.strictEqual(norm.hasLatexAllergy, false);

			// Normal hemostasis
			assert.strictEqual(norm.takesAnticoagulants, false);
			assert.strictEqual(norm.anticoagulantName, "");

			// Zero somatic contraindications
			assert.strictEqual(norm.hasPacemakerExs, false);
			assert.strictEqual(norm.hasCardiovascularDisease, false);
			assert.strictEqual(norm.hasHypertension, false);
			assert.strictEqual(norm.hasDiabetesMellitus, false);
			assert.strictEqual(norm.hasBronchialAsthma, false);
			assert.strictEqual(norm.hasEpilepsy, false);
			assert.strictEqual(norm.hasHepatitis, false);
			assert.strictEqual(norm.hasHiv, false);
			assert.strictEqual(norm.hasThyroidDisease, false);
			assert.strictEqual(norm.takesBisphosphonates, false);

			// Note confirms physiological norm
			assert.ok(norm.customChronicNotes!.includes("Соматически здоров"));
			assert.ok(norm.customChronicNotes!.includes("Физиологическая норма"));

			// Validation helper confirms norm
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
		});

		it("3.2. guarantees evaluatePatientSafetyFlags gives zero active stop flags on norm profile", () => {
			const norm = createHealthySomaticNormProfile();
			const evalResult = evaluatePatientSafetyFlags(norm);

			assert.strictEqual(evalResult.hasCriticalStopFlags, false);
			assert.strictEqual(evalResult.hasHighRiskFlags, false);
			assert.strictEqual(evalResult.maxSeverity, "none");
			assert.strictEqual(evalResult.totalAlertCount, 0);
			assert.strictEqual(evalResult.activeFlags.length, 0);
		});

		it("3.3. guarantees PatientAnamnesisModal and PatientDetailModal contain 1-click button btn-somatic-healthy-norm", () => {
			assert.ok(
				anamnesisSource.includes('data-testid="btn-somatic-healthy-norm"'),
				"PatientAnamnesisModal must contain data-testid='btn-somatic-healthy-norm'",
			);
			assert.ok(
				anamnesisSource.includes("applyPreset(\"clean\")"),
				"btn-somatic-healthy-norm must apply the 'clean' preset in 1 click",
			);
			assert.ok(
				anamnesisSource.includes("Соматически здоров / норма (без особенностей)"),
				"btn-somatic-healthy-norm must have clear human label",
			);
		});

		it("3.4. renders PatientDetailModal and displays 1-click somatic norm preset button", () => {
			const html = renderToString(
				React.createElement(PatientDetailModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "pat-autonomy-001",
					patientName: "Васильев Игорь Олегович",
				}),
			);

			assert.ok(html.includes("data-testid=\"btn-somatic-healthy-norm\""));
			assert.ok(html.includes("Соматически здоров / норма (без особенностей)"));
		});

		it("3.5. isSomaticProfilePhysiologicalNorm detects non-norm flags correctly", () => {
			const norm = createHealthySomaticNormProfile();
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);

			// Patient with articaine allergy
			const withAllergy = { ...norm, hasArticaineAllergy: true };
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(withAllergy), false);

			// Patient with anticoagulant therapy
			const withAnticoag = { ...norm, takesAnticoagulants: true };
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(withAnticoag), false);

			// Patient with pacemaker
			const withExs = { ...norm, hasPacemakerExs: true };
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(withExs), false);
		});
	});
});
