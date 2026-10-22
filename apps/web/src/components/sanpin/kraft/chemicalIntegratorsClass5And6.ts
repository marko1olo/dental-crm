import { CHEMICAL_INTEGRATORS_CLASS_5 } from "./chemicalIntegratorsClass5.js";
import { CHEMICAL_INTEGRATORS_CLASS_6 } from "./chemicalIntegratorsClass6.js";
import type { ChemicalIntegratorDefinition } from "./chemicalIntegratorsTypes.js";

export const CHEMICAL_INTEGRATORS_CLASS_5_AND_6: readonly ChemicalIntegratorDefinition[] = [
	...CHEMICAL_INTEGRATORS_CLASS_5,
	...CHEMICAL_INTEGRATORS_CLASS_6,
];
