import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { Form043PrintModal, DEFAULT_043_DATA } from "../../emr/Form043PrintModal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

export function sanitizeDocumentText(text: string): string {
	return text.replace(new RegExp(CARTOON_EMOJI_REGEX, "gu"), "").replace(/ {2,}/g, " ").trim();
}

describe("Form 043/u Emoji Cleanliness & Render (Mandates 8d & 8e)", () => {
	const form043Path = path.resolve(__dirname, "../../emr/Form043PrintModal.tsx");
	const consentPath = path.resolve(__dirname, "../../consents/InformedConsentModal.tsx");
	const form043Source = fs.readFileSync(form043Path, "utf8");
	const consentSource = fs.readFileSync(consentPath, "utf8");

	it("1.6. guarantees ZERO cartoon emojis in Form 043/u & Consent sources", () => {
		const cleanText = "Медицинская карта 043/у. Диагноз: K02.1 Кариес дентина.";
		assert.strictEqual(hasCartoonEmojis(cleanText), false);
		assert.strictEqual(sanitizeDocumentText(cleanText), cleanText);

		const dirtyText = "Зуб 16 🦷 кариес 🎉🚀";
		assert.strictEqual(hasCartoonEmojis(dirtyText), true);
		assert.strictEqual(sanitizeDocumentText(dirtyText), "Зуб 16 кариес");

		assert.strictEqual(hasCartoonEmojis(form043Source), false);
		assert.strictEqual(hasCartoonEmojis(consentSource), false);
	});

	it("1.7. renders Form043PrintModal with non-disabled print button and draft badge", () => {
		const html = renderToString(
			React.createElement(Form043PrintModal, {
				isOpen: true,
				onClose: () => {},
				initialData: { passport: { ...DEFAULT_043_DATA.passport, patientFullName: "Кузнецов Д. И." } },
				isDraft: true,
				status: "draft",
			}),
		);
		assert.ok(html.includes("data-testid=\"btn-print-043-card\""));
		assert.ok(!html.includes("data-testid=\"btn-print-043-card\" disabled"));
		assert.ok(html.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)"));
		assert.ok(html.includes("data-testid=\"badge-043-draft-status\""));
	});

	it("1.8. renders Form043PrintModal with signed status badge when closed", () => {
		const html = renderToString(
			React.createElement(Form043PrintModal, {
				isOpen: true,
				onClose: () => {},
				initialData: { passport: { ...DEFAULT_043_DATA.passport, patientFullName: "Кузнецов Д. И." } },
				isDraft: false,
				status: "signed",
				isLocked: true,
			}),
		);
		assert.ok(html.includes("data-testid=\"btn-print-043-card\""));
		assert.ok(!html.includes("data-testid=\"btn-print-043-card\" disabled"));
		assert.ok(html.includes("ПОДПИСАНО ВРАЧОМ"));
		assert.ok(html.includes("data-testid=\"badge-043-draft-status\""));
	});
});
