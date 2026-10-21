import type { labOrderMilestoneSchema } from "@dental/shared";
import type { z } from "zod";

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
		case "cad_cam":
		case "cam_production":
			return "cam_production";
		case "sintering_ceramic_layering":
		case "sintering_glaze":
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
			return "cad_intake_verified";
	}
}
