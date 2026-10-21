import type { Appointment, ClinicStaffMember, DentalChair } from "@dental/shared";
import { isCitoAppointment } from "../../../utils/scheduleCollisionUtils";
import {
	resolveEffectiveDoctorAndChair,
	resolveEffectivePatientId,
} from "./useAppointmentModalSubmitEntities";

export * from "./useAppointmentModalSubmitEntities";

interface HandleSaveParams {
	appointment: Appointment | null | undefined;
	isSaving: boolean;
	setIsSaving: (s: boolean) => void;
	setError: (e: string | null) => void;
	patientId: string;
	isInlineNewPatient: boolean;
	newPatientFullName: string;
	newPatientPhone: string;
	patientSearchQuery: string;
	handleCreateInlinePatient: (data?: any) => Promise<any>;
	doctorUserId: string;
	dutyDoctorId: string | null;
	doctors: ClinicStaffMember[];
	isSoloDoctor: boolean;
	chairId: string;
	chairs: DentalChair[];
	startsAtLocal: string;
	setStartsAtLocal: (s: string) => void;
	endsAtLocal: string;
	setEndsAtLocal: (s: string) => void;
	timezone: string;
	safeToDateTimeLocalValue: (iso: string, tz?: string | null) => string;
	safeFromDateTimeLocalValue: (val: string, tz?: string | null) => string;
	reason: string;
	comment: string;
	isCito: boolean;
	collision: any;
	assistantUserId: string | null;
	status: Appointment["status"];
	onSave: (id: string, payload: any) => Promise<boolean>;
	onClose: () => void;
}

export async function executeAppointmentModalSave(params: HandleSaveParams) {
	const {
		appointment, isSaving, setIsSaving, setError, patientId, isInlineNewPatient,
		newPatientFullName, newPatientPhone, patientSearchQuery, handleCreateInlinePatient,
		doctorUserId, dutyDoctorId, doctors, isSoloDoctor, chairId, chairs,
		startsAtLocal, setStartsAtLocal, endsAtLocal, setEndsAtLocal, timezone,
		safeToDateTimeLocalValue, safeFromDateTimeLocalValue, reason, comment,
		isCito, collision, assistantUserId, status, onSave, onClose,
	} = params;

	if (!appointment || isSaving) return;

	const effPatientId = await resolveEffectivePatientId({
		patientId, isInlineNewPatient, newPatientFullName, newPatientPhone,
		patientSearchQuery, handleCreateInlinePatient, reason, comment, isCito,
	});

	const { effDoctorUserId, effChairId } = resolveEffectiveDoctorAndChair({
		doctorUserId, dutyDoctorId, doctors, isSoloDoctor, chairId, chairs,
	});

	let effStartsAt = startsAtLocal;
	let effEndsAt = endsAtLocal;
	if (!effStartsAt) {
		const now = new Date();
		now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
		effStartsAt = safeToDateTimeLocalValue(now.toISOString(), timezone);
		setStartsAtLocal(effStartsAt);
	}
	if (effStartsAt && !effEndsAt) {
		const startIso = safeFromDateTimeLocalValue(effStartsAt, timezone);
		const startMs = Date.parse(startIso);
		if (!Number.isNaN(startMs)) {
			const defaultEndIso = new Date(startMs + 30 * 60_000).toISOString();
			effEndsAt = safeToDateTimeLocalValue(defaultEndIso, timezone);
			setEndsAtLocal(effEndsAt);
		}
	}

	const startsAtIso = safeFromDateTimeLocalValue(effStartsAt, timezone);
	let endsAtIso = safeFromDateTimeLocalValue(effEndsAt, timezone);
	if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
		const fixedEndIso = new Date(Date.parse(startsAtIso) + 30 * 60_000).toISOString();
		endsAtIso = fixedEndIso;
		setEndsAtLocal(safeToDateTimeLocalValue(fixedEndIso, timezone));
	}

	setIsSaving(true);
	setError(null);
	const effIsCito = Boolean(isCito || collision?.isCitoOverbooking || isCitoAppointment({ reason, comment }));
	const allowOverbooking = Boolean(effIsCito || collision?.hasCollision || collision?.isCitoOverbooking);

	const success = await onSave(appointment.id, {
		patientId: effPatientId || null,
		doctorUserId: effDoctorUserId,
		assistantUserId: isSoloDoctor ? null : assistantUserId?.trim() || null,
		chairId: effChairId,
		startsAt: startsAtIso,
		endsAt: endsAtIso,
		status,
		reason,
		comment,
		isCito: effIsCito,
		cito: effIsCito,
		allowEmergencyOverride: allowOverbooking,
		allowOverbooking: allowOverbooking,
		urgency: effIsCito ? "emergency" : undefined,
	} as any);

	setIsSaving(false);
	if (success) onClose();
}
