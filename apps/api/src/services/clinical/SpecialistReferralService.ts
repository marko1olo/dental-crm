import { insertClinicalTaskInDb } from "../../db/clinicalTasksQuery.js";
import type { ClinicalTaskRecord } from "../../db/clinicalTasksQuery.js";

export const REFERRAL_TYPES = [
	"consultation",
	"treatment_stage",
	"urgent_surgical",
	"diagnostic_ct",
] as const;

export type ReferralType = (typeof REFERRAL_TYPES)[number];

export const REFERRAL_PRIORITIES = ["routine", "urgent", "emergency"] as const;
export type ReferralPriority = (typeof REFERRAL_PRIORITIES)[number];

export const REFERRAL_STATUSES = [
	"created",
	"scheduled",
	"consulted",
	"completed",
	"declined",
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export interface SpecialistReferralInput {
	organizationId: string;
	patientId: string;
	referralType: ReferralType;
	priority: ReferralPriority;
	assignedDoctorId?: string | null;
	treatmentPlanId?: string | null;
	notes?: string | null;
	toothCodes?: readonly string[];
	diagnosisIcd10?: string | null;
}

/**
 * Сервис для управления направлениями к смежным специалистам.
 * Использует таблицу clinical_tasks для хранения состояний направлений.
 */
export const dbWrapper = {
	insertClinicalTaskInDb,
};

export class SpecialistReferralService {
	public async createReferral(
		input: SpecialistReferralInput,
	): Promise<ClinicalTaskRecord> {
		const description = this.buildDescription(input);

		return await dbWrapper.insertClinicalTaskInDb(input.organizationId, {
			patientId: input.patientId,
			taskType: `referral:${input.referralType}`,
			title: `Направление: ${this.getReferralTypeName(input.referralType)} (${input.priority})`,
			description,
			treatmentPlanId: input.treatmentPlanId ?? null,
			assignedDoctorId: input.assignedDoctorId ?? null,
			status: "pending", // Mapping 'created' to DB status
		});
	}

	private buildDescription(input: SpecialistReferralInput): string {
		const lines: string[] = [];
		if (input.diagnosisIcd10) {
			lines.push(`Предварительный диагноз МКБ-10: ${input.diagnosisIcd10}`);
		}
		if (input.toothCodes && input.toothCodes.length > 0) {
			lines.push(`Зубы: ${input.toothCodes.join(", ")}`);
		}
		if (input.notes) {
			lines.push(`Комментарий: ${input.notes}`);
		}
		return lines.join("\n");
	}

	private getReferralTypeName(type: ReferralType): string {
		switch (type) {
			case "consultation":
				return "Консультация";
			case "treatment_stage":
				return "Этап лечения";
			case "urgent_surgical":
				return "Срочная хирургия";
			case "diagnostic_ct":
				return "КТ-диагностика";
			default:
				return type;
		}
	}
}
