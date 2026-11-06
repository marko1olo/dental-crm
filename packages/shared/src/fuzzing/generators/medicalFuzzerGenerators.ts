/**
 * packages/shared/src/fuzzing/generators/medicalFuzzerGenerators.ts
 *
 * DENTE Dental CRM — Medical Domain Generative Fuzzing & Stochastic Chaos Engine.
 *
 * Invariants:
 * 1. 100% Deterministic: Powered by Mulberry32 PRNG with reproducible seed.
 * 2. High-throughput performance: >10 000 iterations in <1000ms (Mandate 8t).
 * 3. Clinical domain fidelity: FDI ISO 3950, Wheeler 2.5D, SanPiN 3.3686-21, 54-FZ exact kopecks.
 * 4. Zero third-party dependencies: strictly Node standard runtime and @dental/shared SSOT.
 */

import {
	ALL_FDI_TEETH,
	DECIDUOUS_TEETH,
	PERMANENT_TEETH,
	isValidFdiToothNumber,
	getWheelerToothClass,
	getWheelerCellWidthPx,
	calculateFrontalGroupWidthPx,
} from "../../clinical/dentalFormulaFdi.js";

import {
	normalizeCanonicalSurfaces,
	type CanonicalSurfaceKey,
} from "../../clinical/dentalFormulaSurfaces.js";

import {
	splitKopecks,
	allocateGlobalDiscountCents,
	percentageOfKopecks,
	rublesToKopecks,
	kopecksToRubles,
} from "../../money.js";

import {
	normalizePricelistPrice,
	autoMapColumns,
	findHeaderRowIndex,
} from "../../clinical/pricelistImport/rowParser.js";

import {
	analyzeTabularPricelist,
} from "../../clinical/pricelistImport/batchImportOrchestrator.js";

import type {
	PricelistVendorSignature,
} from "../../clinical/pricelistImport/types.js";

import {
	calculatePackageExpiryDate,
	type PackageSterilityStatus,
	type PackageExpiryCalculationResult,
} from "../../sanpin/packagingSsot/shelfLifeCalculators.js";

import {
	SANPIN_PACKAGING_MATERIALS,
	type SanpinPackagingMaterialId,
} from "../../sanpin/packagingSsot/packagingMaterials.js";

// ============================================================================
// 1. DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (MULBERRY32)
// ============================================================================

/**
 * High-performance, 32-bit deterministic PRNG based on Mulberry32.
 * Produces uniform pseudo-random distributions with 0 external dependencies.
 */
export class FastPrng {
	private state: number;
	readonly initialSeed: number;

	constructor(seed = 1337) {
		this.initialSeed = Math.floor(Math.abs(seed)) || 1;
		this.state = this.initialSeed;
	}

	/** Returns next uniform float in [0, 1) */
	next(): number {
		let t = (this.state += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Returns uniform integer in [min, max] inclusive */
	nextInt(min: number, max: number): number {
		const lo = Math.ceil(min);
		const hi = Math.floor(max);
		if (lo >= hi) return lo;
		return Math.floor(this.next() * (hi - lo + 1)) + lo;
	}

	/** Returns uniform BigInt in [min, max] inclusive */
	nextBigInt(min: bigint, max: bigint): bigint {
		if (min >= max) return min;
		const range = max - min + 1n;
		// Sample 53 bits of randomness
		const randFraction = this.next();
		const offset = BigInt(Math.floor(randFraction * 1000000000000000));
		const scaled = (offset * range) / 1000000000000000n;
		return min + scaled;
	}

	/** Selects a random element from non-empty array */
	choice<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error("Cannot choose from empty array");
		}
		const index = this.nextInt(0, items.length - 1);
		return items[index]!;
	}

	/** Returns a random sample of N distinct items from array */
	sample<T>(items: readonly T[], count: number): T[] {
		const pool = [...items];
		const n = Math.min(count, pool.length);
		const result: T[] = [];
		for (let i = 0; i < n; i++) {
			const idx = this.nextInt(0, pool.length - 1);
			result.push(pool[idx]!);
			pool.splice(idx, 1);
		}
		return result;
	}

