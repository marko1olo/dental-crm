import assert from "node:assert/strict";
import type { TreatmentPlanTier } from "../../types";

export function expect(actual: unknown) {
	const num = typeof actual === "number" ? actual : Number(actual);
	return {
		toBe(expected: unknown) {
			assert.equal(actual, expected);
		},
		toEqual(expected: unknown) {
			assert.deepEqual(actual, expected);
		},
		toBeLessThanOrEqual(n: number) {
			assert.ok(num <= n, `Expected ${actual} <= ${n}`);
		},
		toBeGreaterThan(n: number) {
			assert.ok(num > n, `Expected ${actual} > ${n}`);
		},
		toBeTruthy() {
			assert.ok(Boolean(actual), `Expected truthy, got ${actual}`);
		},
		toBeFalsy() {
			assert.ok(!actual, `Expected falsy, got ${actual}`);
		},
		not: {
			toBeNull() {
				assert.notEqual(actual, null);
				assert.notEqual(actual, undefined);
			},
			toContain(str: string) {
				assert.ok(!String(actual).includes(str), `Expected not to contain ${str}`);
			},
			toMatch(re: RegExp) {
				assert.ok(!re.test(String(actual)), `Expected not to match ${re}`);
			},
		},
		toBeNull() {
			assert.equal(actual, null);
		},
		toContain(str: string) {
			assert.ok(String(actual).includes(str), `Expected to contain ${str}`);
		},
		toHaveBeenCalled() {
			const mock = actual as { mock?: { calls: unknown[][] } };
			assert.ok(Boolean(mock.mock && mock.mock.calls.length > 0), "Expected mock to have been called");
		},
		toHaveBeenCalledTimes(n: number) {
			const mock = actual as { mock?: { calls: unknown[][] } };
			assert.equal(mock.mock?.calls.length, n);
		},
	};
}

export const vi = {
	fn() {
		const calls: unknown[][] = [];
		const mockFn = (...args: unknown[]) => {
			calls.push(args);
		};
		mockFn.mock = { calls };
		return mockFn;
	},
};

export const sampleSignatureTier: TreatmentPlanTier = {
	tierId: "standard",
	title: "Комплексный стандартный план",
	subtitle: "Оптимальный клинический протокол лечения",
	badge: "Рекомендуемый",
	badgeClass: "badge-teal",
	borderClass: "border-teal",
	isRecommended: true,
	totalRub: 125000,
	totalKopecks: 12500000,
	durationWeeks: 4,
	durationVisits: 5,
	warrantyYears: 3,
	materialsHeadline: "Премиальные наногибридные композиты",
	materialsList: ["Filtek Supreme XTE", "Gradia Direct"],
	keyAdvantages: ["Долговечность", "Высокая эстетика", "Гарантия 3 года"],
	stages: [],
	itemsCount: 4,
	ndflRefundRub: 16250,
	priceWithNdflRefundRub: 108750,
	monthlyInstallment12Rub: 10416,
};
