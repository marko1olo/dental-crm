/**
 * copilotComposerAutonomy.test.tsx
 *
 * Unit tests for Copilot Composer & Voice Dictation Non-Blocking Autonomy:
 * - Mandate 8d: Touch targets >= 44x44px (Apple HIG standard).
 * - Mandate 8e: Doctor & Staff Autonomy (Zero unexplained disabled buttons, 1-click clinical prompt fallback).
 * - Mandate 8k: CRM != Reality Simulator (Friction-killer default prompt).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8o: Task-Scope Reporting.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CopilotComposer } from "../CopilotComposer";
import { VoiceDictationAssistantModal } from "../../voice/VoiceDictationAssistantModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expect = (actual: unknown) => ({
	toBe: (expected: unknown) => assert.equal(actual, expected),
	toBeTruthy: () => assert.ok(actual),
	toContain: (expected: string) =>
		assert.ok(String(actual).includes(expected), `expected to contain "${expected}"`),
	toMatch: (regex: RegExp) => assert.match(String(actual), regex),
	not: {
		toContain: (expected: string) =>
			assert.ok(!String(actual).includes(expected), `expected not to contain "${expected}"`),
		toMatch: (regex: RegExp) => assert.doesNotMatch(String(actual), regex),
	},
});

describe("CopilotComposer & Voice Dictation Autonomy (Mandates 8d, 8e, 8k, 8n)", () => {
	it("1. send button in CopilotComposer is NOT disabled when value is empty (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			<CopilotComposer
				value=""
				busy={false}
				onChange={() => {}}
				onSubmit={() => {}}
			/>,
		);

		expect(html).toContain("copilot-send-btn");
		// Verify send button does not have disabled attribute
		expect(html).not.toMatch(/copilot-send-btn[^>]*disabled|disabled[^>]*copilot-send-btn/);
	});

	it("2. send button is disabled ONLY when busy is true (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			<CopilotComposer
				value="Клинический вопрос"
				busy={true}
				onChange={() => {}}
				onSubmit={() => {}}
			/>,
		);

		expect(html).toContain("copilot-send-btn");
		expect(html).toContain("disabled");
	});

	it("3. VoiceDictationAssistantModal simulate button is NOT disabled by default (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			<VoiceDictationAssistantModal
				isOpen={true}
				onClose={() => {}}
				onApplyCommand={() => {}}
			/>,
		);

		expect(html).toContain("dnt-voice-btn-simulate");
		expect(html).not.toMatch(/dnt-voice-btn-simulate[^>]*disabled|disabled[^>]*dnt-voice-btn-simulate/);
	});

	it("4. source code audit: empty send click populates default prompt and triggers info toast (Mandates 8e & 8k)", () => {
		const componentPath = path.resolve(__dirname, "../CopilotComposer.tsx");
		const sourceCode = fs.readFileSync(componentPath, "utf-8");

		// Check default prompt constant and toast
		expect(sourceCode).toContain('DEFAULT_CLINICAL_PROMPT = "Проанализируй состояние пациента и подготовь рекомендации по Форме 043/у"');
		expect(sourceCode).toContain('showToast("Подставлен клинический запрос по умолчанию", "info")');
		// Check disabled prop is strictly {busy}
		expect(sourceCode).toContain("disabled={busy}");
		expect(sourceCode).not.toContain("disabled={!value.trim() || busy}");
	});

	it("5. source code audit: VoiceDictationAssistantModal text simulation fallback has sensible clinical phrase", () => {
		const modalPath = path.resolve(__dirname, "../../voice/VoiceDictationAssistantModal.tsx");
		const sourceCode = fs.readFileSync(modalPath, "utf-8");

		expect(sourceCode).toContain('const targetText = trimmed || "Зуб 16 кариес дентина, зуб 21 норма, зуб 36 пульпит";');
		expect(sourceCode).toContain('showToast("Подставлен пример клинической надиктовки", "info");');
		expect(sourceCode).toContain("disabled={false}");
	});
});
