import { useAppStore } from "../../../store/appStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import { computeQuickSlot } from "./quickActions/quickSlotHelper";
import type { UseFloatingCallQuickActionsParams } from "./quickActions/types";
import { useFloatingDialActions } from "./quickActions/useFloatingDialActions";
import { useFloatingPatientAndLeadActions } from "./quickActions/useFloatingPatientAndLeadActions";
import { useFloatingWhatsAppAction } from "./quickActions/useFloatingWhatsAppAction";

export function useFloatingCallQuickActions({
	activeCall,
	resolvedPatient,
	upcomingAppointment,
	callerName,
	formattedPhone,
	dialNumber,
	setDialNumber,
	dialInputRef,
	setActiveTab,
	dashboard,
	setDashboard,
	setSelectedPatientId,
	setNewPatientPhone,
	triggerIncomingCall,
	acceptCall,
}: UseFloatingCallQuickActionsParams) {
	const setNewAppointmentDraft = useScheduleStore((s) => s.setNewAppointmentDraft);

	const dialActions = useFloatingDialActions({
		dialNumber,
		setDialNumber,
		dialInputRef,
		setActiveTab,
		dashboard,
		triggerIncomingCall,
	});

	const whatsAppActions = useFloatingWhatsAppAction({
		activeCall,
		resolvedPatient,
		upcomingAppointment,
		callerName,
		dashboard,
	});

	const patientAndLeadActions = useFloatingPatientAndLeadActions({
		activeCall,
		formattedPhone,
		dashboard,
		setDashboard,
		setSelectedPatientId,
	});

	const handleQuickBook = (slotType: "urgent" | "consultation" | "tomorrow") => {
		if (!activeCall) return;
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId = dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		const { targetDate, startTime, endTime, reason } = computeQuickSlot(slotType, todayIso);

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
		} else {
			setNewPatientPhone(activeCall.phone);
		}

		setNewAppointmentDraft({
			patientId: resolvedPatient ? resolvedPatient.id : "",
			doctorUserId: defaultDoctorId,
			assistantUserId: "",
			chairId: defaultChairId,
			startsAt: `${targetDate}T${startTime}`,
			endsAt: `${targetDate}T${endTime}`,
			status: "planned",
			reason,
			comment: resolvedPatient ? `Запись по телефону ${formattedPhone}` : `Новый пациент с телефона ${formattedPhone}`,
		});

		const slotInfo = {
			patientId: resolvedPatient?.id || null,
			patientName: resolvedPatient?.fullName || (callerName && callerName !== "Неизвестный номер" ? callerName : ""),
			patientPhone: activeCall.phone || "",
			doctorUserId: defaultDoctorId || null,
			chairId: defaultChairId || null,
			startsAt: `${targetDate}T${startTime}`,
			endsAt: `${targetDate}T${endTime}`,
			reason,
			isCitoEmergency: slotType === "urgent",
		};
		useScheduleStore.getState().setPendingStageBooking(slotInfo);
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: slotInfo }));
			} catch {}
		}

		acceptCall();
		if (useAppStore.getState().currentView !== "schedule") {
			useAppStore.getState().setCurrentView("schedule");
		}
		useUiSurfaceStore.getState().openDrawer("quick_booking");
		showToast(`Создан черновик записи: ${reason} (открыта быстрая запись)`, "info");
	};

	return {
		...dialActions,
		...whatsAppActions,
		...patientAndLeadActions,
		handleQuickBook,
	};
}
