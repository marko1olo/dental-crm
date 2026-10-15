import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatClinicalSpeechToDiaryEntry } from "../clinicalVoiceSpeechFormatter.js";

describe("clinicalVoiceSpeechFormatter (Tooth Grammar & Chairside Voice Protocol)", () => {
	it("formats 'зуб три шесть глубокий кариес дно плотное пломба эстет икс' into canonical clinical entry", () => {
		const raw = "зуб три шесть глубокий кариес дно плотное пломба эстет икс";
		const res = formatClinicalSpeechToDiaryEntry(raw);

		assert.equal(res.isToothGrammarMatch, true);
		assert.deepEqual(res.detectedTeeth, [36]);
		assert.ok(res.formattedText.includes("Зуб 36:"));
		assert.ok(res.formattedText.includes("Кариес дентина (K02.1)"));
		assert.ok(res.formattedText.includes("дно плотное"));
		assert.ok(res.formattedText.includes("Поставлена светоотверждаемая пломба Esthet-X"));
	});

	it("formats tooth with surfaces 'шестнадцать средний кариес мод пломба филтек'", () => {
		const raw = "шестнадцать средний кариес мод пломба филтек";
		const res = formatClinicalSpeechToDiaryEntry(raw);

		assert.equal(res.isToothGrammarMatch, true);
		assert.deepEqual(res.detectedTeeth, [16]);
		assert.ok(res.formattedText.includes("Зуб 16:"));
		assert.ok(res.formattedText.includes("K02.1"));
		assert.ok(res.formattedText.includes("медиально-окклюзионно-дистальной"));
		assert.ok(res.formattedText.includes("Filtek Supreme"));
	});

	it("formats acute pulpitis with anesthesia 'зуб сорок семь острый пульпит анестезия убистезин коффердам'", () => {
		const raw = "зуб сорок семь острый пульпит анестезия убистезин коффердам";
		const res = formatClinicalSpeechToDiaryEntry(raw);

		assert.equal(res.isToothGrammarMatch, true);
		assert.deepEqual(res.detectedTeeth, [47]);
		assert.ok(res.formattedText.includes("Зуб 47:"));
		assert.ok(res.formattedText.includes("Острый пульпит (K04.0)"));
		assert.ok(res.formattedText.includes("Ubistesin"));
		assert.ok(res.formattedText.includes("коффердам"));
	});

	it("handles non-tooth general speech with punctuation and capitalization", () => {
		const raw = "пациент жалоб не предъявляет слизистая оболочка бледно-розовая";
		const res = formatClinicalSpeechToDiaryEntry(raw);

		assert.equal(res.isToothGrammarMatch, false);
		assert.ok(res.formattedText.startsWith("Пациент"));
		assert.ok(res.formattedText.endsWith("."));
	});
});
