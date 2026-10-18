/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsData.ts
 *
 * Каталог химических индикаторов 4, 5 и 6 классов (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { CHEMICAL_INTEGRATORS_PART1 } from "./chemicalIntegratorsDataPart1";
import { CHEMICAL_INTEGRATORS_PART2 } from "./chemicalIntegratorsDataPart2";
import { CHEMICAL_INTEGRATORS_PART3 } from "./chemicalIntegratorsDataPart3";
import type { ChemicalIntegratorDefinition } from "./chemicalIntegratorsTypes";

export * from "./chemicalIntegratorsTypes";

export const CHEMICAL_INTEGRATORS_CATALOG: readonly ChemicalIntegratorDefinition[] = [
	...CHEMICAL_INTEGRATORS_PART1,
	...CHEMICAL_INTEGRATORS_PART2,
	...CHEMICAL_INTEGRATORS_PART3,
];