	/** Shuffles array in-place using Fisher-Yates */
	shuffle<T>(items: T[]): T[] {
		const arr = [...items];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = this.nextInt(0, i);
			const tmp = arr[i]!;
			arr[i] = arr[j]!;
			arr[j] = tmp;
		}
		return arr;
	}

	/** Returns boolean with probability `prob` of being true (default 0.5) */
	boolean(prob = 0.5): boolean {
		return this.next() < prob;
	}

	/** Returns a random alphanumeric or dirty string of specified length */
	string(length: number, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"): string {
		let res = "";
		for (let i = 0; i < length; i++) {
			res += charset[this.nextInt(0, charset.length - 1)];
		}
		return res;
	}

	getSeed(): number {
		return this.initialSeed;
	}
}

// ============================================================================
// 2. CLINICAL FDI TOOTH FORMULA GENERATOR & MUTATION ARSENAL
// ============================================================================

export type ToothPathologyType =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "devitalized"
	| "resorcin_formalin"
	| "calcium_hydroxide"
	| "broken_instrument"
	| "perforation"
	| "composite_sound"
	| "composite_defective"
	| "inlay_onlay"
	| "crown"
	| "post_and_core"
	| "implant"
	| "healing_abutment"
	| "screw_crown"
	| "cement_crown"
	| "extracted"
	| "retained"
	| "wedge_defect"
	| "pathological_wear"
	| "tartar"
	| "crack"
	| "healthy";

export interface FuzzToothRecord {
	readonly toothNumber: number;
	readonly dentition: "permanent" | "deciduous";
	readonly quadrant: number;
	readonly status: ToothPathologyType;
	readonly statusCodeRu: string;
	readonly surfaces: readonly CanonicalSurfaceKey[];
	readonly blackClass?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
	readonly cariesDepth?: 1 | 2 | 3 | 4 | undefined;
	readonly crownMaterial?: "Zr" | "MK" | "Em" | "Au" | "CoCr" | "PMMA" | undefined;
	readonly postType?: "СВШ" | "КШВ" | undefined;
}

export const SUPERNUMERARY_TEETH_SAMPLES = Object.freeze([91, 92, 93, 94, 95, 96, 97, 98, 19, 29, 39, 49]);
export const INVALID_TEETH_SAMPLES = Object.freeze([-99, -5, -1, 0, 9, 10, 20, 30, 40, 49, 50, 56, 76, 86, 99, 100, 111, 999]);

export const CANONICAL_PATHOLOGY_CODES_RU: Record<ToothPathologyType, string> = {
	caries: "C",
	pulpitis: "P",
	periodontitis: "Pt",
	devitalized: "Э",
	resorcin_formalin: "РФ",
	calcium_hydroxide: "Са",
	broken_instrument: "Ин",
	perforation: "Пф",
	composite_sound: "П",
	composite_defective: "Пд",
	inlay_onlay: "Вкл",
	crown: "К",
	post_and_core: "СВШ",
	implant: "И",
	healing_abutment: "ФД",
	screw_crown: "Ив",
	cement_crown: "Ик",
	extracted: "О",
	retained: "Рет",
	wedge_defect: "Кл",
	pathological_wear: "Ст",
	tartar: "Км",
	crack: "Тр",
	healthy: "✓",
};

export class FdiToothFuzzer {
	private prng: FastPrng;

	constructor(prng?: FastPrng) {
		this.prng = prng ?? new FastPrng(20261106);
	}

	/**
	 * Generates a complete adult dentition (32 teeth) with realistic stochastic distribution of pathologies.
	 */
	generatePermanentFormula(pathologyRate = 0.35): Map<number, FuzzToothRecord> {
		const formula = new Map<number, FuzzToothRecord>();
		for (const toothNumber of PERMANENT_TEETH) {
			const hasPathology = this.prng.boolean(pathologyRate);
			const record = this.generateToothRecord(toothNumber, hasPathology);
			formula.set(toothNumber, record);
		}
		return formula;
	}

