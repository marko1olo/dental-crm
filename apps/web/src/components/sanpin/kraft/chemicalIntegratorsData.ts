/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsData.ts
 *
 * Каталог химических индикаторов 4, 5 и 6 классов (СанПиН 3.3686-21, ГОСТ ISO 11140-1).
 */

import { CHEMICAL_INTEGRATORS_CLASS_4 } from "./chemicalIntegratorsClass4.js";
import { CHEMICAL_INTEGRATORS_CLASS_5 } from "./chemicalIntegratorsClass5.js";
import { CHEMICAL_INTEGRATORS_CLASS_6 } from "./chemicalIntegratorsClass6.js";
import type { ChemicalIntegratorDefinition } from "./chemicalIntegratorsTypes.js";

export * from "./chemicalIntegratorsTypes.js";

export const CHEMICAL_INTEGRATORS_CATALOG: readonly ChemicalIntegratorDefinition[] = [
	...CHEMICAL_INTEGRATORS_CLASS_4,
	...CHEMICAL_INTEGRATORS_CLASS_5,
	...CHEMICAL_INTEGRATORS_CLASS_6,
];
