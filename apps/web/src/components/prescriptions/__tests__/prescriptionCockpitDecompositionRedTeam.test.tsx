/**
 * prescriptionCockpitDecompositionRedTeam.test.tsx
 *
 * Red Team Inquisition for Prescription Module Decomposition & Ergonomics:
 * 1. Monolith decomposition into clean modules <= 120 lines:
 *    - PrescriptionCockpitModal.tsx
 *    - PrescriptionExpressPills.tsx
 *    - PrescriptionAllergyBanner.tsx
 *    - PrescriptionPrintSheet.tsx
 * 2. 5 Canonical Express Sets:
 *    - «После сложного удаления зуба»
 *    - «После установки имплантата»
 *    - «Острый пульпит / периодонтит»
 *    - «Острый стоматит»
 *    - «Детский прием»
 * 3. Immediate somatic & allergy checks without button lockouts (Mandate 8e).
 * 4. Apple iOS HIG mobile ergonomics: Bottom Sheet (rounded-t-[24px], tactile drag handle),
 *    touch targets >= 48px, Floating Bottom Bar in Natural Thumb Zone.
 * 5. Clean printable sheet (Form 107-1/u & Patient Memo with clinic stamp).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	PrescriptionAllergyBanner,
	PrescriptionCockpitModal,
	PrescriptionExpressPills,
	PrescriptionPrintSheet,
} from "../index";

describe("Red Team Inquisition: Prescription Module Decomposition (<= 120 lines)", () => {
	const componentsDir = path.resolve(__dirname, "..");

	it("1.1 PrescriptionCockpitModal.tsx is strictly <= 120 lines", () => {
		const filePath = path.join(componentsDir, "PrescriptionCockpitModal.tsx");
		assert.ok(
			fs.existsSync(filePath),
			"PrescriptionCockpitModal.tsx must exist",
		);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 120,
			`PrescriptionCockpitModal.tsx must be <= 120 lines per Mandate, actual: ${lines}`,
		);
	});

	it("1.2 PrescriptionExpressPills.tsx is strictly <= 120 lines", () => {
		const filePath = path.join(componentsDir, "PrescriptionExpressPills.tsx");
		assert.ok(
			fs.existsSync(filePath),
			"PrescriptionExpressPills.tsx must exist",
		);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 120,
			`PrescriptionExpressPills.tsx must be <= 120 lines per Mandate, actual: ${lines}`,
		);
	});

	it("1.3 PrescriptionAllergyBanner.tsx is strictly <= 120 lines", () => {
		const filePath = path.join(componentsDir, "PrescriptionAllergyBanner.tsx");
		assert.ok(
			fs.existsSync(filePath),
			"PrescriptionAllergyBanner.tsx must exist",
		);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 120,
			`PrescriptionAllergyBanner.tsx must be <= 120 lines per Mandate, actual: ${lines}`,
		);
	});

	it("1.4 PrescriptionPrintSheet.tsx is strictly <= 120 lines", () => {
		const filePath = path.join(componentsDir, "PrescriptionPrintSheet.tsx");
		assert.ok(fs.existsSync(filePath), "PrescriptionPrintSheet.tsx must exist");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 120,
			`PrescriptionPrintSheet.tsx must be <= 120 lines per Mandate, actual: ${lines}`,
		);
	});

	it("1.5 PrescriptionPrintModal.tsx is a clean facade <= 120 lines", () => {
		const filePath = path.join(componentsDir, "PrescriptionPrintModal.tsx");
		assert.ok(fs.existsSync(filePath), "PrescriptionPrintModal.tsx must exist");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 120,
			`PrescriptionPrintModal.tsx must be <= 120 lines per Mandate, actual: ${lines}`,
		);
	});
});

describe("Red Team Inquisition: 5 Canonical Express Sets & Soft Safety Checks", () => {
	it("2.1 DENTAL_FAST_PRESCRIPTION_SETS contains the canonical clinical scenarios", () => {
		const setLabels = DENTAL_FAST_PRESCRIPTION_SETS.map((s) => s.label);

		// 1. «После сложного удаления зуба»
		assert.ok(
			setLabels.some((l) => l.includes("удаления") || l.includes("хирургии")),
			"Must contain post-extraction surgery scenario",
		);

		// 2. «После установки имплантата»
		assert.ok(
			setLabels.some(
				(l) => l.includes("имплантации") || l.includes("имплантата"),
			),
			"Must contain implant surgery scenario",
		);

		// 3. «Острый пульпит / периодонтит»
		assert.ok(
			setLabels.some((l) => l.includes("периодонтит") || l.includes("Пульпит")),
			"Must contain pulpitis / periodontitis acute relief scenario",
		);

		// 4. «Острый стоматит»
		assert.ok(
			setLabels.some((l) => l.includes("Стоматит") || l.includes("стоматит")),
			"Must contain stomatitis scenario",
		);

		// 5. «Детский прием»
		assert.ok(
			setLabels.some((l) => l.includes("Детский")),
			"Must contain pediatric scenario",
		);
	});

	it("2.2 Soft allergy check warns on Penicillin and NSAID allergies without locking buttons", () => {
		const allergyConflicts = detectPrescriptionAllergyConflicts(
			["Пенициллин", "Амоксициллин"],
			[
				{
					id: "amoxiclav_875_125",
					tradeName: "Амоксиклав",
					latinName: "Rp.: Tab. Amoxicillini 875 mg",
					dispenseLatin: "D.t.d. N 14",
					signaRussian: "По 1 таб 2 раза в день",
					category: "antibiotic",
					dosage: "875 мг",
					form: "таблетки",
					quantity: "N 14",
				},
			],
		);

		assert.ok(allergyConflicts.length > 0, "Must detect penicillin conflict");
		assert.strictEqual(allergyConflicts[0]?.type, "penicillin");

		const html = renderToString(
			React.createElement(PrescriptionAllergyBanner, {
				allergyConflicts,
				somaticWarnings: [],
			}),
		);

		assert.ok(
			html.includes("Автономия врача (Печать доступна)"),
			"Must preserve doctor autonomy",
		);
		assert.ok(!html.includes("disabled"), "Must never disable actions");
	});

	it("2.3 Soft somatic check suggests gastroprotection for ulcer/gastritis", () => {
		const somaticWarnings = detectPrescriptionSomaticWarnings(
			"Язвенная болезнь желудка в анамнезе",
			[
				{
					id: "nimesulide_100",
					tradeName: "Нимесил",
					latinName: "Rp.: Nimesulidi 100 mg",
					dispenseLatin: "D.t.d. N 10",
					signaRussian: "По 1 пакетику 2 раза в день",
					category: "nsaid",
					dosage: "100 мг",
					form: "гранулы",
					quantity: "N 10",
				},
			],
		);

		assert.ok(
			somaticWarnings.length > 0,
			"Must warn on NSAID with ulcer/gastritis",
		);
		assert.ok(
			somaticWarnings[0]?.messageRu.includes("язвенная болезнь") ||
				somaticWarnings[0]?.messageRu.includes("гастрит"),
		);

		const html = renderToString(
			React.createElement(PrescriptionAllergyBanner, {
				allergyConflicts: [],
				somaticWarnings,
				onAddGastroprotection: () => {},
			}),
		);

		assert.ok(
			html.includes("Омепразол 20 мг"),
			"Must provide 1-click gastroprotection option",
		);
	});
});

describe("Red Team Inquisition: Apple HIG & Touch Ergonomics", () => {
	it("3.1 PrescriptionCockpitModal renders native Bottom Sheet structure for mobile", () => {
		const html = renderToString(
			React.createElement(PrescriptionCockpitModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		// Rounded top corners for Bottom Sheet
		assert.ok(
			html.includes("rounded-t-[24px]"),
			"Must use rounded-t-[24px] for Apple Bottom Sheet",
		);
		// Tactile Drag Handle for swipe gesture
		assert.ok(
			html.includes("w-10 h-1 rounded-full"),
			"Must render tactile drag handle for mobile sheet",
		);
		// Copy for patient button in Natural Thumb Zone
		assert.ok(
			html.includes("med-rx-copy-patient-btn"),
			"Must have patient copy button in footer",
		);
		assert.ok(
			html.includes("min-h-[44px]"),
			"Must have touch target min-height >= 44px",
		);
	});

	it("3.2 PrescriptionExpressPills enforces minimum 48px touch target for gloved fingers", () => {
		const html = renderToString(
			React.createElement(PrescriptionExpressPills, {
				presets: DENTAL_FAST_PRESCRIPTION_SETS.slice(0, 4),
				onSelectPreset: () => {},
			}),
		);

		assert.ok(
			html.includes("min-h-[48px]"),
			"Express preset buttons must have min-height >= 48px",
		);
	});

	it("3.3 PrescriptionPrintSheet renders high-grade responsive print sheet", () => {
		const html = renderToString(
			React.createElement(PrescriptionPrintSheet, {
				seriesNumber: "РЕЦ-2026-0001",
				clinicName: "Клиника ДЕНТЕ",
				doctorName: "Д-р Смирнов",
				patientName: "Петров П.П.",
				prescriptionDate: "2026-10-15",
				items: [
					{
						id: "amoxiclav_875_125",
						tradeName: "Амоксиклав 875/125 мг",
						latinName: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg",
						dispenseLatin: "D.t.d. N 14 in tab.",
						signaRussian: "По 1 таб. 2 раза в день во время еды 7 дней",
						dosage: "875/125 мг",
						form: "таблетки",
						quantity: "N 14",
					},
				],
			}),
		);

		assert.ok(
			html.includes("bg-[var(--paper-strong)]"),
			"Must use design token bg-[var(--paper-strong)]",
		);
		assert.ok(
			html.includes("text-[var(--ink)]"),
			"Must use design token text-[var(--ink)]",
		);
		assert.ok(html.includes("Амоксиклав"), "Must render trade name");
		assert.ok(
			html.includes("Печать клиники и подпись врача"),
			"Must render official stamp confirmation",
		);
	});
});
