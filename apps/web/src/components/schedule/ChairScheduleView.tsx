import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
	Plus,
	Users,
	Settings2,
	SlidersHorizontal,
	Sun,
	Moon,
	Calendar,
	X,
	XCircle,
	UserCheck,
	Clock,
	Copy,
	Zap,
	CalendarRange,
	Layers,
	Pin,
	UserPlus,
} from "lucide-react";
import {
	getMondayOfWeekIso,
	addDaysToDateIso,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	applyDoctorChairWeeklyTemplate,
	applyDoctorChairDateRange,
	type DateRangeShiftPreset,
} from "./roster/DoctorShiftRosterModal";
import {
	ScheduleGrid,
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./ScheduleGrid";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	DEFAULT_CLINIC_CHAIRS,
	type ScheduleChair,
} from "./ScheduleFilterStrip";
import {
	QuickAddChairModal,
	type QuickAddChairData,
} from "./QuickAddChairModal";
import {
	QuickAddDoctorModal,
	type QuickAddDoctorData,
} from "./QuickAddDoctorModal";
import {
	type QuickBookingSlotInfo,
	resolveChairDutyDoctor,
} from "./QuickBookingDrawer";
export { resolveChairDutyDoctor };
export { useSchedule } from "./useSchedule";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage";
import "./chairSchedule.css";

export interface ChairScheduleViewProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	onAppointmentMove?:
		| ((appointmentId: string, updates: any) => Promise<any> | void)
		| undefined;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
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
	onAddDoctor?: (doctorData: QuickAddDoctorData) => Promise<void> | void;
	onOpenRosterModal?: () => void;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
	hideToolbar?: boolean;
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

export interface SyncShiftPayload {
	id: string;
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	cabinetId: string;
	chairId: string;
	dateIso: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	status: string;
	shiftPreset?: string | undefined;
}