	/**
	 * Generates a primary/deciduous dentition (20 teeth).
	 */
	generateDeciduousFormula(pathologyRate = 0.25): Map<number, FuzzToothRecord> {
		const formula = new Map<number, FuzzToothRecord>();
		for (const toothNumber of DECIDUOUS_TEETH) {
			const hasPathology = this.prng.boolean(pathologyRate);
			const record = this.generateToothRecord(toothNumber, hasPathology);
			formula.set(toothNumber, record);
		}
		return formula;
	}

	/**
	 * Generates mixed dentition (сменный прикус) with biological succession logic.
	 * Child age 6-12 years: incisors & first molars are permanent, canines & molars may be primary.
	 */
	generateMixedDentitionFormula(): Map<number, FuzzToothRecord> {
		const formula = new Map<number, FuzzToothRecord>();
		// Pairings of primary teeth with their permanent successors
		const successionPairs: Array<{ primary: number; permanent: number }> = [
			{ primary: 51, permanent: 11 }, { primary: 52, permanent: 12 }, { primary: 53, permanent: 13 },
			{ primary: 54, permanent: 14 }, { primary: 55, permanent: 15 },
			{ primary: 61, permanent: 21 }, { primary: 62, permanent: 22 }, { primary: 63, permanent: 23 },
			{ primary: 64, permanent: 24 }, { primary: 65, permanent: 25 },
			{ primary: 71, permanent: 31 }, { primary: 72, permanent: 32 }, { primary: 73, permanent: 33 },
			{ primary: 74, permanent: 34 }, { primary: 75, permanent: 35 },
			{ primary: 81, permanent: 41 }, { primary: 82, permanent: 42 }, { primary: 83, permanent: 43 },
			{ primary: 84, permanent: 44 }, { primary: 85, permanent: 45 },
		];

		// Permanent first molars (16, 26, 36, 46) always present in mixed dentition
		for (const molar of [16, 26, 36, 46]) {
			formula.set(molar, this.generateToothRecord(molar, this.prng.boolean(0.3)));
		}

		// For each succession pair, choose either primary or permanent (or rarely absent)
		for (const pair of successionPairs) {
			const state = this.prng.choice(["primary", "permanent", "shedding"] as const);
			if (state === "permanent") {
				formula.set(pair.permanent, this.generateToothRecord(pair.permanent, this.prng.boolean(0.2)));
			} else if (state === "primary") {
				formula.set(pair.primary, this.generateToothRecord(pair.primary, this.prng.boolean(0.25)));
			}
			// if shedding, tooth is temporarily missing during physiological change
		}

		return formula;
	}

	/**
	 * Generates Kennedy classification edentulous arch (Class I, II, III, or IV).
	 */
	generateKennedyArch(kennedyClass: 1 | 2 | 3 | 4, arch: "upper" | "lower" = "lower"): Map<number, FuzzToothRecord> {
		const formula = new Map<number, FuzzToothRecord>();
		const baseTeeth = arch === "upper"
			? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
			: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

		const missingTeeth = new Set<number>();

		switch (kennedyClass) {
			case 1: // Bilateral distal extension (двусторонние концевые дефекты: molars/premolars missing on both sides)
				if (arch === "lower") {
					[48, 47, 46, 36, 37, 38].forEach((t) => missingTeeth.add(t));
				} else {
					[18, 17, 16, 26, 27, 28].forEach((t) => missingTeeth.add(t));
				}
				break;
			case 2: // Unilateral distal extension (односторонний концевой дефект)
				if (arch === "lower") {
					[48, 47, 46].forEach((t) => missingTeeth.add(t));
				} else {
					[18, 17, 16].forEach((t) => missingTeeth.add(t));
				}
				break;
			case 3: // Unilateral bounded defect (односторонний включенный дефект)
				if (arch === "lower") {
					[46, 45].forEach((t) => missingTeeth.add(t));
				} else {
					[16, 15].forEach((t) => missingTeeth.add(t));
				}
				break;
			case 4: // Single anterior bilateral defect crossing midline (включенный дефект фронта)
				if (arch === "lower") {
					[42, 41, 31, 32].forEach((t) => missingTeeth.add(t));
				} else {
					[12, 11, 21, 22].forEach((t) => missingTeeth.add(t));
				}
				break;
		}

		for (const t of baseTeeth) {
			if (missingTeeth.has(t)) {
				formula.set(t, {
					toothNumber: t,
					dentition: "permanent",
					quadrant: Math.floor(t / 10),
					status: "extracted",
					statusCodeRu: "О",
					surfaces: [],
				});
			} else {
				formula.set(t, this.generateToothRecord(t, false));
			}
		}

		return formula;
	}

