import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ⚔️ RED TEAM INQUISITION SUITE: Клинический приём, дневник и ЭМК (Мандаты 8e, 8am, 8b, 8x, 8ap)
 * 1. Строго 1 Primary CTA в футере дневника (Мандат 8am): «Завершить приём» цвета primary/teal.
 * 2. Кнопка подписания ЭЦП в CryptoProSigner — нейтральная вторичная (border border-[var(--line)] bg-[var(--paper)]).
 * 3. Полное искоренение советского рудимента 'vde-043' и сиротской папки diary/.
 * 4. Автономия врача (Мандат 8e): 1 клик физиологическая норма, debounced autosave, неблокируемые кнопки.
 * 5. Соответствие файлов архитектурному стандарту размера Мандата 8b (Sweet Spot 200–300 строк, <= 500 строк).
 */

describe("Red Team Inquisition: Clinical Visit Diary & Doctor Autonomy (Mandates 8e, 8am, 8b)", () => {
	const visitDir = path.resolve(__dirname, "..");
	const diaryDir = path.resolve(visitDir, "diary");

	it("1. Footer has strictly ONE Primary CTA button (Teal / Primary) and secondary CryptoPro signer (Mandate 8am)", () => {
		const completionSectionFile = path.resolve(visitDir, "emkTab/VisitEmkCompletionSection.tsx");
		const cryptoFile = path.resolve(visitDir, "CryptoProSigner.tsx");

		assert.ok(fs.existsSync(completionSectionFile), "VisitEmkCompletionSection.tsx must exist");
		assert.ok(fs.existsSync(cryptoFile), "CryptoProSigner.tsx must exist");

		const completionCode = fs.readFileSync(completionSectionFile, "utf8");
		const cryptoCode = fs.readFileSync(cryptoFile, "utf8");

		// Primary CTA button in footer is «Завершить приём» (Primary CTA)
		assert.ok(
			completionCode.includes('data-testid="btn-complete-visit-emk"'),
			"Completion section must contain btn-complete-visit-emk",
		);
		assert.ok(
			completionCode.includes("primary-button") && completionCode.includes("bg-[var(--primary)]"),
			"Primary CTA button must use primary-button and bg-[var(--primary)]",
		);
		assert.ok(
			completionCode.includes("Завершить приём"),
			"Primary CTA label must contain 'Завершить приём'",
		);

		// Save draft button is secondary
		assert.ok(
			completionCode.includes('data-testid="btn-save-visit-note"'),
			"Completion section must contain btn-save-visit-note",
		);
		assert.ok(
			completionCode.includes("secondary-button") && completionCode.includes("border border-[var(--line)]"),
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

	it("2. Complete eradication of orphan diary/ folder and legacy VisitDiarySection (Mandate 8bf)", () => {
		const orphanSection = path.resolve(visitDir, "VisitDiarySection.tsx");
		assert.strictEqual(
			fs.existsSync(orphanSection),
			false,
			"VisitDiarySection.tsx must be physically eliminated via git rm",
		);
		assert.strictEqual(
			fs.existsSync(diaryDir),
			false,
			"Directory visit/diary must be physically eliminated via git rm",
		);
	});

	it("3. VisitEmkTab is the canonical chairside EMR SSOT and supports 1-click norm", () => {
		const emkTabFile = path.resolve(visitDir, "VisitEmkTab.tsx");
		const controllerFile = path.resolve(visitDir, "emkTabModules/useVisitEmkTabController.ts");
		assert.ok(fs.existsSync(emkTabFile), "VisitEmkTab.tsx must exist");
		assert.ok(fs.existsSync(controllerFile), "useVisitEmkTabController.ts must exist");

		const emkCode = fs.readFileSync(emkTabFile, "utf8");
		const controllerCode = fs.readFileSync(controllerFile, "utf8");

		assert.ok(
			emkCode.includes('data-testid="visit-emk-tab"'),
			"VisitEmkTab must render data-testid visit-emk-tab",
		);
		assert.ok(
			controllerCode.includes("handleApplyPhysiologicalNorm"),
			"Controller must implement handleApplyPhysiologicalNorm",
		);
		assert.ok(
			controllerCode.includes("Z01.2"),
			"handleApplyPhysiologicalNorm must set ICD-10 Z01.2",
		);
	});

	it("4. File size compliance (Mandate 8b: Sweet Spot 200–400 lines, <= 500 lines)", () => {
		const filesToMeasure = [
			path.resolve(visitDir, "VisitEmkTab.tsx"),
			path.resolve(visitDir, "emkTab/VisitEmkCompletionSection.tsx"),
			path.resolve(visitDir, "emkTabModules/useVisitEmkTabController.ts"),
		];

		for (const file of filesToMeasure) {
			const content = fs.readFileSync(file, "utf8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 500,
				`File ${path.basename(file)} has ${lineCount} lines, exceeding 500 line limit (Mandate 8b)`,
			);
		}
	});
});
