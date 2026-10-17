import { CANONICAL_IMPLANT_SCREW_SEEDS } from "./implantScrewSeeds.js";
import { CANONICAL_BIOMATERIAL_SEEDS } from "./implantBiomaterialSeeds.js";

export { CANONICAL_IMPLANT_SCREW_SEEDS } from "./implantScrewSeeds.js";
export { CANONICAL_BIOMATERIAL_SEEDS } from "./implantBiomaterialSeeds.js";

/**
 * Канонические эталонные складские запасы имплантатов и хирургических расходников
 * для честного списания с реальными номерами партий (LOT) и сроками стерильности (Мандаты 8e, 8n).
 */
export const CANONICAL_IMPLANT_WAREHOUSE_SEEDS = [
	...CANONICAL_IMPLANT_SCREW_SEEDS,
	...CANONICAL_BIOMATERIAL_SEEDS,
];