	/**
	 * Generates a malformed, fuzzy shorthand string to stress-test dental formula text parsers.
	 */
	generateFuzzyShorthandToken(): { text: string; expectedValidTeeth: number[] } {
		const scenario = this.prng.nextInt(1, 7);
		const validTeeth = [...ALL_FDI_TEETH];
		const dirtySeparators = [" ", ",", ";", " - ", ":", " = ", "/", "\\", "\t", "   "];
		const junkCharacters = ["@", "#", "$", "%", "*", "(", ")", "[", "]", "~", "`", "!", "?", "💩", "⚠️"];

		// Cyrillic and Latin homoglyphs for substitution
		const homoglyphs: Record<string, string[]> = {
			c: ["с", "C", "С"],
			o: ["о", "O", "О", "0"],
			p: ["р", "P", "Р"],
			k: ["к", "K", "К"],
			a: ["а", "A", "А"],
		};

		switch (scenario) {
			case 1: {
				// Pure whitespace & junk bomb
				const junk = Array.from({ length: this.prng.nextInt(1, 10) }, () => this.prng.choice(junkCharacters)).join("");
				const spaces = " ".repeat(this.prng.nextInt(1, 50));
				return { text: `${spaces}${junk}${spaces}`, expectedValidTeeth: [] };
			}
			case 2: {
				// Valid tooth with homoglyph corrupted status
				const tooth = this.prng.choice(validTeeth);
				let code = this.prng.choice(["к", "кариес", "п", "пломба", "пт", "пульпит", "о", "удален"]);
				const firstChar = code[0]!.toLowerCase();
				if (homoglyphs[firstChar]) {
					code = this.prng.choice(homoglyphs[firstChar]!) + code.slice(1);
				}
				const sep = this.prng.choice(dirtySeparators);
				return { text: `${tooth}${sep}${code}`, expectedValidTeeth: [tooth] };
			}
			case 3: {
				// Completely invalid tooth number (e.g. 99, 0, -5) with code
				const badTooth = this.prng.choice(INVALID_TEETH_SAMPLES);
				const code = this.prng.choice(["к", "п", "о"]);
				const sep = this.prng.choice(dirtySeparators);
				return { text: `${badTooth}${sep}${code}`, expectedValidTeeth: [] };
			}
			case 4: {
				// Tooth + surfaces + status + junk
				const tooth = this.prng.choice(validTeeth);
				const surfaces = this.prng.choice(["мод", "до", "мо", "оккл", "вест"]);
				const code = this.prng.choice(["кариес", "пломба", "к", "п"]);
				const prefix = this.prng.choice(junkCharacters);
				const suffix = this.prng.choice(junkCharacters);
				return { text: `${prefix} ${tooth} ${surfaces} ${code} ${suffix}`, expectedValidTeeth: [tooth] };
			}
			case 5: {
				// Inverted syntax: status first, then comma-separated teeth
				const code = this.prng.choice(["кариес", "к", "пломба", "п"]);
				const t1 = this.prng.choice(validTeeth);
				const t2 = this.prng.choice(validTeeth);
				return { text: `${code} ${t1}, ${t2}`, expectedValidTeeth: [t1, t2] };
			}
			case 6: {
				// Supernumerary tooth (e.g. 91, 19)
				const supTooth = this.prng.choice(SUPERNUMERARY_TEETH_SAMPLES);
				return { text: `${supTooth} рет`, expectedValidTeeth: [] };
			}
			case 7:
			default: {
				// Mixed sequence with valid and bad teeth
				const tGood1 = this.prng.choice(validTeeth);
				const tBad = this.prng.choice(INVALID_TEETH_SAMPLES);
				const tGood2 = this.prng.choice(validTeeth);
				return { text: `${tGood1}к, ${tBad}п, ${tGood2}о`, expectedValidTeeth: [tGood1, tGood2] };
			}
		}
	}

