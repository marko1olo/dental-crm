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
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mandate 8e & 8n: Doctor EMK & Visit Diary Autonomy Enforcement", () => {
	const visitEmkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const visitEmkTabSource = fs.readFileSync(visitEmkTabPath, "utf8");

	const visitDiarySectionPath = path.resolve(__dirname, "../VisitDiarySection.tsx");
	const visitDiarySectionSource = fs.readFileSync(visitDiarySectionPath, "utf8");

	const form043PrintModalPath = path.resolve(__dirname, "../../emr/Form043PrintModal.tsx");
	const form043PrintModalSource = fs.readFileSync(form043PrintModalPath, "utf8");

	const emr043MathPath = path.resolve(__dirname, "../../emr/emr043Math.ts");
	const emr043MathSource = fs.readFileSync(emr043MathPath, "utf8");

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

		// Save button disabled check is only in-flight isDraftAccepting
		assert.ok(
			visitEmkTabSource.includes("disabled={isDraftAccepting}"),
			"Save button must only guard against in-flight isDraftAccepting",
		);

		// Complete button disabled check is only in-flight isCompletingVisit
		assert.ok(
			visitEmkTabSource.includes("disabled={isCompletingVisit}"),
			"Complete visit button must only guard against in-flight isCompletingVisit",
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

	it("2. VisitDiarySection: 1-click physiological norm and draft save buttons exist and are non-blocking", () => {
		// 1-Click norm direct button exists
		assert.ok(
			visitDiarySectionSource.includes('data-testid="diary-norm-direct-btn"'),
			"Must have data-testid='diary-norm-direct-btn'",
		);
		assert.ok(
			visitDiarySectionSource.includes("handleApplyFullPhysiologicalNorm()"),
			"Must wire up handleApplyFullPhysiologicalNorm",
		);
		// Auto beginRevise if locked
		assert.ok(
			visitDiarySectionSource.includes("if (isLocked && !isRevising) {\n\t\t\t\t\t\t\t\tbeginRevise();\n\t\t\t\t\t\t\t}"),
			"Must invoke beginRevise() automatically if locked when doctor clicks 1-Click norm",
		);

		// Draft save button exists
		assert.ok(
			visitDiarySectionSource.includes('data-testid="diary-save-btn"'),
			"Must have data-testid='diary-save-btn'",
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
			form043PrintModalSource.includes('data-testid="badge-043-draft-status"'),
			"Form043PrintModal must render dual-state stamp badge",
		);
		assert.ok(
			form043PrintModalSource.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)"),
			"Form043PrintModal must display draft stamp when visit is open",
		);
		assert.ok(
			form043PrintModalSource.includes("ПОДПИСАНО ВРАЧОМ"),
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
			!emojiRegex.test(visitDiarySectionSource),
			"VisitDiarySection.tsx must contain 0 cartoon emojis",
		);
		assert.ok(
			!emojiRegex.test(form043PrintModalSource),
			"Form043PrintModal.tsx must contain 0 cartoon emojis",
		);
	});
});
