import { useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import {
	formatPhoneDisplay,
	resolvePatientCategory,
	resolvePatientFromPhone,
	useTelephonyStore,
	type IncomingCallPayload,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import type { TelephonyToastProps } from "./types";

export function useTelephonyToastController(props: TelephonyToastProps) {
	const storeActiveCall = useTelephonyStore((s) => s.activeCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const endCall = useTelephonyStore((s) => s.endCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const isConnected = useTelephonyStore((s) => s.isWsConnected);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);

	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

	useEffect(() => {
		const handleHash = () => setHash(window.location.hash);
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const activeCall = props.call !== undefined ? props.call : storeActiveCall;
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}
		if (activeCall.status === "ended" || activeCall.status === "rejected" || activeCall.status === "missed") {
			const finalSec = typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds >= 0
				? activeCall.durationSeconds
				: Math.max(0, Math.floor(((activeCall.endedAt || Date.now()) - (activeCall.callStartedAt || Date.now())) / 1000));
			setElapsedSeconds(finalSec);
			return;
		}
		const startTime = activeCall.callStartedAt ?? Date.now();
		const updateTimer = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
		updateTimer();
		const intervalId = setInterval(updateTimer, 1000);
		return () => clearInterval(intervalId);
	}, [activeCall]);

	const isSterileZone = (props.suppressInSterileZone ?? true) &&
		(selectedWorkspaceRole === "doctor" || (currentView as string) === "visit" || (currentView as string) === "odontogram" || (currentView as string) === "periodontics" || hash.includes("#visit") || hash.includes("#odontogram") || hash.includes("#periodontics"));

	const rawPhone = activeCall?.phone || "";
	const formattedPhone = formatPhoneDisplay(rawPhone);
	const matchingPatient = resolvePatientFromPhone(dashboard?.patients, rawPhone) ||
		(activeCall?.patientId && dashboard?.patients ? dashboard.patients.find((p) => p.id === activeCall.patientId) : null);
	const isKnownPatient = Boolean(matchingPatient);
	const callerName = matchingPatient?.fullName || activeCall?.patientName || formattedPhone || "Входящий вызов";

	const patientAppointments = matchingPatient && dashboard?.appointments
		? dashboard.appointments.filter((a) => a.patientId === matchingPatient.id && a.status === "completed") : [];
	const lastAppointment = patientAppointments[patientAppointments.length - 1];
	const lastVisitText = lastAppointment?.startsAt
		? new Date(lastAppointment.startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
		: isKnownPatient ? "Ранее не завершён" : "Первичный визит";

	const balanceRub = matchingPatient?.balanceRub ?? 0;
	const balanceText = balanceRub > 0 ? `+${balanceRub.toLocaleString("ru-RU")} ₽` : balanceRub < 0 ? `Долг: ${Math.abs(balanceRub).toLocaleString("ru-RU")} ₽` : "0 ₽";
	const balanceColor = balanceRub > 0 ? "text-emerald-700 dark:text-emerald-300 font-bold" : balanceRub < 0 ? "text-rose-700 dark:text-rose-300 font-bold" : "text-[var(--muted,#64748b)]";
	const somaticNote = matchingPatient?.notes || "";
	const hasAllergy = /аллерг/i.test(somaticNote);

	const category = resolvePatientCategory(
		matchingPatient ? { id: matchingPatient.id, fullName: matchingPatient.fullName, notes: somaticNote } : undefined,
		lastAppointment ? { formattedLastVisit: lastVisitText, doctorName: "Лечащий врач", doctorSpecialty: "Стоматолог", appointmentReason: "Приём", isNewPatient: false, lastVisitDate: lastAppointment.startsAt } : undefined,
	);

	const handleOpenPatientCard = () => {
		if (matchingPatient?.id) setSelectedPatientId(matchingPatient.id);
		else if (rawPhone) setNewPatientPhone(rawPhone);
		openCallDrawer();
		if (props.onOpenCard) props.onOpenCard(matchingPatient?.id);
		else showToast(`Карта: ${callerName}`, "info");
	};

	const handleCreateAppointment = () => {
		if (props.onQuickBook) props.onQuickBook(matchingPatient?.id, callerName, rawPhone);
		else showToast(`Создание записи: ${isKnownPatient ? `Приём: ${callerName}` : `Первичная запись (${formattedPhone})`}`, "info");
	};

	return {
		activeCall, elapsedSeconds, isSterileZone, isConnected, isAnswered: activeCall?.status === "answered",
		isEnded: activeCall?.status === "ended" || activeCall?.status === "rejected" || activeCall?.status === "missed",
		callerName, formattedPhone, isKnownPatient, category, balanceText, balanceColor, lastVisitText, hasAllergy, somaticNote,
		handleOpenPatientCard, handleCreateAppointment,
		handleAnswer: () => { answerCall(); props.onAnswer?.(); showToast(`Вызов принят (${formattedPhone})`, "success"); },
		handleRejectCall: () => { rejectCall(); props.onReject?.(); showToast(`Вызов ${formattedPhone} отклонён`, "info"); },
		handleDismiss: () => { dismissCall(); props.onClose?.(); },
		handleEndCall: () => { endCall(); showToast("Разговор завершён", "info"); },
	};
}
