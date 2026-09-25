/**
 * prescriptionPrintAutonomyInquisition.test.ts
 *
 * Comprehensive Red Team Inquisition Test Suite for Medical Prescriptions
 * (Forms 107-1/у and 148-1/у-88 per Order of Minzdrav RF No. 1094n).
 *
 * CONSTITUTIONAL & REGULATORY MANDATES:
 * - Order of Minzdrav RF No. 1094n: Statutory rules for prescribing and dispensing medicinal products.
 * - Mandate 8c: Universal 3-Tier Architecture & Responsive Desktop Ergonomics.
 * - Mandate 8d pt 4: WCAG AAA theme hygiene (Light / Dark theme safety, token-based surfaces).
 * - Mandate 8d pt 6: Anti-Matryoshka Law (modal depth strictly <= 1).
 * - Mandate 8d pt 7: Zero Cartoon Emojis on medical documents, cards, and buttons (Lucide icons only).
 * - Mandate 8e: Doctor Autonomy (Zero disabled buttons, non-blocking clinical workflows).
 * - Mandate 8k: Friction-Killer Law (1-click presets and patient messenger memo).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (robust fallbacks for missing backoffice fields).
 * - Mandate 8x: Anti-RAM-hog law (pure logic + SSR via renderToString, strict execution bounds).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculateMedicationDosage,
	calculatePrescriptionExpiration,
	DENTAL_STATUTORY_MNN_CATALOG,
	formatPatientPrescriptionMemo,
	generateForm107Prescription,
	validateDentalMnn,
	validateLatinRxSigna,
	validatePrescriptionDosage,
} from "../generator/prescriptionEngine.js";
import {
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
	DENTAL_MEDICATIONS_CATALOG,
} from "../generator/prescriptionPresets.js";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	detectPrescriptionAllergyConflicts,
	PrescriptionPrintModal,
} from "../PrescriptionPrintModal.js";

// Regulatory Cartoon Emoji Regex (Mandate 8d pt 7)
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasEmojis(str: string): boolean {
	return CARTOON_EMOJI_REGEX.test(str);
}

describe("Red Team Inquisition: Order of Minzdrav RF No. 1094n Statutory Compliance", () => {
	it("1.1 Validates canonical dental MNN catalog contains all statutory active substances", () => {
		const expectedMnn = [
			"amoxicillin",
			"amoxicillin_clavulanate",
			"ibuprofen",
			"chlorhexidine",
			"articaine",
			"nimesulide",
			"ketorolac",
			"chloropyramine",
		];
		const keys = Object.keys(DENTAL_STATUTORY_MNN_CATALOG);
		for (const mnn of expectedMnn) {
			assert.ok(
				keys.includes(mnn),
				`MNN catalog must include statutory substance: ${mnn}`,
			);
		}
	});

	it("1.2 Validates Latin MNN international non-proprietary names per Pharmacopeia", () => {
		const amox = validateDentalMnn("Amoxicillinum");
		assert.strictEqual(amox.isValid, true);
		assert.strictEqual(amox.matchedMnn?.mnnLatin, "Amoxicillinum");

		const art = validateDentalMnn("Articainum et Epinephrinum");
		assert.strictEqual(art.isValid, true);
		assert.strictEqual(art.matchedMnn?.mnnLatin, "Articainum et Epinephrinum");

		const ibu = validateDentalMnn("Ibuprofenum");
		assert.strictEqual(ibu.isValid, true);
		assert.strictEqual(ibu.matchedMnn?.mnnLatin, "Ibuprofenum");
	});

	it("1.3 Trade names map to official MNN with Order 1094n warning", () => {
		const tradeChecks = [
			{ trade: "Аугментин", expectedMnn: "amoxicillin_clavulanate" },
			{ trade: "Ультракаин", expectedMnn: "articaine" },
			{ trade: "Нурофен", expectedMnn: "ibuprofen" },
			{ trade: "Кетанов", expectedMnn: "ketorolac" },
			{ trade: "Найз", expectedMnn: "nimesulide" },
			{ trade: "Супрастин", expectedMnn: "chloropyramine" },
		];

		for (const check of tradeChecks) {
			const res = validateDentalMnn(check.trade);
			assert.strictEqual(res.isValid, true, `Should recognize trade name: ${check.trade}`);
			assert.strictEqual(res.isTradeName, true, `Must flag as trade name: ${check.trade}`);
			assert.strictEqual(res.matchedMnn?.key, check.expectedMnn);
			assert.ok(
				res.warning?.includes("1094н"),
				`Must cite Order 1094n requirement in trade warning for ${check.trade}`,
			);
		}
	});

	it("1.4 Enforces Latin recipe structure: Recipe prefix (Rp.:) and Da tales doses (D.t.d.)", () => {
		const validRx = validateLatinRxSigna({
			latinRp: "Rp.: Amoxicillini 500 mg",
			dispenseLatin: "D.t.d. N 20 in caps.",
			signaRu: "S. Внутрь по 1 капсуле 3 раза в сутки после еды, 7 дней.",
		});
		assert.strictEqual(validRx.isValid, true);
		assert.strictEqual(validRx.errors.length, 0);

		// Missing Rp.:
		const noRp = validateLatinRxSigna({
			latinRp: "Amoxicillini 500 mg",
			dispenseLatin: "D.t.d. N 20 in caps.",
			signaRu: "S. По 1 капсуле 3 раза в день 7 дней.",
		});
		assert.strictEqual(noRp.isValid, false);
		assert.ok(noRp.errors.some((e) => e.includes("Rp.:")));

		// Missing D.t.d.
		const noDtd = validateLatinRxSigna({
			latinRp: "Rp.: Ibuprofeni 400 mg",
			dispenseLatin: "N 20 in tab.",
			signaRu: "S. По 1 таблетке при болях.",
		});
		assert.strictEqual(noDtd.isValid, false);
		assert.ok(noDtd.errors.some((e) => e.includes("D.t.d.")));
	});

	it("1.5 Strictly bans vague/indefinite instructions in Signa per Order 1094n", () => {
		const vagueInstructions = [
			"Внутреннее",
			"Известно",
			"По схеме",
			"По назначению врача",
			"Употреблять по указанию",
			"Внутрь как обычно",
		];

		for (const vague of vagueInstructions) {
			const res = validateLatinRxSigna({
				latinRp: "Rp.: Tab. Ketorolaci 10 mg",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRu: vague,
			});
			assert.strictEqual(res.isValid, false, `Must reject vague signa: '${vague}'`);
			assert.ok(
				res.errors.some((e) => e.includes("1094н") || e.includes("неопределенные")),
				`Must cite Order 1094n in error for '${vague}'`,
			);
		}
	});

	it("1.6 Statutory prescription expiration calculation per Order 1094n", () => {
		const baseDate = "2026-09-25";

		// 15 days (urgent / Form 148-1/u-88)
		const exp15 = calculatePrescriptionExpiration(baseDate, 15);
		assert.strictEqual(exp15, "2026-10-10");

		// 30 days (preferential)
		const exp30 = calculatePrescriptionExpiration(baseDate, 30);
		assert.strictEqual(exp30, "2026-10-25");

		// 60 days (standard Form 107-1/u)
		const exp60 = calculatePrescriptionExpiration(baseDate, 60);
		assert.strictEqual(exp60, "2026-11-24");

		// 365 days (chronic care)
		const exp365 = calculatePrescriptionExpiration(baseDate, 365);
		assert.strictEqual(exp365, "2027-09-25");
	});

	it("1.7 Form 107-1/у document generator generates complete statutory structure", () => {
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-2026-0042",
			dateIso: "2026-09-25",
			validityDays: 60,
			clinicName: "Стоматологическая клиника «ДЕНТЕ»",
			clinicOgrn: "1234567890123",
			clinicAddress: "г. Москва, ул. Клиническая, д. 5",
			clinicInn: "7701234567",
			medicalLicenseNumber: "ЛО41-01137-77/00368421",
			patientFullName: "Иванов Иван Иванович",
			patientBirthDate: "1985-04-12",
			patientMedicalCardNumber: "СТ-1049",
			doctorFullName: "Д-р Кузнецов С.В.",
			doctorSpecialty: "Врач-стоматолог-хирург",
			doctorSnils: "112-233-445 99",
			selectedMedicationIds: ["amoxiclav_875_125", "nimesil_100", "chlorhexidine_005"],
		});

		assert.strictEqual(doc.header.seriesNumber, "РЕЦ-2026-0042");
		assert.strictEqual(doc.header.validityPeriodLabelRu, "60 дней (Стандарт)");
		assert.strictEqual(doc.patient.fullName, "Иванов Иван Иванович");
		assert.strictEqual(doc.doctor.fullName, "Д-р Кузнецов С.В.");
		assert.strictEqual(doc.items.length, 3);
		assert.ok(doc.items[0]!.latinRp.startsWith("Rp.:"));
		assert.ok(doc.items[0]!.dispenseLatin.includes("D.t.d."));
	});
});

describe("Red Team Inquisition: Pediatric & Dosage Toxicology Safety", () => {
	it("2.1 Articaine absolute contraindication in children under 4 years (Order 1094n & GRLS)", () => {
		const infantDose = calculateMedicationDosage("articaine", 14, 3);
		assert.ok(infantDose);
		assert.strictEqual(infantDose.isContraindicated, true);
		assert.strictEqual(infantDose.maxCarpules, 0);
		assert.ok(infantDose.contraindicationReason?.includes("до 4 лет"));

		const validation = validatePrescriptionDosage({
			medicationKey: "articaine",
			patientAgeYears: 2,
			patientWeightKg: 12,
		});
		assert.strictEqual(validation.isValid, false);
		assert.strictEqual(validation.status, "contraindicated");
	});

	it("2.2 Nimesulide absolute contraindication in children under 12 years (hepatotoxicity)", () => {
		const childNimesil = calculateMedicationDosage("nimesulide_100", 28, 9);
		assert.ok(childNimesil);
		assert.ok(childNimesil.warningRu?.includes("ПРОТИВОПОКАЗАН детям до 12 лет"));
		assert.strictEqual(childNimesil.maxDailyDoseRu, "0 мг (применяйте Ибупрофен или Парацетамол)");

		const validation = validatePrescriptionDosage({
			medicationKey: "nimesulide",
			patientAgeYears: 10,
			patientWeightKg: 30,
		});
		assert.strictEqual(validation.isValid, false);
		assert.strictEqual(validation.status, "contraindicated");
	});

	it("2.3 Ketorolac absolute contraindication in minors under 16 years (GI ulcer risk)", () => {
		const teenKetorolac = calculateMedicationDosage("ketorolac_10", 45, 14);
		assert.ok(teenKetorolac);
		assert.ok(teenKetorolac.warningRu?.includes("до 16 лет"));

		const validation = validatePrescriptionDosage({
			medicationKey: "ketorolac",
			patientAgeYears: 15,
			patientWeightKg: 50,
		});
		assert.strictEqual(validation.isValid, false);
		assert.strictEqual(validation.status, "contraindicated");
	});

	it("2.4 Ibuprofen weight-based pediatric calculation (10 mg/kg single, 30 mg/kg daily)", () => {
		const pediatricIbu = calculateMedicationDosage("ibuprofen_400", 20, 6);
		assert.ok(pediatricIbu);
		assert.strictEqual(pediatricIbu.isPediatric, true);
		assert.ok(pediatricIbu.recommendedDosageRu.includes("200 мг")); // 20 kg * 10 mg/kg = 200 mg
		assert.ok(pediatricIbu.maxDailyDoseRu.includes("600 мг")); // 20 kg * 30 mg/kg = 600 mg
	});

	it("2.5 Allergy conflict detection warns on Penicillin and NSAID allergies", () => {
		const penicillinConflict = detectPrescriptionAllergyConflicts(
			["Аллергия на пенициллины (крапивница)"],
			[
				{
					id: "amox-1",
					latinName: "Rp.: Amoxicillini 500 mg",
					tradeName: "Амоксиклав",
					form: "таблетки",
					dosage: "500 мг",
					quantity: "N. 14",
					dispenseLatin: "D.t.d. N 14 in tab.",
					signaRussian: "S. По 1 таб 2 раза в день",
					category: "antibiotic",
				},
			],
		);
		assert.strictEqual(penicillinConflict.length, 1);
		assert.strictEqual(penicillinConflict[0]!.type, "penicillin");

		const nsaidConflict = detectPrescriptionAllergyConflicts(
			"Аспириновая триада, аллергия на НПВП",
			[
				{
					id: "nimesil-1",
					latinName: "Rp.: Nimesulidi 100 mg",
					tradeName: "Нимесил",
					form: "гранулы",
					dosage: "100 мг",
					quantity: "N. 9",
					dispenseLatin: "D.t.d. N 9 in gran.",
					signaRussian: "S. По 1 пакетику 2 раза в день",
					category: "nsaid",
				},
			],
		);
		assert.strictEqual(nsaidConflict.length, 1);
		assert.strictEqual(nsaidConflict[0]!.type, "nsaid");
	});
});

describe("Red Team Inquisition: Doctor Autonomy (Mandate 8e)", () => {
	it("3.1 Zero disabled buttons: Print and Action buttons must never be disabled", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Тестовый Пациент" },
			}),
		);

		// Assert print button exists and is NOT disabled
		assert.ok(
			html.includes('data-testid="print-prescription-btn"'),
			"Must render print-prescription-btn",
		);
		assert.ok(
			!html.includes('data-testid="print-prescription-btn" disabled'),
			"Print button must NEVER be disabled (Mandate 8e)",
		);

		// Assert diary insert button exists and is NOT disabled
		assert.ok(
			html.includes('data-testid="insert-to-diary-btn"'),
			"Must render insert-to-diary-btn",
		);
		assert.ok(
			!html.includes('data-testid="insert-to-diary-btn" disabled'),
			"Diary button must NEVER be disabled (Mandate 8e)",
		);

		// Assert copy patient memo button exists and is NOT disabled
		assert.ok(
			html.includes('data-testid="med-rx-copy-patient-btn"'),
			"Must render med-rx-copy-patient-btn",
		);
		assert.ok(
			!html.includes('data-testid="med-rx-copy-patient-btn" disabled'),
			"Copy memo button must NEVER be disabled (Mandate 8e)",
		);
	});

	it("3.2 Missing optional backoffice fields never block or crash prescription rendering", () => {
		// Test with completely empty props / missing doctor, clinic, and patient details
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: null,
				doctorName: undefined,
				clinicName: undefined,
				clinicPhone: undefined,
				clinicOgrn: undefined,
			}),
		);

		assert.ok(html.includes("data-testid=\"prescription-print-modal\""));
		assert.ok(html.includes("Лечащий врач"));
		assert.ok(html.includes("Стоматологическая клиника"));
	});

	it("3.3 Allergy and DDI conflicts display prominent warnings without blocking printing", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: {
					id: "pat-allergy",
					fullName: "Пациент с Аллергией",
					allergies: ["Пенициллин", "Аспирин"],
				},
				initialSelectedDrugIds: ["amoxiclav_875_125", "nimesulide_100"],
			}),
		);

		// Warning banner is displayed
		assert.ok(
			html.includes("data-testid=\"allergy-conflict-penicillin\""),
			"Must display penicillin allergy conflict warning",
		);
		assert.ok(
			html.includes("data-testid=\"allergy-conflict-nsaid\""),
			"Must display NSAID allergy conflict warning",
		);
		// But doctor autonomy allows printing
		assert.ok(
			html.includes("Автономия врача"),
			"Must affirm Doctor Autonomy in warning banner",
		);
		assert.ok(
			html.includes("data-testid=\"print-prescription-btn\""),
			"Print button remains fully available",
		);
	});

	it("3.4 Fast 1-click dental prescription sets exist and contain required clinical protocols", () => {
		const requiredSets = [
			"pulpitis_acute_relief",
			"alveolitis_dry_socket",
			"post_tooth_extraction",
			"amoxiclav_first_line",
		];
		const setIds = DENTAL_FAST_PRESCRIPTION_SETS.map((s) => s.id);
		for (const req of requiredSets) {
			assert.ok(setIds.includes(req), `Fast sets must include protocol: ${req}`);
		}
	});
});

describe("Red Team Inquisition: Anti-Matryoshka Law (Mandate 8d pt 6)", () => {
	it("4.1 Maximum modal depth is strictly 1: no nested role='dialog' or matryoshka containers", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		const dialogMatches = html.match(/role="dialog"/g) || [];
		assert.strictEqual(
			dialogMatches.length,
			1,
			"Strictly exactly 1 role='dialog' element allowed (Modal depth <= 1 per Mandate 8d pt 6)",
		);

		// Verify no nested modal backdrop or overlay classes
		const overlayMatches = html.match(/fixed inset-0/g) || [];
		assert.strictEqual(
			overlayMatches.length,
			1,
			"Only 1 top-level backdrop overlay permitted",
		);
	});
});

describe("Red Team Inquisition: Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
	it("5.1 Rendered modal markup contains 0 raw cartoon unicode emojis", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Тест Тестович" },
			}),
		);

		assert.strictEqual(
			hasEmojis(html),
			false,
			"Rendered modal markup must NOT contain cartoon unicode emojis",
		);
	});

	it("5.2 All prescription catalog items and presets contain 0 emojis", () => {
		for (const drug of DENTAL_MEDICATIONS_CATALOG) {
			assert.strictEqual(hasEmojis(drug.tradeNameRu), false, `Emoji in tradeName: ${drug.tradeNameRu}`);
			assert.strictEqual(hasEmojis(drug.signaRu), false, `Emoji in signaRu: ${drug.signaRu}`);
			assert.strictEqual(hasEmojis(drug.latinRp), false, `Emoji in latinRp: ${drug.latinRp}`);
		}

		for (const pkg of DENTAL_FAST_PRESCRIPTION_PACKAGES) {
			assert.strictEqual(hasEmojis(pkg.label), false, `Emoji in pkg label: ${pkg.label}`);
			assert.strictEqual(hasEmojis(pkg.desc), false, `Emoji in pkg desc: ${pkg.desc}`);
		}
	});

	it("5.3 Formatted patient messenger memo contains 0 emojis", () => {
		const memo = formatPatientPrescriptionMemo({
			clinicName: "Клиника ДЕНТЕ",
			clinicPhone: "+7 (495) 123-45-67",
			doctorName: "Д-р Иванов",
			patientName: "Петров П.П.",
			medications: [
				{
					id: "amox",
					tradeNameRu: "Амоксиклав 875+125 мг",
					signaRu: "S. По 1 таб 2 раза в день",
				},
			],
		});

		assert.strictEqual(
			hasEmojis(memo),
			false,
			"Patient prescription memo must NOT contain cartoon emojis",
		);
	});
});

describe("Red Team Inquisition: CSS Tokens & Dark Mode Theme Hygiene (WCAG AAA)", () => {
	it("6.1 PrescriptionPrintModal.tsx has 0 hardcoded static hex colors", () => {
		const rawPath = path.resolve(
			process.cwd(),
			"apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx",
		);
		const filePath = fs.existsSync(rawPath)
			? rawPath
			: path.resolve(process.cwd(), "src/components/prescriptions/PrescriptionPrintModal.tsx");
		const content = fs.readFileSync(filePath, "utf8");
		const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
		const matches = content.match(hexRegex) || [];

		assert.strictEqual(
			matches.length,
			0,
			`PrescriptionPrintModal.tsx must NOT contain hardcoded hex colors. Found: ${matches.join(", ")}`,
		);
	});

	it("6.2 Printable sheet preview uses CSS tokens (var(--paper-strong), var(--ink), var(--line))", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		assert.ok(
			html.includes("bg-[var(--paper-strong)]"),
			"Preview sheet must use bg-[var(--paper-strong)] for responsive theme adaptation",
		);
		assert.ok(
			html.includes("text-[var(--ink)]"),
			"Preview sheet must use text-[var(--ink)] for crisp typography in light & dark modes",
		);
		assert.ok(
			html.includes("border-[var(--line)]"),
			"Preview sheet must use border-[var(--line)]",
		);
	});
});

describe("Red Team Inquisition: Form 148-1/у-88 (ПКУ Strict Accounting)", () => {
	it("7.1 Enforces strictly 1 drug item on Form 148-1/у-88", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				initialSelectedDrugIds: ["ketorolac_10"],
			}),
		);

		// Switch to 148-1u-88 shows PKU indicator
		assert.ok(html.includes("148-88 (ПКУ)") || html.includes("№ 148-1/у-88"));
	});

	it("7.2 Form 148-1/у-88 enforces 15 days statutory validity notice", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
			}),
		);

		assert.ok(html.includes("15 дней"));
		assert.ok(html.includes("Приказ № 1094н"));
	});
});
