import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
	Plus,
	Users,
	Settings2,
	SlidersHorizontal,
	Sun,
	Moon,
	Building2,
	Calendar,
	X,
	XCircle,
	UserCheck,
	Clock,
	Armchair,
	Copy,
	Zap,
	CalendarRange,
	Layers,
} from "lucide-react";
import {
	getMondayOfWeekIso,
	addDaysToDateIso,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	applyDoctorChairWeeklyTemplate,
} from "./roster/DoctorShiftRosterModal";
import {
	ScheduleGrid,
	type ScheduleGridProps,
	type ChairDoctorShiftAssignment,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./ScheduleGrid";
import {
	DEFAULT_CLINIC_CHAIRS,
	type ScheduleChair,
} from "./ScheduleFilterStrip";
import {
	QuickAddChairModal,
	type QuickAddChairData,
} from "./QuickAddChairModal";
import {
	type QuickBookingSlotInfo,
	resolveChairDutyDoctor,
} from "./QuickBookingDrawer";
export { resolveChairDutyDoctor };
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";

export interface ChairScheduleViewProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	patientName?: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime?: (iso: string) => string;
	toDateTimeLocalValue?: (iso: string, timezone?: string | null) => string;
	appointmentLabels?: Record<Appointment["status"], string>;
	selectedChairId?: string | null;
	selectedDoctorId?: string | null;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	onAssignChairDoctor?:
		| ((
				chairId: string,
				assignment: ChairDoctorShiftAssignment | null,
		  ) => void)
		| undefined;
	onAddChair?: (chairData: QuickAddChairData) => Promise<void> | void;
	onOpenRosterModal?: () => void;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
}

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

/**
 * ChairScheduleView — Dedicated dental chair schedule view with StomX & IDENT parity.
 * Features:
 * - Direct chair columns with doctor duty shift badges (morning 08:00–14:00, evening 14:00–20:00, full day)
 * - 1-click slot booking with auto-populated duty doctor
 * - Quick chair addition and on-the-fly chair editing
 * - Mandate 8n: Solo doctor / 1-chair mode with zero friction
 * - Mandate 8e: 0 disabled buttons without guidance
 */
