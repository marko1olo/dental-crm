import { useState, useEffect, useMemo, useCallback } from "react";
import {
	filterDoctorShiftAppointments,
	calculateDoctorShiftEarnings,
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	transitionAppointmentStatus,
	adaptToDoctorShiftAppointments,
	DOCTOR_APPOINTMENT_STATUS_META,
	type DoctorShiftAppointment,
	type DoctorAppointmentStatus,
	type EmrBatchSigningSession,
} from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast";
import type { DoctorShiftStats } from "../../shift/DoctorShiftControlBar";
import type { DoctorShiftEmrSummary } from "../../shift/DoctorShiftCloseModal";
import type {
	DoctorMobileShiftModalProps,
	DoctorShiftTab,
	UseDoctorMobileShiftReturn,
} from "./types";
import {
	getShowcaseShiftAppointments,
	persistBatchSigningToApi,
	buildEmergencyAppointment,
} from "./shiftApiUtils";

const EMPTY_INITIAL_APPOINTMENTS: readonly DoctorShiftAppointment[] = [];

export function useDoctorMobileShift(
	props: DoctorMobileShiftModalProps,
): UseDoctorMobileShiftReturn {
	const {
		initialDoctorId = "doc-1",
		initialDoctorName = "Врач не выбран",
		initialDoctorSpecialty = "Врач-стоматолог терапевт-ортопед",
		initialShiftDateIso = new Date().toISOString().split("T")[0]!,
		initialAppointments = EMPTY_INITIAL_APPOINTMENTS,
		rawAppointments,
		patients,
		chairs,
		onAppointmentUpdate,
		onEmergencyVisit,
		onShiftClose,
		onClose,
	} = props;

	const [appointments, setAppointments] = useState<readonly DoctorShiftAppointment[]>(() => {
		if (initialAppointments && initialAppointments.length > 0) {
			return initialAppointments;
		}
		if (rawAppointments && rawAppointments.length > 0) {
			return adaptToDoctorShiftAppointments({
				appointments: rawAppointments,
				doctorId: initialDoctorId,
				doctorName: initialDoctorName,
				doctorSpecialty: initialDoctorSpecialty,
				shiftDateIso: initialShiftDateIso,
				patients,
				chairs,
			});
		}
		if (isDemoShowcaseMode()) {
			return getShowcaseShiftAppointments(
				initialDoctorId,
				initialDoctorName,
				initialDoctorSpecialty,
				initialShiftDateIso,
			);
		}
		return EMPTY_INITIAL_APPOINTMENTS;
	});

	const [activeTab, setActiveTab] = useState<DoctorShiftTab>("all");
	const [expandedAptId, setExpandedAptId] = useState<string | null>(null);
	const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);

	// Batch PEP SMS Signing State
	const [signingSession, setSigningSession] = useState<EmrBatchSigningSession | null>(null);
	const [enteredSmsCode, setEnteredSmsCode] = useState<string>("");
	const [smsCountdown, setSmsCountdown] = useState<number>(300);
	const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

	// Synchronize or load live shift appointments
	useEffect(() => {
		if (initialAppointments && initialAppointments.length > 0) {
			setAppointments(initialAppointments);
			return;
		}
		if (rawAppointments && rawAppointments.length > 0) {
			const adapted = adaptToDoctorShiftAppointments({
				appointments: rawAppointments,
				doctorId: initialDoctorId,
				doctorName: initialDoctorName,
				doctorSpecialty: initialDoctorSpecialty,
				shiftDateIso: initialShiftDateIso,
				patients,
				chairs,
			});
			setAppointments(adapted);
			return;
		}
		if (isDemoShowcaseMode()) {
			setAppointments(
				getShowcaseShiftAppointments(
					initialDoctorId,
					initialDoctorName,
					initialDoctorSpecialty,
					initialShiftDateIso,
				),
			);
			return;
		}

		// Боевой режим (Production: !isDemoShowcaseMode()): загружаем живые приемы лечащего врача из API
		let isMounted = true;
		const targetDate =
			initialShiftDateIso?.split("T")[0] || new Date().toISOString().split("T")[0]!;

		const fetchLiveAppointments = async () => {
			try {
				const res = await fetch(
					`/api/appointments?doctorId=${encodeURIComponent(initialDoctorId)}&date=${encodeURIComponent(targetDate)}`,
				);
				if (res.ok) {
					const data = await res.json();
					const list = Array.isArray(data)
						? data
						: Array.isArray(data?.appointments)
							? data.appointments
							: [];
					if (isMounted) {
						const adapted = adaptToDoctorShiftAppointments({
							appointments: list,
							doctorId: initialDoctorId,
							doctorName: initialDoctorName,
							doctorSpecialty: initialDoctorSpecialty,
							shiftDateIso: targetDate,
							patients,
							chairs,
						});
						setAppointments(adapted);
						onAppointmentUpdate?.(adapted);
					}
				}
			} catch (err) {
				console.warn(
					"[DoctorMobileShiftModal] Загрузка расписания смены из API завершилась с ошибкой",
					err,
				);
			}
		};

		fetchLiveAppointments();
		return () => {
			isMounted = false;
		};
	}, [
		initialAppointments,
		rawAppointments,
		initialDoctorId,
		initialDoctorName,
		initialDoctorSpecialty,
		initialShiftDateIso,
		patients,
		chairs,
		onAppointmentUpdate,
	]);

	// Isolate current doctor's appointments
	const doctorAppointments = useMemo(() => {
		return filterDoctorShiftAppointments(
			appointments,
			initialDoctorId,
			initialShiftDateIso,
		);
	}, [appointments, initialDoctorId, initialShiftDateIso]);

	// Calculate live piece-rate earnings & operational summary
	const earnings = useMemo(() => {
		return calculateDoctorShiftEarnings(
			doctorAppointments,
			initialDoctorId,
			initialShiftDateIso,
			25, // Standard therapy/ortho commission baseline
		);
	}, [doctorAppointments, initialDoctorId, initialShiftDateIso]);

	// Filtered appointment list for current active tab
	const filteredAppointments = useMemo(() => {
		return doctorAppointments.filter((apt) => {
			if (activeTab === "in_chair") return apt.status === "in_chair";
			if (activeTab === "waiting") return apt.status === "waiting";
			if (activeTab === "completed") return apt.status === "completed";
			if (activeTab === "needs_sign") {
				return apt.status === "completed" && apt.emrCard043uStatus !== "signed";
			}
			return true;
		});
	}, [doctorAppointments, activeTab]);

	// Unsigned completed cards eligible for 1-click batch signing
	const unsignedAppointmentIds = useMemo(() => {
		return doctorAppointments
			.filter(
				(apt) =>
					(apt.status === "completed" || apt.emrCard043uStatus === "pending_signature") &&
					apt.emrCard043uStatus !== "signed",
			)
			.map((apt) => apt.id);
	}, [doctorAppointments]);

	// Shift reconciliation stats for shift close modal & Form D-1
	const shiftStats: DoctorShiftStats = useMemo(() => {
		return {
			totalAppointments: earnings.totalAppointmentsCount,
			completedCount: earnings.completedAppointmentsCount,
			inProgressCount: earnings.inChairAppointmentsCount,
			totalRevenueRub: Math.round(earnings.grossRevenueKop / 100),
			doctorCommissionPct: 25,
			estimatedDoctorPayoutRub: Math.round(earnings.totalEarnedDealKop / 100),
			hasActiveOvertime: new Date().getHours() >= 21,
		};
	}, [earnings]);

	const emrSummary: DoctorShiftEmrSummary = useMemo(() => {
		return {
			signedCount: earnings.signedEmr043Count,
			pendingSignatureCount: unsignedAppointmentIds.length,
			draftCount: Math.max(
				0,
				earnings.totalAppointmentsCount -
					earnings.signedEmr043Count -
					unsignedAppointmentIds.length,
			),
		};
	}, [earnings, unsignedAppointmentIds.length]);

	// SMS Countdown timer
	useEffect(() => {
		if (!signingSession) return;
		const timer = setInterval(() => {
			setSmsCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [signingSession]);

	const handleConfirmCloseShift = useCallback(() => {
		setIsCloseModalOpen(false);
		showToast("Смена врача успешно закрыта. Акт сдачи-приемки сформирован.", "success");
		onShiftClose?.();
		onClose();
	}, [onShiftClose, onClose]);

	// 1-Click Status Transitions
	const handleStatusChange = useCallback(
		(appointmentId: string, newStatus: DoctorAppointmentStatus) => {
			const updated = appointments.map((apt) => {
				if (apt.id === appointmentId) {
					return transitionAppointmentStatus(apt, newStatus);
				}
				return apt;
			});
			setAppointments(updated);
			onAppointmentUpdate?.(updated);

			const statusTitle = DOCTOR_APPOINTMENT_STATUS_META[newStatus].labelRu;
			showToast(`Статус приема изменен: ${statusTitle}`, "info");
		},
		[appointments, onAppointmentUpdate],
	);

	// Start Batch Signing Session
	const handleInitiateBatchSigning = useCallback(() => {
		if (unsignedAppointmentIds.length === 0) {
			showToast("Все медицинские карты уже подписаны!", "success");
			return;
		}

		const session = initiateBatchEmrSigning({
			doctorId: initialDoctorId,
			doctorName: initialDoctorName,
			doctorPhone: "+7 (926) 555-12-34",
			appointmentIds: unsignedAppointmentIds,
			...(initialShiftDateIso ? { shiftDateIso: initialShiftDateIso } : {}),
		});

		setSigningSession(session);
		setEnteredSmsCode("");
		setSmsCountdown(300);
	}, [unsignedAppointmentIds, initialDoctorId, initialDoctorName, initialShiftDateIso]);

	// Single appointment SMS signing
	const handleInitiateSingleSmsSigning = useCallback(
		(appointmentId: string) => {
			const session = initiateBatchEmrSigning({
				doctorId: initialDoctorId,
				doctorName: initialDoctorName,
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: [appointmentId],
				...(initialShiftDateIso ? { shiftDateIso: initialShiftDateIso } : {}),
			});
			setSigningSession(session);
			setEnteredSmsCode("");
			setSmsCountdown(300);
		},
		[initialDoctorId, initialDoctorName, initialShiftDateIso],
	);

	// Confirm SMS Code and Sign Batch
	const handleConfirmSmsSigning = useCallback(() => {
		if (!signingSession) return;
		if (enteredSmsCode.length < 6) {
			showToast(
				"Введите 6-значный СМС-код подтверждения или нажмите кнопку ниже для сессионной ПЭП",
				"warning",
			);
			return;
		}

		setIsSubmittingCode(true);
		const result = verifyAndSignBatchEmr({
			session: signingSession,
			enteredCode: enteredSmsCode,
			appointments,
			doctorName: initialDoctorName,
			doctorSnils: "123-456-789 64",
		});

		setIsSubmittingCode(false);

		if (result.success) {
			setAppointments(result.updatedAppointments);
			onAppointmentUpdate?.(result.updatedAppointments);
			setSigningSession(null);
			persistBatchSigningToApi(
				initialDoctorId,
				initialDoctorName,
				initialShiftDateIso,
				result.protocolHash,
				result.signedAtIso,
				result.signedAppointmentIds,
				result.updatedAppointments,
			);
			showToast(result.messageRu, "success");
		} else {
			showToast(result.messageRu, "error");
		}
	}, [
		signingSession,
		enteredSmsCode,
		appointments,
		initialDoctorId,
		initialDoctorName,
		initialShiftDateIso,
		onAppointmentUpdate,
	]);

	// 1-Click Legal PEP Signing via Active Session
	const handleSessionPepSigning = useCallback(
		(targetIds: readonly string[]) => {
			if (targetIds.length === 0) {
				showToast("Все медицинские карты уже подписаны!", "success");
				return;
			}

			const session = initiateBatchEmrSigning({
				doctorId: initialDoctorId,
				doctorName: initialDoctorName,
				doctorPhone: "+7 (926) 555-12-34",
				appointmentIds: [...targetIds],
				...(initialShiftDateIso ? { shiftDateIso: initialShiftDateIso } : {}),
			});

			const result = verifyAndSignBatchEmr({
				session,
				enteredCode: "SESSION_AUTH",
				appointments,
				doctorName: initialDoctorName,
				doctorSnils: "123-456-789 64",
				isSessionAuthorized: true,
			});

			if (result.success) {
				setAppointments(result.updatedAppointments);
				onAppointmentUpdate?.(result.updatedAppointments);
				setSigningSession(null);
				persistBatchSigningToApi(
					initialDoctorId,
					initialDoctorName,
					initialShiftDateIso,
					result.protocolHash,
					result.signedAtIso,
					result.signedAppointmentIds,
					result.updatedAppointments,
				);
				showToast(result.messageRu, "success");
			} else {
				showToast(result.messageRu, "error");
			}
		},
		[
			initialDoctorId,
			initialDoctorName,
			initialShiftDateIso,
			appointments,
			onAppointmentUpdate,
		],
	);

	// Emergency patient admission in 1-click
	const handleEmergencyVisit = useCallback(() => {
		if (onEmergencyVisit) {
			onEmergencyVisit();
			return;
		}
		const emergencyApt = buildEmergencyAppointment(
			initialDoctorId,
			initialDoctorName,
			initialShiftDateIso,
		);
		const updated = [emergencyApt, ...appointments];
		setAppointments(updated);
		onAppointmentUpdate?.(updated);
		showToast("Экстренный пациент принят в кресло (острая боль)", "success");
	}, [
		onEmergencyVisit,
		initialDoctorId,
		initialDoctorName,
		initialShiftDateIso,
		appointments,
		onAppointmentUpdate,
	]);

	// Dynamically formatted shift date in Russian locale
	const formattedShiftDate = useMemo(() => {
		const shiftDate = initialShiftDateIso ?? new Date().toISOString().split("T")[0]!;
		try {
			const datePart = shiftDate.split("T")[0] ?? shiftDate;
			const d = new Date(datePart + "T00:00:00");
			if (Number.isNaN(d.getTime())) return shiftDate;
			return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
		} catch {
			return shiftDate;
		}
	}, [initialShiftDateIso]);

	return {
		appointments,
		doctorAppointments,
		filteredAppointments,
		activeTab,
		setActiveTab,
		expandedAptId,
		setExpandedAptId,
		isCloseModalOpen,
		setIsCloseModalOpen,
		signingSession,
		setSigningSession,
		enteredSmsCode,
		setEnteredSmsCode,
		smsCountdown,
		isSubmittingCode,
		earnings,
		unsignedAppointmentIds,
		shiftStats,
		emrSummary,
		formattedShiftDate,
		handleStatusChange,
		handleInitiateBatchSigning,
		handleInitiateSingleSmsSigning,
		handleConfirmSmsSigning,
		handleSessionPepSigning,
		handleConfirmCloseShift,
		handleEmergencyVisit,
	};
}