	private generateToothRecord(toothNumber: number, hasPathology: boolean): FuzzToothRecord {
		const isDeciduous = toothNumber >= 51 && toothNumber <= 85;
		const quadrant = Math.floor(toothNumber / 10);

		if (!hasPathology) {
			return {
				toothNumber,
				dentition: isDeciduous ? "deciduous" : "permanent",
				quadrant,
				status: "healthy",
				statusCodeRu: CANONICAL_PATHOLOGY_CODES_RU.healthy,
				surfaces: [],
			};
		}

		const pathologyPool: ToothPathologyType[] = [
			"caries", "caries", "caries",
			"pulpitis", "periodontitis",
			"composite_sound", "composite_defective",
			"crown", "implant", "extracted",
			"wedge_defect", "pathological_wear",
		];

		const status = this.prng.choice(pathologyPool);
		const surfaces = this.generateSurfacesForTooth(toothNumber, status);

		let blackClass: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
		let cariesDepth: 1 | 2 | 3 | 4 | undefined;
		let crownMaterial: "Zr" | "MK" | "Em" | "Au" | "CoCr" | "PMMA" | undefined;
		let postType: "СВШ" | "КШВ" | undefined;

		if (status === "caries") {
			cariesDepth = this.prng.choice([1, 2, 3, 4] as const);
			const toothClass = getWheelerToothClass(toothNumber);
			if (toothClass === "molar" || toothClass === "premolar") {
				blackClass = this.prng.choice([1, 2, 5, 6] as const);
			} else {
				blackClass = this.prng.choice([3, 4, 5, 6] as const);
			}
		} else if (status === "crown") {
			crownMaterial = this.prng.choice(["Zr", "MK", "Em", "Au", "CoCr", "PMMA"] as const);
		} else if (status === "devitalized") {
			postType = this.prng.choice(["СВШ", "КШВ"] as const);
		}

		return {
			toothNumber,
			dentition: isDeciduous ? "deciduous" : "permanent",
			quadrant,
			status,
			statusCodeRu: CANONICAL_PATHOLOGY_CODES_RU[status],
			surfaces,
			blackClass,
			cariesDepth,
			crownMaterial,
			postType,
		};
	}

	private generateSurfacesForTooth(toothNumber: number, status: ToothPathologyType): CanonicalSurfaceKey[] {
		if (status === "healthy" || status === "extracted" || status === "implant") {
			return [];
		}

		const toothClass = getWheelerToothClass(toothNumber);
		if (toothClass === "molar" || toothClass === "premolar") {
			const preset = this.prng.choice([
				["O"],
				["M", "O"],
				["D", "O"],
				["M", "O", "D"],
				["V"],
				["L"],
				["C"],
			] as const);
			return [...preset];
		}

		// Incisors & canines (cutting edge C, approximal M, D, vestibular V, lingual L)
		const anteriorPreset = this.prng.choice([
			["M"],
			["D"],
			["M", "D"],
			["V"],
			["L"],
			["C"],
		] as const);
		return [...anteriorPreset];
	}
}

// ============================================================================
// 3. FINANCIAL SPLITS, BIGINT KOPECKS & DISCOUNT ARITHMETIC FUZZER
// ============================================================================

export interface FuzzSplitScenario {
	readonly totalAmountKopecks: bigint;
	readonly participantCount: number;
	readonly splits: readonly bigint[];
	readonly doctorDiscountBasisPoints: number; // 0..10000 (0%..100%)
	readonly discountKopecks: bigint;
	readonly payableKopecks: bigint;
	readonly isValidStrictSum: boolean;
	readonly maxDisparityKopecks: bigint;
}

export class BillingMathFuzzer {
	private prng: FastPrng;

	constructor(prng?: FastPrng) {
		this.prng = prng ?? new FastPrng(424242);
	}

