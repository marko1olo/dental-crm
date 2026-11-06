/**
 * packages/shared/src/tests/medicalDomainGenerativeFuzzing.test.ts
 *
 * DENTE Dental CRM — Medical Domain Generative Fuzzing & Stochastic Chaos Test Suite.
 *
 * Invariants & Objectives:
 * 1. 10 000 pseudorandom FDI tooth formula mutations & Wheeler 2.5D geometry verification.
 * 2. 10 000 financial split arithmetic combinations in exact BigInt kopecks (sum === total).
 * 3. 10 000 dirty price list items (Soviet notation, 804n codes, extreme lengths, negative prices).
 * 4. SanPiN 3.3686-21 shelf life date calculations (leap years, century transitions, RangeError immunity).
 * 5. Performance Invariant (Mandate 8t): High-throughput execution (<3000ms for full suite).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	FastPrng,
	FdiToothFuzzer,
	BillingMathFuzzer,
	PricelistFuzzer,
	SanpinDatesFuzzer,
	SUPERNUMERARY_TEETH_SAMPLES,
	INVALID_TEETH_SAMPLES,
} from "../fuzzing/index.js";

import {
	ALL_FDI_TEETH,
	PERMANENT_TEETH,
	DECIDUOUS_TEETH,
	isValidFdiToothNumber,
	getWheelerToothClass,
	getWheelerCellWidthPx,
	calculateFrontalGroupWidthPx,
} from "../clinical/dentalFormulaFdi.js";

import {
	parseDentalFormulaShorthand,
	resolveTeethRange,
} from "../clinical/dentalFormulaTextParser.js";

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
} from "../billing/splitPayment.js";

import {
	normalizePricelistPrice,
	autoMapColumns,
	findHeaderRowIndex,
} from "../clinical/pricelistImport/rowParser.js";

import {
	analyzeTabularPricelist,
} from "../clinical/pricelistImport/batchImportOrchestrator.js";

describe("Medical Domain Generative Fuzzing & Chaos Suite (@dental/shared)", () => {
	// ========================================================================
	// 1. FDI DENTAL FORMULA GENERATIVE FUZZING & WHEELER GEOMETRY
	// ========================================================================
	describe("1. FDI Dental Formula & Wheeler 2.5D Generative Fuzzing", () => {
		it("fuzzes 10 000 dirty shorthand string tokens without uncaught crashes or invalid FDI leaks", () => {
			const prng = new FastPrng(20261106);
			const fuzzer = new FdiToothFuzzer(prng);

			const startTime = Date.now();
			let totalMatches = 0;
			let totalUnrecognized = 0;

			for (let i = 0; i < 10000; i++) {
				const { text } = fuzzer.generateFuzzyShorthandToken();

				let parsed: ReturnType<typeof parseDentalFormulaShorthand>;
				try {
					parsed = parseDentalFormulaShorthand(text);
				} catch (err: unknown) {
					assert.fail(`parseDentalFormulaShorthand crashed on iteration ${i} with input: "${text}". Error: ${String(err)}`);
				}

				assert.ok(typeof parsed === "object" && parsed !== null, "Result must be non-null object");
				assert.ok(Array.isArray(parsed.items), "parsed.items must be an array");
				assert.ok(Array.isArray(parsed.unrecognized), "parsed.unrecognized must be an array");

				totalMatches += parsed.items.length;
				totalUnrecognized += parsed.unrecognized.length;

				// INVARIANT: every extracted tooth MUST be strictly in ALL_FDI_TEETH (11..48, 51..85)
				for (const item of parsed.items) {
					assert.equal(
						isValidFdiToothNumber(item.toothNumber),
						true,
						`Fuzzed input "${text}" leaked illegal tooth ${item.toothNumber}`,
					);
					assert.ok(
						!INVALID_TEETH_SAMPLES.includes(item.toothNumber),
						`Extracted tooth ${item.toothNumber} is in INVALID_TEETH_SAMPLES`,
					);
					assert.ok(
						!SUPERNUMERARY_TEETH_SAMPLES.includes(item.toothNumber),
						`Extracted tooth ${item.toothNumber} is in SUPERNUMERARY_TEETH_SAMPLES`,
					);

					if (item.surfaces && item.surfaces.length > 0) {
						for (const surf of item.surfaces) {
							assert.ok(
								["M", "O", "D", "V", "L", "C"].includes(surf),
								`Extracted illegal surface "${surf}" on tooth ${item.toothNumber}`,
							);
						}
					}
				}
			}

			const durationMs = Date.now() - startTime;
			// Performance gate: 10 000 iterations must take < 2000ms
			assert.ok(durationMs < 2000, `Fuzzing took ${durationMs}ms (threshold 2000ms)`);
			assert.ok(totalMatches > 0, "Parser must match valid items during fuzzing");
			assert.ok(totalUnrecognized > 0, "Parser must capture dirty unrecognized tokens");
		});

		it("generates biological mixed dentitions and Kennedy edentulous arches without data corruption", () => {
			const prng = new FastPrng(777);
			const fuzzer = new FdiToothFuzzer(prng);

			// Mixed dentitions (children 6-12 years)
			for (let i = 0; i < 100; i++) {
				const mixed = fuzzer.generateMixedDentitionFormula();
				assert.ok(mixed.size >= 12, "Mixed dentition must have at least 12 active teeth");

				// Molars 16, 26, 36, 46 must always be present
				for (const molar of [16, 26, 36, 46]) {
					assert.ok(mixed.has(molar), `Mixed dentition must contain permanent molar ${molar}`);
				}

				// Biological succession check: cannot have both deciduous 51 and permanent 11 active simultaneously
				if (mixed.has(51) && mixed.has(11)) {
					assert.fail("Mixed dentition cannot have both 51 and 11 active simultaneously");
				}
				if (mixed.has(61) && mixed.has(21)) {
					assert.fail("Mixed dentition cannot have both 61 and 21 active simultaneously");
				}
			}

			// Kennedy edentulous arches (Classes I..IV)
			for (const kClass of [1, 2, 3, 4] as const) {
				const arch = fuzzer.generateKennedyArch(kClass, "lower");
				assert.equal(arch.size, 16, "Lower arch must have 16 teeth positions");

				const extractedCount = Array.from(arch.values()).filter((t) => t.status === "extracted").length;
				assert.ok(extractedCount > 0, `Kennedy Class ${kClass} must have missing teeth`);

				if (kClass === 1) {
					// Class I: bilateral distal extension (both 48 and 38 must be extracted)
					assert.equal(arch.get(48)?.status, "extracted");
					assert.equal(arch.get(38)?.status, "extracted");
				} else if (kClass === 4) {
					// Class IV: anterior defect crossing midline (31 and 41 must be extracted)
					assert.equal(arch.get(41)?.status, "extracted");
					assert.equal(arch.get(31)?.status, "extracted");
				}
			}
		});

		it("verifies Wheeler 2.5D cell widths and iPhone 390px safe area constraint", () => {
			// Wheeler widths for permanent teeth
			for (const t of PERMANENT_TEETH) {
				const tClass = getWheelerToothClass(t);
				const stdW = getWheelerCellWidthPx(t, "standard");
				const compW = getWheelerCellWidthPx(t, "compact");

				if (tClass === "incisor") {
					assert.equal(stdW, 48);
					assert.equal(compW, 44);
				} else if (tClass === "canine") {
					assert.equal(stdW, 54);
					assert.equal(compW, 50);
				} else if (tClass === "premolar") {
					assert.equal(stdW, 60);
					assert.equal(compW, 56);
				} else if (tClass === "molar") {
					assert.equal(stdW, 68);
					assert.equal(compW, 64);
				}
			}

			// Frontal group 43..33 iPhone 390px fit: 300px <= 320px
			const frontalWidth = calculateFrontalGroupWidthPx([43, 42, 41, 31, 32, 33], "standard");
			assert.equal(frontalWidth, 300);
			assert.ok(frontalWidth <= 320, "Frontal width must not exceed 320px for mobile safe area");
		});
	});

	// ========================================================================
	// 2. FINANCIAL SPLITS, BIGINT KOPECKS & 54-FZ MULTI-TENDER FUZZING
	// ========================================================================
	describe("2. Financial Splits, BigInt Kopecks & Multi-Tender Arithmetic", () => {
		it("stochastically verifies 10 000 split transactions with 0 float drift and strict sum equality", () => {
			const prng = new FastPrng(888123);
			const billingFuzzer = new BillingMathFuzzer(prng);

			const startTime = Date.now();

			for (let i = 0; i < 10000; i++) {
				const scenario = billingFuzzer.generateSplitScenario();

				// INVARIANT 1: Sum of splits MUST strictly equal payableKopecks
				assert.equal(
					scenario.isValidStrictSum,
					true,
					`Split sum mismatch on iteration ${i}: total=${scenario.totalAmountKopecks}, payable=${scenario.payableKopecks}`,
				);

				// INVARIANT 2: Max disparity between participants cannot exceed 1 kopeck (Hamilton-Hare)
				if (scenario.payableKopecks > 0n) {
					assert.ok(
						scenario.maxDisparityKopecks <= 1n,
						`Part disparity > 1 kopeck on iteration ${i}: disparity=${scenario.maxDisparityKopecks}`,
					);
				}

				// INVARIANT 3: Mandate 8e: 100% discount yields 0 payable kopecks without division-by-zero
				if (scenario.doctorDiscountBasisPoints === 10000) {
					assert.equal(scenario.payableKopecks, 0n);
					for (const s of scenario.splits) {
						assert.equal(s, 0n);
					}
				}
			}

			const durationMs = Date.now() - startTime;
			assert.ok(durationMs < 1000, `Financial fuzzing took ${durationMs}ms (threshold 1000ms)`);
		});

		it("stochastically tests odd-cent splits (e.g. 1 kopeck across 3 participants) with exact remainder preservation", () => {
			// 1 kopeck split among 3 participants -> [1, 0, 0] with sum === 1
			const splits1 = splitKopecks(1, 3);
			assert.equal(splits1.length, 3);
			assert.equal(splits1.reduce((a, b) => a + b, 0), 1);
			assert.equal(splits1[0], 1);
			assert.equal(splits1[1], 0);
			assert.equal(splits1[2], 0);

			// 2 kopecks split among 3 participants -> [1, 1, 0] with sum === 2
			const splits2 = splitKopecks(2, 3);
			assert.equal(splits2.length, 3);
			assert.equal(splits2.reduce((a, b) => a + b, 0), 2);
			assert.equal(splits2[0], 1);
			assert.equal(splits2[1], 1);
			assert.equal(splits2[2], 0);

			// 100 rubles (10 000 kopecks) split among 7 participants -> sum === 10 000
			const splits100 = splitKopecks(10000, 7);
			assert.equal(splits100.length, 7);
			assert.equal(splits100.reduce((a, b) => a + b, 0), 10000);
			const minK = Math.min(...splits100);
			const maxK = Math.max(...splits100);
			assert.ok(maxK - minK <= 1);
		});

		it("proves allocateGlobalDiscountCents strictly preserves total discount across 5000 random item sets", () => {
			const prng = new FastPrng(444555);

			for (let i = 0; i < 5000; i++) {
				const itemCount = prng.nextInt(1, 8);
				const items: Array<{ id: string; amountCents: bigint }> = [];
				let totalBill = 0n;

				for (let j = 0; j < itemCount; j++) {
					const amount = BigInt(prng.nextInt(50, 200000));
					items.push({ id: `item-${j}`, amountCents: amount });
					totalBill += amount;
				}

				// Random doctor discount from 0% to 100%
				const basisPoints = prng.nextInt(0, 10000);
				const discountCents = (totalBill * BigInt(basisPoints)) / 10000n;

				const allocated = allocateGlobalDiscountCents(items, discountCents);

				let sumAllocated = 0n;
				for (const item of items) {
					const itemDisc = allocated.get(item.id) ?? 0n;
					assert.ok(itemDisc <= item.amountCents, `Item ${item.id} discount exceeded amount`);
					assert.ok(itemDisc >= 0n, `Item ${item.id} discount was negative`);
					sumAllocated += itemDisc;
				}

				assert.equal(sumAllocated, discountCents, `Discount allocation sum mismatch on iteration ${i}`);
			}
		});

		it("validates 54-FZ multi-tender checkout balancing across 2000 combinations", () => {
			const prng = new FastPrng(999111);
			const billingFuzzer = new BillingMathFuzzer(prng);

			for (let i = 0; i < 2000; i++) {
				const actKop = prng.nextInt(100, 5000000); // 1.00 ₽ to 50 000.00 ₽
				const checkout = billingFuzzer.generateMultiTenderCheckout(actKop);

				const validation = validateAndBalanceSplitPayment({
					actTotalKopecks: actKop,
					tenders: {
						cashKopecks: checkout.cashKop,
						cardKopecks: checkout.cardKop,
						sbpKopecks: checkout.sbpKop,
						advanceDepositKopecks: checkout.depositKop,
						creditKopecks: checkout.creditKop,
					},
				});

				assert.equal(validation.isBalanced, true);
				assert.equal(validation.status, "exact");
				assert.equal(validation.discrepancyKopecks, 0);
				assert.equal(validation.totalTendersKopecks, actKop);
			}
		});
	});

	// ========================================================================
	// 3. DIRTY PRICELISTS & NOMENCLATURE 804N IMPORT FUZZING
	// ========================================================================
	describe("3. Dirty Pricelists & Nomenclature 804n Import Fuzzing", () => {
		it("fuzzes normalizePricelistPrice with 10 000 malformed prices without uncaught crashes", () => {
			const prng = new FastPrng(654321);
			const startTime = Date.now();

			for (let i = 0; i < 10000; i++) {
				const scenario = prng.nextInt(1, 9);
				let rawPrice: unknown = "";

				switch (scenario) {
					case 1:
						// Valid Soviet notation: "1500-00", "25000-00"
						rawPrice = `${prng.nextInt(100, 50000)}-00`;
						break;
					case 2:
						// Comma decimal: "1500,50 руб."
						rawPrice = `${prng.nextInt(100, 50000)},${prng.nextInt(10, 99)} руб.`;
						break;
					case 3:
						// "от 3000 ₽"
						rawPrice = `от ${prng.nextInt(500, 30000)} ₽`;
						break;
					case 4:
						// Free / warranty
						rawPrice = prng.choice(["0", "0 руб", "0.00", "бесплатно", "по гарантии", "гарантия"]);
						break;
					case 5:
						// Contract / variable price
						rawPrice = prng.choice(["по договоренности", "индивидуальный расчет", "по факту"]);
						break;
					case 6:
						// Negative price (must fail)
						rawPrice = `-${prng.nextInt(100, 10000)}`;
						break;
					case 7:
						// Extreme price exceeding 10M (must fail)
						rawPrice = "15000000";
						break;
					case 8:
						// Whitespace, null, undefined, empty
						rawPrice = prng.choice(["", "   ", "\t\n", null, undefined]);
						break;
					case 9:
						// Non-numeric junk
						rawPrice = prng.choice(["не_число", "NaN", "###", "стоимость уточняйте"]);
						break;
				}

				let result: ReturnType<typeof normalizePricelistPrice>;
				try {
					result = normalizePricelistPrice(rawPrice);
				} catch (err: unknown) {
					assert.fail(`normalizePricelistPrice crashed on iteration ${i} with raw: ${String(rawPrice)}. Error: ${String(err)}`);
				}

				assert.ok(typeof result === "object" && result !== null);
				assert.ok(typeof result.success === "boolean");
				assert.ok(typeof result.priceKopecks === "number");
				assert.ok(typeof result.priceRub === "number");
				assert.ok(typeof result.isWarrantyOrFree === "boolean");

				if (scenario === 4) {
					// Free / warranty must succeed with 0 rubles and 0 kopecks
					assert.equal(result.success, true);
					assert.equal(result.priceRub, 0);
					assert.equal(result.priceKopecks, 0);
					assert.equal(result.isWarrantyOrFree, true);
				} else if (scenario === 5 || scenario === 6 || scenario === 7 || scenario === 8 || scenario === 9) {
					// Negative, contract, extreme, empty, junk prices must fail gracefully
					assert.equal(result.success, false);
					assert.ok(typeof result.error === "string");
				}
			}

			const durationMs = Date.now() - startTime;
			assert.ok(durationMs < 1000, `Pricelist fuzzing took ${durationMs}ms (threshold 1000ms)`);
		});

		it("stochastically parses dirty tabular sheets across all 5 vendor signatures", () => {
			const prng = new FastPrng(112233);
			const fuzzer = new PricelistFuzzer(prng);

			const signatures = ["1c_medicina", "ident", "dentalpro", "istom", "generic_table"] as const;

			for (const sig of signatures) {
				const rows = fuzzer.generateDirtyPricelist(50, sig);
				assert.equal(rows.length, 51);

				const analysis = analyzeTabularPricelist({ rows });
				assert.equal(analysis.totalRows, 50);
				assert.ok(analysis.validRowsCount > 0, "Must have valid rows");
				assert.ok(analysis.errorRowsCount >= 0, "May have invalid rows");
				assert.ok(analysis.allRows.length === 50);
			}
		});
	});

	// ========================================================================
	// 4. SANPIN DATES & STERILITY SHELF LIFE FUZZING
	// ========================================================================
	describe("4. SanPiN 3.3686-21 Dates & Sterility Shelf Life Fuzzing", () => {
		it("safely handles leap years, century boundaries and negative intervals without RangeError", () => {
			const prng = new FastPrng(998811);
			const datesFuzzer = new SanpinDatesFuzzer(prng);

			for (let i = 0; i < 1000; i++) {
				const scenario = datesFuzzer.generateDateScenario();

				// Invariant: safeCalculateExpiry must NEVER throw uncaught RangeError
				let calcResult: ReturnType<typeof datesFuzzer.safeCalculateExpiry>;
				assert.doesNotThrow(() => {
					calcResult = datesFuzzer.safeCalculateExpiry(
						scenario.packDateStr,
						scenario.packagingType,
						{ referenceDate: scenario.referenceDateStr },
					);
				});

				assert.ok(typeof calcResult! === "object");
				if (calcResult!.success && calcResult!.result) {
					const r = calcResult!.result;
					assert.ok(typeof r.daysRemaining === "number");
					assert.ok(typeof r.status === "string");
					assert.ok(typeof r.isExpired === "boolean");
					assert.ok(typeof r.isExpiringSoon === "boolean");
					assert.ok(typeof r.statusLabelRu === "string");
					assert.ok(!r.statusLabelRu.includes("NaN"), "statusLabelRu must not contain NaN");
				} else {
					assert.ok(typeof calcResult!.error === "string");
				}
			}
		});

		it("verifies leap year rules on February 29th (2024 leap vs 2023 non-leap)", () => {
			const datesFuzzer = new SanpinDatesFuzzer(new FastPrng(1));

			// 2024 is a leap year: 2024-02-29 is valid
			const resLeap = datesFuzzer.safeCalculateExpiry(
				"2024-02-29T10:00:00.000Z",
				"kraft_self_seal", // 50 days
				{ referenceDate: "2024-03-01T10:00:00.000Z" },
			);
			assert.equal(resLeap.success, true);
			assert.equal(resLeap.result?.status, "valid");
			assert.equal(resLeap.result?.packDateFormatted, "2024-02-29");

			// Adding 50 days to Feb 29 2024 reaches April 19 2024 (February has 29 days in 2024)
			assert.equal(resLeap.result?.expiryDateFormatted, "2024-04-19");
		});

		it("verifies century leap rules (2000 is leap, 2100 is not leap)", () => {
			const datesFuzzer = new SanpinDatesFuzzer(new FastPrng(2));

			// Year 2000 was a leap year (divisible by 400)
			const res2000 = datesFuzzer.safeCalculateExpiry(
				"2000-02-29T10:00:00.000Z",
				"kraft_self_seal",
				{ referenceDate: "2000-03-01T10:00:00.000Z" },
			);
			assert.equal(res2000.success, true);
			assert.equal(res2000.result?.packDateFormatted, "2000-02-29");

			// Year 2100 is NOT a leap year (divisible by 100 but not 400)
			// A date string "2100-02-29" rolls over to "2100-03-01" in JavaScript Date parser
			const d2100 = new Date("2100-02-29T10:00:00.000Z");
			// JS Date constructor wraps overflow day: day 29 in Feb (28 days) becomes March 1st
			assert.equal(d2100.getUTCMonth(), 2); // Month 2 is March (0-indexed)
		});
	});
});
