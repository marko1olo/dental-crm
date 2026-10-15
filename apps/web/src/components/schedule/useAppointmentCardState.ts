import type { Appointment } from "@dental/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { isTechnicalBreakAppointment } from "./AppointmentModal";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";
import {
	getAppointmentDurationMinutes,
	calculateAppointmentSpan,
	resolveAppointmentLabStatus,
} from "./appointmentCardHelpers";
import type { AppointmentCardProps } from "./AppointmentCardTypes";
import { extractTeethList } from "./appointmentCardModules/AppointmentCardTeethList";
import { useAppointmentCardActions } from "./useAppointmentCardActions";
import { useAppointmentCardDrag } from "./useAppointmentCardDrag";

export * from "./useAppointmentCardActions";
export * from "./useAppointmentCardDrag";

export function useAppointmentCardState(props: AppointmentCardProps) {
	const {
		appointment, dashboard, appointmentLabels, appointmentDraft, appointmentEditing,
		appointmentHasOpenVisit, formatTime, patientName, openAppointmentEditor, repeatAppointment,
		copyAppointmentToBuffer, updateAppointmentScheduleDraft, saveAppointmentSchedule,
		normalizedAppointmentStatus, toDateTimeLocalValue, activeVisitLockedAppointmentStatuses,
		onOpenVisit, onOpenWaitlistForSlot,
	} = props;

	const staffList = dashboard?.clinicSettings?.staff ?? [];
	const appointmentDoctor = staffList.find((m) => m?.id === appointment?.doctorUserId);
	const appointmentAssistant = appointment?.assistantUserId ? staffList.find((m) => m?.id === appointment.assistantUserId) : null;
	const appointmentChair = (dashboard?.clinicSettings?.chairs ?? []).find((c) => c?.id === appointment?.chairId);
	const appointmentPatient = (dashboard?.patients ?? []).find((p) => p?.id === appointment?.patientId);

	const patientBalance = useMemo(() => {
		const raw = appointmentPatient?.balanceRub ?? (appointmentPatient as any)?.balance;
		if (raw === undefined || raw === null || raw === "") return null;
		const num = Number(raw);
		return Number.isFinite(num) ? num : null;
	}, [appointmentPatient]);

	const appointmentPatientName = isTechnicalBreakAppointment(appointment) && !appointment?.patientId
		? appointment?.reason || "Служебный перерыв"
		: (typeof patientName === "function" ? patientName(dashboard?.patients ?? [], appointment?.patientId ?? null) : "") || "Пациент";

	const durationMinutes = useMemo(() => {
		return getAppointmentDurationMinutes(appointment?.startsAt, appointment?.endsAt, (appointment as any)?.durationMinutes || 30);
	}, [appointment?.startsAt, appointment?.endsAt, (appointment as any)?.durationMinutes]);
	const isMultiHour = durationMinutes >= 60;
	const slotSpan = calculateAppointmentSpan(durationMinutes);

	const collision = useMemo(() => {
		if (!appointmentEditing || !appointmentDraft) {
			return { hasCollision: false, conflictType: null, conflictingAppointment: null, message: null };
		}
		return checkAppointmentResourceCollision(appointmentDraft, dashboard?.appointments, {
			excludeAppointmentId: appointment.id,
			staff: dashboard?.clinicSettings?.staff,
			chairs: dashboard?.clinicSettings?.chairs,
			patients: dashboard?.patients,
			formatTimeFn: (iso) => toDateTimeLocalValue(iso, dashboard?.clinicSettings?.profile?.timezone).slice(11, 16),
		});
	}, [appointmentEditing, appointmentDraft, appointment.id, dashboard, toDateTimeLocalValue]);

	const activeScheduleCollision = useMemo(() => {
		const curDoc = appointment?.doctorUserId;
		const curCh = appointment?.chairId;
		const curPat = appointment?.patientId;
		const curStart = new Date(appointment?.startsAt ?? "").getTime();
		const curEnd = new Date(appointment?.endsAt ?? "").getTime();
		if (!curStart || !curEnd || appointment?.status === "cancelled" || appointment?.status === "no_show") return null;

		const conflicting = (dashboard?.appointments ?? []).find((other) => {
			if (other.id === appointment.id || other.status === "cancelled" || other.status === "no_show") return false;
			const isOverlap = curStart < new Date(other.endsAt).getTime() && curEnd > new Date(other.startsAt).getTime();
			if (!isOverlap) return false;
			return Boolean((curDoc && other.doctorUserId === curDoc) || (curCh && other.chairId === curCh) || (curPat && other.patientId === curPat));
		});
		if (!conflicting) return null;

		const sameDoctor = Boolean(curDoc && conflicting.doctorUserId === curDoc);
		const sameChair = Boolean(curCh && conflicting.chairId === curCh);
		const samePatient = Boolean(curPat && conflicting.patientId === curPat);
		const message = sameDoctor && !sameChair ? "Коллизия: врач записан в два кабинета одновременно"
			: sameDoctor && sameChair ? "Коллизия: двойная запись у врача в одном кабинете"
			: sameChair ? "Коллизия: наложение двух пациентов в одном кабинете"
			: "Коллизия: пациент записан на два приема одновременно";

		return { conflicting, sameDoctor, sameChair, samePatient, message };
	}, [appointment, dashboard?.appointments]);

	const activePatients = useMemo(() => (dashboard?.patients ?? []).filter((p) => p.status === "active"), [dashboard?.patients]);
	const activeDoctors = useMemo(() => staffList.filter((m) => m.active && (m.role === "doctor" || m.role === "owner")), [staffList]);
	const activeAssistants = useMemo(() => staffList.filter((m) => m.active && m.role === "assistant"), [staffList]);
	const activeChairs = useMemo(() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active), [dashboard?.clinicSettings?.chairs]);

	const [isHoverPreviewOpen, setIsHoverPreviewOpen] = useState(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleCardMouseEnter = () => {
		if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = setTimeout(() => setIsHoverPreviewOpen(true), 80);
	};

	const handleCardMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHoverPreviewOpen(false);
	};

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMobileSheetOpen(false);
				setIsHoverPreviewOpen(false);
			}
		};
		if (isMobileSheetOpen || isHoverPreviewOpen) document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isMobileSheetOpen, isHoverPreviewOpen]);

	const cardTeeth = useMemo(() => extractTeethList(appointment), [appointment]);

	const somaticAlert = useMemo(() => {
		const chronic = (appointmentPatient as any)?.anamnesis?.chronicDiseases || (appointmentPatient as any)?.chronicDiseases;
		if (chronic && typeof chronic === "string" && chronic.trim()) return `Соматика: ${chronic.trim()}`;
		const match = (appointmentPatient?.notes || "").match(/(диабет|гипертони[яеи]|астм[аеы]|онколог|кардио|сердечн|гепатит|эпилепси)[^.;\n]*/i);
		return match ? `Соматика: ${match[0].trim()}` : null;
	}, [appointmentPatient]);

	const allergyAlert = useMemo(() => {
		const raw = (appointmentPatient as any)?.allergies || (appointmentPatient as any)?.anamnesis?.allergies;
		if (raw && typeof raw === "string" && raw.trim() && !isNegativeAllergyStatement(raw)) return `Внимание: ${raw.trim()}`;
		const match = (appointmentPatient?.notes || "").match(/аллерги[яеи][^.;\n]*/i);
		if (match && !isNegativeAllergyStatement(match[0])) return `Внимание: ${match[0].trim()}`;
		const r = appointment?.reason || "";
		if ((/лидокаин/i.test(r) || /аллерги/i.test(r)) && !isNegativeAllergyStatement(r)) return "Внимание: Аллергия на лидокаин";
		return null;
	}, [appointmentPatient, appointment?.reason]);

	const labReadinessAlert = useMemo(() => {
		const labOrders = Array.isArray((dashboard as any)?.labOrders) ? (dashboard as any).labOrders : [];
		const matchedLabOrder = labOrders.find(
			(lo: any) =>
				(appointment?.id && String(lo?.appointmentId) === String(appointment.id)) ||
				(appointment?.patientId && String(lo?.patientId) === String(appointment.patientId)),
		);
		const labStatus = resolveAppointmentLabStatus(appointment, matchedLabOrder);
		if (labStatus?.state === "ready_in_clinic") {
			return (
				labStatus.readinessText ||
				`Работа из ЗТЛ доставлена: ${labStatus.workTypeRu || "Коронка цирконий"}${labStatus.toothFdi ? ` зуб ${labStatus.toothFdi}` : " зуб 46"}`
			);
		}
		return null;
	}, [appointment, dashboard]);

	const {
		isQuickStatusUpdating, optimisticStatus, setOptimisticStatus,
		handleQuickStatusChange, handleShiftAppointmentTime, handleCardKeyDown,
	} = useAppointmentCardActions({
		appointment, dashboard, appointmentDraft, appointmentEditing, appointmentHasOpenVisit,
		appointmentLabels, appointmentPatient, appointmentPatientName, appointmentDoctor, appointmentChair,
		activeVisitLockedAppointmentStatuses, formatTime, patientName, normalizedAppointmentStatus,
		updateAppointmentScheduleDraft, saveAppointmentSchedule, openAppointmentEditor, repeatAppointment,
		copyAppointmentToBuffer, onOpenVisit, onOpenWaitlistForSlot,
	});

	const dragUtils = useAppointmentCardDrag({
		appointment,
		collisionAppointments: dashboard?.appointments,
	});

	const displayStatus = optimisticStatus ?? appointment?.status;
	const isCito = Boolean(
		(appointment as any)?.isCito || (appointment as any)?.cito ||
		(appointment?.reason ?? "").toLowerCase().includes("cito") ||
		(appointment?.reason ?? "").toLowerCase().includes("острая боль") ||
		(appointment?.reason ?? "").toLowerCase().includes("срочн"),
	);
	const isLockedStatus = Boolean(appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses?.has?.(displayStatus));

	return {
		appointmentDoctor, appointmentAssistant, appointmentChair, appointmentPatient,
		appointmentPatientName, patientBalance, durationMinutes, isMultiHour, slotSpan,
		collision, activeScheduleCollision, activePatients, activeDoctors, activeAssistants,
		activeChairs, isQuickStatusUpdating, optimisticStatus, setOptimisticStatus, isHoverPreviewOpen,
		setIsHoverPreviewOpen, isMobileSheetOpen, setIsMobileSheetOpen, hoverTimeoutRef,
		handleCardMouseEnter, handleCardMouseLeave, cardTeeth, somaticAlert, allergyAlert,
		labReadinessAlert,
		handleQuickStatusChange, handleShiftAppointmentTime, handleCardKeyDown, displayStatus,
		isCito, isLockedStatus, dragUtils,
	};
}