	/**
	 * Generates a stochastic split payment scenario from 1 kopeck up to 100 000 000 rubles.
	 * Tests Mandate 8b (exact kopecks) and Mandate 8e (doctor discounts up to 100%).
	 */
	generateSplitScenario(): FuzzSplitScenario {
		// Amount from 1 kopeck to 100 000 000.00 rubles (10 000 000 000 kopecks)
		const totalAmountKopecks = this.prng.nextBigInt(1n, 10_000_000_000n);
		const participantCount = this.prng.nextInt(2, 10);
		const doctorDiscountBasisPoints = this.prng.nextInt(0, 10000); // 0.00% to 100.00%

		// Calculate doctor discount exactly in BigInt
		const discountKopecks = (totalAmountKopecks * BigInt(doctorDiscountBasisPoints)) / 10000n;
		const payableKopecks = totalAmountKopecks - discountKopecks;

		// Exact integer split of payableKopecks among participants
		const splits: bigint[] = [];
		if (payableKopecks === 0n) {
			for (let i = 0; i < participantCount; i++) splits.push(0n);
		} else {
			const base = payableKopecks / BigInt(participantCount);
			const remainder = payableKopecks % BigInt(participantCount);
			for (let i = 0; i < participantCount; i++) {
				const extra = BigInt(i) < remainder ? 1n : 0n;
				splits.push(base + extra);
			}
		}

		// Sum invariant check
		const sumSplits = splits.reduce((acc, v) => acc + v, 0n);
		const isValidStrictSum = sumSplits === payableKopecks;

		const minPart = splits.reduce((m, v) => (v < m ? v : m), splits[0] ?? 0n);
		const maxPart = splits.reduce((m, v) => (v > m ? v : m), splits[0] ?? 0n);
		const maxDisparityKopecks = maxPart - minPart;

		return {
			totalAmountKopecks,
			participantCount,
			splits,
			doctorDiscountBasisPoints,
			discountKopecks,
			payableKopecks,
			isValidStrictSum,
			maxDisparityKopecks,
		};
	}

	/**
	 * Generates multi-tender test case matching 54-FZ FFD 1.2 rules.
	 */
	generateMultiTenderCheckout(actKopecks: number): {
		cashKop: number;
		cardKop: number;
		sbpKop: number;
		depositKop: number;
		creditKop: number;
	} {
		if (actKopecks <= 0) {
			return { cashKop: 0, cardKop: 0, sbpKop: 0, depositKop: 0, creditKop: 0 };
		}

		let rem = actKopecks;
		const cashKop = this.prng.nextInt(0, rem);
		rem -= cashKop;

		const cardKop = this.prng.nextInt(0, rem);
		rem -= cardKop;

		const sbpKop = this.prng.nextInt(0, rem);
		rem -= sbpKop;

		const depositKop = this.prng.nextInt(0, rem);
		rem -= depositKop;

		const creditKop = rem; // Remainder guarantees sum === actKopecks

		return { cashKop, cardKop, sbpKop, depositKop, creditKop };
	}
}

// ============================================================================
// 4. DIRTY PRICELISTS & NOMENCLATURE 804N FUZZER
// ============================================================================

export interface FuzzPricelistRow {
	readonly rowNumber: number;
	readonly rawCells: string[];
	readonly expectedStatus: "valid" | "warning" | "error";
	readonly errorField?: "title" | "price" | undefined;
}

export class PricelistFuzzer {
	private prng: FastPrng;

	constructor(prng?: FastPrng) {
		this.prng = prng ?? new FastPrng(998877);
	}

	/**
	 * Generates a dirty tabular pricelist of N rows with realistic clinic chaos:
	 * Soviet prices (1500-00), missing titles, extreme lengths, invalid 804n codes, emojis, non-breaking spaces.
	 */
	generateDirtyPricelist(rowCount: number, vendorSignature?: PricelistVendorSignature): string[][] {
		const signature = vendorSignature ?? this.prng.choice(["ident", "dentalpro", "istom", "1c_medicina", "generic_table"] as const);
		const headers = this.getHeadersForSignature(signature);

		const rows: string[][] = [headers];

		for (let i = 0; i < rowCount; i++) {
			const row = this.generateDirtyRow(signature);
			rows.push(row);
		}

		return rows;
	}

