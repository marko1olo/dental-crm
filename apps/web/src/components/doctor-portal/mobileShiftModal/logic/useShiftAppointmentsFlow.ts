import { useState, useEffect, useMemo, useCallback } from "react";
import {
	filterDoctorShiftAppointments,
	transitionAppointmentStatus,
	adaptToDoctorShiftAppointments,
	DOCTOR_APPOINTMENT_STATUS_META,
	type DoctorShiftAppointment,
	type DoctorAppointmentStatus,
} from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { showToast } from "../../../GlobalToast";
import type {
	ChairStatusType,
	DoctorMobileShiftModalProps,
	DoctorShiftTab,
} from "../types";
import { getShowcaseShiftAppointments } from "../shiftApiUtils";

const EMPTY_APPOINTMENTS: readonly DoctorShiftAppointment[] = [];

export interface UseShiftAppointmentsFlowParams {
	initialDoctorId: string;
	initialDoctorName: string;
	initialDoctorSpecialty: string;
	initialShiftDateIso: string;
	initialAppointments?: readonly DoctorShiftAppointment[] | undefined;
	rawAppointments?: readonly any[] | undefined;
	patients?: readonly any[] | undefined;
	chairs?: readonly any[] | undefined;
	onAppointmentUpdate?: ((appointments: readonly DoctorShiftAppointment[]) => void) | undefined;
}

export interface UseShiftAppointmentsFlowReturn {
	appointments: readonly DoctorShiftAppointment[];
	setAppointments: React.Dispatch<React.SetStateAction<readonly DoctorShiftAppointment[]>>;
	doctorAppointments: readonly DoctorShiftAppointment[];
	filteredAppointments: readonly DoctorShiftAppointment[];
	activeTab: DoctorShiftTab;
	setActiveTab: (tab: DoctorShiftTab) => void;
	expandedAptId: string | null;
	setExpandedAptId: (id: string | null | ((prev: string | null) => string | null)) => void;
	chairStatus: ChairStatusType;
	setChairStatus: (status: ChairStatusType) => void;
	handleStatusChange: (appointmentId: string, newStatus: DoctorAppointmentStatus) => void;
}

/**
 * useShiftAppointmentsFlow
 *
 * Manages appointment list hydration, filtering by status tabs, chair occupancy,
 * and seamless status transitions.
 * Complies with Mandate 8n (Solo Doctor Sovereignty) and Apple HIG Thumb Zone.
 */
export function useShiftAppointmentsFlow({
	initialDoctorId,
	initialDoctorName,
	initialDoctorSpecialty,
	initialShiftDateIso,
	initialAppointments = EMPTY_APPOINTMENTS,
	rawAppointments,
	patients,
	chairs,
	onAppointmentUpdate,
}: UseShiftAppointmentsFlowParams): UseShiftAppointmentsFlowReturn {
	const [appointments, setAppointments] = useState<readonly DoctorShiftAppointment[]>(() => {
		if (initialAppointments && initialAppointments.length > 0) {
			return initialAppointments;
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
			if (adapted.length > 0) {
				return adapted;
			}
		}
		if (isDemoShowcaseMode()) {
			return getShowcaseShiftAppointments(
				initialDoctorId,
				initialDoctorName,
				initialDoctorSpecialty,
				initialShiftDateIso,
			);
		}
		return EMPTY_APPOINTMENTS;
	});

	const [activeTab, setActiveTab] = useState<DoctorShiftTab>("all");
	const [expandedAptId, setExpandedAptId] = useState<string | null>(null);
	const [chairStatus, setChairStatus] = useState<ChairStatusType>(() => {
		return appointments.some((a) => a.status === "in_chair") ? "in_chair" : "free";
	});

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
			if (adapted.length > 0) {
				setAppointments(adapted);
				return;
			}
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

			if (newStatus === "in_chair") {
				setChairStatus("in_chair");
			} else if (newStatus === "completed") {
				const hasOtherInChair = updated.some(
					(a) => a.id !== appointmentId && a.status === "in_chair",
				);
				if (!hasOtherInChair) {
					setChairStatus("free");
				}
			}

			const statusTitle = DOCTOR_APPOINTMENT_STATUS_META[newStatus].labelRu;
			showToast(`Статус приема изменен: ${statusTitle}`, "info");
		},
		[appointments, onAppointmentUpdate],
	);

	return {
		appointments,
		setAppointments,
		doctorAppointments,
		filteredAppointments,
		activeTab,
		setActiveTab,
		expandedAptId,
		setExpandedAptId,
		chairStatus,
		setChairStatus,
		handleStatusChange,
	};
}
