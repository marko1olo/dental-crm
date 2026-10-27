/**
 * antiMatryoshkaAndTokens.test.ts — Anti-Matryoshka, Anti-Cartoon Emojis & CSS Tokens
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { DoctorPayrollModal } from "../../DoctorPayrollModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team: Anti-Matryoshka, Anti-Cartoon Emojis & CSS Tokens (Mandates 8d, 8s)", () => {
	it("3.1 DoctorPayrollModal.tsx contains 0 nested modals and exports cleanly", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal must be exported");

		const filePath = path.resolve(__dirname, "../../DoctorPayrollModal.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		const modalTagMatches = content.match(/<Modal\b|<Dialog\b/g);
		assert.equal(modalTagMatches, null, "DoctorPayrollModal must not contain nested modals");

		const overlayCount = (content.match(/payroll-modal-overlay/g) || []).length;
		assert.ok(overlayCount <= 1, "DoctorPayrollModal overlay must not be nested");
	});

	it("3.2 Zero cartoon emojis exist in DoctorPayrollModal.tsx, Content, or Engine", () => {
		const files = [
			path.resolve(__dirname, "../../DoctorPayrollModal.tsx"),
			path.resolve(__dirname, "../../DoctorPayrollModalContent.tsx"),
			path.resolve(__dirname, "../../staffPayrollEngine.ts"),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

		files.forEach((file) => {
			const text = fs.readFileSync(file, "utf8");
			const lines = text.split("\n");
			lines.forEach((line, idx) => {
				assert.equal(
					emojiRegex.test(line),
					false,
					`Found prohibited cartoon emoji in ${path.basename(file)} at line ${idx + 1}: ${line}`,
				);
			});
		});
	});

	it("3.3 doctorPayrollModal.css contains zero hardcoded hex colors (#xxx or #xxxxxx)", () => {
		const cssPath = path.resolve(__dirname, "../../styles/doctorPayrollModal.css");
		const css = fs.readFileSync(cssPath, "utf8");

		const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.equal(hexMatches, null, `doctorPayrollModal.css must not contain hardcoded hex colors`);
	});
});
