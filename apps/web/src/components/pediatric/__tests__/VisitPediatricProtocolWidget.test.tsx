import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_PROTOCOL_PRESETS,
	PEDIATRIC_SURFACE_PRESETS,
	QUICK_PEDIATRIC_TEETH,
	VisitPediatricProtocolWidget,
} from "../VisitPediatricProtocolWidget";

describe("VisitPediatricProtocolWidget (Chairside 30-Second Pediatric Dental Workspace)", () => {
	it("renders pediatric protocol widget for primary upper molar 54 with Caries preset", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 3,
			}),
		);

		// 1. Шапка и номер зуба
		assert.ok(
			html.includes("Зуб 54"),
			"Header indicates active primary tooth 54",
		);
		assert.ok(
			html.includes("Верхний правый первый моляр"),
			"Displays anatomical name for tooth 54",
		);
		assert.ok(
			html.includes("Детский приём у кресла"),
			"Header indicates pediatric chairside title",
		);

		// 2. Экспресс-селектор шкалы Франкла (1..4)
		assert.ok(
			html.includes("Шкала поведения Франкла"),
			"Contains Frankl scale title",
		);
		assert.ok(html.includes("Рейтинг --"), "Contains Frankl rating 1 (--)");
		assert.ok(html.includes("Рейтинг -"), "Contains Frankl rating 2 (-)");
		assert.ok(html.includes("Рейтинг +"), "Contains Frankl rating 3 (+)");
		assert.ok(html.includes("Рейтинг ++"), "Contains Frankl rating 4 (++)");
		assert.ok(
			html.includes("Франкл +"),
			"Displays active Frankl 3 (+) indicator",
		);

		// 3. 5 канонических 1-клик протоколов по Форме 043/у и Номенклатуре 804н
		// а) Кариес временного зуба (K02.1 / A16.07.002.001)
		assert.ok(
			html.includes("Кариес (СИЦ / SDR)"),
			"Has 1-click caries preset button",
		);
		assert.ok(
			html.includes("K02.1"),
			"Contains ICD-10 K02.1 for primary tooth caries",
		);
		assert.ok(
			html.includes("A16.07.002.001"),
			"Contains 804n code A16.07.002.001",
		);

		// б) Витальная пульпотомия временного зуба (K04.0 / A16.07.030.001)
		assert.ok(
			html.includes("Пульпотомия (Pulpotec)"),
			"Has 1-click pulpotomy preset button",
		);

		// в) Серебрение / глубокое фторирование (K02.0 / A11.07.012)
		assert.ok(
			html.includes("Серебрение / Фтор"),
			"Has 1-click silvering preset button",
		);

		// г) Герметизация фиссур (K02.0 / A16.07.057)
		assert.ok(
			html.includes("Герметизация (Fissurit)"),
			"Has 1-click fissure sealing preset button",
		);

		// д) Удаление молочного зуба при физиологической смене корней (K08.8 / A16.07.001.001)
		assert.ok(
			html.includes("Удаление (смена корней)"),
			"Has 1-click extraction preset button",
		);

		// е) Стандартная защитная коронка (K02.1 / A16.07.004.001)
		assert.ok(
			html.includes("Коронка (Hall / SSC)"),
			"Has 1-click standard crown SSC preset button",
		);
		assert.ok(
			html.includes("A16.07.004.001"),
			"Contains 804n code A16.07.004.001 for standard crown",
		);

		// 3.1 Ортодонтический статус первичного осмотра (норма СтАР)
		assert.ok(
			html.includes("Уздечки губ и языка"),
			"Contains frenulum examination check",
		);
		assert.ok(
			html.includes("Носовое дыхание"),
			"Contains nasal breathing check",
		);
		assert.ok(
			html.includes("Вредные привычки"),
			"Contains harmful habits check",
		);

		// 4. Поверхности зуба в 1 клик (комбо-чипы)
		assert.ok(html.includes("[MOD]"), "Has [MOD] combo chip");
		assert.ok(html.includes("[MO]"), "Has [MO] combo chip");
		assert.ok(html.includes("[OD]"), "Has [OD] combo chip");
		assert.ok(html.includes("[O]"), "Has [O] combo chip");
		assert.ok(html.includes("[V]"), "Has [V] combo chip");
		assert.ok(html.includes("[L/P]"), "Has [L/P] combo chip");

		// 5. Материалы кариеса
		assert.ok(html.includes("СИЦ Fuji IX"), "Has Fuji IX material option");
		assert.ok(
			html.includes("Twinky Star"),
			"Has Twinky Star colored compomer option",
		);
		assert.ok(html.includes("SDR Flow"), "Has SDR Flow material option");

		// 6. 1-клик кнопки действий (Мандат 8e: автономия, кнопки всегда активны)
		assert.ok(
			html.includes("Внести в 043/у"),
			"Has primary 1-click Form 043/u action button",
		);
		assert.ok(
			html.includes("В смету"),
			"Has 1-click invoice / estimate service button",
		);
		assert.ok(
			html.includes("Памятка родителям"),
			"Has 1-click parent memo modal trigger button",
		);

		// 7. Тач-таргеты >= 48px (Мандат 8d)
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("min-h-[52px]"),
			"Controls meet Mandate 8d touch target requirements (>= 48px)",
		);

		// 8. Ноль эмодзи (Мандат 8d, 7 смертных грехов UI: только векторные иконки Lucide)
		const emojiRegex =
			/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(
			!emojiRegex.test(html),
			"HTML markup must contain ZERO emojis (strictly Lucide icons)",
		);
	});

	it("renders correctly with Frankl 1 (--) Definitely Negative rating", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 51,
				initialFranklRating: 1,
			}),
		);

		assert.ok(html.includes("Зуб 51"), "Header indicates tooth 51");
		assert.ok(
			html.includes("Верхний правый центральный резец"),
			"Displays anatomical name for tooth 51",
		);
		assert.ok(
			html.includes("Франкл --"),
			"Displays active Frankl 1 (--) indicator",
		);
		assert.ok(
			html.includes("Tell-Show-Do"),
			"Displays recommended clinical adaptation tactic",
		);
	});

	it("renders correctly for permanent molar 16 (fissure sealing candidate)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 16,
				initialFranklRating: 4,
			}),
		);

		assert.ok(html.includes("Зуб 16"), "Header indicates permanent molar 16");
		assert.ok(
			html.includes("Верхний правый первый постоянный моляр"),
			"Displays anatomical name for tooth 16",
		);
		assert.ok(
			html.includes("Франкл ++"),
			"Displays active Frankl 4 (++) indicator",
		);
	});

	it("verifies PEDIATRIC_PROTOCOL_PRESETS metadata completeness (Zero TODOs, 100% typed)", () => {
		assert.strictEqual(
			PEDIATRIC_PROTOCOL_PRESETS.length,
			6,
			"Exactly 6 canonical clinical presets",
		);

		const ids = PEDIATRIC_PROTOCOL_PRESETS.map((p) => p.id);
		assert.deepStrictEqual(
			ids,
			[
				"caries_primary",
				"pulpotomy_primary",
				"silvering_deep_fluoridation",
				"fissure_sealing",
				"extraction_primary_exfoliation",
				"standard_crown",
			],
			"All 6 required preset IDs are present in exact order",
		);

		for (const preset of PEDIATRIC_PROTOCOL_PRESETS) {
			assert.ok(
				preset.titleRu.length > 0,
				`${preset.id} has non-empty titleRu`,
			);
			assert.ok(
				preset.diagnosisIcd10.length > 0,
				`${preset.id} has ICD-10 diagnosis code`,
			);
			assert.ok(
				preset.serviceCode804n.startsWith("A"),
				`${preset.id} has Order 804n code starting with A`,
			);
			assert.ok(preset.materials.length > 0, `${preset.id} has materials list`);
			assert.ok(
				preset.defaultMaterial.length > 0,
				`${preset.id} has default material`,
			);
			assert.ok(
				preset.defaultToothFindingState.length > 0,
				`${preset.id} has default tooth finding state`,
			);
		}
	});

	it("verifies FRANKL_EXPRESS_ITEMS completeness (1..4 with symbols and tactics)", () => {
		assert.strictEqual(
			FRANKL_EXPRESS_ITEMS.length,
			4,
			"Exactly 4 Frankl rating levels",
		);

		const ratings = FRANKL_EXPRESS_ITEMS.map((f) => f.rating);
		assert.deepStrictEqual(ratings, [1, 2, 3, 4], "Ratings cover 1, 2, 3, 4");

		const symbols = FRANKL_EXPRESS_ITEMS.map((f) => f.symbol);
		assert.deepStrictEqual(
			symbols,
			["--", "-", "+", "++"],
			"Symbols match canonical Frankl scale",
		);

		for (const item of FRANKL_EXPRESS_ITEMS) {
			assert.ok(
				item.clinicalTacticRu.length > 0,
				`Rating ${item.rating} has clinical tactic`,
			);
			assert.ok(
				item.descriptionRu.length > 0,
				`Rating ${item.rating} has description`,
			);
		}
	});

	it("verifies PEDIATRIC_SURFACE_PRESETS and QUICK_PEDIATRIC_TEETH", () => {
		assert.ok(
			PEDIATRIC_SURFACE_PRESETS.length >= 5,
			"Has all common surface combos",
		);
		assert.ok(QUICK_PEDIATRIC_TEETH.includes(54), "Contains primary molar 54");
		assert.ok(QUICK_PEDIATRIC_TEETH.includes(85), "Contains primary molar 85");
		assert.ok(
			QUICK_PEDIATRIC_TEETH.includes(16),
			"Contains first permanent molar 16",
		);
	});
});
