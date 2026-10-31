/**
 * prescriptionWorkspaceDecomposition.test.tsx
 *
 * Red Team Inquisitor Test Suite for Decomposed Outpatient Prescription Workspace.
 *
 * MANDATES & ARCHITECTURAL INVARIANTS:
 * - Mandate 8b / 8zi: Sweet Spot file sizing (150–250 lines), zero bloated monoliths.
 * - Mandate 8e: Doctor Autonomy (Buttons are NEVER disabled, zero blocked workflows).
 * - Mandate 8y: Zero Pharmacological Paranoia (Passive warning ribbons, 1-click approvals).
 * - Mandate 8x & 8ap: Human clinical language, zero decree numbers in UI, zero competitor names.
 * - Mandate 8am: Exactly ONE Primary CTA #0d9488 (var(--teal)).
 * - Mandate 8d pt 7: Zero cartoon emojis (Lucide vector icons only).
 * - Mandate 8wx: Fast and lightweight execution bounds.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	PrescriptionWorkspaceModal,
	type PrescriptionModalProps,
} from "../PrescriptionWorkspaceModal";
import {
	PrescriptionWorkspaceHeader,
	PrescriptionDrugSelector,
	PrescriptionActiveItemsList,
	PrescriptionWorkspaceFooter,
} from "../workspace";
import { CANONICAL_DENTAL_DRUGS, CLINICAL_FAST_SETS } from "../prescriptionCatalogData";

// Regex for emoji detection per Mandate 8d pt 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function containsEmojis(str: string): boolean {
	return CARTOON_EMOJI_REGEX.test(str);
}

describe("Red Team: Prescription Workspace Modular Architecture & Sweet Spot (Mandate 8b)", () => {
	it("1.1 Renders decomposed PrescriptionWorkspaceHeader with human clinical language (Mandate 8x)", () => {
		const html = renderToString(
			<PrescriptionWorkspaceHeader
				patientName="Иванова Анна Петровна"
				patientCard="К-1042"
				doctorName="Д-р Соколов А. В."
				diagnosisIcd10="K04.0"
				patientAllergiesText="пенициллин"
				formType="standard"
				onFormTypeChange={() => {}}
				onClose={() => {}}
			/>,
		);

		assert.ok(html.includes("Рецептурный бланк"), "Must render header title");
		assert.ok(html.includes("К-1042"), "Must render patient card number");
		assert.ok(html.includes("Иванова Анна Петровна"), "Must render patient name");
		assert.ok(html.includes("Стандартный рецептурный бланк"), "Must use clean clinical title");
		assert.ok(html.includes("Бланк строгого учёта"), "Must use clean clinical title for special form");

		// Mandate 8x: Zero decree numbers in UI buttons
		assert.strictEqual(
			html.includes("Форма 107-1/у"),
			false,
			"Must NOT contain Soviet decree number 'Форма 107-1/у' in UI buttons",
		);
		assert.strictEqual(
			html.includes("Форма 148-1/у-88"),
			false,
			"Must NOT contain Soviet decree number 'Форма 148-1/у-88' in UI buttons",
		);
		assert.strictEqual(containsEmojis(html), false, "Must contain zero cartoon emojis");
	});

	it("1.2 Renders decomposed PrescriptionDrugSelector with 1-click clinical sets and quick presets", () => {
		const selectedDrugs = [CANONICAL_DENTAL_DRUGS[0]].filter(
			(d): d is (typeof CANONICAL_DENTAL_DRUGS)[0] => Boolean(d),
		);
		const html = renderToString(
			<PrescriptionDrugSelector
				selectedDrugs={selectedDrugs}
				onSelectFastSet={() => {}}
				onAddDrug={() => {}}
				onRemoveDrug={() => {}}
				hasPenicillinAllergy={false}
				hasNsaidAllergy={false}
			/>,
		);

		assert.ok(html.includes("Готовые клинические схемы в 1 клик"), "Must render fast sets header");
		for (const set of CLINICAL_FAST_SETS) {
			assert.ok(html.includes(set.label), `Must render clinical set: ${set.label}`);
		}

		// Quick pill presets
		assert.ok(html.includes("Амоксиклав 1000 мг"), "Must render Amoxiclav quick pill");
		assert.ok(html.includes("Нимесил 100 мг"), "Must render Nimesil quick pill");
		assert.ok(html.includes("Кеторол 10 мг"), "Must render Ketorol quick pill");
		assert.ok(html.includes("Хлоргексидин 0.05%"), "Must render Chlorhexidine quick pill");

		// Search and filter
		assert.ok(html.includes("Поиск по названию или действию..."), "Must render search input");
		assert.ok(html.includes("Антибиотики"), "Must render category select");
		assert.strictEqual(containsEmojis(html), false, "Must contain zero cartoon emojis");
	});

	it("1.3 Renders decomposed PrescriptionActiveItemsList with active medications and removal target >= 44px", () => {
		const selectedDrugs = [CANONICAL_DENTAL_DRUGS[0], CANONICAL_DENTAL_DRUGS[3]].filter(
			(d): d is (typeof CANONICAL_DENTAL_DRUGS)[0] => Boolean(d),
		);
		const html = renderToString(
			<PrescriptionActiveItemsList
				selectedDrugs={selectedDrugs}
				onRemoveDrug={() => {}}
				onClearDrugs={() => {}}
				hasPenicillinAllergy={true}
				hasNsaidAllergy={false}
			/>,
		);

		assert.ok(html.includes("Выписанные препараты") && html.includes("2"), "Must show count of active items");
		assert.ok(html.includes("Амоксиклав 1000 мг"), "Must show trade name of item 1");
		assert.ok(html.includes("Нимесил 100 мг"), "Must show trade name of item 2");
		assert.ok(html.includes("Очистить всё"), "Must provide clear all button");
		assert.ok(html.includes("drug-allergy-badge-amoxiclav_875_125"), "Must show allergy conflict badge");
		assert.ok(html.includes("min-h-[44px]"), "Remove button must have touch target >= 44px per Apple HIG");
		assert.strictEqual(containsEmojis(html), false, "Must contain zero cartoon emojis");
	});

	it("1.4 Renders decomposed PrescriptionWorkspaceFooter with exactly ONE Primary CTA (Mandate 8am & 8e)", () => {
		const html = renderToString(
			<PrescriptionWorkspaceFooter
				isMemoCopied={false}
				isInsertedToDiary={false}
				onCopyPatientMemo={() => {}}
				onPrint={() => {}}
				onIssueAndInsert={() => {}}
			/>,
		);

		assert.ok(html.includes("prescription-all-actions-row"), "Must render actions row");
		assert.ok(html.includes("med-rx-copy-patient-btn"), "Must render memo copy button");
		assert.ok(html.includes("print-prescription-btn"), "Must render print rx button");
		assert.ok(html.includes("print-patient-memo-btn"), "Must render print memo button");
		assert.ok(html.includes("insert-to-diary-btn"), "Must render primary CTA button");
		assert.ok(html.includes("Выписать рецепт и внести в карту приёма"), "Primary CTA text");

		// Doctor Autonomy Mandate 8e: Primary CTA and Print buttons are NEVER disabled
		assert.strictEqual(html.includes('disabled=""'), false, "Buttons must never be disabled");
		assert.strictEqual(html.includes("disabled"), false, "Buttons must never have disabled attribute");
		assert.strictEqual(containsEmojis(html), false, "Must contain zero cartoon emojis");
	});

	it("1.5 Full PrescriptionWorkspaceModal facade coordinates all modules with 100% backward compatibility", () => {
		const props: PrescriptionModalProps = {
			isOpen: true,
			onClose: () => {},
			patient: {
				id: "pat_99",
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1990-05-15",
				cardNumber: "ЭМК-9941",
				allergies: ["пенициллин"],
			},
			doctorName: "Д-р Кузнецов Д. И.",
			diary: {
				diagnosisIcd10: "K04.0",
				notes: "Острый серозный пульпит зуба 46",
			},
			disablePortal: true,
		};

		const html = renderToString(<PrescriptionWorkspaceModal {...props} />);

		// Modal structure & testids
		assert.ok(html.includes('data-testid="prescription-modal"'), "Must render modal container");
		assert.ok(html.includes('data-testid="prescription-print-modal"'), "Must render modal dialog");
		assert.ok(html.includes("Смирнов Алексей Викторович"), "Must display patient name");
		assert.ok(html.includes("ЭМК-9941"), "Must display patient medical card");
		assert.ok(html.includes("Д-р Кузнецов Д. И."), "Must display doctor name");

		// Passive allergy banner (Mandate 8e & 8y)
		assert.ok(
			html.includes("prescription-allergy-modal-banner"),
			"Must display passive non-blocking allergy strip",
		);
		assert.ok(
			html.includes("Автономия врача (Печать доступна)"),
			"Must explicitly state Doctor Autonomy in allergy notice",
		);

		// Zero disabled buttons (Mandate 8e)
		assert.strictEqual(html.includes("disabled"), false, "All buttons must remain enabled");
		assert.strictEqual(containsEmojis(html), false, "Must contain zero cartoon emojis");
	});

	it("1.6 Modal correctly returns null when isOpen=false", () => {
		const html = renderToString(
			<PrescriptionWorkspaceModal
				isOpen={false}
				onClose={() => {}}
				disablePortal={true}
			/>,
		);
		assert.strictEqual(html, "");
	});
});
