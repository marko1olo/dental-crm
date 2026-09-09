import type {
	Appointment,
	Dashboard,
	DentalSpecialty,
	Patient,
} from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	FileText,
	Flame,
	Phone,
	PhoneCall,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	UserX,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { printBlankMedicalContract } from "../patient/blankContractPrint";
import { showToast } from "../GlobalToast";
import { specialtyLabels } from "../../workspaceUiLabels";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import {
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
	type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import {
	DURATION_PRESETS,
	type QuickBookingAppointmentType,
} from "./patientReliabilityScore";
import {
	QuickBookingDrawer,
	type QuickBookingDrawerProps,
	type QuickBookingSlotInfo,
	resolveChairDutyDoctor,
} from "./QuickBookingDrawer";

export { QuickBookingDrawer, resolveChairDutyDoctor };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };
export async function createInlinePatientRecord(
	params: {
		fullName: string;
		phone?: string | null;
	},
	customFetch: typeof fetch = fetch,
): Promise<{ id: string; fullName: string } | null> {
	const name = params.fullName.trim();
	const phone = (params.phone || "").trim();
	if (!name && !phone) {
		return null;
	}
	const effectiveName = name || (phone ? `Пациент (${phone})` : "Новый пациент");
	try {
		const res = await customFetch("/api/patients", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				fullName: effectiveName,
				phone: phone || null,
			}),
		});
		if (res.ok) {
			const created = await res.json();
			if (created?.id) {
				return {
					id: String(created.id),
					fullName: String(created.fullName || effectiveName),
				};
			}
		}
		return null;
	} catch {
		return null;
	}
}

export type AppointmentDrawerStatus =
	| "planned"
	| "confirmed"
	| "arrived"
	| "in_treatment"
	| "completed"
	| "no_show";

export interface StatusActionItem {
	key: AppointmentDrawerStatus;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
	title: string;
	activeClass: string;
}

export const APPOINTMENT_STATUS_ITEMS: StatusActionItem[] = [
	{
		key: "planned",
		label: "Запланирован",
		shortLabel: "План",
		icon: <Calendar size={14} className="shrink-0" />,
		title: "Запланирован: стандартная предварительная запись",
		activeClass:
			"bg-[var(--teal-dark,var(--teal))] text-white font-bold border-[var(--teal-dark,var(--teal))]",
	},
	{
		key: "confirmed",
		label: "Подтвержден",
		shortLabel: "Подтвержден",
		icon: <PhoneCall size={14} className="shrink-0" />,
		title: "Подтвержден: звонок или мессенджер согласован с пациентом",
		activeClass: "bg-violet-600 text-white font-bold border-violet-600",
	},
	{
		key: "arrived",
		label: "Пациент пришел",
		shortLabel: "Пришел",
		icon: <UserCheck size={14} className="shrink-0" />,
		title: "Пациент пришел: пациент находится в холле / на ресепшене",
		activeClass: "bg-emerald-600 text-white font-bold border-emerald-600",
	},
	{
		key: "in_treatment",
		label: "В кресле",
		shortLabel: "В кресле",
		icon: <CalendarCheck size={14} className="shrink-0" />,
		title: "В кресле: врач начал прием пациента в кабинете",
		activeClass: "bg-cyan-600 text-white font-bold border-cyan-600",
	},
	{
		key: "completed",
		label: "Прием завершен",
		shortLabel: "Готово",
		icon: <CheckCircle2 size={14} className="shrink-0" />,
		title: "Прием завершен: клинический визит закончен",
		activeClass: "bg-slate-700 text-white font-bold border-slate-700",
	},
	{
		key: "no_show",
		label: "Неявка",
		shortLabel: "Неявка",
		icon: <UserX size={14} className="shrink-0" />,
		title: "Неявка: пациент не явился на прием к назначенному времени",
		activeClass: "bg-rose-600 text-white font-bold border-rose-600",
	},
];

