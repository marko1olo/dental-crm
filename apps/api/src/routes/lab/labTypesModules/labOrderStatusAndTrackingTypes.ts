import { labOrderMilestoneSchema } from "@dental/shared";
import { z } from "zod";
import type { LabOrderStatus } from "../../../db/labQuery.js";

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
	milestone: labOrderMilestoneSchema.default("submitted"),
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
 * Вспомогательное сопоставление клинического этапа ЗТЛ на допустимый статус lab_orders.status (0042 CHECK).
 */
export function mapStageToLabOrderStatus(stage: string): LabOrderStatus | null {
	switch (stage) {
		case "sent_to_lab":
		case "sent":
		case "impression_scan":
		case "impression":
		case "scan":
		case "Слепок/Скан":
			return "sent";
		case "in_progress":
		case "model_cad_design":
		case "framework_wax_milling":
		case "sintering_ceramic_layering":
		case "final_glaze":
		case "framework_fitting":
		case "framework":
		case "Каркас/Примерка":
		case "ceramic_layering":
		case "ceramic":
		case "Нанесение керамики":
			return "in_progress";
		case "shipped":
		case "shipped_to_clinic":
			return "shipped";
		case "delivered_to_clinic":
		case "received":
		case "clinic_received":
		case "ready_in_clinic":
		case "ready":
		case "ready_work":
		case "Готовая работа":
			return "received";
		case "fitting":
		case "fitting_scheduled":
		case "fitting_in_mouth":
		case "correction_remake":
		case "warranty_rework":
		case "refitting":
			return "refitting";
		case "delivered_completed":
		case "completed":
		case "patient_fixation":
		case "fixation":
		case "Фиксация":
			return "completed";
		case "cancelled":
			return "cancelled";
		case "draft":
			return "draft";
		default:
			return null;
	}
}

/**
 * Сопоставление этапа или статуса на майлстоун для таблицы аудита labOrderEvents.
 */
export function mapStageOrStatusToMilestone(stageOrStatus: string): z.infer<typeof labOrderMilestoneSchema> {
	switch (stageOrStatus) {
		case "draft":
			return "draft";
		case "sent":
		case "sent_to_lab":
			return "submitted";
		case "in_progress":
			return "cad_intake_verified";
		case "model_cad_design":
		case "digital_design_cad":
			return "digital_design_cad";
		case "framework_wax_milling":
		case "cam_production":
			return "cam_production";
		case "sintering_ceramic_layering":
		case "sintering_crystallization":
			return "sintering_crystallization";
		case "final_glaze":
		case "ceramic_glaze_finish":
			return "ceramic_glaze_finish";
		case "shipped":
		case "shipped_courier":
			return "shipped_courier";
		case "received":
		case "delivered_to_clinic":
		case "clinic_received":
			return "clinic_received";
		case "fitting_scheduled":
		case "fitting_in_mouth":
		case "clinical_try_in":
			return "clinical_try_in";
		case "refitting":
		case "correction_remake":
		case "warranty_rework":
		case "refitting_remake":
			return "refitting_remake";
		case "delivered_completed":
		case "completed":
		case "final_cementation":
			return "final_cementation";
		case "closed_warranty":
			return "closed_warranty";
		case "cancelled":
			return "cancelled";
		default:
			return "submitted";
	}
}