	private getHeadersForSignature(sig: PricelistVendorSignature): string[] {
		switch (sig) {
			case "1c_medicina":
				return ["КодНоменклатуры", "Номенклатура", "ГруппаНоменклатуры", "Цена", "Артикул"];
			case "ident":
				return ["Артикул", "Группа", "Наименование", "Цена", "Себестоимость", "Гарантия"];
			case "dentalpro":
				return ["Код", "Категория", "Услуга", "Стоимость", "Время"];
			case "istom":
				return ["Код услуги", "Раздел", "Наименование услуги", "Тариф"];
			case "generic_table":
			default:
				return ["Код 804н", "Наименование услуги", "Раздел", "Цена (руб)", "Длительность (мин)"];
		}
	}

	private generateDirtyRow(sig: PricelistVendorSignature): string[] {
		const scenario = this.prng.nextInt(1, 8);

		const valid804n = ["A16.07.002", "A16.07.008", "A16.07.025", "B01.065.001", "A11.07.012"];
		const validTitles = [
			"Прием (осмотр, консультация) врача-стоматолога первичный",
			"Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов",
			"Удаление постоянного зуба простое",
			"Профессиональная гигиена полости рта и зубов",
			"Установка имплантата Osstem TS III (Южная Корея)",
		];
		const validCategories = ["Терапия", "Хирургия", "Ортопедия", "Ортодонтия", "Гигиена", "Диагностика"];

		let code = this.prng.choice(valid804n);
		let title = this.prng.choice(validTitles);
		let category = this.prng.choice(validCategories);
		let price = String(this.prng.nextInt(500, 150000));

		switch (scenario) {
			case 1: {
				// Extreme length title (up to 2000 chars) + non-breaking spaces
				title = `${title} ` + " очень длинное клиническое описание услуги ".repeat(40);
				break;
			}
			case 2: {
				// Empty / whitespace title (must trigger error)
				title = "   \t   ";
				break;
			}
			case 3: {
				// Russian accounting price notation: "1500-00", "2 500,50 руб.", "от 3000 руб."
				const baseNum = this.prng.nextInt(1000, 50000);
				price = this.prng.choice([
					`${baseNum}-00`,
					`${baseNum},50 руб.`,
					`от ${baseNum} ₽`,
					`  ${baseNum} руб  `,
					"0 руб",
					"бесплатно",
				]);
				break;
			}
			case 4: {
				// Negative price (must trigger validation error)
				price = `-${this.prng.nextInt(100, 5000)}`;
				break;
			}
			case 5: {
				// Contract / variable price (must fail fixed price parsing)
				price = "по договоренности";
				break;
			}
			case 6: {
				// Cyrillic homoglyph in 804n code (e.g. Cyrillic 'А' instead of Latin 'A')
				code = `а16.07.${this.prng.nextInt(100, 999)}`;
				break;
			}
			case 7: {
				// Special characters, emojis, quotes in title
				title = `«${title}» (VITA A3/A3.5) 💎 спец-акция! [2026]`;
				break;
			}
			case 8: {
				// Zero/Free warranty case
				price = "0";
				break;
			}
		}

		if (sig === "1c_medicina") {
			return [code, title, category, price, `ART-${this.prng.nextInt(100, 999)}`];
		}
		if (sig === "ident") {
			return [code, category, title, price, "350", "12"];
		}
		if (sig === "dentalpro") {
			return [code, category, title, price, "45"];
		}
		if (sig === "istom") {
			return [code, category, title, price];
		}
		return [code, title, category, price, "30"];
	}
}

// ============================================================================
// 5. SANPIN DATES & STERILITY SHELF LIFE FUZZER
// ============================================================================

export interface FuzzSanpinDateScenario {
	readonly packDateStr: string;
	readonly packagingType: SanpinPackagingMaterialId;
	readonly referenceDateStr: string;
	readonly isLeapYearPackDate: boolean;
	readonly expectedStatus: PackageSterilityStatus;
	readonly isRangeErrorImmune: boolean;
}

