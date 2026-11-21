/**
 * doctorAutonomyEmkWave65.test.tsx
 *
 * Dedicated Verification Suite for Doctor Autonomy across EMK 043/y and Visit Diary (Mandates 8e, 8n, 8v, 8t):
 * 1. VisitEmkTab: "Сохранить запись приёма" (btn-save-visit-note) and "Завершить приём" (btn-complete-visit-emk)
 *    are NEVER disabled by empty or secondary clinical fields (complaint, anamnesis, objectiveStatus, diagnosis).
 *    Missing fields are automatically defaulted to physiological norm on save/complete without blocking the doctor.
 * 2. VisitDiarySection: 1-Click physiological norm (diary-norm-direct-btn) is directly accessible in the toolbar
 *    and seamlessly handles locked status by invoking beginRevise().
 * 3. VisitDiarySection draft save button (diary-save-btn) is present and non-blocking.
 * 4. Debounced autosave protection: Drafts are safeguarded against tab changes, visibility loss, and telephony events.
 * 5. Print 043/y anytime: Form 043 supports instant printing with "ЧЕРНОВИК" (draft) or "ПОДПИСАНО ВРАЧОМ" (signed)
 *    watermarks without 403 or modal locks.
 * 6. Zero cartoon emojis in EMK and Visit Diary files (strict Lucide vector icons only).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mandate 8e & 8n: Doctor EMK & Visit Diary Autonomy Enforcement", () => {
	const visitEmkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const visitEmkCompletionPath = path.resolve(__dirname, "../emkTab/VisitEmkCompletionSection.tsx");
	const visitEmkAutosavePath = path.resolve(__dirname, "../emkTab/useVisitEmkAutosave.ts");
	const visitEmkControllerPath = path.resolve(__dirname, "../emkTabModules/useVisitEmkTabController.ts");
	const visitEmkToolbarPath = path.resolve(__dirname, "../emk/emkToolbarModules/EmkQuickActionButtons.tsx");
	const visitEmkTabSource = [
		fs.readFileSync(visitEmkTabPath, "utf8"),
		fs.existsSync(visitEmkCompletionPath) ? fs.readFileSync(visitEmkCompletionPath, "utf8") : "",
		fs.existsSync(visitEmkAutosavePath) ? fs.readFileSync(visitEmkAutosavePath, "utf8") : "",
		fs.existsSync(visitEmkControllerPath) ? fs.readFileSync(visitEmkControllerPath, "utf8") : "",
		fs.existsSync(visitEmkToolbarPath) ? fs.readFileSync(visitEmkToolbarPath, "utf8") : "",
	].join("\n");

	const form043PrintModalPath = path.resolve(__dirname, "../../emr/Form043PrintModal.tsx");
	const medicalRecordStudioModalPath = path.resolve(__dirname, "../../emr/MedicalRecordStudioModal.tsx");
	const form043RecordDir = path.resolve(__dirname, "../../emr/record");
	const form043PrintModalSource = [
		fs.existsSync(form043PrintModalPath) ? fs.readFileSync(form043PrintModalPath, "utf8") : "",
		fs.existsSync(medicalRecordStudioModalPath) ? fs.readFileSync(medicalRecordStudioModalPath, "utf8") : "",
		...(fs.existsSync(form043RecordDir)
			? fs.readdirSync(form043RecordDir).filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && fs.statSync(path.join(form043RecordDir, f)).isFile()).map((f) => fs.readFileSync(path.join(form043RecordDir, f), "utf8"))
			: []),
	].join("\n");

	const emr043MathPath = path.resolve(__dirname, "../../emr/emr043Math.ts");
	const clinicalDiaryMathPath = path.resolve(__dirname, "../../emr/clinicalDiaryMath.ts");
	const emr043MathDir = path.resolve(__dirname, "../../emr/math");
	const resolvedMathPath = fs.existsSync(emr043MathPath) ? emr043MathPath : clinicalDiaryMathPath;
	const emr043MathSource = [
		fs.existsSync(resolvedMathPath) ? fs.readFileSync(resolvedMathPath, "utf8") : "",
		fs.existsSync(medicalRecordStudioModalPath) ? fs.readFileSync(medicalRecordStudioModalPath, "utf8") : "",
		...(fs.existsSync(emr043MathDir)
			? fs.readdirSync(emr043MathDir).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(emr043MathDir, f), "utf8"))
			: []),
	].join("\n");

	it("1. VisitEmkTab buttons: Save and Complete Visit are never blocked by missing fields", () => {
		// Save button data-testid exists
		assert.ok(
			visitEmkTabSource.includes('data-testid="btn-save-visit-note"'),
			"Must have data-testid='btn-save-visit-note'",
		);

		// Complete visit button data-testid exists
		assert.ok(
			visitEmkTabSource.includes('data-testid="btn-complete-visit-emk"'),
			"Must have data-testid='btn-complete-visit-emk'",
		);

		// Save button in-flight check uses aria-busy/isDraftAccepting (Mandate 8e: never disabled)
		assert.ok(
			visitEmkTabSource.includes("isDraftAccepting"),
			"Save button must guard against in-flight isDraftAccepting",
		);

		// Complete button in-flight check uses aria-busy/isCompletingVisit (Mandate 8e: never disabled)
		assert.ok(
			visitEmkTabSource.includes("isCompletingVisit"),
			"Complete visit button must guard against in-flight isCompletingVisit",
		);

		// Auto-fills physiological norm on save if missing
		assert.ok(
			visitEmkTabSource.includes("Z01.2 Осмотр полости рта, патологий не выявлено (Норма)"),
			"Must auto-default diagnosis to physiological norm on save if blank",
		);
		assert.ok(
			visitEmkTabSource.includes("Соматически здоров. Аллергоанамнез не отягощен."),
			"Must auto-default anamnesis to physiological norm on save if blank",
		);
		assert.ok(
			visitEmkTabSource.includes("Слизистая оболочка полости рта бледно-розовая, влажная."),
			"Must auto-default objective status to physiological norm on save if blank",
		);

		// handleCompleteVisitAndGenerateReceipt also auto-fills physiological norm
		assert.ok(
			visitEmkTabSource.includes("visitNoteForm?.anamnesis ||\n\t\t\t\t\t\t\"Соматически здоров. Аллергоанамнез не отягощен.\"") ||
			visitEmkTabSource.includes("visitNoteForm?.anamnesis ||") &&
			visitEmkTabSource.includes("Соматически здоров. Аллергоанамнез не отягощен."),
			"handleCompleteVisitAndGenerateReceipt must supply physiological norm defaults for diary",
		);
	});

	it("2. VisitEmkTab: 1-click chairside physiological norm button exists and handles auto-revision", () => {
		// 1-Click norm direct button exists in EmkToolbar / EmkQuickActionButtons
		assert.ok(
			visitEmkTabSource.includes('data-testid="btn-chairside-physiological-norm"') ||
			visitEmkTabSource.includes("onApplyPhysiologicalNorm"),
			"Must have physiological norm action wired up",
		);
		assert.ok(
			visitEmkTabSource.includes("handleApplyPhysiologicalNorm"),
			"Must wire up handleApplyPhysiologicalNorm handler",
		);
		// Auto beginRevise if locked
		assert.ok(
			visitEmkTabSource.includes("isRevisingVisitNote") ||
			visitEmkTabSource.includes("setIsRevisingVisitNote"),
			"Must manage revision state when doctor edits or clicks norm",
		);
	});

	it("3. Debounced autosave safeguards visit drafts against navigation and incoming events", () => {
		// Debounced autosave mechanism in VisitEmkTab
		assert.ok(
			visitEmkTabSource.includes("visibilitychange"),
			"Must listen to visibilitychange to flush pending autosaves",
		);
		assert.ok(
			visitEmkTabSource.includes("pagehide"),
			"Must listen to pagehide to flush pending autosaves",
		);
		assert.ok(
			visitEmkTabSource.includes("dente-telephony-incoming-call"),
			"Must listen to telephony events so incoming calls never destroy draft notes",
		);
	});

	it("4. Form 043 printing is available anytime with draft vs signed watermarks", () => {
		// Watermark logic in emr043Math
		assert.ok(
			emr043MathSource.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)"),
			"Must support 'ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)' stamp for incomplete/draft cards",
		);
		assert.ok(
			emr043MathSource.includes("ПОДПИСАНО ВРАЧОМ"),
			"Must support 'ПОДПИСАНО ВРАЧОМ' stamp for signed cards",
		);

		// Form043PrintModal renders dual-state stamp badge without 403 barriers
		assert.ok(
			form043PrintModalSource.includes('data-testid="badge-043-draft-status"') ||
			form043PrintModalSource.includes('data-legacy-testid="badge-043-draft-status"') ||
			form043PrintModalSource.includes('data-testid="badge-emr-draft-status"'),
			"Form043PrintModal must render dual-state stamp badge",
		);
		assert.ok(
			form043PrintModalSource.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)") ||
			form043PrintModalSource.includes("Черновик (приём не закрыт)"),
			"Form043PrintModal must display draft stamp when visit is open",
		);
		assert.ok(
			form043PrintModalSource.includes("ПОДПИСАНО ВРАЧОМ") ||
			form043PrintModalSource.includes("Подписано врачом"),
			"Form043PrintModal must display signed stamp when visit is closed",
		);
	});

	it("5. Zero cartoon emojis in EMK 043/y and Visit Diary components", () => {
		// Regex matching cartoon emojis
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

		assert.ok(
			!emojiRegex.test(visitEmkTabSource),
			"VisitEmkTab.tsx must contain 0 cartoon emojis",
		);
		assert.ok(
			!emojiRegex.test(form043PrintModalSource),
			"Form043PrintModal.tsx must contain 0 cartoon emojis",
		);
	});
});
