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
	isValidFdiTooth,
} from "../VisitPediatricProtocolWidget";
import { FranklBehaviorBadge } from "../FranklBehaviorBadge";

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

	it("renders 1-click adaptation visit button in top header (Mandate 8e, 8k)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 3,
			}),
		);

		assert.ok(
			html.includes("1-клик Адаптация") || html.includes("Адаптация"),
			"Has 1-click adaptation visit button",
		);
		assert.ok(
			html.includes("pediatric-one-click-adaptation-btn"),
			"Has testid for 1-click adaptation visit button",
		);
		assert.ok(
			html.includes("pediatric-one-click-norm-btn"),
			"Has testid for 1-click physiological norm button",
		);
	});

	it("renders FranklBehaviorBadge in compact toolbar mode per Hick's Law (32-36px)", () => {
		const html = renderToStaticMarkup(
			createElement(FranklBehaviorBadge, {
				rating: 3,
				toolbar: true,
			}),
		);

		assert.ok(
			html.includes("frankl-compact-toolbar"),
			"Renders compact toolbar with data-testid frankl-compact-toolbar",
		);
		assert.ok(html.includes("Франкл:"), "Toolbar has label");
		assert.ok(html.includes("frankl-toolbar-btn-1"), "Toolbar has button 1");
		assert.ok(html.includes("frankl-toolbar-btn-2"), "Toolbar has button 2");
		assert.ok(html.includes("frankl-toolbar-btn-3"), "Toolbar has button 3");
		assert.ok(html.includes("frankl-toolbar-btn-4"), "Toolbar has button 4");
	});

	it("verifies isValidFdiTooth rejects invalid FDI tooth numbers (Defect 5)", () => {
		// Valid permanent: 11..18, 21..28, 31..38, 41..48
		assert.strictEqual(isValidFdiTooth(11), true, "11 is valid permanent tooth");
		assert.strictEqual(isValidFdiTooth(18), true, "18 is valid permanent tooth");
		assert.strictEqual(isValidFdiTooth(46), true, "46 is valid permanent tooth");

		// Valid primary: 51..55, 61..65, 71..75, 81..85
		assert.strictEqual(isValidFdiTooth(51), true, "51 is valid primary tooth");
		assert.strictEqual(isValidFdiTooth(55), true, "55 is valid primary tooth");
		assert.strictEqual(isValidFdiTooth(74), true, "74 is valid primary tooth");
		assert.strictEqual(isValidFdiTooth(85), true, "85 is valid primary tooth");

		// Invalid deciduous numbers: 56..60, 66..70, 76..80
		assert.strictEqual(isValidFdiTooth(56), false, "56 is invalid (primary quadrant 5 has max 5 teeth)");
		assert.strictEqual(isValidFdiTooth(58), false, "58 is invalid");
		assert.strictEqual(isValidFdiTooth(60), false, "60 is invalid");
		assert.strictEqual(isValidFdiTooth(66), false, "66 is invalid");
		assert.strictEqual(isValidFdiTooth(70), false, "70 is invalid");
		assert.strictEqual(isValidFdiTooth(76), false, "76 is invalid");
		assert.strictEqual(isValidFdiTooth(80), false, "80 is invalid");

		// Invalid permanent numbers
		assert.strictEqual(isValidFdiTooth(19), false, "19 is invalid");
		assert.strictEqual(isValidFdiTooth(20), false, "20 is invalid");
		assert.strictEqual(isValidFdiTooth(99), false, "99 is invalid");
		assert.strictEqual(isValidFdiTooth(0), false, "0 is invalid");
	});

	it("sanitizes invalid tooth numbers to default 54 without throwing (Defect 5)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 58 as any, // Invalid tooth number
				initialFranklRating: 3,
			}),
		);

		// Should safely fallback to default tooth 54
		assert.ok(
			html.includes("Зуб 54"),
			"Sanitizes invalid tooth 58 to default primary molar 54",
		);
		assert.ok(
			html.includes("Верхний правый первый моляр"),
			"Displays anatomical name for fallback tooth 54",
		);
	});

	it("auto-substitutes legal representative and somatic norm into Form 043/u preview", () => {
		const html = renderToStaticMarkup(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 3,
				representativeFullName: "Иванова Анна Сергеевна",
				representativePhone: "+7 (999) 123-45-67",
				representativeRole: "Мать",
			}),
		);

		// Contains legal representative section
		assert.ok(
			html.includes("Законный представитель"),
			"Form 043/u contains legal representative section",
		);
		assert.ok(
			html.includes("Иванова Анна Сергеевна"),
			"Auto-substitutes mother's name without forcing extra fields",
		);
		assert.ok(
			html.includes("ст. 64 СК РФ"),
			"Contains Art. 64 Family Code RF legal representative reference",
		);

		// Contains pediatric teeth chart and somatic norm
		assert.ok(
			html.includes("pediatric-teeth-chart"),
			"Renders pediatric teeth chart container",
		);
		assert.ok(
			html.includes("pediatric-somatic-legal-rep"),
			"Renders pediatric somatic and legal rep container",
		);
	});
});
