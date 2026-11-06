import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	stripReasoning,
	extractReasoningAndContent,
	StreamingReasoningFilter,
} from "./reasoningStripper.js";

describe("DENTE AI Copilot Reasoning & CoT Stripper Suite", () => {
	it("1. stripReasoning removes complete <think>...</think> blocks", () => {
		const raw = "<think>Analysing tooth 46 pulp status...</think>Зуб 46: глубокий кариес без признаков пульпита.";
		const cleaned = stripReasoning(raw);
		assert.equal(cleaned, "Зуб 46: глубокий кариес без признаков пульпита.");
	});

	it("2. stripReasoning removes unclosed <think> tail upon stream cutoff", () => {
		const raw = "Протокол лечения:\n1. Анестезия Ubistesin 1.7 ml\n<think>The doctor did not specify composite brand, assuming Ceram.x";
		const cleaned = stripReasoning(raw);
		assert.equal(cleaned, "Протокол лечения:\n1. Анестезия Ubistesin 1.7 ml");
	});

	it("3. stripReasoning handles multiple reasoning tags (<thought>, <reasoning>)", () => {
		const raw = "<thought>Thinking step 1</thought>Hello <reasoning>Thinking step 2</reasoning>Doctor!";
		const cleaned = stripReasoning(raw);
		assert.equal(cleaned, "Hello Doctor!");
	});

	it("4. extractReasoningAndContent separates reasoning from dialogue", () => {
		const raw = "<think>\nPatient has lidocaine allergy.\nSelect Articaine instead.\n</think>\nРекомендована анестезия препаратом Артикаин 4% с эпинефрином 1:200 000.";
		const result = extractReasoningAndContent(raw);
		assert.equal(
			result.reasoning,
			"Patient has lidocaine allergy.\nSelect Articaine instead.",
		);
		assert.equal(
			result.content,
			"Рекомендована анестезия препаратом Артикаин 4% с эпинефрином 1:200 000.",
		);
	});

	it("5. StreamingReasoningFilter splits chunks in real-time across tag boundaries", () => {
		const textDeltas: string[] = [];
		const thinkingDeltas: string[] = [];

		const filter = new StreamingReasoningFilter({
			onTextDelta: (t) => textDeltas.push(t),
			onThinkingDelta: (t) => thinkingDeltas.push(t),
		});

		// Chunks splitting the <think> and </think> tags
		filter.feed("<th");
		filter.feed("ink>Checking ");
		filter.feed("tooth 16...");
		filter.feed("</th");
		filter.feed("ink>Зуб ");
		filter.feed("16 интактен.");
		filter.flush();

		const fullThinking = thinkingDeltas.join("");
		const fullText = textDeltas.join("");

		assert.equal(fullThinking, "Checking tooth 16...");
		assert.equal(fullText, "Зуб 16 интактен.");
	});

	it("6. StreamingReasoningFilter handles regular text with less-than signs without false positives", () => {
		const textDeltas: string[] = [];
		const thinkingDeltas: string[] = [];

		const filter = new StreamingReasoningFilter({
			onTextDelta: (t) => textDeltas.push(t),
			onThinkingDelta: (t) => thinkingDeltas.push(t),
		});

		filter.feed("Зубодесневой карман < 3 мм, норма.");
		filter.flush();

		assert.equal(thinkingDeltas.length, 0);
		assert.equal(textDeltas.join(""), "Зубодесневой карман < 3 мм, норма.");
	});
});
