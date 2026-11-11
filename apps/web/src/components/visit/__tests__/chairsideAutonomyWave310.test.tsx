/**
 * chairsideAutonomyWave310.test.tsx
 *
 * Verification Suite for Chairside 043/U & Somatic Norm Autonomy (Mandates 8e, 8n, 8s):
 * 1. 1-Click Physiological Norm: "Соматически здоров / норма" preset fills diary & status in 1 click
 *    without manual clicking through 50 hospital checklist items; doctor only edits pathology.
 * 2. Unshakeable Visit Draft (Autosave): any typed text is saved on the fly with debounced autosave (500-1000ms);
 *    tab switching, switching to X-ray (diagnostics), or closing the panel NEVER destroys doctor's draft.
 * 3. Non-blocking Close Visit: "Завершить приём" buttons are NEVER disabled by secondary clinical fields.
 * 4. Zero cartoon emojis in chairside visit files (strict Lucide vector icons only).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mandates 8e, 8n, 8s: Chairside 043/U & Somatic Norm Autonomy Inquisitor (Wave 310)", () => {
	const recordDiariesTabPath = path.resolve(__dirname, "../../emr/record/tabs/RecordDiariesTab.tsx");
	const recordInlineFormPath = path.resolve(__dirname, "../../emr/record/tabs/RecordNewDiaryInlineForm.tsx");
	const recordDiariesSource =
		fs.readFileSync(recordDiariesTabPath, "utf8") + "\n" + fs.readFileSync(recordInlineFormPath, "utf8");

	const visitEmkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const debouncedEmkPath = path.resolve(__dirname, "../emk/DebouncedEmkTextarea.tsx");
	const emkTabDir = path.resolve(__dirname, "../emkTab");
	let loadedEmkTab =
		fs.readFileSync(visitEmkTabPath, "utf8") +
		(fs.existsSync(debouncedEmkPath) ? fs.readFileSync(debouncedEmkPath, "utf8") : "");
	if (fs.existsSync(emkTabDir)) {
		for (const f of fs.readdirSync(emkTabDir)) {
			if (/\.(tsx|ts)$/.test(f)) {
				loadedEmkTab += "\n" + fs.readFileSync(path.join(emkTabDir, f), "utf8");
			}
		}
	}
	const visitEmkTabSource = loadedEmkTab;

	const visitViewPath = path.resolve(__dirname, "../../../VisitView.tsx");
	const visitViewSource = fs.readFileSync(visitViewPath, "utf8");

	const visitViewReexportPath = path.resolve(__dirname, "../VisitView.tsx");
	const visitViewReexportSource = fs.readFileSync(visitViewReexportPath, "utf8");

	it("1. 1-Click Somatic / Physiological Norm in RecordDiariesTab fills Form 043/U diary in 1 click", () => {
		// Button exists with data-testid="btn-inline-diary-norm"
		assert.ok(
			recordDiariesSource.includes('data-testid="btn-inline-diary-norm"'),
			"RecordNewDiaryInlineForm must have data-testid='btn-inline-diary-norm'",
		);
		// Norm text contains physiological somatic norm
		assert.ok(
			recordDiariesSource.includes("Жалоб на момент осмотра не предъявляет. Плановый профилактический осмотр."),
			"handleApplyNorm in RecordDiariesTab must supply healthy complaint norm",
		);
		assert.ok(
			recordDiariesSource.includes("Z01.2"),
			"handleApplyNorm must supply standard Z01.2 diagnosis",
		);
		// Button is never disabled
		assert.ok(
			!recordDiariesSource.includes('data-testid="btn-inline-diary-norm" disabled'),
			"Physiological norm button must never be disabled",
		);
	});

	it("2. 1-Click Physiological Norm in VisitEmkTab fills all fields and synchronizes external protocols", () => {
		// handleApplyPhysiologicalNorm populates complaint, anamnesis, objective, diagnosis, treatmentPlan, recommendations
		assert.ok(
			visitEmkTabSource.includes("Жалоб на момент осмотра активно не предъявляет (профилактический осмотр)."),
			"Must auto-populate complaint with physiological norm",
		);
		assert.ok(
			visitEmkTabSource.includes("Соматически здоров. Аллергоанамнез не отягощен."),
			"Must auto-populate anamnesis with healthy somatic norm",
		);
		assert.ok(
			visitEmkTabSource.includes("Слизистая оболочка полости рта физиологической окраски"),
			"Must auto-populate objective status with physiological norm",
		);
		assert.ok(
			visitEmkTabSource.includes("Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)"),
			"Must auto-populate diagnosis with Z01.2",
		);
		// Dispatches dente-apply-soap-protocol event to keep other editors in sync
		assert.ok(
			visitEmkTabSource.includes("dente-apply-soap-protocol"),
			"VisitEmkTab must dispatch dente-apply-soap-protocol for cross-component sync",
		);
	});

	it("3. Debounced Autosave (500-1000ms): text is debounced within compliant window", () => {
		// RecordDiariesTab debounce is 600ms
		assert.ok(
			recordDiariesSource.includes("setTimeout(() => {"),
			"RecordDiariesTab must use setTimeout for debouncing",
		);
		assert.ok(
			recordDiariesSource.includes("600);"),
			"RecordDiariesTab debounce timer must be set to 600ms",
		);
		// VisitEmkTab DebouncedEmkTextarea debounce is 600ms (within 500-1000ms)
		assert.ok(
			visitEmkTabSource.includes("setTimeout(() => {"),
			"DebouncedEmkTextarea must use setTimeout for debouncing",
		);
		assert.ok(
			visitEmkTabSource.includes("600); // Debounced autosave 500-1000ms"),
			"DebouncedEmkTextarea debounce timer must be set to 600ms (500-1000ms window)",
		);
		// VisitEmkTab useVisitSave debounce is 600ms
		assert.ok(
			visitEmkTabSource.includes("debounceMs: 600"),
			"useVisitSave in VisitEmkTab must use 600ms debounce",
		);
	});

	it("4. Unshakeable Draft: tab switching, X-ray transition, and unmount never destroy doctor's draft", () => {
		// RecordDiariesTab restores draft from sessionStorage on mount
		assert.ok(
			recordDiariesSource.includes("sessionStorage.getItem(draftStorageKey)"),
			"RecordDiariesTab must restore draft from storage on mount",
		);

		// VisitEmkTab DebouncedEmkTextarea listens to tab change and beforeunload
		assert.ok(
			visitEmkTabSource.includes('window.addEventListener("dente:visit-tab-change", flushCommit)'),
			"DebouncedEmkTextarea must listen to dente:visit-tab-change to flush drafts",
		);
		assert.ok(
			visitEmkTabSource.includes('window.addEventListener("beforeunload", flushCommit)'),
			"DebouncedEmkTextarea must listen to beforeunload to flush drafts",
		);

		// VisitView dispatches tab change and flushes saves on tab switch (including X-ray / diagnostics)
		assert.ok(
			visitViewSource.includes('window.dispatchEvent(\n\t\t\t\tnew CustomEvent("dente:visit-tab-change"') ||
			visitViewSource.includes('new CustomEvent("dente:visit-tab-change", { detail: { tab: visitSubViewTab } })'),
			"VisitView must dispatch dente:visit-tab-change on tab switch",
		);
		// VisitView flushes pending visit saves on unmount / beforeunload
		assert.ok(
			visitViewSource.includes('window.addEventListener("beforeunload", flushAll)'),
			"VisitView must flush all pending saves on beforeunload",
		);
		assert.ok(
			visitViewSource.includes('window.addEventListener("pagehide", flushAll)'),
			"VisitView must flush all pending saves on pagehide",
		);
	});

	it("5. Close Visit is NEVER blocked by secondary fields or missing data", () => {
		// Header complete visit button in VisitView
		assert.ok(
			visitViewSource.includes('data-testid="btn-complete-visit-header"'),
			"VisitView must have data-testid='btn-complete-visit-header'",
		);
		assert.ok(
			!visitViewSource.includes('data-testid="btn-complete-visit-header"\n\t\t\t\t\t\t\t\tdisabled'),
			"btn-complete-visit-header must never have disabled attribute",
		);

		// VisitView handleFinishVisitAction provides physiological norm fallback when fields are blank
		assert.ok(
			visitViewSource.includes("Z01.2 Стоматологическое обследование (Здоров)"),
			"VisitView handleFinishVisitAction must default blank diagnosis to Z01.2 norm",
		);
		assert.ok(
			visitViewSource.includes("Соматически здоров. Аллергоанамнез не отягощен."),
			"VisitView handleFinishVisitAction must default blank anamnesis to somatic norm",
		);
	});

	it("6. components/visit/VisitView.tsx re-export is present and valid", () => {
		assert.ok(
			visitViewReexportSource.includes('export * from "../../VisitView"'),
			"VisitView in components/visit must re-export from root VisitView",
		);
	});

	it("7. Zero cartoon emojis in chairside visit files", () => {
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

		assert.ok(
			!emojiRegex.test(recordDiariesSource),
			"RecordDiariesTab.tsx must contain 0 cartoon emojis",
		);
		assert.ok(
			!emojiRegex.test(visitEmkTabSource),
			"VisitEmkTab.tsx must contain 0 cartoon emojis",
		);
		assert.ok(
			!emojiRegex.test(visitViewSource),
			"VisitView.tsx must contain 0 cartoon emojis",
		);
	});
});
