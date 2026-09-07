import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
	calculateEmergencyReserveSlots,
	type DoctorShiftSchedule,
	type EmergencyReserveSlot,
} from "@dental/shared";
import {
	AlertTriangle,
	Building2,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Edit2,
	MessageSquare,
	Moon,
	MoreVertical,
	Phone,
	PhoneCall,
	Plus,
	Settings,
	Stethoscope,
	Sun,
	Trash2,
	User,
	UserCheck,
	Users,
	UserX,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
export { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { formatPatientDisplayFio } from "./AppointmentCard";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { calculateDailyChairDoctorTally } from "./doctorFreeSlotsEngine";
import { countLabel } from "../../lib/russianPlural";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { QuickAddChairModal, type QuickAddChairData } from "./QuickAddChairModal";

export interface ChairDoctorSubShift {
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	startHour: number;
	endHour: number;
	shiftHours: string;
}

export interface ChairDoctorShiftAssignment {
	chairId: string;
	chairName?: string | undefined;
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	shiftPreset?: "morning" | "evening" | "full" | "two_shifts" | "custom" | undefined;
	shiftLabel?: string | undefined;
	shiftHours: string;
	startHour?: number | undefined;
	endHour?: number | undefined;
	subShifts?: ChairDoctorSubShift[] | undefined;
}

export const CHAIR_SHIFT_PRESETS = [
	{
		id: "morning" as const,
		label: "Утренняя смена",
		hours: "08:00–14:00",
		name: "Утро 08:00–14:00",
		startHour: 8,
		endHour: 14,
	},
	{
		id: "evening" as const,
		label: "Вечерняя смена",
		hours: "14:00–20:00",
		name: "Вечер 14:00–20:00",
		startHour: 14,
		endHour: 20,
	},
	{
		id: "full" as const,
		label: "Полный день",
		hours: "08:00–20:00",
		name: "Весь день 08:00–20:00",
		startHour: 8,
		endHour: 20,
	},
	{
		id: "two_shifts" as const,
		label: "2 смены (Утро + Вечер)",
		hours: "08:00–20:00",
		name: "2 смены (08–14 / 14–20)",
		startHour: 8,
		endHour: 20,
	},
];

export function formatDoctorShortName(fullName: string): string {
	if (!fullName) return "";
	const cleaned = fullName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = cleaned.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return fullName;
	const lastName = parts[0];
	if (parts.length === 1) return lastName;
	if (parts[1]?.includes(".")) {
		return `${lastName} ${parts.slice(1).join(" ")}`.trim();
	}
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const middleInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${middleInitial}`.trim();
}

export interface ScheduleGridProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime: (iso: string) => string;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	selectedChairId?: string | null | undefined;
	selectedDoctorId?: string | null | undefined;
	onAppointmentMove?:
		| ((appointmentId: string, updates: any) => Promise<any> | void)
		| undefined;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	onAssignChairDoctor?:
		| ((
			chairId: string,
			assignment: ChairDoctorShiftAssignment | null,
		) => void)
		| undefined;
	onOpenAddChair?: (() => void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
}

function extractTeethList(appointment: Appointment): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

const HOURS = [
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
];

export const DEFAULT_SOLO_CHAIR = {
	id: "default-chair",
	name: "Кресло 1 (Основное)",
	roomNumber: "1",
	room: "1",
	isActive: true,
	active: true,
	color: "var(--teal, #0d9488)",
};

export const ScheduleGrid = React.memo(function ScheduleGrid(props: ScheduleGridProps) {
	const {
		dashboard,
		dateKey,
		appointments = [],
		onSlotClick,
		onAppointmentClick,
		onQuickStatusChange,
		patientName,
		toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : ""),
		appointmentLabels,
		selectedChairId,
		selectedDoctorId,
		onAppointmentMove,
		onEditChair,
	} = props;

	const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
	const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);
	const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);
	const [chairDoctorDropdownId, setChairDoctorDropdownId] = useState<string | null>(null);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleAppointmentMouseEnter = (apptId: string) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setHoveredApptId(apptId);
		}, 150);
	};

	const handleAppointmentMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setHoveredApptId(null);
	};

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const handleGlobalClick = () => {
			setActiveMenuApptId(null);
			setChairDoctorDropdownId(null);
		};
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActiveMenuApptId(null);
				setSelectedMobileAppt(null);
				setHoveredApptId(null);
				setChairDoctorDropdownId(null);
			}
		};
		if (activeMenuApptId || selectedMobileAppt || chairDoctorDropdownId) {
			window.addEventListener("click", handleGlobalClick);
			window.addEventListener("keydown", handleGlobalKeyDown);
		}
		return () => {
			window.removeEventListener("click", handleGlobalClick);
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [activeMenuApptId, selectedMobileAppt, chairDoctorDropdownId]);

	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(() => {
		return staff.filter(
			(m) => m.active !== false && (m.role === "doctor" || m.role === "owner" || !m.role),
		);
	}, [staff]);

	const chairs = useMemo(() => {
		const all = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		if (selectedChairId) {
			const filtered = all.filter((c) => c.id === selectedChairId);
			if (filtered.length > 0) return filtered;
		}
		return all;
	}, [dashboard?.clinicSettings?.chairs, selectedChairId]);

	const rawChairs = dashboard?.clinicSettings?.chairs;
	const isSoloMode =
		dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
		dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
		(dashboard?.clinicSettings?.profile?.mode as string) === "solo_practice";

	const isZeroChairs = Array.isArray(rawChairs) && chairs.length === 0 && !isSoloMode;

	const effectiveChairs = useMemo(() => {
		return chairs && chairs.length > 0 ? chairs : [DEFAULT_SOLO_CHAIR];
	}, [chairs]);

	const isSoloDoctor =
		isSoloMode ||
		(doctors.length <= 1 && effectiveChairs.length <= 1) ||
		doctors.length === 1;

	const [localChairAssignments, setLocalChairAssignments] = useState<
		Record<string, ChairDoctorShiftAssignment>
	>(() => {
		if (props.chairDoctorAssignments) return props.chairDoctorAssignments;
		if (typeof window !== "undefined") {
			try {
				const raw = localStorage.getItem(`dente_chair_doctor_assignments_${dateKey}`);
				if (raw) return JSON.parse(raw);
			} catch {}
		}
		return {};
	});

	useEffect(() => {
		if (props.chairDoctorAssignments) {
			setLocalChairAssignments(props.chairDoctorAssignments);
			return;
		}
		if (typeof window !== "undefined") {
			try {
				const raw = localStorage.getItem(`dente_chair_doctor_assignments_${dateKey}`);
				if (raw) {
					setLocalChairAssignments(JSON.parse(raw));
					return;
				}
			} catch {}
		}
		setLocalChairAssignments({});
	}, [dateKey, props.chairDoctorAssignments]);

	const effectiveChairAssignments = useMemo(() => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			...(props.chairDoctorAssignments || {}),
			...localChairAssignments,
		};

		// If solo doctor or only 1 doctor in staff, auto-bind that doctor to the chair(s) if not already assigned
		if (isSoloDoctor && doctors.length >= 1) {
			const soloDoc = doctors[0];
			if (soloDoc) {
				for (const chair of effectiveChairs) {
					if (
						assignments[chair.id]?.doctorId === "" ||
						(assignments[chair.id] as any)?.unassigned
					) {
						continue;
					}
					if (!assignments[chair.id]) {
						const specialty =
							soloDoc.specialties && soloDoc.specialties.length > 0
								? specialtyLabels[soloDoc.specialties[0] as DentalSpecialty] ||
									soloDoc.specialties[0]
								: soloDoc.role === "doctor"
									? "Стоматолог"
									: "";
						assignments[chair.id] = {
							chairId: chair.id,
							doctorId: soloDoc.id,
							doctorName: soloDoc.fullName,
							doctorSpecialty: specialty,
							shiftPreset: "full",
							shiftLabel: "Полный день",
							shiftHours: "08:00–20:00",
							startHour: 8,
							endHour: 20,
						};
					}
				}
			}
		}

		return assignments;
	}, [localChairAssignments, props.chairDoctorAssignments, isSoloDoctor, doctors, effectiveChairs]);

	const [assigningChairId, setAssigningChairId] = useState<string | null>(null);
	const [modalDoctorId, setModalDoctorId] = useState<string>("");
	const [modalEveningDoctorId, setModalEveningDoctorId] = useState<string>("");
	const [modalShiftPreset, setModalShiftPreset] = useState<"morning" | "evening" | "full" | "two_shifts">("full");
	const [isInternalAddChairModalOpen, setIsInternalAddChairModalOpen] = useState<boolean>(false);

	const handleOpenAddChair = useCallback(() => {
		if (typeof props.onOpenAddChair === "function") {
			props.onOpenAddChair();
		} else {
			setIsInternalAddChairModalOpen(true);
		}
	}, [props.onOpenAddChair]);

	const getSuggestedDoctorForChair = useCallback(
		(targetChairId: string) => {
			if (doctors.length === 0) return null;
			const targetChair = effectiveChairs.find((c) => c.id === targetChairId);
			const chairSpec = (targetChair as { specialization?: string })?.specialization;
			if (chairSpec) {
				const matchingDoc = doctors.find(
					(d) =>
						d.specialties &&
						d.specialties.some(
							(s) => s.toLowerCase() === chairSpec.toLowerCase(),
						),
				);
				if (matchingDoc) return matchingDoc;
			}
			const chairIdx = effectiveChairs.findIndex((c) => c.id === targetChairId);
			if (chairIdx >= 0 && chairIdx < doctors.length) {
				return doctors[chairIdx] || doctors[0] || null;
			}
			return doctors[0] || null;
		},
		[doctors, effectiveChairs],
	);

	const getDoctorForChairAndHour = useCallback(
		(targetChairId: string, hourStr: string): string | null => {
			const assignment = effectiveChairAssignments[targetChairId];
			if (!assignment) return null;
			const hourNum = parseInt(hourStr.slice(0, 2), 10) || 8;

			// 1. Two-shift chair handling: morning (< 14:00) vs evening (>= 14:00)
			if (
				(assignment.subShifts && assignment.subShifts.length > 1) ||
				assignment.shiftPreset === "two_shifts"
			) {
				const mornSub = assignment.subShifts?.[0];
				const eveSub = assignment.subShifts?.[1];
				const mornStart = mornSub?.startHour ?? 8;
				const eveEnd = eveSub?.endHour ?? 20;
				if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
					return null;
				}
				const mornDocId = mornSub?.doctorId || assignment.doctorId;
				const eveDocId =
					eveSub?.doctorId ||
					mornSub?.doctorId ||
					assignment.doctorId;
				if (hourNum < 14) {
					return mornDocId || null;
				}
				return eveDocId || null;
			}

			// 2. Custom sub-shifts array
			if (assignment.subShifts && assignment.subShifts.length > 0) {
				const matching = assignment.subShifts.find(
					(s) =>
						hourNum >= s.startHour &&
						(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= 20)),
				);
				if (matching) return matching.doctorId;
				return null;
			}

			// 3. Preset bounds: morning only vs evening only
			if (assignment.shiftPreset === "morning") {
				if (hourNum < 14) return assignment.doctorId || null;
				return null;
			}
			if (assignment.shiftPreset === "evening") {
				if (hourNum >= 14 && hourNum <= 20) return assignment.doctorId || null;
				return null;
			}

			// 4. Numerical start/end hour range
			if (assignment.startHour !== undefined && assignment.endHour !== undefined) {
				if (
					hourNum >= assignment.startHour &&
					(hourNum < assignment.endHour || (assignment.endHour >= 20 && hourNum <= 20))
				) {
					return assignment.doctorId || null;
				}
				return null;
			}
			return assignment.doctorId || null;
		},
		[effectiveChairAssignments],
	);

	const openAssignModal = useCallback(
		(chairId: string) => {
			const existing = effectiveChairAssignments[chairId];
			const suggested = getSuggestedDoctorForChair(chairId);
			setAssigningChairId(chairId);

			if (existing?.subShifts && existing.subShifts.length > 1) {
				setModalShiftPreset("two_shifts");
				setModalDoctorId(existing.subShifts[0]?.doctorId || "");
				setModalEveningDoctorId(existing.subShifts[1]?.doctorId || "");
			} else {
				setModalDoctorId(
					existing?.doctorId || (suggested ? suggested.id : doctors.length > 0 ? doctors[0]!.id : ""),
				);
				const otherDoc = doctors.find((d) => d.id !== (existing?.doctorId || suggested?.id)) || doctors[1] || doctors[0];
				setModalEveningDoctorId(otherDoc?.id || "");
				setModalShiftPreset(
					existing?.shiftPreset === "morning" || existing?.shiftPreset === "evening"
						? existing.shiftPreset
						: "full",
				);
			}
		},
		[effectiveChairAssignments, doctors, getSuggestedDoctorForChair],
	);

	const handleConfirmAssignDoctor = useCallback(
		(
			chairId: string,
			docId: string,
			shiftPreset: "morning" | "evening" | "full" | "two_shifts",
			eveningDocId?: string,
		) => {
			const doc = doctors.find((d) => d.id === docId);
			const chair = effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
			const specialty =
				doc?.specialties && doc.specialties.length > 0
					? specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]
					: doc?.role === "doctor"
						? "Стоматолог"
						: "";
			const doctorName = doc?.fullName || "Врач";

			let assignment: ChairDoctorShiftAssignment;

			if (shiftPreset === "two_shifts") {
				const evDoc = doctors.find((d) => d.id === (eveningDocId || docId)) || doc;
				const evDocName = evDoc?.fullName || "Врач";
				const evDocSpecialty =
					evDoc?.specialties && evDoc.specialties.length > 0
						? specialtyLabels[evDoc.specialties[0] as DentalSpecialty] || evDoc.specialties[0]
						: evDoc?.role === "doctor"
							? "Стоматолог"
							: "";

				const subShifts: ChairDoctorSubShift[] = [
					{
						doctorId: docId,
						doctorName,
						doctorSpecialty: specialty,
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: evDoc?.id || docId,
						doctorName: evDocName,
						doctorSpecialty: evDocSpecialty,
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				];

				assignment = {
					chairId,
					doctorId: docId,
					doctorName,
					doctorSpecialty: specialty,
					shiftPreset: "custom",
					shiftLabel: `Утро: ${formatDoctorShortName(doctorName)} · Вечер: ${formatDoctorShortName(evDocName)}`,
					shiftHours: "08:00–20:00",
					startHour: 8,
					endHour: 20,
					subShifts,
				};
			} else if (shiftPreset === "morning") {
				const existing = effectiveChairAssignments[chairId];
				const existingEvening =
					existing?.shiftPreset === "evening"
						? {
								doctorId: existing.doctorId,
								doctorName: existing.doctorName,
								doctorSpecialty: existing.doctorSpecialty,
								startHour: existing.startHour ?? 14,
								endHour: existing.endHour ?? 20,
								shiftHours: existing.shiftHours || "14:00–20:00",
							}
						: existing?.subShifts?.find((s) => s.startHour >= 14);

				const morningSubShift: ChairDoctorSubShift = {
					doctorId: docId,
					doctorName,
					doctorSpecialty: specialty,
					startHour: 8,
					endHour: 14,
					shiftHours: "08:00–14:00",
				};

				if (existingEvening && existingEvening.doctorId) {
					assignment = {
						chairId,
						doctorId: docId,
						doctorName: `${formatDoctorShortName(doctorName)} / ${formatDoctorShortName(existingEvening.doctorName)}`,
						doctorSpecialty: specialty,
						shiftPreset: "custom",
						shiftLabel: `Утро: ${formatDoctorShortName(doctorName)} · Вечер: ${formatDoctorShortName(existingEvening.doctorName)}`,
						shiftHours: "08:00–14:00 & 14:00–20:00",
						startHour: 8,
						endHour: existingEvening.endHour || 20,
						subShifts: [morningSubShift, existingEvening],
					};
				} else {
					const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "morning")!;
					assignment = {
						chairId,
						doctorId: docId,
						doctorName,
						doctorSpecialty: specialty,
						shiftPreset: "morning",
						shiftLabel: preset.label,
						shiftHours: preset.hours,
						startHour: preset.startHour,
						endHour: preset.endHour,
						subShifts: [morningSubShift],
					};
				}
			} else if (shiftPreset === "evening") {
				const existing = effectiveChairAssignments[chairId];
				const existingMorning =
					existing?.shiftPreset === "morning"
						? {
								doctorId: existing.doctorId,
								doctorName: existing.doctorName,
								doctorSpecialty: existing.doctorSpecialty,
								startHour: existing.startHour ?? 8,
								endHour: existing.endHour ?? 14,
								shiftHours: existing.shiftHours || "08:00–14:00",
							}
						: existing?.subShifts?.find((s) => s.startHour < 14);

				const eveningSubShift: ChairDoctorSubShift = {
					doctorId: docId,
					doctorName,
					doctorSpecialty: specialty,
					startHour: 14,
					endHour: 20,
					shiftHours: "14:00–20:00",
				};

				if (existingMorning && existingMorning.doctorId) {
					assignment = {
						chairId,
						doctorId: existingMorning.doctorId,
						doctorName: `${formatDoctorShortName(existingMorning.doctorName)} / ${formatDoctorShortName(doctorName)}`,
						doctorSpecialty: existingMorning.doctorSpecialty || specialty,
						shiftPreset: "custom",
						shiftLabel: `Утро: ${formatDoctorShortName(existingMorning.doctorName)} · Вечер: ${formatDoctorShortName(doctorName)}`,
						shiftHours: "08:00–14:00 & 14:00–20:00",
						startHour: existingMorning.startHour || 8,
						endHour: 20,
						subShifts: [existingMorning, eveningSubShift],
					};
				} else {
					const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "evening")!;
					assignment = {
						chairId,
						doctorId: docId,
						doctorName,
						doctorSpecialty: specialty,
						shiftPreset: "evening",
						shiftLabel: preset.label,
						shiftHours: preset.hours,
						startHour: preset.startHour,
						endHour: preset.endHour,
						subShifts: [eveningSubShift],
					};
				}
			} else {
				const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === shiftPreset) || CHAIR_SHIFT_PRESETS[2]!;
				assignment = {
					chairId,
					doctorId: docId,
					doctorName,
					doctorSpecialty: specialty,
					shiftPreset,
					shiftLabel: preset.label,
					shiftHours: preset.hours,
					startHour: preset.startHour,
					endHour: preset.endHour,
					subShifts: [
						{
							doctorId: docId,
							doctorName,
							doctorSpecialty: specialty,
							startHour: preset.startHour,
							endHour: preset.endHour,
							shiftHours: preset.hours,
						},
					],
				};
			}

			setLocalChairAssignments((prev) => {
				const next = { ...prev, [chairId]: assignment };
				if (typeof window !== "undefined") {
					try {
						localStorage.setItem(`dente_chair_doctor_assignments_${dateKey}`, JSON.stringify(next));
					} catch {}
				}
				return next;
			});

			if (typeof props.onAssignChairDoctor === "function") {
				props.onAssignChairDoctor(chairId, assignment);
			}

			if (shiftPreset === "two_shifts") {
				const evDoc = doctors.find((d) => d.id === (eveningDocId || docId));
				showToast(
					`Кресло «${chair.name}»: 2 смены (Утро: ${formatDoctorShortName(doctorName)}, Вечер: ${formatDoctorShortName(evDoc?.fullName || doctorName)})`,
					"success",
					3500,
				);
			} else {
				const shortName = formatDoctorShortName(doctorName);
				showToast(`Врач ${shortName} закреплен за креслом «${chair.name}» (${assignment.shiftHours})`, "success", 3000);
			}
		},
		[doctors, effectiveChairs, dateKey, props.onAssignChairDoctor],
	);

	const handleUnassignDoctor = useCallback(
		(chairId: string) => {
			const chair = effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
			const emptyAssignment: ChairDoctorShiftAssignment = {
				chairId,
				doctorId: "",
				doctorName: "",
				shiftPreset: "full",
				shiftLabel: "",
				shiftHours: "",
			};
			setLocalChairAssignments((prev) => {
				const next = { ...prev, [chairId]: emptyAssignment };
				if (typeof window !== "undefined") {
					try {
						localStorage.setItem(`dente_chair_doctor_assignments_${dateKey}`, JSON.stringify(next));
					} catch {}
				}
				return next;
			});

			if (typeof props.onAssignChairDoctor === "function") {
				props.onAssignChairDoctor(chairId, null);
			}

			showToast(`Назначение врача для кресла «${chair.name}» снято`, "info", 3000);
		},
		[effectiveChairs, dateKey, props.onAssignChairDoctor],
	);

	// Group appointments by chair and day
	const dayAppointments = useMemo(() => {
		const safeAppts = appointments || [];
		return safeAppts.filter((a) => {
			const localDate = toDateTimeLocalValue ? toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10) : a.startsAt.slice(0, 10);
			return localDate === dateKey;
		});
	}, [appointments, dateKey, toDateTimeLocalValue, timezone]);

	// Calculate dedicated 30-min emergency reserve buffers per doctor shift
	const emergencyReserveSlots = useMemo(() => {
		const targetDocs = selectedDoctorId ? doctors.filter((d) => d.id === selectedDoctorId) : doctors;

		const slots: EmergencyReserveSlot[] = [];
		for (const doc of targetDocs) {
			const shift: DoctorShiftSchedule = {
				id: `shift-${doc.id}-${dateKey}`,
				clinicId: dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
				doctorId: doc.id,
				doctorFullName: doc.fullName,
				shiftDate: dateKey,
				startTime: `${dateKey}T08:00:00.000Z`,
				endTime: `${dateKey}T20:00:00.000Z`,
				isEmergencyReserveEnabled: true,
				emergencyReserveMinutes: 30,
			};
			const res = calculateEmergencyReserveSlots(
				shift,
				dayAppointments.map((a) => ({
					id: a.id,
					clinicId: dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
					doctorId: a.doctorUserId || "doc-1",
					cabinetId: a.chairId || "chair-1",
					patientId: a.patientId || "pat-1",
					startTime: a.startsAt,
					endTime: a.endsAt,
					status: a.status === "cancelled" ? "cancelled" : "scheduled",
					isEmergency: Boolean((a as any)?.isCito || (a as any)?.isEmergency),
				})),
			);
			slots.push(...res);
		}
		return slots;
	}, [dashboard?.clinicSettings?.staff, dashboard?.clinicSettings?.profile, selectedDoctorId, dateKey, dayAppointments]);

	// Calculate cross-chair and intra-chair collisions on the active date
	const collisionMap = useMemo(() => {
		const collisions = new Map<
			string,
			{
				sameDoctor: boolean;
				sameChair: boolean;
				sameAssistant: boolean;
				samePatient: boolean;
				conflictWith: string;
			}
		>();
		const occupyingAppointments = dayAppointments.filter(
			(a) => a.status !== "cancelled" && a.status !== "no_show",
		);

		for (let i = 0; i < occupyingAppointments.length; i++) {
			for (let j = i + 1; j < occupyingAppointments.length; j++) {
				const a1 = occupyingAppointments[i]!;
				const a2 = occupyingAppointments[j]!;

				const s1 = Date.parse(a1.startsAt);
				const e1 = Date.parse(a1.endsAt);
				const s2 = Date.parse(a2.startsAt);
				const e2 = Date.parse(a2.endsAt);

				if (
					Number.isFinite(s1) &&
					Number.isFinite(e1) &&
					Number.isFinite(s2) &&
					Number.isFinite(e2)
				) {
					const overlapMs = Math.min(e1, e2) - Math.max(s1, s2);
					if (overlapMs > 0) {
						const sameDoctor = Boolean(
							a1.doctorUserId && a1.doctorUserId === a2.doctorUserId,
						);
						const sameChair = Boolean(a1.chairId && a1.chairId === a2.chairId);
						const sameAssistant = Boolean(
							a1.assistantUserId && a1.assistantUserId === a2.assistantUserId,
						);
						const samePatient = Boolean(
							a1.patientId && a1.patientId === a2.patientId,
						);

						if (sameDoctor || sameChair || sameAssistant || samePatient) {
							const prev1 = collisions.get(a1.id);
							collisions.set(a1.id, {
								sameDoctor: Boolean(prev1?.sameDoctor || sameDoctor),
								sameChair: Boolean(prev1?.sameChair || sameChair),
								sameAssistant: Boolean(prev1?.sameAssistant || sameAssistant),
								samePatient: Boolean(prev1?.samePatient || samePatient),
								conflictWith: a2.id,
							});
							const prev2 = collisions.get(a2.id);
							collisions.set(a2.id, {
								sameDoctor: Boolean(prev2?.sameDoctor || sameDoctor),
								sameChair: Boolean(prev2?.sameChair || sameChair),
								sameAssistant: Boolean(prev2?.sameAssistant || sameAssistant),
								samePatient: Boolean(prev2?.samePatient || samePatient),
								conflictWith: a1.id,
							});
						}
					}
				}
			}
		}
		return collisions;
	}, [dayAppointments]);

	const dailyTally = useMemo(() => {
		return calculateDailyChairDoctorTally({
			dateKey,
			appointments,
			chairs: (dashboard?.clinicSettings?.chairs && dashboard.clinicSettings.chairs.length > 0 ? dashboard.clinicSettings.chairs : effectiveChairs) as any,
			doctors: ((dashboard?.clinicSettings as any)?.staff ?? []) as any[],
		});
	}, [dateKey, appointments, dashboard?.clinicSettings?.chairs, effectiveChairs, (dashboard?.clinicSettings as any)?.staff]);

	if (isZeroChairs) {
		return (
			<div
				className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-[var(--line)] bg-[var(--paper-soft)] flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in"
				data-testid="schedule-zero-chairs-empty-state"
			>
				<div className="w-16 h-16 rounded-3xl bg-[var(--teal-soft,var(--paper))] border border-[var(--teal,var(--brand-primary))]/30 flex items-center justify-center text-[var(--teal,var(--brand-primary))] shadow-sm">
					<Stethoscope size={32} />
				</div>
				<div className="max-w-md space-y-1.5">
					<h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
						В клинике пока нет настроенных кресел
					</h3>
					<p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
						Для отображения сетки расписания и записи пациентов создайте первое кресло клиники.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenAddChair}
					className="primary-button min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all"
					data-testid="btn-create-first-chair"
					style={{ minHeight: "44px" }}
				>
					<Plus size={18} />
					<span>+ Создать первое кресло</span>
				</button>
				{!props.onOpenAddChair && isInternalAddChairModalOpen && (
					<QuickAddChairModal
						isOpen={isInternalAddChairModalOpen}
						onClose={() => setIsInternalAddChairModalOpen(false)}
						existingChairsCount={0}
						{...(props.onAddChair ? { onAddChair: props.onAddChair } : {})}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Day 0 Empty State Banner when no appointments for selected day */}
			{dayAppointments.length === 0 && (
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-dashed border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-3">
						<CalendarCheck size={18} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<div>
							<span className="font-bold text-[var(--ink)]">На выбранный день записей пока нет.</span>
							<span className="text-[var(--muted)] ml-1">Нажмите на любой свободный интервал в сетке ниже или кнопку «+ Записать первого пациента».</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							const firstChair = effectiveChairs[0];
							const firstChairId = firstChair?.id || DEFAULT_SOLO_CHAIR.id;
							onSlotClick({
								dateKey,
								startTime: "09:00",
								chairId: firstChairId,
								doctorUserId: effectiveChairAssignments[firstChairId]?.doctorId || selectedDoctorId || null,
							});
						}}
						className="primary-button min-h-[44px] px-3.5 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
						data-testid="btn-grid-first-appointment"
					>
						<Plus size={14} aria-hidden="true" />
						<span>+ Записать первого пациента</span>
					</button>
				</div>
			)}

			{/* Daily Chair & Doctor Occupancy Summary Bar with Inline + Кресло */}
			<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
				<div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
					{dailyTally.totalAppointmentsCount > 0 ? (
						<>
							<span className="font-bold text-[var(--ink)] flex items-center gap-1.5 whitespace-nowrap">
								<CalendarCheck size={16} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								Загрузка клиники: {countLabel(dailyTally.totalAppointmentsCount, "визит", "визита", "визитов")} ({dailyTally.clinicOccupancyPercent}%)
							</span>
							<span className="text-[var(--muted)] hidden sm:inline">·</span>
							<span className="text-[var(--muted)] whitespace-nowrap">
								Общее время приема: {Math.floor(dailyTally.totalDurationMinutes / 60)} ч {dailyTally.totalDurationMinutes % 60} мин
							</span>
						</>
					) : (
						<span className="text-[var(--muted)] flex items-center gap-1.5 whitespace-nowrap">
							<Clock size={15} className="text-[var(--teal)] shrink-0" />
							<span>{effectiveChairs.length} {countLabel(effectiveChairs.length, "кресло", "кресла", "кресел")} · Рабочий день 08:00–20:00</span>
						</span>
					)}
				</div>
				<div className="flex items-center gap-2.5 shrink-0">
					<button
						type="button"
						onClick={handleOpenAddChair}
						className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-xl border border-dashed border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-[var(--teal)] active:scale-95 shrink-0"
						title="Добавить кресло в расписание (+ Кресло)"
						aria-label="Добавить кресло"
						data-testid="btn-grid-inline-add-chair"
						style={{ minHeight: "44px", minWidth: "44px" }}
					>
						<Plus size={15} className="shrink-0 text-[var(--teal)]" />
						<span className="font-bold">+ Кресло</span>
					</button>
					{dailyTally.totalRevenueRub > 0 && (
						<div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
							Выручка дня: {dailyTally.totalRevenueRub.toLocaleString("ru-RU")} ₽
						</div>
					)}
				</div>
			</div>

			<div
				className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm p-4 sm:p-6 touch-pan-x"
				data-testid="schedule-grid-view"
				role="region"
				aria-label="Сетка расписания по креслам и времени"
			>
				<div
					className="grid min-w-[700px] border-b border-[var(--line)] bg-[var(--paper-soft)] sticky top-0 z-10"
					style={{
						gridTemplateColumns: `80px repeat(${effectiveChairs.length}, minmax(180px, 1fr))`,
					}}
				>
					{/* Time corner header */}
					<div className="p-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center gap-1 sticky left-0 z-20 bg-[var(--paper-soft)]">
						<Clock size={14} className="text-[var(--teal)]" />
						<span>Время</span>
					</div>

					{/* Chair Column Headers with Visit Count & Doctor Shift Badge */}
					{(() => {
						const now = new Date();
						const todayKey = toDateTimeLocalValue(now.toISOString(), timezone).slice(0, 10);
						const isToday = dateKey === todayKey;
						const currentHour =
							Number.parseInt(
								toDateTimeLocalValue(now.toISOString(), timezone).slice(11, 13),
								10,
							) || now.getHours();
						return effectiveChairs.map((chair) => {
							const chairStat = dailyTally.chairs.find((c) => c.chairId === chair.id);
							const assignment = effectiveChairAssignments[chair.id];
							const hasDoctor = Boolean(assignment && assignment.doctorId);
							const suggestedDoctor = getSuggestedDoctorForChair(chair.id);
							return (
								<div
									key={chair.id}
									className="p-2.5 sm:p-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ink)] border-r border-[var(--line)] last:border-r-0 flex flex-col items-center justify-center gap-1.5 min-w-0"
									data-testid={`chair-header-${chair.id}`}
								>
									<div className="flex items-center justify-center gap-1.5 flex-wrap">
										<span className="truncate">{chair.name}</span>
										{onEditChair && chair.id !== DEFAULT_SOLO_CHAIR.id && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onEditChair({
														id: chair.id,
														name: chair.name,
														roomNumber: (chair as any).roomNumber || (chair as any).room || "",
														branchId: (chair as any).branchId,
														color: chair.color || "#0d9488",
														specialization: (chair as any).specialization,
														isActive: (chair as any).active ?? (chair as any).isActive ?? true,
													});
												}}
												className="p-1 rounded-md hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
												title={`Редактировать параметры кресла «${chair.name}»`}
												aria-label={`Редактировать параметры кресла ${chair.name}`}
												data-testid={`btn-edit-chair-${chair.id}`}
											>
												<Settings size={12} className="opacity-70 hover:opacity-100" />
											</button>
										)}
										{chairStat && chairStat.appointmentsCount > 0 && (
											<span className="text-[10px] font-normal font-sans lowercase px-2 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
												{countLabel(chairStat.appointmentsCount, "визит", "визита", "визитов")} ({chairStat.occupancyPercent}%)
											</span>
										)}
									</div>

									{/* Doctor-to-Chair Shift Binding Badge / Button */}
									{hasDoctor ? (
										(() => {
											const subShifts = assignment!.subShifts;
											const isMultiShift = Boolean(
												(subShifts && subShifts.length > 1) ||
													assignment!.shiftPreset === "two_shifts",
											);
											if (isMultiShift) {
												const mornSub = subShifts?.[0] || {
													doctorId: assignment!.doctorId,
													doctorName: assignment!.doctorName,
													startHour: 8,
													endHour: 14,
													shiftHours: "08:00–14:00",
												};
												const eveSub = subShifts?.[1] || {
													doctorId: assignment!.doctorId,
													doctorName: assignment!.doctorName,
													startHour: 14,
													endHour: 20,
													shiftHours: "14:00–20:00",
												};
												const mornStart = mornSub.startHour ?? 8;
												const mornEnd = mornSub.endHour ?? 14;
												const eveStart = eveSub.startHour ?? 14;
												const eveEnd = eveSub.endHour ?? 20;
												const isMornOnDuty = isToday && currentHour >= mornStart && currentHour < mornEnd;
												const isEveOnDuty =
													isToday &&
													currentHour >= eveStart &&
													(currentHour < eveEnd || (eveEnd >= 20 && currentHour <= 20));
												return (
													<div className="w-full flex flex-col gap-1 text-left" data-testid={`chair-doctor-multishift-${chair.id}`}>
														<button
															type="button"
															onClick={() => openAssignModal(chair.id)}
															className="w-full p-2 rounded-xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex flex-col gap-1.5 text-xs normal-case transition-colors cursor-pointer group shadow-2xs min-h-[44px]"
															style={{ minHeight: "44px" }}
															title={`2 смены: ${mornSub?.doctorName || "Врач 1"} (${mornSub?.shiftHours || "08:00–14:00"}) и ${eveSub?.doctorName || "Врач 2"} (${eveSub?.shiftHours || "14:00–20:00"}). Нажмите для изменения`}
															aria-label={`2 смены на кресле ${chair.name}: ☀️ 08:00–14:00 ${mornSub?.doctorName || "Врач 1"}, 🌙 14:00–20:00 ${eveSub?.doctorName || "Врач 2"}`}
															data-testid={`chair-doctor-badge-${chair.id}`}
														>
															<div
																className={`flex items-center justify-between gap-1 w-full min-w-0 p-1 rounded-lg transition-all ${
																	isMornOnDuty
																		? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/40 text-emerald-900 dark:text-emerald-100 font-bold"
																		: ""
																}`}
																data-testid={`chair-shift-morning-${chair.id}`}
															>
																<span className="flex items-center gap-1 font-semibold truncate min-w-0">
																	<span className="text-amber-500 font-normal shrink-0 whitespace-nowrap">☀️ 08:00–14:00:</span>
																	<span className="truncate">{formatDoctorShortName(mornSub?.doctorName || "")}</span>
																</span>
																{isMornOnDuty && (
																	<span
																		className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30"
																		data-testid={`chair-duty-morning-badge-${chair.id}`}
																	>
																		<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
																		<span>● На смене</span>
																	</span>
																)}
															</div>
															<div
																className={`flex items-center justify-between gap-1 w-full min-w-0 p-1 rounded-lg transition-all ${
																	isEveOnDuty
																		? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/40 text-emerald-900 dark:text-emerald-100 font-bold"
																		: ""
																}`}
																data-testid={`chair-shift-evening-${chair.id}`}
															>
																<span className="flex items-center gap-1 font-semibold truncate min-w-0">
																	<span className="text-indigo-400 font-normal shrink-0 whitespace-nowrap">🌙 14:00–20:00:</span>
																	<span className="truncate">{formatDoctorShortName(eveSub?.doctorName || "")}</span>
																</span>
																{isEveOnDuty && (
																	<span
																		className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30"
																		data-testid={`chair-duty-evening-badge-${chair.id}`}
																	>
																		<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
																		<span>● На смене</span>
																	</span>
																)}
															</div>
														</button>
														{/* 1-Click Shift Switcher Quick Pills */}
														<div className="flex items-center justify-between gap-1 w-full px-0.5">
															{mornSub && (
																<button
																	type="button"
																	onClick={() => handleConfirmAssignDoctor(chair.id, mornSub.doctorId, "morning")}
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на утро только"
																	data-testid={`chair-quick-morning-${chair.id}`}
																>
																	☀️ Утро
																</button>
															)}
															{eveSub && (
																<button
																	type="button"
																	onClick={() => handleConfirmAssignDoctor(chair.id, eveSub.doctorId, "evening")}
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на вечер только"
																	data-testid={`chair-quick-evening-${chair.id}`}
																>
																	🌙 Вечер
																</button>
															)}
															{mornSub && (
																<button
																	type="button"
																	onClick={() => handleConfirmAssignDoctor(chair.id, mornSub.doctorId, "full")}
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на весь день"
																	data-testid={`chair-quick-full-${chair.id}`}
																>
																	🏢 Весь день
																</button>
															)}
														</div>
													</div>
												);
											}

											const sStart = assignment!.startHour ?? (Number.parseInt(assignment!.shiftHours?.slice(0, 2) || "8", 10) || 8);
											const sEnd = assignment!.endHour ?? (Number.parseInt(assignment!.shiftHours?.split("–")?.[1]?.slice(0, 2) || "20", 10) || 20);
											const isSingleOnDuty = isToday && currentHour >= sStart && currentHour < sEnd;

											return (
												<div className="w-full flex flex-col gap-1 text-left">
													<button
														type="button"
														onClick={() => openAssignModal(chair.id)}
														className="min-h-[44px] w-full px-2.5 py-1.5 rounded-xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex items-center justify-between gap-1.5 text-xs font-semibold normal-case transition-colors cursor-pointer group shadow-2xs"
														style={{ minHeight: "44px" }}
														title={`Врач на смене: ${assignment!.doctorName} (${assignment!.shiftHours}). Нажмите для смены`}
														aria-label={`Врач ${assignment!.doctorName}, ${assignment!.shiftHours}. Нажмите для изменения`}
														data-testid={`chair-doctor-badge-${chair.id}`}
													>
														<div className="flex items-center gap-1.5 min-w-0 flex-1">
															<UserCheck size={14} className="shrink-0 text-[var(--teal)]" />
															<span className="truncate min-w-0">
																{formatDoctorShortName(assignment!.doctorName)}
																{assignment!.doctorSpecialty ? ` (${assignment!.doctorSpecialty})` : ""}
															</span>
															<span className="shrink-0 whitespace-nowrap text-[var(--muted)] font-normal text-[11px]">
																· {assignment!.shiftHours}
															</span>
														</div>
														{isSingleOnDuty && (
															<span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
																<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
																<span>● На смене</span>
															</span>
														)}
														<Edit2 size={12} className="shrink-0 opacity-60 group-hover:opacity-100 ml-0.5" />
													</button>
													{/* 1-Click Shift Segmented Control (StomX / DentalPRO parity) */}
													<div
														className="flex items-center justify-between p-0.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] w-full gap-0.5"
														role="group"
														aria-label="Переключение смены кресла"
													>
														<button
															type="button"
															onClick={() => handleConfirmAssignDoctor(chair.id, assignment!.doctorId, "morning")}
															className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																assignment!.shiftPreset === "morning"
																	? "bg-[var(--teal)] text-white shadow-xs"
																	: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
															}`}
															style={{ minHeight: "44px" }}
															title="1-я смена: Утро (08:00–14:00)"
															aria-label="Утренняя смена"
															data-testid={`chair-quick-morning-${chair.id}`}
														>
															<Sun size={12} className="shrink-0" />
															<span className="text-[11px] font-bold">Утро</span>
														</button>
														<button
															type="button"
															onClick={() => handleConfirmAssignDoctor(chair.id, assignment!.doctorId, "evening")}
															className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																assignment!.shiftPreset === "evening"
																	? "bg-[var(--teal)] text-white shadow-xs"
																	: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
															}`}
															style={{ minHeight: "44px" }}
															title="2-я смена: Вечер (14:00–20:00)"
															aria-label="Вечерняя смена"
															data-testid={`chair-quick-evening-${chair.id}`}
														>
															<Moon size={12} className="shrink-0" />
															<span className="text-[11px] font-bold">Вечер</span>
														</button>
														<button
															type="button"
															onClick={() => handleConfirmAssignDoctor(chair.id, assignment!.doctorId, "full")}
															className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																assignment!.shiftPreset === "full"
																	? "bg-[var(--teal)] text-white shadow-xs"
																	: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
															}`}
															style={{ minHeight: "44px" }}
															title="Полный день (08:00–20:00)"
															aria-label="Полный день"
															data-testid={`chair-quick-full-${chair.id}`}
														>
															<Building2 size={12} className="shrink-0" />
															<span className="text-[11px] font-bold">День</span>
														</button>
														{doctors.length > 1 && (
															<button
																type="button"
																onClick={() => {
																	const secondDoc = doctors.find((d) => d.id !== assignment!.doctorId) || doctors[1] || doctors[0];
																	handleConfirmAssignDoctor(chair.id, assignment!.doctorId, "two_shifts", secondDoc?.id);
																}}
																className={`min-h-[30px] h-[30px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																	assignment!.shiftPreset === "two_shifts" || (assignment!.subShifts && assignment!.subShifts.length > 1)
																		? "bg-[var(--teal)] text-white shadow-xs"
																		: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
																}`}
																title="2 смены (Утро + Вечер разные врачи)"
																aria-label="Две смены"
																data-testid={`chair-quick-twoshifts-${chair.id}`}
															>
																<Users size={12} className="shrink-0" />
																<span className="text-[11px] font-bold">2 см</span>
															</button>
														)}
													</div>
												</div>
											);
										})()
									) : (
										<div className="w-full flex flex-col gap-1">
											<button
												type="button"
												onClick={() => openAssignModal(chair.id)}
												className="min-h-[44px] w-full px-3 py-2 rounded-xl border-2 border-dashed border-[var(--teal,var(--brand-primary))]/40 bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex items-center justify-center gap-1.5 text-xs font-bold normal-case transition-all cursor-pointer shadow-2xs active:scale-98"
												style={{ minHeight: "44px" }}
												title={`Назначить врача на кресло «${chair.name}»`}
												aria-label={`Назначить врача на кресло ${chair.name}`}
												data-testid={`btn-assign-doctor-${chair.id}`}
											>
												<Plus size={15} className="shrink-0 text-[var(--teal)]" />
												<span className="truncate font-bold">+ Назначить врача</span>
											</button>
											{suggestedDoctor && !isSoloDoctor && doctors.length > 1 && (
												<button
													type="button"
													onClick={() => handleConfirmAssignDoctor(chair.id, suggestedDoctor.id, "full")}
													className="min-h-[44px] py-1 px-2 rounded-lg border border-[var(--teal)]/20 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] text-xs font-bold truncate flex items-center justify-center gap-1 cursor-pointer transition-colors"
													title={`Быстро назначить ${suggestedDoctor.fullName} (1 клик)`}
													data-testid={`btn-quick-assign-${chair.id}`}
													style={{ minHeight: "44px" }}
												>
													<Zap size={11} className="text-[var(--teal)] shrink-0" />
													<span className="truncate">{`1 клик: ${formatDoctorShortName(suggestedDoctor.fullName)}`}</span>
												</button>
											)}
										</div>
									)}
								</div>
							);
						});
					})()}
				</div>

			{/* Time Rows */}
			<div className="divide-y divide-[var(--line)]">
				{HOURS.map((hour, hIndex) => {
					return (
						<div
							key={hour}
							className="grid min-w-[700px] hover:bg-[var(--paper-soft)]/50 transition-colors"
							style={{
								gridTemplateColumns: `80px repeat(${effectiveChairs.length}, minmax(180px, 1fr))`,
							}}
						>
							{/* Time label */}
							<div className="p-3 text-center text-xs font-bold text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center select-none sticky left-0 z-10 bg-[var(--paper)]">
								{hour}
							</div>

							{/* Chair Cells */}
							{effectiveChairs.map((chair, chairIndex) => {
								const slotStartIso = `${dateKey}T${hour}:00.000Z`;
								const cellAppointments = dayAppointments.filter((a) => {
									if (chair.id !== DEFAULT_SOLO_CHAIR.id && a.chairId !== chair.id) {
										return false;
									}
									const aTime = toDateTimeLocalValue(a.startsAt, timezone).slice(
										11,
										16,
									);
									return aTime.startsWith(hour.slice(0, 2));
								});

								if (cellAppointments.length > 0) {
									return (
										<div
											key={chair.id}
											className="p-1.5 border-r border-[var(--line)] last:border-r-0 space-y-1.5 min-h-[56px] flex flex-col justify-center"
										>
											{cellAppointments.map((a) => {
												const pName = patientName(
													dashboard.patients,
													a.patientId,
												);
												const aStart = toDateTimeLocalValue(
													a.startsAt,
													timezone,
												).slice(11, 16);
												const aEnd = toDateTimeLocalValue(
													a.endsAt,
													timezone,
												).slice(11, 16);

												const patObj = dashboard.patients?.find((p) => p.id === a.patientId);
												const docObj = dashboard.clinicSettings?.staff?.find((s) => s.id === a.doctorUserId);
												const collision = collisionMap.get(a.id);
												const isCito = Boolean(
													(a as any)?.isCito ||
													(a as any)?.cito ||
													(a?.reason ?? "").toLowerCase().includes("cito") ||
													(a?.reason ?? "").toLowerCase().includes("острая боль") ||
													(a?.reason ?? "").toLowerCase().includes("срочн")
												);
												const rawBal = patObj?.balanceRub ?? (patObj as { balance?: number | string | null } | undefined)?.balance;
												const pBalance = rawBal !== undefined && rawBal !== null && rawBal !== "" && Number.isFinite(Number(rawBal)) ? Number(rawBal) : null;
												const pAllergyAlert = (() => {
													const rawAllergies =
														(patObj as { allergies?: string | null } | undefined)?.allergies ||
														(patObj as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
													if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim()) {
														return `Внимание: ${rawAllergies.trim()}`;
													}
													const notes = patObj?.notes || "";
													const match = notes.match(/аллерги[яеи][^.;\n]*/i);
													if (match) {
														return `Внимание: ${match[0].trim()}`;
													}
													if (
														/лидокаин/i.test(a?.reason || "") ||
														/аллерги/i.test(a?.reason || "")
													) {
														return "Внимание: Аллергия на лидокаин";
													}
													return null;
												})();

												return (
													<div
														key={a.id}
														draggable
														onMouseEnter={() => handleAppointmentMouseEnter(a.id)}
														onMouseLeave={handleAppointmentMouseLeave}
														onFocus={() => handleAppointmentMouseEnter(a.id)}
														onBlur={handleAppointmentMouseLeave}
														onDragStart={(e) => {
															e.dataTransfer.setData(
																"application/json",
																JSON.stringify({
																	type: "appointment",
																	appointmentId: a.id,
																	doctorUserId: a.doctorUserId,
																	durationMinutes: Math.round((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60000) || 30,
																}),
															);
															e.dataTransfer.effectAllowed = "move";
														}}
														className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex flex-col justify-between gap-1.5 transition-all min-h-[52px] cursor-grab active:cursor-grabbing relative ${
															collision
																? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50"
																: isCito
																	? "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/60 font-bold"
																	: a.status === "confirmed"
																		? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200"
																		: a.status === "in_treatment"
																			? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))]/50 text-[var(--teal-dark,var(--teal))]"
																			: a.status === "arrived"
																				? "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200"
																				: a.status === "completed"
																					? "bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400"
																					: a.status === "cancelled" || a.status === "no_show"
																						? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70"
																						: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]"
														}`}
													>
														{/* macOS Hover HUD с задержкой 150ms без сдвига сетки расписания (Apple HIG Progressive Disclosure) */}
														{hoveredApptId === a.id && (() => {
															const isNearBottom = hIndex >= 8;
															const isNearRightEdge = chairIndex >= effectiveChairs.length - 1 && effectiveChairs.length > 1;
															return (
															<div
																className={`appointment-patient-hover-preview absolute ${isNearRightEdge ? "right-0 left-auto" : "left-0"} ${isNearBottom ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5"} w-[330px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-50 pointer-events-auto`}
																data-testid="schedule-grid-patient-hover-preview"
																onMouseEnter={() => {
																	if (hoverTimeoutRef.current) {
																		clearTimeout(hoverTimeoutRef.current);
																		hoverTimeoutRef.current = null;
																	}
																	setHoveredApptId(a.id);
																}}
																onMouseLeave={handleAppointmentMouseLeave}
															>
																{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
																<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
																	<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
																		<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		{pName || "Пациент"}
																	</span>
																	{pBalance !== null ? (
																		<span
																			className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap ${
																				pBalance > 0
																					? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
																					: pBalance < 0
																						? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
																						: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
																			}`}
																			title={
																				pBalance > 0
																					? "Аванс / Депозит (54-ФЗ)"
																					: pBalance < 0
																						? "Задолженность по 54-ФЗ"
																						: "Оплачено по 54-ФЗ"
																			}
																		>
																			{pBalance > 0
																				? `Депозит: +${pBalance.toLocaleString("ru-RU")} ₽`
																				: pBalance < 0
																					? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
																					: "Оплата: 54-ФЗ (0 ₽)"}
																		</span>
																	) : (
																		<span className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20 shrink-0 whitespace-nowrap">
																			54-ФЗ: Баланс 0 ₽
																		</span>
																	)}
																</div>

																{/* 2. Номер телефона с кнопкой WhatsApp и копированием SMS */}
																<div className="flex items-center justify-between gap-2">
																	<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
																		<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		<span>{patObj?.phone || "Телефон не указан"}</span>
																	</div>
																	{patObj?.phone && (
																		<div className="flex items-center gap-1">
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					const text = generateAppointmentWhatsAppMessage({
																						patientName: pName,
																						doctorName: docObj?.fullName,
																						doctorSpecialty: docObj?.role,
																						appointmentStartsAt: a.startsAt,
																						clinicName: dashboard.clinicSettings?.profile?.clinicName,
																						clinicAddress: dashboard.clinicSettings?.profile?.address,
																						clinicPhone: dashboard.clinicSettings?.profile?.phone,
																						treatmentReason: a.reason,
																					});
																					openWhatsAppChat(patObj.phone!, text);
																				}}
																				className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
																				title="Открыть чат в WhatsApp"
																			>
																				<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
																				<span>WhatsApp</span>
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					const text = generateAppointmentWhatsAppMessage({
																						patientName: pName,
																						doctorName: docObj?.fullName,
																						doctorSpecialty: docObj?.role,
																						appointmentStartsAt: a.startsAt,
																						clinicName: dashboard.clinicSettings?.profile?.clinicName,
																						clinicAddress: dashboard.clinicSettings?.profile?.address,
																						clinicPhone: dashboard.clinicSettings?.profile?.phone,
																						treatmentReason: a.reason,
																					});
																					if (typeof navigator !== "undefined" && navigator.clipboard) {
																						void navigator.clipboard.writeText(text);
																						showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
																					}
																				}}
																				className="p-1 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer"
																				title="Скопировать SMS напоминание"
																			>
																				<Copy size={13} />
																			</button>
																		</div>
																	)}
																</div>

																{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
																{pAllergyAlert && (
																	<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
																		<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
																		<span>{pAllergyAlert}</span>
																	</div>
																)}

																{/* 4. Процедура и список зубов */}
																<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
																	<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
																		<Clock size={13} className="text-[var(--teal)] shrink-0" />
																		<span className="font-semibold">
																			{a?.reason || (a as Record<string, any>)?.notes || a?.comment || "Консультация стоматолога"}
																		</span>
																	</div>
																	{/* Список зубов */}
																	{(() => {
																		const teeth = extractTeethList(a);
																		if (teeth.length === 0) return null;
																		return (
																			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
																				<span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
																				{teeth.map((t) => (
																					<span
																						key={t}
																						className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
																					>
																						{t}
																					</span>
																				))}
																			</div>
																		);
																	})()}
																</div>

																{/* 5. Врач, ассистент, кресло */}
																<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
																	<div className="flex items-center justify-between gap-1">
																		<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
																			<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
																			<span className="truncate">
																				{docObj?.fullName || "Врач не назначен"}
																			</span>
																		</span>
																		{docObj?.specialties && docObj.specialties.length > 0 && (
																			<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
																				{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
																			</span>
																		)}
																	</div>
																	{/* Ассистент */}
																	<div className="flex items-center gap-1 text-[var(--muted)]">
																		<User size={12} className="shrink-0 opacity-70" />
																		<span>
																			Ассистент: {(() => {
																				const asstObj = a.assistantUserId ? dashboard.clinicSettings?.staff?.find((s) => s.id === a.assistantUserId) : null;
																				return asstObj?.fullName || "Не назначен";
																			})()}
																		</span>
																	</div>
																	{/* Кресло и время */}
																	<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
																		<span>Кабинет: {chair.name}</span>
																		<span className="font-bold text-[var(--ink)]">{aStart} – {aEnd}</span>
																	</div>
																</div>

																{/* 6. Быстрая смена статуса в Hover HUD */}
																{onQuickStatusChange && (
																	<div className="pt-2 border-t border-[var(--line)]">
																		<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
																			Быстрый статус (Apple HIG)
																		</div>
																		<div className="grid grid-cols-3 gap-1">
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "confirmed");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "confirmed"
																						? "bg-emerald-600 text-white border-emerald-600"
																						: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
																				}`}
																			>
																				<PhoneCall size={11} />
																				<span>Подтвержден</span>
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "arrived");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "arrived"
																						? "bg-amber-500 text-white border-amber-500"
																						: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
																				}`}
																			>
																				<UserCheck size={11} />
																				<span>Пришел</span>
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "in_treatment");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "in_treatment"
																						? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
																						: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
																				}`}
																			>
																				<CalendarCheck size={11} />
																				<span>В кресле</span>
																			</button>
																		</div>
																	</div>
																)}
															</div>
															);
														})()}

														{/* Карточка записи: 3 главных фокуса (ФИО, процедура, цветной маркер статуса) по стандарту Apple HIG */}
														<div
															onClick={() => {
																if (typeof window !== "undefined" && window.innerWidth < 768) {
																	setSelectedMobileAppt(a);
																} else {
																	onAppointmentClick(a);
																}
															}}
															className="cursor-pointer flex items-center justify-between gap-2"
															role="button"
															tabIndex={0}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	onAppointmentClick(a);
																}
															}}
														>
															<div className="flex-1 min-w-0">
																{/* Фокус 1: ФИО */}
																<div className="font-bold flex items-center gap-1 leading-snug break-words text-xs">
																	<User size={12} className="shrink-0 text-[var(--teal)]" />
																	<span className="break-words" title={pName}>{formatPatientDisplayFio(pName)}</span>
																</div>
																{/* Фокус 2: Процедура и время */}
																<div className="text-xs opacity-75 font-normal truncate">
																	{aStart} - {aEnd} · {a.reason || "Прием"}
																</div>
																{docObj && (
																	<div className="text-xs opacity-85 font-medium truncate flex items-center gap-1 mt-0.5">
																		<Stethoscope size={12} className="shrink-0 text-[var(--teal)]" />
																		<span className="truncate">
																			{docObj.fullName
																				?.split(" ")
																				.map((part, index) => (index === 0 ? part : `${part[0]}.`))
																				.join(" ") || docObj.fullName}
																		</span>
																		{docObj.specialties && docObj.specialties.length > 0 && (
																			<span className="text-xs px-1 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
																				{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
																			</span>
																		)}
																	</div>
																)}
															</div>
															{/* Фокус 3: Цветовой маркер статуса */}
															<div className="flex items-center gap-1 shrink-0">
																{isCito && (
																	<span
																		className="text-xs px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold flex items-center gap-0.5 animate-pulse shrink-0"
																		title="CITO! Прием по острой боли"
																		data-testid="schedule-grid-cito-badge"
																	>
																		<Zap size={11} className="fill-white" />
																		<span>CITO</span>
																	</span>
																)}
																<span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
																	a.status === "in_treatment"
																		? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
																		: a.status === "arrived"
																			? "bg-amber-500 text-white shadow-xs"
																			: a.status === "confirmed"
																				? "bg-emerald-600 text-white shadow-xs"
																				: a.status === "completed"
																					? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
																					: "bg-[var(--paper)]/80 text-[var(--ink)]"
																}`}>
																	{a.status === "in_treatment" && (
																		<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
																	)}
																	{a.status === "completed" && (
																		<Check size={11} className="shrink-0 text-current" />
																	)}
																	<span>{appointmentLabels[a.status] || a.status}</span>
																</span>
															</div>
														</div>

														{/* Collision Alert Pill if overlapping */}
														{collision && (
															<div
																className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1 shadow-xs animate-pulse"
																data-testid="schedule-grid-collision-badge"
																title={
																	collision.sameDoctor && !collision.sameChair
																		? "Коллизия: врач записан в два кабинета одновременно!"
																		: collision.sameDoctor && collision.sameChair
																			? "Коллизия: двойная запись у врача в одном кабинете!"
																			: collision.sameChair
																				? "Коллизия: два пациента в одном кресле одновременно!"
																				: collision.sameAssistant
																					? "Коллизия: ассистент занят в другом приеме!"
																					: "Коллизия: пациент записан на два приема одновременно!"
																}
															>
																<AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
																<span className="truncate">
																	{collision.sameDoctor && !collision.sameChair
																		? "Коллизия: врач записан в два кабинета одновременно"
																		: collision.sameDoctor && collision.sameChair
																			? "Коллизия: врач и кабинет"
																			: collision.sameChair
																				? "Коллизия: кабинет занят"
																				: collision.sameAssistant
																					? "Коллизия: ассистент"
																					: "Коллизия: пациент"}
																</span>
															</div>
														)}

														{/* Compact 2-Button Action Bar (Позвонить, Профиль) + More Options Dropdown (...) */}
														<div className="flex items-center gap-1.5 pt-1.5 border-t border-[var(--line)]/50 mt-1">
															{patObj?.phone ? (
																<a
																	href={`tel:${patObj.phone}`}
																	onClick={(e) => e.stopPropagation()}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Позвонить ${pName}: ${patObj.phone}`}
																	aria-label={`Позвонить ${pName}`}
																>
																	<Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Позвонить</span>
																</a>
															) : (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		onAppointmentClick(a);
																	}}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Открыть прием ${pName}`}
																	aria-label={`Открыть прием ${pName}`}
																>
																	<User size={14} className="text-[var(--teal)] shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Прием</span>
																</button>
															)}

															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	onAppointmentClick(a);
																}}
																className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--teal,var(--brand-primary))]/40 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																title={`Открыть профиль ${pName}`}
																aria-label={`Открыть профиль ${pName}`}
															>
																<User size={14} className="text-[var(--teal)] shrink-0" />
																<span className="whitespace-nowrap">Профиль</span>
															</button>

															{/* Overflow Actions Dropdown Menu (...) */}
															<div className="relative ml-auto">
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		setActiveMenuApptId((prev) => (prev === a.id ? null : a.id));
																	}}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none"
																	title="Все действия и статусы визита"
																	aria-label="Дополнительные действия визита"
																	aria-expanded={activeMenuApptId === a.id}
																>
																	<MoreVertical size={16} />
																</button>

																{activeMenuApptId === a.id && (
																	<div
																		className="absolute right-0 bottom-full mb-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[210px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
																		onClick={(e) => e.stopPropagation()}
																	>
																		<div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
																			Статус визита
																		</div>
																		{onQuickStatusChange && (
																			<div className="space-y-0.5">
																				<button
																					type="button"
																					title="Подтвержден"
																					onClick={() => {
																						onQuickStatusChange(a.id, "confirmed");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "confirmed"
																							? "bg-violet-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-violet-700 dark:text-violet-300"
																					}`}
																				>
																					<PhoneCall size={14} />
																					<span>Подтвержден</span>
																				</button>
																				<button
																					type="button"
																					title="Пришел"
																					onClick={() => {
																						onQuickStatusChange(a.id, "arrived");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "arrived"
																							? "bg-emerald-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
																					}`}
																				>
																					<UserCheck size={14} />
																					<span>Пришел</span>
																				</button>
																				<button
																					type="button"
																					title="В кресле"
																					onClick={() => {
																						onQuickStatusChange(a.id, "in_treatment");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "in_treatment"
																							? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
																					}`}
																				>
																					<CalendarCheck size={14} />
																					<span>В кресле</span>
																				</button>
																				<button
																					type="button"
																					title="Завершен"
																					onClick={() => {
																						onQuickStatusChange(a.id, "completed");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "completed"
																							? "bg-slate-600 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
																					}`}
																				>
																					<CheckCircle2 size={14} />
																					<span>Завершен</span>
																				</button>
																				<button
																					type="button"
																					title="Не явился"
																					onClick={() => {
																						onQuickStatusChange(a.id, "no_show");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "no_show"
																							? "bg-rose-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
																					}`}
																				>
																					<UserX size={14} />
																					<span>Не явился</span>
																				</button>
																			</div>
																		)}

																		{patObj?.phone && (
																			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																					Связь
																				</div>
																				<button
																					type="button"
																					onClick={() => {
																						const text = generateAppointmentWhatsAppMessage({
																							patientName: pName,
																							doctorName: docObj?.fullName,
																							doctorSpecialty: docObj?.role,
																							appointmentStartsAt: a.startsAt,
																							clinicName: dashboard.clinicSettings?.profile?.clinicName,
																							clinicAddress: dashboard.clinicSettings?.profile?.address,
																							clinicPhone: dashboard.clinicSettings?.profile?.phone,
																							treatmentReason: a.reason,
																						});
																						openWhatsAppChat(patObj.phone!, text);
																						setActiveMenuApptId(null);
																					}}
																					className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 font-bold transition-colors cursor-pointer"
																				>
																					<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
																					<span>WhatsApp напоминание</span>
																				</button>

																				<button
																					type="button"
																					onClick={() => {
																						const text = generateAppointmentWhatsAppMessage({
																							patientName: pName,
																							doctorName: docObj?.fullName,
																							doctorSpecialty: docObj?.role,
																							appointmentStartsAt: a.startsAt,
																							clinicName: dashboard.clinicSettings?.profile?.clinicName,
																							clinicAddress: dashboard.clinicSettings?.profile?.address,
																							clinicPhone: dashboard.clinicSettings?.profile?.phone,
																							treatmentReason: a.reason,
																						});
																						if (typeof navigator !== "undefined" && navigator.clipboard) {
																							void navigator.clipboard.writeText(text);
																							showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
																						}
																						setActiveMenuApptId(null);
																					}}
																					className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium transition-colors cursor-pointer"
																				>
																					<Copy size={14} className="text-[var(--teal)]" />
																					<span>Скопировать SMS</span>
																				</button>
																			</div>
																		)}
																	</div>
																)}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									);
								}

								// Empty cell with 1-click booking & Drag-and-Drop collision safety
								return (
									<div
										key={chair.id}
										className="p-1 border-r border-[var(--line)] last:border-r-0 min-h-[56px] flex items-center justify-center"
										onDragOver={(e) => {
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
										}}
										onDrop={(e) => {
											e.preventDefault();
											try {
												const rawData = e.dataTransfer.getData("application/json");
												if (!rawData) return;
												const data = JSON.parse(rawData);
												if (data?.type === "appointment" && data.appointmentId) {
													const sourceAppt = (appointments ?? []).find((x) => x.id === data.appointmentId);
													if (!sourceAppt) return;
													const targetChairId = chair.id !== "default-chair" ? chair.id : null;
													const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
													const targetDoctorId = selectedDoctorId || assignedDocId || sourceAppt.doctorUserId;
													const slotDuration = data.durationMinutes || 30;
													const targetStartIso = `${dateKey}T${hour}:00:00.000Z`;
													const targetEndIso = new Date(Date.parse(targetStartIso) + slotDuration * 60000).toISOString();

													// Pre-check collision before move to protect administrator from accidental double-booking
													const collisionCheck = checkAppointmentResourceCollision(
														{
															startsAt: targetStartIso,
															endsAt: targetEndIso,
															doctorUserId: targetDoctorId,
															chairId: targetChairId,
															patientId: sourceAppt.patientId,
														},
														appointments,
														{
															excludeAppointmentId: sourceAppt.id,
															staff: dashboard?.clinicSettings?.staff,
															chairs: dashboard?.clinicSettings?.chairs,
															patients: dashboard?.patients,
															formatTimeFn: (iso) => toDateTimeLocalValue(iso, timezone).slice(11, 16),
														},
													);

													if (collisionCheck.hasCollision) {
														showToast(`Внимание: ${collisionCheck.message}. Запись перенесена с овербукингом`, "warning", 4500);
													}

													if (typeof onAppointmentMove === "function") {
														void Promise.resolve(
															onAppointmentMove(sourceAppt.id, {
																startsAt: targetStartIso,
																endsAt: targetEndIso,
																chairId: targetChairId,
																doctorUserId: targetDoctorId,
																allowOverbooking: true,
															}),
														).then((result) => {
															if (result !== false) {
																const pName = patientName ? patientName(dashboard?.patients ?? [], sourceAppt.patientId) : "Пациент";
																showToast(`«${pName}» перенесен(а) на ${hour}`, "success", 3000);
															}
														});
													} else {
														onSlotClick({
															dateKey,
															startTime: hour,
															chairId: targetChairId,
															doctorUserId: targetDoctorId,
															durationMinutes: slotDuration,
															patientId: sourceAppt.patientId,
															reason: sourceAppt.reason || undefined,
														});
													}
												} else if (data?.type === "waitlist_item" && data.item) {
													const waitlistItem = data.item;
													const targetChairId = chair.id !== "default-chair" ? chair.id : null;
													const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
													const targetDoctorId = selectedDoctorId || assignedDocId || waitlistItem.preferredDoctorId || (dashboard?.clinicSettings?.staff?.find((m) => m.active && m.role === "doctor")?.id ?? null);
													const slotDuration = waitlistItem.durationMinutes || 30;
													const targetStartIso = `${dateKey}T${hour}:00:00.000Z`;
													const targetEndIso = new Date(Date.parse(targetStartIso) + slotDuration * 60000).toISOString();

													// Pre-check collision before booking from waitlist
													const collisionCheck = checkAppointmentResourceCollision(
														{
															startsAt: targetStartIso,
															endsAt: targetEndIso,
															doctorUserId: targetDoctorId,
															chairId: targetChairId,
															patientId: waitlistItem.patientId,
														},
														appointments,
														{
															staff: dashboard?.clinicSettings?.staff,
															chairs: dashboard?.clinicSettings?.chairs,
															patients: dashboard?.patients,
															formatTimeFn: (iso) => toDateTimeLocalValue(iso, timezone).slice(11, 16),
														},
													);

													if (collisionCheck.hasCollision) {
														showToast(`Назначение заблокировано: ${collisionCheck.message}`, "error", 5000);
														return;
													}

													onSlotClick({
														dateKey,
														startTime: hour,
														chairId: targetChairId,
														doctorUserId: targetDoctorId,
														durationMinutes: slotDuration,
														patientId: waitlistItem.patientId,
														reason: waitlistItem.reason || "Запись из листа ожидания",
													});

													if (waitlistItem.id) {
														fetch(`/api/waitlist/${waitlistItem.id}`, {
															method: "PUT",
															headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
															body: JSON.stringify({ status: "fulfilled" }),
														}).catch((err) => {
															console.warn("Failed to fulfill waitlist item:", err);
														});
													}

													showToast(
														`Пациент «${waitlistItem.patientName || "из очереди"}» назначен в свободное окно (${hour}:00)`,
														"success",
														4000,
													);
												}
											} catch {
												// Ignore invalid JSON drop
											}
										}}
									>
										{(() => {
											const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
											const isEmergencyBuffer = emergencyReserveSlots.some((r) => {
												const rHour = toDateTimeLocalValue(r.startTime, timezone).slice(11, 13);
												return rHour === hour.slice(0, 2);
											});

											if (isEmergencyBuffer) {
												return (
													<button
														type="button"
														onClick={() =>
															onSlotClick({
																dateKey,
																startTime: hour,
																chairId: chair.id,
																doctorUserId: assignedDocId || selectedDoctorId || null,
																durationMinutes: 30,
																reason: "Острая боль (CITO Резерв)",
															})
														}
														className="w-full h-full min-h-[48px] rounded-xl border border-dashed border-amber-400/80 dark:border-amber-600 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs whitespace-nowrap shrink-0"
														title={`Экстренный резерв (CITO): ${hour} (${chair.name}). Буфер 30 мин для пациентов с острой болью`}
														aria-label={`Экстренный резерв на ${hour}, кресло ${chair.name}. Буфер 30 минут по острой боли`}
														data-testid="schedule-emergency-buffer-slot"
													>
														<Zap size={14} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
														<span className="text-xs whitespace-nowrap shrink-0">Резерв: Острая боль ({hour})</span>
													</button>
												);
											}

											const hasDoctorForDay = Boolean(effectiveChairAssignments[chair.id]?.doctorId);
											const isOffDuty = hasDoctorForDay && !assignedDocId;

											if (isOffDuty) {
												return (
													<button
														type="button"
														onClick={() =>
															onSlotClick({
																dateKey,
																startTime: hour,
																chairId: chair.id,
																doctorUserId: selectedDoctorId || null,
																durationMinutes: 30,
															})
														}
														className="w-full h-full min-h-[48px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 hover:border-[var(--teal)]/40 hover:bg-[var(--teal-surface)]/50 text-[var(--muted)] hover:text-[var(--teal-dark)] text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer focus:ring-2 focus:ring-[var(--teal)] focus:outline-none whitespace-nowrap shrink-0 opacity-75 hover:opacity-100"
														title={`Вне графика смены врача на ${hour} (${chair.name}). Нажмите для записи вне графика`}
														aria-label={`Вне графика врача на ${hour}, кресло ${chair.name}`}
														data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
													>
														<div className="flex items-center gap-1">
															<Clock size={12} className="opacity-50 shrink-0" />
															<span className="text-[11px] font-medium text-[var(--muted)]">Вне смены</span>
														</div>
														<span className="text-[10px] text-[var(--muted)] opacity-70">{hour}</span>
													</button>
												);
											}

											return (
												<button
													type="button"
													onClick={() =>
														onSlotClick({
															dateKey,
															startTime: hour,
															chairId: chair.id,
															doctorUserId: assignedDocId || selectedDoctorId || null,
															durationMinutes: 30,
														})
													}
													className="w-full h-full min-h-[48px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] dark:bg-[rgba(255,255,255,0.03)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-[var(--teal)] focus:outline-none whitespace-nowrap shrink-0"
													title={`Записать на ${hour} (${chair.name})`}
													aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
													data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
												>
													<Plus size={14} className="text-[var(--teal)] opacity-60 group-hover:opacity-100 shrink-0" />
													<span className="text-xs whitespace-nowrap shrink-0">Записать на {hour}</span>
												</button>
											);
										})()}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>

	{/* Mobile Native Bottom Sheet for Progressive Disclosure on tap */}
	{selectedMobileAppt && (() => {
		const mPatName = patientName(dashboard.patients, selectedMobileAppt.patientId);
		const mPatObj = dashboard.patients?.find((p) => p.id === selectedMobileAppt.patientId);
		const mDocObj = dashboard.clinicSettings?.staff?.find((s) => s.id === selectedMobileAppt.doctorUserId);
		const mChairObj = dashboard.clinicSettings?.chairs?.find((c) => c.id === selectedMobileAppt.chairId) || (selectedMobileAppt.chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : undefined);
		const mRawBal = mPatObj?.balanceRub ?? (mPatObj as { balance?: number | string | null } | undefined)?.balance;
		const mBalance = mRawBal !== undefined && mRawBal !== null && mRawBal !== "" && Number.isFinite(Number(mRawBal)) ? Number(mRawBal) : null;
		const mTeeth = extractTeethList(selectedMobileAppt);
		const mStart = toDateTimeLocalValue(selectedMobileAppt.startsAt, timezone).slice(11, 16);
		const mEnd = toDateTimeLocalValue(selectedMobileAppt.endsAt, timezone).slice(11, 16);
		const mAllergyAlert = (() => {
			const rawAllergies =
				(mPatObj as { allergies?: string | null } | undefined)?.allergies ||
				(mPatObj as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
			if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim()) {
				return `Внимание: ${rawAllergies.trim()}`;
			}
			const notes = mPatObj?.notes || "";
			const match = notes.match(/аллерги[яеи][^.;\n]*/i);
			if (match) {
				return `Внимание: ${match[0].trim()}`;
			}
			if (
				/лидокаин/i.test(selectedMobileAppt?.reason || "") ||
				/аллерги/i.test(selectedMobileAppt?.reason || "")
			) {
				return "Внимание: Аллергия на лидокаин";
			}
			return null;
		})();

		return (
			<div
				className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
				onClick={() => setSelectedMobileAppt(null)}
				role="dialog"
				aria-modal="true"
				aria-label="Подробности приёма"
				data-testid="schedule-grid-mobile-bottom-sheet"
			>
				<div
					className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Top Grab Handle */}
					<div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

					{/* Header */}
					<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
						<div className="min-w-0 flex-1">
							<div className="text-lg font-black text-[var(--ink)] truncate">
								{mPatName}
							</div>
							<div className="text-xs text-[var(--muted)] font-medium">
								{mStart} – {mEnd} · {selectedMobileAppt.reason || "Прием"}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedMobileAppt(null)}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>

					{/* 54-FZ Payment status & Balance banner */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
						<span className="font-bold text-[var(--muted)]">Статус 54-ФЗ / Баланс:</span>
						{mBalance !== null ? (
							<span
								className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
									mBalance > 0
										? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
										: mBalance < 0
											? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
											: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
								}`}
							>
								{mBalance > 0
									? `Депозит: +${mBalance.toLocaleString("ru-RU")} ₽`
									: mBalance < 0
										? `Долг: ${Math.abs(mBalance).toLocaleString("ru-RU")} ₽`
										: "0 ₽ (Оплачено 54-ФЗ)"}
							</span>
						) : (
							<span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">0 ₽ (54-ФЗ)</span>
						)}
					</div>

					{/* Phone & WhatsApp */}
					{mPatObj?.phone && (
						<div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
								<Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>{mPatObj.phone}</span>
							</div>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => {
										const text = generateAppointmentWhatsAppMessage({
											patientName: mPatName,
											doctorName: mDocObj?.fullName,
											doctorSpecialty: mDocObj?.role,
											appointmentStartsAt: selectedMobileAppt.startsAt,
											clinicName: dashboard.clinicSettings?.profile?.clinicName,
											clinicAddress: dashboard.clinicSettings?.profile?.address,
											clinicPhone: dashboard.clinicSettings?.profile?.phone,
											treatmentReason: selectedMobileAppt.reason,
										});
										openWhatsAppChat(mPatObj.phone!, text);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
								>
									<MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
									<span>WhatsApp</span>
								</button>
								<button
									type="button"
									onClick={() => {
										const text = generateAppointmentWhatsAppMessage({
											patientName: mPatName,
											doctorName: mDocObj?.fullName,
											doctorSpecialty: mDocObj?.role,
											appointmentStartsAt: selectedMobileAppt.startsAt,
											clinicName: dashboard.clinicSettings?.profile?.clinicName,
											clinicAddress: dashboard.clinicSettings?.profile?.address,
											clinicPhone: dashboard.clinicSettings?.profile?.phone,
											treatmentReason: selectedMobileAppt.reason,
										});
										if (typeof navigator !== "undefined" && navigator.clipboard) {
											void navigator.clipboard.writeText(text);
											showToast(`Текст напоминания скопирован`, "success");
										}
									}}
									className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
									title="Скопировать SMS"
								>
									<Copy size={16} />
								</button>
							</div>
						</div>
					)}

					{/* Allergy alert */}
					{mAllergyAlert && (
						<div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
							<AlertTriangle size={16} className="text-amber-600 shrink-0 animate-bounce" />
							<span>{mAllergyAlert}</span>
						</div>
					)}

					{/* Teeth List */}
					{mTeeth.length > 0 && (
						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
							<div className="font-bold text-[var(--muted)]">Список зубов:</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{mTeeth.map((t) => (
									<span
										key={t}
										className="px-2 py-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-black font-mono"
									>
										Зуб {t}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Doctor & Assistant */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Врач:</span>
							<span className="font-bold">{mDocObj?.fullName || "Не назначен"}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Ассистент:</span>
							<span>
								{(() => {
									const asst = selectedMobileAppt.assistantUserId
										? dashboard.clinicSettings?.staff?.find((s) => s.id === selectedMobileAppt.assistantUserId)
										: null;
									return asst?.fullName || "Не назначен";
								})()}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Кабинет:</span>
							<span className="font-mono font-semibold">{mChairObj?.name || "Кабинет 1"}</span>
						</div>
					</div>

					{/* Quick Status Buttons */}
					{onQuickStatusChange && (
						<div className="space-y-2">
							<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
								Сменить статус визита:
							</div>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "confirmed");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<PhoneCall size={14} />
									<span>Подтвержден</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "arrived");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<UserCheck size={14} />
									<span>Пришел</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "in_treatment");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)] flex items-center justify-center gap-2 cursor-pointer"
								>
									<CalendarCheck size={14} />
									<span>В кресле</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "completed");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<CheckCircle2 size={14} />
									<span>Завершен</span>
								</button>
							</div>
						</div>
					)}

					{/* Primary Action Button */}
					<div className="pt-2">
						<button
							type="button"
							onClick={() => {
								setSelectedMobileAppt(null);
								onAppointmentClick(selectedMobileAppt);
							}}
							className="w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
						>
							<User size={16} />
							<span>Открыть карту приема</span>
						</button>
					</div>
				</div>
			</div>
		);
	})()}

	{/* 1-Click Chair-to-Doctor Shift Allocation Modal (StomX / DentalPRO Parity) */}
	{assigningChairId && (() => {
		const targetChair = effectiveChairs.find((c) => c.id === assigningChairId) || { id: assigningChairId, name: "Кресло" };
		const currentAssignment = effectiveChairAssignments[assigningChairId];
		const hasActiveAssignment = Boolean(currentAssignment && currentAssignment.doctorId);

		return (
			<div
				className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
				onClick={() => setAssigningChairId(null)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="chair-doctor-modal-title"
				data-testid="chair-doctor-assignment-modal"
			>
				<div
					className="bg-[var(--paper-strong)] border-2 border-[var(--teal,var(--brand-primary))] rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150 text-[var(--ink)]"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Modal Header */}
					<div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
						<div className="flex items-center gap-2.5">
							<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal)]/30 flex items-center justify-center text-[var(--teal)] shrink-0">
								<Stethoscope size={20} />
							</div>
							<div className="min-w-0">
								<h3 id="chair-doctor-modal-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
									Назначение врача на кресло
								</h3>
								<p className="text-xs text-[var(--muted)] truncate">
									{targetChair.name} · {dateKey}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setAssigningChairId(null)}
							className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
							aria-label="Закрыть окно назначения"
							data-testid="btn-close-chair-doctor-modal"
						>
							<X size={18} />
						</button>
					</div>

					{/* Modal Form */}
					<div className="space-y-4">
						{/* Shift presets */}
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
								Режим смены *
							</label>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{CHAIR_SHIFT_PRESETS.map((preset) => {
									const isSelected = modalShiftPreset === preset.id;
									return (
										<button
											key={preset.id}
											type="button"
											onClick={() => setModalShiftPreset(preset.id)}
											className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
												isSelected
													? "border-[var(--teal)] bg-[var(--teal-dark)] text-white shadow-xs"
													: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
											}`}
											data-testid={`shift-preset-${preset.id}`}
										>
											<span className="text-xs font-bold">{preset.label}</span>
											<span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
												{preset.hours}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Doctor select: if two_shifts -> Morning + Evening, else single */}
						{modalShiftPreset === "two_shifts" ? (
							<div className="space-y-3.5">
								{/* Morning Doctor (08:00–14:00) */}
								<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 space-y-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										Врач на утренней смене (08:00–14:00) *
									</label>
									<select
										value={modalDoctorId}
										onChange={(e) => setModalDoctorId(e.target.value)}
										className="w-full min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="select-chair-doctor"
									>
										<option value="">-- Выберите врача на утро --</option>
										{doctors.map((d) => (
											<option key={d.id} value={d.id}>
												{d.fullName}
												{d.specialties && d.specialties.length > 0
													? ` (${d.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
													: ""}
											</option>
										))}
									</select>
									{doctors.length > 1 && (
										<div className="space-y-1">
											<span className="text-[11px] font-semibold text-[var(--muted)] block">
												Быстрый выбор (1 тап):
											</span>
											<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
												{doctors.map((d) => {
													const isSelected = modalDoctorId === d.id;
													const shortName = formatDoctorShortName(d.fullName);
													return (
														<button
															key={d.id}
															type="button"
															onClick={() => setModalDoctorId(d.id)}
															className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
																isSelected
																	? "bg-[var(--teal-dark)] text-white border-[var(--teal)] shadow-xs"
																	: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
															}`}
															data-testid={`btn-quick-select-doctor-${d.id}`}
															style={{ minHeight: "44px" }}
														>
															<User size={13} className={isSelected ? "text-white" : "text-[var(--teal)]"} />
															<span>{shortName}</span>
														</button>
													);
												})}
											</div>
										</div>
									)}
								</div>

								{/* Evening Doctor (14:00–20:00) */}
								<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 space-y-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										Врач на вечерней смене (14:00–20:00) *
									</label>
									<select
										value={modalEveningDoctorId}
										onChange={(e) => setModalEveningDoctorId(e.target.value)}
										className="w-full min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="select-chair-evening-doctor"
									>
										<option value="">-- Выберите врача на вечер --</option>
										{doctors.map((d) => (
											<option key={d.id} value={d.id}>
												{d.fullName}
												{d.specialties && d.specialties.length > 0
													? ` (${d.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
													: ""}
											</option>
										))}
									</select>
									{doctors.length > 1 && (
										<div className="space-y-1">
											<span className="text-[11px] font-semibold text-[var(--muted)] block">
												Быстрый выбор (1 тап):
											</span>
											<div className="flex flex-wrap gap-1.5" data-testid="evening-doctor-quick-switch-pills">
												{doctors.map((d) => {
													const isSelected = modalEveningDoctorId === d.id;
													const shortName = formatDoctorShortName(d.fullName);
													return (
														<button
															key={d.id}
															type="button"
															onClick={() => setModalEveningDoctorId(d.id)}
															className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
																isSelected
																	? "bg-[var(--teal-dark)] text-white border-[var(--teal)] shadow-xs"
																	: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
															}`}
															data-testid={`btn-quick-select-evening-doctor-${d.id}`}
															style={{ minHeight: "44px" }}
														>
															<User size={13} className={isSelected ? "text-white" : "text-[var(--teal)]"} />
															<span>{shortName}</span>
														</button>
													);
												})}
											</div>
										</div>
									)}
								</div>
							</div>
						) : (
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
									Врач на смене *
								</label>
								<select
									value={modalDoctorId}
									onChange={(e) => setModalDoctorId(e.target.value)}
									className="w-full min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="select-chair-doctor"
								>
									<option value="">-- Выберите врача --</option>
									{doctors.map((d) => (
										<option key={d.id} value={d.id}>
											{d.fullName}
											{d.specialties && d.specialties.length > 0
												? ` (${d.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
												: ""}
										</option>
									))}
								</select>

								{/* 1-tap doctor quick-switch pills (StomX / DentalPRO parity) */}
								{doctors.length > 1 && (
									<div className="mt-2.5 space-y-1">
										<span className="text-[11px] font-semibold text-[var(--muted)] block">
											Быстрый выбор врача (1 тап):
										</span>
										<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
											{doctors.map((d) => {
												const isSelected = modalDoctorId === d.id;
												const shortName = formatDoctorShortName(d.fullName);
												return (
													<button
														key={d.id}
														type="button"
														onClick={() => setModalDoctorId(d.id)}
														className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
															isSelected
																? "bg-[var(--teal-dark)] text-white border-[var(--teal)] shadow-xs"
																: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
														}`}
														data-testid={`btn-quick-select-doctor-${d.id}`}
														style={{ minHeight: "44px" }}
													>
														<User size={13} className={isSelected ? "text-white" : "text-[var(--teal)]"} />
														<span>{shortName}</span>
													</button>
												);
											})}
										</div>
									</div>
								)}
							</div>
						)}

						{/* Actions */}
						<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
							{hasActiveAssignment ? (
								<button
									type="button"
									onClick={() => {
										handleUnassignDoctor(targetChair.id);
										setAssigningChairId(null);
									}}
									className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
									data-testid="btn-unassign-chair-doctor"
									title="Снять назначение врача с кресла (Мандат 8e)"
								>
									Снять назначение
								</button>
							) : (
								<div />
							)}
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setAssigningChairId(null)}
									className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-bold transition-colors cursor-pointer"
								>
									Отмена
								</button>
								<button
									type="button"
									onClick={() => {
										if (!modalDoctorId) {
											showToast("Выберите врача для назначения", "error");
											return;
										}
										if (modalShiftPreset === "two_shifts" && !modalEveningDoctorId) {
											showToast("Выберите вечернего врача для 2 смен", "error");
											return;
										}
										handleConfirmAssignDoctor(
											targetChair.id,
											modalDoctorId,
											modalShiftPreset,
											modalShiftPreset === "two_shifts" ? modalEveningDoctorId : undefined,
										);
										setAssigningChairId(null);
									}}
									className="primary-button min-h-[44px] px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
									data-testid="btn-confirm-chair-doctor"
								>
									<Check size={16} />
									<span>Закрепить за креслом</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	})()}

	{/* Quick Add Chair Modal for inline grid additions (only when not delegated to external onOpenAddChair) */}
	{!props.onOpenAddChair && isInternalAddChairModalOpen && (
		<QuickAddChairModal
			isOpen={isInternalAddChairModalOpen}
			onClose={() => setIsInternalAddChairModalOpen(false)}
			existingChairsCount={effectiveChairs.length}
			{...(props.onAddChair ? { onAddChair: props.onAddChair } : {})}
		/>
	)}
</div>
	);
});

