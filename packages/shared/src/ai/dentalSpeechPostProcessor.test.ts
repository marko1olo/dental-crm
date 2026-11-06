import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	postProcessDentalSpeech,
	correctPhoneticDentalTerms,
	DENTAL_SPEECH_CORRECTION_RULES,
} from "./dentalSpeechPostProcessor.js";

describe("dentalSpeechPostProcessor", () => {
	it("corrects basic phonetic dental typos accurately", () => {
		const raw = "поставил кофердам на 46 зуб, обработал каналы ресипрок и промыл теплым гипохлорид";
		const result = postProcessDentalSpeech(raw);

		assert.equal(result.changed, true);
		assert.ok(result.text.includes("коффердам"));
		assert.ok(result.text.includes("Reciproc Blue"));
		assert.ok(result.text.includes("гипохлорит натрия (NaOCl)"));
	});

	it("corrects orthopedics and prep techniques (Vertiprep, BOPT)", () => {
		const raw = "выполнено препарирование верти преп под коронку, техника бопт";
		const result = postProcessDentalSpeech(raw);

		assert.ok(result.text.includes("вертипреп / Vertiprep"));
		assert.ok(result.text.includes("BOPT"));
	});

	it("corrects bioceramics and cements (Biodentine, Bio-C Sealer)", () => {
		const raw = "перфорация закрыта материалом било дентин, обтурация био силер";
		const result = postProcessDentalSpeech(raw);

		assert.ok(result.text.includes("Biodentine"));
		assert.ok(result.text.includes("Bio-C Sealer"));
	});

	it("corrects composites and finishing tools (Estelite Asteria, Occlubrush)", () => {
		const raw = "реставрация эстилайт оттенок A2, полировка оклюбраш";
		const result = postProcessDentalSpeech(raw);

		assert.ok(result.text.includes("Estelite Asteria"));
		assert.ok(result.text.includes("Occlubrush"));
	});

	it("corrects endodontic instruments (апекслокатор, плаггер, эндочак)", () => {
		const raw = "рабочая длина проверена апекс локатор, конденсация плагер, активация эндо чак";
		const result = postProcessDentalSpeech(raw);

		assert.ok(result.text.includes("апекслокатор"));
		assert.ok(result.text.includes("плаггер"));
		assert.ok(result.text.includes("эндочак"));
	});

	it("preserves casing correctly for Russian words", () => {
		const titleCase = "Кофердам наложен.";
		const titleResult = postProcessDentalSpeech(titleCase);
		assert.ok(titleResult.text.startsWith("Коффердам"));

		const upperCase = "ИСПОЛЬЗОВАН КОФЕРДАМ";
		const upperResult = postProcessDentalSpeech(upperCase);
		assert.ok(upperResult.text.includes("КОФФЕРДАМ"));
	});

	it("does not break standard Russian words containing partial matches", () => {
		// "кофе" should not become "коффердам"
		const raw = "пациент пил кофе перед приемом";
		const result = postProcessDentalSpeech(raw);
		assert.equal(result.changed, false);
		assert.equal(result.text, raw);
	});

	it("handles empty string, whitespace and null/undefined gracefully without throwing", () => {
		assert.equal(postProcessDentalSpeech("").text, "");
		assert.equal(postProcessDentalSpeech("   ").text, "");
		assert.equal(postProcessDentalSpeech(null as any).text, "");
		assert.equal(postProcessDentalSpeech(undefined as any).text, "");
	});

	it("correctPhoneticDentalTerms helper returns clean string directly", () => {
		const text = correctPhoneticDentalTerms("кофердам и плагер");
		assert.equal(text, "коффердам и плаггер");
	});
});