export interface AppointmentDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialSlot?: QuickBookingSlotInfo | null | undefined;
	readonly appointment?: Appointment | null | undefined;
	readonly dashboard?: Dashboard | undefined;
	readonly auth?: {
		token?: string | null;
		user?: { id?: string; fullName?: string; role?: string } | null;
		scheduleMutationHeaders?: (headers?: HeadersInit) => HeadersInit;
	} | null;
	readonly onAppointmentCreated?: ((appointment: Appointment) => void) | undefined;
	readonly onSave?:
		| ((
				appointmentId: string,
				draft: {
					patientId: string;
					doctorUserId: string;
					assistantUserId: string | null;
					chairId: string;
					startsAt: string;
					endsAt: string;
					status: Appointment["status"];
					reason: string;
					comment: string;
				},
		  ) => Promise<boolean | void> | boolean | Promise<void> | void)
		| undefined;
	readonly onStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => Promise<void> | void)
		| undefined;
	readonly toDateTimeLocalValue?:
		| ((value: string, timeZone?: string | null) => string)
		| undefined;
	readonly fromDateTimeLocalValue?:
		| ((value: string, timeZone?: string | null) => string)
		| undefined;
	readonly chairDoctorAssignments?:
		| Record<string, ChairDoctorShiftAssignment>
		| undefined;
	readonly appointmentLabels?: Record<Appointment["status"], string> | undefined;
}

