/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsData.ts
 * Каталог химических индикаторов 4, 5, 6 классов. Мандат 8b: строго <= 120 строк.
 */

import type { ChemicalIntegratorDefinition } from "./chemicalIntegratorsTypes.js";
import { CHEMICAL_INTEGRATORS_CLASS_4 } from "./chemicalIntegratorsClass4.js";
import { CHEMICAL_INTEGRATORS_CLASS_5 } from "./chemicalIntegratorsClass5.js";
import { CHEMICAL_INTEGRATORS_CLASS_6 } from "./chemicalIntegratorsClass6.js";

export * from "./chemicalIntegratorsClass4.js";
export * from "./chemicalIntegratorsClass5.js";
export * from "./chemicalIntegratorsClass6.js";

export const CHEMICAL_INTEGRATORS_CATALOG: readonly ChemicalIntegratorDefinition[] = [
	...CHEMICAL_INTEGRATORS_CLASS_4,
	...CHEMICAL_INTEGRATORS_CLASS_5,
	...CHEMICAL_INTEGRATORS_CLASS_6,
];
