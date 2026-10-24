/**
 * @dental/api/routes/anesthesia/schemas.ts
 * Anesthesia Request & Response Validation Schemas (Mandate 8b, <= 120 lines)
 */

import {
	anesthesiaTechniqueSchema,
	anestheticDrugSchema,
	asaClassificationSchema,
	vasoconstrictorRatioSchema,
	vitalSignsMeasurementSchema,
} from "@dental/shared";
import { z } from "zod";

export const createAnesthesiaLogBodySchema = z.object({
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	technique: anesthesiaTechniqueSchema.default("infiltration"),
	drug: anestheticDrugSchema.default("articaine"),
	drugBrandName: z.string().default("Ультракаин Д-С"),
	concentrationPct: z.number().positive().default(4.0),
	vasoconstrictor: vasoconstrictorRatioSchema.default("1:200000"),
	carpuleVolumeMl: z.number().positive().default(1.7),
	carpulesAdministered: z.number().positive().default(1.0),
	patientWeightKg: z.number().positive().default(70),
	patientAgeYears: z.number().int().nonnegative().optional().default(35),
	asaClass: asaClassificationSchema.optional().default("ASA_I"),
	hasCardiovascularDisease: z.boolean().optional().default(false),
	aspirationTestPositive: z.boolean().default(false),
	toothNumbers: z.array(z.number().int()).default([]),
	injectionSite: z.string().optional().nullable(),
	lotNumber: z.string().optional().nullable(),
	expirationDate: z.string().optional().nullable(),
	vitalsPre: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsIntra: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsPost: vitalSignsMeasurementSchema.optional().nullable(),
	notes: z.string().optional().nullable(),
	complications: z.string().optional().nullable(),
	autoDeductInventory: z.boolean().default(true),
	addToVisitEstimate: z.boolean().default(true),
});
