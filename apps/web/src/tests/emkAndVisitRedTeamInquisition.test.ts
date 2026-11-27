import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmkQuickActionButtons } from "../components/visit/emk/emkToolbarModules/EmkQuickActionButtons";
import { EmkControlBoard } from "../components/visit/EmkControlBoard";
import { DebouncedEmkTextarea } from "../components/visit/emk/DebouncedEmkTextarea";
import { generateMedicalRecordPrintHtml } from "../components/emr/clinicalDiaryMath";
import { DEFAULT_MEDICAL_CARD_DATA } from "../components/emr/medicalCardCatalogData";
import { generateSoapFromOdontogramFinding } from "../lib/clinicalProtocols";

describe("EMK & Visit Red Team Inquisition (Live SSR & Protocol Autonomy)", () => {
	it("EmkQuickActionButtons renders unlocked physiological norm button with 0 disabled blockers", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkQuickActionButtons, {
				onApplyPhysiologicalNorm: () => {},
				handleSchedule: () => {},
				canUndo: false,
				canRedo: false,
				handleUndo: () => {},
				handleRedo: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-chairside-physiological-norm"'));
		assert.strictEqual(html.includes('data-testid="btn-chairside-physiological-norm" disabled'), false);
		assert.strictEqual(html.includes("043/у"), false);
	});

	it("EmkControlBoard & DebouncedEmkTextarea render clinical controls cleanly without 043/у", () => {
		const boardHtml = renderToStaticMarkup(React.createElement(EmkControlBoard, { dashboard: null }));
		const areaHtml = renderToStaticMarkup(
			React.createElement(DebouncedEmkTextarea, {
				fieldKey: "treatmentDescription",
				label: "Проведённое лечение",
				value: "Пломбирование композитом",
				onCommit: () => {},
			}),
		);
		assert.ok(boardHtml.length > 0);
		assert.ok(areaHtml.includes("Пломбирование композитом"));
		assert.strictEqual(boardHtml.includes("043/у"), false);
	});

	it("generateMedicalRecordPrintHtml renders clean clinical title without 'Форма № 043/у'", () => {
		const html = generateMedicalRecordPrintHtml(DEFAULT_MEDICAL_CARD_DATA, { isDraft: true });
		assert.strictEqual(html.includes("Форма № 043/у"), false);
		assert.ok(html.includes("ЧЕРНОВИК"));
	});

	it("generateSoapFromOdontogramFinding maps odontogram pathology to ICD-10 and clinical text", () => {
		const soap = generateSoapFromOdontogramFinding({
			toothNumber: 16,
			state: "Caries",
			surfaces: ["O", "M"],
		});
		assert.ok(soap.diagnosisIcd10.startsWith("K02"));
		assert.ok((soap.treatmentDescription ?? "").length > 0);
	});
});
