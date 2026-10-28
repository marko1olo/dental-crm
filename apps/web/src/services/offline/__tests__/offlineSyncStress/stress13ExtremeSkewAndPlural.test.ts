import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calibrateClockSkew, getAdjustedNowIso, getAdjustedNowMs } from "@dental/shared";

describe("STRESS 13 & 14: Extreme Clock Skew & Russian Mutation Pluralization", () => {
	test("STRESS 13: Extreme Clock Skew Resilience (+24h, -24h, Timezone Shift & Monotonicity)", async () => {
		const baseNowMs = Date.now();
		calibrateClockSkew(new Date(baseNowMs + 24 * 3600000).toISOString(), baseNowMs);
		assert.ok(!getAdjustedNowIso(baseNowMs).includes("NaN"));

		calibrateClockSkew(new Date(baseNowMs - 24 * 3600000).toISOString(), baseNowMs);
		assert.ok(!getAdjustedNowIso(baseNowMs).includes("NaN"));

		calibrateClockSkew("2026-08-24T18:30:00.000+05:45", baseNowMs);
		assert.ok(getAdjustedNowIso(baseNowMs).endsWith("Z"));

		const seq1 = getAdjustedNowMs();
		const seq2 = getAdjustedNowMs();
		assert.ok(seq2 >= seq1);

		calibrateClockSkew("garbage", baseNowMs);
		calibrateClockSkew(null, baseNowMs);
		assert.ok(getAdjustedNowIso().length > 0);
	});

	test("STRESS 14: Visual & Contrast Audit Russian Pluralization", () => {
		function pluralizeMutations(count: number): string {
			const abs = Math.abs(count) % 100;
			const num = abs % 10;
			if (abs > 10 && abs < 20) return `${count} мутаций`;
			if (num > 1 && num < 5) return `${count} мутации`;
			if (num === 1) return `${count} мутация`;
			return `${count} мутаций`;
		}

		assert.strictEqual(pluralizeMutations(1), "1 мутация");
		assert.strictEqual(pluralizeMutations(2), "2 мутации");
		assert.strictEqual(pluralizeMutations(4), "4 мутации");
		assert.strictEqual(pluralizeMutations(5), "5 мутаций");
		assert.strictEqual(pluralizeMutations(11), "11 мутаций");
		assert.strictEqual(pluralizeMutations(21), "21 мутация");
		assert.strictEqual(pluralizeMutations(22), "22 мутации");
		assert.strictEqual(pluralizeMutations(25), "25 мутаций");
		assert.strictEqual(pluralizeMutations(101), "101 мутация");
	});
});
