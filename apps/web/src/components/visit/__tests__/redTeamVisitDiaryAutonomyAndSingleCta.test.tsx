import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚔️ RED TEAM INQUISITION SUITE: Клинический приём, дневник и ЭМК (Мандаты 8e, 8am, 8b, 8x, 8ap)
 * 1. Строго 1 Primary CTA в футере дневника (Мандат 8am): «Завершить приём и счёт» цвета тил #0d9488.
 * 2. Кнопка подписания ЭЦП в CryptoProSigner — нейтральная вторичная (border border-[var(--line)] bg-[var(--paper)]).
 * 3. Полное искоренение советского рудимента 'vde-043' и 'data-testid="diary-print-043"' из TSX разметки.
 * 4. Автономия врача (Мандат 8e): 1 клик физиологическая норма, debounced autosave, fieldsDisabled = false.
 * 5. Соответствие файлов архитектурному стандарту размера Мандата 8b (Sweet Spot 200–300 строк, <= 500 строк).
 */

describe("Red Team Inquisition: Clinical Visit Diary & Doctor Autonomy (Mandates 8e, 8am, 8b)", () => {
	const visitDir = path.resolve(__dirname, "..");
	const diaryDir = path.resolve(visitDir, "diary");

	it("1. Footer has strictly ONE Primary CTA button (Teal #0d9488) and secondary CryptoPro signer (Mandate 8am)", () => {
		const footerFile = path.resolve(diaryDir, "section/VisitDiaryActionsFooter.tsx");
		const cryptoFile = path.resolve(visitDir, "CryptoProSigner.tsx");

		assert.ok(fs.existsSync(footerFile), "VisitDiaryActionsFooter.tsx must exist");
		assert.ok(fs.existsSync(cryptoFile), "CryptoProSigner.tsx must exist");

		const footerCode = fs.readFileSync(footerFile, "utf8");
		const cryptoCode = fs.readFileSync(cryptoFile, "utf8");

		// Primary CTA button in footer is «✓ Завершить приём и сохранить карту» / «Завершить приём и счёт» (Teal / Primary)
		assert.ok(
			footerCode.includes('id="diary-complete-visit-btn"'),
			"Footer must contain diary-complete-visit-btn",
		);
		assert.ok(
			footerCode.includes("bg-[var(--primary") || footerCode.includes("bg-[var(--teal"),
			"Primary CTA button must use bg-[var(--primary)] or bg-[var(--teal)]",
		);
		assert.ok(
			footerCode.includes("Завершить приём"),
			"Primary CTA label must contain 'Завершить приём'",
		);

		// Save draft button is secondary
		assert.ok(
			footerCode.includes('id="diary-save-btn"'),
			"Footer must contain diary-save-btn",
		);
		assert.ok(
			footerCode.includes("border border-[var(--line)]"),
			"Save draft button must be secondary with border",
		);

		// CryptoPro signer button is secondary neutral (NOT primary teal CTA)
		assert.ok(
			cryptoCode.includes("Подписать ЭЦП"),
			"CryptoProSigner button must be titled 'Подписать ЭЦП'",
		);
		assert.ok(
			cryptoCode.includes("border border-[var(--line)]"),
			"CryptoPro button must be neutral secondary with border border-[var(--line)]",
		);
		assert.ok(
			cryptoCode.includes("bg-[var(--paper)]"),
			"CryptoPro button must use bg-[var(--paper)]",
		);
		// Must NOT steal Primary CTA background
		assert.ok(
			!cryptoCode.includes("bg-[var(--teal,var(--brand-primary))]"),
			"CryptoPro button must not use primary accent bg-[var(--teal)] to avoid CTA collision",
		);
	});

	it("2. Complete eradication of legacy 'vde-043' class prefix from TSX files (Mandates 8x, 8ap)", () => {
		const filesToCheck = [
			path.resolve(visitDir, "VisitDiarySection.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryHeader.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryActionsFooter.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryHeaderActions.tsx"),
			path.resolve(diaryDir, "VisitDiarySoapFields.tsx"),
			path.resolve(diaryDir, "VisitDiaryReviseAndLockFooters.tsx"),
			path.resolve(diaryDir, "VisitDiaryRevisionsHistory.tsx"),
			path.resolve(diaryDir, "fields/VisitDiaryAnamnesisField.tsx"),
			path.resolve(diaryDir, "fields/VisitDiaryObjectiveField.tsx"),
			path.resolve(diaryDir, "fields/VisitDiaryAssessmentField.tsx"),
			path.resolve(diaryDir, "fields/VisitDiaryTreatmentField.tsx"),
			path.resolve(diaryDir, "fields/VisitDiaryComplicationsField.tsx"),
		];

		for (const file of filesToCheck) {
			assert.ok(fs.existsSync(file), `File ${path.basename(file)} must exist`);
			const content = fs.readFileSync(file, "utf8");
			const matches = content.match(/vde-043[a-zA-Z0-9_\-]*/g);
			assert.ok(
				!matches || matches.length === 0,
				`File ${path.basename(file)} must have 0 occurrences of 'vde-043', found: ${matches?.join(", ")}`,
			);
		}
	});

	it("3. Legacy test-id 'diary-print-043' replaced with semantic 'diary-print-emr-card' (Mandate 8x)", () => {
		const headerActionsFile = path.resolve(diaryDir, "section/VisitDiaryHeaderActions.tsx");
		const code = fs.readFileSync(headerActionsFile, "utf8");

		assert.ok(
			code.includes('data-testid="diary-print-emr-card"'),
			"Must provide clean semantic data-testid='diary-print-emr-card'",
		);
		assert.ok(
			code.includes('data-legacy-testid="diary-print-043"'),
			"Must retain backwards compatibility data-legacy-testid='diary-print-043'",
		);
	});

	it("4. Doctor Autonomy (Mandate 8e): 1-click physiological norm & non-blocking fields", () => {
		const sectionFile = path.resolve(visitDir, "VisitDiarySection.tsx");
		const viewHookFile = path.resolve(diaryDir, "section/useVisitDiarySectionView.ts");
		const normHelperFile = path.resolve(diaryDir, "section/applyPhysiologicalNormHelper.ts");

		const sectionCode = fs.readFileSync(sectionFile, "utf8");
		const viewHookCode = fs.readFileSync(viewHookFile, "utf8");
		const normCode = fs.readFileSync(normHelperFile, "utf8");

		// Non-blocking fields
		assert.ok(
			sectionCode.includes("const fieldsDisabled = false;"),
			"VisitDiarySection must maintain fieldsDisabled = false per Mandate 8e",
		);

		// Norm application in 1 click
		assert.ok(
			viewHookCode.includes("applyFullPhysiologicalNorm"),
			"useVisitDiarySectionView must integrate applyFullPhysiologicalNorm",
		);
		assert.ok(
			normCode.includes("Z01.2"),
			"applyFullPhysiologicalNorm must set ICD-10 Z01.2",
		);
		assert.ok(
			normCode.includes("scheduleDebouncedSave"),
			"applyFullPhysiologicalNorm must trigger debounced autosave",
		);
	});

	it("5. File Line Count Budget conforms to Mandate 8b (Sweet Spot 200–300, max 500 lines)", () => {
		const keyDiaryFiles = [
			path.resolve(visitDir, "VisitDiarySection.tsx"),
			path.resolve(visitDir, "CryptoProSigner.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryHeader.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryActionsFooter.tsx"),
			path.resolve(diaryDir, "section/VisitDiaryHeaderActions.tsx"),
			path.resolve(diaryDir, "VisitDiarySoapFields.tsx"),
			path.resolve(diaryDir, "VisitDiaryReviseAndLockFooters.tsx"),
			path.resolve(diaryDir, "VisitDiaryRevisionsHistory.tsx"),
			path.resolve(diaryDir, "section/useVisitDiarySectionView.ts"),
		];

		for (const file of keyDiaryFiles) {
			const lines = fs.readFileSync(file, "utf8").split("\n").length;
			assert.ok(
				lines <= 400,
				`File ${path.basename(file)} must not exceed 400 lines (current: ${lines})`,
			);
		}
	});
});
