import { z } from "zod";
import { labActorRoleSchema, autonomousLabStageSchema } from "@dental/shared";

export const createOrderBodySchema = z.object({
	branchName: z.string().optional(),
	patientFullName: z.string().min(2),
	doctorName: z.string().min(2),
	doctorTelegramChatId: z.string().optional(),
	labName: z.string().min(2),
	labTelegramChatId: z.string().optional(),
	teethFdi: z.array(z.number().int().min(11).max(85)).min(1),
	constructionType: z.enum([
		"single_crown", "bridge", "veneer", "inlay_onlay", "all_on_4_6",
		"all_on_arch", "implant_abutment", "clasp_denture", "aligner_nightguard",
		"aligners_nightguard", "endocrown", "custom",
	]),
	material: z.enum([
		"zirconia_multilayer", "emax_lithium_disilicate", "pfm_cocr",
		"pmma_temporary", "titanium_custom_abutment", "peek_biohpp",
		"biocompatible_3d_resin", "other",
	]),
	vitaShade: z.enum([
		"A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4",
		"C1", "C2", "C3", "C4", "D2", "D3", "D4", "BL1", "BL2", "BL3", "BL4",
	]),
	shadeNotes: z.string().optional(),
	impressionType: z.enum([
		"a_silicone", "c_silicone", "polyether", "hydrocolloid", "alginate",
		"digital_scan", "digital_scan_stl_ply", "pvs_silicone", "other",
	]),
	boxCount: z.number().int().min(1).default(1),
	digitalScanKey: z.string().optional(),
	patientAppointmentAt: z.string().datetime(),
	requiredDeliveryDeadlineAt: z.string().datetime().optional(),
	clinicTrayNumber: z.string().default("Лоток №1"),
});

export const scanAdvanceBodySchema = z.object({
	qrPayload: z.string().min(10),
	nextStage: autonomousLabStageSchema,
	actorRole: labActorRoleSchema,
	actorName: z.string().min(2),
	notes: z.string().optional(),
	photoProofUrl: z.string().url().optional(),
	assignedTray: z.string().optional(),
});

export const defectBodySchema = z.object({
	reportedByRole: labActorRoleSchema,
	reportedByName: z.string().min(2),
	reasonCategory: z.enum([
		"unclear_margin", "bubble_distortion", "shade_ambiguity",
		"scan_occlusion_gap", "ceramic_chipping", "fit_loose_tight", "other",
	]),
	description: z.string().min(5),
	proofPhotoUrl: z.string().url().optional(),
});
