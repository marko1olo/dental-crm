import { useMemo } from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import {
	useTelephonyStore,
	type DashboardResponse,
	type IncomingCallPayload,
	type PatientRecord,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { computeQuickBookingSlots, type QuickSlotType } from "../IncomingCallQuickBooking";
import { DEFAULT_CLINIC_BRAND_NAME, DEFAULT_DOCTOR_FALLBACK_ID, QUICK_BOOKING_REASON_BY_SLOT, QUICK_BOOKING_TOAST_LABEL_BY_SLOT } from "./incomingCallConstants";
import { buildQuickBookingComment } from "./incomingCallUtils";

interface BookingParams {
	currentCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	callerName: string;
	formattedPhone: string;
	dashboard: DashboardResponse | null | undefined;
}

export function useIncomingCallBookingActions({
	currentCall, resolvedPatient, callerName, formattedPhone, dashboard,
}: BookingParams) {
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const { slots: quickSlots, getSlotInterval } = useMemo(
		() => computeQuickBookingSlots(dashboard, resolvedPatient?.id),
		[dashboard, resolvedPatient?.id],
	);

	const handleQuickBook = (slotType: QuickSlotType = "today_standard") => {
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.active && (s.role === "doctor" || s.role === "owner"))?.id ||
			dashboard?.clinicSettings?.staff?.[0]?.id || DEFAULT_DOCTOR_FALLBACK_ID;
		const defaultChairId =
			dashboard?.clinicSettings?.chairs?.find((c) => c.active)?.id ||
			dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		const { startsAt, endsAt } = getSlotInterval(slotType);
		const comment = buildQuickBookingComment(slotType, formattedPhone);

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			usePatientStore.getState().setPatientCoreDraft((d) => ({ ...d, phone: currentCall.phone }));
		}

		setNewAppointmentDraft({
			patientId: resolvedPatient?.id || "", doctorUserId: defaultDoctorId,
			status: "confirmed", chairId: defaultChairId, startsAt, endsAt,
			reason: QUICK_BOOKING_REASON_BY_SLOT[slotType], notes: comment, assistantUserId: "",
		});

		const slotInfo = {
			patientId: resolvedPatient?.id || null,
			patientName: resolvedPatient?.fullName || (callerName && callerName !== "Неизвестный номер" ? callerName : ""),
			patientPhone: currentCall?.phone || "", doctorUserId: defaultDoctorId || null, chairId: defaultChairId || null,
			startsAt, endsAt, reason: QUICK_BOOKING_REASON_BY_SLOT[slotType] || "Запись по входящему звонку",
			isCitoEmergency: slotType === "today_cito",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try { window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: slotInfo })); } catch {}
		}

		// 1-Click instant schedule reservation: record booked outcome and keep drawer context intact
		useTelephonyStore.getState().recordCallOutcome("booked");
		const targetSlot = quickSlots.find((s) => s.type === slotType);
		const slotLabel = targetSlot?.title || QUICK_BOOKING_TOAST_LABEL_BY_SLOT[slotType] || "Слот зарезервирован";
		showToast(`Запись подтверждена в 1 клик: ${slotLabel}. Слот зарезервирован в расписании.`, "success");
	};

	return { quickSlots, handleQuickBook };
}
