import type React from "react";
import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { useAppStore } from "../../../store/appStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	type PatientRecord,
	type PatientUpcomingAppointment,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	normalizePhoneDigits,
	openWhatsAppChat,
	resolvePatientFromPhone,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";
import type { TelephonyWidgetTab } from "./types";

interface UseFloatingCallQuickActionsParams {
	activeCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	formattedPhone: string;
	dialNumber: string;
	setDialNumber: React.Dispatch<React.SetStateAction<string>>;
	dialInputRef: React.RefObject<HTMLInputElement | null>;
	setActiveTab: React.Dispatch<React.SetStateAction<TelephonyWidgetTab>>;
	dashboard: DashboardResponse | null | undefined;
	setDashboard?:
		| React.Dispatch<React.SetStateAction<DashboardResponse | null>>
		| undefined;
	setSelectedPatientId: (id: string) => void;
	setNewPatientPhone: (phone: string) => void;
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	acceptCall: () => void;
}

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
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);
	const [whatsappSent, setWhatsappSent] = useState(false);
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);

	const handleDialDigit = (digit: string) => {
		setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev));
	};

	const handleDialBackspace = () => setDialNumber((prev) => prev.slice(0, -1));

	const handleStartOutgoingCall = () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7")
			? `+${clean}`
			: clean.startsWith("8")
				? `+7${clean.slice(1)}`
				: `+7${clean}`;

		const matchingPatient = resolvePatientFromPhone(
			dashboard?.patients,
			e164,
		);

		triggerIncomingCall({
			phone: e164,
			patientId: matchingPatient?.id || null,
			patientName: matchingPatient?.fullName || "Исходящий вызов",
			provider: "mango",
			timestamp: new Date().toISOString(),
			status: "answered",
			callStartedAt: Date.now(),
		});

		showToast(
			`Исходящий вызов на номер ${formatPhoneDisplay(e164)}`,
			"success",
		);
		setActiveTab("call");
	};

	const handleSendWhatsApp = () => {
		if (!activeCall) return;
		const msg = upcomingAppointment
			? generateAppointmentConfirmationMessage({
					patientName: callerName,
					doctorName: upcomingAppointment.doctorName,
					appointmentStartsAt: upcomingAppointment.startsAt,
					clinicName:
						dashboard?.clinicSettings?.profile?.clinicName ||
						(dashboard?.clinicSettings as any)?.name ||
						"DENTE",
				})
			: `Здравствуйте, ${callerName}! Вас приветствует стоматологическая клиника ${dashboard?.clinicSettings?.profile?.clinicName || (dashboard?.clinicSettings as any)?.name || "DENTE"}.`;

		openWhatsAppChat(activeCall.phone, msg);
		if (resolvedPatient?.id) {
			fetch("/api/whatsapp/send", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: resolvedPatient.id,
					message: msg,
				}),
			}).catch((err) => {
				console.warn(
					"[TelephonyFloatingWidget] WhatsApp direct send API error:",
					err,
				);
			});
		}
		setWhatsappSent(true);
		showToast(`Сообщение сформировано в WhatsApp (${callerName})`, "success");
	};

	const handleQuickBook = (
		slotType: "urgent" | "consultation" | "tomorrow",
	) => {
		if (!activeCall) return;
		const todayIso =
			dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id ||
			"";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		let targetDate = todayIso;
		let startTime = "10:00:00";
		let endTime = "10:30:00";
		let reason = "Обращение по звонку";

		if (slotType === "urgent") {
			targetDate = todayIso;
			startTime = "10:00:00";
			endTime = "10:30:00";
			reason = "Острая боль / Экстренный визит";
		} else if (slotType === "consultation") {
			targetDate = todayIso;
			startTime = "15:00:00";
			endTime = "15:30:00";
			reason = "Первичная консультация и план лечения";
		} else {
			const d = new Date(todayIso);
			d.setDate(d.getDate() + 1);
			targetDate = d.toISOString().split("T")[0]!;
			startTime = "11:00:00";
			endTime = "11:30:00";
			reason = "Плановый осмотр";
		}

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по телефону ${formattedPhone}`,
			});
		} else {
			setNewPatientPhone(activeCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Новый пациент с телефона ${formattedPhone}`,
			});
		}

		const slotInfo = {
			patientId: resolvedPatient?.id || null,
			patientName:
				resolvedPatient?.fullName ||
				(callerName && callerName !== "Неизвестный номер" ? callerName : ""),
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
				window.dispatchEvent(
					new CustomEvent("dente-book-stage-appointment", {
						detail: slotInfo,
					}),
				);
			} catch {
				// ignore in non-browser environment
			}
		}

		acceptCall();
		if (useAppStore.getState().currentView !== "visit") {
			useAppStore.getState().setCurrentView("schedule");
		}
		showToast(
			`Создан черновик записи: ${reason} (сохранён в расписании)`,
			"info",
		);
	};

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!activeCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const targetName = customName?.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({
					fullName: targetName,
					phone: activeCall.phone,
				}),
			});

			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try {
					const data = await res.json();
					if (data?.message) errMsg = data.message;
				} catch {}
				showToast(errMsg, "error");
				return;
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				useTelephonyStore.getState().triggerIncomingCall({
					...active,
					patientId: createdPatient.id,
					patientName: createdPatient.fullName,
				});
			}

			if (setDashboard) {
				setDashboard((curr) =>
					curr
						? {
								...curr,
								patients: [
									createdPatient,
									...curr.patients.filter((p) => p.id !== createdPatient.id),
								],
							}
						: curr,
				);
			}

			showToast(`Пациент создан: ${createdPatient.fullName}`, "success");
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Сетевая ошибка при создании пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleCaptureLead = async () => {
		if (!activeCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(activeCall);
			if (res.success) showToast(res.message, "success");
			else showToast(res.message, "error");
		} finally {
			setIsCapturingLead(false);
		}
	};

	return {
		whatsappSent,
		isCreatingPatient,
		isCapturingLead,
		handleDialDigit,
		handleDialBackspace,
		handleStartOutgoingCall,
		handleSendWhatsApp,
		handleQuickBook,
		handleQuickCreatePatient,
		handleCaptureLead,
	};
}
