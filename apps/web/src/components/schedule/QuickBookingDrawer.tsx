import type { Appointment, Dashboard, DentalSpecialty, Patient } from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	Check,
	Clock,
	Flame,
	Plus,
	RotateCw,
	Search,
	ShieldAlert,
	Sparkles,
	User,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import {
	matchesPatientSearch,
	normalizeCyrillicText,
	normalizePhoneToNational,
} from "../../utils/patientSearchUtils";
import {
	searchPatientsQuick,
	type PatientSearchResultItem,
} from "./patientSearchEngine";
import {
	APPOINTMENT_TYPE_PRESETS,
	DURATION_PRESETS,
	calculatePatientReliability,
	formatPatientBalanceBadge,
	type AppointmentTypePreset,
	type DurationPreset,
	type PatientReliabilityAssessment,
	type QuickBookingAppointmentType,
} from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { specialtyLabels } from "../../workspaceUiLabels";
import { SlotConflictModal } from "./SlotConflictModal";

export interface QuickBookingSlotInfo {
	dateKey?: string | undefined;
	startTime?: string | undefined;
	startsAt?: string | undefined;
	endsAt?: string | undefined;
	doctorUserId?: string | null | undefined;
	chairId?: string | null | undefined;
	durationMinutes?: number | undefined;
	reason?: string | undefined;
	isCitoEmergency?: boolean | undefined;
	patientId?: string | null | undefined;
}

export interface QuickBookingDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	initialSlot?: QuickBookingSlotInfo | null | undefined;
	dashboard?: Dashboard | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	auth?: any;
	onAppointmentCreated?: ((appointment: Appointment) => void) | undefined;
	loadDashboard?: (() => Promise<void>) | undefined;
	setDashboard?: ((dashboard: Dashboard) => void) | undefined;
	toDateTimeLocalValue?:
		| ((value: string, timeZone?: string | null) => string)
		| undefined;
	fromDateTimeLocalValue?:
		| ((value: string, timeZone?: string | null) => string)
		| undefined;
}

const COMMON_REASONS = [
	"Первичный осмотр",
	"Осмотр",
	"Кариес",
	"Пульпит",
	"Профгигиена",
	"Консультация",
	"Удаление",
	"Коронка",
	"Имплантация",
	"CITO! Острая боль",
];

