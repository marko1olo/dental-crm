import { useEffect, useMemo, useRef, useState } from "react";
import type { Dashboard } from "@dental/shared";
import type {
	IncomingCallPayload,
	PatientFinancialSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientLastVisitSummary,
	PatientActiveTreatmentPlanSummary,
	TelephonyPatientCategory,
} from "../../store/telephonyTypes";
import {
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
	resolvePatientActiveTreatmentPlan,
	resolvePatientCategory,
} from "../../store/telephonyStore";
import {
	resolveCallAdvertisingAttribution,
	type CallAttribution,
} from "./telephonyAttribution";

export interface UseIncomingCallDataResult {
	currentCall: IncomingCallPayload | null;
	elapsedSeconds: number;
	resolvedPatient: ReturnType<typeof resolvePatientFromPhone>;
	patientInsight: any;
	financialSummary: PatientFinancialSummary;
	lastVisitSummary: PatientLastVisitSummary | null;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	somaticAlerts: PatientSomaticAlert[];
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	activeTreatmentPlan: PatientActiveTreatmentPlanSummary;
	callAttribution: CallAttribution | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string };
	isKnownPatient: boolean;
	patientCategory: TelephonyPatientCategory;
	providerLabel: string;
}

export function useIncomingCallData(
	activeCall: IncomingCallPayload | null,
	dashboard: Dashboard | undefined,
	dismissCall: () => void,
): UseIncomingCallDataResult {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	const lastCallRef = useRef<IncomingCallPayload | null>(activeCall);
	useEffect(() => {
		if (activeCall) {
			lastCallRef.current = activeCall;
		}
	}, [activeCall]);

	const currentCall = activeCall || lastCallRef.current;

	// Live Call Duration Timer (ticks every second while activeCall exists and active)
	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		// Stop ticking if call is already ended/rejected/missed
		if (
			activeCall.status === "ended" ||
			activeCall.status === "rejected" ||
			activeCall.status === "missed"
		) {
			const finalSeconds =
				typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds >= 0
					? activeCall.durationSeconds
					: Math.max(
							0,
							Math.floor(
								((activeCall.endedAt || Date.now()) -
									(activeCall.callStartedAt || Date.now())) /
									1000,
							),
						);
			setElapsedSeconds(finalSeconds);
			return;
		}

		const startTime = activeCall.callStartedAt ?? Date.now();
		const updateElapsed = () => {
			const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
			setElapsedSeconds(seconds);
		};
		updateElapsed();
		const interval = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			updateElapsed();
		}, 1000);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden) {
				updateElapsed();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
			}
		};
	}, [activeCall]);

	// Auto-dismiss call after 45 seconds if unhandled and still ringing
	useEffect(() => {
		if (
			!activeCall ||
			activeCall.status === "answered" ||
			activeCall.status === "connected" ||
			activeCall.status === "ended"
		)
			return;

		const timer = setTimeout(() => {
			dismissCall();
		}, 45000);

		return () => clearTimeout(timer);
	}, [activeCall, dismissCall]);

	// Resolve Patient Info from Dashboard via Fuzzy Phone Matching
	const resolvedPatient = useMemo(() => {
		if (!currentCall || !dashboard?.patients) return null;
		if (currentCall.patientId) {
			const found = dashboard.patients.find(
				(p) => p.id === currentCall.patientId,
			);
			if (found) return found;
		}
		return resolvePatientFromPhone(dashboard.patients, currentCall.phone);
	}, [currentCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "allergy");
	}, [somaticAlerts]);

	const acutePainAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "pain");
	}, [somaticAlerts]);

	const activeTreatmentPlan = useMemo(() => {
		return resolvePatientActiveTreatmentPlan(
			resolvedPatient?.id || null,
			dashboard?.treatmentPlanItems,
			dashboard?.treatmentPlanScenarios,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.treatmentPlanItems,
		dashboard?.treatmentPlanScenarios,
	]);

	const callAttribution = useMemo(() => {
		if (!currentCall) return null;
		return resolveCallAdvertisingAttribution(currentCall);
	}, [currentCall]);

	const callerName =
		resolvedPatient?.fullName || currentCall?.patientName || "Неизвестный номер";
	const formattedPhone = currentCall
		? formatPhoneDisplay(currentCall.phone)
		: "";
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isKnownPatient = Boolean(resolvedPatient);

	const patientCategory = useMemo(() => {
		if (!resolvedPatient) return "Первичный";
		return resolvePatientCategory(
			resolvedPatient,
			lastVisitSummary,
			patientInsight,
		);
	}, [resolvedPatient, lastVisitSummary, patientInsight]);

	const providerLabel =
		currentCall?.provider === "mango"
			? "Mango Telecom"
			: currentCall?.provider === "uis"
				? "UIS / CoMagic"
				: currentCall?.provider === "asterisk"
					? "Asterisk SIP"
					: currentCall?.provider === "zadarma"
						? "Zadarma PBX"
						: "IP-Телефония";

	return {
		currentCall,
		elapsedSeconds,
		resolvedPatient,
		patientInsight,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		somaticAlerts,
		allergyAlerts,
		acutePainAlerts,
		activeTreatmentPlan,
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		patientCategory,
		providerLabel,
	};
}
