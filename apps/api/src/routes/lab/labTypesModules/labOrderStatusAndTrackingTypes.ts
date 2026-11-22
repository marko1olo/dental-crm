import { labOrderMilestoneSchema, labPipeline5StageKeySchema } from "@dental/shared";
import { z } from "zod";
import type { LabOrderStatus } from "../../../db/labQuery.js";

export { mapStageOrStatusToMilestone } from "./labMilestoneMapper.js";

/**
 * Calculates deadline skipping weekends (Saturday & Sunday).
 */
export function calculateBusinessDaysDueDate(startDate: Date, businessDays = 5): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < businessDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

export const createLabOrderEventSchema = z.object({
	milestone: z
		.union([
			labOrderMilestoneSchema,
			labPipeline5StageKeySchema,
			z.literal("installed"),
			z.string().trim().min(1).max(64),
		])
		.default("submitted"),
	actorType: z
		.enum(["clinic_doctor", "dental_technician", "courier", "administrator"])
		.default("clinic_doctor"),
	actorId: z.string().uuid().optional().nullable(),
	actorName: z.string().trim().default("Сотрудник клиники"),
	notes: z.string().trim().max(1000).optional().nullable(),
	barcodeScanned: z.string().trim().optional().nullable(),
	photoUrls: z
		.array(z.string().url().or(z.string().startsWith("/")))
		.default([]),
	cadPreviewGlbUrl: z.string().trim().optional().nullable(),
});

/**
 * Вспомогательное сопоставление клинического этапа ЗТЛ на допустимый статус lab_orders.status.
 */
export function mapStageToLabOrderStatus(stage: string): LabOrderStatus | null {
	if (!stage) return null;
	const s = stage.trim().toLowerCase();
	switch (s) {
		case "draft":
			return "draft";
		case "sent":
		case "sent_to_lab":
		case "impression":
		case "impression_sent":
		case "impression_scan":
		case "scan_sent":
		case "слепок/скан":
			return "sent";
		case "in_progress":
		case "in_production":
		case "cad_design":
		case "cad_cam":
		case "model_cad_design":
		case "framework_fitting":
		case "каркас/примерка":
		case "ceramic_layering":
		case "нанесение керамики":
			return "in_progress";
		case "shipped":
		case "shipped_to_clinic":
		case "в пути":
		case "отправлен лабораторией":
			return "shipped";
		case "ready_in_clinic":
		case "in_clinic":
		case "delivered_to_clinic":
		case "готов в клинике":
		case "готовая работа":
		case "ready_fixation":
			return "ready_in_clinic";
		case "ready":
		case "final_glaze":
		case "glaze_finish":
		case "готов в зтл":
			return "ready";
		case "received":
		case "доставлен в клинику":
		case "получен клиникой":
			return "received";
		case "fitting":
		case "fitting_ready":
		case "fitting_scheduled":
		case "fitting_in_mouth":
		case "примерка":
		case "примерка во рту":
			return "fitting";
		case "fitted":
		case "припасован":
			return "fitted";
		case "refitting":
		case "rework":
		case "rejected_remake":
		case "correction_remake":
		case "correction_required":
		case "warranty_rework":
		case "переделка":
		case "рекламация":
			return "refitting";
		case "completed":
		case "seated":
		case "фиксация":
		case "patient_fixation":
		case "ready_fixation":
		case "fixed":
			return "completed";
		case "cancelled":
			return "cancelled";
		default:
			return null;
	}
}
