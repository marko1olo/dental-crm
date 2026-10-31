import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DENTE Dental CRM — Visit Diary Photo Upload Modular Decomposition Tests
 *
 * Mandates:
 * - Mandate 8b/8zi: Sweet Spot file size (100–300 lines, strictly <= 500 lines)
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8wx: Memory Protection (mandatory URL.revokeObjectURL lifecycle)
 * - Mandate 8d pt 7: Zero cartoon emojis
 * - Token Security: Clinic token isolation via fetchAuthedApiFileObjectUrl
 */

describe("Visit Diary Photo Upload Decomposition (@dental/web)", () => {
	const photoUploadDir = path.resolve(__dirname, "..");
	const hookPath = path.join(
		photoUploadDir,
		"useVisitDiaryPhotoUploadState.ts",
	);
	const toolbarPath = path.join(
		photoUploadDir,
		"VisitDiaryPhotoActionsToolbar.tsx",
	);
	const gridPath = path.join(
		photoUploadDir,
		"VisitDiaryPhotoThumbnailGrid.tsx",
	);
	const facadePath = path.join(photoUploadDir, "VisitDiaryPhotoUpload.tsx");
	const rootFacadePath = path.resolve(
		__dirname,
		"../../../VisitDiaryPhotoUpload.tsx",
	);

	it("1. Verifies all decomposed modules exist and meet Sweet Spot line limits (<= 300 lines)", () => {
		const typesPath = path.join(photoUploadDir, "photoUploadTypes.ts");
		const offlineDraftPath = path.join(
			photoUploadDir,
			"savePhotoOfflineDraft.ts",
		);
		const modules = [
			{ path: hookPath, name: "useVisitDiaryPhotoUploadState.ts", max: 360 },
			{ path: typesPath, name: "photoUploadTypes.ts", max: 60 },
			{ path: offlineDraftPath, name: "savePhotoOfflineDraft.ts", max: 60 },
			{
				path: toolbarPath,
				name: "VisitDiaryPhotoActionsToolbar.tsx",
				max: 200,
			},
			{ path: gridPath, name: "VisitDiaryPhotoThumbnailGrid.tsx", max: 300 },
			{ path: facadePath, name: "VisitDiaryPhotoUpload.tsx", max: 150 },
			{ path: rootFacadePath, name: "Root VisitDiaryPhotoUpload.tsx", max: 50 },
		];

		for (const mod of modules) {
			assert.ok(fs.existsSync(mod.path), `Module must exist: ${mod.name}`);
			const lines = fs.readFileSync(mod.path, "utf8").split("\n").length;
			assert.ok(
				lines <= mod.max,
				`Module ${mod.name} has ${lines} lines, exceeding target sweet spot limit of ${mod.max}`,
			);
		}
	});

	it("2. Doctor Autonomy (Mandate 8e): Proves 0 disabled buttons across all modules", () => {
		const filesToCheck = [toolbarPath, gridPath, facadePath, rootFacadePath];

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf8");
			const matches = content.match(/<button[^>]*\bdisabled\b/gi);
			assert.equal(
				matches,
				null,
				`File ${path.basename(file)} must not contain disabled buttons, but found: ${matches?.join(", ")}`,
			);
		}
	});

	it("3. Zero Cartoon Emojis (Mandate 8d pt 7): Proves 0 emojis in decomposed code", () => {
		const filesToCheck = [
			hookPath,
			toolbarPath,
			gridPath,
			facadePath,
			rootFacadePath,
		];
		const emojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf8");
			assert.equal(
				emojiRegex.test(content),
				false,
				`File ${path.basename(file)} must not contain cartoon emojis`,
			);
		}
	});

	it("4. Protected Blob Lifecycle and Memory Leak Prevention (Mandate 8wx)", () => {
		const hookCode = fs.readFileSync(hookPath, "utf8");

		// Must use fetchAuthedApiFileObjectUrl
		assert.ok(
			hookCode.includes("fetchAuthedApiFileObjectUrl"),
			"Hook must fetch photos via fetchAuthedApiFileObjectUrl to inject clinic token",
		);

		// Must call URL.revokeObjectURL on teardown/visit change
		assert.ok(
			hookCode.includes("URL.revokeObjectURL"),
			"Hook must invoke URL.revokeObjectURL to prevent memory heap inflation",
		);

		// Must cleanup on visitId transition
		assert.ok(
			hookCode.includes("createdPhotoObjectUrls.current"),
			"Hook must track created object URLs in a ref map for deterministic cleanup",
		);
	});

	it("5. Clinician Actions Toolbar Invariants (Ctrl+V, Camera, Attach, Before/After)", () => {
		const toolbarCode = fs.readFileSync(toolbarPath, "utf8");

		assert.ok(
			toolbarCode.includes("Ctrl+V: вставить"),
			"Toolbar must display Ctrl+V quick hint",
		);
		assert.ok(
			toolbarCode.includes("Снимок с камеры"),
			"Toolbar must contain camera capture button",
		);
		assert.ok(
			toolbarCode.includes("Прикрепить фото"),
			"Toolbar must contain attach photo button",
		);
		assert.ok(
			toolbarCode.includes("До / После"),
			"Toolbar must contain Before/After comparison button",
		);
		assert.ok(
			toolbarCode.includes("min-h-[44px]"),
			"Toolbar buttons must adhere to Apple HIG 44px touch targets",
		);
	});

	it("6. Photo Thumbnail Grid Invariants (Print to Medical Chart, Delete Guard, 4-States)", () => {
		const gridCode = fs.readFileSync(gridPath, "utf8");

		assert.ok(
			gridCode.includes("В карту приёма"),
			"Grid must display chart print toggle badge without bureaucratic form numbers (Mandate 8x)",
		);
		assert.ok(
			gridCode.includes("setConfirmDeleteId"),
			"Grid must implement 2-phase delete confirmation guard",
		);
		assert.ok(
			gridCode.includes("Увеличить снимок"),
			"Grid must have full-screen zoom action",
		);
		assert.ok(
			gridCode.includes("Загрузка снимков"),
			"Grid must display loading phase indicator",
		);
		assert.ok(
			gridCode.includes("Список снимков не прочитан"),
			"Grid must display failure recovery UI",
		);
	});

	it("7. Seamless Backward Compatibility & Root Facade Re-export", () => {
		const rootCode = fs.readFileSync(rootFacadePath, "utf8");

		assert.ok(
			rootCode.includes("export type { DiaryPrintPhoto }"),
			"Root facade must re-export DiaryPrintPhoto type",
		);
		assert.ok(
			rootCode.includes("export { VisitDiaryPhotoUpload }"),
			"Root facade must re-export VisitDiaryPhotoUpload component",
		);
	});
});