export const ChairScheduleView: React.FC<ChairScheduleViewProps> = ({
	dashboard,
	dateKey,
	appointments,
	onSlotClick,
	onAppointmentClick,
	patientName,
	formatTime,
	toDateTimeLocalValue,
	appointmentLabels,
	selectedChairId,
	selectedDoctorId,
	chairDoctorAssignments,
	onAssignChairDoctor,
	onAddChair,
	onOpenRosterModal,
	onSelectChair,
}) => {
	const [isAddChairOpen, setIsAddChairOpen] = useState(false);
	const [editingChair, setEditingChair] = useState<QuickAddChairData | null>(null);
	const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(
		selectedChairId ?? null,
	);
	const [activeShiftChairId, setActiveShiftChairId] = useState<string | null>(null);
	const [popoverSelectedDocId, setPopoverSelectedDocId] = useState<Record<string, string>>({});
	const [isSubstituteOpen, setIsSubstituteOpen] = useState<Record<string, boolean>>({});
	const popoverRef = useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (selectedChairId !== undefined) {
			setInternalSelectedChairId(selectedChairId);
		}
	}, [selectedChairId]);

	useEffect(() => {
		if (!activeShiftChairId) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setActiveShiftChairId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeShiftChairId]);

	const effectiveSelectedChairId =
		selectedChairId !== undefined ? selectedChairId : internalSelectedChairId;

	const handleToggleChairFilter = useCallback(
		(chairId: string) => {
			const nextSelected = effectiveSelectedChairId === chairId ? null : chairId;
			setInternalSelectedChairId(nextSelected);
			if (onSelectChair) {
				onSelectChair(nextSelected);
			}
		},
		[effectiveSelectedChairId, onSelectChair],
	);

	const chairs = dashboard?.clinicSettings?.chairs ?? [];
	const isSoloDoctor = chairs.length <= 1;

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const resolvedPatientName = useMemo(() => {
		return (
			patientName ||
			((_pts: Dashboard["patients"], id: string | null) => id || "Пациент")
		);
	}, [patientName]);

	const resolvedFormatTime = useMemo(() => {
		return formatTime || ((iso: string) => (iso ? iso.slice(11, 16) : ""));
	}, [formatTime]);

	const resolvedToDateTimeLocalValue = useMemo(() => {
		return (
			toDateTimeLocalValue ||
			((iso: string) => (iso ? iso.slice(0, 16) : ""))
		);
	}, [toDateTimeLocalValue]);

	const resolvedAppointmentLabels = useMemo(() => {
		return appointmentLabels || defaultAppointmentLabels;
	}, [appointmentLabels]);

	const handleOpenAddChair = useCallback(() => {
		setEditingChair(null);
		setIsAddChairOpen(true);
	}, []);

	const handleEditChair = useCallback((chair: QuickAddChairData) => {
		setEditingChair(chair);
		setIsAddChairOpen(true);
	}, []);

	const handleSaveChair = useCallback(
		async (data: QuickAddChairData) => {
			if (onAddChair) {
				await onAddChair(data);
			}
			setIsAddChairOpen(false);
			setEditingChair(null);
		},
		[onAddChair],
	);

	const handleAssignShift = useCallback(
		(chair: ScheduleChair, preset: "morning" | "evening" | "full" | "2x2" | "even_odd") => {
			const targetDocId =
				popoverSelectedDocId[chair.id] ||
				chairDoctorAssignments?.[chair.id]?.doctorId ||
				(chair as any).defaultDoctorId ||
				doctors[0]?.id;
			const targetDoc = doctors.find((d) => d.id === targetDocId) || doctors[0];

			if (!targetDoc) {
				showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
				setActiveShiftChairId(null);
				return;
			}

			let shiftPreset: "morning" | "evening" | "full" | "two_shifts" = "morning";
			let shiftLabel = "Утро 08-14";
			let shiftHours = "08:00–14:00";
			let startHour = 8;
			let endHour = 14;

			if (preset === "evening") {
				shiftPreset = "evening";
				shiftLabel = "Вечер 14-20";
				shiftHours = "14:00–20:00";
				startHour = 14;
				endHour = 20;
			} else if (preset === "full") {
				shiftPreset = "full";
				shiftLabel = "Весь день";
				shiftHours = "08:00–20:00";
				startHour = 8;
				endHour = 20;
			} else if (preset === "2x2") {
				shiftPreset = "two_shifts";
				shiftLabel = "2 через 2";
				shiftHours = "08:00–20:00";
				startHour = 8;
				endHour = 20;
			} else if (preset === "even_odd") {
				const dayOfMonth = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
				const isEven = dayOfMonth % 2 === 0;
				shiftPreset = isEven ? "morning" : "evening";
				shiftLabel = isEven ? "Чет (Утро 08-14)" : "Нечет (Вечер 14-20)";
				shiftHours = isEven ? "08:00–14:00" : "14:00–20:00";
				startHour = isEven ? 8 : 14;
				endHour = isEven ? 14 : 20;
			}

			const assignment: ChairDoctorShiftAssignment = {
				chairId: chair.id,
				chairName: chair.name,
				doctorId: targetDoc.id,
				doctorName: targetDoc.fullName,
				doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
				shiftPreset,
				shiftLabel,
				shiftHours,
				startHour,
				endHour,
			};

			if (typeof window !== "undefined" && dateKey) {
				try {
					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
					existing[chair.id] = assignment;
					localStorage.setItem(storageKey, JSON.stringify(existing));
				} catch {}

				if (preset === "even_odd" || preset === "2x2") {
					try {
						const rawShifts = localStorage.getItem("dente_doctor_shifts");
						const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
						const mondayIso = getMondayOfWeekIso(dateKey);
						const templateId = preset === "even_odd" ? "even_odd_month" : "two_two_full";
						const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
							weekStartDateIso: mondayIso,
							templateId,
							doctorId: targetDoc.id,
							chairId: chair.id,
							staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
						});
						localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
					} catch {}
				}
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, assignment);
			}

			showToast(
				`Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${shiftLabel} • ${chair.name}`,
				"success",
			);

			setActiveShiftChairId(null);
		},
		[chairDoctorAssignments, dateKey, doctors, dashboard?.clinicSettings?.staff, onAssignChairDoctor, popoverSelectedDocId],
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
					} else if (srcDay === dateKey && chairDoctorAssignments) {
						localStorage.setItem(targetKey, JSON.stringify(chairDoctorAssignments));
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
	}, [dateKey, chairDoctorAssignments]);

	const handleCopyTodayShiftsToCurrentWeek = useCallback(
		(workdaysOnly = false) => {
			const label = workdaysOnly ? "будни (Пн–Пт)" : "всю неделю (Пн–Вс)";
			const mondayIso = getMondayOfWeekIso(dateKey);
			const daysCount = workdaysOnly ? 5 : 7;

			let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
				chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

			if (typeof window !== "undefined" && dateKey) {
				try {
					const raw = localStorage.getItem(`dente_chair_doctor_assignments_${dateKey}`);
					if (raw) {
						const parsed = JSON.parse(raw);
						todayAssignments = { ...parsed, ...todayAssignments };
					}
				} catch {}

				try {
					for (let i = 0; i < daysCount; i++) {
						const targetDay = addDaysToDateIso(mondayIso, i);
						localStorage.setItem(
							`dente_chair_doctor_assignments_${targetDay}`,
							JSON.stringify(todayAssignments),
						);
					}
				} catch {}
			}

			showToast(
				`График смен кресел применен на ${label} (${mondayIso}..) в 1 клик (StomX Parity)`,
				"success",
				3500,
			);
		},
		[dateKey, chairDoctorAssignments],
	);

	const handleCopyTodayShiftsToMonth = useCallback(() => {
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

		let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
			chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

		if (typeof window !== "undefined" && dateKey) {
			try {
				const raw = localStorage.getItem(`dente_chair_doctor_assignments_${dateKey}`);
				if (raw) {
					const parsed = JSON.parse(raw);
					todayAssignments = { ...parsed, ...todayAssignments };
				}
			} catch {}

			try {
				for (let d = 1; d <= daysInMonth; d++) {
					const targetDayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
					localStorage.setItem(
						`dente_chair_doctor_assignments_${targetDayIso}`,
						JSON.stringify(todayAssignments),
					);
				}
			} catch {}

			try {
				const rawShifts = localStorage.getItem("dente_doctor_shifts");
				const currentShifts = rawShifts ? JSON.parse(rawShifts) : [];
				const mondayIso = getMondayOfWeekIso(dateKey);
				const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
				localStorage.setItem("dente_doctor_shifts", JSON.stringify(updatedShifts));
			} catch {}
		}

		showToast(
			`График смен кресел применен на весь текущий месяц (${monthName}) в 1 клик (StomX Parity)`,
			"success",
			3500,
		);
	}, [dateKey, chairDoctorAssignments]);

	const handleQuickSubstituteDoctor = useCallback(
		(chair: ScheduleChair, newDoctorId: string) => {
			const targetDoc =
				doctors.find((d) => d.id === newDoctorId) ||
				dashboard?.clinicSettings?.staff?.find((s) => s.id === newDoctorId) ||
				doctors[0];
			const newDoctorName = targetDoc ? targetDoc.fullName : newDoctorId;
			const existingAssignment = chairDoctorAssignments?.[chair.id] || null;

			const updatedAssignment: ChairDoctorShiftAssignment = {
				chairId: chair.id,
				chairName: chair.name,
				doctorId: newDoctorId,
				doctorName: newDoctorName,
				doctorSpecialty:
					targetDoc && (targetDoc as any).specialty
						? String((targetDoc as any).specialty)
						: existingAssignment?.doctorSpecialty,
				shiftPreset: existingAssignment?.shiftPreset || "full",
				shiftLabel: existingAssignment?.shiftLabel || "Весь день",
				shiftHours: existingAssignment?.shiftHours || "08:00–20:00",
				startHour: existingAssignment?.startHour ?? 8,
				endHour: existingAssignment?.endHour ?? 20,
			};

			if (typeof window !== "undefined" && dateKey) {
				try {
					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
					existing[chair.id] = updatedAssignment;
					localStorage.setItem(storageKey, JSON.stringify(existing));
				} catch {}
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, updatedAssignment);
			}

			showToast(
				`Врач ${newDoctorName} подменяет врача на кресле «${chair.name}» (StomX Parity)`,
				"success",
			);
			setIsSubstituteOpen((prev) => ({ ...prev, [chair.id]: false }));
			setActiveShiftChairId(null);
		},
		[
			doctors,
			dashboard?.clinicSettings?.staff,
			chairDoctorAssignments,
			dateKey,
			onAssignChairDoctor,
		],
	);

	const handleRotateChairShifts = useCallback(() => {
		const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
		if (targetChairs.length < 2) {
			showToast("Для ротации требуется минимум 2 кресла", "warning");
			return;
		}

		let currentAssignments: Record<string, ChairDoctorShiftAssignment> =
			chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

		if (typeof window !== "undefined" && dateKey) {
			try {
				const raw = localStorage.getItem(`dente_chair_doctor_assignments_${dateKey}`);
				if (raw) {
					const parsed = JSON.parse(raw);
					currentAssignments = { ...parsed, ...currentAssignments };
				}
			} catch {}
		}

		// Cyclic shift: chair i gets assignment from chair (i - 1 + n) % n
		const n = targetChairs.length;
		const rotatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};

		for (let i = 0; i < n; i++) {
			const targetChair = targetChairs[i]!;
			const sourceChair = targetChairs[(i - 1 + n) % n]!;
			const sourceAssignment = currentAssignments[sourceChair.id];

			if (sourceAssignment) {
				rotatedAssignments[targetChair.id] = {
					...sourceAssignment,
					chairId: targetChair.id,
					chairName: targetChair.name,
				};
			}
		}

		if (typeof window !== "undefined" && dateKey) {
			try {
				localStorage.setItem(
					`dente_chair_doctor_assignments_${dateKey}`,
					JSON.stringify(rotatedAssignments),
				);
			} catch {}
		}

		if (onAssignChairDoctor) {
			for (const chair of targetChairs) {
				onAssignChairDoctor(chair.id, rotatedAssignments[chair.id] || null);
			}
		}

		showToast(
			"Выполнена циклическая ротация смен между креслами в 1 клик (StomX Parity)",
			"success",
			3500,
		);
	}, [chairs, chairDoctorAssignments, dateKey, onAssignChairDoctor]);

	const handleClearAllDayShifts = useCallback(() => {
		if (typeof window !== "undefined" && dateKey) {
			try {
				localStorage.removeItem(`dente_chair_doctor_assignments_${dateKey}`);
			} catch {}
		}

		if (onAssignChairDoctor) {
			const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
			for (const chair of targetChairs) {
				onAssignChairDoctor(chair.id, null);
			}
		}

		showToast(`Все смены кресел на ${dateKey} очищены`, "info");
	}, [dateKey, onAssignChairDoctor, chairs]);

	const handleDuplicateChair = useCallback((chair: ScheduleChair) => {
		const duplicatedData: QuickAddChairData = {
			name: `${chair.name} (копия)`,
			room: (chair as any).roomNumber || (chair as any).room || "",
			color: (chair as any).color || "#0d9488",
			specialization: (chair as any).specialization || "therapist",
			defaultDoctorId: (chair as any).defaultDoctorId || null,
			isActive: true,
		};
		setEditingChair(duplicatedData);
		setIsAddChairOpen(true);
		showToast(`Клонирование параметров кресла «${chair.name}»`, "info", 3000);
		setActiveShiftChairId(null);
	}, []);

	const handleUnassignShift = useCallback(
		(chair: ScheduleChair) => {
			if (typeof window !== "undefined" && dateKey) {
				try {
					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
					delete existing[chair.id];
					localStorage.setItem(storageKey, JSON.stringify(existing));
				} catch {}
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, null);
			}
			showToast(`Врач снят со смены: кресло «${chair.name}» освобождено`, "info");
			setActiveShiftChairId(null);
		},
		[dateKey, onAssignChairDoctor],
	);

	const handleSlotClick = useCallback(
		(slot: QuickBookingSlotInfo) => {
			const slotChairId =
				slot.chairId ||
				effectiveSelectedChairId ||
				chairs[0]?.id ||
				DEFAULT_SOLO_CHAIR.id;
			const targetStartsAt =
				slot.startsAt ||
				(slot.startTime && dateKey ? `${dateKey}T${slot.startTime}:00` : undefined);

			const duty = resolveChairDutyDoctor(
				slotChairId,
				targetStartsAt,
				chairDoctorAssignments,
				dateKey,
				slot.doctorUserId,
			);

			const finalDoctorId = slot.doctorUserId || duty.doctorId || selectedDoctorId || null;
			const finalDoctorName =
				slot.doctorName ||
				(finalDoctorId ? doctors.find((d) => d.id === finalDoctorId)?.fullName : undefined) ||
				chairDoctorAssignments?.[slotChairId]?.doctorName;

			onSlotClick({
				...slot,
				chairId: slotChairId,
				dateKey: slot.dateKey || dateKey,
				startTime: slot.startTime,
				startsAt: targetStartsAt || slot.startsAt,
				doctorUserId: finalDoctorId,
				doctorName: finalDoctorName,
			});
		},
		[
			chairs,
			effectiveSelectedChairId,
			dateKey,
			chairDoctorAssignments,
			selectedDoctorId,
			doctors,
			onSlotClick,
		],
	);

	return (
		<div className="flex flex-col h-full w-full bg-[var(--paper)]">
			{/* Unified Compact Toolbar Row: 32–36px (Hick's Law & Mandate 8d) */}
			<div
				className="flex items-center justify-between px-3 h-9 min-h-[36px] max-h-[36px] border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 select-none"
				data-testid="chair-schedule-palette-strip"
				role="toolbar"
				aria-label="Панель стоматологических установок и смен врачей"
			>
				{/* Left: Установки Counter */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] hidden xl:inline">
						Стоматологические установки:
					</span>
					<span
						className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] border border-[var(--teal)]/20 shrink-0"
						data-testid="chair-view-count-badge"
					>
						{countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
					</span>
					{isSoloDoctor && (
						<span className="text-[10px] text-[var(--muted)] hidden 2xl:inline">
							(Соло: авто-привязка)
						</span>
					)}
				</div>

				{/* Center: Scrollable Chair Palette Chips with Accent Bars (StomX Parity, Feature 190) */}
				<div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 touch-pan-x">
					{chairs.map((chair) => {
						const chairColor = (chair as { color?: string }).color || "#0d9488";
						const isSelected = effectiveSelectedChairId === chair.id;
						const assignedDocName =
							chairDoctorAssignments?.[chair.id]?.doctorName ||
							((chair as any).defaultDoctorId
								? dashboard?.clinicSettings?.staff?.find(
										(s) => s.id === (chair as any).defaultDoctorId,
								  )?.fullName
								: null);
						const assignedShiftLabel =
							chairDoctorAssignments?.[chair.id]?.shiftLabel ||
							chairDoctorAssignments?.[chair.id]?.shiftHours ||
							null;
						const roomLabel =
							(chair as any).roomNumber || (chair as any).room;

						return (
							<div
								key={chair.id}
								onClick={() => handleToggleChairFilter(chair.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleToggleChairFilter(chair.id);
									}
								}}
								tabIndex={0}
								className={`relative px-2 py-1 rounded-lg border text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer select-none text-left h-7 whitespace-nowrap ${
									isSelected
										? "border-[var(--teal)] ring-1 ring-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
										: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/60"
								}`}
								data-testid={`chair-view-badge-${chair.id}`}
								role="button"
								aria-pressed={isSelected}
								title={`Кресло «${chair.name}» (${roomLabel ? `Кабинет ${roomLabel}` : "Кабинет"})${
									assignedDocName ? ` • Врач: ${assignedDocName}` : ""
								}${assignedShiftLabel ? ` [${assignedShiftLabel}]` : ""}. Клик: ${
									isSelected ? "снять фильтр" : "фильтр по этому креслу"
								}`}
							>
								{/* Accent Color Strip */}
								<div
									className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-lg"
									style={{ backgroundColor: chairColor }}
									data-testid={`chair-view-accent-strip-${chair.id}`}
								/>
								<span
									className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
										isSelected ? "scale-125" : ""
									}`}
									style={{ backgroundColor: chairColor }}
									aria-hidden="true"
								/>
								<span className="font-bold text-xs shrink-0">{chair.name}</span>
								{roomLabel && (
									<span
										className="text-[10px] text-[var(--muted)] font-normal shrink-0"
										data-testid={`chair-view-room-${chair.id}`}
									>
										(Каб. {roomLabel})
									</span>
								)}
								{assignedDocName && (
									<span
										className="text-[10px] text-[var(--muted)] font-normal whitespace-nowrap hidden md:inline shrink-0"
										data-testid={`chair-view-doc-${chair.id}`}
									>
										({assignedDocName}
										{assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""})
									</span>
								)}
								{chair.active === false && (
									<span className="text-[9px] text-[var(--muted)] font-normal">
										(архив)
									</span>
								)}
								{isSelected && (
									<span
										className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-[var(--teal)] text-white uppercase tracking-wider"
										data-testid={`chair-view-badge-selected-${chair.id}`}
									>
										Выбрано
									</span>
								)}

								{/* 1-Click Doctor & Shift Binding Trigger (StomX Parity) */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
									}}
									className="p-1 rounded text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title="Назначить врача и смену в 1 клик (StomX / IDENT)"
									data-testid={`chair-view-assign-doctor-${chair.id}`}
									aria-label={`Назначить врача на кресло ${chair.name}`}
								>
									<UserCheck
										size={12}
										className={assignedDocName ? "text-[var(--teal)]" : ""}
									/>
								</button>

								{/* Settings Button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleEditChair(chair as any);
									}}
									className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
									data-testid={`chair-view-settings-${chair.id}`}
									aria-label={`Настройки кресла ${chair.name}`}
								>
									<Settings2 size={12} />
								</button>

								{/* 1-Click Shift Popover */}
								{activeShiftChairId === chair.id && (
									<div
										ref={popoverRef}
										className="absolute top-full mt-1.5 left-0 z-50 w-72 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 cursor-default"
										data-testid={`chair-view-shift-popover-${chair.id}`}
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
											<div className="flex items-center gap-1.5 font-bold text-xs">
												<UserCheck size={14} className="text-[var(--teal)]" />
												<span>Врач на кресле «{chair.name}»</span>
											</div>
											<button
												type="button"
												onClick={() => setActiveShiftChairId(null)}
												className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
											>
												<X size={12} />
											</button>
										</div>

										{/* Doctor select list */}
										<div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
											<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
												Выберите врача:
											</span>
											{doctors.map((doc) => {
												const currentDocId =
													popoverSelectedDocId[chair.id] ||
													chairDoctorAssignments?.[chair.id]?.doctorId ||
													(chair as any).defaultDoctorId ||
													doctors[0]?.id;
												const isDocSelected = currentDocId === doc.id;
												return (
													<button
														key={doc.id}
														type="button"
														onClick={() => {
															setPopoverSelectedDocId((prev) => ({
																...prev,
																[chair.id]: doc.id,
															}));
															if (chairDoctorAssignments?.[chair.id]) {
																const cur = chairDoctorAssignments[chair.id]!;
																const updated: ChairDoctorShiftAssignment = {
																	...cur,
																	doctorId: doc.id,
																	doctorName: doc.fullName,
																	doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
																};
																if (typeof window !== "undefined" && dateKey) {
																	try {
																		const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
																		const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
																		existing[chair.id] = updated;
																		localStorage.setItem(storageKey, JSON.stringify(existing));
																	} catch {}
																}
																if (onAssignChairDoctor) {
																	onAssignChairDoctor(chair.id, updated);
																}
																showToast(
																	`Дежурный врач кресла «${chair.name}» переключен на: ${formatDoctorShortName(doc.fullName)}`,
																	"success",
																);
															}
														}}
														className={`px-2 py-1 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors min-h-[30px] cursor-pointer ${
															isDocSelected
																? "bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--teal)]/30"
																: "hover:bg-[var(--paper-soft)] text-[var(--ink)]"
														}`}
														data-testid={`chair-view-doc-option-${chair.id}-${doc.id}`}
													>
														<span className="truncate">{doc.fullName}</span>
														{(doc as any).specialty && (
															<span className="text-[10px] text-[var(--muted)] truncate ml-1 font-normal">
																{String((doc as any).specialty)}
															</span>
														)}
													</button>
												);
											})}
										</div>

										{/* Shift Presets */}
										<div className="flex flex-col gap-1 border-t border-[var(--line)] pt-2">
											<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
												Смена в 1 клик:
											</span>
											<div className="grid grid-cols-2 gap-1.5">
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "morning")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-morning-${chair.id}`}
												>
													<Sun size={12} className="text-amber-500 shrink-0" />
													<span>Утро 08-14</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "evening")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-evening-${chair.id}`}
												>
													<Moon size={12} className="text-indigo-400 shrink-0" />
													<span>Вечер 14-20</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "full")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-full-${chair.id}`}
												>
													<Clock size={12} className="text-[var(--teal)] shrink-0" />
													<span>Весь день</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "2x2")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-2x2-${chair.id}`}
												>
													<Calendar size={12} className="text-emerald-500 shrink-0" />
													<span>2 через 2</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "even_odd")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer col-span-2"
													data-testid={`chair-view-shift-even-odd-${chair.id}`}
													title="Чётные/Нечётные дни месяца (1 клик)"
												>
													<Zap size={12} className="text-amber-500 shrink-0" />
													<span>Чет/Нечет</span>
												</button>
											</div>
										</div>

										{/* Unassign action */}
										{chairDoctorAssignments?.[chair.id] && (
											<button
												type="button"
												onClick={() => handleUnassignShift(chair)}
												className="mt-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1 transition-colors cursor-pointer"
												data-testid={`chair-view-unassign-${chair.id}`}
											>
												<XCircle size={12} />
												<span>Снять врача</span>
											</button>
										)}

										{/* Duplicate chair action */}
										<button
											type="button"
											onClick={() => handleDuplicateChair(chair)}
											className="mt-1 px-2 py-1 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] border border-[var(--line)] flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
											data-testid={`chair-view-duplicate-${chair.id}`}
											title={`Клонировать параметры кресла «${chair.name}»`}
										>
											<Copy size={12} className="text-[var(--teal)] shrink-0" />
											<span>Клонировать кресло</span>
										</button>

										{/* Quick substitute doctor action (StomX Parity, Feature 245) */}
										<button
											type="button"
											onClick={() =>
												setIsSubstituteOpen((prev) => ({
													...prev,
													[chair.id]: !prev[chair.id],
												}))
											}
											className="mt-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
											style={{ minHeight: "44px" }}
											data-testid={`chair-view-substitute-btn-${chair.id}`}
											title="Быстрая подмена дежурного врача на кресле в 1 клик (StomX Parity)"
										>
											<UserCheck size={14} className="text-amber-500 shrink-0" />
											<span>Подменить врача...</span>
										</button>

										{isSubstituteOpen[chair.id] && (
											<div
												className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--paper-soft)] border border-amber-500/30 max-h-40 overflow-y-auto"
												data-testid={`chair-view-substitute-picker-${chair.id}`}
											>
												<span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
													Выберите врача для подмены:
												</span>
												{doctors.map((doc) => (
													<button
														key={doc.id}
														type="button"
														onClick={() => handleQuickSubstituteDoctor(chair, doc.id)}
														className="px-2 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between hover:bg-[var(--teal-soft)] transition-colors cursor-pointer min-h-[44px]"
														style={{ minHeight: "44px" }}
														data-testid={`chair-view-substitute-option-${chair.id}-${doc.id}`}
													>
														<span className="truncate">{doc.fullName}</span>
														<span className="text-[10px] text-[var(--muted)] shrink-0 ml-1">
															Подменить
														</span>
													</button>
												))}
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}

					{/* Inline Add Chair Strip Button */}
					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal)]/5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors shrink-0 cursor-pointer h-7"
						title="Добавить стоматологическую установку"
						data-testid="chair-view-add-chair-strip-btn"
					>
						<Plus size={11} />
						<span>Кресло</span>
					</button>
				</div>

				{/* Right: Actions (Copy Week, Roster & Add Chair) */}
				<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
					<button
						type="button"
						onClick={() => handleCopyTodayShiftsToCurrentWeek(false)}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Скопировать график смен кресел на текущую неделю (Пн–Вс, 7 дней) в 1 клик (StomX Parity)"
						data-testid="btn-copy-chair-week-current"
					>
						<Calendar size={12} className="text-[var(--teal)]" />
						<span className="hidden sm:inline">На неделю (Пн–Вс)</span>
					</button>

					<button
						type="button"
						onClick={() => handleCopyTodayShiftsToCurrentWeek(true)}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Скопировать график смен кресел на будни (Пн–Пт, 5 дней) в 1 клик (StomX Parity)"
						data-testid="btn-copy-chair-week-workdays"
					>
						<Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
						<span className="hidden sm:inline">На будни (Пн–Пт)</span>
					</button>

					<button
						type="button"
						onClick={handleCopyTodayShiftsToMonth}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Скопировать график смен кресел на весь текущий месяц в 1 клик (StomX Parity)"
						data-testid="btn-copy-chair-month"
					>
						<CalendarRange size={12} className="text-[var(--teal)]" />
						<span className="hidden sm:inline">На месяц</span>
					</button>

					<button
						type="button"
						onClick={handleRotateChairShifts}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Циклическая ротация смен между креслами в 1 клик"
						data-testid="btn-rotate-chair-shifts"
					>
						<Layers size={12} className="text-[var(--teal)]" />
						<span className="hidden sm:inline">Ротация кресел</span>
					</button>

					<button
						type="button"
						onClick={handleClearAllDayShifts}
						className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 text-[11px] font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Очистить все смены кресел на текущий день в 1 клик"
						data-testid="btn-clear-day-shifts"
					>
						<XCircle size={12} />
						<span className="hidden md:inline">Очистить смены дня</span>
					</button>

					<button
						type="button"
						onClick={handleCopyWeekShiftsToNextWeek}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0"
						title="Скопировать график смен кресел на следующую неделю (+7 дней) в 1 клик (StomX Parity)"
						data-testid="btn-copy-chair-week-next"
					>
						<Copy size={12} className="text-[var(--teal)]" />
						<span className="hidden md:inline">На след. неделю</span>
					</button>

					{onOpenRosterModal && (
						<button
							type="button"
							onClick={onOpenRosterModal}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7"
							title="График работы врачей по сменам и креслам (StomX / IDENT)"
							data-testid="btn-open-chair-roster"
						>
							<Users size={12} className="text-[var(--teal)]" />
							<span className="hidden sm:inline">График смен</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer h-7"
						title="Добавить стоматологическую установку"
						data-testid="btn-add-chair-header"
					>
						<Plus size={12} />
						<span className="hidden sm:inline">+ Кресло</span>
					</button>
				</div>
			</div>

			{/* Main Grid */}
			<div className="flex-1 overflow-hidden">
				<ScheduleGrid
					dashboard={dashboard}
					dateKey={dateKey}
					appointments={appointments}
					onSlotClick={handleSlotClick}
					onAppointmentClick={onAppointmentClick}
					patientName={resolvedPatientName}
					formatTime={resolvedFormatTime}
					toDateTimeLocalValue={resolvedToDateTimeLocalValue}
					appointmentLabels={resolvedAppointmentLabels}
					selectedChairId={effectiveSelectedChairId}
					selectedDoctorId={selectedDoctorId}
					chairDoctorAssignments={chairDoctorAssignments}
					onAssignChairDoctor={onAssignChairDoctor}
					onOpenAddChair={handleOpenAddChair}
					onAddChair={onAddChair}
					onEditChair={handleEditChair}
				/>
			</div>

			{/* Quick Add / Edit Chair Modal */}
			<QuickAddChairModal
				isOpen={isAddChairOpen}
				onClose={() => {
					setIsAddChairOpen(false);
					setEditingChair(null);
				}}
				onAddChair={handleSaveChair}
				initialData={editingChair}
				onUpdateChair={handleSaveChair}
				existingChairsCount={chairs.length}
				branches={(dashboard?.clinicSettings as any)?.branches ?? []}
				doctors={(dashboard?.clinicSettings?.staff ?? []).filter(
					(s) => s.active && (s.role === "doctor" || s.role === "owner"),
				)}
			/>
		</div>
	);
};

export default ChairScheduleView;
