import { useCallback, useEffect, useMemo, useState } from "react";
import type { Appointment } from "@dental/shared";
import { isCitoAppointment } from "../../utils/scheduleCollisionUtils";
import type { AppointmentModalProps } from "./AppointmentModalTypes";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import type { TargetSlotInfo } from "./WaitlistDrawer";
import { useAppointmentModalPatient } from "./useAppointmentModalPatient";
import { useAppointmentModalTimeSync } from "./appointmentModalStateModules/useAppointmentModalTimeSync";
import { useAppointmentModalCollision } from "./appointmentModalStateModules/useAppointmentModalCollision";
import { useAppointmentModalDuty } from "./appointmentModalStateModules/useAppointmentModalDuty";
import { useAppointmentModalPresets } from "./appointmentModalStateModules/useAppointmentModalPresets";
import { executeAppointmentModalSave } from "./appointmentModalStateModules/useAppointmentModalSubmit";

export function useAppointmentModalState(props: AppointmentModalProps) {
	const { isOpen, appointment, dashboard, onClose, onSave, patientName, toDateTimeLocalValue, fromDateTimeLocalValue, chairDoctorAssignments, onQuickCreatePatient } = props;
	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";
	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(() => staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner")), [staff]);
	const assistants = useMemo(() => staff.filter((m) => m.active && m.role === "assistant"), [staff]);
	const chairs = useMemo(() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active), [dashboard?.clinicSettings?.chairs]);
	const isSoloDoctor = dashboard?.clinicSettings?.profile?.mode === "solo_doctor" || dashboard?.clinicSettings?.profile?.mode === "one_chair" || (doctors.length <= 1 && chairs.length <= 1) || doctors.length <= 1;

	const patientState = useAppointmentModalPatient({ isOpen, initialPatientId: appointment?.patientId, dashboard, onQuickCreatePatient });
	const timeSync = useAppointmentModalTimeSync({ appointment, timezone, toDateTimeLocalValue, fromDateTimeLocalValue });

	const [doctorUserId, setDoctorUserId] = useState(() => appointment?.doctorUserId ?? "");
	const [assistantUserId, setAssistantUserId] = useState<string | null>(() => appointment?.assistantUserId ?? null);
	const [chairId, setChairId] = useState(() => appointment?.chairId ?? "");
	const [status, setStatus] = useState<Appointment["status"]>(() => appointment?.status ?? "planned");
	const [reason, setReason] = useState(() => appointment?.reason ?? "");
	const [comment, setComment] = useState(() => appointment?.comment ?? "");
	const [isCito, setIsCito] = useState(() => Boolean((appointment as any)?.isCito || (appointment as any)?.cito || isCitoAppointment(appointment)));
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isWaitlistDrawerOpen, setIsWaitlistDrawerOpen] = useState(false);
	const [waitlistTargetSlot, setWaitlistTargetSlot] = useState<TargetSlotInfo | null>(null);

	const dutyState = useAppointmentModalDuty({ chairId, startsAtLocal: timeSync.startsAtLocal, appointment, chairs, doctors, chairDoctorAssignments, safeToDateTimeLocalValue: timeSync.safeToDateTimeLocalValue, timezone });
	const collision = useAppointmentModalCollision({ appointment, startsAtLocal: timeSync.startsAtLocal, endsAtLocal: timeSync.endsAtLocal, doctorUserId, chairId, assistantUserId, patientId: patientState.patientId, isCito, reason, comment, safeFromDateTimeLocalValue: timeSync.safeFromDateTimeLocalValue, safeToDateTimeLocalValue: timeSync.safeToDateTimeLocalValue, timezone, dashboard });
	const presets = useAppointmentModalPresets({ setReason, comment, setComment, status, setStatus, setIsCito, applyDuration: timeSync.applyDuration });

	const handleOpenWaitlistForThisSlot = useCallback(() => {
		const doc = dashboard?.clinicSettings?.staff?.find((s) => s.id === doctorUserId);
		const chair = dashboard?.clinicSettings?.chairs?.find((c) => c.id === chairId);
		const pat = patientState.patientId ? patientName(dashboard?.patients ?? [], patientState.patientId) : null;
		const startsAtIso = timeSync.startsAtLocal ? timeSync.safeFromDateTimeLocalValue(timeSync.startsAtLocal, timezone) : appointment?.startsAt || new Date().toISOString();
		const endsAtIso = timeSync.endsAtLocal ? timeSync.safeFromDateTimeLocalValue(timeSync.endsAtLocal, timezone) : appointment?.endsAt || new Date().toISOString();
		const slotInfo: TargetSlotInfo = {
			appointmentId: appointment?.id, startsAt: startsAtIso, endsAt: endsAtIso,
			doctorUserId: doctorUserId || null, doctorName: doc?.fullName || (doc as any)?.name || null,
			chairId: chairId || null, chairName: chair?.name || null,
			patientId: patientState.patientId || null, patientName: pat,
			freedBecause: status === "cancelled" ? "Отмена приёма" : "Неявка пациента", reason,
		};
		if (props.onOpenWaitlistForSlot) { props.onOpenWaitlistForSlot(slotInfo); onClose(); }
		else { setWaitlistTargetSlot(slotInfo); setIsWaitlistDrawerOpen(true); }
	}, [appointment, chairId, dashboard, doctorUserId, timeSync, onClose, patientState.patientId, patientName, props, reason, status, timezone]);

	useEffect(() => {
		if (!appointment || !isOpen) return;
		let defaultDoc = appointment.doctorUserId || "";
		let defaultChair = appointment.chairId || (isSoloDoctor && chairs[0] ? chairs[0].id : "") || (chairs.length === 1 ? chairs[0]?.id : "") || (chairs.length > 0 ? chairs[0]?.id : DEFAULT_SOLO_CHAIR.id);
		if (!defaultDoc && defaultChair) {
			const duty = resolveChairDutyDoctor(defaultChair, appointment.startsAt, chairDoctorAssignments, appointment.startsAt?.slice(0, 10), null, (chairs[0] as any)?.defaultDoctorId || (doctors[0]?.id ?? null));
			defaultDoc = duty.doctorId || doctors[0]?.id || "";
		}
		patientState.setPatientId(appointment.patientId ?? "");
		patientState.setPatientSearchQuery("");
		patientState.setIsInlineNewPatient(false);
		setDoctorUserId(defaultDoc);
		setAssistantUserId(appointment.assistantUserId ?? null);
		setChairId(defaultChair);
		timeSync.setStartsAtLocal(timeSync.safeToDateTimeLocalValue(appointment.startsAt, timezone));
		timeSync.setEndsAtLocal(timeSync.safeToDateTimeLocalValue(appointment.endsAt, timezone));
		setStatus(appointment.status || "planned");
		setReason(appointment.reason ?? "");
		setComment(appointment.comment ?? "");
		setIsCito(Boolean((appointment as any)?.isCito || (appointment as any)?.cito || isCitoAppointment(appointment)));
		setError(null);
		setIsSaving(false);
	}, [appointment, isOpen, timezone, doctors, chairs, chairDoctorAssignments, isSoloDoctor]);

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		await executeAppointmentModalSave({
			appointment, isSaving, setIsSaving, setError, patientId: patientState.patientId,
			isInlineNewPatient: patientState.isInlineNewPatient, newPatientFullName: patientState.newPatientFullName,
			newPatientPhone: patientState.newPatientPhone, patientSearchQuery: patientState.patientSearchQuery,
			handleCreateInlinePatient: patientState.handleCreateInlinePatient, doctorUserId, dutyDoctorId: dutyState.dutyDoctorId,
			doctors, isSoloDoctor, chairId, chairs, startsAtLocal: timeSync.startsAtLocal, setStartsAtLocal: timeSync.setStartsAtLocal,
			endsAtLocal: timeSync.endsAtLocal, setEndsAtLocal: timeSync.setEndsAtLocal, timezone,
			safeToDateTimeLocalValue: timeSync.safeToDateTimeLocalValue, safeFromDateTimeLocalValue: timeSync.safeFromDateTimeLocalValue,
			reason, comment, isCito, collision, assistantUserId, status, onSave, onClose,
		});
	};

	const hasOpenVisit = Boolean((dashboard?.activeVisit && appointment && dashboard.activeVisit.appointmentId === appointment.id) || (props as any).hasOpenVisit);

	return {
		timezone, doctors, assistants, chairs, isSoloDoctor,
		...patientState, ...timeSync,
		doctorUserId, setDoctorUserId, assistantUserId, setAssistantUserId, chairId, setChairId,
		status, setStatus, reason, setReason, comment, setComment, isCito, setIsCito,
		isSaving, error, isWaitlistDrawerOpen, setIsWaitlistDrawerOpen,
		waitlistTargetSlot, setWaitlistTargetSlot, handleOpenWaitlistForThisSlot,
		dutyDoctorId: dutyState.dutyDoctorId, dutyDocHours: dutyState.dutyDocHours, dutyDoc: dutyState.dutyDoc,
		hasOpenVisit, collision, handleSave, ...presets,
	};
}
