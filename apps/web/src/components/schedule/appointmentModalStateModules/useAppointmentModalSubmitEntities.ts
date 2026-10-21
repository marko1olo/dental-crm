import type { ClinicStaffMember, DentalChair } from "@dental/shared";
import { isCitoAppointment } from "../../../utils/scheduleCollisionUtils";
import { isTechnicalBreakAppointment } from "../AppointmentModalQuickReasons";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";

export async function resolveEffectivePatientId(params: {
	patientId: string;
	isInlineNewPatient: boolean;
	newPatientFullName: string;
	newPatientPhone: string;
	patientSearchQuery: string;
	handleCreateInlinePatient: (data?: any) => Promise<any>;
	reason: string;
	comment: string;
	isCito: boolean;
}): Promise<string> {
	const { patientId, isInlineNewPatient, newPatientFullName, newPatientPhone, patientSearchQuery, handleCreateInlinePatient, reason, comment, isCito } = params;
	let effPatientId = patientId;

	if (isInlineNewPatient && !effPatientId && (newPatientFullName.trim() || newPatientPhone.trim())) {
		const created = await handleCreateInlinePatient();
		if (created?.id) effPatientId = created.id;
	} else if (!effPatientId && patientSearchQuery.trim()) {
		const q = patientSearchQuery.trim();
		const isPhone = /^[0-9+()-\s]+$/.test(q);
		const created = await handleCreateInlinePatient({
			fullName: isPhone ? `Пациент (${q})` : q,
			phone: isPhone ? q : null,
		});
		if (created?.id) effPatientId = created.id;
	}

	const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
	const effectivePatientId = effPatientId;
	if (!effectivePatientId && !isTechnicalBreak) {
		const isCitoActive = isCito || isCitoAppointment({ reason, comment }) || (reason ?? "").toLowerCase().includes("острая боль");
		const name = isCitoActive ? "Пациент с острой болью (CITO)" : patientSearchQuery.trim() || "Первичный пациент (Экспресс-запись)";
		const created = await handleCreateInlinePatient({ fullName: name });
		if (created?.id) effPatientId = created.id;
	}

	return effPatientId;
}

export function resolveEffectiveDoctorAndChair(params: {
	doctorUserId: string;
	dutyDoctorId: string | null;
	doctors: ClinicStaffMember[];
	isSoloDoctor: boolean;
	chairId: string;
	chairs: DentalChair[];
}): { effDoctorUserId: string; effChairId: string } {
	const { doctorUserId, dutyDoctorId, doctors, isSoloDoctor, chairId, chairs } = params;
	const effDoctorUserId = doctorUserId || dutyDoctorId || doctors[0]?.id || (isSoloDoctor ? "doctor-solo" : "doctor-default");
	let effChairId = chairId || (isSoloDoctor && chairs[0] ? chairs[0].id : "") || (chairs.length === 1 ? chairs[0]?.id : "") || "";
	if (!effChairId && effDoctorUserId) {
		const doc = doctors.find((d) => d.id === effDoctorUserId);
		if ((doc as any)?.preferredChairId) {
			const pref = chairs.find((c) => c.id === (doc as any).preferredChairId);
			if (pref) effChairId = pref.id;
		}
	}
	if (!effChairId) effChairId = chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
	return { effDoctorUserId, effChairId };
}