export function AppointmentDrawer(props: AppointmentDrawerProps) {
	const {
		isOpen,
		onClose,
		initialSlot,
		appointment,
		dashboard,
		auth,
		onAppointmentCreated,
		onSave,
		onStatusChange,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		chairDoctorAssignments,
		appointmentLabels,
	} = props;

	const timezone =
		dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	const staff = useMemo(
		() => dashboard?.clinicSettings?.staff ?? [],
		[dashboard?.clinicSettings?.staff],
	);
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
	const patients = useMemo(
		() => (dashboard?.patients ?? []).filter((p) => p.status === "active"),
		[dashboard?.patients],
	);

	// Mandate 8n: Solo Doctor Mode detection
	const isSoloDoctor = useMemo(() => {
		const mode = dashboard?.clinicSettings?.profile?.mode;
		return (
			mode === "solo_doctor" ||
			mode === "one_chair" ||
			(doctors.length <= 1 && chairs.length <= 1) ||
			assistants.length === 0
		);
	}, [dashboard?.clinicSettings?.profile?.mode, doctors.length, chairs.length, assistants.length]);

	const toLocal = useCallback(
		(iso: string) => {
			if (typeof toDateTimeLocalValue === "function") {
				return toDateTimeLocalValue(iso, timezone);
			}
			const parsed = new Date(iso);
			if (Number.isNaN(parsed.getTime())) return "";
			return parsed.toISOString().slice(0, 16);
		},
		[toDateTimeLocalValue, timezone],
	);

	const fromLocal = useCallback(
		(local: string) => {
			if (typeof fromDateTimeLocalValue === "function") {
				return fromDateTimeLocalValue(local, timezone);
			}
			if (!local) return new Date().toISOString();
			const withZ = local.includes("Z") ? local : `${local}:00.000Z`;
			const parsed = new Date(withZ);
			if (Number.isNaN(parsed.getTime())) {
				const fallback = new Date(local);
				return Number.isNaN(fallback.getTime())
					? new Date().toISOString()
					: fallback.toISOString();
			}
			return parsed.toISOString();
		},
		[fromDateTimeLocalValue, timezone],
	);

	// Form states
	const [patientId, setPatientId] = useState<string>(() => {
		if (appointment?.patientId) return appointment.patientId;
		if (initialSlot?.patientId) return initialSlot.patientId;
		return "";
	});
	const [searchQuery, setSearchQuery] = useState<string>(() => {
		if (appointment?.patientId) {
			const p = (dashboard?.patients ?? []).find((pt) => pt.id === appointment.patientId);
			return p?.fullName ?? "";
		}
		if (initialSlot?.patientName) return initialSlot.patientName;
		if (initialSlot?.patientId) {
			const p = (dashboard?.patients ?? []).find((pt) => pt.id === initialSlot.patientId);
			return p?.fullName ?? "";
		}
		return "";
	});
	const [isTypeaheadOpen, setIsTypeaheadOpen] = useState<boolean>(false);
	const [showNewPatientInline, setShowNewPatientInline] = useState(false);
	const [newPatientName, setNewPatientName] = useState("");
	const [newPatientPhone, setNewPatientPhone] = useState("");

	const [doctorUserId, setDoctorUserId] = useState<string>(() => {
		if (appointment?.doctorUserId) return appointment.doctorUserId;
		if (initialSlot?.doctorUserId) return initialSlot.doctorUserId;
		return doctors[0]?.id ?? "";
	});
	// Mandate 8e item 8: assistantUserId is strictly optional (nullable)
	const [assistantUserId, setAssistantUserId] = useState<string | null>(() => {
		return appointment?.assistantUserId ?? null;
	});
	const [chairId, setChairId] = useState<string>(() => {
		if (appointment?.chairId) return appointment.chairId;
		if (initialSlot?.chairId) return initialSlot.chairId;
		return chairs[0]?.id ?? DEFAULT_SOLO_CHAIR.id;
	});
	const [startsAtLocal, setStartsAtLocal] = useState<string>(() => {
		if (appointment?.startsAt) return toLocal(appointment.startsAt);
		if (initialSlot?.startsAt) return toLocal(initialSlot.startsAt);
		if (initialSlot?.dateKey && initialSlot?.startTime) {
			return `${initialSlot.dateKey}T${initialSlot.startTime}`;
		}
		return "";
	});
	const [durationMinutes, setDurationMinutes] = useState<number>(() => {
		if (appointment?.startsAt && appointment?.endsAt) {
			const sMs = Date.parse(appointment.startsAt);
			const eMs = Date.parse(appointment.endsAt);
			if (eMs > sMs) return Math.round((eMs - sMs) / 60_000);
		}
		if (initialSlot?.durationMinutes) return initialSlot.durationMinutes;
		return 30;
	});
	const [status, setStatus] = useState<Appointment["status"]>(() => {
		return appointment?.status ?? "planned";
	});
	const [reason, setReason] = useState<string>(() => {
		return appointment?.reason ?? initialSlot?.reason ?? "";
	});
	const [comment, setComment] = useState<string>(() => {
		return appointment?.comment ?? "";
	});
	const [isCito, setIsCito] = useState(() => {
		return Boolean(
			Boolean(
				"isCito" in (appointment || {}) &&
					(appointment as Record<string, unknown>).isCito,
			) ||
				appointment?.reason?.includes("CITO") ||
				appointment?.reason?.includes("Острая боль") ||
				initialSlot?.isCitoEmergency,
		);
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sync when opened or appointment changes
	useEffect(() => {
		if (!isOpen) return;

		if (appointment) {
			setPatientId(appointment.patientId ?? "");
			const pat = patients.find((p) => p.id === appointment.patientId);
			setSearchQuery(pat?.fullName ?? "");
			setDoctorUserId(appointment.doctorUserId ?? doctors[0]?.id ?? "");
			// Mandate 8e: assistant is strictly optional
			setAssistantUserId(appointment.assistantUserId ?? null);
			setChairId(appointment.chairId ?? chairs[0]?.id ?? DEFAULT_SOLO_CHAIR.id);
			setStartsAtLocal(appointment.startsAt ? toLocal(appointment.startsAt) : "");
			if (appointment.startsAt && appointment.endsAt) {
				const sMs = Date.parse(appointment.startsAt);
				const eMs = Date.parse(appointment.endsAt);
				if (eMs > sMs) {
					setDurationMinutes(Math.round((eMs - sMs) / 60_000));
				}
			}
			setStatus(appointment.status ?? "planned");
			setReason(appointment.reason ?? "");
			setComment(appointment.comment ?? "");
			setIsCito(
				Boolean(
					Boolean(
						"isCito" in (appointment || {}) &&
							(appointment as Record<string, unknown>).isCito,
					) ||
						appointment.reason?.includes("CITO") ||
						appointment.reason?.includes("Острая боль"),
				),
			);
			setShowNewPatientInline(false);
			setError(null);
			return;
		}

		// Creation mode from initialSlot
		if (initialSlot) {
			const slotPatId = initialSlot.patientId ?? "";
			setPatientId(slotPatId);
			if (initialSlot.patientName) {
				setSearchQuery(initialSlot.patientName);
			} else if (slotPatId) {
				const match = patients.find((p) => p.id === slotPatId);
				setSearchQuery(match?.fullName ?? "");
			} else {
				setSearchQuery("");
			}

			const slotChairId =
				initialSlot.chairId ||
				(chairs.length === 1 ? chairs[0]?.id : "") ||
				DEFAULT_SOLO_CHAIR.id;
			setChairId(slotChairId);

			const targetTime =
				initialSlot.startsAt ||
				(initialSlot.dateKey && initialSlot.startTime
					? `${initialSlot.dateKey}T${initialSlot.startTime}`
					: undefined);
			const duty = resolveChairDutyDoctor(
				slotChairId,
				targetTime,
				chairDoctorAssignments,
				initialSlot.dateKey,
				initialSlot.doctorUserId,
			);

			setDoctorUserId(
				initialSlot.doctorUserId ||
					duty.doctorId ||
					doctors[0]?.id ||
					"",
			);
			setAssistantUserId(null);

			if (initialSlot.startsAt) {
				setStartsAtLocal(toLocal(initialSlot.startsAt));
			} else if (initialSlot.dateKey && initialSlot.startTime) {
				setStartsAtLocal(`${initialSlot.dateKey}T${initialSlot.startTime}`);
			} else {
				const now = new Date();
				now.setMinutes(0, 0, 0);
				now.setHours(now.getHours() + 1);
				setStartsAtLocal(now.toISOString().slice(0, 16));
			}

			setDurationMinutes(initialSlot.durationMinutes ?? 30);
			setIsCito(Boolean(initialSlot.isCitoEmergency));
			setStatus(initialSlot.isCitoEmergency ? "confirmed" : "planned");
			setReason(
				initialSlot.reason ||
					(initialSlot.isCitoEmergency ? "CITO! Острая боль" : "Первичный осмотр"),
			);
			setComment("");
			setShowNewPatientInline(false);
			setError(null);
			return;
		}

		// Empty default fallback
		setPatientId("");
		setSearchQuery("");
		setDoctorUserId(doctors[0]?.id ?? "");
		setAssistantUserId(null);
		setChairId(chairs[0]?.id ?? DEFAULT_SOLO_CHAIR.id);
		const defDate = new Date();
		defDate.setMinutes(0, 0, 0);
		defDate.setHours(defDate.getHours() + 1);
		setStartsAtLocal(defDate.toISOString().slice(0, 16));
		setDurationMinutes(30);
		setStatus("planned");
		setReason("Консультация и осмотр");
		setComment("");
		setIsCito(false);
		setShowNewPatientInline(false);
		setError(null);
	}, [
		isOpen,
		appointment,
		initialSlot,
		patients,
		doctors,
		chairs,
		chairDoctorAssignments,
		toLocal,
	]);

	// Calculated endsAt
	const endsAtLocal = useMemo(() => {
		if (!startsAtLocal) return "";
		const startMs = Date.parse(fromLocal(startsAtLocal));
		if (Number.isNaN(startMs)) return "";
		const endIso = new Date(startMs + durationMinutes * 60_000).toISOString();
		return toLocal(endIso);
	}, [startsAtLocal, durationMinutes, fromLocal, toLocal]);

	// Filtered patients for typeahead
	const filteredPatients = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return patients.slice(0, 8);
		return patients
			.filter(
				(p) =>
					p.fullName.toLowerCase().includes(q) ||
					(p.phone && p.phone.includes(q)),
			)
			.slice(0, 8);
	}, [patients, searchQuery]);

	// Resource collision check
	const collision = useMemo(() => {
		if (!startsAtLocal || !endsAtLocal) {
			return { hasCollision: false, message: null };
		}
		return checkAppointmentResourceCollision(
			{
				startsAt: fromLocal(startsAtLocal),
				endsAt: fromLocal(endsAtLocal),
				doctorUserId: doctorUserId || null,
				chairId: chairId || null,
				assistantUserId: assistantUserId || null,
				patientId: patientId || null,
				isCito,
				reason,
			},
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment?.id ?? null,
				staff,
				chairs,
				patients,
				formatTimeFn: (iso) => toLocal(iso).slice(11, 16),
				allowCitoOverbooking: isCito,
				isCito,
			},
		);
	}, [
		appointment?.id,
		startsAtLocal,
		endsAtLocal,
		doctorUserId,
		chairId,
		assistantUserId,
		patientId,
		isCito,
		reason,
		fromLocal,
		toLocal,
		dashboard?.appointments,
		staff,
		chairs,
		patients,
	]);

	// 1-Click Status Change handler (Mandate 8e, 8n)
	const handleStatusChangeClick = useCallback(
		async (newStatus: Appointment["status"]) => {
			setStatus(newStatus);
			if (appointment && onStatusChange) {
				try {
					await onStatusChange(appointment.id, newStatus);
					showToast(
						`Статус визита изменен: «${appointmentLabels?.[newStatus] ?? newStatus}»`,
						"success",
					);
				} catch {
					showToast("Не удалось изменить статус на сервере", "error");
				}
			}
		},
		[appointment, onStatusChange, appointmentLabels],
	);

	// Quick patient inline creation (Mandate 8e: zero mocks, return real created patient ID)
	const handleCreateInlinePatient = async (
		e?: React.FormEvent,
	): Promise<string | null> => {
		if (e) e.preventDefault();
		const name = newPatientName.trim();
		const phone = newPatientPhone.trim();
		if (!name && !phone) {
			showToast("Укажите имя или телефон пациента", "warning");
			return null;
		}
		const effectiveName = name || (phone ? `Пациент (${phone})` : "Новый пациент");
		setIsSubmitting(true);
		try {
			const created = await createInlinePatientRecord({
				fullName: effectiveName,
				phone: phone || null,
			});
			if (created?.id) {
				setPatientId(created.id);
				setSearchQuery(created.fullName || effectiveName);
				setShowNewPatientInline(false);
				setNewPatientName("");
				setNewPatientPhone("");
				showToast(`Пациент «${created.fullName}» создан и прикреплен`, "success");
				return created.id;
			}
			showToast(
				"Не удалось сохранить карту пациента на сервере. Проверьте сеть",
				"error",
			);
			return null;
		} catch {
			showToast(
				"Не удалось сохранить карту пациента на сервере. Проверьте сеть",
				"error",
			);
			return null;
		} finally {
			setIsSubmitting(false);
		}
	};

	// Save or Submit appointment
	const handleSaveSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (isSubmitting) return;

		let effectivePatientId = patientId;
		if (!effectivePatientId && (newPatientName.trim() || newPatientPhone.trim())) {
			const createdId = await handleCreateInlinePatient();
			if (createdId) {
				effectivePatientId = createdId;
			}
		}

		if (!effectivePatientId) {
			setError("Выберите пациента или создайте новую карту");
			showToast("Укажите пациента для записи", "error");
			return;
		}

		const effectiveDoctorId =
			doctorUserId ||
			(isSoloDoctor && doctors[0] ? doctors[0].id : "") ||
			doctors[0]?.id ||
			"";
		const effectiveChairId =
			chairId ||
			(chairs.length === 1 ? chairs[0]?.id : "") ||
			DEFAULT_SOLO_CHAIR.id;

		if (!effectiveDoctorId) {
			setError("В клинике нет доступных врачей");
			showToast("Выберите врача", "error");
			return;
		}

		if (!startsAtLocal || !endsAtLocal) {
			setError("Укажите дату и время приема");
			showToast("Проверьте дату и время", "error");
			return;
		}

		const startsAtIso = fromLocal(startsAtLocal);
		const endsAtIso = fromLocal(endsAtLocal);

		if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
			setError("Время окончания должно быть позже времени начала");
			showToast("Некорректная длительность приема", "error");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		// Editing existing appointment
		if (appointment && onSave) {
			try {
				const ok = await onSave(appointment.id, {
					patientId: effectivePatientId,
					doctorUserId: effectiveDoctorId,
					// Mandate 8e: assistant is strictly optional
					assistantUserId: isSoloDoctor ? null : (assistantUserId?.trim() || null),
					chairId: effectiveChairId,
					startsAt: startsAtIso,
					endsAt: endsAtIso,
					status,
					reason,
					comment,
				});
				if (ok !== false) {
					showToast("Запись сохранена", "success");
					onClose();
				}
			} catch {
				setError("Ошибка сохранения записи");
				showToast("Не удалось сохранить запись", "error");
			} finally {
				setIsSubmitting(false);
			}
			return;
		}

		// Creating new appointment with onSave hook fallback
		if (!appointment && onSave) {
			try {
				const ok = await onSave("", {
					patientId: effectivePatientId,
					doctorUserId: effectiveDoctorId,
					assistantUserId: isSoloDoctor ? null : (assistantUserId?.trim() || null),
					chairId: effectiveChairId,
					startsAt: startsAtIso,
					endsAt: endsAtIso,
					status,
					reason: reason.trim() || (isCito ? "CITO! Острая боль" : "Первичный осмотр"),
					comment: comment.trim(),
				});
				if (ok !== false) {
					showToast("Запись сохранена", "success");
					onClose();
				}
			} catch {
				setError("Ошибка сохранения записи");
				showToast("Не удалось сохранить запись", "error");
			} finally {
				setIsSubmitting(false);
			}
			return;
		}

		// Creating new appointment
		try {
			const headers =
				typeof auth?.scheduleMutationHeaders === "function"
					? auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const payload = {
				patientId: effectivePatientId,
				doctorUserId: effectiveDoctorId,
				// Mandate 8e: assistant is strictly optional
				assistantUserId: isSoloDoctor ? null : (assistantUserId?.trim() || null),
				chairId: effectiveChairId,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
				status,
				reason: reason.trim() || (isCito ? "CITO! Острая боль" : "Первичный осмотр"),
				comment: comment.trim() || null,
				allowOverbooking: isCito || collision.hasCollision,
				allowEmergencyOverride: isCito || collision.hasCollision,
			};

			const res = await fetch("/api/appointments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const msg = body?.message || "Ошибка создания записи";
				setError(msg);
				showToast(msg, "error");
				return;
			}

			const created = await res.json();
			showToast(`Запись для «${searchQuery || "Пациента"}» создана!`, "success");
			if (onAppointmentCreated && created) {
				onAppointmentCreated(created);
			}
			onClose();
		} catch {
			setError("Не удалось связаться с сервером");
			showToast("Ошибка сети при создании записи", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const drawerElement = (
		<div
			className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity"
			data-testid="appointment-drawer"
			role="dialog"
			aria-modal="true"
			aria-label={appointment ? "Редактирование записи" : "Запись на прием"}
		>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				aria-label="Закрыть ящик записи"
			/>

			{/* Drawer Surface */}
			<div className="relative w-full max-w-lg h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] overflow-hidden animate-slide-in">
				{/* Header */}
				<div
					className={`p-4 sm:p-5 border-b flex items-center justify-between transition-colors ${
						isCito
							? "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-100"
							: "bg-[var(--paper-soft)] border-[var(--line)]"
					}`}
				>
					<div className="flex items-center gap-3">
						<div
							className={`p-2.5 rounded-xl border transition-all ${
								isCito
									? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/40 animate-pulse"
									: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--brand-primary))]/20"
							}`}
						>
							{isCito ? (
								<Flame size={22} className="text-rose-600 dark:text-rose-400" />
							) : (
								<Sparkles size={20} />
							)}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold tracking-tight text-[var(--ink)] m-0">
									{appointment
										? "Карточка записи"
										: isCito
											? "Экстренный прием (CITO!)"
											: "Запись на прием"}
								</h3>
								{isCito && (
									<span
										className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse shadow-xs"
										data-testid="cito-drawer-badge"
									>
										Острая боль
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								{startsAtLocal
									? `${startsAtLocal.slice(0, 10)} в ${startsAtLocal.slice(11, 16)}`
									: "Расписание клиники"}{" "}
								· {durationMinutes} мин
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Drawer Body Form */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
					{/* 1. 1-Click Visit Status Selector (Mandates 8e, 8n) */}
					<div className="space-y-2" data-testid="drawer-status-selector">
						<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">
							Статус визита (1 клик):
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{APPOINTMENT_STATUS_ITEMS.map((item) => {
								const isCurrent = status === item.key;
								return (
									<button
										key={item.key}
										type="button"
										onClick={() => void handleStatusChangeClick(item.key)}
										className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
											isCurrent
												? item.activeClass
												: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
										}`}
										title={item.title}
										aria-pressed={isCurrent}
										data-testid={`drawer-status-btn-${item.key}`}
									>
										{item.icon}
										<span className="whitespace-nowrap leading-none">{item.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 2. Patient Selection or Quick Inline Creation */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<User size={14} className="text-[var(--teal)]" />
								<span>Пациент *</span>
							</label>
							<button
								type="button"
								onClick={() => setShowNewPatientInline((prev) => !prev)}
								className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
								data-testid="toggle-new-patient-inline-btn"
							>
								<UserPlus size={14} />
								<span>{showNewPatientInline ? "Выбрать из базы" : "+ Новый пациент"}</span>
							</button>
						</div>

						{showNewPatientInline ? (
							<div className="p-3.5 rounded-xl border border-[var(--teal)]/30 bg-[var(--paper-soft)] space-y-3">
								<div>
									<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
										ФИО пациента
									</label>
									<input
										type="text"
										value={newPatientName}
										onChange={(e) => setNewPatientName(e.target.value)}
										placeholder="Иванов Иван Иванович"
										className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="drawer-new-patient-name"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
										Телефон
									</label>
									<input
										type="tel"
										value={newPatientPhone}
										onChange={(e) => setNewPatientPhone(e.target.value)}
										placeholder="+7 999 123-45-67"
										className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="drawer-new-patient-phone"
									/>
								</div>
								<div className="flex items-center gap-2 pt-1">
									<button
										type="button"
										onClick={() => {
											void printBlankMedicalContract(
												newPatientName.trim()
													? {
															fullName: newPatientName.trim(),
															phone: newPatientPhone.trim() || undefined,
														}
													: null,
												{
													doctorName: doctors.find((d) => d.id === doctorUserId)?.fullName,
													clinicName: dashboard?.clinicSettings?.profile?.legalName,
												},
											);
										}}
										className="flex-1 min-h-[44px] py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
										title="Печать пустого договора со строками _______ (Мандат 8e)"
									>
										<FileText size={14} className="text-amber-600" />
										<span>Печать договора (_______)</span>
									</button>
								</div>
							</div>
						) : (
							<div className="relative">
								<div className="relative flex items-center">
									<Search
										size={16}
										className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
									/>
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setIsTypeaheadOpen(true);
										}}
										onFocus={() => setIsTypeaheadOpen(true)}
										placeholder="Поиск пациента по ФИО или телефону…"
										className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="drawer-patient-search-input"
									/>
								</div>
								{isTypeaheadOpen && filteredPatients.length > 0 && (
									<div
										className="absolute top-full left-0 right-0 mt-1 z-30 max-h-56 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl p-1 text-xs"
										data-testid="drawer-patient-typeahead-dropdown"
									>
										{filteredPatients.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => {
													setPatientId(p.id);
													setSearchQuery(p.fullName);
													setIsTypeaheadOpen(false);
												}}
												className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--paper-soft)] flex items-center justify-between gap-2 cursor-pointer transition-colors min-h-[44px]"
											>
												<span className="font-bold text-[var(--ink)]">{p.fullName}</span>
												<span className="text-[var(--muted)]">{p.phone || "—"}</span>
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					{/* 3. Date, Time & Duration */}
					<div className="space-y-3">
						<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
							<Clock size={14} className="text-[var(--teal)]" />
							<span>Дата и время *</span>
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<span className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Начало
								</span>
								<input
									type="datetime-local"
									value={startsAtLocal}
									onChange={(e) => setStartsAtLocal(e.target.value)}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="drawer-starts-at-input"
								/>
							</div>
							<div>
								<span className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Окончание (+{durationMinutes}м)
								</span>
								<input
									type="datetime-local"
									value={endsAtLocal}
									readOnly
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] text-sm outline-none cursor-not-allowed"
								/>
							</div>
						</div>

						{/* Duration Chips */}
						<div className="flex flex-wrap gap-2 pt-1">
							{DURATION_PRESETS.map((preset) => {
								const isSelected = durationMinutes === preset.minutes;
								return (
									<button
										key={preset.minutes}
										type="button"
										onClick={() => setDurationMinutes(preset.minutes)}
										className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
											isSelected
												? "bg-[var(--teal-dark,var(--teal))] text-white shadow-xs"
												: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
										}`}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* 4. Doctor, Chair & Assistant (Doctor Autonomy Mandates 8e, 8n) */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Врач *
							</label>
							<select
								value={doctorUserId}
								onChange={(e) => setDoctorUserId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="drawer-doctor-select"
							>
								<option value="">-- Выберите врача --</option>
								{doctors.map((d) => (
									<option key={d.id} value={d.id}>
										{d.fullName}
										{d.specialties && d.specialties.length > 0
											? ` (${d.specialties.map((s) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
											: ""}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Кресло / Кабинет *
							</label>
							<select
								value={chairId}
								onChange={(e) => setChairId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="drawer-chair-select"
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
						</div>

						{/* Mandate 8e item 8 & Mandate 8n: Assistant selection is strictly optional */}
						{isSoloDoctor ? (
							<div
								className="sm:col-span-2 p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200 text-xs flex items-center gap-2"
								data-testid="drawer-solo-doctor-badge"
							>
								<ShieldCheck size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Режим соло-врача: ассистент не требуется (автономия врача, Мандат 8e/8n)</span>
							</div>
						) : assistants.length > 0 ? (
							<div className="sm:col-span-2">
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
									Ассистент (опционально)
								</label>
								<select
									value={assistantUserId ?? ""}
									onChange={(e) => setAssistantUserId(e.target.value || null)}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="drawer-assistant-select"
								>
									<option value="">-- Без ассистента -- (необязательно для соло-врача)</option>
									{assistants.map((a) => (
										<option key={a.id} value={a.id}>
											{a.fullName}
										</option>
									))}
								</select>
								<p className="text-[11px] text-[var(--muted)] mt-1">
									Выбор ассистента необязателен — сохранение записи никогда не блокируется
								</p>
							</div>
						) : null}
					</div>

					{/* 5. Reason & Clinical Notes */}
					<div className="space-y-3">
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Повод обращения / Услуга
							</label>
							<input
								type="text"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Например: Лечение кариеса, консультация, удаление..."
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="drawer-reason-input"
							/>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Комментарий для врача / регистратуры
							</label>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="Дополнительные примечания или пожелания пациента…"
								rows={2}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="drawer-comment-input"
							/>
						</div>
					</div>

					{/* Collision & CITO Banner */}
					{collision.hasCollision && (
						<div
							className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
							role="alert"
						>
							<AlertTriangle size={16} className="shrink-0 text-amber-600" />
							<span>{collision.message}. Разрешена экстренная запись по острой боли (овербукинг).</span>
						</div>
					)}

					{error && (
						<div
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
							role="alert"
						>
							<AlertTriangle size={14} className="shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>

				{/* Footer with Actions: Mandate 8e button is NEVER disabled due to secondary fields */}
				<div className="p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={() => void handleSaveSubmit()}
						disabled={isSubmitting}
						className={`flex-1 min-h-[44px] px-5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
							collision.hasCollision || isCito
								? "bg-amber-600 hover:bg-amber-700 text-white"
								: "bg-[var(--teal-dark,var(--teal))] hover:brightness-110 active:brightness-95 text-[var(--on-teal,white)]"
						}`}
						data-testid="drawer-save-btn"
					>
						<Plus size={16} />
						<span>
							{isSubmitting
								? "Сохраняю…"
								: appointment
									? "Сохранить изменения"
									: collision.hasCollision || isCito
										? "Записать с овербукингом (CITO)"
										: "Записать на прием"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(drawerElement, document.body)
		: drawerElement;
}

export default AppointmentDrawer;
