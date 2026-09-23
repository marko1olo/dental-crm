import {
	type Appointment,
	type AppointmentReadiness,
	type Dashboard,
	STOMX_REFUSE_REASONS_CATALOG,
} from "@dental/shared";
import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	FileText,
	FlaskConical,
	Globe,
	MoreHorizontal,
	PhoneCall,
	Printer,
	Repeat,
	Search,
	User,
	UserCheck,
	UserPlus,
	UserX,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { matchesPatientSearch } from "../../utils/patientSearchUtils";
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
	type ResourceCollisionResult,
} from "../../utils/scheduleCollisionUtils";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "../patients/blankContractPrint";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import {
	type ChairDoctorShiftAssignment,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./ScheduleGrid";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

export { resolveChairDutyDoctor };

import { safeLocalStorageGetJson } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

export const QUICK_APPOINTMENT_REASONS = [
	{
		label: "Острая боль",
		fullLabel: "Острая боль (30 мин)",
		reason: "Острая боль (Неотложная помощь / Cito / ст. 124 УК РФ)",
		durationMinutes: 30,
		comment: "Экстренно: обращение с острой болью (ст. 124 УК РФ)",
		status: "confirmed" as const,
		tone: "emergency" as const,
	},
	{
		label: "Плановое обследование",
		fullLabel: "Плановое обследование (30 мин)",
		reason: "Плановое обследование полости рта",
		durationMinutes: 30,
		tone: "standard" as const,
	},
	{
		label: "Повторно",
		fullLabel: "Повторно (30 мин)",
		reason: "Повторный приём / продолжение лечения",
		durationMinutes: 30,
		tone: "standard" as const,
	},
	{
		label: "Лечение",
		fullLabel: "Лечение (60 мин)",
		reason: "Лечение кариеса / терапия / эстетическая реставрация",
		durationMinutes: 60,
		tone: "standard" as const,
	},
	{
		label: "Консультация",
		fullLabel: "Консультация (30 мин)",
		reason: "Первичный осмотр и составление плана лечения",
		durationMinutes: 30,
		tone: "standard" as const,
	},
	{
		label: "Профгигиена",
		fullLabel: "Профгигиена / AirFlow (60 мин)",
		reason: "Комплексная гигиена полости рта (AirFlow + УЗ)",
		durationMinutes: 60,
		tone: "standard" as const,
	},
	{
		label: "Удаление зуба",
		fullLabel: "Удаление зуба (45 мин)",
		reason: "Хирургический прием: удаление зуба / анестезия",
		durationMinutes: 45,
		tone: "standard" as const,
	},
	{
		label: "Примерка / ЗТЛ",
		fullLabel: "Примерка / ЗТЛ (30 мин)",
		reason: "Ортопедический прием: примерка / фиксация конструкции ЗТЛ",
		durationMinutes: 30,
		tone: "standard" as const,
	},
] as const;

export const TECHNICAL_BREAK_PRESETS = [
	{
		label: "Обед (60 мин)",
		shortLabel: "Обед",
		reason: "Служебный перерыв: Обед",
		durationMinutes: 60,
		comment: "Служебная бронь: Обед врача / персонала",
	},
	{
		label: "Перерыв (30 мин)",
		shortLabel: "Перерыв",
		reason: "Технический перерыв: Перерыв",
		durationMinutes: 30,
		comment: "Служебная бронь: Перерыв врача",
	},
	{
		label: "Отпуск",
		shortLabel: "Отпуск",
		reason: "Блокировка расписания: Отпуск",
		durationMinutes: 480,
		comment: "Служебная бронь: Отпуск врача",
	},
	{
		label: "Учеба / Консилиум (120 мин)",
		shortLabel: "Учеба",
		reason: "Служебный перерыв: Учеба / Консилиум",
		durationMinutes: 120,
		comment: "Служебная бронь: Клинический консилиум / Обучение",
	},
	{
		label: "Отсутствует",
		shortLabel: "Отсутствует",
		reason: "Блокировка расписания: Отсутствует",
		durationMinutes: 120,
		comment: "Служебная бронь: Врач отсутствует",
	},
	{
		label: "Другое (блокировка)",
		shortLabel: "Другое",
		reason: "Служебный перерыв: Другое",
		durationMinutes: 30,
		comment: "Служебная бронь: Другое (блокировка)",
	},
	{
		label: "Санобработка (30 мин)",
		shortLabel: "Санобработка",
		reason: "Технический перерыв: Санобработка",
		durationMinutes: 30,
		comment: "Служебная бронь: Текущая дезинфекция и санобработка кабинета",
	},
] as const;

export function isTechnicalBreakAppointment(
	item: { reason?: string | null; comment?: string | null } | null | undefined,
): boolean {
	if (!item) return false;
	const r = String(item.reason || "").toLowerCase();
	const c = String(item.comment || "").toLowerCase();
	return (
		r.includes("служебный перерыв") ||
		r.includes("технический перерыв") ||
		r.includes("служебная бронь") ||
		r.includes("служебная блокировка") ||
		r.includes("санобработка") ||
		r.includes("обед") ||
		r.includes("перерыв") ||
		r.includes("отпуск") ||
		r.includes("учеба") ||
		r.includes("учёба") ||
		r.includes("отсутствует") ||
		r.includes("консилиум") ||
		r.includes("другое (блокировка)") ||
		r.includes("другое (служебное)") ||
		r.includes("блокировка") ||
		c.includes("служебная бронь") ||
		c.includes("служебная блокировка") ||
		c.includes("технический интервал") ||
		c.includes("блокировка")
	);
}

export interface AppointmentModalProps {
	isOpen: boolean;
	appointment: Appointment | null;
	dashboard: Dashboard;
	onClose: () => void;
	onSave: (
		appointmentId: string,
		draft: {
			startsAt: string;
			endsAt: string;
			doctorUserId: string;
			assistantUserId: string | null;
			chairId: string;
			patientId: string | null;
			status: Appointment["status"];
			reason: string;
			comment: string;
		},
	) => Promise<boolean>;
	repeatAppointment?: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: (appointment: Appointment) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime: (iso: string) => string;
	toDateTimeLocalValue: (iso: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	appointmentReadinessById?: Map<string, AppointmentReadiness>;
	chairDoctorAssignments?:
		| Record<string, ChairDoctorShiftAssignment>
		| undefined;
	onQuickCreatePatient?: (data: {
		fullName: string;
		phone?: string | null;
	}) =>
		| Promise<{ id: string; fullName: string } | null>
		| { id: string; fullName: string }
		| null;
}

export function AppointmentModal(props: AppointmentModalProps) {
	const {
		isOpen,
		appointment,
		dashboard,
		onClose,
		onSave,
		repeatAppointment,
		copyAppointmentToBuffer,
		patientName,
		formatTime,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		appointmentLabels,
		activeVisitLockedAppointmentStatuses,
		appointmentReadinessById,
		chairDoctorAssignments,
		onQuickCreatePatient,
	} = props;

	const timezone =
		dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(
		() =>
			staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			),
		[staff],
	);
	const assistants = useMemo(
		() => staff.filter((m) => m.active && m.role === "assistant"),
		[staff],
	);
	const chairs = useMemo(
		() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active),
		[dashboard?.clinicSettings?.chairs],
	);
	const isSoloDoctor =
		dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
		dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
		(dashboard?.clinicSettings?.profile?.mode as string) === "solo_practice" ||
		(doctors.length <= 1 && chairs.length <= 1) ||
		doctors.length <= 1;
	const activePatients = useMemo(
		() => (dashboard?.patients ?? []).filter((p) => p.status === "active"),
		[dashboard?.patients],
	);

	const [patientId, setPatientId] = useState(
		() => appointment?.patientId ?? "",
	);
	const [patientSearchQuery, setPatientSearchQuery] = useState("");
	const [createdPatients, setCreatedPatients] = useState<
		Array<{ id: string; fullName: string; phone?: string | null }>
	>([]);
	const [isInlineNewPatient, setIsInlineNewPatient] = useState(false);
	const [newPatientFullName, setNewPatientFullName] = useState("");
	const [newPatientPhone, setNewPatientPhone] = useState("");
	const [isCreatingInlinePatient, setIsCreatingInlinePatient] = useState(false);

	const allDisplayPatients = useMemo(() => {
		const base = [...activePatients];
		for (const cp of createdPatients) {
			if (!base.some((p) => p.id === cp.id)) {
				base.unshift({
					id: cp.id,
					fullName: cp.fullName,
					phone: cp.phone || null,
					status: "active",
				} as any);
			}
		}
		const q = patientSearchQuery.trim();
		if (!q) return base;
		const filtered = base.filter((p) => matchesPatientSearch(p, q));
		// If current patient is selected, retain it so the select element maintains its value
		if (patientId && !filtered.some((p) => p.id === patientId)) {
			const current = base.find((p) => p.id === patientId);
			if (current) filtered.unshift(current);
		}
		return filtered;
	}, [activePatients, createdPatients, patientSearchQuery, patientId]);

	const safeToDateTimeLocalValue = useCallback(
		(iso: string | null | undefined, tz?: string | null) => {
			if (!iso) return "";
			if (typeof toDateTimeLocalValue === "function") {
				return toDateTimeLocalValue(iso, tz);
			}
			return iso.length >= 16 ? iso.slice(0, 16) : iso;
		},
		[toDateTimeLocalValue],
	);

	const safeFromDateTimeLocalValue = useCallback(
		(val: string | null | undefined, tz?: string | null) => {
			if (!val) return "";
			if (typeof fromDateTimeLocalValue === "function") {
				return fromDateTimeLocalValue(val, tz);
			}
			return val.includes("T") && val.length === 16 ? `${val}:00.000Z` : val;
		},
		[fromDateTimeLocalValue],
	);

	const [doctorUserId, setDoctorUserId] = useState(
		() => appointment?.doctorUserId ?? "",
	);
	const [assistantUserId, setAssistantUserId] = useState<string | null>(
		() => appointment?.assistantUserId ?? null,
	);
	const [chairId, setChairId] = useState(() => appointment?.chairId ?? "");
	const [startsAtLocal, setStartsAtLocal] = useState(() =>
		appointment?.startsAt
			? typeof toDateTimeLocalValue === "function"
				? toDateTimeLocalValue(appointment.startsAt, timezone)
				: appointment.startsAt.slice(0, 16)
			: "",
	);
	const [endsAtLocal, setEndsAtLocal] = useState(() =>
		appointment?.endsAt
			? typeof toDateTimeLocalValue === "function"
				? toDateTimeLocalValue(appointment.endsAt, timezone)
				: appointment.endsAt.slice(0, 16)
			: "",
	);
	const [status, setStatus] = useState<Appointment["status"]>(
		() => appointment?.status ?? "planned",
	);
	const [reason, setReason] = useState(() => appointment?.reason ?? "");
	const [comment, setComment] = useState(() => appointment?.comment ?? "");
	const [isCito, setIsCito] = useState(() =>
		Boolean(
			(appointment as any)?.isCito ||
				(appointment as any)?.cito ||
				(appointment as any)?.tag === "cito" ||
				isCitoAppointment(appointment),
		),
	);

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const handleCreateInlinePatient = useCallback(
		async (override?: {
			fullName?: string;
			phone?: string | null;
		}): Promise<{
			id: string;
			fullName: string;
			phone?: string | null;
		} | null> => {
			const rawName = (override?.fullName ?? newPatientFullName).trim();
			const rawPhone = (override?.phone ?? newPatientPhone).trim();
			let effectiveName = rawName;
			if (!effectiveName) {
				if (rawPhone) {
					effectiveName = `Пациент (${rawPhone})`;
				} else {
					showToast(
						"Укажите имя или телефон пациента для быстрой записи",
						"warning",
					);
					if (typeof document !== "undefined") {
						const nameInput = document.querySelector<HTMLInputElement>(
							'[data-testid="appointment-quick-patient-name"]',
						);
						nameInput?.focus();
					}
					return null;
				}
			}
			setIsCreatingInlinePatient(true);
			setError(null);
			try {
				let created: {
					id: string;
					fullName: string;
					phone?: string | null;
				} | null = null;
				if (onQuickCreatePatient) {
					const res = await Promise.resolve(
						onQuickCreatePatient({
							fullName: effectiveName,
							phone: rawPhone || null,
						}),
					);
					if (res?.id) {
						created = {
							id: res.id,
							fullName: res.fullName || effectiveName,
							phone: rawPhone || null,
						};
					}
				}
				if (!created?.id) {
					try {
						const res = await fetch("/api/patients", {
							method: "POST",
							headers: denteAdminSecretRequestHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({
								fullName: effectiveName,
								phone: rawPhone || null,
							}),
						});
						if (res.ok) {
							const data = await res.json();
							if (data?.id) {
								created = {
									id: data.id,
									fullName: data.fullName || effectiveName,
									phone: data.phone || rawPhone || null,
								};
							}
						}
					} catch {
						// Fallback optimistic (Mandates 8e, 8k, 8n)
					}
				}
				if (!created?.id) {
					created = {
						id: `pat-quick-${Date.now()}`,
						fullName: effectiveName,
						phone: rawPhone || null,
					};
				}
				setCreatedPatients((prev) => [created!, ...prev]);
				setPatientId(created.id);
				setIsInlineNewPatient(false);
				setNewPatientFullName("");
				setNewPatientPhone("");
				setPatientSearchQuery("");
				showToast(
					`Пациент «${created.fullName}» создан и прикреплен к записи`,
					"success",
					3500,
				);
				return created;
			} finally {
				setIsCreatingInlinePatient(false);
			}
		},
		[newPatientFullName, newPatientPhone, onQuickCreatePatient],
	);

	useEffect(() => {
		if (!appointment || !isOpen) return;
		let defaultDoc = appointment.doctorUserId || "";
		if (!defaultDoc && (appointment as any).doctorName) {
			const cand = String((appointment as any).doctorName)
				.trim()
				.toLowerCase();
			const m = doctors.find(
				(d) =>
					d.fullName.toLowerCase() === cand ||
					d.fullName.toLowerCase().includes(cand) ||
					cand.includes(d.fullName.toLowerCase()),
			);
			if (m) defaultDoc = m.id;
		}
		let defaultChair =
			appointment.chairId || (chairs.length === 1 ? chairs[0]?.id : "") || "";
		if (!defaultChair && defaultDoc) {
			const chairWithDoc = chairs.find(
				(c) => (c as any).defaultDoctorId === defaultDoc,
			);
			if (chairWithDoc) {
				defaultChair = chairWithDoc.id;
			} else {
				const doc = doctors.find((d) => d.id === defaultDoc);
				if (doc?.specialties?.length) {
					const matchingChair = chairs.find(
						(c) =>
							c.specialization && doc.specialties.includes(c.specialization),
					);
					if (matchingChair) {
						defaultChair = matchingChair.id;
					}
				}
			}
		}
		if (!defaultChair && chairs.length > 0) {
			defaultChair = chairs[0]?.id || "";
		}
		if (!defaultChair && chairs.length === 0) {
			defaultChair = DEFAULT_SOLO_CHAIR.id;
		}

		// Auto-populate duty doctor from chairDoctorAssignments if doctor not explicitly assigned
		if (!defaultDoc && defaultChair) {
			const chairObj =
				chairs.find((c) => c.id === defaultChair) ||
				(defaultChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
			const duty = resolveChairDutyDoctor(
				defaultChair,
				appointment.startsAt,
				chairDoctorAssignments,
				appointment.startsAt ? appointment.startsAt.slice(0, 10) : undefined,
				null,
				(chairObj as any)?.defaultDoctorId ||
					(chairs.length <= 1 && doctors.length === 1 ? doctors[0]?.id : null),
			);
			if (duty.doctorId) {
				defaultDoc = duty.doctorId;
			}
		}
		// Also check chair defaultDoctorId
		if (!defaultDoc && defaultChair) {
			const chairObj = chairs.find((c) => c.id === defaultChair);
			if ((chairObj as any)?.defaultDoctorId) {
				defaultDoc = (chairObj as any).defaultDoctorId;
			}
		}
		if (!defaultDoc) {
			defaultDoc = doctors[0]?.id || "";
		}

		setPatientId(appointment.patientId ?? "");
		setPatientSearchQuery("");
		setIsInlineNewPatient(false);
		setNewPatientFullName("");
		setNewPatientPhone("");
		setDoctorUserId(defaultDoc);
		setAssistantUserId(appointment.assistantUserId ?? null);
		setChairId(defaultChair);
		setStartsAtLocal(safeToDateTimeLocalValue(appointment.startsAt, timezone));
		setEndsAtLocal(safeToDateTimeLocalValue(appointment.endsAt, timezone));
		setStatus(appointment.status || "planned");
		setReason(appointment.reason ?? "");
		setComment(appointment.comment ?? "");
		setIsCito(
			Boolean(
				(appointment as any)?.isCito ||
					(appointment as any)?.cito ||
					(appointment as any)?.tag === "cito" ||
					isCitoAppointment(appointment),
			),
		);
		setError(null);
		setIsSaving(false);
		setIsMenuOpen(false);
	}, [
		appointment,
		isOpen,
		safeToDateTimeLocalValue,
		timezone,
		doctors,
		chairs,
		chairDoctorAssignments,
	]);

	const currentChair = useMemo(() => {
		return (
			chairs.find((c) => c.id === chairId) ||
			(chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null)
		);
	}, [chairs, chairId]);

	const dutyDoctorInfo = useMemo(() => {
		const effChair = chairId || appointment?.chairId;
		const effStartsAt =
			startsAtLocal ||
			(appointment?.startsAt
				? safeToDateTimeLocalValue(appointment.startsAt, timezone)
				: "");
		const effChairObj =
			(effChair === chairId
				? currentChair
				: chairs.find((c) => c.id === effChair)) ||
			(effChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
		return resolveChairDutyDoctor(
			effChair,
			effStartsAt,
			chairDoctorAssignments,
			effStartsAt ? effStartsAt.slice(0, 10) : undefined,
			null,
			(effChairObj as any)?.defaultDoctorId ||
				(chairs.length <= 1 && doctors.length === 1 ? doctors[0]?.id : null),
		);
	}, [
		chairId,
		startsAtLocal,
		chairDoctorAssignments,
		appointment,
		safeToDateTimeLocalValue,
		timezone,
		currentChair,
		chairs,
		doctors,
	]);

	const dutyDoctorId = dutyDoctorInfo.doctorId;
	const dutyDocHours = dutyDoctorInfo.shiftHours;

	const dutyDoc = useMemo(() => {
		if (!dutyDoctorId) return null;
		return doctors.find((d) => d.id === dutyDoctorId) || null;
	}, [dutyDoctorId, doctors]);

	// Track active lab orders for the patient to align appointment slots with due dates
	const [activeLabOrders, setActiveLabOrders] = useState<any[]>([]);

	useEffect(() => {
		if (!patientId || !isOpen) {
			setActiveLabOrders([]);
			return;
		}
		let cancelled = false;
		fetch(
			`/api/clinical/lab-orders?patientId=${encodeURIComponent(patientId)}`,
			{
				headers: denteAdminSecretRequestHeaders(),
			},
		)
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				if (!cancelled) {
					const list = Array.isArray(data)
						? data
						: Array.isArray(data?.orders)
							? data.orders
							: Array.isArray(data?.data)
								? data.data
								: [];
					const active = list.filter(
						(o: any) => o.status !== "completed" && o.status !== "cancelled",
					);
					setActiveLabOrders(active);
				}
			})
			.catch(() => {
				if (!cancelled) setActiveLabOrders([]);
			});
		return () => {
			cancelled = true;
		};
	}, [patientId, isOpen]);

	const hasOpenVisit = Boolean(
		(dashboard?.activeVisit &&
			appointment &&
			dashboard.activeVisit.appointmentId === appointment.id) ||
			(props as any).hasOpenVisit,
	);

	const collision = useMemo(() => {
		if (!appointment || !startsAtLocal || !endsAtLocal) {
			return {
				hasCollision: false,
				conflictType: null,
				conflictingAppointment: null,
				message: null,
				isCitoOverbooking: false,
			} satisfies ResourceCollisionResult;
		}
		const effectiveIsCito = Boolean(
			isCito ||
				(appointment as any)?.isCito ||
				(appointment as any)?.cito ||
				(appointment as any)?.tag === "cito" ||
				isCitoAppointment({ reason, comment }),
		);
		return checkAppointmentResourceCollision(
			{
				startsAt: safeFromDateTimeLocalValue(startsAtLocal, timezone),
				endsAt: safeFromDateTimeLocalValue(endsAtLocal, timezone),
				doctorUserId: doctorUserId || null,
				chairId: chairId || null,
				assistantUserId: assistantUserId || null,
				patientId: patientId || null,
				isCito: effectiveIsCito,
				reason,
			},
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment.id,
				staff: dashboard?.clinicSettings?.staff,
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
				formatTimeFn: (iso) =>
					safeToDateTimeLocalValue(iso, timezone).slice(11, 16),
				isCito: effectiveIsCito,
				allowCitoOverbooking: effectiveIsCito,
			},
		);
	}, [
		appointment,
		startsAtLocal,
		endsAtLocal,
		doctorUserId,
		chairId,
		assistantUserId,
		patientId,
		status,
		reason,
		comment,
		isCito,
		fromDateTimeLocalValue,
		toDateTimeLocalValue,
		timezone,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.patients,
	]);

	const readiness =
		(appointment && appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment.id)
			: undefined) ?? null;

	const currentDurationMinutes = useMemo(() => {
		if (!startsAtLocal || !endsAtLocal) return 0;
		try {
			const startMs = Date.parse(
				safeFromDateTimeLocalValue(startsAtLocal, timezone),
			);
			const endMs = Date.parse(
				safeFromDateTimeLocalValue(endsAtLocal, timezone),
			);
			if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
			return Math.round((endMs - startMs) / (60 * 1000));
		} catch {
			return 0;
		}
	}, [startsAtLocal, endsAtLocal, safeFromDateTimeLocalValue, timezone]);

	const applyDuration = useCallback(
		(minutes: number) => {
			let startVal = startsAtLocal;
			if (!startVal) {
				const now = new Date();
				now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
				startVal = safeToDateTimeLocalValue(now.toISOString(), timezone);
				setStartsAtLocal(startVal);
			}
			try {
				const startDate = new Date(
					safeFromDateTimeLocalValue(startVal, timezone),
				);
				if (!isNaN(startDate.getTime())) {
					const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
					setEndsAtLocal(
						safeToDateTimeLocalValue(endDate.toISOString(), timezone),
					);
				}
			} catch {
				// ignore parse error
			}
		},
		[
			startsAtLocal,
			safeFromDateTimeLocalValue,
			safeToDateTimeLocalValue,
			timezone,
		],
	);

	const handleApplyReasonPreset = useCallback(
		(preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => {
			setReason(preset.reason);
			applyDuration(preset.durationMinutes);
			if (preset.tone === "emergency") {
				setIsCito(true);
			}
			if ("comment" in preset && preset.comment && !comment) {
				setComment(preset.comment);
			}
			if ("status" in preset && preset.status) {
				setStatus(preset.status);
			}
		},
		[applyDuration, comment],
	);

	const handleApplyTechnicalBreakPreset = useCallback(
		(preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => {
			setReason(preset.reason);
			applyDuration(preset.durationMinutes);
			setComment(preset.comment);
		},
		[applyDuration],
	);

	const handleApplyRefusalReason = useCallback((nameRu: string) => {
		const cancelTag = `[Отмена: ${nameRu}]`;
		setComment((prev) => {
			if (/\[Отмена:[^\]]*\]/.test(prev)) {
				return prev.replace(/\[Отмена:[^\]]*\]/, cancelTag);
			}
			return prev.trim() ? `${prev.trim()}\n${cancelTag}` : cancelTag;
		});
	}, []);

	const handleConvertToCito = useCallback(() => {
		setIsCito(true);
		const citoReason = "CITO! Острая боль";
		setReason((prev) => (prev ? `${citoReason} (${prev})` : citoReason));
		applyDuration(30);
		if (!comment.includes("CITO")) {
			setComment((prev) =>
				prev
					? `${prev}\n[CITO: экстренное обращение с острой болью]`
					: "[CITO: экстренное обращение с острой болью]",
			);
		}
		if (status === "planned") {
			setStatus("confirmed");
		}
		showToast(
			"Приём переведён в CITO (Острая боль): 30 мин, овербукинг разрешён",
			"warning",
			3500,
		);
	}, [comment, status, applyDuration]);

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!appointment || isSaving) return;

		let effectivePatientId = patientId;
		if (
			isInlineNewPatient &&
			!effectivePatientId &&
			(newPatientFullName.trim() || newPatientPhone.trim())
		) {
			const created = await handleCreateInlinePatient();
			if (created?.id) {
				effectivePatientId = created.id;
			}
		} else if (!effectivePatientId && patientSearchQuery.trim()) {
			// Mandates 8e, 8k, 8n: если соло-врач ввел ФИО/телефон в быстрый поиск и нажал «Записать на прием» (Ctrl+Enter),
			// не блокируем запись ошибкой, а автоматически создаем пациента на лету!
			const q = patientSearchQuery.trim();
			const isPhone = /^[0-9+()-\s]+$/.test(q);
			const created = await handleCreateInlinePatient({
				fullName: isPhone ? `Пациент (${q})` : q,
				phone: isPhone ? q : null,
			});
			if (created?.id) {
				effectivePatientId = created.id;
			}
		}

		const effectiveDoctorUserId =
			doctorUserId ||
			dutyDoctorId ||
			doctors[0]?.id ||
			(isSoloDoctor ? "doctor-solo" : "doctor-default");
		let effectiveChairId =
			chairId || (chairs.length === 1 ? chairs[0]?.id : "") || "";
		if (!effectiveChairId && effectiveDoctorUserId) {
			const doc = doctors.find((d) => d.id === effectiveDoctorUserId);
			if ((doc as any)?.preferredChairId) {
				const pref = chairs.find((c) => c.id === (doc as any).preferredChairId);
				if (pref) effectiveChairId = pref.id;
			}
			if (!effectiveChairId && doc?.specialties?.length) {
				const matchingChair = chairs.find(
					(c) => c.specialization && doc.specialties.includes(c.specialization),
				);
				if (matchingChair) {
					effectiveChairId = matchingChair.id;
				}
			}
		}
		if (!effectiveChairId) {
			effectiveChairId = chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
		}

		let effectiveStartsAt = startsAtLocal;
		let effectiveEndsAt = endsAtLocal;

		// 1-Click Autonomy (Mandates 8e, 8n): если не указано время начала — авто-подстановка слота (ближайшие 15 мин)
		if (!effectiveStartsAt) {
			const now = new Date();
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
			effectiveStartsAt = safeToDateTimeLocalValue(now.toISOString(), timezone);
			setStartsAtLocal(effectiveStartsAt);
		}

		// 1-Click Autonomy (Mandates 8e, 8n): если указано время начала, но не указан конец — авто-расчет +30 мин
		if (effectiveStartsAt && !effectiveEndsAt) {
			const startIso = safeFromDateTimeLocalValue(effectiveStartsAt, timezone);
			const startMs = Date.parse(startIso);
			if (!Number.isNaN(startMs)) {
				const defaultEndIso = new Date(startMs + 30 * 60_000).toISOString();
				effectiveEndsAt = safeToDateTimeLocalValue(defaultEndIso, timezone);
				setEndsAtLocal(effectiveEndsAt);
			}
		}

		const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
		if (!effectivePatientId && !isTechnicalBreak) {
			if (isCito || isCitoAppointment({ reason, comment })) {
				const created = await handleCreateInlinePatient({
					fullName: "Пациент с острой болью (CITO)",
				});
				if (created?.id) {
					effectivePatientId = created.id;
				}
			} else {
				setError(
					"Укажите пациента: выберите из списка или создайте во вкладке «+ Новый пациент»",
				);
				return;
			}
		}

		const startsAtIso = safeFromDateTimeLocalValue(effectiveStartsAt, timezone);
		let endsAtIso = safeFromDateTimeLocalValue(effectiveEndsAt, timezone);

		if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
			const startMs = Date.parse(startsAtIso);
			const fixedEndIso = new Date(startMs + 30 * 60_000).toISOString();
			endsAtIso = fixedEndIso;
			setEndsAtLocal(safeToDateTimeLocalValue(fixedEndIso, timezone));
		}

		setIsSaving(true);
		setError(null);

		const success = await onSave(appointment.id, {
			patientId: effectivePatientId || null,
			doctorUserId: effectiveDoctorUserId,
			assistantUserId: isSoloDoctor ? null : assistantUserId?.trim() || null,
			chairId: effectiveChairId,
			startsAt: startsAtIso,
			endsAt: endsAtIso,
			status,
			reason,
			comment,
			isCito,
			cito: isCito,
		} as any);

		setIsSaving(false);
		if (success) {
			onClose();
		}
	};

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			} else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				void handleSave();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, handleSave]);

	if (!isOpen || !appointment) return null;

	const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
	const currentPatientName =
		isTechnicalBreak && !patientId
			? reason || "Служебный перерыв"
			: typeof patientName === "function"
				? patientName(dashboard.patients, patientId)
				: dashboard.patients?.find((p) => p.id === patientId)?.fullName ||
					"Пациент";
	const isNewAppointment = Boolean(appointment?.id?.startsWith("new"));

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			data-testid="appointment-modal"
			role="dialog"
			aria-modal="true"
			aria-label={`Детали приема: ${currentPatientName}`}
		>
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				aria-label="Закрыть модальное окно"
			/>

			<div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line-strong)] rounded-2xl shadow-2xl z-10 text-[var(--ink)] flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
				{/* Header: Strict 1-row clinical toolbar (32-36px, Mandate 8p, 8c, utility height <= 160-180px) */}
				<div className="px-4 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2.5 sm:gap-3 flex-nowrap shrink-0">
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						<div className="p-1.5 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
							<Calendar size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<h3
								className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate leading-tight"
								title={
									isNewAppointment
										? `Запись на следующий этап: ${currentPatientName}`
										: `Детали записи: ${currentPatientName}`
								}
							>
								{isNewAppointment
									? `Запись на следующий этап: ${currentPatientName}`
									: `Детали записи: ${currentPatientName}`}
							</h3>
							<p
								className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate leading-tight"
								title={
									startsAtLocal
										? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}`
										: ""
								}
							>
								{startsAtLocal
									? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}`
									: ""}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0 flex-nowrap relative">
						{!isCito ? (
							<button
								type="button"
								onClick={handleConvertToCito}
								className="h-8 min-h-[32px] px-2.5 sm:px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
								title="Пациент обратился с острой болью: перевести в CITO, разрешить овербукинг и включить CITO-подсветку в расписании"
								data-testid="convert-to-cito-btn"
							>
								<Zap
									size={14}
									className="text-rose-600 dark:text-rose-400 shrink-0"
								/>
								<span className="hidden sm:inline">
									Перевести в CITO (Острая боль)
								</span>
								<span className="sm:hidden">CITO</span>
							</button>
						) : (
							<div
								className="h-8 min-h-[32px] px-2.5 sm:px-3 rounded-lg border border-rose-500/50 bg-rose-500/20 text-rose-800 dark:text-rose-200 text-xs font-extrabold flex items-center gap-1.5 shrink-0"
								data-testid="appointment-cito-active-badge"
							>
								<Zap
									size={14}
									className="text-rose-600 dark:text-rose-400 shrink-0 fill-current"
								/>
								<span className="hidden sm:inline">CITO! Острая боль</span>
								<span className="sm:hidden">CITO</span>
							</div>
						)}
						{/* 1-Click Blank Contract Printing (Mandate 8e item 8: zero 403 blocks, zero requirements for passport/SNILS) */}
						<button
							type="button"
							onClick={() => {
								const currentPatient = (dashboard?.patients ?? []).find(
									(p) => p.id === patientId,
								);
								const currentDoctor = doctors.find(
									(d) => d.id === doctorUserId,
								);
								void printBlankMedicalContract(
									currentPatient ||
										(patientId ? { fullName: currentPatientName } : null),
									{
										doctorName: currentDoctor?.fullName,
										clinicName:
											dashboard?.clinicSettings?.profile?.legalName ||
											dashboard?.clinicSettings?.profile?.clinicName,
									},
								);
							}}
							className="h-8 min-h-[32px] px-2 sm:px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
							title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения (Мандат 8e п. 8)"
							data-testid="appointment-modal-print-blank-contract-btn"
						>
							<FileText
								size={14}
								className="text-amber-700 dark:text-amber-300 shrink-0"
							/>
							<span className="hidden sm:inline whitespace-nowrap">
								Бланк договора
							</span>
							<span className="sm:hidden">Договор</span>
						</button>
						{patientId && !isNewAppointment && (
							<button
								type="button"
								onClick={() => {
									onClose();
									usePatientStore.getState().setSelectedPatientId(patientId);
									useAppStore.getState().setCurrentView("finance");
									showToast(
										`Касса 54-ФЗ: расчёт ${currentPatientName}`,
										"info",
									);
								}}
								className="h-8 min-h-[32px] px-2 sm:px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
								title="Принять оплату через кассу 54-ФЗ (1 клик)"
								data-testid="appointment-modal-pay-btn"
							>
								<CreditCard
									size={14}
									className="text-emerald-600 dark:text-emerald-400 shrink-0"
								/>
								<span className="hidden sm:inline whitespace-nowrap">
									Оплата 54-ФЗ
								</span>
								<span className="sm:hidden">Оплата</span>
							</button>
						)}
						{/* Secondary actions popover (Hick / Miller: all non-primary actions in ... menu) */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsMenuOpen((prev) => !prev)}
								className="h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
								title="Дополнительные действия (печать согласий, повтор записи)"
								aria-label="Дополнительные действия"
								data-testid="appointment-modal-more-actions-btn"
							>
								<MoreHorizontal size={15} />
								<span className="hidden md:inline">Еще</span>
							</button>
							{isMenuOpen && (
								<div
									className="fixed inset-0 z-20 cursor-default"
									onClick={() => setIsMenuOpen(false)}
									aria-hidden="true"
								/>
							)}
							<div
								className={`absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl z-30 py-1 ${isMenuOpen ? "block" : "hidden"}`}
								data-testid="appointment-modal-more-menu"
							>
								{patientId && !isNewAppointment && (
									<button
										type="button"
										onClick={() => {
											setIsMenuOpen(false);
											onClose();
											usePatientStore.getState().setSelectedPatientId(patientId);
											useAppStore.getState().setCurrentView("finance");
											showToast(
												`Касса 54-ФЗ: расчёт ${currentPatientName}`,
												"info",
											);
										}}
										className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
										title="Принять оплату через кассу 54-ФЗ"
										data-testid="appointment-modal-menu-pay-btn"
									>
										<CreditCard
											size={14}
											className="text-emerald-600 dark:text-emerald-400 shrink-0"
										/>
										<span className="truncate">Касса 54-ФЗ / Оплата</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setIsMenuOpen(false);
										const currentPatient = (dashboard?.patients ?? []).find(
											(p) => p.id === patientId,
										);
										const currentDoctor = doctors.find(
											(d) => d.id === doctorUserId,
										);
										void printBlankMedicalConsent(
											currentPatient ||
												(patientId ? { fullName: currentPatientName } : null),
											{
												doctorName: currentDoctor?.fullName,
												clinicName:
													dashboard?.clinicSettings?.profile?.legalName ||
													dashboard?.clinicSettings?.profile?.clinicName,
											},
										);
									}}
									className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
									title="Распечатать пустой бланк информированного добровольного согласия (ИДС) со строками _______"
									data-testid="appointment-modal-print-blank-consent-btn"
								>
									<FileText
										size={14}
										className="text-teal-600 dark:text-teal-400 shrink-0"
									/>
									<span className="truncate">Бланк согласия (ИДС)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsMenuOpen(false);
										const currentPatient = (dashboard?.patients ?? []).find(
											(p) => p.id === patientId,
										);
										const currentDoctor = doctors.find(
											(d) => d.id === doctorUserId,
										);
										void printBlankMedicalContract(
											currentPatient ||
												(patientId ? { fullName: currentPatientName } : null),
											{
												doctorName: currentDoctor?.fullName,
												clinicName:
													dashboard?.clinicSettings?.profile?.legalName ||
													dashboard?.clinicSettings?.profile?.clinicName,
											},
										);
									}}
									className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
									title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
									data-testid="appointment-modal-menu-print-blank-contract-btn"
								>
									<Printer
										size={14}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<span className="truncate">Бланк договора (_______)</span>
								</button>
								{repeatAppointment && !isNewAppointment && (
									<button
										type="button"
										onClick={() => {
											setIsMenuOpen(false);
											repeatAppointment(appointment);
										}}
										className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--line)]/50"
										title="Повторить прием"
										data-testid="appointment-modal-repeat-btn"
									>
										<Repeat
											size={14}
											className="text-[var(--muted)] shrink-0"
										/>
										<span>Повторить</span>
									</button>
								)}
								{copyAppointmentToBuffer && !isNewAppointment && (
									<button
										type="button"
										onClick={() => {
											setIsMenuOpen(false);
											copyAppointmentToBuffer(appointment);
										}}
										className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
										title="Скопировать в буфер"
										data-testid="appointment-modal-copy-btn"
									>
										<Copy size={14} className="text-[var(--muted)] shrink-0" />
										<span>В буфер</span>
									</button>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
							aria-label="Закрыть"
							data-testid="appointment-modal-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Body Form */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4">
					{/* Online Booking Notice Banner & 1-Click Confirmation */}
					{Boolean(
						(appointment?.comment &&
							/онлайн|виджет|online|сайт/i.test(appointment.comment)) ||
							(appointment?.reason &&
								/онлайн|виджет|online|сайт/i.test(appointment.reason)),
					) && (
						<div
							className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-cyan-100 flex items-center justify-between gap-3 text-xs"
							data-testid="modal-online-booking-banner"
						>
							<div className="flex items-center gap-2">
								<Globe
									size={15}
									className="text-cyan-600 dark:text-cyan-400 shrink-0"
								/>
								<span className="font-bold text-xs sm:text-sm">
									Онлайн-запись через сайт
								</span>
								<span className="text-[var(--muted)] text-xs hidden sm:inline">
									Слот забронирован пациентом
								</span>
							</div>
							{status === "planned" && (
								<button
									type="button"
									onClick={() => {
										setStatus("confirmed");
									}}
									className="h-8 min-h-[32px] px-3 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-xs"
									title="Перевести статус в «Подтвержден» в 1 клик"
									data-testid="modal-confirm-online-booking-btn"
								>
									<Check size={13} />
									<span>Подтвердить запись</span>
								</button>
							)}
						</div>
					)}

					{/* CITO Notice Banner */}
					{isCito && (
						<div
							className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-950 dark:text-rose-100 flex items-center justify-between gap-3 text-xs shadow-xs"
							data-testid="appointment-cito-banner"
						>
							<div className="flex items-center gap-2">
								<Zap
									size={15}
									className="text-rose-600 dark:text-rose-400 shrink-0 fill-current"
								/>
								<span className="font-bold text-xs sm:text-sm">
									Экстренный приём CITO (Острая боль)
								</span>
								<span className="text-[var(--muted)] text-xs">
									Мягкий овербукинг разрешён
								</span>
							</div>
							<span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold uppercase shrink-0">
								CITO
							</span>
						</div>
					)}

					{/* CITO Overbooking warning */}
					{collision.isCitoOverbooking && (
						<div
							className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
							role="alert"
							data-testid="modal-cito-overbooking-alert"
						>
							<Zap
								size={15}
								className="shrink-0 text-rose-600 dark:text-rose-400"
							/>
							<span>
								{collision.message ||
									"CITO-овербукинг разрешён (острая боль): наложение на занятый слот разрешено."}
							</span>
						</div>
					)}

					{/* Collision warning */}
					{collision.hasCollision && (
						<div
							className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
							role="alert"
						>
							<AlertTriangle
								size={15}
								className="shrink-0 text-amber-600 dark:text-amber-400"
							/>
							<span>
								{collision.message}. Разрешена экстренная запись (острая боль /
								овербукинг).
							</span>
						</div>
					)}

					{/* Readiness score bar */}
					{readiness && (
						<div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span
									className={`w-2 h-2 rounded-full ${readiness.state === "ready" ? "bg-emerald-500" : readiness.state === "needs_attention" ? "bg-amber-500" : "bg-rose-500"}`}
								/>
								<span className="text-xs font-semibold text-[var(--ink)]">
									Готовность: {readiness.nextAction}
								</span>
							</div>
							<span className="text-xs font-bold text-[var(--teal)]">
								{readiness.score}%
							</span>
						</div>
					)}

					{/* Free slot waitlist matches for cancelled appointments */}
					{(appointment.status === "cancelled" ||
						appointment.status === "no_show") && (
						<div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<WaitlistMatchesBlock appointmentId={appointment.id} compact />
						</div>
					)}

					{/* Active Dental Lab Orders & Due Date Sync */}
					{activeLabOrders.length > 0 && (
						<div className="space-y-2">
							{activeLabOrders.map((lo: any) => {
								const hasDue = Boolean(lo.dueDate);
								const dueDateObj = hasDue ? new Date(lo.dueDate) : null;
								const isBeforeLab =
									dueDateObj &&
									startsAtLocal &&
									new Date(startsAtLocal).getTime() < dueDateObj.getTime();

								return (
									<div
										key={lo.id}
										className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs transition-all ${
											isBeforeLab
												? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
												: "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/20 text-[var(--ink)]"
										}`}
									>
										<div className="space-y-0.5">
											<div className="font-bold flex items-center gap-1.5 flex-wrap">
												<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
												<span>
													Наряд ЗТЛ: {lo.material || "Ортопедия"} (Зуб{" "}
													{lo.toothFdi || "—"})
												</span>
												<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] text-[10px] font-bold uppercase border border-[var(--line)]">
													{lo.status}
												</span>
											</div>
											{hasDue && (
												<div className="text-[11px] text-[var(--muted)]">
													Срок готовности:{" "}
													<strong className="text-[var(--ink)]">
														{dueDateObj?.toLocaleDateString("ru-RU")}
													</strong>
													{isBeforeLab && (
														<span className="text-amber-600 dark:text-amber-400 font-bold ml-1 inline-flex items-center gap-1">
															<AlertTriangle size={11} className="shrink-0" />
															<span>
																(прием назначен раньше готовности ЗТЛ)
															</span>
														</span>
													)}
												</div>
											)}
										</div>

										{hasDue && (
											<button
												type="button"
												onClick={() => {
													if (dueDateObj) {
														const year = dueDateObj.getFullYear();
														const month = String(
															dueDateObj.getMonth() + 1,
														).padStart(2, "0");
														const day = String(dueDateObj.getDate()).padStart(
															2,
															"0",
														);
														const timePart = startsAtLocal
															? startsAtLocal.slice(11, 16)
															: "10:00";
														const newStart = `${year}-${month}-${day}T${timePart}`;
														setStartsAtLocal(newStart);

														const [hh, mm] = timePart.split(":").map(Number);
														const endHh = String(
															Math.min(23, (hh || 10) + 1),
														).padStart(2, "0");
														setEndsAtLocal(
															`${year}-${month}-${day}T${endHh}:${String(mm || 0).padStart(2, "0")}`,
														);
													}
												}}
												className="h-8 min-h-[32px] px-2.5 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all"
												title="Синхронизировать время приема со сроком готовности наряда ЗТЛ"
											>
												<Calendar className="w-3.5 h-3.5" />
												На дату ЗТЛ
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* Form Fields */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
						{/* Patient */}
						<div className="sm:col-span-2">
							<div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
									<User size={13} className="text-[var(--teal)]" />
									<span>
										Пациент {isTechnicalBreak ? "(не требуется)" : "*"}
									</span>
								</label>
								<div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium">
									<button
										type="button"
										onClick={() => setIsInlineNewPatient(false)}
										className={`h-7 px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
											!isInlineNewPatient
												? "bg-[var(--paper)] text-[var(--teal)] font-bold shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
										data-testid="appointment-patient-mode-select"
									>
										Из базы
									</button>
									<button
										type="button"
										onClick={() => setIsInlineNewPatient(true)}
										className={`h-7 px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs ${
											isInlineNewPatient
												? "bg-[var(--teal)] text-white font-bold shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
										data-testid="appointment-patient-mode-create"
									>
										<UserPlus size={13} />
										<span>+ Новый пациент</span>
									</button>
									<button
										type="button"
										onClick={() => {
											handleConvertToCito();
											void handleCreateInlinePatient({
												fullName: "Пациент с острой болью (CITO)",
											});
										}}
										className="h-7 px-2.5 py-1 rounded-md text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 font-bold transition-all cursor-pointer flex items-center gap-1 text-xs"
										title="Создать временную карту CITO за 1 клик (Мандат 8e)"
										data-testid="appointment-modal-cito-express-btn"
									>
										<Zap
											size={12}
											className="text-rose-600 dark:text-rose-400"
										/>
										<span>+ CITO</span>
									</button>
								</div>
							</div>

							{isTechnicalBreak && !patientId && (
								<div
									className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2"
									data-testid="technical-break-patient-free-banner"
								>
									<div className="flex items-center gap-2">
										<Clock
											size={15}
											className="text-amber-600 dark:text-amber-400 shrink-0"
										/>
										<span>
											<strong>Режим технической блокировки:</strong> Слот
											забронирован для служебного перерыва врача (
											{reason || "Перерыв"}). Выбор пациента не требуется.
										</span>
									</div>
								</div>
							)}

							{isInlineNewPatient ? (
								<div
									className="p-3 rounded-xl border border-[var(--teal)]/30 bg-[var(--teal-soft,var(--paper-soft))] space-y-2.5 animate-fade-in"
									data-testid="appointment-inline-new-patient-panel"
								>
									<div className="flex items-center justify-between text-xs font-bold text-[var(--teal-dark,var(--teal))]">
										<span className="flex items-center gap-1.5">
											<UserPlus size={13} />
											Быстрый пациент: ФИО + Телефон
										</span>
										<button
											type="button"
											onClick={() => setIsInlineNewPatient(false)}
											className="text-[var(--muted)] hover:text-[var(--ink)] font-normal transition-colors cursor-pointer text-xs"
											data-testid="appointment-quick-patient-cancel-btn"
										>
											Отмена
										</button>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<div>
											<input
												type="text"
												value={newPatientFullName}
												onChange={(e) => setNewPatientFullName(e.target.value)}
												placeholder="ФИО пациента *"
												className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
												data-testid="appointment-quick-patient-name"
												autoFocus
											/>
										</div>
										<div>
											<input
												type="tel"
												value={newPatientPhone}
												onChange={(e) => setNewPatientPhone(e.target.value)}
												placeholder="+7 (___) ___-__-__"
												className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
												data-testid="appointment-quick-patient-phone"
											/>
										</div>
									</div>
									<div className="flex items-center justify-between gap-2 pt-0.5">
										<span className="text-[11px] text-[var(--muted)]">
											Пациент сохранится в базу клиники и сразу прикрепится к
											записи.
										</span>
										<button
											type="button"
											onClick={() => handleCreateInlinePatient()}
											disabled={isCreatingInlinePatient}
											className="h-8 min-h-[32px] px-3 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all disabled:opacity-50"
											data-testid="appointment-quick-patient-save-btn"
										>
											<Check size={13} />
											{isCreatingInlinePatient
												? "Создание..."
												: "Создать и прикрепить"}
										</button>
									</div>
								</div>
							) : (
								<>
									<div className="relative mb-1.5">
										<Search
											size={13}
											className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
										/>
										<input
											type="text"
											value={patientSearchQuery}
											onChange={(e) => setPatientSearchQuery(e.target.value)}
											placeholder="Быстрый поиск пациента: ФИО, телефон, карта…"
											className="w-full pl-8 pr-7 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:ring-2 focus:ring-[var(--teal)] transition-all"
											data-testid="appointment-patient-search-input"
										/>
										{patientSearchQuery && (
											<button
												type="button"
												onClick={() => setPatientSearchQuery("")}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0.5"
												title="Очистить поиск"
											>
												<X size={12} />
											</button>
										)}
									</div>
									<select
										value={patientId}
										onChange={(e) => setPatientId(e.target.value)}
										className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="select-appointment-patient"
									>
										<option value="">-- Выберите пациента --</option>
										{allDisplayPatients.map((p) => (
											<option key={p.id} value={p.id}>
												{p.fullName} {p.phone ? `(${p.phone})` : ""}
											</option>
										))}
									</select>
									{patientSearchQuery.trim() && (
										<div className="mt-1.5 flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal)]/20 text-xs">
											<span className="text-[11px] text-[var(--muted)] truncate">
												{allDisplayPatients.length === 0
													? "Пациент не найден в базе"
													: `Найдено: ${allDisplayPatients.length}`}
											</span>
											<button
												type="button"
												onClick={() => {
													const q = patientSearchQuery.trim();
													const isPhone = /^[0-9+()-\s]+$/.test(q);
													if (isPhone) {
														setNewPatientPhone(q);
														setNewPatientFullName("");
													} else {
														setNewPatientFullName(q);
														setNewPatientPhone("");
													}
													setIsInlineNewPatient(true);
												}}
												className="text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
												data-testid="appointment-quick-create-from-search-btn"
											>
												<UserPlus size={12} />
												<span>+ Создать «{patientSearchQuery.trim()}»</span>
											</button>
										</div>
									)}
									{!patientId &&
										!isTechnicalBreak &&
										!patientSearchQuery.trim() && (
											<span
												className="text-[11px] text-[var(--muted)] block mt-1"
												data-testid="appointment-patient-helper"
											>
												Для записи выберите пациента из списка или создайте
												быстрого пациента (ФИО + телефон)
											</span>
										)}
									{hasOpenVisit && (
										<div
											className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 mt-1.5 w-full"
											data-testid="appointment-open-visit-warning"
										>
											<AlertCircle
												size={13}
												className="shrink-0 text-amber-600 dark:text-amber-400"
											/>
											<span>
												По приему есть активный визит. При смене пациента визит
												будет сохранен в новую карту
											</span>
										</div>
									)}
								</>
							)}
						</div>

						{/* Time */}
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
								<Clock size={13} className="text-[var(--teal)]" />
								<span>Начало *</span>
							</label>
							<input
								type="datetime-local"
								value={startsAtLocal}
								onChange={(e) => {
									const nextVal = e.target.value;
									setStartsAtLocal(nextVal);
									if (chairId && nextVal) {
										const newDuty = resolveChairDutyDoctor(
											chairId,
											nextVal,
											chairDoctorAssignments,
											nextVal.slice(0, 10),
										);
										if (
											newDuty.doctorId &&
											(!doctorUserId || doctorUserId === dutyDoctorId)
										) {
											setDoctorUserId(newDuty.doctorId);
										}
									}
								}}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
								<Clock size={13} className="text-[var(--teal)]" />
								<span>Окончание *</span>
							</label>
							<input
								type="datetime-local"
								value={endsAtLocal}
								onChange={(e) => setEndsAtLocal(e.target.value)}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>

						{/* Quick Duration Buttons (Anti-Clickfest) */}
						<div className="sm:col-span-2">
							<div className="flex items-center justify-between gap-2 mb-1">
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
									<Zap size={13} className="text-[var(--teal)]" />
									<span>Быстрый выбор длительности:</span>
								</label>
								{currentDurationMinutes > 0 && (
									<span className="text-xs font-mono font-bold text-[var(--teal)]">
										{currentDurationMinutes} мин
										{currentDurationMinutes >= 60
											? ` (${Math.floor(currentDurationMinutes / 60)} ч ${currentDurationMinutes % 60 ? `${currentDurationMinutes % 60} мин` : ""})`
											: ""}
									</span>
								)}
							</div>
							<div
								className="flex items-center gap-1.5 flex-wrap"
								data-testid="appointment-quick-durations"
							>
								{[15, 30, 45, 60, 90, 120].map((mins) => (
									<button
										key={mins}
										type="button"
										onClick={() => applyDuration(mins)}
										className={`h-7 sm:h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
											currentDurationMinutes === mins
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
												: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
										}`}
									>
										{mins < 60
											? `${mins} мин`
											: mins === 60
												? "1 час"
												: mins === 90
													? "1.5 ч"
													: "2 часа"}
									</button>
								))}
							</div>
						</div>

						{/* Doctor & Chair */}
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
								Врач {isSoloDoctor ? "(соло-врач)" : "*"}
							</label>
							<select
								value={doctorUserId}
								onChange={(e) => {
									const newDocId = e.target.value;
									setDoctorUserId(newDocId);
									if (
										newDocId &&
										(!appointment?.chairId || appointment.id.startsWith("new"))
									) {
										let targetChairId: string | null = null;
										const doc =
											doctors.find((d) => d.id === newDocId) ||
											dashboard?.clinicSettings?.staff?.find(
												(s) => s.id === newDocId,
											);

										// 1. Doctor's preferred chair
										if ((doc as any)?.preferredChairId) {
											const pref = chairs.find(
												(c) => c.id === (doc as any).preferredChairId,
											);
											if (pref) targetChairId = pref.id;
										}
										if (!targetChairId && typeof window !== "undefined") {
											const storedPref = safeLocalStorageGetJson<
												Record<string, string>
											>("dente_doctor_preferred_chairs", {});
											if (storedPref[newDocId]) {
												const pref = chairs.find(
													(c) => c.id === storedPref[newDocId],
												);
												if (pref) targetChairId = pref.id;
											}
										}

										// 2. Chair default doctor
										if (!targetChairId) {
											const def = chairs.find(
												(c) => (c as any).defaultDoctorId === newDocId,
											);
											if (def) targetChairId = def.id;
										}
										if (!targetChairId && typeof window !== "undefined") {
											const storedChairDef = safeLocalStorageGetJson<
												Record<string, string>
											>("dente_chair_default_doctors", {});
											for (const [cId, dId] of Object.entries(storedChairDef)) {
												if (dId === newDocId) {
													const def = chairs.find((c) => c.id === cId);
													if (def) {
														targetChairId = def.id;
														break;
													}
												}
											}
										}

										// 3. Duty chair on scheduled time
										if (!targetChairId) {
											const assignedChair = chairs.find((c) => {
												const duty = resolveChairDutyDoctor(
													c.id,
													startsAtLocal,
													chairDoctorAssignments,
													startsAtLocal
														? startsAtLocal.slice(0, 10)
														: undefined,
												);
												return duty.doctorId === newDocId;
											});
											if (assignedChair) targetChairId = assignedChair.id;
										}

										// 4. Specialization match
										if (!targetChairId && doc?.specialties?.length) {
											const matchingChair = chairs.find(
												(c) =>
													c.specialization &&
													doc.specialties.includes(c.specialization),
											);
											if (matchingChair) targetChairId = matchingChair.id;
										}

										if (targetChairId) {
											setChairId(targetChairId);
										}
									}
								}}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="select-appointment-doctor"
							>
								<option value="">-- Выберите врача --</option>
								{doctors.map((d) => (
									<option key={d.id} value={d.id}>
										{d.fullName}
									</option>
								))}
							</select>
							{dutyDoc && (
								<div
									className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20"
									data-testid="duty-doctor-badge"
								>
									<UserCheck
										size={12}
										className="shrink-0 text-[var(--teal)]"
									/>
									<span>
										Дежурный: {formatDoctorShortName(dutyDoc.fullName)} (
										{dutyDocHours})
									</span>
								</div>
							)}
							{dutyDoc &&
								doctorUserId &&
								dutyDoctorId &&
								doctorUserId !== dutyDoctorId && (
									<div
										className="mt-1 p-2 rounded-lg text-xs bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/30 flex items-start gap-1.5"
										data-testid="duty-doctor-override-note"
									>
										<AlertTriangle
											size={14}
											className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
										/>
										<div className="space-y-0.5 text-[11px]">
											<span className="font-semibold block">
												На кресле «{currentChair?.name || "Кресло"}» дежурит{" "}
												{formatDoctorShortName(dutyDoc.fullName)}. Запись не
												блокируется.
											</span>
											<span className="text-[var(--muted)]">
												(Мандат 8e: запись не блокируется, врач может принять в
												свободном кабинете)
											</span>
										</div>
									</div>
								)}
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
								Кресло {chairs.length <= 1 ? "(соло-кресло)" : "*"}
							</label>
							<select
								value={chairId}
								onChange={(e) => {
									const newChairId = e.target.value;
									setChairId(newChairId);
									if (newChairId) {
										const newChair =
											chairs.find((c) => c.id === newChairId) ||
											(newChairId === DEFAULT_SOLO_CHAIR.id
												? DEFAULT_SOLO_CHAIR
												: null);
										const newDuty = resolveChairDutyDoctor(
											newChairId,
											startsAtLocal,
											chairDoctorAssignments,
											startsAtLocal ? startsAtLocal.slice(0, 10) : undefined,
											null,
											(newChair as any)?.defaultDoctorId ||
												(chairs.length <= 1 && doctors.length === 1
													? doctors[0]?.id
													: null),
										);
										if (newDuty.doctorId) {
											setDoctorUserId(newDuty.doctorId);
											const newDoc = doctors.find(
												(d) => d.id === newDuty.doctorId,
											);
											if (newDoc) {
												showToast(
													`Дежурный врач: ${formatDoctorShortName(newDoc.fullName)} (${newChair?.name || "Кресло"}, ${newDuty.shiftHours})`,
													"info",
													3000,
												);
											}
										}
									}
								}}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="select-appointment-chair"
							>
								<option value="">-- Выберите кресло --</option>
								{chairs.length === 0 && (
									<option value={DEFAULT_SOLO_CHAIR.id}>
										{DEFAULT_SOLO_CHAIR.name} (Соло-практика)
									</option>
								)}
								{chairs.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
							{!chairId && (
								<span className="text-[11px] text-[var(--muted)] block mt-0.5">
									По умолчанию: основное кресло клиники
								</span>
							)}
						</div>

						{!isSoloDoctor && assistants.length > 0 && (
							<div>
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Ассистент{" "}
									<span className="font-normal text-[var(--muted)] lowercase">
										(опционально, соло-приём без ассистента)
									</span>
								</label>
								<select
									value={assistantUserId ?? ""}
									onChange={(e) => setAssistantUserId(e.target.value || null)}
									className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="select-appointment-assistant"
								>
									<option value="">-- Без ассистента (соло-приём) --</option>
									{assistants.map((a) => (
										<option key={a.id} value={a.id}>
											{a.fullName}
										</option>
									))}
								</select>
								<span className="text-[11px] text-[var(--muted)] block mt-0.5">
									Выбор ассистента не обязателен и не блокирует запись
								</span>
							</div>
						)}

						{/* Status */}
						<div
							className={
								isSoloDoctor || assistants.length === 0
									? "sm:col-span-2 space-y-1.5"
									: "space-y-1.5"
							}
						>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-0.5">
								Статус приема (1 клик):
							</label>

							{/* 1-Click Status Quick Chips (Mandates 8e, 8n) */}
							<div
								className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
								data-testid="appointment-modal-status-chips"
							>
								<button
									type="button"
									onClick={() => setStatus("planned")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "planned"
											? "bg-[var(--teal-dark,var(--teal))] text-white font-bold border-[var(--teal-dark,var(--teal))]"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-planned"
								>
									<Calendar size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">
										Запланирован
									</span>
								</button>
								<button
									type="button"
									onClick={() => setStatus("confirmed")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "confirmed"
											? "bg-violet-600 text-white font-bold border-violet-600"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-confirmed"
								>
									<PhoneCall size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">
										Подтвержден
									</span>
								</button>
								<button
									type="button"
									onClick={() => setStatus("arrived")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "arrived"
											? "bg-emerald-600 text-white font-bold border-emerald-600"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-arrived"
								>
									<UserCheck size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">Пришел</span>
								</button>
								<button
									type="button"
									onClick={() => setStatus("in_treatment")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "in_treatment"
											? "bg-cyan-600 text-white font-bold border-cyan-600"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-in_treatment"
								>
									<CalendarCheck size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">
										В кресле
									</span>
								</button>
								<button
									type="button"
									onClick={() => setStatus("completed")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "completed"
											? "bg-slate-700 text-white font-bold border-slate-700"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-completed"
								>
									<CheckCircle2 size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">
										Завершен
									</span>
								</button>
								<button
									type="button"
									onClick={() => setStatus("no_show")}
									className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
										status === "no_show"
											? "bg-rose-600 text-white font-bold border-rose-600"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
									}`}
									data-testid="modal-status-btn-no_show"
								>
									<UserX size={12} className="shrink-0" />
									<span className="whitespace-nowrap leading-none">Неявка</span>
								</button>
							</div>

							<select
								value={status}
								onChange={(e) => {
									const nextStatus = e.target.value as Appointment["status"];
									setStatus(nextStatus);
									if (
										hasOpenVisit &&
										activeVisitLockedAppointmentStatuses.has(nextStatus)
									) {
										showToast(
											"Внимание: по этой записи открыт активный визит в кресле. Изменение статуса разрешено лечащему врачу.",
											"warning",
											4000,
										);
									}
								}}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] mt-1"
								data-testid="select-appointment-status"
							>
								{(
									Object.keys(appointmentLabels) as Appointment["status"][]
								).map((st) => (
									<option key={st} value={st}>
										{appointmentLabels[st]}
									</option>
								))}
							</select>
							{hasOpenVisit && (
								<div
									className="mt-1 p-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 flex items-center gap-1.5"
									data-testid="status-open-visit-warning"
								>
									<AlertTriangle
										size={12}
										className="shrink-0 text-amber-600 dark:text-amber-400"
									/>
									<span>
										По этой записи открыт активный визит. Смена статуса
										разрешена лечащему врачу.
									</span>
								</div>
							)}

							{(status === "cancelled" || status === "no_show") && (
								<div
									className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5 mt-1.5"
									data-testid="appointment-refusal-reasons-block"
								>
									<div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200">
										<span className="flex items-center gap-1.5">
											<UserX
												size={13}
												className="text-rose-600 dark:text-rose-400"
											/>
											Причина отмены / неявки (StomX 1 клик):
										</span>
										<span className="text-[10px] text-[var(--muted)] font-normal">
											Фиксируется в комментарии и таймлайне
										</span>
									</div>
									<div className="flex items-center gap-1 flex-wrap">
										{STOMX_REFUSE_REASONS_CATALOG.map((refuse) => {
											const isSelected = comment.includes(
												`[Отмена: ${refuse.nameRu}]`,
											);
											return (
												<button
													key={refuse.id}
													type="button"
													onClick={() =>
														handleApplyRefusalReason(refuse.nameRu)
													}
													className={`h-7 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none ${
														isSelected
															? "bg-rose-600 text-white border-rose-600 shadow-xs"
															: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-rose-400 dark:hover:border-rose-500"
													}`}
													title={`${refuse.nameRu} (${refuse.responsibility === "clinic" ? "Клиника" : refuse.responsibility === "patient" ? "Пациент" : "Система"})`}
												>
													{refuse.nameRu}
												</button>
											);
										})}
									</div>
								</div>
							)}
						</div>

						{/* Reason */}
						<div className="sm:col-span-2">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
								Повод обращения / Услуга
							</label>
							<input
								type="text"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								placeholder="Например: Лечение кариеса, консультация, острая боль..."
							/>
							{/* Quick Clinical Purpose & Doctor Blocking Intervals from StomX */}
							<div
								className="space-y-2 mt-2"
								data-testid="appointment-quick-reasons"
							>
								<div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)]">
									<span>Причины визита (StomX):</span>
									<span className="text-[10px] uppercase text-[var(--teal)] font-extrabold">
										1-клик выбор
									</span>
								</div>
								<div className="flex items-center gap-1.5 flex-wrap">
									{QUICK_APPOINTMENT_REASONS.map((preset) => (
										<button
											key={preset.label}
											type="button"
											data-testid={`chip-reason-${(preset as any).shortLabel || preset.label}`}
											onClick={() => handleApplyReasonPreset(preset)}
											className={`h-7 sm:h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
												preset.tone === "emergency"
													? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
											}`}
											title={preset.reason}
										>
											<span>{preset.label}</span>
											{preset.tone === "emergency" && (
												<span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
													CITO
												</span>
											)}
										</button>
									))}
								</div>

								<div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 pt-1.5 border-t border-[var(--line)]/50">
									<span>
										Технические блокировки расписания врача (без пациента):
									</span>
									<span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-extrabold">
										1-клик интервал
									</span>
								</div>
								<div
									className="flex items-center gap-1.5 flex-wrap"
									data-testid="appointment-doctor-blocks"
								>
									{TECHNICAL_BREAK_PRESETS.map((preset) => (
										<button
											key={preset.label}
											type="button"
											data-testid={`chip-block-${(preset as any).shortLabel || preset.label}`}
											onClick={() => handleApplyTechnicalBreakPreset(preset)}
											className="h-7 sm:h-8 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
											title={preset.comment}
										>
											<Clock
												size={12}
												className="text-amber-600 dark:text-amber-400 shrink-0"
											/>
											<span>{preset.label}</span>
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Comment */}
						<div className="sm:col-span-2">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
								Комментарий
							</label>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								rows={2}
								className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>
					</div>

					{error && (
						<div
							className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
							role="alert"
						>
							<AlertTriangle size={14} className="shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2.5">
					<div className="flex items-center justify-between gap-2 text-xs">
						{error ? (
							<span
								className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<AlertTriangle size={13} className="shrink-0" />
								<span>{error}</span>
							</span>
						) : !patientId &&
							!isTechnicalBreak &&
							!isInlineNewPatient &&
							patientSearchQuery.trim() ? (
							<span
								className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<Check size={13} className="shrink-0" />
								<span>
									Пациент «{patientSearchQuery.trim()}» будет создан
									автоматически при сохранении (Ctrl+Enter)
								</span>
							</span>
						) : !patientId && !isTechnicalBreak && !isInlineNewPatient ? (
							<span
								className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<AlertCircle size={13} className="shrink-0" />
								<span>
									Укажите пациента из списка или создайте во вкладке «+ Новый
									пациент»
								</span>
							</span>
						) : isInlineNewPatient &&
							!newPatientFullName.trim() &&
							!newPatientPhone.trim() ? (
							<span
								className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<AlertCircle size={13} className="shrink-0" />
								<span>
									Введите ФИО или номер телефона для быстрой регистрации
								</span>
							</span>
						) : isTechnicalBreak ? (
							<span
								className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<Clock size={13} className="shrink-0" />
								<span>
									Служебная блокировка расписания врача (пациент не требуется)
								</span>
							</span>
						) : (
							<span
								className="text-[var(--muted)] flex items-center gap-1.5"
								data-testid="appointment-modal-inline-helper"
							>
								<Check size={13} className="text-emerald-500 shrink-0" />
								<span>Готово к сохранению (горячая клавиша: Ctrl+Enter)</span>
							</span>
						)}
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
							{isSoloDoctor ? "Режим: соло-врач" : "Ассистент: опционально"}
						</span>
					</div>

					<div className="flex items-center justify-between gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="h-9 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={(e) => handleSave(e)}
							disabled={isSaving}
							className={`flex-1 h-9 px-5 text-[var(--on-teal)] font-extrabold rounded-lg text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
								collision.isCitoOverbooking || isCito
									? "bg-rose-600 hover:bg-rose-700 text-white"
									: collision.hasCollision
										? "bg-amber-600 hover:bg-amber-700 text-white"
										: "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95"
							}`}
							data-testid="appointment-modal-save-btn"
						>
							<Check size={16} />
							<span>
								{isSaving
									? "Сохраняю…"
									: collision.isCitoOverbooking || isCito
										? "Сохранить CITO (Острая боль)"
										: collision.hasCollision
											? "Записать с овербукингом (острая боль)"
											: isNewAppointment
												? "Записать на приём"
												: "Сохранить изменения"}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
