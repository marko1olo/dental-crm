import { CANONICAL_KOREAN_IMPLANT_SEEDS } from "./implantScrewSeedsKorean.js";
import { CANONICAL_PREMIUM_IMPLANT_SEEDS } from "./implantScrewSeedsPremium.js";

export { CANONICAL_KOREAN_IMPLANT_SEEDS } from "./implantScrewSeedsKorean.js";
export { CANONICAL_PREMIUM_IMPLANT_SEEDS } from "./implantScrewSeedsPremium.js";

/**
 * Семена титановых винтовых имплантатов для складского модуля (Мандаты 8e, 8n).
 */
export const CANONICAL_IMPLANT_SCREW_SEEDS = [
	...CANONICAL_KOREAN_IMPLANT_SEEDS,
	...CANONICAL_PREMIUM_IMPLANT_SEEDS,
];
