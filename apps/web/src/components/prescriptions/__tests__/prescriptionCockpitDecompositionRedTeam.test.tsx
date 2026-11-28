/**
 * prescriptionCockpitDecompositionRedTeam.test.tsx
 *
 * Red Team Inquisition for Prescription Cockpit & Ergonomics (6G Live SUT).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	PrescriptionAllergyBanner,
	PrescriptionCockpitModal,
	PrescriptionExpressPills,
	PrescriptionPrintSheet,
} from "../index";
import { PrescriptionPrintModal } from "../PrescriptionPrintModal";

describe("Red Team Inquisition: Prescription Cockpit Live Render & Closed States (6G Live SUT)", () => {
	it("1.1 PrescriptionCockpitModal renders null when closed and never disables controls when open", () => {
		const closed = renderToStaticMarkup(
			React.createElement(PrescriptionCockpitModal, {
				isOpen: false,
				onClose: () => {},
				disablePortal: true,
			}),
		);
		assert.strictEqual(closed, "");

		const open = renderToStaticMarkup(
			React.createElement(PrescriptionCockpitModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-open", fullName: "Волков Д.С." },
			}),
		);
		assert.ok(open.includes('role="dialog"'));
		assert.ok(open.includes("Волков Д.С."));
		assert.strictEqual(open.includes('disabled=""'), false);
	});

	it("1.2 PrescriptionPrintModal compatibility facade renders interactive modal cleanly", () => {
		const html = renderToStaticMarkup(
			React.createElement(PrescriptionPrintModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-compat", fullName: "Орлова М.А." },
			}),
		);
		assert.ok(html.includes("Орлова М.А."));
		assert.ok(html.includes("Рецептурный бланк"));
	});

	it("1.3 PrescriptionAllergyBanner hides when no allergy conflicts and no somatic warnings exist", () => {
		const cleanConflicts = detectPrescriptionAllergyConflicts([], []);
		const cleanWarnings = detectPrescriptionSomaticWarnings("", []);
		assert.strictEqual(cleanConflicts.length, 0);
		assert.strictEqual(cleanWarnings.length, 0);

		const html = renderToStaticMarkup(
			React.createElement(PrescriptionAllergyBanner, {
				allergyConflicts: cleanConflicts,
				somaticWarnings: cleanWarnings,
			}),
		);
		assert.strictEqual(html, "");
	});

	it("1.4 PrescriptionExpressPills handles empty and populated preset lists", () => {
		const emptyHtml = renderToStaticMarkup(
			React.createElement(PrescriptionExpressPills, {
				presets: [],
				onSelectPreset: () => {},
			}),
		);
		assert.strictEqual(emptyHtml.includes("disabled"), false);

		const fullHtml = renderToStaticMarkup(
			React.createElement(PrescriptionExpressPills, {
				presets: DENTAL_FAST_PRESCRIPTION_SETS,
				onSelectPreset: () => {},
			}),
		);
		for (const preset of DENTAL_FAST_PRESCRIPTION_SETS) {
			assert.ok(fullHtml.includes(preset.label));
		}
	});
});

describe("Red Team Inquisition: 5 Canonical Express Sets & Soft Safety Checks", () => {
	it("2.1 DENTAL_FAST_PRESCRIPTION_SETS contains the canonical clinical scenarios", () => {
		const setLabels = DENTAL_FAST_PRESCRIPTION_SETS.map((s) => s.label);

		assert.ok(
			setLabels.some((l) => l.includes("удаления") || l.includes("хирургии")),
			"Must contain post-extraction surgery scenario",
		);
		assert.ok(
			setLabels.some((l) => l.includes("имплантации") || l.includes("имплантата")),
			"Must contain implant surgery scenario",
		);
		assert.ok(
			setLabels.some((l) => l.includes("периодонтит") || l.includes("Пульпит")),
			"Must contain pulpitis / periodontitis acute relief scenario",
		);
		assert.ok(
			setLabels.some((l) => l.includes("Стоматит") || l.includes("стоматит")),
			"Must contain stomatitis scenario",
		);
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

		const html = renderToStaticMarkup(
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

		const html = renderToStaticMarkup(
			React.createElement(PrescriptionAllergyBanner, {
				allergyConflicts: [],
				somaticWarnings,
				onAddGastroprotection: () => {},
			}),
		);

		assert.ok(
			html.includes("Омепразол 20 мг"),
			"Must provide gastroprotection option",
		);
	});
});

describe("Red Team Inquisition: Apple HIG & Touch Ergonomics", () => {
	it("3.1 PrescriptionCockpitModal renders native Bottom Sheet structure for mobile", () => {
		const html = renderToStaticMarkup(
			React.createElement(PrescriptionCockpitModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patient: { id: "pat-1", fullName: "Иванов И.И." },
			}),
		);

		assert.ok(
			html.includes("rounded-t-[24px]"),
			"Must use rounded-t-[24px] for Apple Bottom Sheet",
		);
		assert.ok(
			html.includes("w-10 h-1 rounded-full"),
			"Must render tactile drag handle for mobile sheet",
		);
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
		const html = renderToStaticMarkup(
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
		const html = renderToStaticMarkup(
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
