import type { Appointment, Dashboard, DentalSpecialty, Patient } from "@dental/shared";
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
	Flame,
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
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import {
	normalizePhoneToNational,
} from "../../utils/patientSearchUtils";
import {
	searchPatientsQuick,
} from "./patientSearchEngine";
import {
	APPOINTMENT_TYPE_PRESETS,
	DURATION_PRESETS,
	calculatePatientReliability,
	type PatientReliabilityAssessment,
	type QuickBookingAppointmentType,
} from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { specialtyLabels } from "../../workspaceUiLabels";
import { SlotConflictModal } from "./SlotConflictModal";
import {
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
	type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";

export interface QuickBookingSlotInfo {
	dateKey?: string | undefined;
	startTime?: string | undefined;
	startsAt?: string | undefined;
	endsAt?: string | undefined;
	doctorUserId?: string | null | undefined;
	doctorName?: string | null | undefined;
	chairId?: string | null | undefined;
	durationMinutes?: number | undefined;
	reason?: string | undefined;
	isCitoEmergency?: boolean | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
}

export function resolveChairDutyDoctor(
	chairId: string | null | undefined,
	startsAtIsoOrLocal: string | null | undefined,
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
	dateKeyFallback?: string | undefined,
	initialSlotDoctorId?: string | null | undefined,
	defaultDoctorIdFallback?: string | null | undefined,
): { doctorId: string | null; shiftHours: string } {
	if (!chairId) {
		return { doctorId: initialSlotDoctorId || defaultDoctorIdFallback || null, shiftHours: "08:00–20:00" };
	}

	// 1. Check passed chairDoctorAssignments
	let assignment = chairDoctorAssignments?.[chairId];

	// 2. Fallback to in-memory safeLocalStorage
	const targetDateKey =
		startsAtIsoOrLocal && startsAtIsoOrLocal.length >= 10
			? startsAtIsoOrLocal.slice(0, 10)
			: (dateKeyFallback || "");
	if (!assignment && targetDateKey) {
		const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(
			`dente_chair_doctor_assignments_${targetDateKey}`,
			null,
		);
		if (parsed?.[chairId]) {
			assignment = parsed[chairId];
		}
	}

	if (assignment) {
		let hourNum = NaN;
		if (startsAtIsoOrLocal) {
			if (startsAtIsoOrLocal.length >= 13) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(11, 13), 10);
			} else if (/^\d{2}:\d{2}/.test(startsAtIsoOrLocal)) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(0, 2), 10);
			}
		}

		// 1. Two-shift chair handling: morning (< 14:00) vs evening (>= 14:00)
		if (
			(assignment.subShifts && assignment.subShifts.length > 1) ||
			assignment.shiftPreset === "two_shifts"
		) {
			const mornSub = assignment.subShifts?.[0] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 8,
				endHour: 14,
				shiftHours: "08:00–14:00",
			};
			const eveSub = assignment.subShifts?.[1] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 14,
				endHour: 20,
				shiftHours: "14:00–20:00",
			};

			const mornStart = mornSub.startHour ?? 8;
			const eveEnd = eveSub.endHour ?? 20;

			if (!Number.isNaN(hourNum)) {
				if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
					return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
				}
				if (hourNum < 14) {
					return {
						doctorId: mornSub.doctorId || assignment.doctorId || null,
						shiftHours: mornSub.shiftHours || "08:00–14:00",
					};
				}
				return {
					doctorId: eveSub.doctorId || mornSub.doctorId || assignment.doctorId || null,
					shiftHours: eveSub.shiftHours || "14:00–20:00",
				};
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 2. Custom sub-shifts array
		if (assignment.subShifts && assignment.subShifts.length > 0) {
			if (!Number.isNaN(hourNum)) {
				const matchingSub = assignment.subShifts.find(
					(s) =>
						hourNum >= s.startHour &&
						(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= 20)),
				);
				if (matchingSub) {
					return {
						doctorId: matchingSub.doctorId,
						shiftHours:
							matchingSub.shiftHours ||
							`${String(matchingSub.startHour).padStart(2, "0")}:00–${String(matchingSub.endHour).padStart(2, "0")}:00`,
					};
				}
				return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 3. Preset bounds: morning only vs evening only
		if (assignment.shiftPreset === "morning") {
			if (!Number.isNaN(hourNum) && hourNum >= 14) {
				return { doctorId: null, shiftHours: "08:00–14:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "08:00–14:00" };
		}
		if (assignment.shiftPreset === "evening") {
			if (!Number.isNaN(hourNum) && (hourNum < 14 || hourNum > 20)) {
				return { doctorId: null, shiftHours: "14:00–20:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "14:00–20:00" };
		}

		// 4. Start/End hour limits
		const sHour = assignment.startHour ?? 8;
		const eHour = assignment.endHour ?? 20;
		if (!Number.isNaN(hourNum)) {
			if (hourNum >= sHour && (hourNum < eHour || (eHour >= 20 && hourNum <= 20))) {
				return {
					doctorId: assignment.doctorId,
					shiftHours:
						assignment.shiftHours ||
						`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
				};
			}
			return {
				doctorId: null,
				shiftHours:
					assignment.shiftHours ||
					`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
			};
		}

		return {
			doctorId: assignment.doctorId,
			shiftHours: assignment.shiftHours || "08:00–20:00",
		};
	}

	// 3. Fallback: if slot was explicitly booked for this chair with a doctor
	if (initialSlotDoctorId) {
		return { doctorId: initialSlotDoctorId, shiftHours: "08:00–20:00" };
	}

	// 4. Fallback: explicit defaultDoctorIdFallback (e.g. from chair.defaultDoctorId or solo doctor)
	if (defaultDoctorIdFallback) {
		return { doctorId: defaultDoctorIdFallback, shiftHours: "08:00–20:00" };
	}

	// 5. Fallback: check stored default doctor for chair in localStorage
	if (chairId && hasStorage) {
		try {
			const storedChairDef = JSON.parse(
				hasStorage.getItem("dente_chair_default_doctors") || "{}",
			);
			if (storedChairDef?.[chairId]) {
				return { doctorId: storedChairDef[chairId], shiftHours: "08:00–20:00" };
			}
		} catch {}
	}

	return { doctorId: null, shiftHours: "08:00–20:00" };
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
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
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
		chairDoctorAssignments,
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
			if (!local) return new Date().toISOString();
			const withZ = local.includes("Z") ? local : `${local}:00.000Z`;
			const parsed = new Date(withZ);
			if (Number.isNaN(parsed.getTime())) {
				const fallback = new Date(local);
				return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
			}
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

	// Pre-resolved initial patient from slot info
	const initialMatchedPatient = useMemo(() => {
		if (initialSlot?.patientId && dashboard?.patients) {
			return dashboard.patients.find((p) => p.id === initialSlot.patientId) || null;
		}
		if (initialSlot?.patientName && dashboard?.patients) {
			const candidate = initialSlot.patientName.trim().toLowerCase();
			return (
				dashboard.patients.find(
					(p) => p.status === "active" && p.fullName.toLowerCase() === candidate,
				) || null
			);
		}
		return null;
	}, [initialSlot?.patientId, initialSlot?.patientName, dashboard?.patients]);

	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
		() => initialMatchedPatient,
	);
	const [patientId, setPatientId] = useState<string>(
		() => initialSlot?.patientId || initialMatchedPatient?.id || "",
	);
	const initialDoctorId = useMemo(() => {
		if (initialSlot?.doctorUserId) return initialSlot.doctorUserId;
		if (initialSlot?.doctorName && dashboard?.clinicSettings?.staff) {
			const cand = initialSlot.doctorName.trim().toLowerCase();
			const matched = dashboard.clinicSettings.staff.find(
				(m) =>
					m.active &&
					(m.role === "doctor" || m.role === "owner") &&
					(m.fullName?.toLowerCase() === cand ||
						m.fullName?.toLowerCase().includes(cand) ||
						cand.includes(m.fullName?.toLowerCase())),
			);
			if (matched) return matched.id;
		}
		const targetChairId =
			initialSlot?.chairId ||
			(dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active)[0]?.id ||
			DEFAULT_SOLO_CHAIR.id;
		if (targetChairId) {
			const targetTime =
				initialSlot?.startsAt ||
				(initialSlot?.dateKey && initialSlot?.startTime
					? `${initialSlot.dateKey}T${initialSlot.startTime}`
					: undefined);
			const chs = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
			const targetChairObj = chs.find((c) => c.id === targetChairId);
			const st = dashboard?.clinicSettings?.staff ?? [];
			const docs = st.filter((m) => m.active && (m.role === "doctor" || m.role === "owner"));
			const duty = resolveChairDutyDoctor(
				targetChairId,
				targetTime,
				chairDoctorAssignments,
				initialSlot?.dateKey,
				null,
				(targetChairObj as any)?.defaultDoctorId || (docs.length === 1 && docs[0] ? docs[0].id : null),
			);
			if (duty.doctorId) {
				return duty.doctorId;
			}
		}
		const st = dashboard?.clinicSettings?.staff ?? [];
		const docs = st.filter((m) => m.active && (m.role === "doctor" || m.role === "owner"));
		const chs = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		const isSolo =
			dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
			dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
			(docs.length <= 1 && chs.length <= 1) ||
			docs.length === 1;
		if (isSolo && docs[0]) {
			return docs[0].id;
		}
		if (docs.length === 1 && docs[0]) {
			return docs[0].id;
		}
		return "";
	}, [initialSlot, chairDoctorAssignments, dashboard]);

	const initialChairId = useMemo(() => {
		if (initialSlot?.chairId) return initialSlot.chairId;
		const chs = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		if (chs.length === 1 && chs[0]) return chs[0].id;
		if (chs.length === 0) return DEFAULT_SOLO_CHAIR.id;
		return "";
	}, [initialSlot?.chairId, dashboard]);

	const [doctorUserId, setDoctorUserId] = useState<string>(() => initialDoctorId);
	const [assistantUserId, setAssistantUserId] = useState<string>("");
	const [chairId, setChairId] = useState<string>(() => initialChairId);
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
	const [searchQuery, setSearchQuery] = useState<string>(() => {
		if (initialMatchedPatient) return initialMatchedPatient.fullName;
		if (initialSlot?.patientName) return initialSlot.patientName;
		return "";
	});
	const [isTypeaheadOpen, setIsTypeaheadOpen] = useState<boolean>(false);
	const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const newPatientFullNameInputRef = useRef<HTMLInputElement>(null);
	const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (focusTimerRef.current) {
				clearTimeout(focusTimerRef.current);
				focusTimerRef.current = null;
			}
		};
	}, []);

	// Inline new patient creation
	const [showInlineNewPatient, setShowInlineNewPatient] = useState<boolean>(() => {
		if (!initialSlot?.patientId && (initialSlot?.patientName || initialSlot?.patientPhone) && !initialMatchedPatient) {
			return true;
		}
		return false;
	});
	const [newPatientFullName, setNewPatientFullName] = useState<string>(() => {
		if (!initialSlot?.patientId && initialSlot?.patientName && !initialMatchedPatient) {
			return initialSlot.patientName;
		}
		return "";
	});
	const [newPatientPhone, setNewPatientPhone] = useState<string>(() => {
		if (!initialSlot?.patientId && initialSlot?.patientPhone && !initialMatchedPatient) {
			return initialSlot.patientPhone;
		}
		return "";
	});
	const [newPatientBirthDate, setNewPatientBirthDate] = useState<string>("");
	const [isCreatingPatient, setIsCreatingPatient] = useState<boolean>(false);

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
	const isSoloDoctor =
		dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
		dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
		(doctors.length <= 1 && chairs.length <= 1) ||
		doctors.length === 1;
	const patients = useMemo(() => dashboard?.patients ?? [], [dashboard?.patients]);

	// Patient Discipline & Reliability assessment memo
	const patientReliability: PatientReliabilityAssessment | null = useMemo(() => {
		if (!selectedPatient) return null;
		return calculatePatientReliability(selectedPatient, dashboard?.appointments);
	}, [selectedPatient, dashboard?.appointments]);

	const hasActivePatientVisit = Boolean(
		selectedPatient && (
			(dashboard?.activeVisit && dashboard.activeVisit.patientId === selectedPatient.id) ||
			(dashboard?.appointments ?? []).some(
				(a) => a.patientId === selectedPatient.id && a.status === "in_treatment",
			)
		),
	);

	const currentChair = useMemo(() => {
		return chairs.find((c) => c.id === chairId) || (chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
	}, [chairs, chairId]);

	const dutyDoctorInfo = useMemo(() => {
		const chairObj = currentChair || chairs.find((c) => c.id === chairId);
		return resolveChairDutyDoctor(
			chairId,
			startsAtLocal,
			chairDoctorAssignments,
			initialSlot?.dateKey || (startsAtLocal ? startsAtLocal.slice(0, 10) : undefined),
			initialSlot?.chairId === chairId ? initialSlot?.doctorUserId : null,
			(chairObj as any)?.defaultDoctorId || (isSoloDoctor && doctors[0] ? doctors[0].id : null),
		);
	}, [chairId, startsAtLocal, chairDoctorAssignments, initialSlot, currentChair, chairs, isSoloDoctor, doctors]);

	const dutyDoctorId = dutyDoctorInfo.doctorId;
	const dutyDocHours = dutyDoctorInfo.shiftHours;

	const dutyDoc = useMemo(() => {
		if (!dutyDoctorId) return null;
		return doctors.find((d) => d.id === dutyDoctorId) || null;
	}, [dutyDoctorId, doctors]);

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

		// Chair prefill
		let defaultChairId =
			initialSlot?.chairId ||
			(chairs.length === 1 ? chairs[0]?.id : "") ||
			"";
		if (!defaultChairId && initialSlot?.doctorUserId) {
			const assignedChair = chairs.find((c) => {
				const duty = resolveChairDutyDoctor(
					c.id,
					toLocal(initialStartIso),
					chairDoctorAssignments,
					initialSlot?.dateKey,
				);
				return duty.doctorId === initialSlot.doctorUserId;
			});
			if (assignedChair) {
				defaultChairId = assignedChair.id;
			} else {
				const doc = doctors.find((d) => d.id === initialSlot.doctorUserId);
				if (doc?.specialties?.length) {
					const matchingChair = chairs.find(
						(c) => c.specialization && doc.specialties.includes(c.specialization),
					);
					if (matchingChair) {
						defaultChairId = matchingChair.id;
					}
				}
			}
		}
		if (!defaultChairId && chairs.length > 0) {
			defaultChairId = chairs[0]?.id || "";
		}
		if (!defaultChairId) {
			defaultChairId = DEFAULT_SOLO_CHAIR.id;
		}
		setChairId(defaultChairId);

		// Doctor prefill: prefer initialSlot (id or name), else chair duty doctor, else solo/first doctor
		let slotDocByName: string | undefined;
		if (!initialSlot?.doctorUserId && initialSlot?.doctorName) {
			const cand = initialSlot.doctorName.trim().toLowerCase();
			const m = doctors.find(
				(d) =>
					d.fullName.toLowerCase() === cand ||
					d.fullName.toLowerCase().includes(cand) ||
					cand.includes(d.fullName.toLowerCase()),
			);
			if (m) slotDocByName = m.id;
		}

		const chairDutyDocId = defaultChairId
			? resolveChairDutyDoctor(
					defaultChairId,
					toLocal(initialStartIso),
					chairDoctorAssignments,
					initialSlot?.dateKey,
				).doctorId
			: null;
		const defaultDocId =
			initialSlot?.doctorUserId ||
			slotDocByName ||
			chairDutyDocId ||
			(isSoloDoctor && doctors[0] ? doctors[0].id : "") ||
			(doctors.length === 1 ? doctors[0]?.id : "") ||
			doctors[0]?.id ||
			"";
		setDoctorUserId(defaultDocId);

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
			setShowInlineNewPatient(false);
			setNewPatientFullName("");
			setNewPatientPhone("");
		} else if (initialSlot?.patientName || initialSlot?.patientPhone) {
			const candidateName = initialSlot?.patientName?.trim() || "";
			const candidatePhone = initialSlot?.patientPhone?.trim() || "";
			const found = (dashboard?.patients ?? []).find(
				(p) =>
					p.status === "active" &&
					((candidateName && p.fullName.toLowerCase() === candidateName.toLowerCase()) ||
						(candidatePhone && p.phone && normalizePhoneToNational(p.phone) === normalizePhoneToNational(candidatePhone))),
			);
			if (found) {
				setPatientId(found.id);
				setSelectedPatient(found);
				setSearchQuery(found.fullName);
				setShowInlineNewPatient(false);
				setNewPatientFullName("");
				setNewPatientPhone("");
			} else {
				setPatientId("");
				setSelectedPatient(null);
				setSearchQuery(candidateName || (candidatePhone ? `Пациент (${candidatePhone})` : ""));
				setShowInlineNewPatient(true);
				setNewPatientFullName(candidateName);
				setNewPatientPhone(candidatePhone);
			}
		} else {
			setPatientId("");
			setSelectedPatient(null);
			setSearchQuery("");
			setShowInlineNewPatient(false);
			setNewPatientFullName("");
			setNewPatientPhone("");
		}

		setIsTypeaheadOpen(false);
		setNewPatientBirthDate("");

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
				const saved = safeLocalStorageGetJson<Record<string, any> | null>("dente_quick_booking_draft", null);
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
			}
		}

		setSubmitError(null);
		setIsSubmitting(false);

		// Focus search input next frame
		if (focusTimerRef.current) {
			clearTimeout(focusTimerRef.current);
		}
		focusTimerRef.current = setTimeout(() => {
			searchInputRef.current?.focus();
			focusTimerRef.current = null;
		}, 100);

		return () => {
			if (focusTimerRef.current) {
				clearTimeout(focusTimerRef.current);
				focusTimerRef.current = null;
			}
		};
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
		const fullName =
			newPatientFullName.trim() ||
			(newPatientPhone.trim() ? `Пациент (${newPatientPhone.trim()})` : "") ||
			(isEmergencyMode ? "Пациент с острой болью (CITO)" : "");
		if (!fullName) {
			showToast("Укажите имя или телефон пациента для создания карты", "warning");
			if (newPatientFullNameInputRef.current) {
				newPatientFullNameInputRef.current.focus();
			} else {
				searchInputRef.current?.focus();
			}
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
				if (res.status === 409) {
					const dupData = (await res.json().catch(() => null)) as {
						existingPatientId?: string;
						existingPatient?: { id: string; fullName: string };
					} | null;
					if (dupData?.existingPatientId) {
						const match = (dashboard?.patients ?? []).find((p) => p.id === dupData.existingPatientId);
						if (match) {
							selectPatient(match);
							showToast(`Найден существующий пациент «${match.fullName}», выбран для записи`, "info", 4000);
							return;
						}
					}
					showToast("Пациент с похожими данными уже зарегистрирован в клинике", "warning", 4000);
					return;
				}
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

	const handleSubmitBooking = async (
		e?: React.FormEvent,
		options?: { overbookOverride?: boolean },
	) => {
		if (e) e.preventDefault();
		if (isSubmitting) return;

		let activePatientId = patientId;

		// 10-секундный CITO-прием: авто-создание пациента на лету без блокировок
		if (!activePatientId) {
			const candidateName =
				newPatientFullName.trim() ||
				searchQuery.trim() ||
				(newPatientPhone.trim() ? `Пациент (${newPatientPhone.trim()})` : "") ||
				(isEmergencyMode ? "Пациент с острой болью (CITO)" : "");

			if (candidateName) {
				try {
					const headers =
						typeof auth?.denteClinicalMutationHeaders === "function"
							? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
							: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

					const res = await fetchWithHandling("/api/patients", {
						method: "POST",
						headers,
						body: JSON.stringify({
							fullName: candidateName,
							phone: newPatientPhone.trim() || null,
							birthDate: newPatientBirthDate.trim() || null,
						}),
					});

					if (res.ok) {
						const created = (await res.json()) as Patient;
						if (created?.id) {
							activePatientId = created.id;
							setPatientId(created.id);
							setSelectedPatient(created);
							if (typeof setDashboard === "function" && dashboard) {
								setDashboard({
									...dashboard,
									patients: [
										created,
										...(dashboard.patients ?? []).filter((p) => p.id !== created.id),
									],
								});
							}
						}
					} else if (res.status === 409) {
						const dupData = (await res.json().catch(() => null)) as {
							existingPatientId?: string;
							existingPatient?: { id: string; fullName: string };
						} | null;
						if (dupData?.existingPatientId) {
							activePatientId = dupData.existingPatientId;
							setPatientId(dupData.existingPatientId);
							const match = (dashboard?.patients ?? []).find(
								(p) => p.id === dupData.existingPatientId,
							);
							if (match) {
								setSelectedPatient(match);
							}
							showToast(
								`Найден существующий пациент «${dupData.existingPatient?.fullName || candidateName}», выбран для записи`,
								"info",
								4000,
							);
						}
					}
				} catch (err) {
					logger.error("Auto patient creation failed in quick booking", err);
				}
			}
		}

		if (!activePatientId) {
			setSubmitError("Укажите имя пациента или нажмите «+ Экспресс-пациент CITO»");
			showToast("Укажите имя пациента для записи", "error");
			searchInputRef.current?.focus();
			return;
		}

		const effectiveDoctorId =
			doctorUserId ||
			initialSlot?.doctorUserId ||
			(isSoloDoctor && doctors[0] ? doctors[0].id : "") ||
			(doctors.length === 1 ? doctors[0]?.id : "") ||
			doctors[0]?.id ||
			(isSoloDoctor ? "doctor-solo" : "");
		let effectiveChairId =
			chairId ||
			(chairs.length === 1 ? chairs[0]?.id : "") ||
			"";
		if (!effectiveChairId && effectiveDoctorId) {
			const doc = doctors.find((d) => d.id === effectiveDoctorId);
			if (doc?.specialties?.length) {
				const matchingChair = chairs.find(
					(c) => c.specialization && doc.specialties.includes(c.specialization),
				);
				if (matchingChair) {
					effectiveChairId = matchingChair.id;
				}
			}
		}
		if (!effectiveChairId && chairs.length > 0) {
			effectiveChairId = chairs[0]?.id || "";
		}
		if (!effectiveChairId) {
			effectiveChairId = DEFAULT_SOLO_CHAIR.id;
		}

		if (!effectiveDoctorId) {
			setSubmitError("В клинике нет доступных врачей");
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

		const isOverbook =
			Boolean(options?.overbookOverride) ||
			collision.hasCollision ||
			isEmergencyMode ||
			reason.toLowerCase().includes("cito") ||
			reason.toLowerCase().includes("острая") ||
			comment.toLowerCase().includes("cito") ||
			comment.toLowerCase().includes("острая");

		try {
			const mutationHeaders =
				typeof auth?.scheduleMutationHeaders === "function"
					? auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });

			const payload = {
				patientId: activePatientId,
				doctorUserId: effectiveDoctorId,
				assistantUserId: assistantUserId || null,
				chairId: effectiveChairId,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
				status,
				reason: reason.trim() || (isEmergencyMode ? "CITO! Острая боль" : null),
				comment:
					comment.trim() ||
					(isEmergencyMode ? "Экстренный прием по острой боли (ст. 124 УК РФ)" : null),
				allowOverbooking: isOverbook,
				allowEmergencyOverride: isOverbook,
				urgency: isOverbook ? "urgent" : "routine",
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

			const patientName =
				selectedPatient?.fullName ||
				newPatientFullName.trim() ||
				searchQuery.trim() ||
				(newPatientPhone.trim() ? `Пациент (${newPatientPhone.trim()})` : "Пациент");
			const timeLabel = startsAtLocal.slice(11, 16);
			showToast(`Запись для «${patientName}» создана на ${timeLabel}!`, "success", 5000);

			if (typeof onAppointmentCreated === "function" && nextDashboard?.appointments) {
				const created = nextDashboard.appointments.find(
					(a) =>
						(a.patientId === activePatientId || a.patientId === patientId) &&
						a.startsAt === startsAtIso,
				);
				if (created) onAppointmentCreated(created);
			}

			// Clear saved draft on successful booking creation
			safeLocalStorageRemoveItem("dente_quick_booking_draft");

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

	// 1-клик копирование подтверждения записи для пациента (WhatsApp / Telegram / SMS)
	const handleCopyBookingConfirmation = async () => {
		const candidateName =
			newPatientFullName.trim() ||
			searchQuery.trim() ||
			(newPatientPhone.trim() ? `Пациент (${newPatientPhone.trim()})` : "") ||
			(isEmergencyMode ? "Пациент с острой болью (CITO)" : "");

		const patientName =
			selectedPatient?.fullName ||
			candidateName ||
			"Пациент";

		let formattedDate = "";
		let formattedTime = "";
		if (startsAtLocal) {
			const [dPart, tPart] = startsAtLocal.split("T");
			if (dPart) {
				const parts = dPart.split("-");
				if (parts.length === 3) {
					formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
				} else {
					formattedDate = dPart;
				}
			}
			if (tPart) {
				formattedTime = tPart.slice(0, 5);
			}
		}
		if (!formattedDate) {
			try {
				formattedDate = new Date().toLocaleDateString("ru-RU");
			} catch {
				formattedDate = "01.01.2026";
			}
		}
		if (!formattedTime) {
			formattedTime = "10:00";
		}

		const clinicName =
			dashboard?.clinicSettings?.profile?.clinicName ||
			dashboard?.clinicSettings?.profile?.legalName ||
			"ДЕНТЕ";
		const clinicAddress =
			dashboard?.clinicSettings?.profile?.address || "г. Москва";
		const clinicPhone =
			dashboard?.clinicSettings?.profile?.phone || "";

		const selectedDoc = doctors.find((d) => d.id === doctorUserId) || dutyDoc;
		const doctorName = selectedDoc?.fullName || "Врач клиники";

		const selectedChair = chairs.find((c) => c.id === chairId) || currentChair;
		const chairName = selectedChair?.name || "Основное кресло";

		const text = [
			`Запись на приём в клинику «${clinicName}»:`,
			`Пациент: ${patientName}`,
			`Дата и время: ${formattedDate}, ${formattedTime} (${durationMinutes} мин)`,
			`Врач: ${doctorName}`,
			`Кабинет / кресло: ${chairName}`,
			`Адрес клиники: ${clinicAddress}`,
			...(clinicPhone ? [`Телефон для справок: ${clinicPhone}`] : []),
			"Пожалуйста, приходите за 10 минут до начала приёма.",
		].join("\n");

		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			}
		} catch (err) {
			logger.warn("Clipboard writeText failed or not permitted", err);
		}

		showToast("Детали записи скопированы в буфер обмена для отправки пациенту", "success");
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
			safeLocalStorageSetJson("dente_quick_booking_draft", draftData);
			showToast("Черновик записи сохранен", "info");
		} catch {}
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
		safeLocalStorageRemoveItem("dente_quick_booking_draft");
		onClose();
	}, [onClose]);

	// Soft close request with seamless draft auto-persistence (Mandate 8e & Anti-Matryoshka, depth strictly 1)
	const handleRequestClose = useCallback(() => {
		if (isDirty) {
			handleSaveDraftAndClose();
		} else {
			onClose();
		}
	}, [isDirty, handleSaveDraftAndClose, onClose]);

	// Keyboard handler for drawer (Escape to close, Ctrl+Enter to submit)
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			handleRequestClose();
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
							<span>{collision.message}. Разрешена экстренная запись (острая боль / овербукинг).</span>
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
								<div className="flex items-center gap-2 flex-wrap">
									<button
										type="button"
										onClick={() => {
											setAppointmentType("emergency");
											setReason("CITO! Острая боль");
											setComment("Экстренный прием по острой боли (CITO / ст. 124 УК РФ)");
											setDurationMinutes(30);
											setShowInlineNewPatient(true);
											setNewPatientFullName("Пациент с острой болью (CITO)");
											setNewPatientPhone("");
										}}
										className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
										title="Создать временную карту для пациента с острой болью за 1 клик"
										data-testid="quick-booking-cito-express-btn"
									>
										<Flame size={14} />
										<span>+ Экспресс-пациент CITO</span>
									</button>
									<button
										type="button"
										onClick={() => {
											const candidateForPrint =
												selectedPatient ||
												(newPatientFullName.trim()
													? {
															fullName: newPatientFullName.trim(),
															phone: newPatientPhone.trim() || undefined,
															birthDate: newPatientBirthDate.trim() || undefined,
														}
													: searchQuery.trim()
														? { fullName: searchQuery.trim() }
														: null);
											void printBlankMedicalContract(
												candidateForPrint,
												{
													doctorName: doctors.find((d) => d.id === doctorUserId)?.fullName,
													clinicName: dashboard?.clinicSettings?.profile?.legalName,
												},
											);
										}}
										className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-amber-500/10 rounded-xl cursor-pointer transition-colors"
										title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
										data-testid="quick-booking-print-blank-contract-btn"
									>
										<FileText size={14} className="text-amber-600" />
										<span>Бланк договора (_______)</span>
									</button>
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
										className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-[var(--teal)]/10 rounded-xl cursor-pointer transition-colors"
										data-testid="quick-booking-new-patient-toggle"
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
											if (focusTimerRef.current) {
												clearTimeout(focusTimerRef.current);
											}
											focusTimerRef.current = setTimeout(() => {
												searchInputRef.current?.focus();
												focusTimerRef.current = null;
											}, 50);
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
												{patientReliability.reliabilityBadge.status === "reliable" && (
													<ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-300 shrink-0" />
												)}
												{patientReliability.reliabilityBadge.status === "new" && (
													<Sparkles size={14} className="text-sky-700 dark:text-sky-300 shrink-0" />
												)}
												{patientReliability.reliabilityBadge.status === "high_risk" && (
													<AlertTriangle size={14} className="text-rose-700 dark:text-rose-300 shrink-0" />
												)}
												{patientReliability.reliabilityBadge.status === "attention" && (
													<AlertTriangle size={14} className="text-amber-700 dark:text-amber-300 shrink-0" />
												)}
												<span>{patientReliability.reliabilityBadge.badgeText}</span>
											</div>

											{/* Financial Badge */}
											<div
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${patientReliability.financialBadge.badgeClass}`}
												data-testid="patient-financial-badge"
												title={`Баланс пациента: ${patientReliability.financialBadge.label}`}
											>
												<CreditCard size={14} className="shrink-0 opacity-80" />
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
														Требуется подтверждение за 2 часа!
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
														Зона внимания регистратуры
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

										{/* Active Visit Informative Badge (Mandate 8e Doctor Autonomy) */}
										{hasActivePatientVisit && (
											<div
												className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs flex items-start gap-2"
												data-testid="quick-booking-active-visit-warning"
											>
												<AlertCircle
													size={15}
													className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
												/>
												<div className="space-y-0.5">
													<p className="m-0 font-bold">
														По пациенту сейчас идет активный приём в кресле
													</p>
													<p className="m-0 font-normal text-[11px] text-[var(--muted)]">
														(Запись на следующий приём не блокируется, врач или администратор может сразу забронировать слот)
													</p>
												</div>
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
																className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${itemReliability.reliabilityBadge.badgeClass}`}
																title={itemReliability.reliabilityBadge.summary}
															>
																{itemReliability.reliabilityBadge.status === "reliable" && (
																	<ShieldCheck size={11} className="text-emerald-700 dark:text-emerald-300 shrink-0" />
																)}
																{itemReliability.reliabilityBadge.status === "new" && (
																	<Sparkles size={11} className="text-sky-700 dark:text-sky-300 shrink-0" />
																)}
																{itemReliability.reliabilityBadge.status === "high_risk" && (
																	<AlertTriangle size={11} className="text-rose-700 dark:text-rose-300 shrink-0" />
																)}
																{itemReliability.reliabilityBadge.status === "attention" && (
																	<AlertTriangle size={11} className="text-amber-700 dark:text-amber-300 shrink-0" />
																)}
																<span>{itemReliability.reliabilityBadge.shortLabel}</span>
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
													className="block mx-auto mt-2 text-xs font-bold text-[var(--teal)] hover:underline min-h-[44px] px-3 py-2 rounded-lg cursor-pointer"
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
										className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] px-3 py-2 rounded-lg hover:bg-[var(--paper)] transition-colors cursor-pointer flex items-center justify-center"
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
													className="w-full min-h-[44px] text-left p-2 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-2 cursor-pointer"
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
											ФИО пациента
										</label>
										<input
											ref={newPatientFullNameInputRef}
											type="text"
											data-testid="quick-booking-new-patient-name-input"
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
												data-testid="quick-booking-new-patient-phone-input"
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
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => {
											void printBlankMedicalContract(
												newPatientFullName.trim()
													? {
															fullName: newPatientFullName.trim(),
															phone: newPatientPhone.trim() || undefined,
															birthDate: newPatientBirthDate.trim() || undefined,
														}
													: null,
												{
													doctorName: doctors.find((d) => d.id === doctorUserId)?.fullName,
													clinicName: dashboard?.clinicSettings?.profile?.legalName,
												},
											);
										}}
										className="flex-1 min-h-[44px] py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
										data-testid="quick-booking-inline-print-contract-btn"
										title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
									>
										<FileText size={14} className="text-amber-600" />
										<span>Печать договора (_______)</span>
									</button>
									<button
										type="submit"
										disabled={isCreatingPatient}
										data-testid="quick-booking-create-inline-patient-btn"
										className="flex-1 min-h-[44px] py-2 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
									>
										<Check size={14} />
										<span>
											{isCreatingPatient ? "Создаю пациента…" : "Создать и выбрать"}
										</span>
									</button>
								</div>
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
											if (newDuty.doctorId && (!doctorUserId || doctorUserId === dutyDoctorId)) {
												setDoctorUserId(newDuty.doctorId);
											}
										}
									}}
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
								onChange={(e) => {
									const newDocId = e.target.value;
									setDoctorUserId(newDocId);
									if (newDocId && !initialSlot?.chairId) {
										let targetChairId: string | null = null;
										const doc =
											doctors.find((d) => d.id === newDocId) ||
											dashboard?.clinicSettings?.staff?.find((s) => s.id === newDocId);

										// 1. Doctor's preferred chair
										if ((doc as any)?.preferredChairId) {
											const pref = chairs.find((c) => c.id === (doc as any).preferredChairId);
											if (pref) targetChairId = pref.id;
										}
										if (!targetChairId && typeof window !== "undefined") {
											const storedPref = safeLocalStorageGetJson<Record<string, string>>(
												"dente_doctor_preferred_chairs",
												{},
											);
											if (storedPref[newDocId]) {
												const pref = chairs.find((c) => c.id === storedPref[newDocId]);
												if (pref) targetChairId = pref.id;
											}
										}

										// 2. Chair default doctor
										if (!targetChairId) {
											const def = chairs.find((c) => (c as any).defaultDoctorId === newDocId);
											if (def) targetChairId = def.id;
										}
										if (!targetChairId && typeof window !== "undefined") {
											const storedChairDef = safeLocalStorageGetJson<Record<string, string>>(
												"dente_chair_default_doctors",
												{},
											);
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

										// 3. Auto-switch to chair where this doctor is on duty at scheduled time
										if (!targetChairId) {
											const assignedChair = chairs.find((c) => {
												const duty = resolveChairDutyDoctor(
													c.id,
													startsAtLocal,
													chairDoctorAssignments,
													startsAtLocal ? startsAtLocal.split("T")[0] : undefined,
												);
												return duty.doctorId === newDocId;
											});
											if (assignedChair) targetChairId = assignedChair.id;
										}

										// 4. Fallback to matching specialization chair
										if (!targetChairId && doc?.specialties?.length) {
											const matchingChair = chairs.find(
												(c) => c.specialization && doc.specialties.includes(c.specialization),
											);
											if (matchingChair) targetChairId = matchingChair.id;
										}

										if (targetChairId) {
											setChairId(targetChairId);
										}
									}
								}}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								required
								data-testid="select-booking-doctor"
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
							{dutyDoc && (
								<div
									className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20"
									data-testid="duty-doctor-badge"
								>
									<UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
									<span>
										Дежурный врач: {formatDoctorShortName(dutyDoc.fullName)} ({dutyDocHours})
									</span>
								</div>
							)}
							{dutyDoc &&
								doctorUserId &&
								dutyDoctorId &&
								doctorUserId !== dutyDoctorId && (
									<div
										className="mt-1.5 p-2.5 rounded-xl text-xs bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/30 flex items-start gap-2"
										data-testid="duty-doctor-override-note"
									>
										<AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
										<div className="space-y-0.5">
											<span className="font-semibold block">
												На кресле «{currentChair?.name || "Кресло"}» дежурит {formatDoctorShortName(dutyDoc.fullName)}. Запись создается с подтверждением.
											</span>
											<span className="text-[11px] text-[var(--muted)]">
												(Мандат 8e: запись не блокируется, врач может принять пациента в свободном кабинете)
											</span>
										</div>
									</div>
								)}
						</div>

						<div>
							<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Кресло / Кабинет *
							</label>
							<select
								value={chairId}
								onChange={(e) => {
									const newChairId = e.target.value;
									setChairId(newChairId);
									if (newChairId) {
										const newChair =
											chairs.find((c) => c.id === newChairId) ||
											(newChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
										const newDuty = resolveChairDutyDoctor(
											newChairId,
											startsAtLocal,
											chairDoctorAssignments,
											initialSlot?.dateKey || (startsAtLocal ? startsAtLocal.slice(0, 10) : undefined),
											null,
											(newChair as any)?.defaultDoctorId || (isSoloDoctor && doctors[0] ? doctors[0].id : null),
										);
										if (newDuty.doctorId) {
											setDoctorUserId(newDuty.doctorId);
											const newDoc = doctors.find((d) => d.id === newDuty.doctorId);
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
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
								required
								data-testid="select-booking-chair"
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

						{!isSoloDoctor && assistants.length > 0 && (
							<div className="sm:col-span-2">
								<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
									Ассистент (опционально)
								</label>
								<select
									value={assistantUserId}
									onChange={(e) => setAssistantUserId(e.target.value)}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="select-booking-assistant"
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

					{/* Status Selection: 1-Click Status Choice (Mandates 8e, 8n) */}
					<div className="space-y-1.5" data-testid="quick-booking-status-selector">
						<label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block">
							Статус визита (1 клик):
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => setStatus("planned")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "planned"
										? "bg-[var(--teal-dark,var(--teal))] text-white font-bold border-[var(--teal-dark,var(--teal))]"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-planned"
							>
								<Calendar size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">Запланирован</span>
							</button>
							<button
								type="button"
								onClick={() => setStatus("confirmed")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "confirmed"
										? "bg-violet-600 text-white font-bold border-violet-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-confirmed"
							>
								<PhoneCall size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">Подтвержден</span>
							</button>
							<button
								type="button"
								onClick={() => setStatus("arrived")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "arrived"
										? "bg-emerald-600 text-white font-bold border-emerald-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-arrived"
							>
								<UserCheck size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">Пациент пришел</span>
							</button>
							<button
								type="button"
								onClick={() => setStatus("in_treatment")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "in_treatment"
										? "bg-cyan-600 text-white font-bold border-cyan-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-in_treatment"
							>
								<CalendarCheck size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">В кресле</span>
							</button>
							<button
								type="button"
								onClick={() => setStatus("completed")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "completed"
										? "bg-slate-700 dark:bg-slate-600 text-white font-bold border-slate-700 dark:border-slate-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-completed"
							>
								<CheckCircle2 size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">Прием завершен</span>
							</button>
							<button
								type="button"
								onClick={() => setStatus("no_show")}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
									status === "no_show"
										? "bg-rose-600 text-white font-bold border-rose-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
								}`}
								data-testid="quick-status-btn-no_show"
							>
								<UserX size={14} className="shrink-0" />
								<span className="whitespace-nowrap leading-none">Неявка</span>
							</button>
						</div>
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
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
							role="alert"
						>
							<AlertTriangle size={14} className="shrink-0" />
							<span>{submitError}</span>
						</div>
					)}
					{/* Inline Slot Conflict Banner / Alternative Slots (Sin 6, Anti-Matryoshka) */}
					<SlotConflictModal
						isOpen={Boolean(slotConflict)}
						inline={true}
						onClose={() => setSlotConflict(null)}
						conflictMessage={slotConflict?.message}
						suggestedSlots={slotConflict?.suggestedSlots ?? []}
						patientName={selectedPatient?.fullName}
						doctorName={doctors.find((d) => d.id === doctorUserId)?.fullName}
						onOverbook={() => void handleSubmitBooking(undefined, { overbookOverride: true })}
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

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 pb-6 sm:pb-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleRequestClose}
							disabled={isSubmitting}
							data-testid="quick-booking-cancel-btn"
							className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
						>
							Отмена (Esc)
						</button>
						{isDirty && (
							<button
								type="button"
								onClick={handleDiscardDraftAndClose}
								disabled={isSubmitting}
								className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
								title="Сбросить все введенные данные без сохранения черновика"
								data-testid="quick-booking-discard-draft-btn"
							>
								Сбросить
							</button>
						)}
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto flex-1">
						<button
							type="button"
							onClick={handleCopyBookingConfirmation}
							data-testid="quick-booking-copy-confirmation-btn"
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
							title="Скопировать детали записи для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy size={15} className="text-[var(--teal)] shrink-0" />
							<span className="hidden sm:inline">Скопировать для пациента</span>
							<span className="sm:hidden">Копия</span>
						</button>

						<button
							type="button"
							onClick={() => void handleSubmitBooking()}
							disabled={isSubmitting}
							data-testid="quick-drawer-save-btn"
							className={`flex-1 min-h-[44px] px-4 sm:px-5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
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
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(drawerElement, document.body) : drawerElement;
}