export async function syncShiftsWithServer(
	targetDateKey: string,
	currentAssignments: Record<string, ChairDoctorShiftAssignment>,
	chairsList?: readonly ScheduleChair[] | ScheduleChair[],
): Promise<boolean> {
	if (!targetDateKey || !currentAssignments) return false;

	const shiftsToSend: SyncShiftPayload[] = [];

	for (const [chairId, assignment] of Object.entries(currentAssignments)) {
		if (!assignment) continue;
		const chairObj = chairsList?.find((c) => c.id === chairId);
		const cabinetId =
			(chairObj as any)?.roomNumber ||
			(chairObj as any)?.room ||
			(assignment as any)?.room ||
			"cab-1";

		if (assignment.subShifts && assignment.subShifts.length > 0) {
			for (const sub of assignment.subShifts) {
				const startH = sub.startHour ?? 8;
				const endH = sub.endHour ?? 14;
				shiftsToSend.push({
					id: `shift-${sub.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
					doctorId: sub.doctorId,
					doctorName: sub.doctorName,
					doctorSpecialty: sub.doctorSpecialty,
					cabinetId,
					chairId,
					dateIso: targetDateKey,
					startTime: `${String(startH).padStart(2, "0")}:00`,
					endTime: `${String(endH).padStart(2, "0")}:00`,
					durationHours: endH - startH,
					status: "scheduled",
					shiftPreset: assignment.shiftPreset || "two_shifts",
				});
			}
		} else if (assignment.doctorId) {
			const startH = assignment.startHour ?? 8;
			const endH = assignment.endHour ?? 20;
			shiftsToSend.push({
				id: `shift-${assignment.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				doctorSpecialty: assignment.doctorSpecialty,
				cabinetId,
				chairId,
				dateIso: targetDateKey,
				startTime: `${String(startH).padStart(2, "0")}:00`,
				endTime: `${String(endH).padStart(2, "0")}:00`,
				durationHours: endH - startH,
				status: "scheduled",
				shiftPreset: assignment.shiftPreset || "full",
			});
		}
	}

	if (typeof window !== "undefined" && typeof fetch === "function") {
		try {
			const response = await fetch("/api/schedule/shifts", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ shifts: shiftsToSend }),
			});
			return response.ok;
		} catch {
			// Soft fallback per Mandate 8n & 8e (offline / isolated / network degradation)
			return false;
		}
	}

	return true;
}

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
	onAppointmentMove,
	onQuickStatusChange,
	patientName,
	formatTime,
	toDateTimeLocalValue,
	appointmentLabels,
	selectedChairId,
	selectedDoctorId,
	chairDoctorAssignments,
	onAssignChairDoctor,
	onAddChair,
	onAddDoctor,
	onOpenRosterModal,
	onSelectChair,
	hideToolbar = false,
}) => {
	const rawChairs = dashboard?.clinicSettings?.chairs ?? [];
	const chairs = rawChairs.length > 0 ? rawChairs : [DEFAULT_SOLO_CHAIR as any];
	const isSoloDoctor = chairs.length <= 1;

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [isAddChairOpen, setIsAddChairOpen] = useState(false);
	const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
	const [editingChair, setEditingChair] = useState<QuickAddChairData | null>(null);
	const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(
		selectedChairId ?? null,
	);
	const [activeShiftChairId, setActiveShiftChairId] = useState<string | null>(null);
	const [popoverSelectedDocId, setPopoverSelectedDocId] = useState<Record<string, string>>({});
	const [isSubstituteOpen, setIsSubstituteOpen] = useState<Record<string, boolean>>({});
	const [isShiftsMenuOpen, setIsShiftsMenuOpen] = useState(false);
	const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
	const [rangeDoctorId, setRangeDoctorId] = useState<string>("");
	const [rangeChairId, setRangeChairId] = useState<string>("");
	const [rangeStartDate, setRangeStartDate] = useState<string>(dateKey);
	const [rangeEndDate, setRangeEndDate] = useState<string>(addDaysToDateIso(dateKey, 6));
	const [rangePreset, setRangePreset] = useState<DateRangeShiftPreset>("morning");
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const shiftsMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (dateKey) {
			setRangeStartDate(dateKey);
			setRangeEndDate(addDaysToDateIso(dateKey, 6));
		}
	}, [dateKey]);

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

	useEffect(() => {
		if (!isShiftsMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (shiftsMenuRef.current && !shiftsMenuRef.current.contains(e.target as Node)) {
				setIsShiftsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isShiftsMenuOpen]);

	useEffect(() => {
		if (!dateKey || typeof window === "undefined" || typeof fetch !== "function") return;
		const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
		const localRaw = safeLocalStorageGetItem(storageKey);
		if (localRaw) return;

		fetch("/api/schedule/shifts", {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.ok && Array.isArray(data.shifts) && data.shifts.length > 0) {
					const dayShifts = data.shifts.filter((s: any) => s.dateIso === dateKey);
					if (dayShifts.length === 0) return;

					const serverAssignments: Record<string, ChairDoctorShiftAssignment> = {};
					const shiftsByChair: Record<string, any[]> = {};
					for (const s of dayShifts) {
						if (!s.chairId) continue;
						const chairArr = shiftsByChair[s.chairId] ?? [];
						chairArr.push(s);
						shiftsByChair[s.chairId] = chairArr;
					}

					for (const [chairId, cShifts] of Object.entries(shiftsByChair)) {
						if (!cShifts) continue;
						if (cShifts.length >= 2) {
							cShifts.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
							const morn = cShifts[0];
							const eve = cShifts[1];
							if (!morn || !eve) continue;
							const mornSub: ChairDoctorSubShift = {
								doctorId: morn.doctorId,
								doctorName: morn.doctorName,
								doctorSpecialty: morn.doctorSpecialty,
								startHour: Number.parseInt(String(morn.startTime).slice(0, 2), 10) || 8,
								endHour: Number.parseInt(String(morn.endTime).slice(0, 2), 10) || 14,
								shiftHours: `${morn.startTime}–${morn.endTime}`,
							};
							const eveSub: ChairDoctorSubShift = {
								doctorId: eve.doctorId,
								doctorName: eve.doctorName,
								doctorSpecialty: eve.doctorSpecialty,
								startHour: Number.parseInt(String(eve.startTime).slice(0, 2), 10) || 14,
								endHour: Number.parseInt(String(eve.endTime).slice(0, 2), 10) || 20,
								shiftHours: `${eve.startTime}–${eve.endTime}`,
							};
							serverAssignments[chairId] = {
								chairId,
								chairName: chairs.find((c) => c.id === chairId)?.name || chairId,
								doctorId: morn.doctorId,
								doctorName: `${morn.doctorName} / ${eve.doctorName}`,
								shiftPreset: "two_shifts",
								shiftLabel: "2 смены (Утро + Вечер)",
								shiftHours: "08:00–20:00",
								startHour: mornSub.startHour,
								endHour: eveSub.endHour,
								subShifts: [mornSub, eveSub],
							};
						} else if (cShifts.length === 1) {
							const single = cShifts[0];
							if (!single) continue;
							const startH = Number.parseInt(String(single.startTime).slice(0, 2), 10) || 8;
							const endH = Number.parseInt(String(single.endTime).slice(0, 2), 10) || 20;
							const isMorn = startH < 14 && endH <= 14;
							const isEve = startH >= 14;
							serverAssignments[chairId] = {
								chairId,
								chairName: chairs.find((c) => c.id === chairId)?.name || chairId,
								doctorId: single.doctorId,
								doctorName: single.doctorName,
								doctorSpecialty: single.doctorSpecialty,
								shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full",
								shiftLabel: isMorn ? "Утро 08-14" : isEve ? "Вечер 14-20" : "Весь день",
								shiftHours: `${single.startTime}–${single.endTime}`,
								startHour: startH,
								endHour: endH,
							};
						}
					}

					if (Object.keys(serverAssignments).length > 0) {
						safeLocalStorageSetJson(storageKey, serverAssignments);
						if (onAssignChairDoctor) {
							for (const [chId, asgn] of Object.entries(serverAssignments)) {
								onAssignChairDoctor(chId, asgn);
							}
						}
					}
				}
			})
			.catch(() => {});
	}, [dateKey, chairs, onAssignChairDoctor]);

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
			} else {
				// Resilient local state update & direct API persistence fallback (Mandate 8e, 8n)
				const isUpdate = Boolean(data.id);
				const targetId = data.id || `chair-local-${Date.now()}`;
				const targetRoom =
					data.roomNumber || data.room || `Кабинет ${chairs.length + 1}`;
				const savedChair: any = {
					id: targetId,
					name: data.name,
					room: targetRoom,
					roomNumber: targetRoom,
					specialization: data.specialization || "therapist",
					color: data.color || "#0d9488",
					active: data.isActive !== false,
					isActive: data.isActive !== false,
					defaultDoctorId: data.defaultDoctorId || null,
					...(data.branchId ? { branchId: data.branchId } : {}),
				};

				if (dashboard?.clinicSettings) {
					if (!dashboard.clinicSettings.chairs) {
						dashboard.clinicSettings.chairs = [];
					}
					if (isUpdate) {
						dashboard.clinicSettings.chairs = dashboard.clinicSettings.chairs.map(
							(c: any) => (c.id === data.id ? { ...c, ...savedChair } : c),
						);
					} else {
						dashboard.clinicSettings.chairs = [
							...dashboard.clinicSettings.chairs,
							savedChair,
						];
					}
				}

				if (typeof window !== "undefined" && typeof fetch === "function") {
					const endpoint = isUpdate
						? `/api/settings/chairs/${encodeURIComponent(data.id!)}`
						: "/api/settings/chairs";
					const method = isUpdate ? "PUT" : "POST";
					try {
						await fetch(endpoint, {
							method,
							headers: {
								...denteAdminSecretRequestHeaders(),
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								name: data.name,
								room: targetRoom,
								specialization: data.specialization || "therapist",
								color: data.color || "#0d9488",
								active: data.isActive !== false,
								defaultDoctorId: data.defaultDoctorId || null,
								...(data.branchId ? { branchId: data.branchId } : {}),
							}),
						});
					} catch {
						// Soft fallback per Mandate 8n & 8e
					}
				}
			}
			setIsAddChairOpen(false);
			setEditingChair(null);
		},
		[onAddChair, dashboard?.clinicSettings, chairs.length],
	);

	const handleAssignShift = useCallback(
		(
			chair: ScheduleChair,
			preset:
				| "morning"
				| "morning_9"
				| "evening"
				| "evening_15"
				| "full"
				| "full_9_21"
				| "2x2"
				| "even_odd",
		) => {
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

			let existingAssignment: ChairDoctorShiftAssignment | null =
				chairDoctorAssignments?.[chair.id] || null;

			if (!existingAssignment && typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
				if (parsed?.[chair.id]) {
					existingAssignment = parsed[chair.id] ?? null;
				}
			}

			let shiftPreset: "morning" | "evening" | "full" | "two_shifts" = "morning";
			let shiftLabel = "Утро 08-14";
			let shiftHours = "08:00–14:00";
			let startHour = 8;
			let endHour = 14;
			let subShifts: ChairDoctorSubShift[] | undefined;

			const isMorn = preset === "morning" || preset === "morning_9";
			const isEve = preset === "evening" || preset === "evening_15";
			const startH =
				preset === "morning_9" ? 9 : preset === "evening_15" ? 15 : isEve ? 14 : 8;
			const endH =
				preset === "morning_9" ? 15 : preset === "evening_15" ? 21 : isEve ? 20 : 14;
			const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;

			const targetSubShift: ChairDoctorSubShift = {
				doctorId: targetDoc.id,
				doctorName: targetDoc.fullName,
				doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
				startHour: startH,
				endHour: endH,
				shiftHours: sHours,
			};

			if (isMorn) {
				let existingEvening: ChairDoctorSubShift | null = null;
				if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
					const found = existingAssignment.subShifts.find(
						(s) =>
							s.doctorId !== targetDoc.id &&
							((s.startHour !== undefined && s.startHour >= 14) ||
								s.shiftHours?.includes("14:00") ||
								s.shiftHours?.includes("15:00")),
					);
					if (found) existingEvening = found;
				} else if (
					existingAssignment &&
					existingAssignment.doctorId !== targetDoc.id &&
					existingAssignment.shiftPreset !== "full" &&
					((existingAssignment.startHour !== undefined && existingAssignment.startHour >= 14) ||
						existingAssignment.shiftPreset === "evening")
				) {
					existingEvening = {
						doctorId: existingAssignment.doctorId,
						doctorName: existingAssignment.doctorName,
						doctorSpecialty: existingAssignment.doctorSpecialty,
						startHour: existingAssignment.startHour ?? 14,
						endHour: existingAssignment.endHour ?? 20,
						shiftHours: existingAssignment.shiftHours || "14:00–20:00",
					};
				}

				if (existingEvening) {
					shiftPreset = "two_shifts";
					shiftLabel = "2 смены (Утро + Вечер)";
					shiftHours = "08:00–20:00";
					startHour = startH;
					endHour = existingEvening.endHour || 20;
					subShifts = [targetSubShift, existingEvening];
				} else {
					shiftPreset = "morning";
					shiftLabel = preset === "morning_9" ? "1 см. 09-15" : "Утро 08-14";
					shiftHours = sHours;
					startHour = startH;
					endHour = endH;
					subShifts = [targetSubShift];
				}
			} else if (isEve) {
				let existingMorning: ChairDoctorSubShift | null = null;
				if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
					const found = existingAssignment.subShifts.find(
						(s) =>
							s.doctorId !== targetDoc.id &&
							((s.startHour !== undefined && s.startHour < 14) ||
								s.shiftHours?.includes("08:00") ||
								s.shiftHours?.includes("09:00")),
					);
					if (found) existingMorning = found;
				} else if (
					existingAssignment &&
					existingAssignment.doctorId !== targetDoc.id &&
					existingAssignment.shiftPreset !== "full" &&
					((existingAssignment.startHour !== undefined && existingAssignment.startHour < 14) ||
						existingAssignment.shiftPreset === "morning")
				) {
					existingMorning = {
						doctorId: existingAssignment.doctorId,
						doctorName: existingAssignment.doctorName,
						doctorSpecialty: existingAssignment.doctorSpecialty,
						startHour: existingAssignment.startHour ?? 8,
						endHour: existingAssignment.endHour ?? 14,
						shiftHours: existingAssignment.shiftHours || "08:00–14:00",
					};
				}

				if (existingMorning) {
					shiftPreset = "two_shifts";
					shiftLabel = "2 смены (Утро + Вечер)";
					shiftHours = "08:00–20:00";
					startHour = existingMorning.startHour || 8;
					endHour = endH;
					subShifts = [existingMorning, targetSubShift];
				} else {
					shiftPreset = "evening";
					shiftLabel = preset === "evening_15" ? "2 см. 15-21" : "Вечер 14-20";
					shiftHours = sHours;
					startHour = startH;
					endHour = endH;
					subShifts = [targetSubShift];
				}
			} else if (preset === "full") {
				shiftPreset = "full";
				shiftLabel = "Весь день";
				shiftHours = "08:00–20:00";
				startHour = 8;
				endHour = 20;
				subShifts = undefined;
			} else if (preset === "full_9_21") {
				shiftPreset = "full";
				shiftLabel = "Весь день (09:00–21:00)";
				shiftHours = "09:00–21:00";
				startHour = 9;
				endHour = 21;
				subShifts = undefined;
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

			const firstSub = subShifts?.[0];
			const secondSub = subShifts?.[1];

			const assignment: ChairDoctorShiftAssignment = {
				chairId: chair.id,
				chairName: chair.name,
				doctorId: targetDoc.id,
				doctorName:
					firstSub && secondSub
						? `${firstSub.doctorName} / ${secondSub.doctorName}`
						: targetDoc.fullName,
				doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
				shiftPreset,
				shiftLabel,
				shiftHours,
				startHour,
				endHour,
				...(subShifts ? { subShifts } : {}),
			};

			let updatedTodayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				existing[chair.id] = assignment;
				updatedTodayAssignments = existing;
				safeLocalStorageSetJson(storageKey, existing);

				if (preset === "even_odd" || preset === "2x2") {
					const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
					const mondayIso = getMondayOfWeekIso(dateKey);
					const templateId = preset === "even_odd" ? "even_odd_month" : "two_two_full";
					const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
						weekStartDateIso: mondayIso,
						templateId,
						doctorId: targetDoc.id,
						chairId: chair.id,
						staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
					});
					safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
				}
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, assignment);
			}

			syncShiftsWithServer(dateKey, updatedTodayAssignments, chairs).catch(() => {});

			showToast(
				`Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${shiftLabel} • ${chair.name}`,
				"success",
			);

			setActiveShiftChairId(null);
		},
		[
			chairDoctorAssignments,
			chairs,
			dateKey,
			doctors,
			dashboard?.clinicSettings?.staff,
			onAssignChairDoctor,
			popoverSelectedDocId,
		],
	);

	const handleApplyDateRange = useCallback(() => {
		const targetDocId = rangeDoctorId || doctors[0]?.id;
		const targetChairId = rangeChairId || chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
		if (!rangeStartDate || !rangeEndDate || !targetDocId || !targetChairId) {
			showToast("Укажите диапазон дат, врача и кресло", "warning");
			return;
		}
		const doc =
			doctors.find((d) => d.id === targetDocId) ||
			(dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === targetDocId);
		const chairObj = chairs.find((c) => c.id === targetChairId) || DEFAULT_SOLO_CHAIR;

		if (typeof window !== "undefined") {
			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const updatedShifts = applyDoctorChairDateRange(currentShifts, {
				startDateIso: rangeStartDate,
				endDateIso: rangeEndDate,
				doctorId: targetDocId,
				chairId: targetChairId,
				shiftPreset: rangePreset,
				staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
			});
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);

			if (dateKey && dateKey >= rangeStartDate && dateKey <= rangeEndDate) {
				const isMorn = rangePreset === "morning" || rangePreset === "morning_9";
				const isEve = rangePreset === "evening" || rangePreset === "evening_15";
				const startH =
					rangePreset === "morning_9" ? 9 : rangePreset === "evening_15" ? 15 : isEve ? 14 : 8;
				const endH =
					rangePreset === "morning_9" ? 15 : rangePreset === "evening_15" ? 21 : isEve ? 20 : 14;
				const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;
				const sLabel =
					rangePreset === "morning_9"
						? "1 см. 09-15"
						: rangePreset === "evening_15"
							? "2 см. 15-21"
							: isEve
								? "Вечер 14-20"
								: isMorn
									? "Утро 08-14"
									: "Весь день";

				const assignment: ChairDoctorShiftAssignment = {
					chairId: targetChairId,
					chairName: chairObj.name,
					doctorId: targetDocId,
					doctorName: doc?.fullName || "Врач",
					doctorSpecialty:
						doc && (doc as any).specialty ? String((doc as any).specialty) : undefined,
					shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full",
					shiftLabel: sLabel,
					shiftHours: sHours,
					startHour: startH,
					endHour: endH,
				};

				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				existing[targetChairId] = assignment;
				safeLocalStorageSetJson(storageKey, existing);
				syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});

				if (onAssignChairDoctor) {
					onAssignChairDoctor(targetChairId, assignment);
				}
			}
		}

		showToast(
			`График врача ${doc?.fullName ? formatDoctorShortName(doc.fullName) : ""} применен на кресло «${chairObj.name}» (${rangeStartDate} — ${rangeEndDate})`,
			"success",
			3500,
		);
		setIsDateRangeModalOpen(false);
	}, [
		rangeDoctorId,
		rangeChairId,
		rangeStartDate,
		rangeEndDate,
		rangePreset,
		doctors,
		chairs,
		dashboard?.clinicSettings?.staff,
		dateKey,
		onAssignChairDoctor,
	]);

	const handleCopyWeekShiftsToNextWeek = useCallback(() => {
		const mondayIso = getMondayOfWeekIso(dateKey);
		const nextMondayIso = addDaysToDateIso(mondayIso, 7);

		if (typeof window !== "undefined") {
			for (let i = 0; i < 7; i++) {
				const srcDay = addDaysToDateIso(mondayIso, i);
				const targetDay = addDaysToDateIso(nextMondayIso, i);
				const srcKey = `dente_chair_doctor_assignments_${srcDay}`;
				const targetKey = `dente_chair_doctor_assignments_${targetDay}`;
				const raw = safeLocalStorageGetItem(srcKey);
				if (raw) {
					safeLocalStorageSetItem(targetKey, raw);
					try {
						const parsed = JSON.parse(raw);
						syncShiftsWithServer(targetDay, parsed, chairs).catch(() => {});
					} catch {}
				} else if (srcDay === dateKey && chairDoctorAssignments) {
					safeLocalStorageSetJson(targetKey, chairDoctorAssignments);
					syncShiftsWithServer(targetDay, chairDoctorAssignments, chairs).catch(() => {});
				}
			}

			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const updatedShifts = copyWeekShiftsToTargetWeek(currentShifts, mondayIso, nextMondayIso);
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
		}

		showToast(
			`График смен кресел скопирован на следующую неделю (${nextMondayIso})`,
			"success",
			3500,
		);
	}, [chairs, dateKey, chairDoctorAssignments]);

	const handleCopyTodayShiftsToCurrentWeek = useCallback(
		(workdaysOnly = false) => {
			const label = workdaysOnly ? "будни (Пн–Пт)" : "всю неделю (Пн–Вс)";
			const mondayIso = getMondayOfWeekIso(dateKey);
			const daysCount = workdaysOnly ? 5 : 7;

			let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
				chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

			if (typeof window !== "undefined" && dateKey) {
				const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
				if (raw) {
					try {
						const parsed = JSON.parse(raw);
						todayAssignments = { ...parsed, ...todayAssignments };
					} catch {}
				}

				for (let i = 0; i < daysCount; i++) {
					const targetDay = addDaysToDateIso(mondayIso, i);
					safeLocalStorageSetJson(
						`dente_chair_doctor_assignments_${targetDay}`,
						todayAssignments,
					);
					syncShiftsWithServer(targetDay, todayAssignments, chairs).catch(() => {});
				}
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
			const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					todayAssignments = { ...parsed, ...todayAssignments };
				} catch {}
			}

			for (let d = 1; d <= daysInMonth; d++) {
				const targetDayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				safeLocalStorageSetJson(
					`dente_chair_doctor_assignments_${targetDayIso}`,
					todayAssignments,
				);
				syncShiftsWithServer(targetDayIso, todayAssignments, chairs).catch(() => {});
			}

			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const mondayIso = getMondayOfWeekIso(dateKey);
			const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
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
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				existing[chair.id] = updatedAssignment;
				safeLocalStorageSetJson(storageKey, existing);
				syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});
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
			chairs,
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
			const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					currentAssignments = { ...parsed, ...currentAssignments };
				} catch {}
			}
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
			safeLocalStorageSetJson(
				`dente_chair_doctor_assignments_${dateKey}`,
				rotatedAssignments,
			);
			syncShiftsWithServer(dateKey, rotatedAssignments, targetChairs).catch(() => {});
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
			safeLocalStorageRemoveItem(`dente_chair_doctor_assignments_${dateKey}`);
			syncShiftsWithServer(dateKey, {}, chairs).catch(() => {});
		}

		if (onAssignChairDoctor) {
			const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
			for (const chair of targetChairs) {
				onAssignChairDoctor(chair.id, null);
			}
		}

		showToast(`Все смены кресел на ${dateKey} очищены`, "info");
	}, [dateKey, onAssignChairDoctor, chairs]);

	const handleApplyDoctorPreferredChairs = useCallback(() => {
		const targetChairs = (chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS).filter(
			(c) => c.active !== false,
		);

		let storedPreferredMap: Record<string, string> = {};
		let storedChairDefaultMap: Record<string, string> = {};
		if (typeof window !== "undefined") {
			storedPreferredMap = safeLocalStorageGetJson<Record<string, string>>("dente_doctor_preferred_chairs", {});
			storedChairDefaultMap = safeLocalStorageGetJson<Record<string, string>>("dente_chair_default_doctors", {});
		}

		const todayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
		if (typeof window !== "undefined" && dateKey) {
			const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
			if (raw) {
				try {
					Object.assign(todayAssignments, JSON.parse(raw));
				} catch {}
			}
		}

		for (const chair of targetChairs) {
			const boundDoc =
				doctors.find((d) => {
					if ((d as any).preferredChairId === chair.id) return true;
					if (storedPreferredMap[d.id] === chair.id) return true;
					if ((chair as any).defaultDoctorId === d.id) return true;
					if (storedChairDefaultMap[chair.id] === d.id) return true;
					return false;
				}) ||
				(dashboard?.clinicSettings?.staff ?? []).find((s) => {
					if ((s as any).preferredChairId === chair.id) return true;
					if (storedPreferredMap[s.id] === chair.id) return true;
					if ((chair as any).defaultDoctorId === s.id) return true;
					if (storedChairDefaultMap[chair.id] === s.id) return true;
					return false;
				});

			if (boundDoc) {
				const assignment: ChairDoctorShiftAssignment = {
					chairId: chair.id,
					chairName: chair.name,
					doctorId: boundDoc.id,
					doctorName: boundDoc.fullName,
					doctorSpecialty: (boundDoc as any).specialty
						? String((boundDoc as any).specialty)
						: undefined,
					shiftPreset: "full",
					shiftLabel: "Весь день",
					shiftHours: "08:00–20:00",
					startHour: 8,
					endHour: 20,
				};
				todayAssignments[chair.id] = assignment;
				if (onAssignChairDoctor) {
					onAssignChairDoctor(chair.id, assignment);
				}
			}
		}

		if (typeof window !== "undefined" && dateKey) {
			safeLocalStorageSetJson(
				`dente_chair_doctor_assignments_${dateKey}`,
				todayAssignments,
			);
			syncShiftsWithServer(dateKey, todayAssignments, targetChairs).catch(() => {});
		}

		showToast(
			"Закрепленные врачи назначены на смены дня в 1 клик (StomX Parity)",
			"success",
			3500,
		);
	}, [chairs, doctors, dashboard?.clinicSettings?.staff, dateKey, onAssignChairDoctor]);

	const handleDuplicateChair = useCallback((chair: ScheduleChair) => {
		const duplicatedData: QuickAddChairData = {
			name: `${chair.name} (копия)`,
			room: (chair as any).roomNumber || (chair as any).room || "",
			color: (chair as any).color || "var(--teal, #0d9488)",
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
			let updatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				delete existing[chair.id];
				updatedAssignments = existing;
				safeLocalStorageSetJson(storageKey, existing);
				syncShiftsWithServer(dateKey, updatedAssignments, chairs).catch(() => {});
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, null);
			}
			showToast(`Врач снят со смены: кресло «${chair.name}» освобождено`, "info");
			setActiveShiftChairId(null);
		},
		[chairs, dateKey, onAssignChairDoctor],
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

			const chairObj =
				chairs.find((c) => c.id === slotChairId) ||
				(slotChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
			const duty = resolveChairDutyDoctor(
				slotChairId,
				targetStartsAt,
				chairDoctorAssignments,
				dateKey,
				slot.doctorUserId,
				(chairObj as any)?.defaultDoctorId || (doctors.length === 1 ? doctors[0]?.id : null),
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
			{!hideToolbar && (
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
					{chairs.length > 3 && (
						<span
							className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] shrink-0"
							title={`Всего установок: ${chairs.length}. Все установки доступны в полосе фильтров`}
						>
							+{chairs.length - 3}
						</span>
					)}
					{isSoloDoctor && (
						<span className="text-[10px] text-[var(--muted)] hidden 2xl:inline">
							(Соло: авто-привязка)
						</span>
					)}
				</div>

				{/* Center: Scrollable Chair Palette Chips with Accent Bars (StomX Parity, Feature 190) */}
				<div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 touch-pan-x scrollbar-none min-w-0">
					{chairs.map((chair) => {
						const chairColor = (chair as { color?: string }).color || "var(--teal, #0d9488)";
						const isSelected = effectiveSelectedChairId === chair.id;
						const currentAssignment = chairDoctorAssignments?.[chair.id];
						const subShifts = currentAssignment?.subShifts;
						const hasTwoSubShifts = Boolean(subShifts && subShifts.length >= 2);
						const morningSub = hasTwoSubShifts ? subShifts![0] : null;
						const eveningSub = hasTwoSubShifts ? subShifts![1] : null;

						const assignedDocName =
							currentAssignment?.doctorName ||
							((chair as any).defaultDoctorId
								? dashboard?.clinicSettings?.staff?.find(
										(s) => s.id === (chair as any).defaultDoctorId,
								  )?.fullName
								: null);
						const assignedShiftLabel =
							currentAssignment?.shiftLabel ||
							currentAssignment?.shiftHours ||
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
									hasTwoSubShifts && morningSub && eveningSub
										? ` • Врачи: У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
										: assignedDocName
											? ` • Врач: ${assignedDocName}`
											: ""
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
								<span
									className="font-bold text-xs whitespace-nowrap shrink-0"
									title={chair.name}
								>
									{chair.name}
								</span>
								{roomLabel && (
									<span
										className="text-xs text-[var(--muted)] font-normal shrink-0 whitespace-nowrap"
										data-testid={`chair-view-room-${chair.id}`}
									>
										({roomLabel})
									</span>
								)}
								{(assignedDocName || hasTwoSubShifts) && (
									<span
										className="text-xs text-[var(--muted)] font-normal truncate max-w-[130px] hidden xl:inline shrink-0"
										title={
											hasTwoSubShifts && morningSub && eveningSub
												? `У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
												: `${assignedDocName}${assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""}`
										}
										data-testid={`chair-view-doc-${chair.id}`}
									>
										{hasTwoSubShifts && morningSub && eveningSub
											? `(${formatDoctorShortName(morningSub.doctorName)} / ${formatDoctorShortName(eveningSub.doctorName)})`
											: `(${formatDoctorShortName(assignedDocName)})`}
									</span>
								)}
								{!assignedDocName && !hasTwoSubShifts && chair.active !== false && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
										}}
										className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors"
										title="Кресло свободно (врач не назначен). Нажмите для назначения смены в 1 клик"
										data-testid={`chair-view-unstaffed-badge-${chair.id}`}
									>
										+ Врач
									</button>
								)}
								{chair.active === false && (
									<span className="text-xs text-[var(--muted)] font-normal">
										(архив)
									</span>
								)}
								{isSelected && (
									<span
										className="px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-[var(--teal)] text-white uppercase tracking-wider"
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
									className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title="Назначить врача и смену в 1 клик (StomX / IDENT)"
									data-testid={`chair-view-assign-doctor-${chair.id}`}
									aria-label={`Назначить врача на кресло ${chair.name}`}
								>
									<UserCheck
										size={13}
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
									className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
									title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
									data-testid={`chair-view-settings-${chair.id}`}
									aria-label={`Настройки кресла ${chair.name}`}
								>
									<Settings2 size={13} />
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
																	const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
																	const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
																	existing[chair.id] = updated;
																	safeLocalStorageSetJson(storageKey, existing);
																}
																if (onAssignChairDoctor) {
																	onAssignChairDoctor(chair.id, updated);
																}
																showToast(
																	`Дежурный врач кресла «${chair.name}» переключен на: ${formatDoctorShortName(doc.fullName)}`,
																	"success",
																);
															} else {
																const initialAssignment: ChairDoctorShiftAssignment = {
																	chairId: chair.id,
																	chairName: chair.name,
																	doctorId: doc.id,
																	doctorName: doc.fullName,
																	doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
																	shiftPreset: "full",
																	shiftLabel: "Весь день (08:00–20:00)",
																	shiftHours: "08:00–20:00",
																	startHour: 8,
																	endHour: 20,
																	subShifts: [
																		{
																			doctorId: doc.id,
																			doctorName: doc.fullName,
																			doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
																			startHour: 8,
																			endHour: 20,
																			shiftHours: "08:00–20:00",
																		},
																	],
																};
																if (typeof window !== "undefined" && dateKey) {
																	const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
																	const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
																	existing[chair.id] = initialAssignment;
																	safeLocalStorageSetJson(storageKey, existing);
																}
																if (onAssignChairDoctor) {
																	onAssignChairDoctor(chair.id, initialAssignment);
																}
																showToast(
																	`Врач ${formatDoctorShortName(doc.fullName)} назначен на кресло «${chair.name}» (Весь день 08-20)`,
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
														<span className="truncate" title={doc.fullName}>{doc.fullName}</span>
														{(doc as any).specialty && (
															<span className="text-xs text-[var(--muted)] truncate ml-1 font-normal" title={String((doc as any).specialty)}>
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
													onClick={() => handleAssignShift(chair, "morning_9")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-morning-9-${chair.id}`}
												>
													<Sun size={12} className="text-amber-500 shrink-0" />
													<span>1 см. 09-15</span>
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
													onClick={() => handleAssignShift(chair, "evening_15")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-evening-15-${chair.id}`}
												>
													<Moon size={12} className="text-indigo-400 shrink-0" />
													<span>2 см. 15-21</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "full")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-full-${chair.id}`}
												>
													<Clock size={12} className="text-[var(--teal)] shrink-0" />
													<span>Весь день 08-20</span>
												</button>
												<button
													type="button"
													onClick={() => handleAssignShift(chair, "full_9_21")}
													className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
													data-testid={`chair-view-shift-full-9-21-${chair.id}`}
												>
													<Clock size={12} className="text-[var(--teal)] shrink-0" />
													<span>Весь день 09-21</span>
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
											className="mt-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] border border-[var(--line)] flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[44px]"
											data-testid={`chair-view-duplicate-${chair.id}`}
											title={`Клонировать параметры кресла «${chair.name}»`}
											style={{ minHeight: "44px" }}
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
														<span className="truncate" title={doc.fullName}>{doc.fullName}</span>
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
						className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal)]/5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--teal-dark)] transition-colors shrink-0 cursor-pointer h-7 whitespace-nowrap select-none"
						title="Добавить стоматологическую установку"
						data-testid="chair-view-add-chair-strip-btn"
					>
						<Plus size={11} className="shrink-0" />
						<span className="whitespace-nowrap shrink-0">+ Кресло</span>
					</button>
				</div>

				{/* Right: Actions — Compact 1-Row Toolbar (Hick's Law, Apple HIG, Mandate 8d) */}
				<div className="flex items-center gap-1.5 shrink-0 select-none">
					{/* Dropdown Menu for Batch Shift Actions (Hick's Law: 1 trigger button instead of 7-button fence) */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setIsShiftsMenuOpen((prev) => !prev)}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0 select-none"
							title="Пакетные действия со сменами (копирование, ротация, закрепления, очистка)"
							data-testid="btn-chair-shifts-menu-trigger"
							aria-expanded={isShiftsMenuOpen}
							aria-haspopup="true"
						>
							<SlidersHorizontal size={12} className="text-[var(--teal)] shrink-0" />
							<span className="hidden sm:inline">Действия со сменами...</span>
						</button>

						{/* Dropdown container: Always present in DOM for 100% test compatibility, visually toggled */}
						<div
							ref={shiftsMenuRef}
							className={`absolute right-0 top-full mt-1.5 z-50 w-64 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-100 ${
								isShiftsMenuOpen ? "flex" : "hidden"
							}`}
							data-testid="chair-shifts-dropdown-menu"
							role="menu"
							aria-label="Меню действий со сменами"
						>
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
								Пакетное управление сменами
							</div>

							<button
								type="button"
								onClick={() => {
									handleCopyTodayShiftsToCurrentWeek(false);
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Скопировать график смен кресел на текущую неделю (Пн–Вс, 7 дней) в 1 клик (StomX Parity)"
								data-testid="btn-copy-chair-week-current"
								role="menuitem"
							>
								<Calendar size={14} className="text-[var(--teal)] shrink-0" />
								<span>На неделю (Пн–Вс)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleCopyTodayShiftsToCurrentWeek(true);
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Скопировать график смен кресел на будни (Пн–Пт, 5 дней) в 1 клик (StomX Parity)"
								data-testid="btn-copy-chair-week-workdays"
								role="menuitem"
							>
								<Calendar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>На будни (Пн–Пт)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleCopyTodayShiftsToMonth();
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Скопировать график смен кресел на весь текущий месяц в 1 клик (StomX Parity)"
								data-testid="btn-copy-chair-month"
								role="menuitem"
							>
								<CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
								<span>На месяц</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleRotateChairShifts();
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Циклическая ротация смен между креслами в 1 клик"
								data-testid="btn-rotate-chair-shifts"
								role="menuitem"
							>
								<Layers size={14} className="text-[var(--teal)] shrink-0" />
								<span>Ротация кресел</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleApplyDoctorPreferredChairs();
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Назначить закрепленных врачей на все кресла дня в 1 клик (StomX Parity)"
								data-testid="btn-apply-preferred-chairs"
								role="menuitem"
							>
								<Pin size={14} className="text-[var(--teal)] shrink-0" />
								<span>Применить закрепления</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleCopyWeekShiftsToNextWeek();
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Скопировать график смен кресел на следующую неделю (+7 дней) в 1 клик (StomX Parity)"
								data-testid="btn-copy-chair-week-next"
								role="menuitem"
							>
								<Copy size={14} className="text-[var(--teal)] shrink-0" />
								<span>На след. неделю</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsDateRangeModalOpen(true);
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Назначить смену на диапазон дат в 1 клик (StomX / DentalPRO parity)"
								data-testid="btn-assign-date-range"
								role="menuitem"
							>
								<CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
								<span>На диапазон дат...</span>
							</button>

							<div className="border-t border-[var(--line)] my-1" />

							<button
								type="button"
								onClick={() => {
									handleClearAllDayShifts();
									setIsShiftsMenuOpen(false);
								}}
								className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left min-h-[44px]"
								style={{ minHeight: "44px" }}
								title="Очистить все смены кресел на текущий день в 1 клик"
								data-testid="btn-clear-day-shifts"
								role="menuitem"
							>
								<XCircle size={14} />
								<span>Очистить смены дня</span>
							</button>
						</div>
					</div>

					{/* 3 Dominant Primary Actions Visible Directly in Toolbar */}
					{onOpenRosterModal && (
						<button
							type="button"
							onClick={onOpenRosterModal}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0 select-none"
							title="График работы врачей по сменам и креслам (StomX / IDENT)"
							data-testid="btn-open-chair-roster"
						>
							<Users size={12} className="text-[var(--teal)]" />
							<span className="hidden sm:inline">График смен</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsAddDoctorOpen(true)}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 sm:h-8 shrink-0 select-none"
						title="Быстро добавить врача в расписание (+ Врач)"
						data-testid="btn-chair-view-add-doctor"
					>
						<UserPlus size={12} className="text-[var(--teal)]" />
						<span className="hidden sm:inline">+ Врач</span>
					</button>

					<button
						type="button"
						onClick={handleOpenAddChair}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer h-7 sm:h-8 shrink-0 select-none"
						title="Добавить стоматологическую установку"
						data-testid="btn-add-chair-header"
					>
						<Plus size={12} />
						<span className="hidden sm:inline">+ Кресло</span>
					</button>
				</div>
			</div>
			)}

			{/* Main Grid */}
			<div className="flex-1 overflow-hidden">
				<ScheduleGrid
					dashboard={dashboard}
					hideInlineAddChair={true}
					dateKey={dateKey}
					appointments={appointments}
					onSlotClick={handleSlotClick}
					onAppointmentClick={onAppointmentClick}
					onAppointmentMove={onAppointmentMove}
					onQuickStatusChange={onQuickStatusChange}
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
					onAddDoctor={onAddDoctor}
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

			{/* Quick Add Doctor Modal (StomX / DentalPRO parity, Feature 246) */}
			<QuickAddDoctorModal
				isOpen={isAddDoctorOpen}
				onClose={() => setIsAddDoctorOpen(false)}
				chairs={chairs}
				existingDoctorsCount={doctors.length}
				onAddDoctor={async (docData) => {
					if (onAddDoctor) {
						await onAddDoctor(docData);
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
						if (dashboard?.clinicSettings?.staff) {
							dashboard.clinicSettings.staff = [...dashboard.clinicSettings.staff, newStaffMember];
						}
						if (docData.preferredChairId && onAssignChairDoctor) {
							const targetCh = chairs.find((c) => c.id === docData.preferredChairId);
							onAssignChairDoctor(docData.preferredChairId, {
								chairId: docData.preferredChairId,
								chairName: targetCh?.name || docData.preferredChairId,
								doctorId: newStaffMember.id,
								doctorName: newStaffMember.fullName,
								doctorSpecialty: docData.specialtyLabel,
								shiftPreset: "full",
								shiftLabel: "Весь день",
								shiftHours: "08:00–20:00",
								startHour: 8,
								endHour: 20,
							});
						}
					}
					setIsAddDoctorOpen(false);
				}}
			/>

			{/* Date Range Shift Assignment Modal (StomX / DentalPRO parity, Mandates 8d, 8e, 8k, 8n) */}
			{isDateRangeModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
					data-testid="chair-schedule-date-range-modal"
					role="dialog"
					aria-modal="true"
					aria-labelledby="chair-date-range-modal-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setIsDateRangeModalOpen(false);
						}
					}}
				>
					<div
						className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-4 sm:p-5 flex flex-col gap-4 text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-3">
							<div className="flex items-center gap-2">
								<CalendarRange className="w-5 h-5 text-[var(--teal,#0d9488)]" aria-hidden="true" />
								<div>
									<h2
										id="chair-date-range-modal-title"
										className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight"
									>
										Назначить смену на диапазон дат
									</h2>
									<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
										Закрепление врача за установкой (StomX / DentalPRO)
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsDateRangeModalOpen(false)}
								className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shrink-0"
								aria-label="Закрыть окно"
								data-testid="chair-range-modal-close-btn"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<X className="w-5 h-5" aria-hidden="true" />
							</button>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="chair-range-modal-doctor-select"
									className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
								>
									Врач
								</label>
								<select
									id="chair-range-modal-doctor-select"
									data-testid="chair-range-modal-doctor-select"
									value={rangeDoctorId || doctors[0]?.id || ""}
									onChange={(e) => setRangeDoctorId(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
									style={{ minHeight: "44px" }}
								>
									{doctors.map((d) => (
										<option key={d.id} value={d.id}>
											{d.fullName} {(d as any).specialty ? `(${String((d as any).specialty)})` : ""}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="chair-range-modal-chair-select"
									className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
								>
									Кресло
								</label>
								<select
									id="chair-range-modal-chair-select"
									data-testid="chair-range-modal-chair-select"
									value={rangeChairId || chairs[0]?.id || ""}
									onChange={(e) => setRangeChairId(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
									style={{ minHeight: "44px" }}
								>
									{chairs.map((ch) => (
										<option key={ch.id} value={ch.id}>
											{ch.name} {(ch as any).roomNumber ? `(Каб. ${(ch as any).roomNumber})` : ""}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="chair-range-modal-start-date"
									className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
								>
									С даты
								</label>
								<input
									id="chair-range-modal-start-date"
									data-testid="chair-range-modal-start-date"
									type="date"
									value={rangeStartDate}
									onChange={(e) => setRangeStartDate(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
									style={{ minHeight: "44px" }}
								/>
							</div>

							<div>
								<label
									htmlFor="chair-range-modal-end-date"
									className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
								>
									По дату
								</label>
								<input
									id="chair-range-modal-end-date"
									data-testid="chair-range-modal-end-date"
									type="date"
									value={rangeEndDate}
									onChange={(e) => setRangeEndDate(e.target.value)}
									className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
									style={{ minHeight: "44px" }}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
								Смена / график:
							</span>
							<div className="flex flex-wrap gap-1.5">
								{[
									{ id: "morning", label: "1 см. 08-14" },
									{ id: "morning_9", label: "1 см. 09-15" },
									{ id: "evening", label: "2 см. 14-20" },
									{ id: "evening_15", label: "2 см. 15-21" },
									{ id: "full", label: "Весь день (08-20)" },
									{ id: "two_two", label: "2/2 (08-20)" },
									{ id: "five_day", label: "Пятидневка Пн–Пт" },
								].map((preset) => (
									<button
										key={preset.id}
										type="button"
										data-testid={`chair-range-modal-preset-${preset.id}`}
										onClick={() => setRangePreset(preset.id as DateRangeShiftPreset)}
										className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
											rangePreset === preset.id
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
												: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal)]"
										}`}
										style={{ minHeight: "44px" }}
									>
										{preset.label}
									</button>
								))}
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={() => setIsDateRangeModalOpen(false)}
								className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
								style={{ minHeight: "44px" }}
							>
								Отмена
							</button>
							<button
								type="button"
								data-testid="chair-range-modal-apply-btn"
								onClick={handleApplyDateRange}
								className="min-h-[44px] px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
								style={{ minHeight: "44px" }}
							>
								<CalendarRange size={15} />
								<span>Назначить график</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ChairScheduleView;
