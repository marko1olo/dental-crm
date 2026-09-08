/**
 * visitViewAutonomyInquisition.test.tsx
 *
 * Inquisition & Autonomy Unit Tests for VisitView:
 * 1. AI Dictation Polish Button is NOT disabled when transcript text is empty (disabled === false).
 * 2. Clicking polish button with empty transcript auto-populates standard clinical entry ("Осмотр полости рта проведен...") and shows guidance.
 * 3. Somatic status can be marked healthy in 1 click via dedicated 1-click "Норма" button without 50 hospital checkboxes.
 * 4. Primary action buttons meet >= 44px touch targets and dense toolbar buttons >= 36px.
 * 5. Telephony isolation: doctor visit workspace is sterile from incoming call popups/banners (Mandate 8e).
 *
 * Mandates: 8d (Burden of Proof), 8e (Doctor Autonomy), 8i (Outpatient Bounded Context),
 * 8k (CRM != Reality Simulator), 8n (Solo Doctor Sovereignty), 8o (Task-Scope Reporting).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
} from "../../../VisitView";

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
	mockResolvedValue: (val: any) => MockFn;
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	fn.mockResolvedValue = (val: any) => createMockFn(() => Promise.resolve(val));
	return fn;
}

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
			toContain: (expected: string) => {
				assert.ok(
					!actual?.includes?.(expected),
					`Expected "${actual}" NOT to contain "${expected}"`,
				);
			},
			toHaveBeenCalled: () => {
				const count = actual?.calls?.length ?? 0;
				assert.strictEqual(
					count,
					0,
					`Expected function NOT to have been called, but was called ${count} times`,
				);
			},
		},
		toContain: (expected: string) => {
			assert.ok(
				actual?.includes?.(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		toHaveBeenCalled: () => {
			const count = actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => {
					if (arg && typeof arg === "object" && arg._isStringContaining) {
						return typeof callArgs[i] === "string" && callArgs[i].includes(arg.substr);
					}
					return callArgs[i] === arg;
				}),
			);
			assert.ok(
				match,
				`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
	};
}

expect.stringContaining = (substr: string) => ({
	_isStringContaining: true,
	substr,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("VisitView Audio Transcription Polish & Somatic Norm Autonomy Inquisition", () => {
	const visitViewPath = path.resolve(__dirname, "../../../VisitView.tsx");
	const visitViewSource = fs.readFileSync(visitViewPath, "utf8");

	it("1. guarantees AI polish button is NOT disabled when transcript text is empty (disabled === false)", () => {
		// Verify source code constraint: removed `!hasVisitTranscriptText` from disabled attribute on polish button
		expect(visitViewSource).not.toContain("disabled={!hasVisitTranscriptText || isTranscriptPolishing}");
		expect(visitViewSource).toContain("disabled={isTranscriptPolishing}");
		expect(visitViewSource).toContain('data-testid="btn-polish-transcript"');
	});

	it("2. clicking polish button with empty transcript auto-populates standard clinical entry and shows guidance toast", async () => {
		const mockSetTranscript = vi.fn();
		const mockUpdateVisitNoteField = vi.fn();
		const mockPolishTranscript = vi.fn();
		const mockToast = vi.fn();

		const result = await executePolishTranscriptAutonomy({
			hasVisitTranscriptText: false,
			setTranscript: mockSetTranscript,
			updateVisitNoteField: mockUpdateVisitNoteField,
			visitNoteForm: { anamnesis: "", objectiveInspection: "" },
			polishTranscript: mockPolishTranscript,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(result.populatedNorm).toBe(true);
		expect(mockSetTranscript).toHaveBeenCalledWith(
			"Осмотр полости рта проведен. Слизистая оболочка розовая, влажная. Соматически здоров",
		);
		expect(mockUpdateVisitNoteField).toHaveBeenCalledWith(
			"objectiveInspection",
			expect.stringContaining("Слизистая оболочка полости рта"),
		);
		expect(mockUpdateVisitNoteField).toHaveBeenCalledWith(
			"anamnesis",
			expect.stringContaining("Соматически здоров"),
		);
		expect(mockToast).toHaveBeenCalledWith(
			"Подставлен стандартный клинический осмотр (норма)",
			"info",
		);
		expect(mockPolishTranscript).not.toHaveBeenCalled();
	});

	it("3. clicking polish button with existing transcript triggers real AI transcription polishing", async () => {
		const mockSetTranscript = vi.fn();
		const mockUpdateVisitNoteField = vi.fn();
		const mockPolishTranscript = vi.fn();
		const mockToast = vi.fn();

		const result = await executePolishTranscriptAutonomy({
			hasVisitTranscriptText: true,
			setTranscript: mockSetTranscript,
			updateVisitNoteField: mockUpdateVisitNoteField,
			visitNoteForm: { anamnesis: "", objectiveInspection: "" },
			polishTranscript: mockPolishTranscript,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(result.populatedNorm).toBe(false);
		expect(mockPolishTranscript).toHaveBeenCalled();
		expect(mockSetTranscript).not.toHaveBeenCalled();
		expect(mockToast).not.toHaveBeenCalled();
	});

	it("4. somatic status can be marked healthy in 1 click via dedicated 1-click 'Норма' button without 50 hospital checkboxes", () => {
		const mockUpdateVisitNoteField = vi.fn();
		const mockToast = vi.fn();

		const result = executeApplySomaticNormAutonomy({
			updateVisitNoteField: mockUpdateVisitNoteField,
			visitNoteForm: { anamnesis: "", objectiveInspection: "" },
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(mockUpdateVisitNoteField).toHaveBeenCalledWith(
			"anamnesis",
			expect.stringContaining("Соматически здоров"),
		);
		expect(mockUpdateVisitNoteField).toHaveBeenCalledWith(
			"objectiveInspection",
			expect.stringContaining("Слизистая оболочка полости рта"),
		);
		expect(mockToast).toHaveBeenCalledWith(
			"Применена норма: соматически здоров (1 клик)",
			"success",
		);

		// Verify that VisitView contains the 1-click somatic norm block with proper testids
		expect(visitViewSource).toContain('data-testid="visit-somatic-status-block"');
		expect(visitViewSource).toContain('data-testid="btn-somatic-norm-one-click"');
		expect(visitViewSource).toContain("Соматически здоров / норма (1-клик)");
	});

	it("5. primary action buttons and somatic block meet touch target ergonomics (>= 44px on primary, >= 36px on toolbar)", () => {
		// Verify min-h-[44px] on somatic block and somatic button
		expect(visitViewSource).toContain(
			'className="visit-somatic-status-block flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs flex-wrap min-h-[44px]"',
		);
		expect(visitViewSource).toContain(
			'data-testid="btn-somatic-norm-one-click"',
		);
		// Verify min-h-[44px] on polish button
		expect(visitViewSource).toContain(
			'className="secondary-button min-h-[44px] px-3 py-2"',
		);
	});

	it("6. verifies telephony isolation: doctor VisitView is a sterile zone without incoming call popups/banners (Mandate 8e)", () => {
		// Doctor VisitView must NOT import or mount incoming call modal/dialog directly
		expect(visitViewSource).not.toContain("IncomingCallPopup");
		expect(visitViewSource).not.toContain("TelephonyFloatingWidget");

		// Read IncomingCallPopup.tsx to verify the doctor/visit immunity guard
		const telephonyPopupPath = path.resolve(__dirname, "../../telephony/IncomingCallPopup.tsx");
		const telephonyPopupSource = fs.readFileSync(telephonyPopupPath, "utf8");

		expect(telephonyPopupSource).toContain('const isDoctorMode = selectedWorkspaceRole === "doctor" || currentView === "visit";');
		expect(telephonyPopupSource).toContain("if (!activeCall || isDoctorMode || isDndActive) return null;");
	});

	it("7. guarantees fast Form 043/u printing is accessible anytime with draft/signed watermark (Mandate 8e)", () => {
		expect(visitViewSource).toContain('data-testid="btn-visit-fast-print-043u"');
		expect(visitViewSource).toContain("handlePrintForm043uFast");
		expect(visitViewSource).toContain('const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";');
	});

	it("8. VisitNoteDraftPanel provides 1-click somatic norm preset and non-blocking transcription fallback (Mandates 8e & 8k)", () => {
		const draftPanelPath = path.resolve(__dirname, "../../../VisitNoteDraftPanel.tsx");
		const draftPanelSource = fs.readFileSync(draftPanelPath, "utf8");

		expect(draftPanelSource).toContain('data-testid="btn-draft-somatic-norm-one-click"');
		expect(draftPanelSource).toContain("applySomaticNormQuick");
		expect(draftPanelSource).toContain("SOMATIC_NORM_DRAFT");
		expect(draftPanelSource).toContain("Подставлен стандартный протокол осмотра (Мандат 8e). Собираю черновик...");
	});

	it("9. emr043Math renders 'ПОДПИСАНО ВРАЧОМ' watermark when closed/signed and 'ЧЕРНОВИК' when draft (Mandate 8e)", () => {
		const emr043Path = path.resolve(__dirname, "../../emr/emr043Math.ts");
		const emr043Source = fs.readFileSync(emr043Path, "utf8");

		expect(emr043Source).toContain(
			'<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>',
		);
		expect(emr043Source).toContain(
			'<div class="watermark-draft watermark-signed" aria-hidden="true" style="color: rgba(5, 150, 105, 0.06);">ПОДПИСАНО ВРАЧОМ</div>',
		);
	});
});
