import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ClinicalStenographerEngine,
	getGlobalClinicalStenographer,
	formatClinicalSpeechToDiaryEntry,
	DEFAULT_CLINICAL_SNIPPETS,
} from "@dental/shared";
import { ClinicalStenographerBar } from "../ClinicalStenographerBar";
import { DebouncedEmkTextarea } from "../DebouncedEmkTextarea";

/**
 * 6Г Honest Runtime Tests for Clinical Stenographer Engine, Bar & DebouncedEmkTextarea.
 * Exercises real @dental/shared ClinicalStenographerEngine.expandAtCursor, speech formatting,
 * and real React SSR output of ClinicalStenographerBar / DebouncedEmkTextarea without source-grep.
 */
describe("Clinical Stenographer — Real Engine, Formatting & EMK Components", () => {
	const engine = new ClinicalStenographerEngine();

	it("1. Expands 'пхр' on Tab key into Composite Restoration protocol", () => {
		const res = engine.expandAtCursor({
			text: "пхр",
			cursorPosition: 3,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.equal(res.replacedToken, "пхр");
		assert.equal(res.snippet?.key, "пхр");
		assert.ok(
			res.nextText.includes("Препарирование кариозной полости") &&
				res.nextText.includes("светоотверждаемым нанокомпозитом"),
			"Text must match clinical protocol for пхр",
		);
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("2. Expands 'кф' on Tab key into Cofferdam protocol", () => {
		const res = engine.expandAtCursor({
			text: "кф",
			cursorPosition: 2,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.equal(
			res.nextText,
			"Изоляция операционного поля системой коффердам (платок Sanctuary, кламп Tor VM).",
		);
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("3. Expands 'энд' on Tab key into Endodontics protocol", () => {
		const res = engine.expandAtCursor({
			text: "энд",
			cursorPosition: 3,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.ok(res.nextText.includes("Апекслокация (Raypex)"));
		assert.ok(res.nextText.includes("Metapex"));
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("4. Expands 'ан_инф' on Tab key into Anesthesia protocol", () => {
		const res = engine.expandAtCursor({
			text: "ан_инф",
			cursorPosition: 6,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.ok(
			res.nextText.includes(
				"Анестезия инфильтрационная sol. Ultracaini D-S 1:200 000 — 1.7 мл.",
			),
		);
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("5. Expands 'норм' on Tab key into physiological norm protocol", () => {
		const res = engine.expandAtCursor({
			text: "норм",
			cursorPosition: 4,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "objective",
		});

		assert.equal(res.changed, true);
		assert.ok(res.nextText.includes("Слизистая оболочка полости рта бледно-розовая"));
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("6. Expands on Space key with trailing space appended for fluent continuous typing", () => {
		const res = engine.expandAtCursor({
			text: "кф",
			cursorPosition: 2,
			triggerKey: "Space",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.ok(res.nextText.endsWith(" "), "Space trigger must append a trailing space");
		assert.equal(res.nextCursorPosition, res.nextText.length);
	});

	it("7. Correctly expands snippet in the middle of a clinical diary entry without corrupting text", () => {
		const prefix = "Зуб 2.6: глубокий кариес. ";
		const suffix = " На контроле через 6 месяцев.";
		const initialText = `${prefix}пхр${suffix}`;
		const cursorAtEndOfToken = prefix.length + 3;

		const res = engine.expandAtCursor({
			text: initialText,
			cursorPosition: cursorAtEndOfToken,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "treatment",
		});

		assert.equal(res.changed, true);
		assert.ok(res.nextText.startsWith(prefix), "Prefix must remain untouched");
		assert.ok(res.nextText.endsWith(suffix), "Suffix must remain untouched");
		assert.ok(res.nextText.includes("Препарирование кариозной полости"));
	});

	it("8. Does NOT intercept non-snippet words and respects singleton instance", () => {
		const res = engine.expandAtCursor({
			text: "пациент",
			cursorPosition: 7,
			triggerKey: "Tab",
			appendSpaceOnSpaceTrigger: true,
			targetField: "all",
		});

		assert.equal(res.changed, false);
		assert.equal(res.nextText, "пациент");
		assert.equal(getGlobalClinicalStenographer(), getGlobalClinicalStenographer());
	});

	it("9. Formats voice speech snippets and renders ClinicalStenographerBar + DebouncedEmkTextarea without dev-jargon or clipping", () => {
		const formatted = formatClinicalSpeechToDiaryEntry(
			"зуб 36 глубокий кариес пломба эстелайт",
		);
		assert.equal(formatted.isToothGrammarMatch, true);
		assert.ok(formatted.detectedTeeth.includes(36));
		assert.ok(formatted.formattedText.includes("K02.1"));

		const barHtml = renderToString(
			React.createElement(ClinicalStenographerBar, {
				snippets: DEFAULT_CLINICAL_SNIPPETS.slice(0, 4),
				onSelectSnippet: () => {},
				isListening: true,
				interimSpeechText: "Зуб 36 глубокий кариес",
				onToggleVoice: () => {},
				onApplyInterim: () => {},
				onCancelVoice: () => {},
				enableVoice: true,
				targetField: "treatment",
			}),
		);
		assert.ok(barHtml.includes("Зуб 36 глубокий кариес"));
		assert.ok(!barHtml.includes("1 клик"));

		const textareaHtml = renderToString(
			React.createElement(DebouncedEmkTextarea, {
				fieldKey: "treatmentDescription",
				label: "Ход лечения",
				value: "Изоляция коффердамом",
				onCommit: () => {},
				enableStenographer: true,
				showStenographerChips: true,
				stenographerFieldTarget: "treatment",
			}),
		);
		assert.ok(textareaHtml.includes("Ход лечения"));
		assert.ok(textareaHtml.includes("Изоляция коффердамом"));
		assert.ok(!textareaHtml.includes("043/у"));
	});
});
