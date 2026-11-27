/**
 * visitViewAutonomyInquisition.test.tsx
 *
 * Inquisition & Autonomy Unit Tests for VisitView:
 * Real execution of executePolishTranscriptAutonomy, executeApplySomaticNormAutonomy,
 * VisitHeaderFastPrintCluster, NetworkStatusIndicator, VisitNoteDraftPanel, and recordMathStamps.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
} from "../../../VisitView";
import { VisitHeaderFastPrintCluster } from "../view/visitHeaderModules/VisitHeaderFastPrintCluster";
import {
	FORM_043_STAMP_DRAFT,
	FORM_043_STAMP_SIGNED,
	FORM_043_WATERMARK_DRAFT_HTML,
	FORM_043_WATERMARK_SIGNED_HTML,
} from "../../emr/math/recordMathStamps";
import { NetworkStatusIndicator } from "../../sync/NetworkStatusIndicator";

describe("VisitView Audio Transcription Polish & Somatic Norm Autonomy Inquisition", () => {
	it("1. clicking polish button with empty transcript auto-populates standard clinical entry and shows guidance toast", async () => {
		const transcriptCalls: string[] = [];
		const noteFieldCalls: Array<[string, string]> = [];
		const polishCalls: number[] = [];
		const toastCalls: Array<[string, string | undefined]> = [];

		const result = await executePolishTranscriptAutonomy({
			hasVisitTranscriptText: false,
			setTranscript: (val) => transcriptCalls.push(val),
			updateVisitNoteField: (field, val) => noteFieldCalls.push([field, val]),
			visitNoteForm: { anamnesis: "", objectiveStatus: "" },
			polishTranscript: async () => {
				polishCalls.push(1);
			},
			showToastFn: (msg, type) => toastCalls.push([msg, type]),
		});

		assert.strictEqual(result.executed, true);
		assert.strictEqual(result.populatedNorm, true);
		assert.strictEqual(
			transcriptCalls[0],
			"Осмотр полости рта проведен. Слизистая оболочка розовая, влажная. Соматически здоров",
		);
		assert.ok(noteFieldCalls.some(([f, v]) => f === "objectiveStatus" && v.includes("Слизистая оболочка полости рта")));
		assert.ok(noteFieldCalls.some(([f, v]) => f === "anamnesis" && v.includes("Соматически здоров")));
		assert.deepStrictEqual(toastCalls[0], ["Подставлен стандартный клинический осмотр (норма)", "info"]);
		assert.strictEqual(polishCalls.length, 0);
	});

	it("2. clicking polish button with existing transcript triggers real AI transcription polishing", async () => {
		const transcriptCalls: string[] = [];
		const polishCalls: number[] = [];
		const toastCalls: string[] = [];

		const result = await executePolishTranscriptAutonomy({
			hasVisitTranscriptText: true,
			setTranscript: (val) => transcriptCalls.push(val),
			updateVisitNoteField: () => {},
			visitNoteForm: { anamnesis: "", objectiveInspection: "" },
			polishTranscript: async () => {
				polishCalls.push(1);
			},
			showToastFn: (msg) => toastCalls.push(msg),
		});

		assert.strictEqual(result.executed, true);
		assert.strictEqual(result.populatedNorm, false);
		assert.strictEqual(polishCalls.length, 1);
		assert.strictEqual(transcriptCalls.length, 0);
		assert.strictEqual(toastCalls.length, 0);
	});

	it("3. somatic status can be marked healthy without blocking checkboxes", () => {
		const noteFieldCalls: Array<[string, string]> = [];
		const toastCalls: Array<[string, string | undefined]> = [];

		const result = executeApplySomaticNormAutonomy({
			updateVisitNoteField: (field, val) => noteFieldCalls.push([field, val]),
			visitNoteForm: { anamnesis: "", objectiveStatus: "" },
			showToastFn: (msg, type) => toastCalls.push([msg, type]),
		});

		assert.strictEqual(result.executed, true);
		assert.ok(noteFieldCalls.some(([f, v]) => f === "anamnesis" && v.includes("Соматически здоров")));
		assert.ok(noteFieldCalls.some(([f, v]) => f === "objectiveStatus" && v.includes("Слизистая оболочка полости рта")));
		assert.deepStrictEqual(toastCalls[0], ["Применена норма: соматически здоров", "success"]);
	});

	it("4. VisitHeaderFastPrintCluster renders compact >=36px fast print buttons without bureaucratic 043/у labels", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitHeaderFastPrintCluster, {
				handlePrintMedicalCardFast: () => {},
				handlePrintCompletedActFast: () => {},
				handlePrintEstimateFast: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-visit-fast-print-card"'));
		assert.ok(html.includes("min-h-[36px]"));
		assert.strictEqual(html.includes("043/у"), false);
	});

	it("5. recordMathStamps exports 'ПОДПИСАНО ВРАЧОМ' when signed and 'ЧЕРНОВИК' when draft", () => {
		assert.ok(FORM_043_STAMP_DRAFT.includes("ЧЕРНОВИК"));
		assert.ok(FORM_043_STAMP_SIGNED.includes("ПОДПИСАНО ВРАЧОМ"));
		assert.ok(FORM_043_WATERMARK_DRAFT_HTML.includes("ЧЕРНОВИК"));
		assert.ok(FORM_043_WATERMARK_SIGNED_HTML.includes("ПОДПИСАНО ВРАЧОМ"));
	});

	it("6. NetworkStatusIndicator renders with shrink-0 and whitespace-nowrap against text collapse", () => {
		const html = renderToStaticMarkup(React.createElement(NetworkStatusIndicator));
		assert.ok(html.includes("whitespace-nowrap"));
		assert.ok(html.includes("shrink-0"));
	});
});
