import { z } from "zod";

export const QC_ACCEPTANCE_STATUSES = ["accepted", "rejected_defect"] as const;
export type QCAcceptanceStatus = (typeof QC_ACCEPTANCE_STATUSES)[number];

export const REWORK_DEFECT_CATEGORIES = [
	"shade_mismatch",
	"occlusal_interference",
	"marginal_gap",
	"proximal_contact_tight",
	"proximal_contact_open",
	"aesthetic_shape_contour",
	"impression_distortion",
	"fracture_chipping",
	"other",
] as const;

export type ReworkDefectCategory = (typeof REWORK_DEFECT_CATEGORIES)[number];

export const qcChecklistSchema = z.object({
	marginalFit: z.boolean(),
	occlusalContacts: z.boolean(),
	vitaColorMatch: z.boolean(),
	seatingOnModel: z.boolean(),
	noCeramicChipping: z.boolean(),
	comments: z.string().optional(),
});

export type QCChecklist = z.infer<typeof qcChecklistSchema>;

export interface ReclamationAct {
	id: string;
	orderId: string;
	defectCategory: ReworkDefectCategory;
	description: string;
	deadline: Date;
	createdAt: Date;
}

export class ProstheticsQCAcceptanceService {
	public static validateChecklist(checklist: QCChecklist): {
		status: QCAcceptanceStatus;
		failedItems: string[];
	} {
		const failedItems: string[] = [];

		if (!checklist.marginalFit) failedItems.push("Краевое прилегание");
		if (!checklist.occlusalContacts) failedItems.push("Окклюзионные контакты");
		if (!checklist.vitaColorMatch) failedItems.push("Совпадение цвета VITA");
		if (!checklist.seatingOnModel) failedItems.push("Посадка на модели");
		if (!checklist.noCeramicChipping) failedItems.push("Отсутствие сколов");

		if (failedItems.length > 0) {
			return { status: "rejected_defect", failedItems };
		}
		return { status: "accepted", failedItems: [] };
	}

	public static createReclamationAct(
		orderId: string,
		defectCategory: ReworkDefectCategory,
		description: string,
		daysToFix: number,
	): ReclamationAct {
		const deadline = new Date();
		deadline.setDate(deadline.getDate() + daysToFix);

		return {
			id: `REC-${Date.now()}`,
			orderId,
			defectCategory,
			description,
			deadline,
			createdAt: new Date(),
		};
	}
}
