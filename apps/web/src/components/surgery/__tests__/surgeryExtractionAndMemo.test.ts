/**
 * surgeryExtractionAndMemo.test.ts — Тесты клинических пресетов экстракции и памятки пациенту (Мандаты 8e, 8k, 8x).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EXTRACTION_804N_CODES,
	EXTRACTION_COMPLEXITY_OPTIONS,
	SURGICAL_HEMOSTASIS_OPTIONS,
	buildStandardExtractionProtocolText,
	buildPostExtractionMemoText,
	SURGICAL_OPERATION_NORMS,
} from "../surgeryProtocols";

describe("Surgery Extraction Presets & Post-Op Patient Memo", () => {
	it("1. Mandate 8e: 804n Extraction codes & 1-click complexity presets", () => {
		assert.equal(EXTRACTION_804N_CODES.SIMPLE, "A16.07.001");
		assert.equal(EXTRACTION_804N_CODES.COMPLEX_SEPARATION, "A16.07.001.001");
		assert.equal(EXTRACTION_804N_CODES.IMPACTED_DYSTOPIC, "A16.07.001.002");
		assert.equal(EXTRACTION_804N_CODES.CURETTAGE, "A16.07.026");
		assert.equal(EXTRACTION_804N_CODES.SUTURE_VICRYL, "A16.07.097");

		assert.equal(EXTRACTION_COMPLEXITY_OPTIONS.length, 3);
		assert.ok(EXTRACTION_COMPLEXITY_OPTIONS.find((o) => o.id === "simple"));
		assert.ok(EXTRACTION_COMPLEXITY_OPTIONS.find((o) => o.id === "complex"));
		assert.ok(EXTRACTION_COMPLEXITY_OPTIONS.find((o) => o.id === "impacted_dystopic"));
	});

	it("2. Mandate 8e: 1-click hemostasis options & protocol generation", () => {
		const hemoIds = SURGICAL_HEMOSTASIS_OPTIONS.map((h) => h.id);
		assert.ok(hemoIds.includes("alvogyl"));
		assert.ok(hemoIds.includes("hemostatic_sponge"));
		assert.ok(hemoIds.includes("vicryl_suture"));
		assert.ok(hemoIds.includes("tampon"));

		const text = buildStandardExtractionProtocolText({
			toothFdi: 36,
			complexity: "simple",
			hemostasis: ["alvogyl", "tampon"],
		});
		assert.ok(text.includes("зуба FDI #36"));
		assert.ok(text.includes("Альвожил"));
		assert.ok(text.includes("давящий марлевый тампон на 20 минут"));
	});

	it("3. Mandate 8k: 1-click patient post-op memo for messengers has ZERO emojis", () => {
		const memo = buildPostExtractionMemoText({
			patientName: "Сидорова Анна",
			toothFdi: 38,
			doctorName: "Др. Иванов",
			complexity: "complex",
			hasSutures: true,
			sutureRemovalDays: 8,
			clinicPhone: "+7 (495) 123-45-67",
		});

		assert.ok(memo.includes("ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА (зуб #38)"));
		assert.ok(memo.includes("Сидорова Анна"));
		assert.ok(memo.includes("МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут"));
		assert.ok(memo.includes("ХОЛОД"));
		assert.ok(memo.includes("НЕ ГРЕТЬ"));
		assert.ok(memo.includes("НЕ ПОЛОСКАТЬ"));
		assert.ok(memo.includes("ШВЫ: Наложены швы. Снятие швов через 8 дней"));
		assert.ok(memo.includes("+7 (495) 123-45-67"));

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(memo), false, "Post-op memo must strictly have zero emojis");
	});

	it("4. Mandate 8i: Outpatient Domain Sovereignty free of hospital bloat", () => {
		const forbidden = ["лапаротом", "полостн", "трансфузи", "интубаци", "общий наркоз", "паллиатив", "стационар"];
		for (const norm of SURGICAL_OPERATION_NORMS) {
			const full = `${norm.title} ${norm.standardProtocolTextRu} ${norm.anesthesiaDefaultRu}`.toLowerCase();
			for (const word of forbidden) {
				assert.equal(full.includes(word), false, `Forbidden word ${word} in ${norm.id}`);
			}
		}
	});

	it("5. Zero emojis in all surgical protocol texts (Deadly Sin #7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		for (const norm of SURGICAL_OPERATION_NORMS) {
			assert.equal(emojiRegex.test(norm.standardProtocolTextRu), false);
			assert.equal(emojiRegex.test(norm.title), false);
			assert.equal(emojiRegex.test(norm.postOpRecommendationsRu), false);
		}
	});
});
