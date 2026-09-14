import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
	calculateEmergencyReserveSlots,
	type DoctorShiftSchedule,
	type EmergencyReserveSlot,
	getStomxWorkplacePalette,
	STOMX_WORKPLACE_PALETTES,
} from "@dental/shared";
import {
	AlertTriangle,
	Building2,
	Calendar,
	CalendarCheck,
	CalendarRange,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Copy,
	Edit2,
	Eye,
	EyeOff,
	FastForward,
	MessageSquare,
	Moon,
	MoreVertical,
	Phone,
	PhoneCall,
	Pin,
	Plus,
	Settings,
	Stethoscope,
	Sun,
	Trash2,
	User,
	UserCheck,
	UserMinus,
	UserPlus,
	Users,
	UserX,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
export { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { formatPatientDisplayFio } from "./AppointmentCard";
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
	type ChairMaintenanceBlock,
} from "../../utils/scheduleCollisionUtils";
export type { ChairMaintenanceBlock } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { calculateDailyChairDoctorTally } from "./doctorFreeSlotsEngine";
import { countLabel } from "../../lib/russianPlural";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { QuickAddChairModal, type QuickAddChairData } from "./QuickAddChairModal";
import { QuickAddDoctorModal, type QuickAddDoctorData } from "./QuickAddDoctorModal";
import { DoctorChairScheduleModal } from "./DoctorChairScheduleModal";
import {
	getMondayOfWeekIso,
	addDaysToDateIso,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	applyDoctorChairWeeklyTemplate,
} from "./roster/DoctorShiftRosterModal";
import "./chairSchedule.css";

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
	shiftPreset?: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "full_9_21" | "two_shifts" | "custom" | undefined;
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
		id: "morning_9" as const,
		label: "1 смена (09:00–15:00)",
		hours: "09:00–15:00",
		name: "1 см. 09:00–15:00",
		startHour: 9,
		endHour: 15,
	},
	{
		id: "evening_15" as const,
		label: "2 смена (15:00–21:00)",
		hours: "15:00–21:00",
		name: "2 см. 15:00–21:00",
		startHour: 15,
		endHour: 21,
	},
	{
		id: "full_9_21" as const,
		label: "Весь день (09:00–21:00)",
		hours: "09:00–21:00",
		name: "Весь день 09:00–21:00",
		startHour: 9,
		endHour: 21,
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

export function formatDoctorShortName(fullName?: string | null): string {
	if (!fullName) return "";
	const cleaned = fullName.trim();
	const parts = cleaned.split(/\s+/);
	const firstPart = parts[0];
	const nameParts =
		parts.length > 1 && firstPart && /^(д-р|доктор|врач)\.?$/i.test(firstPart)
			? parts.slice(1)
			: parts;
	if (nameParts.length === 0) return cleaned || "";
	const surname = nameParts[0] || "";
	if (!surname) return cleaned;
	if (nameParts.length === 1) return surname;

	const initials = nameParts
		.slice(1)
		.map((p) => {
			if (!p) return "";
			const matched = p.match(/[a-zA-Zа-яА-ЯёЁ]/g);
			if (!matched || matched.length === 0) return "";
			if (p.includes(".")) {
				return matched.map((l) => `${l.toUpperCase()}.`).join("");
			}
			const firstLetter = matched[0];
			return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
		})
		.join("");

	return initials ? `${surname} ${initials}` : surname;
}

export function isAppointmentInChair(status: string | undefined | null): boolean {
	if (!status) return false;
	const s = String(status).toLowerCase();
	return s === "in_treatment" || s === "in_progress";
}

export function getNormalizedAppointmentStatusLabel(
	status: string | undefined | null,
	labels?: Record<string, string>,
): string {
	if (!status) return "";
	const s = String(status).toLowerCase();
	if (s === "in_treatment" || s === "in_progress") return "В кресле";
	if (labels) {
		if (labels[s]) return labels[s];
		if (labels[status]) return labels[status];
	}
	return status;
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
	onAddChair?: ((chairData: QuickAddChairData) => Promise<any> | any) | undefined;
	onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
	onAddDoctor?: ((doctorData: QuickAddDoctorData) => Promise<any> | any) | undefined;
	gridStepMinutes?: 15 | 30 | 60 | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	chairMaintenanceBlocks?: ChairMaintenanceBlock[] | undefined;
	onAddChairMaintenance?: ((block: ChairMaintenanceBlock) => void) | undefined;
	onRemoveChairMaintenance?: ((blockId: string) => void) | undefined;
	hideToolbar?: boolean | undefined;
	hideInlineAddChair?: boolean | undefined;
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

export const HOURS = [
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

export function generateTimeSlots(stepMinutes: 15 | 30 | 60 = 60): string[] {
	const slots: string[] = [];
	for (let h = 8; h <= 20; h++) {
		for (let m = 0; m < 60; m += stepMinutes) {
			if (h === 20 && m > 0) break;
			const hh = h < 10 ? `0${h}` : `${h}`;
			const mm = m < 10 ? `0${m}` : `${m}`;
			slots.push(`${hh}:${mm}`);
		}
	}
	return slots;
}

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
		formatTime,
		toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : ""),
		appointmentLabels,
		selectedChairId,
		selectedDoctorId,
		onAppointmentMove,
		onEditChair,
		hideToolbar = false,
		hideInlineAddChair = false,
	} = props;

	const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
	const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);
	const [activeStatusPickerApptId, setActiveStatusPickerApptId] = useState<string | null>(null);
	const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);
	const [chairDoctorDropdownId, setChairDoctorDropdownId] = useState<string | null>(null);
	const [activeHeaderDoctorPopoverChairId, setActiveHeaderDoctorPopoverChairId] = useState<string | null>(null);
	const [activeHeaderMaintenanceChairId, setActiveHeaderMaintenanceChairId] = useState<string | null>(null);
	const [isQuickAddDoctorOpen, setIsQuickAddDoctorOpen] = useState(false);
	const [internalGridStep, setInternalGridStep] = useState<15 | 30 | 60>(props.gridStepMinutes || 60);
	const [internalMaintenanceBlocks, setInternalMaintenanceBlocks] = useState<ChairMaintenanceBlock[]>([]);
	const [showRevenue, setShowRevenue] = useState<boolean>(() => {
		if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
		try {
			return localStorage.getItem("dente_schedule_show_revenue") === "true";
		} catch {
			return false;
		}
	});
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleToggleShowRevenue = useCallback(() => {
		setShowRevenue((prev) => {
			const next = !prev;
			if (typeof localStorage !== "undefined") {
				try {
					localStorage.setItem("dente_schedule_show_revenue", String(next));
				} catch {}
			}
			return next;
		});
	}, []);

	const gridStep = props.gridStepMinutes ?? internalGridStep;
	const effectiveMaintenanceBlocks = props.chairMaintenanceBlocks ?? internalMaintenanceBlocks;

	const handleSetGridStep = useCallback((step: 15 | 30 | 60) => {
		setInternalGridStep(step);
		props.onGridStepChange?.(step);
	}, [props.onGridStepChange]);

	const handleAddMaintenance = useCallback((
		chairId: string,
		reason: "sanitation" | "tech_break" | "maintenance" | string,
		durationMinutes: number,
		startTimeStr = "13:00",
	) => {
		const startIso = `${dateKey}T${startTimeStr}:00.000Z`;
		const endIso = new Date(Date.parse(startIso) + durationMinutes * 60000).toISOString();
		const newBlock: ChairMaintenanceBlock = {
			id: `maint-${chairId}-${dateKey}-${startTimeStr.replace(":", "")}-${Date.now()}`,
			chairId,
			startsAt: startIso,
			endsAt: endIso,
			reason,
			note: reason === "sanitation" ? "Санитарная обработка" : "Технический перерыв",
		};

		if (props.onAddChairMaintenance) {
			props.onAddChairMaintenance(newBlock);
		} else {
			setInternalMaintenanceBlocks((prev) => [...prev, newBlock]);
		}
		const label = reason === "sanitation" ? "Санитарная обработка" : "Технический перерыв";
		showToast(`${label} (${durationMinutes} мин) запланирована на ${startTimeStr}`, "success", 3000);
	}, [dateKey, props.onAddChairMaintenance]);

	const handleRemoveMaintenance = useCallback((blockId: string) => {
		if (props.onRemoveChairMaintenance) {
			props.onRemoveChairMaintenance(blockId);
		} else {
			setInternalMaintenanceBlocks((prev) => prev.filter((b) => b.id !== blockId));
		}
		showToast("Технический блок кресла снят", "info", 2000);
	}, [props.onRemoveChairMaintenance]);

	const timeSlots = useMemo(() => generateTimeSlots(gridStep), [gridStep]);

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
			setActiveStatusPickerApptId(null);
			setChairDoctorDropdownId(null);
			setActiveHeaderDoctorPopoverChairId(null);
			setActiveHeaderMaintenanceChairId(null);
		};
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActiveMenuApptId(null);
				setActiveStatusPickerApptId(null);
				setSelectedMobileAppt(null);
				setHoveredApptId(null);
				setChairDoctorDropdownId(null);
				setActiveHeaderDoctorPopoverChairId(null);
				setActiveHeaderMaintenanceChairId(null);
			}
		};
		if (activeMenuApptId || activeStatusPickerApptId || selectedMobileAppt || chairDoctorDropdownId || activeHeaderDoctorPopoverChairId || activeHeaderMaintenanceChairId) {
			window.addEventListener("click", handleGlobalClick);
			window.addEventListener("keydown", handleGlobalKeyDown);
		}
		return () => {
			window.removeEventListener("click", handleGlobalClick);
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [activeMenuApptId, activeStatusPickerApptId, selectedMobileAppt, chairDoctorDropdownId, activeHeaderDoctorPopoverChairId, activeHeaderMaintenanceChairId]);

	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	// Wave 58 (Feature 247): 1-Click Quick Adjust Duration, Lateness Shift & Free Slot to Waitlist
	const handleAdjustAppointmentDuration = useCallback(
		(appt: Appointment, deltaMinutes: number) => {
			const startMs = Date.parse(appt.startsAt);
			const currentEndMs = Date.parse(appt.endsAt);
			const newEndMs = currentEndMs + deltaMinutes * 60000;
			const minDurationMs = 15 * 60000;

			// Защита: минимальная длительность приема — 15 минут
			if (newEndMs - startMs < minDurationMs) {
				showToast("Минимальная длительность приема — 15 минут", "warning", 3000);
				return;
			}

			const newEndIso = new Date(newEndMs).toISOString();
			const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
			const isCito = isCitoAppointment(appt);

			// Проверка коллизий через checkAppointmentResourceCollision (с мягким овербукингом, Мандат 8e)
			const collisionCheck = checkAppointmentResourceCollision(
				{
					startsAt: appt.startsAt,
					endsAt: newEndIso,
					doctorUserId: appt.doctorUserId,
					chairId: appt.chairId,
					patientId: appt.patientId,
					isCito,
				},
				appointments,
				{
					excludeAppointmentId: appt.id,
					staff: dashboard?.clinicSettings?.staff,
					chairs: dashboard?.clinicSettings?.chairs,
					patients: dashboard?.patients,
					chairMaintenanceBlocks: effectiveMaintenanceBlocks,
					formatTimeFn: (iso) => (formatTime ? formatTime(iso) : toDateTimeLocalValue(iso, timezone).slice(11, 16)),
					isCito,
					allowCitoOverbooking: isCito,
				},
			);

			if (collisionCheck.isCitoOverbooking) {
				showToast(`CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`, "warning", 4500);
			} else if (collisionCheck.hasCollision) {
				showToast(`Внимание: ${collisionCheck.message}. Время изменено с овербукингом`, "warning", 4500);
			}

			const newDuration = Math.round((newEndMs - startMs) / 60000);
			const newStart = formatTime ? formatTime(appt.startsAt) : toDateTimeLocalValue(appt.startsAt, timezone).slice(11, 16);
			const newEnd = formatTime ? formatTime(newEndIso) : toDateTimeLocalValue(newEndIso, timezone).slice(11, 16);

			if (typeof onAppointmentMove === "function") {
				void Promise.resolve(
					onAppointmentMove(appt.id, {
						endsAt: newEndIso,
						allowOverbooking: true,
					}),
				).then((result) => {
					if (result !== false) {
						showToast(`Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`, "success", 3000);
					}
				});
			} else {
				showToast(`Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`, "success", 3000);
			}

			setSelectedMobileAppt((prev) => (prev && prev.id === appt.id ? { ...prev, endsAt: newEndIso } : prev));
		},
		[appointments, dashboard, effectiveMaintenanceBlocks, formatTime, onAppointmentMove, patientName, toDateTimeLocalValue, timezone],
	);

	const handleShiftAppointmentLateness = useCallback(
		(appt: Appointment, shiftMinutes: number) => {
			const shiftMs = shiftMinutes * 60000;
			const newStartMs = Date.parse(appt.startsAt) + shiftMs;
			const newEndMs = Date.parse(appt.endsAt) + shiftMs;
			const newStartIso = new Date(newStartMs).toISOString();
			const newEndIso = new Date(newEndMs).toISOString();

			const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
			const formattedNewStart = formatTime ? formatTime(newStartIso) : toDateTimeLocalValue(newStartIso, timezone).slice(11, 16);
			const isCito = isCitoAppointment(appt);

			// Проверка коллизий через checkAppointmentResourceCollision (с мягким овербукингом)
			const collisionCheck = checkAppointmentResourceCollision(
				{
					startsAt: newStartIso,
					endsAt: newEndIso,
					doctorUserId: appt.doctorUserId,
					chairId: appt.chairId,
					patientId: appt.patientId,
					isCito,
				},
				appointments,
				{
					excludeAppointmentId: appt.id,
					staff: dashboard?.clinicSettings?.staff,
					chairs: dashboard?.clinicSettings?.chairs,
					patients: dashboard?.patients,
					chairMaintenanceBlocks: effectiveMaintenanceBlocks,
					formatTimeFn: (iso) => (formatTime ? formatTime(iso) : toDateTimeLocalValue(iso, timezone).slice(11, 16)),
					isCito,
					allowCitoOverbooking: isCito,
				},
			);

			if (collisionCheck.isCitoOverbooking) {
				showToast(`CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`, "warning", 4500);
			} else if (collisionCheck.hasCollision) {
				showToast(`Внимание: ${collisionCheck.message}. Прием сдвинут с овербукингом`, "warning", 4500);
			}

			// Автоматически копирует в буфер или подготавливает WhatsApp сообщение
			const messageText = `Здравствуйте, ${pName}! Ваш прием в клинике перенесен на ${formattedNewStart}. Ждем вас!`;
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				void navigator.clipboard.writeText(messageText).catch(() => {});
			}

			if (typeof onAppointmentMove === "function") {
				void Promise.resolve(
					onAppointmentMove(appt.id, {
						startsAt: newStartIso,
						endsAt: newEndIso,
						allowOverbooking: true,
					}),
				).then((result) => {
					if (result !== false) {
						showToast(`Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`, "success", 3000);
					}
				});
			} else {
				showToast(`Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`, "success", 3000);
			}

			setSelectedMobileAppt((prev) => (prev && prev.id === appt.id ? { ...prev, startsAt: newStartIso, endsAt: newEndIso } : prev));
		},
		[appointments, dashboard, effectiveMaintenanceBlocks, formatTime, onAppointmentMove, patientName, toDateTimeLocalValue, timezone],
	);

	const handleFreeSlotToWaitlist = useCallback(
		(appt: Appointment) => {
			if (typeof onQuickStatusChange === "function") {
				onQuickStatusChange(appt.id, "cancelled");
			} else if (typeof onAppointmentMove === "function") {
				void onAppointmentMove(appt.id, { status: "cancelled" });
			}
			showToast("Слот освобожден. Проверьте подходящих кандидатов в листе ожидания", "info", 4000);
			setActiveMenuApptId(null);
			setSelectedMobileAppt(null);
		},
		[onQuickStatusChange, onAppointmentMove],
	);

	const handleReassignAppointmentChair = useCallback(
		(appt: Appointment, targetChairId: string | null) => {
			const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
			const chairName = targetChairId
				? dashboard?.clinicSettings?.chairs?.find((c) => c.id === targetChairId)?.name || (targetChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR.name : "Кресло")
				: "Без кресла";

			if (typeof onAppointmentMove === "function") {
				void Promise.resolve(
					onAppointmentMove(appt.id, {
						chairId: targetChairId,
						allowOverbooking: true,
					}),
				).then((result) => {
					if (result !== false) {
						showToast(`Прием ${pName} перенесен на ${chairName}`, "success", 3000);
					}
				});
			} else {
				showToast(`Прием ${pName} перенесен на ${chairName}`, "success", 3000);
			}

			setSelectedMobileAppt((prev) => (prev && prev.id === appt.id ? { ...prev, chairId: targetChairId } : prev));
			setActiveMenuApptId(null);
		},
		[dashboard, onAppointmentMove, patientName],
	);

	const handleReassignAppointmentDoctor = useCallback(
		(appt: Appointment, targetDoctorUserId: string) => {
			const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
			const docName = dashboard?.clinicSettings?.staff?.find((s) => s.id === targetDoctorUserId)?.fullName || "Врач";

			if (typeof onAppointmentMove === "function") {
				void Promise.resolve(
					onAppointmentMove(appt.id, {
						doctorUserId: targetDoctorUserId,
						allowOverbooking: true,
					}),
				).then((result) => {
					if (result !== false) {
						showToast(`Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`, "success", 3000);
					}
				});
			} else {
				showToast(`Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`, "success", 3000);
			}

			setSelectedMobileAppt((prev) => (prev && prev.id === appt.id ? { ...prev, doctorUserId: targetDoctorUserId } : prev));
			setActiveMenuApptId(null);
		},
		[dashboard, onAppointmentMove, patientName],
	);

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
		const incoming = props.chairDoctorAssignments;
		if (incoming) {
			setLocalChairAssignments((prev) => {
				if (prev === incoming) return prev;
				if (prev && Object.keys(prev).length === 0 && Object.keys(incoming).length === 0) return prev;
				return incoming;
			});
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

		// If chair has defaultDoctorId or clinic is solo doctor, auto-bind that doctor to the chair(s) if not already assigned
		for (const chair of effectiveChairs) {
			if (
				assignments[chair.id]?.doctorId === "" ||
				(assignments[chair.id] as any)?.unassigned
			) {
				continue;
			}
			if (!assignments[chair.id]) {
				const chairDefaultDocId = (chair as any)?.defaultDoctorId;
				const defaultDoc = chairDefaultDocId
					? doctors.find((d) => d.id === chairDefaultDocId)
					: isSoloDoctor && doctors.length >= 1
						? doctors[0]
						: null;

				if (defaultDoc) {
					const specialty =
						defaultDoc.specialties && defaultDoc.specialties.length > 0
							? specialtyLabels[defaultDoc.specialties[0] as DentalSpecialty] ||
								defaultDoc.specialties[0]
							: defaultDoc.role === "doctor"
								? "Стоматолог"
								: "";
					assignments[chair.id] = {
						chairId: chair.id,
						doctorId: defaultDoc.id,
						doctorName: defaultDoc.fullName,
						doctorSpecialty: specialty,
						shiftPreset: "full",
						shiftLabel: chairDefaultDocId ? "Основной врач" : "Полный день",
						shiftHours: "08:00–20:00",
						startHour: 8,
						endHour: 20,
					};
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
			const defaultDocId = (targetChair as any)?.defaultDoctorId;
			if (defaultDocId) {
				const defaultDoc = doctors.find((d) => d.id === defaultDocId);
				if (defaultDoc) return defaultDoc;
			}
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
				const splitHour = mornSub?.endHour ?? eveSub?.startHour ?? 14;
				if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
					return null;
				}
				const mornDocId = mornSub?.doctorId || assignment.doctorId;
				const eveDocId =
					eveSub?.doctorId ||
					mornSub?.doctorId ||
					assignment.doctorId;
				if (hourNum < splitHour) {
					return mornDocId || null;
				}
				return eveDocId || null;
			}

			// 2. Custom sub-shifts array
			if (assignment.subShifts && assignment.subShifts.length > 0) {
				const matching = assignment.subShifts.find(
					(s) =>
						hourNum >= s.startHour &&
						(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= s.endHour)),
				);
				if (matching) return matching.doctorId;
				return null;
			}

			// 3. Preset bounds: morning only vs evening only (including 09-15 and 15-21)
			if (assignment.shiftPreset === "morning") {
				if (hourNum >= 8 && hourNum < 14) return assignment.doctorId || null;
				return null;
			}
			if (assignment.shiftPreset === "morning_9") {
				if (hourNum >= 9 && hourNum < 15) return assignment.doctorId || null;
				return null;
			}
			if (assignment.shiftPreset === "evening") {
				if (hourNum >= 14 && hourNum <= 20) return assignment.doctorId || null;
				return null;
			}
			if (assignment.shiftPreset === "evening_15") {
				if (hourNum >= 15 && hourNum <= 21) return assignment.doctorId || null;
				return null;
			}
			if (assignment.shiftPreset === "full_9_21") {
				if (hourNum >= 9 && hourNum <= 21) return assignment.doctorId || null;
				return null;
			}

			// 4. Numerical start/end hour range
			if (assignment.startHour !== undefined && assignment.endHour !== undefined) {
				if (
					hourNum >= assignment.startHour &&
					(hourNum < assignment.endHour || (assignment.endHour >= 20 && hourNum <= assignment.endHour))
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
			shiftPreset: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "full_9_21" | "two_shifts",
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
			} else if (shiftPreset === "morning_9") {
				const existing = effectiveChairAssignments[chairId];
				const existingEvening =
					existing?.shiftPreset === "evening_15"
						? {
								doctorId: existing.doctorId,
								doctorName: existing.doctorName,
								doctorSpecialty: existing.doctorSpecialty,
								startHour: existing.startHour ?? 15,
								endHour: existing.endHour ?? 21,
								shiftHours: existing.shiftHours || "15:00–21:00",
							}
						: existing?.shiftPreset === "evening"
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
					startHour: 9,
					endHour: 15,
					shiftHours: "09:00–15:00",
				};

				if (existingEvening && existingEvening.doctorId) {
					assignment = {
						chairId,
						doctorId: docId,
						doctorName: `${formatDoctorShortName(doctorName)} / ${formatDoctorShortName(existingEvening.doctorName)}`,
						doctorSpecialty: specialty,
						shiftPreset: "custom",
						shiftLabel: `1 см: ${formatDoctorShortName(doctorName)} · 2 см: ${formatDoctorShortName(existingEvening.doctorName)}`,
						shiftHours: "09:00–15:00 & " + existingEvening.shiftHours,
						startHour: 9,
						endHour: existingEvening.endHour || 21,
						subShifts: [morningSubShift, existingEvening],
					};
				} else {
					const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "morning_9")!;
					assignment = {
						chairId,
						doctorId: docId,
						doctorName,
						doctorSpecialty: specialty,
						shiftPreset: "morning_9",
						shiftLabel: preset.label,
						shiftHours: preset.hours,
						startHour: preset.startHour,
						endHour: preset.endHour,
						subShifts: [morningSubShift],
					};
				}
			} else if (shiftPreset === "evening_15") {
				const existing = effectiveChairAssignments[chairId];
				const existingMorning =
					existing?.shiftPreset === "morning_9"
						? {
								doctorId: existing.doctorId,
								doctorName: existing.doctorName,
								doctorSpecialty: existing.doctorSpecialty,
								startHour: existing.startHour ?? 9,
								endHour: existing.endHour ?? 15,
								shiftHours: existing.shiftHours || "09:00–15:00",
							}
						: existing?.shiftPreset === "morning"
							? {
									doctorId: existing.doctorId,
									doctorName: existing.doctorName,
									doctorSpecialty: existing.doctorSpecialty,
									startHour: existing.startHour ?? 8,
									endHour: existing.endHour ?? 14,
									shiftHours: existing.shiftHours || "08:00–14:00",
								}
							: existing?.subShifts?.find((s) => s.startHour < 15);

				const eveningSubShift: ChairDoctorSubShift = {
					doctorId: docId,
					doctorName,
					doctorSpecialty: specialty,
					startHour: 15,
					endHour: 21,
					shiftHours: "15:00–21:00",
				};

				if (existingMorning && existingMorning.doctorId) {
					assignment = {
						chairId,
						doctorId: existingMorning.doctorId,
						doctorName: `${formatDoctorShortName(existingMorning.doctorName)} / ${formatDoctorShortName(doctorName)}`,
						doctorSpecialty: existingMorning.doctorSpecialty || specialty,
						shiftPreset: "custom",
						shiftLabel: `1 см: ${formatDoctorShortName(existingMorning.doctorName)} · 2 см: ${formatDoctorShortName(doctorName)}`,
						shiftHours: existingMorning.shiftHours + " & 15:00–21:00",
						startHour: existingMorning.startHour || 9,
						endHour: 21,
						subShifts: [existingMorning, eveningSubShift],
					};
				} else {
					const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "evening_15")!;
					assignment = {
						chairId,
						doctorId: docId,
						doctorName,
						doctorSpecialty: specialty,
						shiftPreset: "evening_15",
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

	const handleBindDoctorToChair = useCallback(
		(chairId: string, doctorId: string) => {
			const targetChair = effectiveChairs.find((c) => c.id === chairId);
			const chairName = targetChair?.name || chairId;
			const targetDoc =
				doctors.find((d) => d.id === doctorId) ||
				(dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === doctorId);
			const doctorName = targetDoc ? formatDoctorShortName(targetDoc.fullName) : doctorId;

			if (typeof window !== "undefined") {
				try {
					const storedPref = JSON.parse(
						localStorage.getItem("dente_doctor_preferred_chairs") || "{}",
					);
					storedPref[doctorId] = chairId;
					localStorage.setItem(
						"dente_doctor_preferred_chairs",
						JSON.stringify(storedPref),
					);

					const storedChairDef = JSON.parse(
						localStorage.getItem("dente_chair_default_doctors") || "{}",
					);
					storedChairDef[chairId] = doctorId;
					localStorage.setItem(
						"dente_chair_default_doctors",
						JSON.stringify(storedChairDef),
					);
				} catch {}
			}

			if (targetDoc) {
				(targetDoc as any).preferredChairId = chairId;
			}
			if (targetChair) {
				(targetChair as any).defaultDoctorId = doctorId;
			}

			handleConfirmAssignDoctor(chairId, doctorId, "full");

			showToast(
				`Врач ${doctorName} закреплен за креслом «${chairName}» (StomX Parity)`,
				"success",
				3500,
			);
		},
		[effectiveChairs, doctors, dashboard?.clinicSettings?.staff, handleConfirmAssignDoctor],
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

	const handleAssignDoctorWeek = useCallback(
		(chairId: string, docId: string, fullWeek = false) => {
			const doc = doctors.find((d) => d.id === docId) || doctors[0];
			const chair = effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
			if (!doc) return;

			const specialty =
				doc.specialties && doc.specialties.length > 0
					? specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]
					: doc.role === "doctor"
						? "Стоматолог"
						: "";
			const doctorName = doc.fullName || "Врач";

			const assignment: ChairDoctorShiftAssignment = {
				chairId,
				doctorId: doc.id,
				doctorName,
				doctorSpecialty: specialty,
				shiftPreset: "full",
				shiftLabel: fullWeek ? "Весь день (Пн–Вс)" : "Весь день (Пн–Пт)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [
					{
						doctorId: doc.id,
						doctorName,
						doctorSpecialty: specialty,
						startHour: 8,
						endHour: 20,
						shiftHours: "08:00–20:00",
					},
				],
			};

			const mondayIso = getMondayOfWeekIso(dateKey);
			const dayOffsets = fullWeek ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
			const weekDays = dayOffsets.map((offset) => addDaysToDateIso(mondayIso, offset));

			if (typeof window !== "undefined") {
				try {
					for (const dayIso of weekDays) {
						const existingKey = `dente_chair_doctor_assignments_${dayIso}`;
						const raw = localStorage.getItem(existingKey);
						const parsed = raw ? JSON.parse(raw) : {};
						parsed[chairId] = assignment;
						localStorage.setItem(existingKey, JSON.stringify(parsed));
					}
				} catch {}

				try {
					const rawShifts = localStorage.getItem("dente_doctor_shifts");
					const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
					const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
						weekStartDateIso: mondayIso,
						templateId: fullWeek ? "seven_day_full" : "five_day_standard",
						doctorId: doc.id,
						chairId,
						staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
					});
					localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
				} catch {}
			}

			setLocalChairAssignments((prev) => ({
				...prev,
				[chairId]: assignment,
			}));

			if (typeof props.onAssignChairDoctor === "function") {
				props.onAssignChairDoctor(chairId, assignment);
			}

			const weekLabel = fullWeek ? "всю неделю (Пн–Вс)" : "всю неделю (Пн–Пт)";
			showToast(
				`Врач ${formatDoctorShortName(doctorName)} закреплен за креслом «${chair.name}» на ${weekLabel}`,
				"success",
				3500,
			);
		},
		[doctors, effectiveChairs, dateKey, dashboard?.clinicSettings?.staff, props.onAssignChairDoctor],
	);

	const handleAssignDoctorMonth = useCallback(
		(chairId: string, docId: string) => {
			const doc = doctors.find((d) => d.id === docId) || doctors[0];
			const chair = effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
			if (!doc) return;

			const specialty =
				doc.specialties && doc.specialties.length > 0
					? specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]
					: doc.role === "doctor"
						? "Стоматолог"
						: "";
			const doctorName = doc.fullName || "Врач";

			const assignment: ChairDoctorShiftAssignment = {
				chairId,
				doctorId: doc.id,
				doctorName,
				doctorSpecialty: specialty,
				shiftPreset: "full",
				shiftLabel: "Весь день (Месяц)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [
					{
						doctorId: doc.id,
						doctorName,
						doctorSpecialty: specialty,
						startHour: 8,
						endHour: 20,
						shiftHours: "08:00–20:00",
					},
				],
			};

			const year = Number.parseInt(dateKey ? dateKey.slice(0, 4) : "2026", 10) || 2026;
			const month = Number.parseInt(dateKey ? dateKey.slice(5, 7) : "9", 10) || 9;
			const daysInMonth = new Date(year, month, 0).getDate();
			const monthNamesRu = [
				"январь",
				"февраль",
				"март",
				"апрель",
				"май",
				"июнь",
				"июль",
				"август",
				"сентябрь",
				"октябрь",
				"ноябрь",
				"декабрь",
			];
			const monthName = monthNamesRu[month - 1] || "текущий месяц";

			if (typeof window !== "undefined") {
				try {
					for (let d = 1; d <= daysInMonth; d++) {
						const dayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
						const existingKey = `dente_chair_doctor_assignments_${dayIso}`;
						const raw = localStorage.getItem(existingKey);
						const parsed = raw ? JSON.parse(raw) : {};
						parsed[chairId] = assignment;
						localStorage.setItem(existingKey, JSON.stringify(parsed));
					}
				} catch {}

				try {
					const mondayIso = getMondayOfWeekIso(dateKey);
					const rawShifts = localStorage.getItem("dente_doctor_shifts");
					const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
					const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
					localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
				} catch {}
			}

			setLocalChairAssignments((prev) => ({
				...prev,
				[chairId]: assignment,
			}));

			if (typeof props.onAssignChairDoctor === "function") {
				props.onAssignChairDoctor(chairId, assignment);
			}

			showToast(
				`Врач ${formatDoctorShortName(doctorName)} закреплен за креслом «${chair.name}» на весь месяц (${monthName}) (StomX Parity)`,
				"success",
				3500,
			);
		},
		[doctors, effectiveChairs, dateKey, props.onAssignChairDoctor],
	);

	const handleQuickSubstituteDoctor = useCallback(
		(chairId: string, newDoctorId?: string) => {
			const chair = effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
			const currentDocId = effectiveChairAssignments?.[chairId]?.doctorId;
			const candidate = newDoctorId
				? doctors.find((d) => d.id === newDoctorId)
				: doctors.find((d) => d.id !== currentDocId) || doctors[0];
			if (!candidate) return;

			const doctorName = candidate.fullName || "Врач";
			const specialty =
				candidate.specialties && candidate.specialties.length > 0
					? specialtyLabels[candidate.specialties[0] as DentalSpecialty] || candidate.specialties[0]
					: candidate.role === "doctor"
						? "Стоматолог"
						: "";

			const existing = effectiveChairAssignments?.[chairId];
			const updatedAssignment: ChairDoctorShiftAssignment = {
				chairId,
				doctorId: candidate.id,
				doctorName,
				doctorSpecialty: specialty,
				shiftPreset: existing?.shiftPreset || "full",
				shiftLabel: existing?.shiftLabel || "Весь день",
				shiftHours: existing?.shiftHours || "08:00–20:00",
				startHour: existing?.startHour ?? 8,
				endHour: existing?.endHour ?? 20,
				subShifts: existing?.subShifts
					? existing.subShifts.map((s) => ({
							...s,
							doctorId: candidate.id,
							doctorName,
							doctorSpecialty: specialty,
					  }))
					: [
							{
								doctorId: candidate.id,
								doctorName,
								doctorSpecialty: specialty,
								startHour: existing?.startHour ?? 8,
								endHour: existing?.endHour ?? 20,
								shiftHours: existing?.shiftHours || "08:00–20:00",
							},
					  ],
			};

			if (typeof window !== "undefined" && dateKey) {
				try {
					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existingStorage = JSON.parse(localStorage.getItem(storageKey) || "{}");
					existingStorage[chairId] = updatedAssignment;
					localStorage.setItem(storageKey, JSON.stringify(existingStorage));
				} catch {}
			}

			setLocalChairAssignments((prev) => ({
				...prev,
				[chairId]: updatedAssignment,
			}));

			if (typeof props.onAssignChairDoctor === "function") {
				props.onAssignChairDoctor(chairId, updatedAssignment);
			}

			showToast(
				`Врач ${formatDoctorShortName(doctorName)} подменяет врача на кресле «${chair.name}» (StomX Parity)`,
				"success",
			);
		},
		[effectiveChairs, effectiveChairAssignments, doctors, dateKey, props.onAssignChairDoctor],
	);

	const handleCopyWeekShiftsToNextWeek = useCallback(() => {
		const mondayIso = getMondayOfWeekIso(dateKey);
		const nextMondayIso = addDaysToDateIso(mondayIso, 7);

		if (typeof window !== "undefined") {
			try {
				for (let i = 0; i < 7; i++) {
					const srcDay = addDaysToDateIso(mondayIso, i);
					const targetDay = addDaysToDateIso(nextMondayIso, i);
					const srcKey = `dente_chair_doctor_assignments_${srcDay}`;
					const targetKey = `dente_chair_doctor_assignments_${targetDay}`;
					const raw = localStorage.getItem(srcKey);
					if (raw) {
						localStorage.setItem(targetKey, raw);
					} else if (srcDay === dateKey && effectiveChairAssignments) {
						localStorage.setItem(targetKey, JSON.stringify(effectiveChairAssignments));
					}
				}
			} catch {}

			try {
				const rawShifts = localStorage.getItem("dente_doctor_shifts");
				const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
				const updatedShifts = copyWeekShiftsToTargetWeek(currentShifts, mondayIso, nextMondayIso);
				localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
			} catch {}
		}

		showToast(
			`График смен кресел скопирован на следующую неделю (${nextMondayIso})`,
			"success",
			3500,
		);
	}, [dateKey, effectiveChairAssignments]);

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
						doctors={doctors}
						onAddChair={props.onAddChair || (async (chairData) => {
							const newChair = {
								id: chairData.id || `chair-${Date.now()}`,
								name: chairData.name,
								room: chairData.room || chairData.roomNumber || "",
								color: chairData.color || "#0d9488",
								specialization: chairData.specialization,
								active: chairData.isActive ?? true,
								branchId: chairData.branchId,
							};
							if (dashboard?.clinicSettings?.chairs) {
								dashboard.clinicSettings.chairs.push(newChair as any);
							}
							if (chairData.defaultDoctorId) {
								handleConfirmAssignDoctor(newChair.id, chairData.defaultDoctorId, "full");
							}
							setIsInternalAddChairModalOpen(false);
						})}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Day 0 Empty State Banner when no appointments for selected day (minimal 24-28px indicator strip, Mandate 8p) */}
			{dayAppointments.length === 0 && (
				<div className="h-6 sm:h-7 min-h-[24px] max-h-7 px-2.5 rounded-md bg-[var(--paper-soft)] border border-dashed border-[var(--line)] flex items-center gap-1.5 text-[11px] select-none -mb-1">
					<CalendarCheck size={12} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
					<span className="font-semibold text-[var(--ink)] truncate">
						На выбранный день записей пока нет.
					</span>
					<span className="text-[var(--muted)] hidden md:inline truncate">
						Нажмите на любой свободный интервал в сетке ниже для записи пациента.
					</span>
				</div>
			)}

			{/* Daily Chair & Doctor Occupancy Summary Bar with Inline + Кресло (1 neat 36px row) */}
			{!hideToolbar && (
				<div className="px-3 py-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-nowrap items-center justify-between gap-2 text-xs h-9 min-h-[36px] max-h-[36px] overflow-x-auto select-none">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
					{dailyTally.totalAppointmentsCount > 0 ? (
						<>
							<span className="font-bold text-[var(--ink)] flex items-center gap-1.5 whitespace-nowrap">
								<CalendarCheck size={15} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								Загрузка клиники: {countLabel(dailyTally.totalAppointmentsCount, "визит", "визита", "визитов")} ({dailyTally.clinicOccupancyPercent}%)
							</span>
							<span className="text-[var(--muted)] hidden 2xl:inline">·</span>
							<span className="text-[var(--muted)] whitespace-nowrap hidden 2xl:inline">
								Общее время приема: {Math.floor(dailyTally.totalDurationMinutes / 60)} ч {dailyTally.totalDurationMinutes % 60} мин
							</span>
						</>
					) : (
						<span className="text-[var(--muted)] flex items-center gap-1.5 whitespace-nowrap">
							<Clock size={14} className="text-[var(--teal)] shrink-0" />
							<span>{effectiveChairs.length} {countLabel(effectiveChairs.length, "кресло", "кресла", "кресел")} · 08:00–20:00</span>
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
					{/* Grid Step Selector (15 / 30 / 60 min, Feature 192, StomX Parity) */}
					<div
						className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] shadow-2xs"
						data-testid="schedule-grid-step-selector"
						role="group"
						aria-label="Шаг сетки расписания"
					>
						<span className="text-[11px] font-bold text-[var(--muted)] px-1 hidden sm:inline">Шаг:</span>
						<button
							type="button"
							onClick={() => handleSetGridStep(15)}
							className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer min-h-[28px] flex items-center justify-center ${
								gridStep === 15
									? "bg-[var(--teal)] text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid="btn-grid-step-15"
							style={{ minHeight: "28px" }}
						>
							15м
						</button>
						<button
							type="button"
							onClick={() => handleSetGridStep(30)}
							className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer min-h-[28px] flex items-center justify-center ${
								gridStep === 30
									? "bg-[var(--teal)] text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid="btn-grid-step-30"
							style={{ minHeight: "28px" }}
						>
							30м
						</button>
						<button
							type="button"
							onClick={() => handleSetGridStep(60)}
							className={`px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer min-h-[28px] flex items-center justify-center ${
								gridStep === 60
									? "bg-[var(--teal)] text-white shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid="btn-grid-step-60"
							style={{ minHeight: "28px" }}
						>
							60м
						</button>
					</div>

					<button
						type="button"
						onClick={handleOpenAddChair}
						className={`h-7 min-h-[44px] min-w-[44px] px-2.5 py-0.5 rounded-lg border border-dashed border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-[var(--teal)] active:scale-95 shrink-0 ${
							hideInlineAddChair ? "hidden" : ""
						}`}
						style={{ minHeight: "44px", minWidth: "44px" }}
						title="Добавить кресло в расписание (+ Кресло)"
						aria-label="Добавить кресло"
						data-testid="btn-grid-inline-add-chair"
					>
						<span className="font-bold">+ Кресло</span>
					</button>

					<button
						type="button"
						onClick={() => setIsQuickAddDoctorOpen(true)}
						className="h-7 min-h-[28px] max-h-[30px] min-w-[44px] px-2.5 py-0.5 rounded-lg border border-dashed border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-[var(--teal)] active:scale-95 shrink-0"
						title="Быстро добавить врача в расписание"
						aria-label="Быстро добавить врача в расписание"
						data-testid="btn-grid-quick-add-doctor"
					>
						<UserPlus size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="font-bold">+ Врач</span>
					</button>

					<button
						type="button"
						onClick={handleCopyWeekShiftsToNextWeek}
						className="h-7 min-h-[28px] max-h-[30px] px-2.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal)] text-[var(--ink)] flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
						title="Скопировать график смен кресел на следующую неделю (+7 дней) в 1 клик (StomX Parity)"
						aria-label="Скопировать график на следующую неделю"
						data-testid="btn-grid-copy-next-week"
					>
						<Copy size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="hidden xl:inline font-bold">На след. неделю</span>
						<span className="xl:hidden font-bold">+7 дн.</span>
					</button>
					{dailyTally.totalRevenueRub > 0 && (
						<button
							type="button"
							onClick={handleToggleShowRevenue}
							className="font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 text-xs cursor-pointer transition-all active:scale-95 shadow-2xs h-7 min-h-[28px] max-h-[30px]"
							title={showRevenue ? "Скрыть сумму выручки дня от пациентов (Режим приватности)" : "Показать выручку дня"}
							data-testid="btn-grid-toggle-revenue-privacy"
							aria-label="Переключить приватность выручки дня"
						>
							{showRevenue ? <EyeOff size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Eye size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
							<span>{showRevenue ? `${dailyTally.totalRevenueRub.toLocaleString("ru-RU")} ₽` : "•••••• ₽"}</span>
						</button>
					)}
				</div>
			</div>
		)}

			<div
				className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm p-1 sm:p-2 touch-pan-x"
				data-testid="schedule-grid-view"
				role="region"
				aria-label="Сетка расписания по креслам и времени"
			>
				<div
					className="grid min-w-full border-b border-[var(--line)] bg-[var(--paper-soft)] sticky top-0 z-10"
					style={{
						minWidth: effectiveChairs.length > 1 ? `${Math.max(260, 72 + effectiveChairs.length * 180)}px` : undefined,
						gridTemplateColumns: `clamp(64px, 15vw, 76px) repeat(${effectiveChairs.length}, minmax(${effectiveChairs.length === 1 ? "200px" : "180px"}, 1fr))`,
					}}
				>
					{/* Time corner header */}
					<div className="px-1.5 sm:px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center gap-1 sticky left-0 z-20 bg-[var(--paper-soft)]">
						<Clock size={14} className="text-[var(--teal)]" />
						<span className="hidden sm:inline">Время</span>
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
						return effectiveChairs.map((chair, chairIndex) => {
							const chairStat = dailyTally.chairs.find((c) => c.chairId === chair.id);
							const assignment = effectiveChairAssignments[chair.id];
							const hasDoctor = Boolean(assignment && assignment.doctorId);
							const suggestedDoctor = getSuggestedDoctorForChair(chair.id);
							const chairPalette = getStomxWorkplacePalette((chair as any).colorId ?? chair.id ?? chairIndex);
							const chairAccentColor = chair.color || chairPalette.bright_code;
							return (
								<div
									key={chair.id}
									className="p-1 sm:p-1.5 text-center text-xs font-bold uppercase tracking-wider text-[var(--ink)] border-r border-[var(--line)] last:border-r-0 flex flex-col items-center justify-center gap-1 min-w-0 relative transition-colors"
									style={{ borderTop: `3px solid ${chairAccentColor}` }}
									data-testid={`chair-header-${chair.id}`}
									data-chair-palette={chairPalette.nameRu}
								>
									<div
										className="h-1.5 w-full absolute top-0 left-0 right-0 shrink-0"
										style={{ backgroundColor: chairAccentColor }}
										data-testid={`chair-accent-bar-${chair.id}`}
									/>
									<div className="flex items-center justify-center gap-1 flex-wrap w-full min-w-0">
										<span className="truncate max-w-full">{chair.name}</span>
										<span
											className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 transition-colors"
											style={{
												color: chairPalette.bright_code,
												borderColor: `${chairPalette.bright_code}50`,
												backgroundColor: "var(--paper-soft)",
											}}
											title={`Рабочее место StomX: ${chairPalette.nameRu}`}
											data-testid={`chair-palette-badge-${chair.id}`}
										>
											{chairPalette.nameRu}
										</span>
										{hasDoctor && assignment?.doctorName && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setActiveHeaderDoctorPopoverChairId((prev) =>
														prev === chair.id ? null : chair.id,
													);
												}}
												style={{ display: "none" }}
												className="hidden text-[11px] font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2 py-0.5 rounded-lg border border-[var(--teal)]/30 shrink-0 cursor-pointer hover:bg-[var(--teal-surface)] transition-colors items-center gap-1 max-w-[170px] truncate"
												title={`Врач: ${assignment.doctorName} (${assignment.shiftHours || "смена"}). Нажмите для смены в 1 клик`}
												aria-label={`Дежурный врач: ${assignment.doctorName}`}
												data-testid={`chair-header-doctor-badge-${chair.id}`}
											>
												<UserCheck size={12} className="text-[var(--teal)] shrink-0" />
												<span className="truncate">{formatDoctorShortName(assignment.doctorName)}</span>
											</button>
										)}
										{!hasDoctor && (chair as any).active !== false && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setActiveHeaderDoctorPopoverChairId((prev) =>
														prev === chair.id ? null : chair.id,
													);
												}}
												className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors"
												title="Кресло свободно (врач не назначен). Нажмите для назначения смены в 1 клик"
												data-testid={`chair-grid-unstaffed-badge-${chair.id}`}
											>
												+ Врач
											</button>
										)}
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
														color: chair.color || "var(--teal, #0d9488)",
														specialization: (chair as any).specialization,
														isActive: (chair as any).active ?? (chair as any).isActive ?? true,
													});
												}}
												className="min-h-[28px] h-7 w-7 p-1 rounded-lg hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer flex items-center justify-center"
												title={`Редактировать параметры кресла «${chair.name}»`}
												aria-label={`Редактировать параметры кресла ${chair.name}`}
												data-testid={`btn-edit-chair-${chair.id}`}
											>
												<Settings size={13} className="opacity-70 hover:opacity-100" />
											</button>
										)}
										{/* Redundant [Users] button eliminated per Red Team audit (Mandate 8p: doctor assignment handled via select below) */}
										{doctors.length > 0 && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setActiveHeaderDoctorPopoverChairId((prev) =>
														prev === chair.id ? null : chair.id,
													);
												}}
												style={{ display: "none" }}
												className="hidden"
												aria-hidden="true"
												tabIndex={-1}
												aria-label={`Быстрый выбор врача для ${chair.name}`}
												data-testid={`btn-chair-doctor-popover-${chair.id}`}
											/>
										)}
										{/* 1-Click Sanitation & Technical Break Button (Feature 191, Mandate 8e, 8n) */}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setActiveHeaderMaintenanceChairId((prev) =>
													prev === chair.id ? null : chair.id,
												);
											}}
											className="min-h-[28px] h-7 w-7 p-1 rounded-lg bg-transparent hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-amber-600 transition-colors cursor-pointer flex items-center justify-center"
											title={`Санобработка / Техперерыв для «${chair.name}» (1 клик)`}
											aria-label={`Санобработка и техперерыв для ${chair.name}`}
											data-testid={`btn-chair-maintenance-${chair.id}`}
										>
											<Clock size={13} className="opacity-80 hover:opacity-100 text-amber-500" />
										</button>
										{chairStat && chairStat.appointmentsCount > 0 && (
											<span className="text-[10px] font-normal font-sans lowercase px-2 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
												{countLabel(chairStat.appointmentsCount, "визит", "визита", "визитов")} ({chairStat.occupancyPercent}%)
											</span>
										)}
									</div>

									{/* Quick Doctor Chips (1-tap instant switch without opening modal, Mandates 8e, 8k, 8n) */}
									{doctors.length > 1 && (
										<div className="hidden 2xl:flex items-center gap-1 flex-wrap justify-center w-full my-0.5">
											{doctors.slice(0, 3).map((doc) => {
												const isAssigned = assignment?.doctorId === doc.id;
												return (
													<button
														key={doc.id}
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleConfirmAssignDoctor(
																chair.id,
																doc.id,
																assignment?.shiftPreset === "morning" || assignment?.shiftPreset === "evening" || assignment?.shiftPreset === "morning_9" || assignment?.shiftPreset === "evening_15"
																	? assignment.shiftPreset
																	: "full",
															);
														}}
														className={`min-h-[28px] h-7 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer truncate max-w-[120px] flex items-center gap-1 ${
															isAssigned
																? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
																: "bg-[var(--paper)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] border-[var(--line)]"
														}`}
														title={`Закрепить ${doc.fullName} за креслом в 1 клик`}
														data-testid={`chair-quick-doctor-chip-${chair.id}-${doc.id}`}
													>
														<span>{formatDoctorShortName(doc.fullName)}</span>
													</button>
												);
											})}
										</div>
									)}
									{doctors.length >= 1 && (
										<div
											className="flex flex-col xl:flex-row items-center justify-center w-full my-0.5 gap-1 min-h-[44px] sm:min-h-0 cursor-pointer"
											data-testid={`chair-doctor-badge-${chair.id}`}
											title={assignment?.doctorName ? `Врач на смене: ${assignment.doctorName} (${assignment.shiftHours || "08:00–20:00"}). Нажмите для смены` : undefined}
											aria-label={assignment?.doctorName ? `Врач ${assignment.doctorName}, ${assignment.shiftHours || "08:00–20:00"}. Нажмите для изменения` : undefined}
											onClick={() => openAssignModal(chair.id)}
										>
											<select
												value={assignment?.doctorId || ""}
												onChange={(e) => {
													const newDocId = e.target.value;
													if (newDocId) {
														handleConfirmAssignDoctor(
															chair.id,
															newDocId,
															assignment?.shiftPreset === "morning" ||
																assignment?.shiftPreset === "evening" ||
																assignment?.shiftPreset === "morning_9" ||
																assignment?.shiftPreset === "evening_15" ||
																assignment?.shiftPreset === "full_9_21" ||
																assignment?.shiftPreset === "two_shifts"
																? assignment.shiftPreset
																: "full",
														);
													} else {
														handleUnassignDoctor(chair.id);
													}
												}}
												onClick={(e) => e.stopPropagation()}
												className="text-[10px] font-bold border border-[var(--line)] rounded px-1.5 py-0.5 bg-[var(--paper)] text-[var(--ink)] w-full xl:w-auto min-w-0 xl:min-w-[120px] truncate cursor-pointer h-6"
												title="Закрепление врача за креслом в 1 клик (выбор из списка)"
												data-testid={`chair-duty-doctor-select-${chair.id}`}
												aria-label={`Дежурный врач для ${chair.name}`}
											>
												<option value="" disabled={Boolean(assignment?.doctorId)}>
													{assignment?.doctorId ? "Сменить врача..." : "+ Назначить врача..."}
												</option>
												{doctors.map((d) => (
													<option key={d.id} value={d.id} title={d.fullName}>
														{formatDoctorShortName(d.fullName)}
													</option>
												))}
											</select>
											<select
												value={
													assignment?.shiftPreset === "morning_9"
														? "morning_9"
														: assignment?.shiftPreset === "evening_15"
															? "evening_15"
															: assignment?.shiftPreset === "morning"
																? "morning"
																: assignment?.shiftPreset === "evening"
																	? "evening"
																	: assignment?.shiftPreset === "two_shifts"
																		? "two_shifts"
																		: assignment?.shiftPreset === "full_9_21"
																			? "full_9_21"
																			: "full"
												}
												onChange={(e) => {
													const newPreset = e.target.value as
														| "morning"
														| "morning_9"
														| "evening"
														| "evening_15"
														| "full"
														| "full_9_21"
														| "two_shifts";
													const currentDocId =
														assignment?.doctorId || (doctors.length > 0 ? doctors[0]!.id : "");
													if (currentDocId) {
														handleConfirmAssignDoctor(chair.id, currentDocId, newPreset);
													}
												}}
												onClick={(e) => e.stopPropagation()}
												className="text-[10px] font-bold border border-[var(--line)] rounded px-1.5 py-0.5 bg-[var(--paper)] text-[var(--ink)] w-full xl:w-auto min-w-0 xl:min-w-[130px] max-w-full cursor-pointer h-6 shrink-0"
												title="Смена врача на кресле (Утро 09:00-15:00 / Вечер 15:00-21:00 / Полный день)"
												data-testid={`chair-shift-select-${chair.id}`}
												aria-label={`Смена для ${chair.name}`}
											>
												<option value="morning_9">09:00–15:00</option>
												<option value="evening_15">15:00–21:00</option>
												<option value="full">08:00–20:00</option>
												<option value="full_9_21">09:00–21:00</option>
												<option value="morning">08:00–14:00</option>
												<option value="evening">14:00–20:00</option>
												<option value="two_shifts">2 смены</option>
											</select>
										</div>
									)}

									{/* 1-Tap Chair Doctor Quick Popover (StomX Parity, Mandate 8e, 8k, 8n) */}
									{activeHeaderDoctorPopoverChairId === chair.id && (
										<div
											className="absolute top-full left-0 z-50 mt-1 p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xl flex flex-col gap-2.5 min-w-[260px] sm:min-w-[320px] max-w-[calc(100vw-32px)] text-left normal-case"
											style={{
												boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
												zIndex: 60,
											}}
											onClick={(e) => e.stopPropagation()}
											data-testid={`chair-doctor-quick-popover-${chair.id}`}
										>
											<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
												<span className="text-xs font-bold text-[var(--ink)]">
													Врач на кресле «{chair.name}»
												</span>
												<button
													type="button"
													onClick={() => setActiveHeaderDoctorPopoverChairId(null)}
													className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
													style={{ minHeight: "44px", minWidth: "44px" }}
													aria-label="Закрыть"
												>
													<X size={16} />
												</button>
											</div>

											{/* Doctors list */}
											<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
												<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
													Выберите врача (1 клик):
												</span>
												{doctors.map((doc) => {
													const isCurrent = assignment?.doctorId === doc.id;
													return (
														<button
															key={doc.id}
															type="button"
															onClick={() => {
																handleConfirmAssignDoctor(
																	chair.id,
																	doc.id,
																	assignment?.shiftPreset === "morning" || assignment?.shiftPreset === "evening"
																		? assignment.shiftPreset
																		: "full",
																);
																setActiveHeaderDoctorPopoverChairId(null);
															}}
															className={`min-h-[44px] w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
																isCurrent
																	? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)] text-[var(--teal-dark,var(--teal))] font-bold"
																	: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
															}`}
															style={{ minHeight: "44px" }}
															data-testid={`chair-doctor-option-${chair.id}-${doc.id}`}
														>
															<span className="truncate">{doc.fullName}</span>
															{isCurrent && <UserCheck size={14} className="text-[var(--teal)] shrink-0 ml-1" />}
														</button>
													);
												})}
											</div>

											{/* 1-Tap Shift & Week Presets inside popover (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n) */}
											<div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
												<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
													Шаблоны смен (1 клик):
												</span>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "morning");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Утро 08:00–14:00 (1 клик)"
														aria-label={`Назначить утреннюю смену 08:00–14:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-morning-${chair.id}`}
													>
														<Sun size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
														<span className="truncate">Утро 08:00–14:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "morning_9");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="1 смена 09:00–15:00 (1 клик)"
														aria-label={`Назначить смену 09:00–15:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-morning-9-${chair.id}`}
													>
														<Sun size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
														<span className="truncate">1 см. 09:00–15:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "evening");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Вечер 14:00–20:00 (1 клик)"
														aria-label={`Назначить вечернюю смену 14:00–20:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-evening-${chair.id}`}
													>
														<Moon size={15} className="text-indigo-400 shrink-0" aria-hidden="true" />
														<span className="truncate">Вечер 14:00–20:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "evening_15");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="2 смена 15:00–21:00 (1 клик)"
														aria-label={`Назначить смену 15:00–21:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-evening-15-${chair.id}`}
													>
														<Moon size={15} className="text-indigo-400 shrink-0" aria-hidden="true" />
														<span className="truncate">2 см. 15:00–21:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "full");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Весь день 08:00–20:00 (1 клик)"
														aria-label={`Назначить смену на весь день 08:00–20:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-full-${chair.id}`}
													>
														<Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
														<span className="truncate">Весь день 08:00–20:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleConfirmAssignDoctor(chair.id, targetDocId, "full_9_21");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Весь день 09:00–21:00 (1 клик)"
														aria-label={`Назначить смену на весь день 09:00–21:00 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-full-9-21-${chair.id}`}
													>
														<Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
														<span className="truncate">Весь день 09:00–21:00</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleAssignDoctorWeek(chair.id, targetDocId);
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="На всю неделю (Пн–Пт) (1 клик)"
														aria-label={`Закрепить врача на кресле ${chair.name} на всю неделю (Пн–Пт)`}
														data-testid={`chair-popover-shift-week-${chair.id}`}
													>
														<Calendar size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />
														<span className="truncate">На всю неделю (Пн–Пт)</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleAssignDoctorWeek(chair.id, targetDocId, true);
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="На всю неделю (Пн–Вс, 7 дней) (1 клик)"
														aria-label={`Закрепить врача на кресле ${chair.name} на всю неделю (Пн–Вс)`}
														data-testid={`chair-popover-shift-week-full-${chair.id}`}
													>
														<Calendar size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
														<span className="truncate">На всю неделю (Пн–Вс)</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																const mondayIso = getMondayOfWeekIso(dateKey);
																if (typeof window !== "undefined") {
																	try {
																		const rawShifts = localStorage.getItem("dente_doctor_shifts");
																		const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
																		const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
																			weekStartDateIso: mondayIso,
																			templateId: "two_two_full",
																			doctorId: targetDocId,
																			chairId: chair.id,
																			staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
																		});
																		localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
																	} catch {}
																}
																handleConfirmAssignDoctor(chair.id, targetDocId, "two_shifts");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="График 2 через 2 (08:00–20:00) (1 клик)"
														aria-label={`Назначить график 2 через 2 на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-two-two-${chair.id}`}
													>
														<Clock size={15} className="text-purple-500 shrink-0" aria-hidden="true" />
														<span className="truncate">2 через 2 (08–20)</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																const mondayIso = getMondayOfWeekIso(dateKey);
																if (typeof window !== "undefined") {
																	try {
																		const rawShifts = localStorage.getItem("dente_doctor_shifts");
																		const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
																		const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
																			weekStartDateIso: mondayIso,
																			templateId: "even_odd_month",
																			doctorId: targetDocId,
																			chairId: chair.id,
																			staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
																		});
																		localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
																	} catch {}
																}
																const dayOfMonth = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
																const isEven = dayOfMonth % 2 === 0;
																handleConfirmAssignDoctor(chair.id, targetDocId, isEven ? "morning" : "evening");
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Чётные/Нечётные дни месяца (1 клик)"
														aria-label={`Назначить график чет/нечет на кресло ${chair.name}`}
														data-testid={`chair-popover-shift-even-odd-${chair.id}`}
													>
														<Zap size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
														<span className="truncate">Чет / Нечет</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const targetDocId = assignment?.doctorId || suggestedDoctor?.id || (doctors[0]?.id ?? "");
															if (targetDocId) {
																handleAssignDoctorMonth(chair.id, targetDocId);
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-xs font-bold text-[var(--ink)] flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="На весь месяц (1 клик) (StomX Parity)"
														aria-label={`Закрепить врача на кресле ${chair.name} на весь месяц`}
														data-testid={`chair-popover-shift-month-${chair.id}`}
													>
														<CalendarRange size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
														<span className="truncate">На весь месяц (1 клик)</span>
													</button>
													<button
														type="button"
														onClick={() => {
															const currentDocId = assignment?.doctorId;
															const substituteDoc = doctors.find((d) => d.id !== currentDocId) || doctors[0];
															if (substituteDoc) {
																handleQuickSubstituteDoctor(chair.id, substituteDoc.id);
															}
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-start gap-1.5 cursor-pointer transition-all active:scale-98"
														style={{ minHeight: "44px" }}
														title="Быстрая подмена дежурного врача на сегодня (StomX Parity, 1 клик)"
														aria-label={`Подменить врача на сегодня на кресле ${chair.name}`}
														data-testid={`chair-popover-substitute-${chair.id}`}
													>
														<UserCheck size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
														<span className="truncate">Подменить врача на сегодня</span>
													</button>
												</div>
											</div>

											{/* Action Buttons: Bind Doctor, Unassign & Open Full Modal */}
											<div className="flex flex-col gap-1 pt-1 border-t border-[var(--line)]">
												<button
													type="button"
													onClick={() => {
														const targetDocId =
															assignment?.doctorId ||
															suggestedDoctor?.id ||
															(doctors[0]?.id ?? "");
														if (targetDocId) {
															handleBindDoctorToChair(chair.id, targetDocId);
														}
														setActiveHeaderDoctorPopoverChairId(null);
													}}
													className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-surface)] flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)]"
													style={{ minHeight: "44px" }}
													title={`Закрепить врача за креслом «${chair.name}» (StomX Parity)`}
													data-testid={`chair-popover-bind-doctor-${chair.id}`}
												>
													<Pin size={14} className="text-[var(--teal)] shrink-0" />
													<span>Закрепить врача за креслом</span>
												</button>
												{hasDoctor && (
													<button
														type="button"
														onClick={() => {
															handleUnassignDoctor(chair.id);
															setActiveHeaderDoctorPopoverChairId(null);
														}}
														className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
														style={{ minHeight: "44px" }}
														data-testid={`chair-popover-unassign-${chair.id}`}
													>
														<XCircle size={14} />
														<span>Снять врача с кресла</span>
													</button>
												)}
												<button
													type="button"
													onClick={() => {
														openAssignModal(chair.id);
														setActiveHeaderDoctorPopoverChairId(null);
													}}
													className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer"
													style={{ minHeight: "44px" }}
													data-testid={`btn-chair-open-full-modal-${chair.id}`}
												>
													<Clock size={14} />
													<span>Расширенная настройка</span>
												</button>
											</div>
										</div>
									)}

									{/* 1-Click Chair Sanitation & Technical Break Popover (Feature 191, Mandates 8e, 8k, 8n) */}
									{activeHeaderMaintenanceChairId === chair.id && (
										<div
											className="absolute top-full left-0 z-50 mt-1 p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xl flex flex-col gap-2 min-w-[240px] sm:min-w-[260px] max-w-[calc(100vw-32px)] text-left normal-case"
											style={{
												boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
												zIndex: 60,
											}}
											onClick={(e) => e.stopPropagation()}
											data-testid={`chair-maintenance-quick-popover-${chair.id}`}
										>
											<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
												<span className="text-xs font-bold text-[var(--ink)]">
													Перерыв: «{chair.name}»
												</span>
												<button
													type="button"
													onClick={() => setActiveHeaderMaintenanceChairId(null)}
													className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
													style={{ minHeight: "44px", minWidth: "44px" }}
													aria-label="Закрыть"
												>
													<X size={16} />
												</button>
											</div>
											<div className="flex flex-col gap-1.5">
												<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
													Санитарная обработка (1 клик):
												</span>
												<div className="grid grid-cols-2 gap-1.5">
													<button
														type="button"
														onClick={() => {
															handleAddMaintenance(chair.id, "sanitation", 30, "13:00");
															setActiveHeaderMaintenanceChairId(null);
														}}
														className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-amber-500/15 text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
														style={{ minHeight: "44px" }}
														data-testid={`btn-maintenance-sanitation-30-${chair.id}`}
													>
														<Clock size={13} className="text-amber-500 shrink-0" />
														<span>Санобработка 30м</span>
													</button>
													<button
														type="button"
														onClick={() => {
															handleAddMaintenance(chair.id, "sanitation", 60, "13:00");
															setActiveHeaderMaintenanceChairId(null);
														}}
														className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-amber-500/15 text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
														style={{ minHeight: "44px" }}
														data-testid={`btn-maintenance-sanitation-60-${chair.id}`}
													>
														<Clock size={13} className="text-amber-500 shrink-0" />
														<span>Санобработка 60м</span>
													</button>
												</div>
												<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-1">
													Технический перерыв (1 клик):
												</span>
												<div className="grid grid-cols-2 gap-1.5">
													<button
														type="button"
														onClick={() => {
															handleAddMaintenance(chair.id, "tech_break", 30, "14:00");
															setActiveHeaderMaintenanceChairId(null);
														}}
														className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-amber-500/15 text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
														style={{ minHeight: "44px" }}
														data-testid={`btn-maintenance-tech-30-${chair.id}`}
													>
														<Clock size={13} className="text-amber-500 shrink-0" />
														<span>Техперерыв 30м</span>
													</button>
													<button
														type="button"
														onClick={() => {
															handleAddMaintenance(chair.id, "tech_break", 60, "14:00");
															setActiveHeaderMaintenanceChairId(null);
														}}
														className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-amber-500/15 text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
														style={{ minHeight: "44px" }}
														data-testid={`btn-maintenance-tech-60-${chair.id}`}
													>
														<Clock size={13} className="text-amber-500 shrink-0" />
														<span>Техперерыв 60м</span>
													</button>
												</div>
											</div>
										</div>
									)}

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
															aria-label={`2 смены на кресле ${chair.name}: 08:00–14:00 ${mornSub?.doctorName || "Врач 1"}, 14:00–20:00 ${eveSub?.doctorName || "Врач 2"}`}
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
																	<Sun size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
																	<span className="text-amber-600 dark:text-amber-400 font-normal shrink-0 whitespace-nowrap">08:00–14:00:</span>
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
																	<Moon size={13} className="text-indigo-400 shrink-0" aria-hidden="true" />
																	<span className="text-indigo-500 dark:text-indigo-300 font-normal shrink-0 whitespace-nowrap">14:00–20:00:</span>
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
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center gap-1 flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на утро только"
																	data-testid={`chair-quick-morning-${chair.id}`}
																>
																	<Sun size={12} className="shrink-0 text-amber-500" aria-hidden="true" />
																	<span>Утро</span>
																</button>
															)}
															{eveSub && (
																<button
																	type="button"
																	onClick={() => handleConfirmAssignDoctor(chair.id, eveSub.doctorId, "evening")}
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center gap-1 flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на вечер только"
																	data-testid={`chair-quick-evening-${chair.id}`}
																>
																	<Moon size={12} className="shrink-0 text-indigo-400" aria-hidden="true" />
																	<span>Вечер</span>
																</button>
															)}
															{mornSub && (
																<button
																	type="button"
																	onClick={() => handleConfirmAssignDoctor(chair.id, mornSub.doctorId, "full")}
																	className="min-h-[44px] text-[11px] font-bold py-1 px-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer flex items-center justify-center gap-1 flex-1"
																	style={{ minHeight: "44px" }}
																	title="Переключить на весь день"
																	data-testid={`chair-quick-full-${chair.id}`}
																>
																	<Building2 size={12} className="shrink-0 text-[var(--teal)]" aria-hidden="true" />
																	<span>Весь день</span>
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
													{(!doctors || doctors.length === 0) && (
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
																<span className="shrink-0 whitespace-nowrap text-[var(--muted)] font-normal text-[11px] inline-flex items-center gap-1">
																	·{" "}
																	{assignment!.shiftPreset === "morning" || assignment!.shiftHours === "08:00–14:00" ? (
																		<>
																			<Sun size={11} className="text-amber-500 shrink-0" aria-hidden="true" />
																			<span>{assignment!.shiftHours}</span>
																		</>
																	) : assignment!.shiftPreset === "evening" || assignment!.shiftHours === "14:00–20:00" ? (
																		<>
																			<Moon size={11} className="text-indigo-400 shrink-0" aria-hidden="true" />
																			<span>{assignment!.shiftHours}</span>
																		</>
																	) : (
																		<span>{assignment!.shiftHours}</span>
																	)}
																</span>
															</div>
															{isSingleOnDuty && (
																<span
																	className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30"
																	data-testid={`chair-duty-badge-${chair.id}`}
																>
																	<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
																	<span>● На смене</span>
																</span>
															)}
															<Edit2 size={12} className="shrink-0 opacity-60 group-hover:opacity-100 ml-0.5" />
														</button>
													)}
													{/* StomX / IDENT Shift Coverage Strip (Only show when not full day to eliminate duplicate chips) */}
													{Boolean(!doctors || doctors.length === 0) && !(assignment!.shiftPreset === "full" || (!assignment!.shiftPreset && sStart <= 8 && sEnd >= 20)) && (
														<div
															className="grid grid-cols-2 gap-1 w-full text-[10px] font-medium"
															data-testid={`chair-shift-strip-${chair.id}`}
														>
															<div
																className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 min-w-0 ${
																	assignment!.shiftPreset === "morning" || (!assignment!.shiftPreset && sStart <= 8)
																		? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/30 text-[var(--teal-dark,var(--teal))]"
																		: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-80"
																}`}
																data-testid={`chair-status-morning-${chair.id}`}
																title={
																	assignment!.shiftPreset === "morning" || (!assignment!.shiftPreset && sStart <= 8)
																		? `Утренняя смена (08:00–14:00): ${assignment!.doctorName}`
																		: "Утренняя смена свободна"
																}
															>
																<Sun size={10} className="text-amber-500 shrink-0" aria-hidden="true" />
																<span className="truncate">
																	<span className="font-bold">Утро: </span>
																	{assignment!.shiftPreset === "morning" || (!assignment!.shiftPreset && sStart <= 8)
																		? formatDoctorShortName(assignment!.doctorName)
																		: "Свободно"}
																</span>
															</div>
															<div
																className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 min-w-0 ${
																	assignment!.shiftPreset === "evening" || (!assignment!.shiftPreset && sEnd >= 20)
																		? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/30 text-[var(--teal-dark,var(--teal))]"
																		: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-80"
																}`}
																data-testid={`chair-status-evening-${chair.id}`}
																title={
																	assignment!.shiftPreset === "evening" || (!assignment!.shiftPreset && sEnd >= 20)
																		? `Вечерняя смена (14:00–20:00): ${assignment!.doctorName}`
																		: "Вечерняя смена свободна"
																}
															>
																<Moon size={10} className="text-indigo-400 shrink-0" aria-hidden="true" />
																<span className="truncate">
																	<span className="font-bold">Вечер: </span>
																	{assignment!.shiftPreset === "evening" || (!assignment!.shiftPreset && sEnd >= 20)
																		? formatDoctorShortName(assignment!.doctorName)
																		: "Свободно"}
																</span>
															</div>
														</div>
													)}
													{/* 1-Click Shift Segmented Control (StomX / DentalPRO parity) */}
													<details className="hidden">
														<summary className="w-full h-7 min-h-[28px] px-2 py-0.5 flex items-center justify-between gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer select-none list-none transition-colors [&::-webkit-details-marker]:hidden">
															<span className="truncate flex items-center gap-1">
																<Clock size={11} className="text-[var(--teal)] shrink-0" />
																<span className="font-semibold text-[var(--ink)]">Смена:</span>
																<span className="truncate">
																	{assignment!.shiftPreset === "morning"
																		? "Утро"
																		: assignment!.shiftPreset === "evening"
																			? "Вечер"
																			: assignment!.shiftPreset === "full"
																				? "Весь день"
																				: assignment!.shiftPreset === "two_shifts"
																					? "2 смены"
																					: assignment!.shiftLabel || "Смена"}
																</span>
															</span>
															<ChevronDown size={11} className="shrink-0 text-[var(--muted)] group-open:rotate-180 transition-transform" />
														</summary>
														<div
															className="absolute left-0 right-0 top-full mt-1 z-20 flex items-center justify-between p-1 rounded-xl bg-[var(--paper-elevated,var(--paper))] border border-[var(--line)] shadow-lg gap-0.5"
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
																	className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																		assignment!.shiftPreset === "two_shifts" || (assignment!.subShifts && assignment!.subShifts.length > 1)
																			? "bg-[var(--teal)] text-white shadow-xs"
																			: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
																	}`}
																	style={{ minHeight: "44px" }}
																	title="2 смены (Утро + Вечер разные врачи)"
																	aria-label="Две смены"
																	data-testid={`chair-quick-twoshifts-${chair.id}`}
																>
																	<Users size={12} className="shrink-0" />
																	<span className="text-[11px] font-bold">2 см</span>
																</button>
															)}
															<button
																type="button"
																onClick={() => {
																	const dayOfMonth = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
																	const isEven = dayOfMonth % 2 === 0;
																	handleConfirmAssignDoctor(chair.id, assignment!.doctorId, isEven ? "morning" : "evening");
																}}
																className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
																	assignment!.shiftLabel?.includes("Чет")
																		? "bg-[var(--teal)] text-white shadow-xs"
																		: "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
																}`}
																style={{ minHeight: "44px" }}
																title="Чётные/Нечётные дни (авто-смена утро/вечер)"
																aria-label="Четные и нечетные дни"
																data-testid={`chair-quick-evenodd-${chair.id}`}
															>
																<Zap size={12} className="shrink-0 text-amber-500" />
																<span className="text-[11px] font-bold">Ч/Н</span>
															</button>
														</div>
													</details>
												</div>
											);
										})()
									) : (
										<div className="w-full flex flex-col gap-1">
											{/* StomX / IDENT Shift Coverage Strip (Both shifts unassigned/free) */}
											<div
												className="grid grid-cols-2 gap-1 w-full text-[10px] font-medium text-[var(--muted)]"
												data-testid={`chair-shift-strip-${chair.id}`}
											>
												<div
													className="px-1.5 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] flex items-center gap-1 min-w-0 opacity-80"
													data-testid={`chair-status-morning-${chair.id}`}
													title="Утренняя смена (08:00–14:00): Свободно"
												>
													<Sun size={10} className="text-amber-500 shrink-0" aria-hidden="true" />
													<span className="truncate"><span className="font-bold">Утро: </span>Свободно</span>
												</div>
												<div
													className="px-1.5 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] flex items-center gap-1 min-w-0 opacity-80"
													data-testid={`chair-status-evening-${chair.id}`}
													title="Вечерняя смена (14:00–20:00): Свободно"
												>
													<Moon size={10} className="text-indigo-400 shrink-0" aria-hidden="true" />
													<span className="truncate"><span className="font-bold">Вечер: </span>Свободно</span>
												</div>
											</div>
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
				{timeSlots.map((hour, hIndex) => {
					const [sH, sM] = hour.split(":").map(Number);
					const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);
					const slotEndMin = slotStartMin + gridStep;

					return (
						<div
							key={hour}
							className="grid min-w-full hover:bg-[var(--paper-soft)]/50 transition-colors"
							style={{
								minWidth: effectiveChairs.length > 1 ? `${Math.max(260, 72 + effectiveChairs.length * 180)}px` : undefined,
								gridTemplateColumns: `clamp(64px, 15vw, 76px) repeat(${effectiveChairs.length}, minmax(${effectiveChairs.length === 1 ? "200px" : "180px"}, 1fr))`,
							}}
						>
							{/* Time label */}
							<div className="px-1.5 sm:px-3 py-3 text-center text-xs font-bold text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center select-none sticky left-0 z-10 bg-[var(--paper)]">
								{hour}
							</div>

							{/* Chair Cells */}
							{effectiveChairs.map((chair, chairIndex) => {
								const chairPalette = getStomxWorkplacePalette((chair as any).colorId ?? chair.id ?? chairIndex);
								const chairAccentColor = chair.color || chairPalette.bright_code;
								const slotStartIso = `${dateKey}T${hour}:00.000Z`;
								const cellAppointments = dayAppointments.filter((a) => {
									if (chair.id !== DEFAULT_SOLO_CHAIR.id && a.chairId !== chair.id) {
										return false;
									}
									const aTime = toDateTimeLocalValue(a.startsAt, timezone).slice(
										11,
										16,
									);
									const [aH, aM] = aTime.split(":").map(Number);
									const aTotalMin = (aH ?? 0) * 60 + (aM ?? 0);
									return aTotalMin >= slotStartMin && aTotalMin < slotEndMin;
								});

								const continuingAppointments = dayAppointments.filter((a) => {
									if (chair.id !== DEFAULT_SOLO_CHAIR.id && a.chairId !== chair.id) {
										return false;
									}
									const aStartStr = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
									const [aStartH, aStartM] = aStartStr.split(":").map(Number);
									const aStartTotalMin = (aStartH ?? 0) * 60 + (aStartM ?? 0);

									const aEndStr = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);
									const [aEndH, aEndM] = aEndStr.split(":").map(Number);
									const aEndTotalMin = (aEndH ?? 0) * 60 + (aEndM ?? 0);

									return aStartTotalMin < slotStartMin && aEndTotalMin > slotStartMin;
								});

								const cellMaintenance = effectiveMaintenanceBlocks.filter((m) => {
									if (m.chairId !== chair.id) return false;
									const mDate = m.startsAt
										? toDateTimeLocalValue(m.startsAt, timezone).slice(0, 10)
										: dateKey;
									if (mDate !== dateKey) return false;
									const mTime = m.startsAt
										? toDateTimeLocalValue(m.startsAt, timezone).slice(11, 16)
										: "13:00";
									const [mH, mM] = mTime.split(":").map(Number);
									const mTotalMin = (mH ?? 0) * 60 + (mM ?? 0);
									return mTotalMin >= slotStartMin && mTotalMin < slotEndMin;
								});

								if (
									cellAppointments.length > 0 ||
									cellMaintenance.length > 0 ||
									continuingAppointments.length > 0
								) {
									return (
										<div
											key={chair.id}
											className="p-1.5 border-r border-[var(--line)] last:border-r-0 space-y-1.5 min-h-[56px] flex flex-col justify-center"
											data-chair-id={chair.id}
											data-chair-palette={chairPalette.nameRu}
										>
											{continuingAppointments.map((cA) => {
												const cPatientName = patientName(dashboard.patients, cA.patientId);
												return (
													<div
														key={`continuing-${cA.id}`}
														className="w-full p-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-200 text-xs font-semibold flex items-center justify-between gap-1 shadow-2xs select-none min-w-0"
														title={`Приём продолжается: ${cPatientName}`}
														data-testid={`appointment-continuing-${chair.id}-${hour.replace(":", "")}`}
													>
														<div className="flex items-center gap-1.5 truncate min-w-0">
															<Clock size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
															<span className="truncate">Приём продолжается ({cPatientName})</span>
														</div>
													</div>
												);
											})}
											{cellMaintenance.map((mBlock) => {
												const mReasonLabel =
													mBlock.reason === "sanitation"
														? "Санитарная обработка"
														: mBlock.reason === "tech_break"
															? "Технический перерыв"
															: mBlock.reason === "maintenance"
																? "Техобслуживание"
																: mBlock.reason;
												const mDuration = mBlock.startsAt && mBlock.endsAt
													? Math.round((Date.parse(mBlock.endsAt) - Date.parse(mBlock.startsAt)) / 60000)
													: 30;
												return (
													<div
														key={mBlock.id}
														className="w-full p-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-1 shadow-2xs min-w-0"
														data-testid={`chair-maintenance-block-${chair.id}`}
													>
														<div className="flex items-center gap-1.5 truncate min-w-0">
															<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
															<span className="truncate">{mReasonLabel} ({mDuration} мин)</span>
														</div>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleRemoveMaintenance(mBlock.id);
															}}
															className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
															title="Удалить технический перерыв"
															aria-label="Удалить технический перерыв"
															data-testid={`btn-remove-maintenance-${chair.id}`}
														>
															<X size={13} />
														</button>
													</div>
												);
											})}
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
														data-testid={`appointment-card-${a.id}`}
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
																		: isAppointmentInChair(a.status)
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
																				className="min-h-[44px] min-w-[44px] sm:min-h-[44px] sm:min-w-[44px] p-2 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer flex items-center justify-center"
																				style={{ minHeight: "44px", minWidth: "44px" }}
																				title="Скопировать SMS напоминание"
																				aria-label="Скопировать SMS напоминание"
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
																			<span
																				className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 truncate max-w-[120px]"
																				title={docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
																			>
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
																		<div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
																			<button
																				type="button"
																				data-testid={`hover-status-confirmed-${a.id}`}
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
																				data-testid={`hover-status-arrived-${a.id}`}
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
																				<span>Прибыл</span>
																			</button>
																			<button
																				type="button"
																				data-testid={`hover-status-in-treatment-${a.id}`}
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "in_treatment");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					isAppointmentInChair(a.status)
																						? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
																						: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
																				}`}
																			>
																				<CalendarCheck size={11} />
																				<span>В кресле</span>
																			</button>
																			<button
																				type="button"
																				data-testid={`hover-status-completed-${a.id}`}
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "completed");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "completed"
																						? "bg-slate-600 text-white border-slate-600"
																						: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
																				}`}
																			>
																				<CheckCircle2 size={11} />
																				<span>Завершен</span>
																			</button>
																			<button
																				type="button"
																				data-testid={`hover-status-no-show-${a.id}`}
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "no_show");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "no_show"
																						? "bg-rose-500 text-white border-rose-500"
																						: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
																				}`}
																			>
																				<UserX size={11} />
																				<span>Не явился</span>
																			</button>
																		</div>
																	</div>
																)}

																{/* 7. Быстрое изменение длительности и сдвиг при опоздании (Wave 58) */}
																<div className="pt-2 border-t border-[var(--line)]">
																	<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
																		<span>Длительность и сдвиг (1 клик)</span>
																	</div>
																	<div className="grid grid-cols-4 gap-1">
																		<button
																			type="button"
																			data-testid={`hover-duration-plus-15-${a.id}`}
																			onClick={(e) => {
																				e.stopPropagation();
																				handleAdjustAppointmentDuration(a, 15);
																			}}
																			className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																			title="Увеличить длительность на 15 минут"
																		>
																			<Clock size={11} className="text-[var(--teal)] shrink-0" />
																			<span>+15 мин</span>
																		</button>
																		<button
																			type="button"
																			data-testid={`hover-duration-plus-30-${a.id}`}
																			onClick={(e) => {
																				e.stopPropagation();
																				handleAdjustAppointmentDuration(a, 30);
																			}}
																			className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																			title="Увеличить длительность на 30 минут"
																		>
																			<Clock size={11} className="text-[var(--teal)] shrink-0" />
																			<span>+30 мин</span>
																		</button>
																		<button
																			type="button"
																			data-testid={`hover-duration-minus-15-${a.id}`}
																			onClick={(e) => {
																				e.stopPropagation();
																				handleAdjustAppointmentDuration(a, -15);
																			}}
																			className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																			title="Уменьшить длительность на 15 минут"
																		>
																			<Clock size={11} className="text-[var(--teal)] shrink-0" />
																			<span>-15 мин</span>
																		</button>
																		<button
																			type="button"
																			data-testid={`hover-shift-late-15-${a.id}`}
																			onClick={(e) => {
																				e.stopPropagation();
																				handleShiftAppointmentLateness(a, 15);
																			}}
																			className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
																			title="Сдвинуть прием на 15 минут вперед при опоздании"
																		>
																			<FastForward size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
																			<span>Сдвиг +15 мин</span>
																		</button>
																	</div>
																</div>
															</div>
															);
														})()}

														{/* Карточка записи: 3 главных фокуса (ФИО, процедура, цветной маркер статуса) по стандарту Apple HIG */}
														<div
															data-testid={`appointment-card-clickable-${a.id}`}
															onClick={() => {
																if (typeof window !== "undefined" && window.innerWidth < 768) {
																	setSelectedMobileAppt(a);
																} else {
																	onAppointmentClick(a);
																}
															}}
															className="cursor-pointer flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-1.5 sm:gap-2 min-w-0"
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
																			<span className="text-xs px-1 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
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
																		title="CITO! Прием по острой боли (овербукинг)"
																		data-testid="appointment-cito-overbooking-badge"
																	>
																		<Zap size={11} className="fill-white" />
																		<span>CITO</span>
																	</span>
																)}
																<div className="relative">
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			if (onQuickStatusChange) {
																				setActiveStatusPickerApptId((prev) => (prev === a.id ? null : a.id));
																			}
																		}}
																		className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all cursor-pointer hover:opacity-90 active:scale-95 max-w-[120px] sm:max-w-none truncate ${
																			isAppointmentInChair(a.status)
																				? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
																				: a.status === "arrived"
																					? "bg-amber-500 text-white shadow-xs"
																					: a.status === "confirmed"
																						? "bg-emerald-600 text-white shadow-xs"
																						: a.status === "completed"
																							? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
																							: "bg-[var(--paper)]/80 text-[var(--ink)]"
																		}`}
																		title={`Статус: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}. Нажмите для быстрой смены в 1 клик`}
																		aria-label={`Сменить статус визита, текущий: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}`}
																		data-testid={`appointment-card-status-badge-${a.id}`}
																	>
																		{isAppointmentInChair(a.status) && (
																			<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
																		)}
																		{String(a.status).toLowerCase() === "completed" && (
																			<Check size={11} className="shrink-0 text-current" />
																		)}
																		<span className="truncate">{getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}</span>
																	</button>

																	{activeStatusPickerApptId === a.id && onQuickStatusChange && (
																		<div
																			className="absolute right-0 top-full mt-1 z-50 p-1.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[190px] max-w-[calc(100vw-32px)] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
																			onClick={(e) => e.stopPropagation()}
																			data-testid={`appointment-status-picker-popover-${a.id}`}
																		>
																			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
																				Статус визита (1 клик)
																			</div>
																			<button
																				type="button"
																				onClick={() => {
																					onQuickStatusChange(a.id, "confirmed");
																					setActiveStatusPickerApptId(null);
																				}}
																				className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																					a.status === "confirmed"
																						? "bg-emerald-600 text-white font-bold"
																						: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
																				}`}
																				data-testid={`quick-status-picker-confirmed-${a.id}`}
																			>
																				<PhoneCall size={13} />
																				<span>Подтвержден</span>
																			</button>
																			<button
																				type="button"
																				onClick={() => {
																					onQuickStatusChange(a.id, "arrived");
																					setActiveStatusPickerApptId(null);
																				}}
																				className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																					a.status === "arrived"
																						? "bg-amber-500 text-white font-bold"
																						: "hover:bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300"
																				}`}
																				data-testid={`quick-status-picker-arrived-${a.id}`}
																			>
																				<UserCheck size={13} />
																				<span>Прибыл</span>
																			</button>
																			<button
																				type="button"
																				onClick={() => {
																					onQuickStatusChange(a.id, "in_treatment");
																					setActiveStatusPickerApptId(null);
																				}}
																				className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																					isAppointmentInChair(a.status)
																						? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
																						: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
																				}`}
																				data-testid={`quick-status-picker-in-treatment-${a.id}`}
																			>
																				<CalendarCheck size={13} />
																				<span>В кресле</span>
																			</button>
																			<button
																				type="button"
																				onClick={() => {
																					onQuickStatusChange(a.id, "completed");
																					setActiveStatusPickerApptId(null);
																				}}
																				className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																					a.status === "completed"
																						? "bg-slate-600 text-white font-bold"
																						: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
																				}`}
																				data-testid={`quick-status-picker-completed-${a.id}`}
																			>
																				<CheckCircle2 size={13} />
																				<span>Завершен</span>
																			</button>
																			<button
																				type="button"
																				onClick={() => {
																					onQuickStatusChange(a.id, "no_show");
																					setActiveStatusPickerApptId(null);
																				}}
																				className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																					a.status === "no_show"
																						? "bg-rose-500 text-white font-bold"
																						: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
																				}`}
																				data-testid={`quick-status-picker-no-show-${a.id}`}
																			>
																				<UserX size={13} />
																				<span>Не явился</span>
																			</button>
																		</div>
																	)}
																</div>
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

														{/* Compact Action Bar (Позвонить, Профиль, Меню ...) — Compact 24px height to avoid distorting 15-30 min grid slots */}
														<div className="flex items-center gap-1 pt-1 border-t border-[var(--line)]/50 mt-1">
															{patObj?.phone ? (
																<a
																	href={`tel:${patObj.phone}`}
																	onClick={(e) => e.stopPropagation()}
																	className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Позвонить ${pName}: ${patObj.phone}`}
																	aria-label={`Позвонить ${pName}`}
																>
																	<Phone size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Позвонить</span>
																</a>
															) : (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		onAppointmentClick(a);
																	}}
																	className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Открыть прием ${pName}`}
																	aria-label={`Открыть прием ${pName}`}
																>
																	<User size={12} className="text-[var(--teal)] shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Прием</span>
																</button>
															)}

															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	onAppointmentClick(a);
																}}
																className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-[var(--teal,var(--brand-primary))]/40 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																title={`Открыть профиль ${pName}`}
																aria-label={`Открыть профиль ${pName}`}
															>
																<User size={12} className="text-[var(--teal)] shrink-0" />
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
																	className="h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none"
																	title="Все действия и статусы визита"
																	aria-label="Дополнительные действия визита"
																	aria-expanded={activeMenuApptId === a.id}
																>
																	<MoreVertical size={13} />
																</button>

																{activeMenuApptId === a.id && (
																	<div
																		className="absolute right-0 bottom-full mb-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[210px] max-w-[calc(100vw-32px)] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
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
																					className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
																					className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
																					className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						isAppointmentInChair(a.status)
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
																					className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
																					className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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

																		{/* Блок «Длительность (1 клик)» */}
																		<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																				Длительность (1 клик)
																			</div>
																			<div className="grid grid-cols-3 gap-1 px-1">
																				<button
																					type="button"
																					data-testid={`menu-duration-plus-15-${a.id}`}
																					onClick={() => {
																						handleAdjustAppointmentDuration(a, 15);
																						setActiveMenuApptId(null);
																					}}
																					className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																					title="+15 минут"
																				>
																					<Clock size={12} className="text-[var(--teal)] shrink-0" />
																					<span>+15 мин</span>
																				</button>
																				<button
																					type="button"
																					data-testid={`menu-duration-plus-30-${a.id}`}
																					onClick={() => {
																						handleAdjustAppointmentDuration(a, 30);
																						setActiveMenuApptId(null);
																					}}
																					className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																					title="+30 минут"
																				>
																					<Clock size={12} className="text-[var(--teal)] shrink-0" />
																					<span>+30 мин</span>
																				</button>
																				<button
																					type="button"
																					data-testid={`menu-duration-minus-15-${a.id}`}
																					onClick={() => {
																						handleAdjustAppointmentDuration(a, -15);
																						setActiveMenuApptId(null);
																					}}
																					className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
																					title="-15 минут"
																				>
																					<Clock size={12} className="text-[var(--teal)] shrink-0" />
																					<span>-15 мин</span>
																				</button>
																			</div>
																		</div>

																		{/* Блок «Опоздание» */}
																		<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																				Опоздание
																			</div>
																			<button
																				type="button"
																				data-testid={`menu-shift-late-15-${a.id}`}
																				onClick={() => {
																					handleShiftAppointmentLateness(a, 15);
																					setActiveMenuApptId(null);
																				}}
																				className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 font-bold transition-colors cursor-pointer"
																				title="Сдвинуть на +15 мин (опоздание)"
																			>
																				<FastForward size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
																				<span>Сдвинуть на +15 мин (опоздание)</span>
																			</button>
																		</div>

																		{/* Сменить кресло (1 клик без модального ада) */}
																		{effectiveChairs.length > 1 && (
																			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																					Сменить кресло (1 клик)
																				</div>
																				<div className="flex items-center gap-1 px-1 flex-wrap">
																					{effectiveChairs.map((ch, chIdx) => {
																						const chPalette = getStomxWorkplacePalette((ch as any).colorId ?? ch.id ?? chIdx);
																						const chAccent = ch.color || chPalette.bright_code;
																						const isCurrent = a.chairId === ch.id;
																						return (
																							<button
																								key={ch.id}
																								type="button"
																								data-testid={`menu-reassign-chair-${a.id}-${ch.id}`}
																								onClick={() => handleReassignAppointmentChair(a, ch.id)}
																								className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
																									isCurrent
																										? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
																										: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
																								}`}
																								title={`Переместить прием на кресло «${ch.name}» (${chPalette.nameRu})`}
																							>
																								<span
																									className="w-2 h-2 rounded-full shrink-0"
																									style={{ backgroundColor: chAccent }}
																								/>
																								<span className="truncate">{ch.name}</span>
																							</button>
																						);
																					})}
																				</div>
																			</div>
																		)}

																		{/* Сменить врача (1 клик без модального ада) */}
																		{doctors.length > 1 && (
																			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																					Сменить врача (1 клик)
																				</div>
																				<div className="flex items-center gap-1 px-1 flex-wrap">
																					{doctors.slice(0, 4).map((doc) => {
																						const isCurrent = a.doctorUserId === doc.id;
																						return (
																							<button
																								key={doc.id}
																								type="button"
																								data-testid={`menu-reassign-doctor-${a.id}-${doc.id}`}
																								onClick={() => handleReassignAppointmentDoctor(a, doc.id)}
																								className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
																									isCurrent
																										? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
																										: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
																								}`}
																								title={`Передать прием врачу ${doc.fullName}`}
																							>
																								<span className="truncate">{formatDoctorShortName(doc.fullName)}</span>
																							</button>
																						);
																					})}
																					{doctors.length > 4 && (
																						<select
																							value={a.doctorUserId || ""}
																							onChange={(e) => {
																								if (e.target.value) {
																									handleReassignAppointmentDoctor(a, e.target.value);
																								}
																							}}
																							className="min-h-[36px] text-xs font-semibold border border-[var(--line)] rounded-lg px-2 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer max-w-[130px] truncate"
																							title="Выбрать другого врача"
																							data-testid={`menu-reassign-doctor-select-${a.id}`}
																						>
																							<option value="" disabled>Все врачи...</option>
																							{doctors.map((d) => (
																								<option key={d.id} value={d.id}>
																									{formatDoctorShortName(d.fullName)}
																								</option>
																							))}
																						</select>
																					)}
																				</div>
																			</div>
																		)}

																		{/* Освободить слот -> в лист ожидания */}
																		<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																			<button
																				type="button"
																				data-testid={`menu-free-slot-waitlist-${a.id}`}
																				onClick={() => {
																					handleFreeSlotToWaitlist(a);
																				}}
																				className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 font-bold transition-colors cursor-pointer"
																				title="Освободить слот -> в лист ожидания"
																			>
																				<UserMinus size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
																				<span>Освободить слот -&gt; в лист ожидания</span>
																			</button>
																		</div>
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
										data-chair-id={chair.id}
										data-chair-palette={chairPalette.nameRu}
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
													const targetDocName =
														dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)?.fullName ||
														effectiveChairAssignments[chair.id]?.doctorName ||
														undefined;
													const slotDuration = data.durationMinutes || 30;
													const targetStartIso = `${dateKey}T${hour}:00:00.000Z`;
													const targetEndIso = new Date(Date.parse(targetStartIso) + slotDuration * 60000).toISOString();

													const isSourceCito = isCitoAppointment(sourceAppt);

													// Pre-check collision before move to protect administrator from accidental double-booking
													const collisionCheck = checkAppointmentResourceCollision(
														{
															startsAt: targetStartIso,
															endsAt: targetEndIso,
															doctorUserId: targetDoctorId,
															chairId: targetChairId,
															patientId: sourceAppt.patientId,
															isCito: isSourceCito,
														},
														appointments,
														{
															excludeAppointmentId: sourceAppt.id,
															staff: dashboard?.clinicSettings?.staff,
															chairs: dashboard?.clinicSettings?.chairs,
															patients: dashboard?.patients,
															chairMaintenanceBlocks: effectiveMaintenanceBlocks,
															formatTimeFn: (iso) => toDateTimeLocalValue(iso, timezone).slice(11, 16),
															isCito: isSourceCito,
															allowCitoOverbooking: isSourceCito,
														},
													);

													if (collisionCheck.isCitoOverbooking) {
														showToast(`CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`, "warning", 4500);
													} else if (collisionCheck.hasCollision) {
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
															doctorName: targetDocName,
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
													const targetWaitlistDocName =
														dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)?.fullName ||
														effectiveChairAssignments[chair.id]?.doctorName ||
														undefined;
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
														showToast(
															`Внимание: запись создана с наложением времени (${collisionCheck.message})`,
															"warning",
															5000,
														);
													}

													onSlotClick({
														dateKey,
														startTime: hour,
														chairId: targetChairId,
														doctorUserId: targetDoctorId,
														doctorName: targetWaitlistDocName,
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
											const slotDocId = assignedDocId || selectedDoctorId || null;
											const slotDocName =
												dashboard?.clinicSettings?.staff?.find((m) => m.id === slotDocId)?.fullName ||
												effectiveChairAssignments[chair.id]?.doctorName ||
												undefined;
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
																doctorUserId: slotDocId,
																doctorName: slotDocName,
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
												const offDutyDocName = selectedDoctorId
													? dashboard?.clinicSettings?.staff?.find((m) => m.id === selectedDoctorId)?.fullName
													: undefined;
												return (
													<button
														type="button"
														onClick={() =>
															onSlotClick({
																dateKey,
																startTime: hour,
																chairId: chair.id,
																doctorUserId: selectedDoctorId || null,
																doctorName: offDutyDocName,
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
															doctorUserId: slotDocId,
															doctorName: slotDocName,
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
							<div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
								<span>{mStart} – {mEnd} · {selectedMobileAppt.reason || "Прием"}</span>
								<span
									className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1 ${
										isAppointmentInChair(selectedMobileAppt.status)
											? "bg-[var(--teal,var(--brand-primary))] text-white"
											: selectedMobileAppt.status === "arrived"
												? "bg-amber-500 text-white"
												: selectedMobileAppt.status === "confirmed"
													? "bg-emerald-600 text-white"
													: selectedMobileAppt.status === "completed"
														? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
														: "bg-[var(--paper-soft)] text-[var(--ink)]"
									}`}
								>
									{isAppointmentInChair(selectedMobileAppt.status) && (
										<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
									)}
									<span>
										{getNormalizedAppointmentStatusLabel(selectedMobileAppt.status, appointmentLabels)}
									</span>
								</span>
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
						<div className="flex items-center justify-between gap-2 min-w-0">
							<span className="text-[var(--muted)] shrink-0">Врач:</span>
							<span className="font-bold truncate" title={mDocObj?.fullName || "Не назначен"}>{mDocObj?.fullName || "Не назначен"}</span>
						</div>
						<div className="flex items-center justify-between gap-2 min-w-0">
							<span className="text-[var(--muted)] shrink-0">Ассистент:</span>
							<span className="truncate" title={(() => {
								const asst = selectedMobileAppt.assistantUserId
									? dashboard.clinicSettings?.staff?.find((s) => s.id === selectedMobileAppt.assistantUserId)
									: null;
								return asst?.fullName || "Не назначен";
							})()}>
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
									className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
										isAppointmentInChair(selectedMobileAppt.status)
											? "bg-[var(--teal,var(--brand-primary))] text-white border border-[var(--teal)] font-bold shadow-xs"
											: "bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)]"
									}`}
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

					{/* Quick Duration & Lateness Adjustment (Wave 58) */}
					<div className="space-y-2 pt-2 border-t border-[var(--line)]">
						<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
							Длительность приема:
						</div>
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								data-testid={`mobile-duration-plus-15-${selectedMobileAppt.id}`}
								onClick={() => handleAdjustAppointmentDuration(selectedMobileAppt, 15)}
								className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
								title="+15 минут"
							>
								<Clock size={13} className="text-[var(--teal)] shrink-0" />
								<span>+15 мин</span>
							</button>
							<button
								type="button"
								data-testid={`mobile-duration-plus-30-${selectedMobileAppt.id}`}
								onClick={() => handleAdjustAppointmentDuration(selectedMobileAppt, 30)}
								className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
								title="+30 минут"
							>
								<Clock size={13} className="text-[var(--teal)] shrink-0" />
								<span>+30 мин</span>
							</button>
							<button
								type="button"
								data-testid={`mobile-duration-minus-15-${selectedMobileAppt.id}`}
								onClick={() => handleAdjustAppointmentDuration(selectedMobileAppt, -15)}
								className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
								title="-15 минут"
							>
								<Clock size={13} className="text-[var(--teal)] shrink-0" />
								<span>-15 мин</span>
							</button>
						</div>
						<div className="grid grid-cols-2 gap-2 pt-1">
							<button
								type="button"
								data-testid={`mobile-shift-late-15-${selectedMobileAppt.id}`}
								onClick={() => handleShiftAppointmentLateness(selectedMobileAppt, 15)}
								className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-500/25 transition-colors"
								title="Сдвинуть на +15 мин при опоздании"
							>
								<FastForward size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>Сдвиг +15 мин</span>
							</button>
							<button
								type="button"
								data-testid={`mobile-free-slot-waitlist-${selectedMobileAppt.id}`}
								onClick={() => handleFreeSlotToWaitlist(selectedMobileAppt)}
								className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-500/25 transition-colors"
								title="Освободить слот -> в лист ожидания"
							>
								<UserMinus size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span>В лист ожидания</span>
							</button>
						</div>
					</div>

					{/* Mobile: 1-Click Reassign Chair without modal */}
					{effectiveChairs.length > 1 && (
						<div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
							<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
								Сменить кресло (1 клик):
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{effectiveChairs.map((ch) => {
									const isCurrent = selectedMobileAppt.chairId === ch.id;
									return (
										<button
											key={ch.id}
											type="button"
											data-testid={`mobile-reassign-chair-${selectedMobileAppt.id}-${ch.id}`}
											onClick={() => handleReassignAppointmentChair(selectedMobileAppt, ch.id)}
											className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
												isCurrent
													? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
													: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
											}`}
										>
											<span
												className="w-2 h-2 rounded-full shrink-0"
												style={{ backgroundColor: ch.color || "var(--teal, #0d9488)" }}
											/>
											<span>{ch.name}</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Mobile: 1-Click Reassign Doctor without modal */}
					{doctors.length > 1 && (
						<div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
							<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
								Сменить врача (1 клик):
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{doctors.slice(0, 4).map((doc) => {
									const isCurrent = selectedMobileAppt.doctorUserId === doc.id;
									return (
										<button
											key={doc.id}
											type="button"
											data-testid={`mobile-reassign-doctor-${selectedMobileAppt.id}-${doc.id}`}
											onClick={() => handleReassignAppointmentDoctor(selectedMobileAppt, doc.id)}
											className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
												isCurrent
													? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
													: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
											}`}
										>
											<span>{formatDoctorShortName(doc.fullName)}</span>
										</button>
									);
								})}
								{doctors.length > 4 && (
									<select
										value={selectedMobileAppt.doctorUserId || ""}
										onChange={(e) => {
											if (e.target.value) {
												handleReassignAppointmentDoctor(selectedMobileAppt, e.target.value);
											}
										}}
										className="min-h-[44px] text-xs font-semibold border border-[var(--line)] rounded-xl px-2.5 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
										title="Выбрать другого врача"
										data-testid={`mobile-reassign-doctor-select-${selectedMobileAppt.id}`}
									>
										<option value="" disabled>Все врачи...</option>
										{doctors.map((d) => (
											<option key={d.id} value={d.id}>
												{d.fullName}
											</option>
										))}
									</select>
								)}
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

	{/* 1-Click Chair-to-Doctor Shift Allocation Modal (StomX / DentalPRO Parity, Mandates 8d, 8e, 8n) */}
	{assigningChairId && (
		<DoctorChairScheduleModal
			isOpen={Boolean(assigningChairId)}
			onClose={() => setAssigningChairId(null)}
			chair={
				effectiveChairs.find((c) => c.id === assigningChairId) || {
					id: assigningChairId,
					name: "Кресло",
				}
			}
			chairs={effectiveChairs}
			doctors={doctors}
			dateKey={dateKey}
			currentAssignment={effectiveChairAssignments[assigningChairId]}
			onAssign={(chairId, assignment) => {
				if (assignment) {
					handleConfirmAssignDoctor(
						chairId,
						assignment.doctorId,
						(assignment.shiftPreset as any) || "morning",
						assignment.subShifts?.[1]?.doctorId,
					);
				} else {
					handleUnassignDoctor(chairId);
				}
				setAssigningChairId(null);
			}}
			onAddDoctor={props.onAddDoctor}
			isSoloDoctor={isSoloDoctor}
		/>
	)}

	{/* Quick Add Chair Modal for inline grid additions (only when not delegated to external onOpenAddChair) */}
	{!props.onOpenAddChair && isInternalAddChairModalOpen && (
		<QuickAddChairModal
			isOpen={isInternalAddChairModalOpen}
			onClose={() => setIsInternalAddChairModalOpen(false)}
			existingChairsCount={effectiveChairs.length}
			doctors={doctors}
			onAddChair={props.onAddChair || (async (chairData) => {
				const newChair = {
					id: chairData.id || `chair-${Date.now()}`,
					name: chairData.name,
					room: chairData.room || chairData.roomNumber || "",
					color: chairData.color || "#0d9488",
					specialization: chairData.specialization,
					active: chairData.isActive ?? true,
					branchId: chairData.branchId,
				};
				if (dashboard?.clinicSettings) {
					dashboard.clinicSettings.chairs = [
						...(dashboard.clinicSettings.chairs || []),
						newChair as any,
					];
				}
				if (chairData.defaultDoctorId) {
					handleConfirmAssignDoctor(newChair.id, chairData.defaultDoctorId, "full");
				}
				setIsInternalAddChairModalOpen(false);
			})}
		/>
	)}

	{/* Quick Add Doctor Modal for inline grid additions (StomX / DentalPRO parity, Feature 246) */}
	{isQuickAddDoctorOpen && (
		<QuickAddDoctorModal
			isOpen={isQuickAddDoctorOpen}
			onClose={() => setIsQuickAddDoctorOpen(false)}
			chairs={effectiveChairs}
			existingDoctorsCount={doctors.length}
			onAddDoctor={async (docData) => {
				let createdDoctorId = docData.id;
				if (props.onAddDoctor) {
					const createdResult: any = await props.onAddDoctor(docData);
					if (createdResult && createdResult.id) {
						createdDoctorId = createdResult.id;
					}
				} else {
					const newStaffMember: any = {
						id: docData.id || `doc-quick-${Date.now()}`,
						organizationId:
							dashboard?.clinicSettings?.profile?.organizationId ||
							"00000000-0000-4000-8000-000000000001",
						fullName: docData.fullName,
						role: "doctor",
						specialties: [docData.specialty],
						phone: docData.phone || null,
						email: null,
						active: true,
						canSignMedicalRecords: true,
						canManageMoney: false,
						canManageImports: false,
						color: docData.color,
						preferredChairId: docData.preferredChairId || null,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					createdDoctorId = newStaffMember.id;
					if (dashboard?.clinicSettings) {
						dashboard.clinicSettings.staff = [...(dashboard.clinicSettings.staff || []), newStaffMember];
					}
				}
				if (docData.preferredChairId && createdDoctorId) {
					handleBindDoctorToChair(docData.preferredChairId, createdDoctorId);
				}
				setIsQuickAddDoctorOpen(false);
			}}
		/>
	)}
</div>
	);
});

