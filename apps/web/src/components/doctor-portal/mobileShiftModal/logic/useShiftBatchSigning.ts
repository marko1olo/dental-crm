import { useState, useEffect, useMemo, useCallback } from "react";
import {
	initiateBatchEmrSigning,
	verifyAndSignBatchEmr,
	type DoctorShiftAppointment,
	type EmrBatchSigningSession,
} from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { persistBatchSigningToApi } from "../shiftApiUtils";

export interface UseShiftBatchSigningParams {
	initialDoctorId: string;
	initialDoctorName: string;
	initialShiftDateIso: string;
	appointments: readonly DoctorShiftAppointment[];
	setAppointments: React.Dispatch<React.SetStateAction<readonly DoctorShiftAppointment[]>>;
	doctorAppointments: readonly DoctorShiftAppointment[];
	onAppointmentUpdate?: ((appointments: readonly DoctorShiftAppointment[]) => void) | undefined;
}

export interface UseShiftBatchSigningReturn {
	signingSession: EmrBatchSigningSession | null;
	setSigningSession: (session: EmrBatchSigningSession | null) => void;
	enteredSmsCode: string;
	setEnteredSmsCode: (code: string) => void;
	smsCountdown: number;
	isSubmittingCode: boolean;
	unsignedAppointmentIds: readonly string[];
	handleInitiateBatchSigning: () => void;
	handleInitiateSingleSmsSigning: (appointmentId: string) => void;
	handleConfirmSmsSigning: () => void;
	handleSessionPepSigning: (targetIds: readonly string[]) => void;
}

/**
 * useShiftBatchSigning
 *
 * Dedicated batch EMR Form 043/u signing hook.
 * Complies with Mandate 8e (Doctor Autonomy) & Mandate 8k (No Reality Simulator):
 * - 1-Click Session PEP signing fallback when cell reception is weak.
 * - Batch SMS verification for completed shift visits.
 * - Instant synchronization to backend audit trail.
 */
export function useShiftBatchSigning({
	initialDoctorId,
	initialDoctorName,
	initialShiftDateIso,
	appointments,
	setAppointments,
	doctorAppointments,
	onAppointmentUpdate,
}: UseShiftBatchSigningParams): UseShiftBatchSigningReturn {
	const [signingSession, setSigningSession] = useState<EmrBatchSigningSession | null>(null);
	const [enteredSmsCode, setEnteredSmsCode] = useState<string>("");
	const [smsCountdown, setSmsCountdown] = useState<number>(300);
	const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

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

	// SMS Countdown timer
	useEffect(() => {
		if (!signingSession) return;
		const timer = setInterval(() => {
			setSmsCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [signingSession]);

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
		setAppointments,
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
			setAppointments,
		],
	);

	return {
		signingSession,
		setSigningSession,
		enteredSmsCode,
		setEnteredSmsCode,
		smsCountdown,
		isSubmittingCode,
		unsignedAppointmentIds,
		handleInitiateBatchSigning,
		handleInitiateSingleSmsSigning,
		handleConfirmSmsSigning,
		handleSessionPepSigning,
	};
}