export class SanpinDatesFuzzer {
	private prng: FastPrng;

	constructor(prng?: FastPrng) {
		this.prng = prng ?? new FastPrng(123456);
	}

	/**
	 * Safe wrapper for calculatePackageExpiryDate protecting against RangeError on invalid dates.
	 */
	safeCalculateExpiry(
		packDateInput: string | Date,
		packagingType: SanpinPackagingMaterialId,
		options?: { customDays?: number | undefined; referenceDate?: string | Date | undefined },
	): { success: boolean; result?: PackageExpiryCalculationResult; error?: string } {
		try {
			// Validate that date inputs produce valid timestamps before ISO conversion
			const pDate = typeof packDateInput === "string" ? new Date(packDateInput) : packDateInput;
			if (Number.isNaN(pDate.getTime())) {
				return { success: false, error: "Invalid packDate timestamp" };
			}

			if (options?.referenceDate) {
				const rDate = typeof options.referenceDate === "string" ? new Date(options.referenceDate) : options.referenceDate;
				if (Number.isNaN(rDate.getTime())) {
					return { success: false, error: "Invalid referenceDate timestamp" };
				}
			}

			const res = calculatePackageExpiryDate(packDateInput, packagingType, options);
			return { success: true, result: res };
		} catch (err: unknown) {
			return { success: false, error: String(err) };
		}
	}

	/**
	 * Generates leap year, century boundary, and malformed date scenarios.
	 */
	generateDateScenario(): FuzzSanpinDateScenario {
		const scenario = this.prng.nextInt(1, 6);
		const packagingType = this.prng.choice(
			SANPIN_PACKAGING_MATERIALS.map((m) => m.id),
		);

		let packDateStr = "2024-05-15T10:00:00.000Z";
		let referenceDateStr = "2024-05-20T10:00:00.000Z";
		let isLeapYear = false;

		switch (scenario) {
			case 1: {
				// Leap Year: February 29th (e.g. 2024, 2028, 2000)
				const leapYear = this.prng.choice([2000, 2024, 2028, 2032]);
				packDateStr = `${leapYear}-02-29T08:00:00.000Z`;
				referenceDateStr = `${leapYear}-03-05T08:00:00.000Z`;
				isLeapYear = true;
				break;
			}
			case 2: {
				// Non-leap century boundary (1900 or 2100 are NOT leap years)
				const nonLeapCentury = this.prng.choice([1900, 2100]);
				packDateStr = `${nonLeapCentury}-02-28T08:00:00.000Z`;
				referenceDateStr = `${nonLeapCentury}-03-01T08:00:00.000Z`;
				isLeapYear = false;
				break;
			}
			case 3: {
				// Century transition: Dec 31 -> Jan 01
				packDateStr = "1999-12-31T23:59:59.000Z";
				referenceDateStr = "2000-01-05T08:00:00.000Z";
				isLeapYear = false;
				break;
			}
			case 4: {
				// Negative interval: packDate in the future relative to referenceDate
				packDateStr = "2026-06-01T08:00:00.000Z";
				referenceDateStr = "2026-05-01T08:00:00.000Z";
				break;
			}
			case 5: {
				// Distant expiration (e.g. year 2050)
				packDateStr = "2024-01-01T08:00:00.000Z";
				referenceDateStr = "2050-01-01T08:00:00.000Z";
				break;
			}
			case 6: {
				// Malformed date string (must be caught safely without RangeError crash)
				packDateStr = this.prng.choice(["invalid-date-str", "2024-13-45", "", "yesterday"]);
				referenceDateStr = "2024-05-20T10:00:00.000Z";
				break;
			}
		}

		const safeCalc = this.safeCalculateExpiry(packDateStr, packagingType, { referenceDate: referenceDateStr });
		const expectedStatus: PackageSterilityStatus = safeCalc.success && safeCalc.result
			? safeCalc.result.status
			: "expired";

		return {
			packDateStr,
			packagingType,
			referenceDateStr,
			isLeapYearPackDate: isLeapYear,
			expectedStatus,
			isRangeErrorImmune: true,
		};
	}
}
