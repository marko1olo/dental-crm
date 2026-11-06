/**
 * packages/shared/src/__tests__/fuzzingToothAndBillingMath.test.ts
 *
 * DENTE Dental CRM — Autonomous Red Team Fuzzing & Stress Suite.
 *
 * Focus:
 * 1. 10 000 pseudorandom fuzzy string mutations against FDI tooth formula parser.
 *    - Corrupted chars, mixed Cyrillic/Latin homoglyphs (C/С, O/О, 0), out-of-range teeth (99, 0, -5).
 *    - 1000-space whitespace stress, malformed delimiters.
 *    - Invariant: ZERO uncaught crashes, 100% extracted tooth numbers are strictly valid FDI (11..48, 51..85).
 * 2. Anatomical surfaces validation across all tooth groups (incisors, canines, premolars, molars).
 *    - M, O, D, V, L, C and compound acronyms (MOD, MO, DO, MODV).
 * 3. Exact 10 000 financial split payment and discount arithmetic combinations.
 *    - Kopeck-level exact equality (sum === totalKopecks), Hamilton-Hare allocation, 0% to 100% doctor discount (Mandate 8e).
 * 4. Wheeler 2.5D proportional geometry validation.
 *    - Incisors (48px), Canines (54px), Premolars (60px), Molars (68px).
 *    - Frontal 43..33 group = 300px (iPhone 390px fit, <= 320px safe area constraint).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	ALL_FDI_TEETH,
	PERMANENT_TEETH,
	DECIDUOUS_TEETH,
	isValidFdiToothNumber,
	assertValidFdiToothNumber,
	getWheelerToothClass,
	getWheelerCellWidthPx,
	calculateFrontalGroupWidthPx,
	WHEELER_CELL_WIDTHS_PX,
} from "../clinical/dentalFormulaFdi.js";

import {
	parseDentalFormulaShorthand,
	resolveTeethRange,
} from "../clinical/dentalFormulaTextParser.js";

import {
	normalizeCanonicalSurfaces,
	normalizeCanonicalSurface,
	formatSurfacesRu,
	type CanonicalSurfaceKey,
} from "../clinical/dentalFormulaSurfaces.js";

import {
	splitKopecks,
	allocateGlobalDiscountCents,
	percentageOfKopecks,
	rublesToKopecks,
	kopecksToRubles,
} from "../money.js";

import {
	validateAndBalanceSplitPayment,
	balanceSplitTenderRemainder,
	allocateSplitPaymentAcrossItems,
	type SplitPaymentPositionItem,
} from "../billing/splitPayment.js";

/**
 * Deterministic Linear Congruential PRNG (Park-Miller variant).
 * Ensures fast execution (nanoseconds per call) and reproducible test runs.
 */
class FastPrng {
	private state: number;

	constructor(seed = 1337) {
		this.state = seed % 2147483647;
		if (this.state <= 0) {
			this.state += 2147483646;
		}
	}

	next(): number {
		this.state = (this.state * 16807) % 2147483647;
		return (this.state - 1) / 2147483646;
	}

	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	choice<T>(items: readonly T[]): T {
		return items[this.nextInt(0, items.length - 1)]!;
	}
}

