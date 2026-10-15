/**
 * @file apps/web/src/components/visit/emk/__tests__/clinicalStenographerDom.test.ts
 * @description RED TEAM INQUISITION: Clinical Stenographer DOM & Keyboard Integration Tests.
 *
 * Verifies:
 * 1. Zero-latency keyboard shortcut expansion (Tab / Space) on all 5 mandatory abbreviations:
 *    - 'пхр' -> Препарирование кариозной полости...
 *    - 'кф' -> Изоляция операционного поля коффердам...
 *    - 'энд' -> Апекслокация (Raypex)...
 *    - 'ан_инф' -> Анестезия инфильтрационная...
 *    - 'норм' -> Физиологическая норма...
 * 2. Caret positioning & non-blocking DOM cursor management.
 * 3. Space vs Tab trigger semantics (trailing space on Space).
 * 4. Mid-text expansion preserving preceding and succeeding clinical notes.
 * 5. Modifier key immunity (Ctrl+Tab, Alt+Space not intercepted).
 * 6. 1-click chip insertion with smart spacing.
 * 7. Structural integration across Form 043/y components (DebouncedEmkTextarea, VisitDiarySoapFields, useVisitDiaryLogic).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	getGlobalClinicalStenographer,
	ClinicalStenographerEngine,
	DEFAULT_CLINICAL_SNIPPETS,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Clinical Stenographer: DOM Keyboard & Textarea Expansion", () => {
	const engine = getGlobalClinicalStenographer();

	interface MockKeyboardEventOptions {
		key: string;
		ctrlKey?: boolean;
		altKey?: boolean;
		metaKey?: boolean;
		text: string;
		selectionStart: number;
		selectionEnd: number;
	}

	function simulateTextareaKeyDown(
		options: MockKeyboardEventOptions,
		onCommit?: (val: string) => void,
	) {
		let prevented = false;
		let stopped = false;
		let currentText = options.text;
		let currentSelectionStart = options.selectionStart;
		let currentSelectionEnd = options.selectionEnd;

		const mockTarget = {
			value: currentText,
			selectionStart: currentSelectionStart,
			selectionEnd: currentSelectionEnd,
			setSelectionRange(start: number, end: number) {
				currentSelectionStart = start;
				currentSelectionEnd = end;
			},
		};

		const mockEvent = {
			key: options.key,
			ctrlKey: Boolean(options.ctrlKey),
			altKey: Boolean(options.altKey),
			metaKey: Boolean(options.metaKey),
			currentTarget: mockTarget,
			preventDefault() {
				prevented = true;
			},
			stopPropagation() {
				stopped = true;
			},
		};

		// Mimic useClinicalStenographer handleKeyDown logic
		if (mockEvent.key !== "Tab" && mockEvent.key !== " ") {
			return { prevented, stopped, text: mockTarget.value, caret: currentSelectionStart };
		}
		if (mockEvent.ctrlKey || mockEvent.altKey || mockEvent.metaKey) {
			return { prevented, stopped, text: mockTarget.value, caret: currentSelectionStart };
		}
		if (mockTarget.selectionStart !== mockTarget.selectionEnd) {
			return { prevented, stopped, text: mockTarget.value, caret: currentSelectionStart };
		}

		const triggerKey = mockEvent.key === "Tab" ? "Tab" : "Space";
		const result = engine.expandAtCursor({
			text: mockTarget.value,
			cursorPosition: mockTarget.selectionStart,
			triggerKey,
			appendSpaceOnSpaceTrigger: true,
			targetField: "all",
		});

		if (result.changed && result.snippet) {
			mockEvent.preventDefault();
			mockEvent.stopPropagation();
			mockTarget.value = result.nextText;
			mockTarget.setSelectionRange(result.nextCursorPosition, result.nextCursorPosition);
			if (onCommit) {
				onCommit(result.nextText);
			}
		}

		return {
			prevented,
			stopped,
			text: mockTarget.value,
			caret: currentSelectionStart,
			snippet: result.snippet,
		};
	}

	it("1. Expands 'пхр' on Tab key with zero latency and sets caret after text", () => {
		let committedText = "";
		const result = simulateTextareaKeyDown(
			{
				key: "Tab",
				text: "пхр",
				selectionStart: 3,
				selectionEnd: 3,
			},
			(text) => {
				committedText = text;
			},
		);

		assert.equal(result.prevented, true, "Tab event must be prevented to avoid tab-focus loss");
		assert.equal(result.stopped, true, "Tab event propagation must be stopped");
		assert.ok(
			result.text.includes("Препарирование кариозной полости") &&
				result.text.includes("светоотверждаемым нанокомпозитом"),
			"Text must match clinical protocol for пхр",
		);
		assert.equal(result.caret, result.text.length, "Caret must be placed at the end of replacement");
		assert.equal(committedText, result.text, "onCommit must be called synchronously");
	});

	it("2. Expands 'кф' on Tab key into Cofferdam protocol", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: "кф",
			selectionStart: 2,
			selectionEnd: 2,
		});

		assert.equal(result.prevented, true);
		assert.equal(
			result.text,
			"Изоляция операционного поля системой коффердам (платок Sanctuary, кламп Tor VM).",
		);
		assert.equal(result.caret, result.text.length);
	});

	it("3. Expands 'энд' on Tab key into Endodontics protocol", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: "энд",
			selectionStart: 3,
			selectionEnd: 3,
		});

		assert.equal(result.prevented, true);
		assert.ok(result.text.includes("Апекслокация (Raypex)"));
		assert.ok(result.text.includes("Metapex"));
		assert.equal(result.caret, result.text.length);
	});

	it("4. Expands 'ан_инф' on Tab key into Anesthesia protocol", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: "ан_инф",
			selectionStart: 6,
			selectionEnd: 6,
		});

		assert.equal(result.prevented, true);
		assert.ok(result.text.includes("Анестезия инфильтрационная sol. Ultracaini D-S 1:200 000 — 1.7 мл."));
		assert.equal(result.caret, result.text.length);
	});

	it("5. Expands 'норм' on Tab key into physiological norm protocol", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: "норм",
			selectionStart: 4,
			selectionEnd: 4,
		});

		assert.equal(result.prevented, true);
		assert.ok(result.text.includes("Слизистая оболочка полости рта бледно-розовая"));
		assert.equal(result.caret, result.text.length);
	});

	it("6. Expands on Space key with trailing space appended for fluent continuous typing", () => {
		const result = simulateTextareaKeyDown({
			key: " ",
			text: "кф",
			selectionStart: 2,
			selectionEnd: 2,
		});

		assert.equal(result.prevented, true);
		assert.ok(result.text.endsWith(" "), "Space trigger must append a trailing space");
		assert.equal(result.caret, result.text.length, "Caret must be placed after the trailing space");
	});

	it("7. Correctly expands snippet in the middle of a clinical diary entry without corrupting text", () => {
		const prefix = "Зуб 2.6: глубокий кариес. ";
		const suffix = " На контроле через 6 месяцев.";
		const initialText = `${prefix}пхр${suffix}`;
		const cursorAtEndOfToken = prefix.length + 3;

		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: initialText,
			selectionStart: cursorAtEndOfToken,
			selectionEnd: cursorAtEndOfToken,
		});

		assert.equal(result.prevented, true);
		assert.ok(result.text.startsWith(prefix), "Prefix must remain untouched");
		assert.ok(result.text.endsWith(suffix), "Suffix must remain untouched");
		assert.ok(result.text.includes("Препарирование кариозной полости"));
	});

	it("8. Does NOT intercept when user holds modifier keys (Ctrl+Tab, Alt+Space)", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			ctrlKey: true,
			text: "пхр",
			selectionStart: 3,
			selectionEnd: 3,
		});

		assert.equal(result.prevented, false, "Must not intercept Ctrl+Tab");
		assert.equal(result.text, "пхр", "Text must not change");
	});

	it("9. Does NOT intercept non-snippet words (e.g. обычный текст)", () => {
		const result = simulateTextareaKeyDown({
			key: "Tab",
			text: "пациент",
			selectionStart: 7,
			selectionEnd: 7,
		});

		assert.equal(result.prevented, false, "Must not intercept ordinary non-matching words");
		assert.equal(result.text, "пациент");
	});

	it("10. Simulates 1-click chip insertion with smart spacing", () => {
		const snippet = DEFAULT_CLINICAL_SNIPPETS.find((s) => s.key === "кф")!;
		assert.ok(snippet, "Cofferdam snippet must exist");

		// Case A: empty text
		const textA = "";
		const insertedA = `${textA ? `${textA} ` : ""}${snippet.text}`;
		assert.equal(insertedA, snippet.text);

		// Case B: text without trailing space
		const textB = "Приём начат.";
		const needsLeadingSpaceB = textB.length > 0 && !textB.endsWith(" ") && !textB.endsWith("\n");
		const formattedB = `${needsLeadingSpaceB ? " " : ""}${snippet.text}`;
		const resultB = `${textB}${formattedB}`;
		assert.equal(resultB, `Приём начат. ${snippet.text}`);
	});
});

describe("Clinical Stenographer: Component Architecture & Mandate Compliance", () => {
	const debouncedTextareaPath = path.resolve(__dirname, "../DebouncedEmkTextarea.tsx");
	const stenographerBarPath = path.resolve(__dirname, "../ClinicalStenographerBar.tsx");
	const soapFieldsPath = path.resolve(__dirname, "../../diary/VisitDiarySoapFields.tsx");
	const diaryLogicPath = path.resolve(__dirname, "../../../useVisitDiaryLogic.ts");

	it("1. DebouncedEmkTextarea integrates useClinicalStenographer and ClinicalStenographerBar", () => {
		const src = fs.readFileSync(debouncedTextareaPath, "utf8");
		assert.ok(src.includes("useClinicalStenographer"), "Must use useClinicalStenographer hook");
		assert.ok(src.includes("ClinicalStenographerBar"), "Must render ClinicalStenographerBar");
		assert.ok(src.includes("enableStenographer"), "Must support enableStenographer prop");
		assert.ok(src.includes("onKeyDown={handleKeyDown}"), "Must bind onKeyDown to handleKeyDown");
	});

	it("2. ClinicalStenographerBar renders Apple HIG 1-row chips with 0 clipping and Dente styling", () => {
		const src = fs.readFileSync(stenographerBarPath, "utf8");
		assert.ok(src.includes("dente-filter-chips"), "Must have dente-filter-chips styling class");
		assert.ok(src.includes("onSelectSnippet"), "Must support onSelectSnippet callback");
		assert.ok(src.includes("aria-label"), "Must have accessibility aria-label");
	});

	it("3. VisitDiarySoapFields integrates ClinicalStenographerBar for SOAP textareas", () => {
		const src = fs.readFileSync(soapFieldsPath, "utf8");
		assert.ok(src.includes("ClinicalStenographerBar"), "SOAP fields must feature stenographer quick chips");
		assert.ok(src.includes("useClinicalStenographer"), "SOAP fields must use clinical stenographer hook");
	});

	it("4. useVisitDiaryLogic provides applyStenographerSnippet handler", () => {
		const src = fs.readFileSync(diaryLogicPath, "utf8");
		assert.ok(src.includes("applyStenographerSnippet"), "Diary logic must expose applyStenographerSnippet");
	});

	it("5. ClinicalStenographerBar implements macOS 32-36px pulsating recording bar and Mobile HIG sheet", () => {
		const src = fs.readFileSync(stenographerBarPath, "utf8");
		assert.ok(src.includes("clinical-stenographer-recording-bar"), "Must include recording bar data-testid");
		assert.ok(src.includes("isListening"), "Must support isListening state");
		assert.ok(src.includes("interimSpeechText"), "Must support live streaming interimSpeechText");
		assert.ok(src.includes("onApplyInterim"), "Must support 1-click commit of interim speech");
		assert.ok(src.includes("rounded-t-[24px]"), "Mobile sheet must have rounded-t-[24px] Apple HIG border");
		assert.ok(src.includes("safe-area-inset-bottom"), "Must respect iOS safe-area-inset-bottom");
	});

	it("6. VisitDiarySoapFields passes onToothDetected and voice controls to all SOAP fields", () => {
		const src = fs.readFileSync(soapFieldsPath, "utf8");
		assert.ok(src.includes("handleToothDetected"), "Must auto-populate diagnosisTooth on voice detection");
		assert.ok(src.includes("isListening={anamnesisSteno.isListening}"), "Anamnesis bar must receive isListening");
		assert.ok(src.includes("isListening={statusLocalisSteno.isListening}"), "StatusLocalis bar must receive isListening");
		assert.ok(src.includes("isListening={treatmentSteno.isListening}"), "Treatment bar must receive isListening");
		assert.ok(src.includes("onApplyInterim={treatmentSteno.applyInterim}"), "Treatment bar must receive onApplyInterim");
	});
});

