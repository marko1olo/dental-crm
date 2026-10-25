/**
 * bookFromChatAutonomy.ts — 1-Click Schedule Booking from Patient Chat (Mandate 8e & 8n)
 * Opens doctor's chair schedule with prefilled patient name, phone, and reason in 1 click.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { showToast } from "../GlobalToast";

export interface ChatPatientBookingInfo {
	id?: string | null | undefined;
	fullName: string;
	phone?: string | undefined;
	reason?: string | undefined;
}

export function executeBookAppointmentFromChat(
	patient: ChatPatientBookingInfo,
	dashboard?: any,
): void {
	if (!patient.fullName && !patient.phone) {
		showToast("Не удалось определить данные пациента для записи", "warning");
		return;
	}

	const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
	const defaultDoctorId = dashboard?.clinicSettings?.staff?.find((s: any) => s.role === "doctor")?.id || "";
	const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";
	const reason = patient.reason?.trim() || "Запись из чата мессенджера";

	const slotInfo = {
		patientId: patient.id || null,
		patientName: patient.fullName || (patient.phone ? `Пациент ${patient.phone}` : "Пациент"),
		patientPhone: patient.phone || "",
		doctorUserId: defaultDoctorId || null,
		chairId: defaultChairId || null,
		startsAt: `${todayIso}T10:00:00`,
		endsAt: `${todayIso}T10:30:00`,
		reason,
		isCitoEmergency: false,
	};

	useScheduleStore.getState().setPendingStageBooking(slotInfo);
	useScheduleStore.getState().setNewAppointmentDraft({
		patientId: patient.id || "",
		doctorUserId: defaultDoctorId,
		assistantUserId: "",
		chairId: defaultChairId,
		startsAt: `${todayIso}T10:00:00`,
		endsAt: `${todayIso}T10:30:00`,
		status: "planned",
		reason,
		comment: `Быстрая запись из чата (${patient.phone || "без номера"})`,
	});

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: slotInfo }));
		} catch {}
	}

	if (useAppStore.getState().currentView !== "schedule") {
		useAppStore.getState().setCurrentView("schedule");
	}
	if (typeof window !== "undefined") {
		window.location.hash = "schedule";
	}

	useUiSurfaceStore.getState().openDrawer("quick_booking");
	showToast(`Запись на приём: ${slotInfo.patientName}`, "info");
}