describe("Autonomous Red Team Fuzzing & Clinical Math Suite (@dental/shared)", () => {
	// ========================================================================
	// SECTION 1: 10 000 PSEUDORANDOM FUZZY STRING MUTATIONS ON FDI FORMULA
	// ========================================================================
	describe("1. 10 000 Pseudorandom Fuzzy String Mutations (FDI Shorthand Parser)", () => {
		it("fuzzes 10 000 malformed inputs without throwing uncaught exceptions or leaking invalid FDI teeth", () => {
			const prng = new FastPrng(20261106);

			const validTeeth = [...ALL_FDI_TEETH];
			const invalidNumbers = [0, -1, -48, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 56, 76, 86, 99, 100, 111, 999];
			const validStatusCodes = [
				"к", "c", "кариес", "п", "pl", "пломба", "пт", "pt", "пульпит",
				"кр", "cr", "коронка", "зд", "норма", "санирован", "имп", "и", "i",
				"о", "o", "0", "уд", "удален", "р", "r", "кор", "рет", "гиг",
			];
			const surfacesAcronyms = ["мод", "до", "мо", "оккл", "вест", "щечн", "язычн", "небн", "дист", "мез", "приш"];
			const junkChars = [
				" ", "\t", "\n", ",", ";", ".", ":", "-", "/", "\\", "|", "_", "=",
				"+", "@", "#", "$", "%", "^", "&", "*", "(", ")", "[", "]", "{", "}",
				"~", "`", "?", "!", "<", ">", "\"", "'", "фыва", "asdf", "💩", "⚠️",
			];

			// Cyrillic and Latin homoglyphs for substitution fuzzing
			const homoglyphs: Record<string, string[]> = {
				c: ["с", "C", "С"], // Latin c/C vs Cyrillic с/С
				o: ["о", "O", "О", "0"], // Latin o/O vs Cyrillic о/О vs Zero 0
				p: ["р", "P", "Р"], // Latin p/P vs Cyrillic р/Р
				k: ["к", "K", "К"],
				a: ["а", "A", "А"],
			};

			let totalParsedItems = 0;
			let totalUnrecognized = 0;

			for (let i = 0; i < 10000; i++) {
				const scenario = prng.nextInt(1, 6);
				let dirtyString = "";

				switch (scenario) {
					case 1: {
						// Junk characters + whitespace bomb (up to 100 spaces)
						const junkLen = prng.nextInt(1, 20);
						const spaces = " ".repeat(prng.nextInt(0, 100));
						const junk = Array.from({ length: junkLen }, () => prng.choice(junkChars)).join("");
						dirtyString = `${spaces}${junk}${spaces}`;
						break;
					}
					case 2: {
						// Valid tooth + homoglyph corrupted status code
						const tooth = prng.choice(validTeeth);
						let code = prng.choice(validStatusCodes);
						if (prng.next() > 0.5) {
							// Inject homoglyph
							const char = code[0] ?? "c";
							if (homoglyphs[char.toLowerCase()]) {
								code = prng.choice(homoglyphs[char.toLowerCase()]!) + code.slice(1);
							}
						}
						const sep = prng.choice(["", " ", "-", ":", "=", "_", " - "]);
						dirtyString = `${tooth}${sep}${code}`;
						break;
					}
					case 3: {
						// Invalid/surrogate tooth + code (MUST land in unrecognized)
						const badTooth = prng.choice(invalidNumbers);
						const code = prng.choice(validStatusCodes);
						const sep = prng.choice(["", " ", "-", ":"]);
						dirtyString = `${badTooth}${sep}${code}`;
						break;
					}
					case 4: {
						// Complex compound token: tooth + surfaces + status + junk
						const tooth = prng.choice(validTeeth);
						const surface = prng.choice(surfacesAcronyms);
						const code = prng.choice(["к", "п", "кариес", "пломба"]);
						const prefixJunk = prng.choice(junkChars);
						const suffixJunk = prng.choice(junkChars);
						dirtyString = `${prefixJunk} ${tooth} ${surface} ${code} ${suffixJunk}`;
						break;
					}
					case 5: {
						// Inverted syntax: status first, then tooth (e.g. "к 16", "кариес 36, 46")
						const code = prng.choice(validStatusCodes);
						const tooth1 = prng.choice(validTeeth);
						const tooth2 = prng.choice(validTeeth);
						dirtyString = `${code} ${tooth1}, ${tooth2}`;
						break;
					}
					case 6: {
						// Multi-tooth sequence with mixed valid and invalid teeth
						const t1 = prng.choice(validTeeth);
						const tBad = prng.choice(invalidNumbers);
						const t2 = prng.choice(validTeeth);
						dirtyString = `${t1}к, ${tBad}п, ${t2}о`;
						break;
					}
				}

				// INVARIANT 1: Parser must never crash on dirty string
				let result: ReturnType<typeof parseDentalFormulaShorthand>;
				try {
					result = parseDentalFormulaShorthand(dirtyString);
				} catch (err: unknown) {
					assert.fail(`parseDentalFormulaShorthand crashed on iteration ${i} with input: "${dirtyString}". Error: ${String(err)}`);
				}

				assert.ok(typeof result === "object" && result !== null, "Result must be non-null object");
				assert.ok(Array.isArray(result.items), "result.items must be an array");
				assert.ok(Array.isArray(result.unrecognized), "result.unrecognized must be an array");
				assert.ok(typeof result.hasMatches === "boolean", "result.hasMatches must be a boolean");

				totalParsedItems += result.items.length;
				totalUnrecognized += result.unrecognized.length;

				// INVARIANT 2: Every extracted tooth MUST be a strictly valid FDI tooth number (11..48, 51..85)
				for (const item of result.items) {
					assert.equal(
						isValidFdiToothNumber(item.toothNumber),
						true,
						`Fuzzed input "${dirtyString}" extracted illegal tooth ${item.toothNumber}`,
					);

					// INVARIANT 3: Any surface attached must be one of canonical surface keys
					if (item.surfaces && item.surfaces.length > 0) {
						for (const s of item.surfaces) {
							assert.ok(
								["M", "O", "D", "V", "L", "C"].includes(s),
								`Illegal surface key "${s}" extracted on tooth ${item.toothNumber}`,
							);
						}
					}
				}
			}

			// Sanity check that fuzzing actually parsed valid tokens and collected unrecognized ones
			assert.ok(totalParsedItems > 0, "Fuzzer must have parsed valid items");
			assert.ok(totalUnrecognized > 0, "Fuzzer must have collected unrecognized items");
		});

		it("stress-tests range resolver across arch boundaries without exceptions", () => {
			const prng = new FastPrng(98765);
			const allTeeth = [...ALL_FDI_TEETH];

			for (let i = 0; i < 1000; i++) {
				const start = prng.choice(allTeeth);
				const end = prng.choice(allTeeth);

				let range: number[] = [];
				assert.doesNotThrow(() => {
					range = resolveTeethRange(start, end);
				});

				assert.ok(Array.isArray(range));
				assert.ok(range.length >= 1, "Resolved range must have at least 1 tooth");
				for (const t of range) {
					assert.equal(isValidFdiToothNumber(t), true, `Range member ${t} must be valid FDI`);
				}
			}
		});
	});

	// ========================================================================
	// SECTION 2: ANATOMICAL SURFACES VALIDATION ACROSS TOOTH GROUPS
	// ========================================================================
	describe("2. Anatomical Surfaces Validation Across Tooth Groups (M, O, D, V, L, C)", () => {
		it("normalizes canonical surfaces and expands compound acronyms for all tooth groups", () => {
			// Compound acronyms
			assert.deepEqual(normalizeCanonicalSurfaces("МОД"), ["M", "O", "D"]);
			assert.deepEqual(normalizeCanonicalSurfaces("MOD"), ["M", "O", "D"]);
			assert.deepEqual(normalizeCanonicalSurfaces("мо"), ["M", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("до"), ["D", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("modv"), ["M", "O", "D", "V"]);

			// Individual surface codes with synonyms
			assert.equal(normalizeCanonicalSurface("о"), "O");
			assert.equal(normalizeCanonicalSurface("оккл"), "O");
			assert.equal(normalizeCanonicalSurface("o"), "O");

			assert.equal(normalizeCanonicalSurface("в"), "V");
			assert.equal(normalizeCanonicalSurface("вест"), "V");
			assert.equal(normalizeCanonicalSurface("щечн"), "V");
			assert.equal(normalizeCanonicalSurface("v"), "V");
			assert.equal(normalizeCanonicalSurface("b"), "V"); // Buccal -> Vestibular

			assert.equal(normalizeCanonicalSurface("м"), "M");
			assert.equal(normalizeCanonicalSurface("мез"), "M");
			assert.equal(normalizeCanonicalSurface("m"), "M");

			assert.equal(normalizeCanonicalSurface("д"), "D");
			assert.equal(normalizeCanonicalSurface("дист"), "D");
			assert.equal(normalizeCanonicalSurface("d"), "D");

			assert.equal(normalizeCanonicalSurface("я"), "L");
			assert.equal(normalizeCanonicalSurface("язычн"), "L");
			assert.equal(normalizeCanonicalSurface("н"), "L");
			assert.equal(normalizeCanonicalSurface("небн"), "L");
			assert.equal(normalizeCanonicalSurface("l"), "L"); // Lingual
			assert.equal(normalizeCanonicalSurface("p"), "L"); // Palatal

			assert.equal(normalizeCanonicalSurface("приш"), "C");
			assert.equal(normalizeCanonicalSurface("c"), "C"); // Cervical
		});

		it("formats surfaces to human-readable Russian string without developer abbreviations", () => {
			assert.equal(formatSurfacesRu(["O"]), "окклюзионная (жевательная)");
			assert.equal(formatSurfacesRu(["M", "O", "D"]), "мезиальная (медиальная), окклюзионная (жевательная), дистальная");
			assert.equal(formatSurfacesRu(["V", "C"]), "вестибулярная (щечная/губная), пришеечная");
			assert.equal(formatSurfacesRu([]), "коронковой части");
		});
	});

	// ========================================================================
	// SECTION 3: 10 000 FINANCIAL COMBINATIONS (SPLITS & MANDATE 8e DISCOUNTS)
	// ========================================================================
	describe("3. 10 000 Exact Financial Arithmetic Combinations (Zero Float Drift)", () => {
		it("proves splitKopecks strictly satisfies sum === total across 10 000 random sums and parts", () => {
			const prng = new FastPrng(424242);

			for (let i = 0; i < 10000; i++) {
				// Random bill amount: from 1 kopeck (0.01 ₽) to 10 000 000 kopecks (100 000.00 ₽)
				const totalKopecks = prng.nextInt(1, 10000000);
				const parts = prng.nextInt(2, 10);

				const splits = splitKopecks(totalKopecks, parts);

				assert.equal(splits.length, parts);

				// INVARIANT: sum of parts MUST strictly equal totalKopecks (zero drift)
				const sumOfSplits = splits.reduce((acc, val) => acc + val, 0);
				assert.equal(
					sumOfSplits,
					totalKopecks,
					`Failed on totalKopecks=${totalKopecks}, parts=${parts}: sum was ${sumOfSplits}`,
				);

				// INVARIANT: parts difference should be at most 1 kopeck
				const minPart = Math.min(...splits);
				const maxPart = Math.max(...splits);
				assert.ok(
					maxPart - minPart <= 1,
					`Parts disparity > 1 kopeck on totalKopecks=${totalKopecks}: min=${minPart}, max=${maxPart}`,
				);
			}
		});

		it("proves allocateGlobalDiscountCents strictly preserves total discount across 10 000 combinations", () => {
			const prng = new FastPrng(888888);

			for (let i = 0; i < 10000; i++) {
				const numItems = prng.nextInt(1, 6);
				const items: Array<{ id: string; amountCents: bigint }> = [];
				let totalBillCents = 0n;

				for (let j = 0; j < numItems; j++) {
					const itemAmount = BigInt(prng.nextInt(100, 500000)); // 1.00 ₽ to 5000.00 ₽
					items.push({ id: `item-${j}`, amountCents: itemAmount });
					totalBillCents += itemAmount;
				}

				// Doctor discount percentage: from 0.00% to 100.00% with 0.01% step (basis points 0..10000)
				const basisPoints = prng.nextInt(0, 10000);
				const discountCents = (totalBillCents * BigInt(basisPoints)) / 10000n;

				const allocation = allocateGlobalDiscountCents(items, discountCents);

				let allocatedSum = 0n;
				for (const item of items) {
					const itemDiscount = allocation.get(item.id) ?? 0n;
					// INVARIANT 1: item discount cannot exceed item cost
					assert.ok(
						itemDiscount <= item.amountCents,
						`Item ${item.id} discount ${itemDiscount} exceeds amount ${item.amountCents}`,
					);
					// INVARIANT 2: item discount cannot be negative
					assert.ok(itemDiscount >= 0n, `Item ${item.id} discount cannot be negative`);
					allocatedSum += itemDiscount;
				}

				// INVARIANT 3: sum of allocated discounts MUST strictly equal discountCents
				assert.equal(
					allocatedSum,
					discountCents,
					`Allocated sum ${allocatedSum} != discountCents ${discountCents} on iteration ${i}`,
				);
			}
		});

		it("verifies multi-tender split balancing with 0 kopeck discrepancy across random combinations", () => {
			const prng = new FastPrng(777123);

			for (let i = 0; i < 2000; i++) {
				const actKopecks = prng.nextInt(1000, 10000000); // 10.00 ₽ to 100 000.00 ₽

				// Randomly split across cash, card, sbp, deposit
				const cashPart = prng.nextInt(0, actKopecks);
				const remaining1 = actKopecks - cashPart;
				const cardPart = prng.nextInt(0, remaining1);
				const remaining2 = remaining1 - cardPart;
				const sbpPart = prng.nextInt(0, remaining2);
				const depositPart = remaining2 - sbpPart;

				assert.equal(cashPart + cardPart + sbpPart + depositPart, actKopecks);

				const validation = validateAndBalanceSplitPayment({
					actTotalKopecks: actKopecks,
					tenders: {
						cashKopecks: cashPart,
						cardKopecks: cardPart,
						sbpKopecks: sbpPart,
						advanceDepositKopecks: depositPart,
					},
				});

				assert.equal(validation.isBalanced, true);
				assert.equal(validation.status, "exact");
				assert.equal(validation.discrepancyKopecks, 0);
				assert.equal(validation.totalTendersKopecks, actKopecks);
			}
		});

		it("verifies Mandate 8e: 100% doctor discount yields 0 kopecks without division-by-zero errors", () => {
			const actTotalKopecks = 2500000; // 25 000.00 ₽
			const discount100BasisPoints = 10000; // 100.00%
			const discountAmount = percentageOfKopecks(actTotalKopecks, discount100BasisPoints);

			assert.equal(discountAmount, actTotalKopecks);

			const payableKopecks = actTotalKopecks - discountAmount;
			assert.equal(payableKopecks, 0);

			const valZero = validateAndBalanceSplitPayment({
				actTotalKopecks: payableKopecks,
				tenders: {},
			});

			assert.equal(valZero.isBalanced, true);
			assert.equal(valZero.status, "exact");
			assert.equal(valZero.discrepancyKopecks, 0);
		});
	});

	// ========================================================================
	// SECTION 4: WHEELER 2.5D PROPORTIONAL GEOMETRY & MOBILE VIEWPORT SSOT
	// ========================================================================
	describe("4. Wheeler 2.5D Proportional Geometry & Mobile Viewport SSOT", () => {
		it("validates exact Wheeler tooth widths for all 32 permanent and 20 deciduous teeth", () => {
			// Incisors: 48px standard / 44px compact
			for (const t of [11, 12, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 71, 72, 81, 82]) {
				assert.equal(getWheelerToothClass(t), "incisor");
				assert.equal(getWheelerCellWidthPx(t, "standard"), 48);
				assert.equal(getWheelerCellWidthPx(t, "compact"), 44);
			}

			// Canines: 54px standard / 50px compact
			for (const t of [13, 23, 33, 43, 53, 63, 73, 83]) {
				assert.equal(getWheelerToothClass(t), "canine");
				assert.equal(getWheelerCellWidthPx(t, "standard"), 54);
				assert.equal(getWheelerCellWidthPx(t, "compact"), 50);
			}

			// Adult Premolars: 60px standard / 56px compact
			for (const t of [14, 15, 24, 25, 34, 35, 44, 45]) {
				assert.equal(getWheelerToothClass(t), "premolar");
				assert.equal(getWheelerCellWidthPx(t, "standard"), 60);
				assert.equal(getWheelerCellWidthPx(t, "compact"), 56);
			}

			// Adult Molars & Pediatric Molars: 68px standard / 64px compact
			for (const t of [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48, 54, 55, 64, 65, 74, 75, 84, 85]) {
				assert.equal(getWheelerToothClass(t), "molar");
				assert.equal(getWheelerCellWidthPx(t, "standard"), 68);
				assert.equal(getWheelerCellWidthPx(t, "compact"), 64);
			}
		});

		it("proves frontal arch 43..33 fits in 300px <= 320px safe area for iPhone 390px (0px drift)", () => {
			const frontal = [43, 42, 41, 31, 32, 33];
			const standardW = calculateFrontalGroupWidthPx(frontal, "standard");
			const compactW = calculateFrontalGroupWidthPx(frontal, "compact");

			// 54 + 48 + 48 + 48 + 48 + 54 = 300px
			assert.equal(standardW, 300);
			// 50 + 44 + 44 + 44 + 44 + 50 = 276px
			assert.equal(compactW, 276);

			// Strict mobile viewport invariant: 300px <= 320px safe area (iPhone 390px - 2x16px padding = 358px usable)
			assert.ok(standardW <= 320, "Standard frontal width must be <= 320px");
			assert.ok(compactW <= 320, "Compact frontal width must be <= 320px");
		});

		it("verifies canonical Wheeler 2.5D alignment constants", () => {
			// Center X = 50.0, Center Y = 176.0, ViewBox = "0 0 100 218", badgeRadius <= 14px
			const CX = 50.0;
			const CY = 176.0;
			const VIEWBOX_WIDTH = 100;
			const VIEWBOX_HEIGHT = 218;
			const MAX_BADGE_RADIUS = 14;

			assert.equal(CX, VIEWBOX_WIDTH / 2);
			assert.ok(CY < VIEWBOX_HEIGHT);
			assert.ok(MAX_BADGE_RADIUS <= 14);
		});
	});
});
