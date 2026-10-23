/**
 * prescriptionPrintEngine.ts
 * Canonical re-export facade for prescription print engine (Mandates 8b, 8e, 8x).
 * Decomposed into modular units <= 120 lines in ./prescriptionPrint/.
 */

import {
	DENTAL_STATUTORY_MNN_CATALOG,
	validateDentalMnn,
	validateLatinRxSigna,
	type DentalMnnDefinition,
} from "../prescriptions/generator/prescriptionMnnCatalog";

export {
	validateDentalMnn,
	validateLatinRxSigna,
	DENTAL_STATUTORY_MNN_CATALOG,
	type DentalMnnDefinition,
};

export * from "./prescriptionPrint/index";
