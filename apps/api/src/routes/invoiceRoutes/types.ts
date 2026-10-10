/**
 * DENTE Dental CRM — Invoices & Work Order Billing Schemas and Types (Feature #41).
 */

import { z } from "zod";
import type { getActivePriceFreezeToken } from "../../db/priceFreezeTokensQuery.js";
import type { getServiceCatalogForOrganization } from "../../db/pricelistQuery.js";
import type {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema/clinical.js";
import type { patients } from "../../db/schema/patients.js";

export const validatePlanBodySchema = z.object({
	planId: z.string().min(1),
	planNumber: z.string().optional(),
	planTitle: z.string().optional(),
	patientId: z.string().min(1),
	patientName: z.string().optional(),
	doctorId: z.string().optional(),
	doctorFullName: z.string().optional(),
	planCreatedAtIso: z.string(),
	approvedAtIso: z.string().nullable().optional(),
	isSignedWithPatient: z.boolean().optional(),
	validityDaysLimit: z.number().int().positive().optional(),
	inflationThresholdPercent: z.number().int().positive().optional(),
	items: z.array(
		z.object({
			itemId: z.string().min(1),
			toothNumber: z.union([z.number().int(), z.string()]).nullable().optional(),
			tooth_number: z.union([z.number().int(), z.string()]).nullable().optional(),
			surfaces: z.array(z.string()).optional(),
			code804n: z.string().min(1),
			nameRu: z.string().min(1),
			categoryRu: z.string().optional(),
			quantity: z.number().int().positive().default(1),
			planUnitPriceKopecks: z.number().int().nonnegative(),
			planDiscountKopecks: z.number().int().nonnegative().optional(),
			serviceId: z.string().optional(),
			stageId: z.string().optional(),
			stageTitleRu: z.string().optional(),
			doctorId: z.string().uuid().optional().nullable(),
		}),
	),
	itemResolutionOverrides: z.record(z.string(), z.string()).optional(),
	itemAnalogueSelections: z.record(z.string(), z.string()).optional(),
	adminOverrideAuthorized: z.boolean().optional(),
	adminOverrideStaffName: z.string().optional(),
	adminOverrideReason: z.string().optional(),
});

export const generateInvoiceFromPlanSchema = z.object({
	patientId: z.string().uuid(),
	planId: z.string().optional(),
	planNumber: z.string().optional(),
	planTitle: z.string().optional(),
	planCreatedAtIso: z.string().optional(),
	approvedAtIso: z.string().nullable().optional(),
	isSignedWithPatient: z.boolean().optional(),
	doctorUserId: z.string().uuid().optional(),
	documentType: z.enum(["invoice", "work_order", "completed_act"]).default("invoice"),
	items: z
		.array(
			z.object({
				itemId: z.string().optional(),
				toothNumber: z.union([z.number().int(), z.string()]).nullable().optional(),
				tooth_number: z.union([z.number().int(), z.string()]).nullable().optional(),
				surfaces: z.array(z.string()).optional().default([]),
				code804n: z.string().optional(),
				nameRu: z.string().min(1),
				categoryRu: z.string().optional(),
				quantity: z.number().int().positive().default(1),
				planUnitPriceRub: z.number().nonnegative().optional(),
				effectiveUnitPriceRub: z.number().nonnegative().optional(),
				unitPriceRub: z.number().nonnegative().optional(),
				discountRub: z.number().nonnegative().optional(),
				resolutionPolicy: z.string().default("LOCK_ORIGINAL_PRICE"),
				serviceId: z.string().optional(),
				analogueServiceId: z.string().optional(),
				doctorId: z.string().uuid().optional().nullable(),
			}),
		)
		.min(1),
	adminOverridePin: z.string().optional(),
	adminOverrideReason: z.string().optional(),
	allowUnplannedServices: z.boolean().optional().default(false),
	notes: z.string().optional(),
});

export const invoiceListQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
});

export type ValidatePlanBody = z.infer<typeof validatePlanBodySchema>;
export type GenerateInvoiceFromPlanBody = z.infer<typeof generateInvoiceFromPlanSchema>;
export type GenerateInvoiceItemInput = GenerateInvoiceFromPlanBody["items"][number];
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

export type CatalogRow = Awaited<ReturnType<typeof getServiceCatalogForOrganization>>[number];
export type PriceFreezeTokenResult = Awaited<ReturnType<typeof getActivePriceFreezeToken>>;
export type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
export type TreatmentPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;
export type PatientRow = typeof patients.$inferSelect;
