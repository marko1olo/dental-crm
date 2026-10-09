import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARIES_PRESETS,
	CROWN_PRESETS,
	IMPLANT_PRESETS,
	TelegramInteractiveTriageService,
	WHITENING_PRESETS,
	calculateImplantBudget,
	findCariesPreset,
	findCrownPreset,
	findImplantPreset,
	findWhiteningPreset,
	formatRubles,
	presentAestheticScreen,
	presentBrokenToothScreen,
	presentCalculatorRootScreen,
	presentCariesCalculatorScreen,
	presentCitoBookScreen,
	presentCrownCalculatorScreen,
	presentEmergencyScreen,
	presentGumsScreen,
	presentImplantCrownSelectionScreen,
	presentImplantResultScreen,
	presentImplantSystemSelectionScreen,
	presentKidsScreen,
	presentRootTriageScreen,
	presentWhiteningCalculatorScreen,
} from "../TelegramInteractiveTriageService.js";
import {
	buildEmergencyKeyboard,
	buildImplantCrownSelectionKeyboard,
	buildImplantSelectionKeyboard,
	buildRootTriageKeyboard,
} from "../triageService/triageKeyboardBuilder.js";

describe("Triage Service Modular DAG Suite", () => {
	describe("Layer 0: Presets & Lookups", () => {
		it("provides standard implant presets with verified warranties", () => {
			assert.ok(IMPLANT_PRESETS.length >= 3);
			const osstem = findImplantPreset("osstem");
			assert.equal(osstem.brand, "Osstem");
			assert.equal(osstem.country, "Южная Корея");
			assert.equal(osstem.priceRub, 35000);

			const straumann = findImplantPreset("straumann");
			assert.equal(straumann.brand, "Straumann SLA");
			assert.equal(straumann.country, "Швейцария");
			assert.equal(straumann.priceRub, 65000);
		});

		it("provides crown presets with aesthetic rating", () => {
			assert.ok(CROWN_PRESETS.length >= 3);
			const zirconia = findCrownPreset("zirconia");
			assert.equal(zirconia.aestheticRating, 5);
			assert.equal(zirconia.priceRub, 32000);
		});

		it("provides caries and whitening presets", () => {
			assert.ok(CARIES_PRESETS.length >= 3);
			assert.ok(WHITENING_PRESETS.length >= 3);
			const caries = findCariesPreset("deep");
			assert.ok(caries);
			assert.equal(caries.priceRub, 7200);

			const whitening = findWhiteningPreset("zoom4");
			assert.ok(whitening);
			assert.equal(whitening.priceRub, 34000);
		});
	});

	describe("Layer 1: Keyboard Builders", () => {
		it("builds root triage keyboard with expected branches", () => {
			const kb = buildRootTriageKeyboard();
			assert.ok(kb.inline_keyboard.length >= 7);
			const callbacks = kb.inline_keyboard.flat().map((b) => b.callback_data);
			assert.ok(callbacks.includes("triage:emergency"));
			assert.ok(callbacks.includes("triage:broken_tooth"));
			assert.ok(callbacks.includes("triage:calc:root"));
			assert.ok(callbacks.includes("triage:human_request"));
		});

		it("builds emergency CITO keyboard with safety routes", () => {
			const kb = buildEmergencyKeyboard();
			const callbacks = kb.inline_keyboard.flat().map((b) => b.callback_data);
			assert.ok(callbacks.includes("triage:cito_book"));
			assert.ok(callbacks.includes("triage:human_request"));
			assert.ok(callbacks.includes("triage:root"));
		});

		it("builds implant selection keyboard with all presets", () => {
			const kb = buildImplantSelectionKeyboard();
			assert.ok(kb.inline_keyboard.length >= IMPLANT_PRESETS.length);
		});

		it("builds implant crown selection keyboard with chosen implant code", () => {
			const kb = buildImplantCrownSelectionKeyboard("osstem");
			const callbacks = kb.inline_keyboard.flat().map((b) => b.callback_data);
			assert.ok(callbacks.some((cb) => cb?.startsWith("triage:calc:res:imp:osstem:")));
		});
	});

	describe("Layer 2: Cost Calculator & Screen Presenters", () => {
		it("calculates turnkey implant budget combining surgical and orthopedic phases", () => {
			const budget = calculateImplantBudget("straumann", "emax");
			assert.equal(budget.implant.brand, "Straumann SLA");
			assert.equal(budget.crown.name, "Керамика E.max (Германия)");
			assert.equal(budget.surgicalRub, 65000);
			assert.equal(budget.orthopedicRub, 35000);
			assert.equal(budget.totalRub, 100000);
			assert.equal(formatRubles(budget.totalRub), "100 000 ₽");
		});

		it("presents root triage screen with clinical title and keyboard", () => {
			const screen = presentRootTriageScreen();
			assert.ok(screen.text.includes("Клинический экспресс-опросник DENTE"));
			assert.ok(screen.replyMarkup.inline_keyboard.length >= 7);
		});

		it("presents emergency CITO screen with mandatory NO HEAT invariant", () => {
			const screen = presentEmergencyScreen();
			assert.ok(screen.text.includes("КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ"));
			assert.ok(screen.text.includes("НПВП"));
			assert.ok(screen.replyMarkup.inline_keyboard.length >= 2);
		});

		it("presents broken tooth scenarios correctly", () => {
			const general = presentBrokenToothScreen();
			assert.ok(general.text.includes("Откололся зуб"));

			const sharp = presentBrokenToothScreen("sharp");
			assert.ok(sharp.text.includes("Острый край травмирует слизистую"));

			const pain = presentBrokenToothScreen("pain");
			assert.ok(pain.text.includes("Боль при накусывании"));
		});

		it("presents aesthetic, gums, kids and calculator screens", () => {
			assert.ok(presentGumsScreen().text.includes("Здоровье десен"));
			assert.ok(presentAestheticScreen().text.includes("Эстетическая стоматология"));
			assert.ok(presentKidsScreen().text.includes("подготовка ребенка"));
			assert.ok(presentCalculatorRootScreen().text.includes("Калькулятор стоимости"));
			assert.ok(presentImplantSystemSelectionScreen().text.includes("Шаг 1 из 2"));
			assert.ok(presentImplantCrownSelectionScreen("dentium").text.includes("Шаг 2 из 2"));
			assert.ok(presentImplantResultScreen("dentium", "zirconia").text.includes("Итоговая смета"));
			assert.ok(presentCrownCalculatorScreen().text.includes("Коронки на зубы"));
			assert.ok(presentCariesCalculatorScreen().text.includes("Лечение кариеса"));
			assert.ok(presentWhiteningCalculatorScreen().text.includes("отбеливание"));
			assert.ok(presentCitoBookScreen().text.includes("CITO"));
		});
	});

	describe("Layer 3: Facade Delegation Parity", () => {
		it("delegates static methods 1:1 to presenters", () => {
			const root = TelegramInteractiveTriageService.getRootTriageScreen();
			assert.equal(root.text, presentRootTriageScreen().text);

			const em = TelegramInteractiveTriageService.getEmergencyScreen();
			assert.equal(em.text, presentEmergencyScreen().text);

			const calc = TelegramInteractiveTriageService.getCalculatorRootScreen();
			assert.equal(calc.text, presentCalculatorRootScreen().text);

			const impStep1 = TelegramInteractiveTriageService.getImplantSystemSelectionScreen();
			assert.equal(impStep1.text, presentImplantSystemSelectionScreen().text);

			const impStep2 = TelegramInteractiveTriageService.getImplantCrownSelectionScreen("osstem");
			assert.equal(impStep2.text, presentImplantCrownSelectionScreen("osstem").text);

			const impRes = TelegramInteractiveTriageService.getImplantResultScreen("osstem", "zirconia");
			assert.equal(impRes.text, presentImplantResultScreen("osstem", "zirconia").text);
		});
	});
});
