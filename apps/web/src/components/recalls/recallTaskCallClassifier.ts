import type { ClinicalTaskCallType } from "@dental/shared";
import type { PatientRecallRecord } from "./recallRecordTypes";

export function determineTaskCallTypeForCandidate(c: PatientRecallRecord): ClinicalTaskCallType {
	if (c.taskCallType) return c.taskCallType;
	if (c.implantSurgeryDate || (c.clinicalNotes && /удалени|имплант|операци/i.test(c.clinicalNotes))) {
		return "learn_health";
	}
	if (c.clinicalNotes && /план лечения не начат/i.test(c.clinicalNotes)) {
		return "medplan_not_started";
	}
	if (c.clinicalNotes && /план лечения не закончен/i.test(c.clinicalNotes)) {
		return "medplan_not_finished";
	}
	if (c.status === "scheduled") {
		return "appointment_confirmation";
	}
	if (c.status === "declined") {
		return "appointment_refuse";
	}
	return "preventive_inspection";
}
