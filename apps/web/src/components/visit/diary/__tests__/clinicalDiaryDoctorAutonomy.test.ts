import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import { VisitDiaryActionsFooter } from "../section/VisitDiaryActionsFooter";
import { IcdMobileBottomSheet } from "../fields/IcdMobileBottomSheet";
import { applyFullPhysiologicalNorm } from "../section/applyPhysiologicalNormHelper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Clinical Diary & Doctor Autonomy Behavioral Suite (Mandates 8e, 8am, 8b, 8x, 8ap)", () => {
	const diaryDir = path.resolve(__dirname, "..");
	const visitDir = path.resolve(diaryDir, "..");
	const emrDir = path.resolve(visitDir, "../emr");

	it("1. Canonical EMR modules exist without raw form numbers (Mandates 8x, 8ap)", () => {
		const files = [
			"clinicalDiaryMath.ts",
			"MedicalCardPrintModal.tsx",
			"MedicalRecordStudioModal.tsx",
			"DirectEmrLauncher.tsx",
			"medicalCardCatalogData.ts",
		];
		for (const file of files) {
			const fullPath = path.resolve(emrDir, file);
			assert.ok(fs.existsSync(fullPath), `Canonical EMR file must exist: ${file}`);
		}
	});

	it("2. 1-click physiological norm mutates SOAP fields to healthy state with Z01.2 (Mandate 8e)", () => {
		let lockCalled = false;
		let updated: any = null;
		let search = "";
		let saveCalled = false;

		applyFullPhysiologicalNorm(
			() => {
				lockCalled = true;
			},
			(fn) => {
				updated = fn({});
			},
			(c) => {
				search = c;
			},
			() => {
				saveCalled = true;
			},
		);

		assert.equal(lockCalled, true);
		assert.equal(saveCalled, true);
		assert.equal(search, "Z01.2");
		assert.equal(updated.diagnosisIcd10, "Z01.2");
		assert.ok(updated.anamnesis.includes("Соматически здоров"));
		assert.ok(updated.statusLocalis.includes("Зубные ряды интактны"));
	});

	it("3. Debounced autosave hook file exists and registers unload event listeners (Mandate 8e)", () => {
		const autosavePath = path.resolve(diaryDir, "../diaryLogic/useVisitDiaryDraftAutosave.ts");
		assert.ok(fs.existsSync(autosavePath), "useVisitDiaryDraftAutosave.ts must exist");

		const autosaveContent = fs.readFileSync(autosavePath, "utf8");
		assert.ok(autosaveContent.includes("scheduleDebouncedSave"));
		assert.ok(autosaveContent.includes("beforeunload"));
		assert.ok(autosaveContent.includes("visibilitychange"));
		assert.ok(autosaveContent.includes("pagehide"));
	});

	it("4. Single Primary CTA button in Teal #0d9488 in VisitDiaryActionsFooter (Mandate 8am, 8e)", () => {
		const html = renderToString(
			React.createElement(VisitDiaryActionsFooter, {
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
			}),
		);

		// Single Primary CTA
		const ctaMatches = html.match(/\bid="diary-complete-visit-btn"/g);
		assert.equal(ctaMatches?.length, 1, "Must contain strictly ONE Primary CTA button");
		assert.ok(html.includes("Завершить приём и сохранить карту"));

		// 0 disabled buttons (autonomy)
		const disabledButtons = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(disabledButtons, null, "All buttons must be enabled in active state");
	});

	it("5. Apple HIG Mobile Bottom Sheet for ICD-10 renders with Drag Handle and min-h-[44px] (Mandate 8ze)", () => {
		const html = renderToString(
			React.createElement(IcdMobileBottomSheet, {
				isOpen: true,
				onClose: () => {},
				filteredIcd: [
					{ code: "K02.1", label: "Кариес дентина", group: "caries" as any },
				],
				onSelectIcd: () => {},
				searchValue: "",
				onSearchChange: () => {},
			}),
		);

		// Drag Handle 36x5px
		assert.ok(html.includes("w-9 h-1.5 rounded-full"));
		assert.ok(html.includes("rounded-t-[24px]"));

		// Touch targets >= 44x44px
		assert.ok(html.includes("min-h-[44px]") || html.includes("min-h-[48px]"));
		assert.ok(html.includes("Кариес дентина"));
	});
});