export function QuickBookingDrawer(props: QuickBookingDrawerProps) {
	const {
		isOpen,
		onClose,
		initialSlot,
		dashboard,
		auth,
		onAppointmentCreated,
		loadDashboard,
		setDashboard,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
	} = props;

	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

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
			const parsed = new Date(local);
			if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
			return parsed.toISOString();
		},
		[fromDateTimeLocalValue, timezone],
	);

	// Form states
	const [appointmentType, setAppointmentType] =
		useState<QuickBookingAppointmentType>(() => {
			if (
				initialSlot?.isCitoEmergency ||
				initialSlot?.reason?.includes("CITO") ||
				initialSlot?.reason?.includes("Острая боль")
			) {
				return "emergency";
			}
			if (
				initialSlot?.reason?.includes("Первичн") ||
				initialSlot?.reason?.includes("Консультация")
			) {
				return "primary";
			}
			if (initialSlot?.reason) {
				return "secondary";
			}
			return "primary";
		});
	const [patientId, setPatientId] = useState<string>(
		() => initialSlot?.patientId || "",
	);
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(() => {
		if (!initialSlot?.patientId || !dashboard?.patients) return null;
		return (
			dashboard.patients.find((p) => p.id === initialSlot.patientId) || null
		);
	});
	const [doctorUserId, setDoctorUserId] = useState<string>(
		() => initialSlot?.doctorUserId || "",
	);
	const [assistantUserId, setAssistantUserId] = useState<string>("");
	const [chairId, setChairId] = useState<string>(
		() => initialSlot?.chairId || "",
	);
	const [startsAtLocal, setStartsAtLocal] = useState<string>("");
	const [durationMinutes, setDurationMinutes] = useState<number>(() => {
		if (initialSlot?.durationMinutes) return initialSlot.durationMinutes;
		if (initialSlot?.endsAt && initialSlot?.startsAt) {
			const sMs = Date.parse(initialSlot.startsAt);
			const eMs = Date.parse(initialSlot.endsAt);
			if (eMs > sMs) {
				return Math.round((eMs - sMs) / 60_000);
			}
		}
		return 30;
	});
	const [reason, setReason] = useState<string>(() => {
		if (initialSlot?.reason) return initialSlot.reason;
		if (initialSlot?.isCitoEmergency) return "CITO! Острая боль";
		return "Первичный осмотр";
	});
	const [comment, setComment] = useState<string>("");
	const [status, setStatus] = useState<Appointment["status"]>("planned");

	// Typeahead patient search
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [isTypeaheadOpen, setIsTypeaheadOpen] = useState<boolean>(false);
	const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Inline new patient creation
	const [showInlineNewPatient, setShowInlineNewPatient] = useState<boolean>(false);
	const [newPatientFullName, setNewPatientFullName] = useState<string>("");
	const [newPatientPhone, setNewPatientPhone] = useState<string>("");
	const [newPatientBirthDate, setNewPatientBirthDate] = useState<string>("");
	const [isCreatingPatient, setIsCreatingPatient] = useState<boolean>(false);

	// Dirty state guard confirmation
	const [showDirtyConfirm, setShowDirtyConfirm] = useState<boolean>(false);

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [slotConflict, setSlotConflict] = useState<{
		message: string;
		suggestedSlots: string[];
	} | null>(null);

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(
		() => staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner")),
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
	const isSoloDoctor = dashboard?.clinicSettings?.profile?.mode === "solo_doctor";
	const patients = useMemo(() => dashboard?.patients ?? [], [dashboard?.patients]);

	// Patient Discipline & Reliability assessment memo
	const patientReliability: PatientReliabilityAssessment | null = useMemo(() => {
		if (!selectedPatient) return null;
		return calculatePatientReliability(selectedPatient, dashboard?.appointments);
	}, [selectedPatient, dashboard?.appointments]);

	// Initialize fields on open
	useEffect(() => {
		if (!isOpen) return;

		// Compute initial start time
		let initialStartIso = new Date().toISOString();
		let initialDuration = initialSlot?.durationMinutes || 30;

		if (initialSlot?.startsAt) {
			initialStartIso = initialSlot.startsAt;
		} else if (initialSlot?.dateKey && initialSlot?.startTime) {
			initialStartIso = `${initialSlot.dateKey}T${initialSlot.startTime}:00.000Z`;
		} else if (initialSlot?.dateKey) {
			const now = new Date();
			const hours = String(now.getHours()).padStart(2, "0");
			const mins = now.getMinutes() < 30 ? "00" : "30";
			initialStartIso = `${initialSlot.dateKey}T${hours}:${mins}:00.000Z`;
		}

		if (initialSlot?.endsAt && initialSlot?.startsAt) {
			const sMs = Date.parse(initialSlot.startsAt);
			const eMs = Date.parse(initialSlot.endsAt);
			if (eMs > sMs) {
				initialDuration = Math.round((eMs - sMs) / 60_000);
			}
		}

		setStartsAtLocal(toLocal(initialStartIso));
		setDurationMinutes(initialDuration);

		// Doctor prefill
		const defaultDocId =
			initialSlot?.doctorUserId ||
			(doctors.length === 1 ? doctors[0]?.id : "") ||
			doctors[0]?.id ||
			"";
		setDoctorUserId(defaultDocId);

		// Chair prefill
		const defaultChairId =
			initialSlot?.chairId ||
			(chairs.length === 1 ? chairs[0]?.id : "") ||
			chairs[0]?.id ||
			"";
		setChairId(defaultChairId);

		// Assistant: опционально, без принудительного назначения
		setAssistantUserId("");

		// Pre-selected patient if provided in slot
		if (initialSlot?.patientId) {
			const found = (dashboard?.patients ?? []).find((p) => p.id === initialSlot.patientId);
			if (found) {
				setPatientId(found.id);
				setSelectedPatient(found);
				setSearchQuery(found.fullName);
			} else {
				setPatientId(initialSlot.patientId);
				setSelectedPatient(null);
				setSearchQuery("");
			}
		} else {
			setPatientId("");
			setSelectedPatient(null);
			setSearchQuery("");
		}

		setIsTypeaheadOpen(false);
		setShowInlineNewPatient(false);
		setNewPatientFullName("");
		setNewPatientPhone("");
		setNewPatientBirthDate("");
		setShowDirtyConfirm(false);

		const isCito = Boolean(
			initialSlot?.isCitoEmergency ||
			initialSlot?.reason?.includes("CITO") ||
			initialSlot?.reason?.includes("Острая боль")
		);

		if (isCito) {
			setAppointmentType("emergency");
			setReason(initialSlot?.reason || "CITO! Острая боль");
			setComment("Экстренный прием по острой боли (CITO)");
			setStatus("confirmed");
			if (!initialSlot?.durationMinutes) {
				setDurationMinutes(30);
			}
		} else if (
			initialSlot?.reason?.includes("Первичн") ||
			initialSlot?.reason?.includes("Консультация") ||
			initialSlot?.reason?.includes("Осмотр")
		) {
			setAppointmentType("primary");
			setReason(initialSlot?.reason || "Первичный осмотр");
			setComment("");
			setStatus("planned");
		} else if (initialSlot?.reason) {
			setAppointmentType("secondary");
			setReason(initialSlot.reason);
			setComment("");
			setStatus("planned");
		} else {
			setAppointmentType("primary");
			setReason("Первичный осмотр");
			setComment("");
			setStatus("planned");

			// Restore saved draft if opening a blank booking
			if (!initialSlot?.patientId && !initialSlot?.reason) {
				try {
					const rawDraft = localStorage.getItem("dente_quick_booking_draft");
					if (rawDraft) {
						const saved = JSON.parse(rawDraft);
						if (saved && typeof saved === "object") {
							if (saved.appointmentType) setAppointmentType(saved.appointmentType);
							if (saved.comment) setComment(saved.comment);
							if (saved.reason) setReason(saved.reason);
							if (saved.durationMinutes) setDurationMinutes(saved.durationMinutes);
							if (saved.doctorUserId && !initialSlot?.doctorUserId) setDoctorUserId(saved.doctorUserId);
							if (saved.chairId && !initialSlot?.chairId) setChairId(saved.chairId);
							if (saved.patientId) {
								setPatientId(saved.patientId);
								if (saved.selectedPatient) {
									setSelectedPatient(saved.selectedPatient);
									setSearchQuery(saved.selectedPatient.fullName || "");
								}
							}
						}
					}
				} catch {}
			}
		}

		setSubmitError(null);
		setIsSubmitting(false);

		// Focus search input next frame
		setTimeout(() => {
			searchInputRef.current?.focus();
		}, 100);
	}, [
		isOpen,
		initialSlot,
		toLocal,
		doctors,
		chairs,
		assistants,
		isSoloDoctor,
		dashboard?.patients,
	]);

	const handleSelectAppointmentType = (type: QuickBookingAppointmentType) => {
		setAppointmentType(type);
		const preset = APPOINTMENT_TYPE_PRESETS.find((p) => p.type === type);
		if (!preset) return;

		if (type === "emergency") {
			setReason("CITO! Острая боль");
			setComment((prev) => prev || "Экстренный прием по острой боли (CITO)");
			setStatus("confirmed");
			if (durationMinutes > 45) {
				setDurationMinutes(30);
			}
		} else if (type === "primary") {
			setReason(preset.defaultReason);
			setStatus("planned");
		} else {
			setReason(preset.defaultReason);
			setStatus("planned");
		}
	};

	// Check if form has uncommitted user modifications (dirty guard)
	const isDirty = useMemo(() => {
		if (comment.trim().length > 0) return true;
		if (newPatientFullName.trim().length > 0 || newPatientPhone.trim().length > 0) return true;
		if (patientId && patientId !== (initialSlot?.patientId || "")) return true;
		const initialReason = initialSlot?.reason || (initialSlot?.isCitoEmergency ? "CITO! Острая боль" : "Первичный осмотр");
		if (reason.trim() !== initialReason.trim()) return true;
		return false;
	}, [comment, newPatientFullName, newPatientPhone, patientId, initialSlot, reason]);

	// Filtered patients for typeahead (Levenshtein fuzzy scoring & ranking)
	const searchResults = useMemo(() => {
		const q = searchQuery.trim();
		if (!q) {
			return patients
				.filter((p) => p.status === "active")
				.slice(0, 8)
				.map((p) => ({
					patient: p,
					score: 0,
					fullNameHighlights: [{ text: p.fullName, isMatch: false }],
					phoneHighlights: [{ text: p.phone || "—", isMatch: false }],
					matchedBy: "name" as const,
					isFuzzy: false,
				}));
		}
		return searchPatientsQuick(patients, q, 10);
	}, [patients, searchQuery]);

	// Duplication Guard: check if new patient name already exists in clinic database
	const potentialDuplicates = useMemo(() => {
		const name = newPatientFullName.trim();
		if (name.length < 3) return [];
		return searchPatientsQuick(patients, name, 3).filter((item) => item.score >= 35);
	}, [patients, newPatientFullName]);

	// Recalculate endsAt based on startsAtLocal and durationMinutes
	const endsAtLocal = useMemo(() => {
		if (!startsAtLocal) return "";
		const startMs = Date.parse(fromLocal(startsAtLocal));
		if (Number.isNaN(startMs)) return "";
		const endIso = new Date(startMs + durationMinutes * 60_000).toISOString();
		return toLocal(endIso);
	}, [startsAtLocal, durationMinutes, fromLocal, toLocal]);

	// Collision checking
	const appointmentDraftForCollision = useMemo(() => {
		return {
			startsAt: startsAtLocal ? fromLocal(startsAtLocal) : "",
			endsAt: endsAtLocal ? fromLocal(endsAtLocal) : "",
			doctorUserId: doctorUserId || null,
			chairId: chairId || null,
			assistantUserId: assistantUserId || null,
			patientId: patientId || null,
			status,
			reason,
			comment,
		};
	}, [
		startsAtLocal,
		endsAtLocal,
		doctorUserId,
		chairId,
		assistantUserId,
		patientId,
		status,
		reason,
		comment,
		fromLocal,
	]);

	const collision = useMemo(() => {
		if (!startsAtLocal || !endsAtLocal) {
			return { hasCollision: false, message: null };
		}
		return checkAppointmentResourceCollision(
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			appointmentDraftForCollision as any,
			dashboard?.appointments,
			{
				staff: dashboard?.clinicSettings?.staff ?? [],
				chairs: dashboard?.clinicSettings?.chairs ?? [],
				patients: dashboard?.patients ?? [],
				formatTimeFn: (iso) => toLocal(iso).slice(11, 16),
			},
		);
	}, [
		appointmentDraftForCollision,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.patients,
		startsAtLocal,
		endsAtLocal,
		toLocal,
	]);

	const selectPatient = (patient: Patient) => {
		setSelectedPatient(patient);
		setPatientId(patient.id);
		setSearchQuery(patient.fullName);
		setIsTypeaheadOpen(false);
		setShowInlineNewPatient(false);
	};

	const handleCreateInlinePatient = async (e: React.FormEvent) => {
		e.preventDefault();
		const fullName = newPatientFullName.trim();
		if (!fullName) {
			showToast("Укажите ФИО пациента", "error");
			return;
		}

		setIsCreatingPatient(true);
		try {
			const headers =
				typeof auth?.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const res = await fetchWithHandling("/api/patients", {
				method: "POST",
				headers,
				body: JSON.stringify({
					fullName,
					phone: newPatientPhone.trim() || null,
					birthDate: newPatientBirthDate.trim() || null,
				}),
			});

			if (!res.ok) {
				showToast("Не удалось создать пациента", "error");
				return;
			}

			const createdPatient = (await res.json()) as Patient;
			if (createdPatient?.id) {
				// Update in local dashboard if setDashboard available
				if (typeof setDashboard === "function" && dashboard) {
					setDashboard({
						...dashboard,
						patients: [
							createdPatient,
							...(dashboard.patients ?? []).filter((p) => p.id !== createdPatient.id),
						],
					});
				}
				selectPatient(createdPatient);
				showToast(`Пациент «${createdPatient.fullName}» создан и выбран!`, "success", 4000);
			}
		} catch (err) {
			logger.error("Failed to create inline patient", err);
			showToast(
				actionFailureToast("Ошибка создания пациента", (err as { status?: number })?.status ?? null),
				"error",
			);
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleSubmitBooking = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (isSubmitting) return;

		if (!patientId) {
			setSubmitError("Выберите или создайте пациента");
			showToast("Выберите пациента перед сохранением записи", "error");
			searchInputRef.current?.focus();
			return;
		}

		const effectiveDoctorId =
			doctorUserId ||
			(doctors.length === 1 ? doctors[0]?.id : "") ||
			doctors[0]?.id ||
			"";
		const effectiveChairId =
			chairId ||
			(chairs.length === 1 ? chairs[0]?.id : "") ||
			chairs[0]?.id ||
			"";

		if (!patientId) {
			setSubmitError("Выберите или создайте пациента");
			showToast("Выберите пациента перед сохранением записи", "error");
			searchInputRef.current?.focus();
			return;
		}

		if (!effectiveDoctorId) {
			setSubmitError("Выберите врача для приема");
			showToast("Выберите врача", "error");
			return;
		}

		if (!effectiveChairId) {
			setSubmitError("В клинике нет активных кресел");
			showToast("В клинике нет доступных кресел", "error");
			return;
		}

		if (!startsAtLocal || !endsAtLocal) {
			setSubmitError("Укажите время начала и окончания");
			showToast("Проверьте дату и время", "error");
			return;
		}

		const startsAtIso = fromLocal(startsAtLocal);
		const endsAtIso = fromLocal(endsAtLocal);

		if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
			setSubmitError("Время окончания должно быть позже времени начала");
			showToast("Некорректная длительность приема", "error");
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const mutationHeaders =
				typeof auth?.scheduleMutationHeaders === "function"
					? auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const payload = {
				patientId,
				doctorUserId: effectiveDoctorId,
				assistantUserId: assistantUserId || null,
				chairId: effectiveChairId,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
				status,
				reason: reason.trim() || null,
				comment: comment.trim() || null,
				clientMutationId: `quick-booking-${Date.now()}`,
			};

			const res = await fetchWithHandling("/api/appointments", {
				method: "POST",
				headers: mutationHeaders,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errBody = await res.json().catch(() => null);
				const msg =
					errBody?.message ||
					(res.status === 409
						? "Конфликт времени: выбранный врач или кресло уже заняты"
						: "Ошибка сервера при создании записи");
				setSubmitError(msg);
				if (res.status === 409 && Array.isArray(errBody?.suggestedSlots)) {
					setSlotConflict({
						message: msg,
						suggestedSlots: errBody.suggestedSlots,
					});
				}
				showToast(msg, "error");
				return;
			}

			const nextDashboard = (await res.json()) as Dashboard;
			if (nextDashboard && typeof nextDashboard === "object" && typeof setDashboard === "function") {
				setDashboard(nextDashboard);
			}

			if (typeof loadDashboard === "function") {
				void loadDashboard();
			}

			const patientName = selectedPatient?.fullName || "Пациент";
			const timeLabel = startsAtLocal.slice(11, 16);
			showToast(`Запись для «${patientName}» создана на ${timeLabel}!`, "success", 5000);

			if (typeof onAppointmentCreated === "function" && nextDashboard?.appointments) {
				const created = nextDashboard.appointments.find(
					(a) => a.patientId === patientId && a.startsAt === startsAtIso,
				);
				if (created) onAppointmentCreated(created);
			}

			// Clear saved draft on successful booking creation
			try {
				localStorage.removeItem("dente_quick_booking_draft");
			} catch {}

			onClose();
		} catch (err) {
			logger.error("Quick booking submission failed", err);
			const msg = "Не удалось связаться с сервером клиники. Повторите попытку.";
			setSubmitError(msg);
			showToast(msg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Save draft to localStorage and close
	const handleSaveDraftAndClose = useCallback(() => {
		try {
			const draftData = {
				appointmentType,
				patientId,
				selectedPatient,
				doctorUserId,
				assistantUserId,
				chairId,
				startsAtLocal,
				durationMinutes,
				reason,
				comment,
				savedAt: new Date().toISOString(),
			};
			localStorage.setItem("dente_quick_booking_draft", JSON.stringify(draftData));
			showToast("Черновик записи сохранен", "info");
		} catch {}
		setShowDirtyConfirm(false);
		onClose();
	}, [
		appointmentType,
		patientId,
		selectedPatient,
		doctorUserId,
		assistantUserId,
		chairId,
		startsAtLocal,
		durationMinutes,
		reason,
		comment,
		onClose,
	]);

	// Discard draft and close
	const handleDiscardDraftAndClose = useCallback(() => {
		try {
			localStorage.removeItem("dente_quick_booking_draft");
		} catch {}
		setShowDirtyConfirm(false);
		onClose();
	}, [onClose]);

	// Soft close request with dirty state guard
	const handleRequestClose = useCallback(() => {
		if (isDirty) {
			setShowDirtyConfirm(true);
		} else {
			onClose();
		}
	}, [isDirty, onClose]);

	// Keyboard handler for drawer (Escape to close, Ctrl+Enter to submit)
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			if (showDirtyConfirm) {
				setShowDirtyConfirm(false);
			} else {
				handleRequestClose();
			}
		} else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			void handleSubmitBooking();
		}
	};

	const isEmergencyMode =
		appointmentType === "emergency" ||
		Boolean(
			initialSlot?.isCitoEmergency ||
			initialSlot?.reason?.includes("CITO") ||
			initialSlot?.reason?.includes("Острая боль")
		);

	if (!isOpen) return null;

	const drawerElement = (
		<div
			className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
			data-testid="quick-booking-drawer"
			onKeyDown={handleKeyDown}
			role="dialog"
			aria-modal="true"
			aria-label="Быстрая запись на прием"
		>
			{/* Backdrop button */}
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				onClick={handleRequestClose}
				aria-label="Закрыть быструю запись"
			/>

			{/* Drawer Surface */}
			<div className="relative w-full max-w-lg h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] overflow-hidden animate-slide-in">
				{/* Header */}
				<div
					className={`p-5 border-b flex items-center justify-between transition-colors ${
						isEmergencyMode
							? "bg-rose-500/15 dark:bg-rose-950/50 border-rose-500/40 text-rose-900 dark:text-rose-100"
							: "bg-[var(--paper-soft)] border-[var(--line)]"
					}`}
				>
					<div className="flex items-center gap-3">
						<div
							className={`p-2.5 rounded-xl border transition-all ${
								isEmergencyMode
									? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/40 animate-pulse"
									: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--brand-primary))]/20"
							}`}
						>
							{isEmergencyMode ? (
								<Flame size={22} className="text-rose-600 dark:text-rose-400" />
							) : (
								<Sparkles size={20} />
							)}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold tracking-tight text-[var(--ink)] m-0">
									{isEmergencyMode ? "Экстренный прием (CITO!)" : "Быстрая запись на прием"}
								</h3>
								{isEmergencyMode && (
									<span
										className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse shadow-xs"
										data-testid="cito-header-badge"
									>
										Острая боль
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								{startsAtLocal
									? `${startsAtLocal.slice(0, 10)} в ${startsAtLocal.slice(11, 16)}`
									: "1-клик бронирование"}{" "}
								· {durationMinutes} мин
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleRequestClose}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-5 space-y-5">
					{/* Quick Appointment Type Selector */}
					<div className="space-y-1.5" data-testid="quick-booking-type-selector">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<Sparkles size={14} className="text-[var(--teal)]" />
								<span>Тип приема *</span>
							</span>
							{appointmentType === "emergency" && (
								<span
									className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse"
									data-testid="cito-slot-priority-badge"
								>
									Приоритетный слот
								</span>
							)}
						</div>
						<div className="grid grid-cols-3 gap-2">
							{APPOINTMENT_TYPE_PRESETS.map((preset) => {
								const isSelected = appointmentType === preset.type;
								const isEm = preset.isEmergency;
								return (
									<button
										key={preset.type}
										type="button"
										onClick={() => handleSelectAppointmentType(preset.type)}
										className={`min-h-[48px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
											isSelected
												? isEm
													? "bg-rose-500/20 text-rose-950 dark:text-rose-100 border-rose-500 ring-2 ring-rose-500/50 shadow-md"
													: "bg-[var(--teal-dark)] text-[var(--on-teal)] border-[var(--teal)] shadow-md"
												: isEm
													? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/15"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
										}`}
										data-testid={`quick-booking-type-${preset.type}`}
										title={preset.description}
									>
										<div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
											{isEm ? (
												<Flame
													size={15}
													className={
														isSelected ? "text-rose-500 animate-bounce" : "text-rose-600"
													}
												/>
											) : isSelected ? (
												<Check size={14} />
											) : null}
											<span>{preset.label}</span>
										</div>
										<span
											className={`text-[10px] truncate block mt-0.5 ${
												isSelected
													? isEm
														? "text-rose-800 dark:text-rose-200"
														: "text-white/80"
													: "text-[var(--muted)]"
											}`}
										>
											{preset.description}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* CITO Emergency Callout Banner */}
					{isEmergencyMode && (
						<div
							className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in"
							data-testid="cito-emergency-banner"
						>
							<div className="flex items-center gap-2">
								<Flame
									size={18}
									className="text-rose-600 dark:text-rose-400 shrink-0 animate-bounce"
								/>
								<span>
									Экстренный слот дежурному врачу (острая боль, пульпит, абсцесс). Заполнение
									карты можно завершить во время или после приема.
								</span>
							</div>
						</div>
					)}

					{/* Collision alert if any */}
					{collision.hasCollision && (
						<div
							className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
							role="alert"
						>
							<AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>⚠️ {collision.message}. Разрешена экстренная запись (острая боль / овербукинг).</span>
						</div>
					)}

					{/* 1. Patient Selection & Typeahead */}
					<div className="space-y-2">
						<div className="flex justify-between items-center flex-wrap gap-1">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<User size={14} className="text-[var(--teal)]" />
								<span>Пациент *</span>
							</label>
							{!showInlineNewPatient && (
								<div className="flex items-center gap-2">
									{isEmergencyMode && (
										<button
											type="button"
											onClick={() => {
												setShowInlineNewPatient(true);
												setNewPatientFullName("Пациент с острой болью (CITO)");
												setNewPatientPhone("");
											}}
											className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[36px] px-2 bg-rose-500/10 rounded-lg cursor-pointer"
											title="Создать временную карту для пациента с острой болью"
										>
											<Flame size={13} />
											<span>+ Экспресс-пациент CITO</span>
										</button>
									)}
									<button
										type="button"
										onClick={() => {
											setShowInlineNewPatient(true);
											setNewPatientFullName(
												/^[а-яёa-z\s]+$/i.test(searchQuery) ? searchQuery : "",
											);
											setNewPatientPhone(
												/^[0-9+()-\s]+$/.test(searchQuery) ? searchQuery : "",
											);
										}}
										className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 min-h-[36px] px-2 cursor-pointer"
									>
										<UserPlus size={14} />
										<span>+ Новый пациент</span>
									</button>
								</div>
							)}
						</div>

						{/* Selected Patient Card */}
						{selectedPatient ? (
							<div
								className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
								data-testid="selected-patient-card"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] font-bold text-sm flex items-center justify-center border border-[var(--teal)]/30 shrink-0">
											{selectedPatient.fullName.slice(0, 2).toUpperCase()}
										</div>
										<div className="min-w-0">
											<h4 className="text-sm font-bold text-[var(--ink)] m-0 leading-snug truncate">
												{selectedPatient.fullName}
											</h4>
											<div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
												{selectedPatient.phone && <span>{selectedPatient.phone}</span>}
												{selectedPatient.birthDate && (
													<span>д.р. {selectedPatient.birthDate}</span>
												)}
											</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => {
											setSelectedPatient(null);
											setPatientId("");
											setSearchQuery("");
											setTimeout(() => searchInputRef.current?.focus(), 50);
										}}
										className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs text-[var(--muted)] hover:text-rose-600 rounded-lg hover:bg-[var(--paper)] transition-colors cursor-pointer"
										title="Выбрать другого пациента"
										aria-label="Сменить пациента"
									>
										<X size={16} />
									</button>
								</div>

								{/* Reliability & Discipline Assessment */}
								{patientReliability && (
									<div
										className="pt-2.5 border-t border-[var(--line)] space-y-2"
										data-testid="patient-reliability-section"
									>
										<div className="flex items-center justify-between gap-2 flex-wrap">
											{/* Reliability Badge */}
											<div
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${patientReliability.reliabilityBadge.badgeClass}`}
												data-testid={`patient-reliability-badge-${patientReliability.category}`}
												title={patientReliability.reliabilityBadge.summary}
											>
												<span>{patientReliability.reliabilityBadge.emoji}</span>
												<span>{patientReliability.reliabilityBadge.badgeText}</span>
											</div>

											{/* Financial Badge */}
											<div
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${patientReliability.financialBadge.badgeClass}`}
												data-testid="patient-financial-badge"
												title={`Баланс пациента: ${patientReliability.financialBadge.label}`}
											>
												<span>{patientReliability.financialBadge.label}</span>
											</div>
										</div>

										{/* Stats Summary Line */}
										<div className="text-[11px] text-[var(--muted)] flex items-center justify-between gap-2">
											<span>Дисциплина: {patientReliability.reliabilityBadge.summary}</span>
											{patientReliability.stats.totalAppointments > 0 && (
												<span>Визитов вовремя: {patientReliability.stats.onTimeRatePercent}%</span>
											)}
										</div>

										{/* Receptionist Guidance Alert Banner */}
										{patientReliability.category === "risk" && (
											<div
												className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-start gap-2 animate-pulse"
												data-testid="patient-reliability-risk-alert"
											>
												<AlertTriangle
													size={16}
													className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
												/>
												<div className="space-y-0.5">
													<p className="m-0 font-extrabold text-rose-700 dark:text-rose-300">
														🔴 Требуется подтверждение за 2 часа!
													</p>
													<p className="m-0 font-normal text-[11px]">
														{patientReliability.receptionistAlert ||
															"У пациента зафиксированы повторные неявки. Обязательно подтвердить явку перед приемом."}
													</p>
												</div>
											</div>
										)}

										{patientReliability.category === "attention" && (
											<div
												className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-100 text-xs font-semibold flex items-start gap-2"
												data-testid="patient-reliability-attention-alert"
											>
												<AlertTriangle
													size={15}
													className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
												/>
												<div className="space-y-0.5">
													<p className="m-0 font-bold text-amber-800 dark:text-amber-300">
														⚠️ Зона внимания регистратуры
													</p>
													<p className="m-0 font-normal text-[11px]">
														{patientReliability.receptionistAlert ||
															"Рекомендуется контрольный звонок накануне визита."}
													</p>
												</div>
											</div>
										)}

										{patientReliability.category === "reliable" && (
											<div
												className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-1.5"
												data-testid="patient-reliability-reliable-notice"
											>
												<Check
													size={14}
													className="text-emerald-600 dark:text-emerald-400 shrink-0"
												/>
												<span>Высокая надежность: 0 срывов визитов. Стандартная запись.</span>
											</div>
										)}

										{/* Financial Debt Notification if debt > 0 */}
										{patientReliability.financialBadge.isDebt && (
											<div
												className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2"
												data-testid="patient-reliability-debt-alert"
											>
												<span className="font-semibold">
													Финансовый долг:{" "}
													{patientReliability.financialBadge.formattedAmount}
												</span>
												<span className="text-[11px] text-rose-700 dark:text-rose-300">
													Напомнить об оплате
												</span>
											</div>
										)}
									</div>
								)}
							</div>
						) : (
							/* Typeahead Search Input */
							<div className="relative z-30">
								<div className="relative">
									<Search
										size={16}
										className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
									/>
									<input
										ref={searchInputRef}
										type="text"
										value={searchQuery}
										placeholder="Поиск по ФИО, телефону или дате рождения…"
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setIsTypeaheadOpen(true);
											setHighlightedIndex(0);
										}}
										onFocus={() => setIsTypeaheadOpen(true)}
										onKeyDown={(e) => {
											if (e.key === "ArrowDown") {
												e.preventDefault();
												setHighlightedIndex((prev) =>
													prev < searchResults.length - 1 ? prev + 1 : 0,
												);
											} else if (e.key === "ArrowUp") {
												e.preventDefault();
												setHighlightedIndex((prev) =>
													prev > 0 ? prev - 1 : searchResults.length - 1,
												);
											} else if (e.key === "Enter" && searchResults[highlightedIndex]) {
												e.preventDefault();
												const picked = searchResults[highlightedIndex]?.patient;
												if (picked) selectPatient(picked);
											} else if (e.key === "Escape") {
												setIsTypeaheadOpen(false);
											}
										}}
										className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent transition-all"
										aria-autocomplete="list"
										aria-expanded={isTypeaheadOpen}
									/>
								</div>

								{/* Dropdown Suggestions */}
								{isTypeaheadOpen && (
									<div
										className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-[var(--paper)] border border-[var(--line-strong)] shadow-2xl z-50 divide-y divide-[var(--line)]"
										style={{
											backgroundColor: "var(--paper)",
											boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
										}}
										role="listbox"
									>
										{searchResults.length > 0 ? (
											searchResults.map((item, idx) => {
												const p = item.patient;
												const itemReliability = calculatePatientReliability(
													p,
													dashboard?.appointments,
												);
												return (
													<button
														key={p.id}
														type="button"
														onClick={() => selectPatient(p)}
														className={`w-full p-3 text-left flex items-center justify-between transition-colors min-h-[44px] cursor-pointer ${
															idx === highlightedIndex
																? "bg-[var(--teal-surface)] text-[var(--ink)]"
																: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
														}`}
														role="option"
														aria-selected={idx === highlightedIndex}
														data-testid={`quick-booking-patient-option-${p.id}`}
													>
														<div className="min-w-0 flex-1 pr-2">
															<div className="flex items-center gap-2 flex-wrap">
																<span className="text-sm font-semibold text-[var(--ink)] truncate">
																	{p.fullName}
																</span>
																{item.isFuzzy && (
																	<span
																		className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0"
																		title="Нечеткое совпадение по опечатке"
																		data-testid="quick-booking-fuzzy-badge"
																	>
																		<Sparkles size={10} className="text-amber-500" />
																		<span>Возможно: {item.suggestedName || p.fullName}</span>
																	</span>
																)}
															</div>
															<div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
																{p.phone && <span>{p.phone}</span>}
																{p.birthDate && <span>д.р. {p.birthDate}</span>}
															</div>
														</div>
														<div className="flex items-center gap-1.5 shrink-0">
															<span
																className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${itemReliability.reliabilityBadge.badgeClass}`}
																title={itemReliability.reliabilityBadge.summary}
															>
																{itemReliability.reliabilityBadge.emoji} {itemReliability.reliabilityBadge.shortLabel}
															</span>
															{itemReliability.financialBadge.isDebt && (
																<span
																	className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-500/30 font-mono"
																	title={`Долг: ${itemReliability.financialBadge.formattedAmount}`}
																>
																	-{itemReliability.financialBadge.formattedAmount}
																</span>
															)}
															{itemReliability.financialBadge.isDeposit && (
																<span
																	className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30 font-mono"
																	title={`Депозит: ${itemReliability.financialBadge.formattedAmount}`}
																>
																	+{itemReliability.financialBadge.formattedAmount}
																</span>
															)}
														</div>
													</button>
												);
											})
										) : (
											<div className="p-4 text-center text-xs text-[var(--muted)]">
												<span>Пациент не найден в базе.</span>
												<button
													type="button"
													onClick={() => {
														setShowInlineNewPatient(true);
														setIsTypeaheadOpen(false);
														setNewPatientFullName(
															/^[а-яёa-z\s]+$/i.test(searchQuery) ? searchQuery : "",
														);
														setNewPatientPhone(
															/^[0-9+()-\s]+$/.test(searchQuery) ? searchQuery : "",
														);
													}}
													className="block mx-auto mt-2 text-xs font-bold text-[var(--teal)] hover:underline min-h-[36px]"
												>
													+ Создать «{searchQuery || "Нового пациента"}»
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Inline New Patient Form with Duplication Guard */}
						{showInlineNewPatient && (
							<form
								onSubmit={handleCreateInlinePatient}
								className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 mt-2"
							>
								<div className="flex justify-between items-center">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5 m-0">
										<UserPlus size={14} />
										<span>Создание нового пациента</span>
									</h4>
									<button
										type="button"
										onClick={() => setShowInlineNewPatient(false)}
										className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
									>
										Отмена
									</button>
								</div>

								{/* Anti-Duplicate Warning if similar patient exists */}
								{potentialDuplicates.length > 0 && (
									<div
										className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2"
										data-testid="inline-patient-duplicate-warning"
									>
										<div className="flex items-start gap-2">
											<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
											<div className="space-y-0.5">
												<p className="font-bold m-0">
													Похожий пациент уже есть в базе:
												</p>
												<p className="m-0 text-[var(--muted)]">
													Во избежание дублирования карт выберите существующего пациента:
												</p>
											</div>
										</div>
										<div className="space-y-1 pl-6">
											{potentialDuplicates.map((item) => (
												<button
													key={item.patient.id}
													type="button"
													onClick={() => selectPatient(item.patient)}
													className="w-full text-left p-2 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-2 cursor-pointer"
												>
													<span className="font-bold text-[var(--ink)]">
														{item.patient.fullName}
														{item.patient.phone ? ` (${item.patient.phone})` : ""}
													</span>
													<span className="text-[11px] text-[var(--teal)] font-semibold shrink-0">
														Выбрать карту &rarr;
													</span>
												</button>
											))}
										</div>
									</div>
								)}

								<div className="space-y-2">
									<div>
										<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
											ФИО пациента *
										</label>
										<input
											type="text"
											required
											value={newPatientFullName}
											onChange={(e) => setNewPatientFullName(e.target.value)}
											placeholder="Иванов Иван Иванович"
											className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
										/>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
												Телефон
											</label>
											<input
												type="tel"
												value={newPatientPhone}
												onChange={(e) => setNewPatientPhone(e.target.value)}
												placeholder="+7 999 123-45-67"
												className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
											/>
										</div>
										<div>
											<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
												Дата рождения
											</label>
											<input
												type="date"
												value={newPatientBirthDate}
												onChange={(e) => setNewPatientBirthDate(e.target.value)}
												className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
											/>
										</div>
									</div>
								</div>
								<button
									type="submit"
									disabled={isCreatingPatient || !newPatientFullName.trim()}
									className="w-full min-h-[44px] py-2 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
								>
									<Check size={14} />
									<span>
										{isCreatingPatient ? "Создаю пациента…" : "Создать и выбрать"}
									</span>
								</button>
							</form>
						)}
					</div>

					{/* 2. Date, Time & Duration Section */}
					<div className="space-y-3 pt-1">
						<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
							<Clock size={14} className="text-[var(--teal)]" />
							<span>Время и длительность *</span>
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
								/>
							</div>
							<div>
								<span className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Окончание (+{durationMinutes}м)
								</span>
								<input
									type="datetime-local"
									value={endsAtLocal}
									onChange={(e) => {
										const newEndLocal = e.target.value;
										const sMs = Date.parse(fromLocal(startsAtLocal));
										const eMs = Date.parse(fromLocal(newEndLocal));
										if (eMs > sMs) {
											setDurationMinutes(Math.round((eMs - sMs) / 60_000));
										}
									}}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Fast Duration Chips */}
						<div data-testid="quick-booking-duration-presets">
							<span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
								Быстрый выбор длительности:
							</span>
							<div className="flex flex-wrap gap-2">
								{DURATION_PRESETS.map((preset) => {
									const isSelected = durationMinutes === preset.minutes;
									return (
										<button
											key={preset.minutes}
											type="button"
											onClick={() => setDurationMinutes(preset.minutes)}
											className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
												isSelected
													? "bg-[var(--teal-dark)] text-white shadow-sm ring-2 ring-[var(--teal)]"
													: "bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper)]"
											}`}
											data-testid={`duration-preset-${preset.minutes}`}
										>
											<span>{preset.label}</span>
											<span
												className={`text-[11px] font-normal ${
													isSelected ? "text-white/90" : "text-[var(--muted)]"
												}`}
											>
												({preset.serviceHint})
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* 3. Doctor, Assistant & Chair Selection */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Врач *
							</label>
							<select
								value={doctorUserId}
								onChange={(e) => setDoctorUserId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								required
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
							<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Кресло / Кабинет *
							</label>
							<select
								value={chairId}
								onChange={(e) => setChairId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								required
							>
								<option value="">-- Выберите кресло --</option>
								{chairs.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						{!isSoloDoctor && (
							<div className="sm:col-span-2">
								<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
									Ассистент (опционально)
								</label>
								<select
									value={assistantUserId}
									onChange={(e) => setAssistantUserId(e.target.value)}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								>
									<option value="">-- Без ассистента --</option>
									{assistants.map((a) => (
										<option key={a.id} value={a.id}>
											{a.fullName}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{/* 4. Reason & Comment */}
					<div className="space-y-3">
						<div>
							<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Повод обращения / Услуга
							</label>
							<input
								type="text"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Например: Осмотр, Кариес, Консультация"
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
							<div className="flex flex-wrap gap-2 mt-2">
								{COMMON_REASONS.map((r) => (
									<button
										key={r}
										type="button"
										onClick={() => {
											const cur = reason.trim();
											setReason(cur ? `${cur}, ${r.toLowerCase()}` : r);
										}}
										className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer"
									>
										+ {r}
									</button>
								))}
							</div>
						</div>

						<div>
							<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Комментарий для врача / регистратуры
							</label>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="Дополнительные пожелания или примечания…"
								rows={2}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>
					</div>

					{/* Submit Error banner if any */}
					{submitError && (
						<div
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold"
							role="alert"
						>
							⚠ {submitError}
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 pb-6 sm:pb-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
					<button
						type="button"
						onClick={handleRequestClose}
						disabled={isSubmitting}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
					>
						Отмена (Esc)
					</button>

					<button
						type="button"
						onClick={() => void handleSubmitBooking()}
						disabled={isSubmitting || !patientId || (!doctorUserId && doctors.length > 1 && !doctors[0]) || (!chairId && chairs.length === 0)}
						className={`flex-1 min-h-[44px] px-5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
							collision.hasCollision
								? "bg-amber-600 hover:bg-amber-700 text-white"
								: "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)]"
						}`}
					>
						<Plus size={16} />
						<span>
							{isSubmitting
								? "Сохраняю запись…"
								: collision.hasCollision
									? "Записать с овербукингом (острая боль)"
									: "Создать запись (Ctrl+Enter)"}
						</span>
					</button>
				</div>

				{/* Soft Dirty State Guard Confirmation Dialog */}
				{showDirtyConfirm && (
					<div
						className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
						role="alertdialog"
						aria-labelledby="dirty-confirm-title"
						aria-describedby="dirty-confirm-desc"
						data-testid="quick-booking-dirty-confirm-dialog"
					>
						<div
							className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-[var(--ink)]"
							style={{ backgroundColor: "var(--paper)" }}
						>
							<div className="flex items-start gap-3">
								<div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
									<AlertTriangle size={20} />
								</div>
								<div className="space-y-1">
									<h4 id="dirty-confirm-title" className="text-sm font-bold text-[var(--ink)] m-0">
										Сохранить черновик записи?
									</h4>
									<p id="dirty-confirm-desc" className="text-xs text-[var(--muted)] m-0 leading-relaxed">
										Вы изменили параметры записи. Сохранить черновик для последующего быстрого восстановления или сбросить?
									</p>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
								<button
									type="button"
									onClick={handleDiscardDraftAndClose}
									className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--line)] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
									data-testid="quick-booking-discard-draft-btn"
								>
									Сбросить
								</button>
								<button
									type="button"
									onClick={handleSaveDraftAndClose}
									className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[var(--teal-dark)] text-[var(--on-teal)] hover:brightness-110 active:brightness-95 transition-all shadow-xs cursor-pointer"
									data-testid="quick-booking-save-draft-btn"
								>
									Да, сохранить
								</button>
							</div>
						</div>
					</div>
				)}
				<SlotConflictModal
					isOpen={Boolean(slotConflict)}
					onClose={() => setSlotConflict(null)}
					conflictMessage={slotConflict?.message}
					suggestedSlots={slotConflict?.suggestedSlots ?? []}
					patientName={selectedPatient?.fullName}
					doctorName={doctors.find((d) => d.id === doctorUserId)?.fullName}
					onSelectSlot={(slotTime) => {
						if (startsAtLocal) {
							const datePrefix = startsAtLocal.slice(0, 11);
							const newStart = `${datePrefix}${slotTime}`;
							setStartsAtLocal(newStart);
							showToast(`Время изменено на ${slotTime}. Нажмите «Записать на прием» для подтверждения.`, "success");
						}
						setSlotConflict(null);
					}}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(drawerElement, document.body) : drawerElement;
}
