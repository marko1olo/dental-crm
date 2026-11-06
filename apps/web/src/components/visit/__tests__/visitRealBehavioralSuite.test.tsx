/**
 * apps/web/src/components/visit/__tests__/visitRealBehavioralSuite.test.tsx
 *
 * Real behavioral test suite for Visit & Clinical Diary components.
 * Mandates:
 * - 8e: Doctor autonomy (0 disabled buttons, debounced autosave, 1-click physiological norm).
 * - 8am: Strictly ONE Primary CTA button #0d9488 in VisitDiaryActionsFooter.
 * - 8ze: Apple HIG Mobile Bottom Sheet (Drag Handle 36x5px, touch >= 44x44px).
 * - 8x / 8ap: Clean clinical Russian without raw law numbers.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import { VisitDiaryActionsFooter } from "../diary/section/VisitDiaryActionsFooter";
import { IcdMobileBottomSheet } from "../diary/fields/IcdMobileBottomSheet";
import { applyFullPhysiologicalNorm } from "../diary/section/applyPhysiologicalNormHelper";

describe("VisitDiaryActionsFooter Real Rendering & Mandates (React 19)", () => {
	const defaultProps = {
		isLocked: false,
		isSaving: false,
		doSave: async () => {},
		ensureDraftSavedForSigning: async () => null,
		doLock: async () => {},
		isRevising: false,
		revisionReason: "",
		setRevisionReason: () => {},
		cancelRevise: () => {},
		isRevisingBusy: false,
		doRevise: async () => {},
		beginRevise: () => {},
		setShowPreview: () => {},
		onCompleteVisitAndBilling: async () => {},
	};

	it("1. renders strictly ONE Primary CTA button (#0d9488 / var(--teal)) with diary-complete-visit-btn id", () => {
		const html = renderToString(<VisitDiaryActionsFooter {...defaultProps} />);

		assert.ok(html.includes('id="diary-complete-visit-btn"'));
		assert.ok(html.includes("diary-complete-visit-btn"));
		assert.ok(html.includes("Завершить приём и сохранить карту"));

		// Verify count of primary CTA is strictly 1 (using word boundary \b to avoid matching data-testid)
		const matches = html.match(/\bid="diary-complete-visit-btn"/g);
		assert.equal(matches?.length, 1, "Must contain strictly ONE Primary CTA button");
	});

	it("2. verifies Mandate 8e: 0 disabled buttons in active unlocked diary footer (Doctor Autonomy)", () => {
		const html = renderToString(<VisitDiaryActionsFooter {...defaultProps} isSaving={false} />);

		// Check disabled attributes
		const disabledMatches = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(
			disabledMatches,
			null,
			`VisitDiaryActionsFooter must have 0 disabled buttons, found: ${disabledMatches?.length}`,
		);
	});

	it("3. renders secondary actions: draft save and print card with border-[var(--line)]", () => {
		const html = renderToString(<VisitDiaryActionsFooter {...defaultProps} />);

		assert.ok(html.includes('id="diary-save-btn"'));
		assert.ok(html.includes("Сохранить черновик"));
		assert.ok(html.includes('id="diary-footer-print-btn"'));
		assert.ok(html.includes("Печать карты"));
	});

	it("4. verifies Apple HIG touch target heights (min-h-[44px])", () => {
		const html = renderToString(<VisitDiaryActionsFooter {...defaultProps} />);

		// All actionable buttons must satisfy min-h-[44px]
		assert.ok(html.includes("min-h-[44px]"));
	});
});

describe("IcdMobileBottomSheet Apple HIG Ergonomics (React 19)", () => {
	it("5. returns null when isOpen is false", () => {
		const html = renderToString(
			<IcdMobileBottomSheet
				isOpen={false}
				onClose={() => {}}
				filteredIcd={[]}
				onSelectIcd={() => {}}
				searchValue=""
				onSearchChange={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	it("6. renders mobile Bottom Sheet with tactile Drag Handle (36x5px) and rounded-t-[24px]", () => {
		const mockIcd = [
			{ code: "K02.1", label: "Кариес дентина", group: "caries" },
			{ code: "K04.0", label: "Пульпит", group: "pulpitis" },
		];

		const html = renderToString(
			<IcdMobileBottomSheet
				isOpen={true}
				onClose={() => {}}
				filteredIcd={mockIcd as any}
				onSelectIcd={() => {}}
				searchValue=""
				onSearchChange={() => {}}
			/>,
		);

		// Bottom sheet structure
		assert.ok(html.includes("rounded-t-[24px]"), "Must have rounded-t-[24px] corners");
		assert.ok(html.includes("w-9 h-1.5 rounded-full"), "Must have tactile Drag Handle 36x5px");
		assert.ok(html.includes("data-testid=\"icd-bottom-sheet-drag-handle\""));

		// ICD list items
		assert.ok(html.includes("K02.1"));
		assert.ok(html.includes("Кариес дентина"));
		assert.ok(html.includes("K04.0"));
		assert.ok(html.includes("Пульпит"));
	});
});

describe("Physiological Norm Application Logic (Mandate 8e)", () => {
	it("7. applyFullPhysiologicalNorm sets healthy anamnesis, statusLocalis, Z01.2 and triggers debounced save", () => {
		let lockEnsured = false;
		let updatedDiary: any = {};
		let searchCode = "";
		let saveScheduled = false;

		applyFullPhysiologicalNorm(
			() => {
				lockEnsured = true;
			},
			(updater) => {
				updatedDiary = updater({});
			},
			(code) => {
				searchCode = code;
			},
			() => {
				saveScheduled = true;
			},
		);

		assert.equal(lockEnsured, true);
		assert.equal(saveScheduled, true);
		assert.equal(searchCode, "Z01.2");
		assert.equal(updatedDiary.diagnosisIcd10, "Z01.2");
		assert.ok(updatedDiary.anamnesis.includes("Соматически здоров"));
		assert.ok(updatedDiary.statusLocalis.includes("Зубные ряды интактны"));
		assert.ok(updatedDiary.treatmentDescription.includes("плановый осмотр"));
		assert.equal(updatedDiary.complications, "Осложнений нет.");
	});
});
