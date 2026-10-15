/**
 * @file packages/shared/src/clinical/stenographer/__tests__/clinicalStenographerEngine.test.ts
 * @description Unit tests for Clinical Stenographer & Zero-Latency Smart Snippets Engine.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	ClinicalStenographerEngine,
	getGlobalClinicalStenographer,
	isSnippetWordChar,
	resetGlobalClinicalStenographer,
} from "../clinicalStenographerEngine.js";
import { DEFAULT_CLINICAL_SNIPPETS } from "../defaultClinicalSnippets.js";

describe("ClinicalStenographerEngine", () => {
	let engine: ClinicalStenographerEngine;

	beforeEach(() => {
		engine = new ClinicalStenographerEngine();
	});

	describe("Initialization & Default Snippets", () => {
		it("initializes with default clinical snippets dictionary", () => {
			assert.ok(engine.size() >= 15, "Expected at least 15 default snippets");
			assert.ok(engine.has("пхр"));
			assert.ok(engine.has("кф"));
			assert.ok(engine.has("энд"));
			assert.ok(engine.has("ан_инф"));
			assert.ok(engine.has("норм"));
		});

		it("contains exact required clinical texts from specification", () => {
			const pxr = engine.get("пхр");
			assert.ok(pxr);
			assert.strictEqual(
				pxr.text,
				"Препарирование кариозной полости, медикаментозная обработка 2% р-ром хлоргексидина, адгезивный протокол, восстановление анатомической формы светоотверждаемым нанокомпозитом.",
			);

			const kf = engine.get("кф");
			assert.ok(kf);
			assert.strictEqual(
				kf.text,
				"Изоляция операционного поля системой коффердам (платок Sanctuary, кламп Tor VM).",
			);

			const endo = engine.get("энд");
			assert.ok(endo);
			assert.strictEqual(
				endo.text,
				"Апекслокация (Raypex), механическая обработка ротационными файлами ProTaper Gold до размера F2, медикаментозная ирригация NaOCl 3% с ультразвуковой активацией, высушивание бумажными штифтами, временная обтурация кальцийсодержащей пастой Metapex.",
			);

			const anInf = engine.get("ан_инф");
			assert.ok(anInf);
			assert.strictEqual(
				anInf.text,
				"Анестезия инфильтрационная sol. Ultracaini D-S 1:200 000 — 1.7 мл. Анестезия наступила через 3 минуты, глубокая, без осложнений.",
			);

			const norm = engine.get("норм");
			assert.ok(norm);
			assert.strictEqual(
				norm.text,
				"Полость рта санирована. Слизистая оболочка полости рта бледно-розовая, умеренно влажная, без патологических изменений. Зубные ряды интактны, прикус физиологический. Регионарные лимфоузлы не увеличены, пальпация безболезненна.",
			);
		});

		it("handles case-insensitivity seamlessly", () => {
			assert.ok(engine.get("ПХР"));
			assert.ok(engine.get("Пхр"));
			assert.ok(engine.get("ЭНД"));
			assert.ok(engine.get("КФ"));
			assert.ok(engine.get("НОРМ"));
			assert.strictEqual(engine.get("ПХР")?.text, engine.get("пхр")?.text);
		});
	});

	describe("Character & Token Boundary Recognition", () => {
		it("correctly classifies snippet word characters", () => {
			assert.strictEqual(isSnippetWordChar("п"), true);
			assert.strictEqual(isSnippetWordChar("Я"), true);
			assert.strictEqual(isSnippetWordChar("ё"), true);
			assert.strictEqual(isSnippetWordChar("Ё"), true);
			assert.strictEqual(isSnippetWordChar("a"), true);
			assert.strictEqual(isSnippetWordChar("Z"), true);
			assert.strictEqual(isSnippetWordChar("1"), true);
			assert.strictEqual(isSnippetWordChar("_"), true);
			assert.strictEqual(isSnippetWordChar("-"), true);

			assert.strictEqual(isSnippetWordChar(" "), false);
			assert.strictEqual(isSnippetWordChar("\t"), false);
			assert.strictEqual(isSnippetWordChar("\n"), false);
			assert.strictEqual(isSnippetWordChar("."), false);
			assert.strictEqual(isSnippetWordChar(","), false);
			assert.strictEqual(isSnippetWordChar(":"), false);
			assert.strictEqual(isSnippetWordChar(";"), false);
		});

		it("extracts preceding token at caret position", () => {
			const text = "Пациент явился. пхр";
			const tokenInfo = engine.extractPrecedingToken(text, text.length);
			assert.ok(tokenInfo);
			assert.strictEqual(tokenInfo.token, "пхр");
			assert.strictEqual(tokenInfo.start, 16);
			assert.strictEqual(tokenInfo.end, 19);
		});

		it("extracts token in middle of sentence", () => {
			const text = "Осмотр: норм. Далее рекомендации.";
			// Cursor right after "норм" (position 12)
			const tokenInfo = engine.extractPrecedingToken(text, 12);
			assert.ok(tokenInfo);
			assert.strictEqual(tokenInfo.token, "норм");
			assert.strictEqual(tokenInfo.start, 8);
			assert.strictEqual(tokenInfo.end, 12);
		});

		it("handles multi-segment underscore abbreviations like 'ан_инф'", () => {
			const text = "Выполнено ан_инф";
			const tokenInfo = engine.extractPrecedingToken(text, text.length);
			assert.ok(tokenInfo);
			assert.strictEqual(tokenInfo.token, "ан_инф");
		});

		it("returns null when caret is at start or after whitespace", () => {
			assert.strictEqual(engine.extractPrecedingToken("", 0), null);
			assert.strictEqual(engine.extractPrecedingToken("hello ", 6), null);
			assert.strictEqual(engine.extractPrecedingToken("hello\n", 6), null);
		});
	});

	describe("Zero-Latency Caret Replacement & Expansion", () => {
		it("expands single abbreviation at start of document on Tab", () => {
			const result = engine.expandAtCursor({
				text: "пхр",
				cursorPosition: 3,
				triggerKey: "Tab",
			});

			assert.strictEqual(result.changed, true);
			assert.strictEqual(result.replacedToken, "пхр");
			assert.strictEqual(
				result.nextText,
				"Препарирование кариозной полости, медикаментозная обработка 2% р-ром хлоргексидина, адгезивный протокол, восстановление анатомической формы светоотверждаемым нанокомпозитом.",
			);
			assert.strictEqual(result.nextCursorPosition, result.nextText.length);
		});

		it("expands abbreviation on Space with trailing space appended", () => {
			const result = engine.expandAtCursor({
				text: "Обезболивание: ан_инф",
				cursorPosition: 21,
				triggerKey: "Space",
				appendSpaceOnSpaceTrigger: true,
			});

			assert.strictEqual(result.changed, true);
			const expectedExpanded =
				"Обезболивание: Анестезия инфильтрационная sol. Ultracaini D-S 1:200 000 — 1.7 мл. Анестезия наступила через 3 минуты, глубокая, без осложнений. ";
			assert.strictEqual(result.nextText, expectedExpanded);
			assert.strictEqual(result.nextCursorPosition, expectedExpanded.length);
		});

		it("preserves surrounding text before and after caret", () => {
			const text = "Этап 1: кф Затем препарирование.";
			// Cursor right after "кф" (index 10)
			const result = engine.expandAtCursor({
				text,
				cursorPosition: 10,
				triggerKey: "Tab",
			});

			assert.strictEqual(result.changed, true);
			assert.ok(result.nextText.startsWith("Этап 1: Изоляция операционного поля"));
			assert.ok(result.nextText.endsWith(" Затем препарирование."));
		});

		it("handles multi-line notes correctly", () => {
			const text = "Жалобы: нет\nОсмотр:\nнорм\nЛечение:";
			// Length of "Жалобы: нет\nОсмотр:\nнорм" is 12 + 8 + 4 = 24
			const normEnd = text.indexOf("норм") + 4;
			const result = engine.expandAtCursor({
				text,
				cursorPosition: normEnd,
				triggerKey: "Tab",
			});

			assert.strictEqual(result.changed, true);
			assert.ok(result.nextText.includes("Полость рта санирована."));
			assert.ok(result.nextText.endsWith("\nЛечение:"));
		});

		it("returns changed=false when token does not match any snippet", () => {
			const text = "Пациент пришел на консультацию";
			const result = engine.expandAtCursor({
				text,
				cursorPosition: text.length,
				triggerKey: "Tab",
			});

			assert.strictEqual(result.changed, false);
			assert.strictEqual(result.nextText, text);
			assert.strictEqual(result.nextCursorPosition, text.length);
		});
	});

	describe("Prefix Tree Search (Autocomplete Suggestions)", () => {
		it("finds all snippets starting with prefix 'ан'", () => {
			const suggestions = engine.searchPrefix("ан");
			assert.ok(suggestions.length >= 2);
			const keys = suggestions.map((s) => s.key);
			assert.ok(keys.includes("ан_инф"));
			assert.ok(keys.includes("ан_провод") || keys.includes("ан_пров"));
		});

		it("returns empty array for unknown prefix", () => {
			const suggestions = engine.searchPrefix("xyz123");
			assert.deepStrictEqual(suggestions, []);
		});

		it("respects limit parameter", () => {
			const suggestions = engine.searchPrefix("", 3);
			assert.strictEqual(suggestions.length, 3);
		});

		it("filters by targeted clinical field when provided", () => {
			const treatmentSnippets = engine.searchPrefix("", 50, "treatment");
			const complaintSnippets = engine.searchPrefix("", 50, "complaints");

			assert.ok(treatmentSnippets.some((s) => s.key === "пхр"));
			assert.ok(complaintSnippets.some((s) => s.key === "жалоб_нет"));
		});
	});

	describe("Dynamic Mutation & Reset", () => {
		it("allows adding, querying, and removing custom snippets", () => {
			engine.insert({
				key: "мост",
				label: "Мостовидный протез",
				text: "Препарирование опорных зубов под металлокерамический мостовидный протез.",
				category: "therapy",
			});

			assert.strictEqual(engine.has("мост"), true);
			assert.ok(engine.get("мост"));

			const result = engine.expandAtCursor({
				text: "мост",
				cursorPosition: 4,
				triggerKey: "Tab",
			});
			assert.strictEqual(result.changed, true);
			assert.ok(result.nextText.includes("металлокерамический мостовидный протез"));

			const removed = engine.remove("мост");
			assert.strictEqual(removed, true);
			assert.strictEqual(engine.has("мост"), false);
		});

		it("resets to default snippets", () => {
			engine.insert({
				key: "тест",
				label: "Тест",
				text: "Тестовый протокол",
				category: "general",
			});
			assert.strictEqual(engine.has("тест"), true);

			engine.resetToDefaults();
			assert.strictEqual(engine.has("тест"), false);
			assert.strictEqual(engine.has("пхр"), true);
		});
	});

	describe("Performance & Zero-Latency Benchmark", () => {
		it("executes 10,000 expansions in under 35ms (O(1) verified)", () => {
			const start = performance.now();
			const text = "Протокол лечения: пхр";
			const pos = text.length;

			for (let i = 0; i < 10000; i++) {
				engine.expandAtCursor({ text, cursorPosition: pos, triggerKey: "Tab" });
			}
			const duration = performance.now() - start;

			// Average per expansion must be < 0.01ms (10 microseconds)
			assert.ok(
				duration < 35,
				`Expected 10,000 expansions to take <35ms, took ${duration.toFixed(2)}ms`,
			);
		});
	});

	describe("Global Singleton Instance", () => {
		it("provides singleton instance that persists across calls", () => {
			const s1 = getGlobalClinicalStenographer();
			const s2 = getGlobalClinicalStenographer();
			assert.strictEqual(s1, s2);
			assert.ok(s1.has("пхр"));

			resetGlobalClinicalStenographer();
			assert.ok(getGlobalClinicalStenographer().has("кф"));
		});
	});
});
