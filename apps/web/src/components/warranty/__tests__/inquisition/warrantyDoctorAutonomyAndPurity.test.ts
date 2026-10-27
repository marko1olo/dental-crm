import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

function resolveRepoPath(relPath: string): string {
	const direct = path.resolve(process.cwd(), relPath);
	if (fs.existsSync(direct)) return direct;
	const stripped = relPath.replace(/^apps[\\/]web[\\/]/, "");
	return path.resolve(process.cwd(), stripped);
}

describe("4a. Doctor Autonomy & Zero Emojis in Warranty Studio", () => {
	const modalPath = resolveRepoPath("apps/web/src/components/warranty/WarrantyPassportModal.tsx");
	const enginePath = resolveRepoPath("apps/web/src/components/warranty/warrantyEngine.ts");
	const presetsPath = resolveRepoPath("apps/web/src/components/warranty/warrantyPresets.ts");

	test("WarrantyPassportModal.tsx has ZERO disabled buttons (Doctor Autonomy Mandate 8e)", () => {
		const modalContent = fs.readFileSync(modalPath, "utf8");
		const disabledButtonMatches = modalContent.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(
			disabledButtonMatches,
			null,
			`WarrantyPassportModal must have 0 disabled buttons, found: ${disabledButtonMatches?.join(", ")}`,
		);
	});

	test("WarrantyPassportModal.tsx maintains max modal depth = 1 (Anti-Matryoshka Law)", () => {
		const modalContent = fs.readFileSync(modalPath, "utf8");
		const portalCalls = modalContent.match(/createPortal\(/g);
		assert.equal(
			portalCalls?.length,
			1,
			"WarrantyPassportModal must have exactly 1 createPortal root, zero nested modal portals",
		);
	});

	test("Zero cartoon emojis across Warranty Studio source files (Mandate 8d)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		const targetFiles = [modalPath, enginePath, presetsPath];

		for (const file of targetFiles) {
			const content = fs.readFileSync(file, "utf8");
			const lines = content.split("\n");
			const offendingLines: string[] = [];

			lines.forEach((line, idx) => {
				if (emojiRegex.test(line)) {
					offendingLines.push(`L${idx + 1}: ${line.trim()}`);
				}
			});

			assert.equal(
				offendingLines.length,
				0,
				`File ${path.basename(file)} contains prohibited emojis: \n${offendingLines.join("\n")}`,
			);
		}
	});
});
