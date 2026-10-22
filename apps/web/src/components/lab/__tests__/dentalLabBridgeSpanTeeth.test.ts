import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBridgeSpanTeeth } from "../DentalLabFdiOdontogramPicker";

describe("dentalLabBridgeSpanTeeth — Bridge Span Expansion Algorithm", () => {
	it("расширяет мостовидный пролет в пределах одного квадранта В/Ч (14 и 16 -> 14, 15, 16)", () => {
		const abutments = [14, 16];
		const expanded = getBridgeSpanTeeth(abutments);
		assert.deepStrictEqual(expanded, [14, 15, 16]);
	});

	it("расширяет мостовидный пролет через центральную линию В/Ч (12 и 22 -> 11, 12, 21, 22)", () => {
		const abutments = [12, 22];
		const expanded = getBridgeSpanTeeth(abutments);
		assert.deepStrictEqual(expanded, [11, 12, 21, 22]);
	});

	it("расширяет мостовидный пролет на нижней челюсти (45 и 47 -> 45, 46, 47)", () => {
		const abutments = [45, 47];
		const expanded = getBridgeSpanTeeth(abutments);
		assert.deepStrictEqual(expanded, [45, 46, 47]);
	});

	it("расширяет мостовидный пролет через центральную линию Н/Ч (42 и 32 -> 31, 32, 41, 42)", () => {
		const abutments = [42, 32];
		const expanded = getBridgeSpanTeeth(abutments);
		assert.deepStrictEqual(expanded, [31, 32, 41, 42]);
	});

	it("не изменяет одиночный зуб и обрабатывает пустой массив", () => {
		assert.deepStrictEqual(getBridgeSpanTeeth([16]), [16]);
		assert.deepStrictEqual(getBridgeSpanTeeth([]), []);
	});

	it("обрабатывает одновременные мосты на обеих челюстях (14, 16 и 35, 37)", () => {
		const abutments = [14, 16, 35, 37];
		const expanded = getBridgeSpanTeeth(abutments);
		assert.deepStrictEqual(expanded, [14, 15, 16, 35, 36, 37]);
	});
});
