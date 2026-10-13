import { useEffect, useMemo, useRef, useState } from "react";
import type { Dashboard } from "@dental/shared";
import type {
	CallerLookupResult,
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
import { isDemoShowcaseMode, getDemoShowcasePatients } from "../../lib/demoMode";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";

export interface UseIncomingCallDataResult {
	currentCall: IncomingCallPayload | null;
	elapsedSeconds: number;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	// biome-ignore lint/suspicious/noExplicitAny: insight like compatibility
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
	isServerLookupLoading: boolean;
}

interface PatientFastPhoneIndex<T> {
	byId: Map<string, T>;
	byNational10: Map<string, T>;
	byCleanDigits: Map<string, T>;
}

const patientFastIndexCache = new WeakMap<object, PatientFastPhoneIndex<any>>();

function getOrCreatePatientFastIndex<
	T extends {
		id: string;
		phone?: string | null;
		administrativeProfile?: { legalRepresentativePhone?: string | null } | null;
	},
>(patientsList: readonly T[]): PatientFastPhoneIndex<T> {
	const cached = patientFastIndexCache.get(patientsList);
	if (cached) return cached;

	const byId = new Map<string, T>();
	const byNational10 = new Map<string, T>();
	const byCleanDigits = new Map<string, T>();

	for (let i = 0; i < patientsList.length; i++) {
		const p = patientsList[i];
		if (!p) continue;
		if (p.id) byId.set(p.id, p);

		const candidatePhones = [
			p.phone,
			p.administrativeProfile?.legalRepresentativePhone,
		];

		for (const raw of candidatePhones) {
			if (!raw || typeof raw !== "string") continue;
			const clean = raw.replace(/\D/g, "");
			if (clean.length >= 7) {
				if (!byCleanDigits.has(clean)) {
					byCleanDigits.set(clean, p);
				}
				if (clean.length >= 10) {
					const nat10 = clean.slice(-10);
					if (!byNational10.has(nat10)) {
						byNational10.set(nat10, p);
					}
				}
			}
		}
	}

	const index = { byId, byNational10, byCleanDigits };
	patientFastIndexCache.set(patientsList, index);
	return index;
}

export function useIncomingCallData(
	activeCall: IncomingCallPayload | null,
	dashboard: Dashboard | undefined,
	dismissCall: () => void,
): UseIncomingCallDataResult {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [serverLookup, setServerLookup] = useState<CallerLookupResult | null>(null);
	const [isServerLookupLoading, setIsServerLookupLoading] = useState(false);

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

	// Server-Side PostgreSQL Caller Lookup: Resolves patient card, real balance, debts, upcoming visit & allergies in <15ms
	useEffect(() => {
		if (!currentCall?.phone && !currentCall?.patientId) {
			setServerLookup(null);
			setIsServerLookupLoading(false);
			return;
		}

		let isMounted = true;
		const controller = new AbortController();

		async function fetchCaller() {
			try {
				setIsServerLookupLoading(true);
				const params = new URLSearchParams();
				if (currentCall?.phone) params.set("phone", currentCall.phone);
				if (currentCall?.patientId) params.set("patientId", currentCall.patientId);

				const headers: Record<string, string> = {
					Accept: "application/json",
				};
				const clinicToken = readDenteClinicToken();
				const staffToken = readDenteStaffToken();
				if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
				if (staffToken) headers["x-dente-staff-token"] = staffToken;

				const res = await fetch(`/api/telephony/lookup-caller?${params.toString()}`, {
					headers,
					signal: controller.signal,
				});

				if (!res.ok) return;
				const data: CallerLookupResult = await res.json();
				if (isMounted && data) {
					setServerLookup(data);
				}
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "AbortError") return;
				// Quiet fallback to local store/dashboard
			} finally {
				if (isMounted) {
					setIsServerLookupLoading(false);
				}
			}
		}

		fetchCaller();

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [currentCall?.phone, currentCall?.patientId]);

	// Resolve Patient Info from Server Lookup with Fast O(1) Index Fallback for Offline/Instant State
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	const resolvedPatient: any | null = useMemo(() => {
		if (serverLookup?.found && serverLookup.patient) {
			return serverLookup.patient;
		}

		if (!currentCall) return null;

		if (dashboard?.patients && dashboard.patients.length > 0) {
			const fastIndex = getOrCreatePatientFastIndex(dashboard.patients);

			if (currentCall.patientId) {
				const found = fastIndex.byId.get(currentCall.patientId);
				if (found) return found;
			}

			if (currentCall.phone) {
				const clean = currentCall.phone.replace(/\D/g, "");
				if (clean.length >= 10) {
					const nat10 = clean.slice(-10);
					const foundByNat = fastIndex.byNational10.get(nat10);
					if (foundByNat) return foundByNat;
				}
				if (clean.length >= 7) {
					const foundByClean = fastIndex.byCleanDigits.get(clean);
					if (foundByClean) return foundByClean;
				}
			}

			const foundByPhone = resolvePatientFromPhone(dashboard.patients, currentCall.phone);
			if (foundByPhone) return foundByPhone;
		}

		// Демо-режим инвариант: если в демо-режиме звонящий не опознан,
		// гарантированно подставляем канонического пациента Смирнова Анна Сергеевна
		if (isDemoShowcaseMode()) {
			const demoPatient = dashboard?.patients?.find(
				(p) =>
					p.id === "01a00000-0000-0000-0000-000000000001" ||
					p.fullName === "Смирнова Анна Сергеевна" ||
					p.phone === "+7 916 234-56-78",
			);
			if (demoPatient) return demoPatient;

			const demoList = getDemoShowcasePatients();
			return demoList[0] || null;
		}

		return null;
	}, [serverLookup, currentCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary: PatientFinancialSummary = useMemo(() => {
		if (serverLookup?.found && serverLookup.financialSummary) {
			return serverLookup.financialSummary;
		}
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [serverLookup, resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary: PatientLastVisitSummary | null = useMemo(() => {
		if (serverLookup?.found && serverLookup.lastVisitSummary !== undefined) {
			return serverLookup.lastVisitSummary;
		}
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment: PatientUpcomingAppointmentSummary | null = useMemo(() => {
		if (serverLookup?.found && serverLookup.upcomingAppointment !== undefined) {
			return serverLookup.upcomingAppointment;
		}
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const somaticAlerts: PatientSomaticAlert[] = useMemo(() => {
		if (serverLookup?.found && serverLookup.somaticAlerts && serverLookup.somaticAlerts.length > 0) {
			return serverLookup.somaticAlerts;
		}
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [serverLookup, resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "allergy");
	}, [somaticAlerts]);

	const acutePainAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "pain");
	}, [somaticAlerts]);

	const activeTreatmentPlan: PatientActiveTreatmentPlanSummary = useMemo(() => {
		if (serverLookup?.found && serverLookup.activeTreatmentPlan?.hasActivePlan) {
			return serverLookup.activeTreatmentPlan;
		}
		return resolvePatientActiveTreatmentPlan(
			resolvedPatient?.id || null,
			dashboard?.treatmentPlanItems,
			dashboard?.treatmentPlanScenarios,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.treatmentPlanItems,
		dashboard?.treatmentPlanScenarios,
	]);

	const callAttribution = useMemo(() => {
		if (!currentCall) return null;
		return resolveCallAdvertisingAttribution(currentCall);
	}, [currentCall]);

	const callerName = useMemo(() => {
		if (resolvedPatient?.fullName) return resolvedPatient.fullName;
		if (isDemoShowcaseMode()) {
			return "Смирнова Анна Сергеевна";
		}
		return currentCall?.patientName || "Неизвестный номер";
	}, [resolvedPatient?.fullName, currentCall?.patientName]);

	const formattedPhone = useMemo(() => {
		if (currentCall?.phone) {
			return formatPhoneDisplay(currentCall.phone);
		}
		if (isDemoShowcaseMode() && resolvedPatient?.phone) {
			return formatPhoneDisplay(resolvedPatient.phone);
		}
		return "";
	}, [currentCall?.phone, resolvedPatient?.phone]);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isKnownPatient = Boolean(resolvedPatient);

	const patientCategory: TelephonyPatientCategory = useMemo(() => {
		if (serverLookup?.found && serverLookup.patientCategory) {
			return serverLookup.patientCategory;
		}
		if (!resolvedPatient) return "Первичный";
		return resolvePatientCategory(
			resolvedPatient,
			lastVisitSummary,
			patientInsight,
		);
	}, [serverLookup, resolvedPatient, lastVisitSummary, patientInsight]);

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
		isServerLookupLoading,
	};
}
