import { z } from "zod";
import { clinicModeSchema } from "./aiAndEgiszSchemas.js";

export {
	calculateDmsGuaranteeSplit,
	dmsSplitLineResultSchema,
	dmsSplitCalculationResultSchema,
	type DmsSplitCalculationItem,
	type DmsSplitLineResult,
	type DmsSplitCalculationResult,
} from "../insurance/dmsFranchiseEngine.js";

export const sovereignScalePresetIdSchema = z.enum([
	"solo_doctor",
	"standard_clinic",
	"network_center",
]);

export type SovereignScalePresetId = z.infer<
	typeof sovereignScalePresetIdSchema
>;

export const applyClinicScalePresetSchema = z.object({
	preset: sovereignScalePresetIdSchema,
	confirmResetExtraChairs: z.boolean().optional(),
});

export type ApplyClinicScalePresetInput = z.infer<
	typeof applyClinicScalePresetSchema
>;

export const updateClinicModeSchema = z.object({
	mode: clinicModeSchema,
});

export type UpdateClinicModeInput = z.infer<typeof updateClinicModeSchema>;
