/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster & Workload Studio HUD
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Heatmap
 */

import React, { useEffect, useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar as CalendarIcon,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	Filter,
	Layers,
	Plus,
	Printer,
	Save,
	Sparkles,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import { TimesheetT13Modal, type EmployeeInfo } from "../../payroll/TimesheetT13Modal";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	type MedicalStaffRole,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	SHIFT_ARCHETYPES,
	type ShiftArchetypeId,
	type StaffMember,
} from "./doctorShiftRosterPresets";
import {
	calculateChairUtilization,
	calculateShiftDurationHours,
	calculateStaffRosterStats,
	createDefaultWeeklySchedule,
	detectRosterConflicts,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	type RosterConflict,
	timeStringToMinutes,
} from "./doctorShiftRosterEngine";
import "./doctorShiftRoster.css";

export type { DoctorShift, StaffMember, CabinetDefinition, ShiftArchetypeId, MedicalStaffRole };

/**
 * Weekly doctor-to-chair shift allocation engine with 1-click presets (Mandates 8e, 8k, 8n)
 * Presets:
 * - "five_day": Mon-Fri standard schedule for active doctors and chairs
 * - "two_two": 2/2 rolling shifts across week
 * - "morning": 08:00-14:00 on all chairs
 * - "evening": 14:00-20:00 on all chairs
 * - "full_day": 08:00-20:00 full-day coverage
 */
export function generateWeeklyScheduleForStaffAndCabinets(
	startDateIso: string,
	staffList: StaffMember[] = DEFAULT_CLINIC_STAFF,
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
	preset: "five_day" | "two_two" | "morning" | "evening" | "full_day" = "five_day",
): DoctorShift[] {
	const allChairs: Array<{ cabinetId: string; chairId: string; name: string }> = [];
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			allChairs.push({ cabinetId: cab.id, chairId: chair.id, name: chair.name });
		}
	}
	if (allChairs.length === 0) {
		allChairs.push({ cabinetId: "cab-1", chairId: "chair-1a", name: "Кресло 1" });
	}

	const doctors = staffList.filter((s) => s.isDoctor);
	const assistants = staffList.filter((s) => s.isAssistant);
	const effectiveDoctors =
		doctors.length > 0
			? doctors
			: staffList.length > 0
				? staffList
				: DEFAULT_CLINIC_STAFF;

	const startDate = new Date(startDateIso);
	const shifts: DoctorShift[] = [];

	for (let d = 0; d < 7; d++) {
		const curDate = new Date(startDate);
		curDate.setDate(startDate.getDate() + d);
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfWeek = curDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		if (preset === "five_day") {
			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				const numDocs = effectiveDoctors.length;
				const numChairs = allChairs.length;

				let mornDocs: StaffMember[] = [];
				let eveDocs: StaffMember[] = [];

				if (numDocs === 1) {
					// Solo doctor works 1 morning shift per day (30h/week per TK RF Article 350)
					mornDocs = [effectiveDoctors[0]!];
				} else {
					// Split doctors across morning and evening shifts with daily rotation
					const half = Math.ceil(numDocs / 2);
					const rotatedDocs = Array.from({ length: numDocs }, (_, i) => effectiveDoctors[(i + d) % numDocs]!);
					mornDocs = rotatedDocs.slice(0, half);
					eveDocs = rotatedDocs.slice(half);
				}

				// Morning shift allocation (08:30-14:30)
				const activeMornCount = Math.min(mornDocs.length, numChairs);
				const usedMornAssistants = new Set<string>();
				for (let i = 0; i < activeMornCount; i++) {
					const doc = mornDocs[i]!;
					const chair = (doc.preferredChairId && allChairs.find((c) => c.chairId === doc.preferredChairId)) ||
						allChairs[i % numChairs]!;

					let asst: StaffMember | null = null;
					if (doc.defaultAssistantId && !usedMornAssistants.has(doc.defaultAssistantId)) {
						asst = staffList.find((s) => s.id === doc.defaultAssistantId) || null;
					}
					if (!asst && assistants.length > 0) {
						asst = assistants.find((a) => !usedMornAssistants.has(a.id)) || null;
					}
					if (asst) usedMornAssistants.add(asst.id);

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-morn`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:30",
						endTime: "14:30",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}

				// Evening shift allocation (14:30-20:30)
				const activeEveCount = Math.min(eveDocs.length, numChairs);
				const usedEveAssistants = new Set<string>();
				for (let j = 0; j < activeEveCount; j++) {
					const eveDoc = eveDocs[j]!;
					const eveChair = (eveDoc.preferredChairId && allChairs.find((c) => c.chairId === eveDoc.preferredChairId)) ||
						allChairs[j % numChairs]!;

					let eveAsst: StaffMember | null = null;
					if (eveDoc.defaultAssistantId && !usedEveAssistants.has(eveDoc.defaultAssistantId)) {
						eveAsst = staffList.find((s) => s.id === eveDoc.defaultAssistantId) || null;
					}
					if (!eveAsst && assistants.length > 0) {
						eveAsst = assistants.find((a) => !usedEveAssistants.has(a.id)) || null;
					}
					if (eveAsst) usedEveAssistants.add(eveAsst.id);

					shifts.push({
						id: `shift-${dateIso}-${eveChair.chairId}-${eveDoc.id}-eve`,
						doctorId: eveDoc.id,
						doctorName: eveDoc.shortName || eveDoc.fullName,
						doctorRole: eveDoc.role,
						assistantId: eveAsst ? eveAsst.id : null,
						assistantName: eveAsst ? eveAsst.shortName || eveAsst.fullName : null,
						cabinetId: eveChair.cabinetId,
						chairId: eveChair.chairId,
						dateIso,
						archetypeId: "evening_shift",
						startTime: "14:30",
						endTime: "20:30",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			} else if (dayOfWeek === 6) {
				const chair = allChairs[0]!;
				const doc = effectiveDoctors[0]!;
				shifts.push({
					id: `shift-${dateIso}-${chair.chairId}-sat`,
					doctorId: doc.id,
					doctorName: doc.shortName || doc.fullName,
					doctorRole: doc.role,
					assistantId: null,
					assistantName: null,
					cabinetId: chair.cabinetId,
					chairId: chair.chairId,
					dateIso,
					archetypeId: "saturday_shift",
					startTime: "09:00",
					endTime: "17:00",
					durationHours: 7.0,
					breakMinutes: 60,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				});
			}
		} else if (preset === "two_two") {
			effectiveDoctors.forEach((doc, docIdx) => {
				const isWorkDay = (d + docIdx * 2) % 4 < 2;
				if (isWorkDay) {
					const chair = (doc.preferredChairId && allChairs.find((c) => c.chairId === doc.preferredChairId)) ||
						allChairs[docIdx % allChairs.length]!;

					const asst = doc.defaultAssistantId
						? staffList.find((s) => s.id === doc.defaultAssistantId) || null
						: null;

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-2-2`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "09:00",
						endTime: "21:00",
						durationHours: 11.0,
						breakMinutes: 60,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
						customNotes: "Сменный график 2/2",
					});
				}
			});
		} else if (preset === "morning") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = (doc.preferredChairId && allChairs.find((c) => c.chairId === doc.preferredChairId)) ||
						allChairs[(i + d) % allChairs.length]!;
					const asst = doc.defaultAssistantId
						? staffList.find((s) => s.id === doc.defaultAssistantId) || null
						: null;

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-morn-fixed`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:00",
						endTime: "14:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			}
		} else if (preset === "evening") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = (doc.preferredChairId && allChairs.find((c) => c.chairId === doc.preferredChairId)) ||
						allChairs[(i + d) % allChairs.length]!;
					const asst = doc.defaultAssistantId
						? staffList.find((s) => s.id === doc.defaultAssistantId) || null
						: null;

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-eve-fixed`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "evening_shift",
						startTime: "14:00",
						endTime: "20:00",
						durationHours: 6.0,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
					});
				}
			}
		} else if (preset === "full_day") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = (doc.preferredChairId && allChairs.find((c) => c.chairId === doc.preferredChairId)) ||
						allChairs[(i + d) % allChairs.length]!;
					const asst = doc.defaultAssistantId
						? staffList.find((s) => s.id === doc.defaultAssistantId) || null
						: null;

					shifts.push({
						id: `shift-${dateIso}-${chair.chairId}-${doc.id}-fullday`,
						doctorId: doc.id,
						doctorName: doc.shortName || doc.fullName,
						doctorRole: doc.role,
						assistantId: asst ? asst.id : null,
						assistantName: asst ? asst.shortName || asst.fullName : null,
						cabinetId: chair.cabinetId,
						chairId: chair.chairId,
						dateIso,
						archetypeId: "morning_shift",
						startTime: "08:00",
						endTime: "20:00",
						durationHours: 11.0,
						breakMinutes: 60,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
						customNotes: "Полный день 08:00–20:00",
					});
				}
			}
		}
	}

	return shifts;
}

export interface DoctorShiftRosterModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialShifts?: DoctorShift[] | undefined;
	staffList?: StaffMember[] | undefined;
	cabinets?: CabinetDefinition[] | undefined;
	appointments?: Array<{
		chairId: string;
		startsAt: string;
		endsAt: string;
		status?: string | undefined;
	}> | undefined;
	clinicName?: string | undefined;
	onSave?: ((shifts: DoctorShift[]) => Promise<void> | void) | undefined;
	onOpenT13Timesheet?: (() => void) | undefined;
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	currentDate?: string | undefined;
}

function getMondayOfWeekIso(dateIso?: string): string {
	if (!dateIso) return "2026-08-24";
	try {
		const d = new Date(dateIso);
		if (Number.isNaN(d.getTime())) return "2026-08-24";
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(d.setDate(diff));
		return monday.toISOString().slice(0, 10);
	} catch {
		return "2026-08-24";
	}
}

export function DoctorShiftRosterModal({
	isOpen,
	onClose,
	initialShifts,
	staffList = DEFAULT_CLINIC_STAFF,
	cabinets = CLINIC_CABINETS_CATALOG,
	appointments = [],
	clinicName = 'ООО "Денте Клиник"',
	onSave,
	onOpenT13Timesheet,
	initialEditingShift = null,
	currentDate,
}: DoctorShiftRosterModalProps) {
	// Base date: Monday of current week
	const defaultMonday = useMemo(() => getMondayOfWeekIso(currentDate), [currentDate]);
	const [weekStartDateIso, setWeekStartDateIso] = useState<string>(defaultMonday);
	const [activeTab, setActiveTab] = useState<"cabinets" | "doctors" | "t13" | "utilization">("cabinets");

	useEffect(() => {
		if (currentDate) {
			setWeekStartDateIso(getMondayOfWeekIso(currentDate));
		}
	}, [currentDate]);

	// Internal Shifts State
	const [shifts, setShifts] = useState<DoctorShift[]>(() => {
		if (initialShifts && initialShifts.length > 0) return initialShifts;
		if (Array.isArray(initialShifts) && initialShifts.length === 0) return [];
		return generateWeeklyScheduleForStaffAndCabinets(
			defaultMonday,
			staffList,
			cabinets,
			"five_day",
		);
	});

	useEffect(() => {
		if (initialShifts) {
			setShifts(initialShifts);
		}
	}, [initialShifts]);

	// Quick Shift Editor Drawer
	const [editingShift, setEditingShift] = useState<Partial<DoctorShift> | null>(initialEditingShift ?? null);
	const [isNewShift, setIsNewShift] = useState(false);

	// Notification banner
	const [notification, setNotification] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);

	// Filter by specialty/doctor
	const [filterRole, setFilterRole] = useState<string>("all");
	const [isT13ModalOpen, setIsT13ModalOpen] = useState<boolean>(false);

	// 7 days of the selected week
	const weekDays = useMemo(() => {
		const days: Array<{ dateIso: string; dayName: string; dayNumber: string; isWeekend: boolean }> = [];
		const start = new Date(weekStartDateIso);
		const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			const dateIso = d.toISOString().substring(0, 10);
			const dayOfWeek = d.getDay();
			days.push({
				dateIso,
				dayName: dayNamesRu[dayOfWeek] || "Пн",
				dayNumber: dateIso.substring(8, 10),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			});
		}
		return days;
	}, [weekStartDateIso]);

	const weekEndDateIso = weekDays[6]?.dateIso || weekStartDateIso;

	// Month & Year parsed from current week
	const selectedYear = Number.parseInt(weekStartDateIso.substring(0, 4), 10) || 2026;
	const selectedMonth = Number.parseInt(weekStartDateIso.substring(5, 7), 10) || 8;
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[selectedMonth];

	// Run conflict detection
	const conflicts = useMemo(() => {
		return detectRosterConflicts(shifts, staffList);
	}, [shifts, staffList]);

	// Run staff statistics
	const staffStats = useMemo(() => {
		return calculateStaffRosterStats(staffList, shifts, selectedYear, selectedMonth);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Run Form T-13 matrix
	const t13Matrix = useMemo(() => {
		return generateFormT13Matrix(staffList, shifts, selectedYear, selectedMonth);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Form T-13 Employees mapped from real roster staffList (Mandate 8e, 8n)
	const t13Employees: EmployeeInfo[] = useMemo(() => {
		return staffList.map((s, index) => {
			const roleDef = MEDICAL_STAFF_ROLES[s.role];
			const positionRu = roleDef
				? roleDef.nameRu
				: s.isDoctor
					? "Врач-стоматолог"
					: "Ассистент врача-стоматолога";
			const departmentRu = s.isDoctor ? "Лечебное отделение" : "Сестринская служба";
			const defaultShiftHours = s.isDoctor ? 6.0 : s.role === "assistant" ? 7.8 : 6.0;
			const tabNumber = s.tabNumber || String(101 + index).padStart(5, "0");

			return {
				id: s.id,
				tabNumber,
				name: s.fullName,
				positionRu,
				departmentRu,
				defaultShiftHours,
			};
		});
	}, [staffList]);

	// Sanitize appointments to satisfy exactOptionalPropertyTypes for calculateChairUtilization
	const sanitizedAppointments = useMemo(() => {
		return appointments.map((a) => {
			const item: { chairId: string; startsAt: string; endsAt: string; status?: string } = {
				chairId: a.chairId,
				startsAt: a.startsAt,
				endsAt: a.endsAt,
			};
			if (a.status) {
				item.status = a.status;
			}
			return item;
		});
	}, [appointments]);

	// Overall KPIs
	const kpis = useMemo(() => {
		const weekShifts = shifts.filter(
			(s) => s.dateIso >= weekStartDateIso && s.dateIso <= weekEndDateIso && s.status !== "cancelled" && s.durationHours > 0,
		);

		const totalWeeklyHours = weekShifts.reduce((sum, s) => sum + s.durationHours, 0);
		const totalWithAssistants = weekShifts.filter((s) => s.assistantId).length;
		const assistantPairingPct = weekShifts.length > 0 ? Math.round((totalWithAssistants / weekShifts.length) * 100) : 0;

		return {
			totalWeekShifts: weekShifts.length,
			totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
			assistantPairingPct,
			conflictCount: conflicts.length,
			errorConflictCount: conflicts.filter((c) => c.severity === "error").length,
		};
	}, [shifts, weekStartDateIso, weekEndDateIso, conflicts]);

	// Navigation handlers
	const handlePrevWeek = () => {
		const cur = new Date(weekStartDateIso);
		cur.setDate(cur.getDate() - 7);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	const handleNextWeek = () => {
		const cur = new Date(weekStartDateIso);
		cur.setDate(cur.getDate() + 7);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	// Quick template shift injection
	const handleAddShiftByTemplate = (
		archetypeId: ShiftArchetypeId,
		dateIso: string,
		cabinetId: string,
		chairId: string,
	) => {
		const arch = SHIFT_ARCHETYPES[archetypeId];
		const defaultDoc = staffList.find((s) => s.isDoctor && (s.preferredChairId === chairId || true)) || staffList[0] || DEFAULT_CLINIC_STAFF[0]!;
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null
			: null;

		const newShift: DoctorShift = {
			id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId,
			chairId,
			dateIso,
			archetypeId,
			startTime: arch.startTime || "08:30",
			endTime: arch.endTime || "14:30",
			durationHours: arch.durationHours,
			breakMinutes: arch.breakMinutes,
			isNight: arch.isNight,
			nightHours: arch.nightHours,
			status: "scheduled",
		};

		setShifts((prev) => [...prev, newShift]);
		setNotification({ type: "success", message: `Добавлена смена: ${arch.shortName} для ${defaultDoc.shortName}` });
		setTimeout(() => setNotification(null), 3000);
	};

	// Open Edit Drawer
	const handleOpenEdit = (shift: DoctorShift) => {
		setEditingShift({ ...shift });
		setIsNewShift(false);
	};

	const handleOpenCreateInCell = (dateIso: string, cabinetId: string, chairId: string) => {
		const defaultDoc = staffList.find((s) => s.isDoctor) || staffList[0] || DEFAULT_CLINIC_STAFF[0]!;
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null
			: null;

		setEditingShift({
			id: `shift-${Date.now()}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId,
			chairId,
			dateIso,
			archetypeId: "morning_shift",
			startTime: "08:30",
			endTime: "14:30",
			durationHours: 6.0,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		});
		setIsNewShift(true);
	};

	// Save Edited Shift (Non-blocking Mandate 8e)
	const handleSaveDrawerShift = () => {
		if (!editingShift) return;

		const effectiveDoc =
			staffList.find((s) => s.id === editingShift.doctorId) ||
			staffList.find((s) => s.isDoctor) ||
			staffList[0] ||
			DEFAULT_CLINIC_STAFF[0]!;

		const effectiveCab =
			cabinets.find((c) => c.id === editingShift.cabinetId) ||
			cabinets[0] ||
			CLINIC_CABINETS_CATALOG[0]!;

		const effectiveChair =
			effectiveCab.chairs.find((ch) => ch.id === editingShift.chairId) ||
			effectiveCab.chairs[0] || { id: "chair-1a", name: "Кресло 1А", equipment: "" };

		const effectiveDate = editingShift.dateIso || weekStartDateIso;

		const { durationHours, nightHours } = calculateShiftDurationHours(
			editingShift.startTime || "08:30",
			editingShift.endTime || "14:30",
			editingShift.breakMinutes || 0,
		);

		const asst = editingShift.assistantId ? staffList.find((s) => s.id === editingShift.assistantId) : null;

		const finalizedShift: DoctorShift = {
			id: editingShift.id || `shift-${Date.now()}`,
			doctorId: effectiveDoc.id,
			doctorName: effectiveDoc.shortName || editingShift.doctorName || effectiveDoc.fullName,
			doctorRole: effectiveDoc.role || editingShift.doctorRole || "therapist",
			assistantId: asst ? asst.id : null,
			assistantName: asst ? (asst.shortName || asst.fullName) : null,
			cabinetId: effectiveCab.id,
			chairId: effectiveChair.id,
			dateIso: effectiveDate,
			archetypeId: editingShift.archetypeId || "morning_shift",
			startTime: editingShift.startTime || "08:30",
			endTime: editingShift.endTime || "14:30",
			durationHours,
			breakMinutes: editingShift.breakMinutes || 0,
			isNight: editingShift.isNight || false,
			nightHours,
			...(editingShift.customNotes ? { customNotes: editingShift.customNotes } : {}),
			status: editingShift.status || "scheduled",
			...(editingShift.absenceReason ? { absenceReason: editingShift.absenceReason } : {}),
		};

		if (isNewShift) {
			setShifts((prev) => [...prev, finalizedShift]);
		} else {
			setShifts((prev) => prev.map((s) => (s.id === finalizedShift.id ? finalizedShift : s)));
		}

		setEditingShift(null);
		setNotification({ type: "success", message: "Смена успешно сохранена в графике" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Delete Shift
	const handleDeleteShift = (shiftId: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== shiftId));
		setEditingShift(null);
		setNotification({ type: "info", message: "Смена удалена из графика" });
		setTimeout(() => setNotification(null), 3000);
	};

	// Export Form T-13 to CSV
	const handleExportT13 = () => {
		const csvContent = exportFormT13ToCsv(t13Matrix, selectedYear, selectedMonth, clinicName);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `Form_T13_Tabele_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setNotification({ type: "success", message: "Табель Т-13 успешно экспортирован в CSV (UTF-8 BOM)" });
		setTimeout(() => setNotification(null), 4000);
	};

	// Print Official Schedule (A4 Landscape)
	const handlePrintSchedule = () => {
		const html = generatePrintableRosterHtml(shifts, weekStartDateIso, weekEndDateIso, clinicName, cabinets);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Apply weekly allocation preset (Mandates 8e, 8k, 8n)
	const handleApplyPreset = (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => {
		const filled = generateWeeklyScheduleForStaffAndCabinets(
			weekStartDateIso,
			staffList,
			cabinets,
			preset,
		);
		setShifts((prev) => {
			const otherShifts = prev.filter(
				(s) => s.dateIso < weekStartDateIso || s.dateIso > weekEndDateIso,
			);
			return [...otherShifts, ...filled];
		});
		setNotification({
			type: "success",
			message: `Применен шаблон смен: ${label} (${filled.length} смен)`,
		});
		setTimeout(() => setNotification(null), 3000);
	};

	// Reset / Auto-fill schedule
	const handleAutoFillDefault = () => {
		handleApplyPreset("five_day", "Пятидневка (базовый)");
	};

	// Save changes (Non-blocking Mandate 8e)
	const handleSaveAll = async (closeAfter = false) => {
		let shiftsToSave = shifts;
		if (shiftsToSave.length === 0) {
			shiftsToSave = generateWeeklyScheduleForStaffAndCabinets(
				weekStartDateIso,
				staffList,
				cabinets,
				"five_day",
			);
			setShifts(shiftsToSave);
		}
		if (onSave) {
			await onSave(shiftsToSave);
		}
		setNotification({
			type: "success",
			message: `Все изменения графика успешно сохранены (${shiftsToSave.length} смен)`,
		});
		if (closeAfter) {
			onClose();
		} else {
			setTimeout(() => setNotification(null), 3000);
		}
	};

	if (!isOpen) return null;

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render TimesheetT13Modal sequentially (depth strictly 1).
	// When T-13 interactive timesheet is open, do NOT render roster backdrop/container under it.
	if (isT13ModalOpen) {
		return (
			<TimesheetT13Modal
				isOpen={true}
				onClose={() => setIsT13ModalOpen(false)}
				clinicName={clinicName}
				employees={t13Employees}
			/>
		);
	}

	return (
		<div className="roster-modal-overlay" role="dialog" aria-modal="true" aria-label="Студия графиков сменности">
			<div className="roster-modal-container">
				{/* Top Header */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<span className="roster-title-badge">Норма: 33 ч/нед</span>
								{clinicName && (
									<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
										{clinicName}
									</span>
								)}
							</div>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								График сменности и табель учета врачей (2026)
							</h2>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={handlePrintSchedule}
								style={{ minHeight: "44px" }}
								title="Печать графика в формате А4 Альбомный"
							>
								<Printer size={16} />
								<span>Печать (А4)</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={handleExportT13}
								style={{ minHeight: "44px" }}
								title="Выгрузить форму Т-13 в CSV для 1C / Excel"
							>
								<FileSpreadsheet size={16} />
								<span>Табель Т-13 (CSV)</span>
							</button>
							<button
								type="button"
								data-testid="roster-save-btn"
								className="roster-btn roster-btn-primary"
								onClick={() => handleSaveAll(false)}
								style={{ minHeight: "44px" }}
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								onClick={onClose}
								style={{
									background: "transparent",
									border: "none",
									cursor: "pointer",
									padding: "0.5rem",
									color: "var(--muted, #64748b)",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: "44px",
									minWidth: "44px",
								}}
								aria-label="Закрыть окно"
							>
								<X size={22} />
							</button>
						</div>
					</div>

					{/* KPI Strip */}
					<div className="roster-kpis-strip">
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Смен на неделю</span>
							<span className="roster-kpi-val">{kpis.totalWeekShifts}</span>
							<span className="roster-kpi-sub">{kpis.totalWeeklyHours} рабочих часов</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Норма месяца ({monthNormObj?.nameRu || "Август"})</span>
							<span className="roster-kpi-val" style={{ color: "var(--teal, #0d9488)" }}>
								{monthNormObj?.normHours33 || 138.6} ч
							</span>
							<span className="roster-kpi-sub">33-часовая неделя</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Ассистентские пары</span>
							<span className="roster-kpi-val">{kpis.assistantPairingPct}%</span>
							<span className="roster-kpi-sub">Охват работы в 4 руки</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Коллизии и наложения</span>
							<span
								className="roster-kpi-val"
								style={{ color: kpis.conflictCount > 0 ? "var(--bad-fg, #ef4444)" : "var(--teal, #0d9488)" }}
							>
								{kpis.conflictCount}
							</span>
							<span className="roster-kpi-sub">
								{kpis.errorConflictCount > 0 ? "Есть наложения смен" : "График сбалансирован"}
							</span>
						</div>
					</div>
				</div>

				{/* Nav, Tab & Period Strip */}
				<div className="roster-nav-bar">
					<div className="roster-tab-group">
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "cabinets" ? "active" : ""}`}
							onClick={() => setActiveTab("cabinets")}
							style={{ minHeight: "44px" }}
						>
							<Layers size={16} />
							<span>По кабинетам</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "doctors" ? "active" : ""}`}
							onClick={() => setActiveTab("doctors")}
							style={{ minHeight: "44px" }}
						>
							<Users size={16} />
							<span>Расписание врачей</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "t13" ? "active" : ""}`}
							onClick={() => setActiveTab("t13")}
							style={{ minHeight: "44px" }}
						>
							<FileSpreadsheet size={16} />
							<span>Табель Т-13</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "utilization" ? "active" : ""}`}
							onClick={() => setActiveTab("utilization")}
							style={{ minHeight: "44px" }}
						>
							<Clock size={16} />
							<span>Загрузка кресел</span>
						</button>
					</div>

					{/* Period Selector */}
					<div className="roster-period-controls">
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handlePrevWeek}
							style={{ padding: "0.25rem 0.5rem", minHeight: "44px", minWidth: "44px" }}
							title="Предыдущая неделя"
						>
							<ChevronLeft size={18} />
						</button>
						<div style={{ fontWeight: 700, fontSize: "0.875rem", minWidth: "13rem", textAlign: "center" }}>
							{weekStartDateIso.substring(8, 10)}.{weekStartDateIso.substring(5, 7)} — {weekEndDateIso.substring(8, 10)}.{weekEndDateIso.substring(5, 7)}.{selectedYear}
						</div>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handleNextWeek}
							style={{ padding: "0.25rem 0.5rem", minHeight: "44px", minWidth: "44px" }}
							title="Следующая неделя"
						>
							<ChevronRight size={18} />
						</button>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={handleAutoFillDefault}
							style={{ minHeight: "44px", fontSize: "0.75rem" }}
							title="Заполнить неделю стандартным шаблоном смен"
						>
							<Sparkles size={14} />
							<span>Авто-шаблон</span>
						</button>
					</div>
				</div>

				{/* 1-Click Shift Allocation Presets Strip (Mandates 8e, 8k, 8n) */}
				<div
					className="roster-presets-strip"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						padding: "0.5rem 1.5rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						flexWrap: "wrap",
					}}
				>
					<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
						Шаблоны сменности:
					</span>
					<button
						type="button"
						data-testid="roster-preset-five-day"
						className="roster-btn roster-btn-secondary"
						onClick={() => handleApplyPreset("five_day", "Пятидневка")}
						style={{ minHeight: "44px", padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
						title="Пятидневка (Пн–Пт) для врачей и кресел"
					>
						<span>Пятидневка</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-two-two"
						className="roster-btn roster-btn-secondary"
						onClick={() => handleApplyPreset("two_two", "2/2")}
						style={{ minHeight: "44px", padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
						title="Сменный график 2 через 2 дня"
					>
						<span>2/2</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-morning"
						className="roster-btn roster-btn-secondary"
						onClick={() => handleApplyPreset("morning", "Утро 08:00–14:00")}
						style={{ minHeight: "44px", padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
						title="Утренние смены 08:00–14:00"
					>
						<span>Утро 08:00–14:00</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-evening"
						className="roster-btn roster-btn-secondary"
						onClick={() => handleApplyPreset("evening", "Вечер 14:00–20:00")}
						style={{ minHeight: "44px", padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
						title="Вечерние смены 14:00–20:00"
					>
						<span>Вечер 14:00–20:00</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-full-day"
						className="roster-btn roster-btn-secondary"
						onClick={() => handleApplyPreset("full_day", "Полный день 08:00–20:00")}
						style={{ minHeight: "44px", padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
						title="Полный рабочий день 08:00–20:00"
					>
						<span>Полный день 08:00–20:00</span>
					</button>
				</div>

				{/* Notifications & Conflicts Ribbon */}
				{notification && (
					<div
						style={{
							padding: "0.5rem 1.5rem",
							background: notification.type === "error" ? "var(--bad-bg, #fef2f2)" : "var(--ok-bg, #f0fdf4)",
							color: notification.type === "error" ? "var(--bad-fg, #991b1b)" : "var(--ok-fg, #166534)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							borderBottom: "1px solid rgba(0,0,0,0.05)",
						}}
					>
						<Check size={16} />
						<span>{notification.message}</span>
					</div>
				)}

				{conflicts.length > 0 && (
					<div className="roster-conflict-banner" role="status" aria-live="polite">
						<div className="roster-conflict-header">
							<AlertTriangle size={16} className="roster-conflict-icon" />
							<span className="roster-conflict-title">Предупреждения ({conflicts.length}):</span>
						</div>
						<div className="roster-conflict-list">
							{conflicts.map((c) => (
								<div
									key={c.id}
									className={`roster-conflict-tag ${c.severity === "error" ? "error" : "warning"}`}
									title={c.message}
								>
									<span className="roster-conflict-dot" />
									<span className="roster-conflict-text">{c.message}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Main Content Workspace */}
				<div className="roster-main-area">
					{/* TAB 1: Cabinets View */}
					{activeTab === "cabinets" && (
						<table className="roster-grid-table">
							<thead>
								<tr>
									<th style={{ width: "14rem" }}>Кабинет / Кресло</th>
									{weekDays.map((d) => (
										<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
											{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{cabinets.map((cab) =>
									cab.chairs.map((chair, chairIdx) => (
										<tr key={chair.id}>
											<td className="roster-lane-header">
												<div style={{ color: "var(--ink, #0f172a)", fontSize: "0.8125rem" }}>{cab.name}</div>
												<div style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem", marginTop: "2px" }}>
													{chair.name}
												</div>
												<div style={{ color: "var(--muted, #64748b)", fontSize: "0.6875rem", marginTop: "2px" }}>
													{chair.equipment}
												</div>
											</td>
											{weekDays.map((day) => {
												const cellShifts = shifts.filter(
													(s) =>
														s.chairId === chair.id &&
														s.dateIso === day.dateIso &&
														s.status !== "cancelled",
												);

												const cellConflicts = conflicts.filter((c) =>
													c.dateIso === day.dateIso &&
													c.shiftIds.some((sId) => cellShifts.some((cs) => cs.id === sId)),
												);

												return (
													<td key={day.dateIso}>
														{cellShifts.map((shift) => {
															const arch = SHIFT_ARCHETYPES[shift.archetypeId] || SHIFT_ARCHETYPES.morning_shift;
															const hasConflict = cellConflicts.some((c) => c.shiftIds.includes(shift.id));

															return (
																<div
																	key={shift.id}
																	className={`roster-shift-pill ${hasConflict ? "has-conflict" : ""}`}
																	style={{
																		backgroundColor: `${arch.color}15`,
																		borderLeft: `4px solid ${arch.color}`,
																	}}
																	onClick={() => handleOpenEdit(shift)}
																>
																	<div className="roster-shift-time">
																		<span style={{ color: arch.color }}>
																			{shift.startTime}–{shift.endTime} ({shift.durationHours}ч)
																		</span>
																		{hasConflict && <AlertTriangle size={12} color="#ef4444" />}
																	</div>
																	<div className="roster-shift-doc" title={shift.doctorName}>
																		{shift.doctorName}
																	</div>
																	{shift.assistantName ? (
																		<div className="roster-shift-asst flex items-center gap-1">
																			<Users size={11} className="shrink-0 text-[var(--teal,#0d9488)]" />
																			<span>{shift.assistantName}</span>
																		</div>
																	) : shift.doctorRole === "surgeon" ? (
																		<div className="flex items-center gap-1" style={{ fontSize: "0.6875rem", color: "#f59e0b" }} title="Хирургический приём рекомендуется проводить с ассистентом">
																			<AlertTriangle size={11} className="shrink-0" />
																			<span>Без ассистента</span>
																		</div>
																	) : (
																		<div className="flex items-center gap-1 text-[var(--muted)] opacity-70" style={{ fontSize: "0.6875rem" }}>
																			<span className="truncate">Индивидуальный приём</span>
																		</div>
																	)}
																</div>
															);
														})}

														{/* Add Shift Button */}
														<button
															type="button"
															className="roster-cell-add-btn"
															onClick={() => handleOpenCreateInCell(day.dateIso, cab.id, chair.id)}
														>
															+ Смена
														</button>
													</td>
												);
											})}
										</tr>
									)),
								)}
							</tbody>
						</table>
					)}

					{/* TAB 2: Doctors View */}
					{activeTab === "doctors" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<table className="roster-grid-table">
								<thead>
									<tr>
										<th style={{ width: "16rem" }}>Сотрудник / Должность</th>
										{weekDays.map((d) => (
											<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
												{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
											</th>
										))}
										<th style={{ width: "10rem" }}>Неделя / Норма (33 ч)</th>
									</tr>
								</thead>
								<tbody>
									{staffList.map((staff) => {
										const userShifts = shifts.filter(
											(s) =>
												(s.doctorId === staff.id || s.assistantId === staff.id) &&
												s.dateIso >= weekStartDateIso &&
												s.dateIso <= weekEndDateIso &&
												s.status !== "cancelled" &&
												s.durationHours > 0,
										);

										const totalWeekHours = userShifts.reduce((sum, s) => sum + s.durationHours, 0);
										const isOverLimit = totalWeekHours > staff.weeklyHourLimit;

										return (
											<tr key={staff.id}>
												<td className="roster-lane-header">
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<div
															style={{
																width: "10px",
																height: "10px",
																borderRadius: "50%",
																backgroundColor: staff.avatarColor,
															}}
														/>
														<div style={{ fontWeight: 700 }}>{staff.fullName}</div>
													</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
														Таб. № {staff.tabNumber} • {MEDICAL_STAFF_ROLES[staff.role]?.nameRu}
													</div>
												</td>
												{weekDays.map((day) => {
													const dayShifts = userShifts.filter((s) => s.dateIso === day.dateIso);
													return (
														<td key={day.dateIso}>
															{dayShifts.map((s) => (
																<div
																	key={s.id}
																	className="roster-shift-pill"
																	style={{
																		background: "var(--paper-soft, #f8fafc)",
																		border: "1px solid var(--line, #cbd5e1)",
																	}}
																	onClick={() => handleOpenEdit(s)}
																>
																	<div style={{ fontWeight: 700, fontSize: "0.75rem" }}>
																		{s.startTime}–{s.endTime}
																	</div>
																	<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
																		{s.chairId} • {s.durationHours}ч
																	</div>
																</div>
															))}
															{dayShifts.length === 0 && (
																<div style={{ color: "var(--muted, #94a3b8)", fontSize: "0.75rem", textAlign: "center", paddingTop: "0.5rem" }}>
																	Выходной
																</div>
															)}
														</td>
													);
												})}
												<td style={{ verticalAlign: "middle", padding: "0.75rem" }}>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", fontWeight: 700 }}>
														<span>{totalWeekHours.toFixed(1)} ч</span>
														<span style={{ color: isOverLimit ? "#ef4444" : "var(--muted, #64748b)" }}>
															макс {staff.weeklyHourLimit} ч
														</span>
													</div>
													<div
														style={{
															height: "6px",
															background: "#e2e8f0",
															borderRadius: "9999px",
															overflow: "hidden",
															marginTop: "4px",
														}}
													>
														<div
															style={{
																width: `${Math.min(100, (totalWeekHours / staff.weeklyHourLimit) * 100)}%`,
																height: "100%",
																backgroundColor: isOverLimit ? "#ef4444" : "var(--teal, #0d9488)",
															}}
														/>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					{/* TAB 3: Form T-13 View */}
					{activeTab === "t13" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
										Табель учета рабочего времени (Форма Т-13 Госкомстата) — {monthNormObj?.nameRu} {selectedYear}
									</h3>
									<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Норма: {monthNormObj?.normHours33 || 138.6} ч (врачи: 33 ч/нед, ассистенты: 39 ч/нед)
									</span>
								</div>
								<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
									<button
										type="button"
										className="roster-btn roster-btn-secondary"
										onClick={() => {
											if (onOpenT13Timesheet) {
												onClose();
												onOpenT13Timesheet();
											} else {
												setIsT13ModalOpen(true);
											}
										}}
										title="Открыть интерактивный табель Форма Т-13"
									>
										<CalendarIcon size={16} />
										<span>Интерактивный табель Т-13</span>
									</button>
									<button
										type="button"
										className="roster-btn roster-btn-secondary"
										onClick={handleExportT13}
									>
										<Download size={16} />
										<span>Скачать CSV (Excel / 1C)</span>
									</button>
								</div>
							</div>

							<div className="t13-table-wrapper">
								<table className="t13-table">
									<thead>
										<tr>
											<th rowSpan={2} style={{ width: "3rem" }}>Таб №</th>
											<th rowSpan={2} style={{ width: "12rem", textAlign: "left" }}>ФИО сотрудника</th>
											<th rowSpan={2} style={{ width: "10rem", textAlign: "left" }}>Должность</th>
											<th colSpan={15}>1-я половина месяца (1–15)</th>
											<th colSpan={t13Matrix[0]?.days.length ? t13Matrix[0].days.length - 15 : 16}>2-я половина (16–{t13Matrix[0]?.days.length || 31})</th>
											<th colSpan={4}>Итого за месяц</th>
										</tr>
										<tr>
											{t13Matrix[0]?.days.map((d) => (
												<th key={d.dayOfMonth} style={{ minWidth: "1.75rem" }}>
													{d.dayOfMonth}
												</th>
											))}
											<th>Дней</th>
											<th>Часов</th>
											<th>Ночных</th>
											<th>Сверхуроч.</th>
										</tr>
									</thead>
									<tbody>
										{t13Matrix.map((row) => (
											<React.Fragment key={row.tabNumber}>
												{/* Codes Row */}
												<tr>
													<td rowSpan={2} style={{ fontWeight: 700 }}>{row.tabNumber}</td>
													<td rowSpan={2} style={{ textAlign: "left", fontWeight: 600 }}>{row.staffName}</td>
													<td rowSpan={2} style={{ textAlign: "left", color: "var(--muted, #64748b)" }}>{row.position}</td>
													{row.days.map((d) => (
														<td
															key={d.dayOfMonth}
															className="t13-cell-code"
															style={{
																backgroundColor:
																	d.code === "Я"
																		? "var(--ok-bg, #f0fdf4)"
																		: d.code === "Н"
																			? "var(--info-bg, #e0e7ff)"
																			: d.code === "Б"
																				? "var(--bad-bg, #fee2e2)"
																				: d.code === "ОТ"
																					? "var(--teal-soft, #dcfce7)"
																					: "transparent",
																color:
																	d.code === "Я"
																		? "var(--ok-fg, #166534)"
																		: d.code === "Н"
																			? "var(--info-fg, #3730a3)"
																			: d.code === "Б"
																				? "var(--bad-fg, #991b1b)"
																				: "var(--muted, #64748b)",
															}}
														>
															{d.code}
														</td>
													))}
													<td rowSpan={2} style={{ fontWeight: 700 }}>{row.totalMonthDays}</td>
													<td rowSpan={2} style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>{row.totalMonthHours.toFixed(1)}</td>
													<td rowSpan={2}>{row.totalNightHours.toFixed(1)}</td>
													<td rowSpan={2} style={{ color: row.overtimeHours > 0 ? "var(--bad-fg, #ef4444)" : "inherit" }}>
														{row.overtimeHours > 0 ? `+${row.overtimeHours.toFixed(1)}` : "—"}
													</td>
												</tr>
												{/* Hours Row */}
												<tr>
													{row.days.map((d) => (
														<td key={`h-${d.dayOfMonth}`} className="t13-cell-hours">
															{d.hours > 0 ? d.hours.toFixed(1) : ""}
														</td>
													))}
												</tr>
											</React.Fragment>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 4: Utilization & Heatmap View */}
					{activeTab === "utilization" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div>
								<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
									Тепловая карта загрузки кресел (Chair Utilization Matrix)
								</h3>
								<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
									Формула: Занятые минуты приемов / Доступные минуты смен x 100%
								</span>
							</div>

							<table className="roster-grid-table">
								<thead>
									<tr>
										<th style={{ width: "15rem" }}>Кабинет / Кресло</th>
										{weekDays.map((d) => (
											<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
												{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{cabinets.map((cab) =>
										cab.chairs.map((chair) => (
											<tr key={chair.id}>
												<td className="roster-lane-header">
													<div>{cab.name}</div>
													<div style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem" }}>{chair.name}</div>
												</td>
												{weekDays.map((day) => {
													const metrics = calculateChairUtilization(shifts, sanitizedAppointments, day.dateIso, cabinets);
													const chairMetric = metrics.find((m) => m.chairId === chair.id);
													const rate = chairMetric ? chairMetric.utilizationRatePercent : 0;
													const heat = chairMetric ? chairMetric.heatLevel : "empty";

													return (
														<td key={day.dateIso} style={{ textAlign: "center", verticalAlign: "middle" }}>
															<div className={`roster-heatmap-chip ${heat}`}>
																<span>{rate.toFixed(0)}%</span>
															</div>
															<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
																{chairMetric?.bookedAppointmentMinutes || 0} / {chairMetric?.totalShiftMinutes || 0} мин
															</div>
														</td>
													);
												})}
											</tr>
										)),
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Quick Shift Edit Drawer */}
				{editingShift && (
					<div className="roster-drawer-overlay" onClick={() => setEditingShift(null)}>
						<div className="roster-drawer-panel" onClick={(e) => e.stopPropagation()}>
							<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] dark:border-slate-700 pb-3">
								<h3 className="m-0 text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100">
									{isNewShift ? "Назначение новой смены" : "Редактирование смены"}
								</h3>
								<button
									type="button"
									onClick={() => setEditingShift(null)}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800 transition-colors"
									aria-label="Закрыть панель"
								>
									<X size={20} />
								</button>
							</div>

							{/* Doctor select */}
							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									Врач
								</label>
								<select
									className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
									value={editingShift.doctorId || ""}
									onChange={(e) => {
										const doc = staffList.find((s) => s.id === e.target.value);
										setEditingShift((prev) => {
											if (!prev) return null;
											return {
												...prev,
												doctorId: e.target.value,
												doctorName: doc?.shortName || "",
												doctorRole: doc?.role || "therapist",
												assistantId: doc?.defaultAssistantId ?? prev.assistantId ?? null,
											};
										});
									}}
								>
									{staffList.filter((s) => s.isDoctor).map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.fullName} ({MEDICAL_STAFF_ROLES[doc.role]?.nameRu})
										</option>
									))}
								</select>
							</div>

							{/* Assistant select */}
							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									Ассистент / Медсестра
								</label>
								<select
									className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
									value={editingShift.assistantId || ""}
									onChange={(e) => {
										const asst = staffList.find((s) => s.id === e.target.value);
										setEditingShift((prev) => ({
											...prev,
											assistantId: e.target.value || null,
											assistantName: asst ? asst.shortName : null,
										}));
									}}
								>
									<option value="">(Без ассистента)</option>
									{staffList.filter((s) => s.isAssistant).map((asst) => (
										<option key={asst.id} value={asst.id}>
											{asst.fullName}
										</option>
									))}
								</select>
							</div>

							{/* Cabinet & Chair select */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Кабинет
									</label>
									<select
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.cabinetId || "cab-1"}
										onChange={(e) => {
											const cab = cabinets.find((c) => c.id === e.target.value);
											setEditingShift((prev) => ({
												...prev,
												cabinetId: e.target.value,
												chairId: cab?.chairs[0]?.id || "chair-1a",
											}));
										}}
									>
										{cabinets.map((cab) => (
											<option key={cab.id} value={cab.id}>
												{cab.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Кресло
									</label>
									<select
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.chairId || "chair-1a"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, chairId: e.target.value }))}
									>
										{cabinets
											.find((c) => c.id === (editingShift.cabinetId || "cab-1"))
											?.chairs.map((chair) => (
												<option key={chair.id} value={chair.id}>
													{chair.name}
												</option>
											))}
									</select>
								</div>
							</div>

							{/* Date & Shift Template */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Дата
									</label>
									<input
										type="date"
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.dateIso || ""}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, dateIso: e.target.value }))}
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Шаблон
									</label>
									<select
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.archetypeId || "morning_shift"}
										onChange={(e) => {
											const archId = e.target.value as ShiftArchetypeId;
											const arch = SHIFT_ARCHETYPES[archId];
											setEditingShift((prev) => ({
												...prev,
												archetypeId: archId,
												startTime: arch.startTime || prev?.startTime || "08:30",
												endTime: arch.endTime || prev?.endTime || "14:30",
												durationHours: arch.durationHours,
												isNight: arch.isNight,
												breakMinutes: arch.breakMinutes,
											}));
										}}
									>
										{Object.values(SHIFT_ARCHETYPES).map((arch) => (
											<option key={arch.id} value={arch.id}>
												{arch.name}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Times */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Начало смены
									</label>
									<input
										type="time"
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.startTime || "08:30"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, startTime: e.target.value }))}
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Окончание
									</label>
									<input
										type="time"
										className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
										value={editingShift.endTime || "14:30"}
										onChange={(e) => setEditingShift((prev) => ({ ...prev, endTime: e.target.value }))}
									/>
								</div>
							</div>

							{/* Notes */}
							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									Примечание
								</label>
								<input
									type="text"
									placeholder="например, только консультации или сложная хирургия"
									className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder-[var(--muted,#94a3b8)] dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
									value={editingShift.customNotes || ""}
									onChange={(e) => setEditingShift((prev) => ({ ...prev, customNotes: e.target.value }))}
								/>
							</div>

							{/* Drawer Footer Actions */}
							<div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
								{!isNewShift && editingShift.id && (
									<button
										type="button"
										className="roster-btn roster-btn-danger"
										onClick={() => handleDeleteShift(editingShift.id!)}
										style={{ minHeight: "44px" }}
									>
										<Trash2 size={16} />
										<span>Удалить</span>
									</button>
								)}
								<div className="flex items-center gap-2 ml-auto">
									<button
										type="button"
										className="roster-btn roster-btn-secondary"
										onClick={() => setEditingShift(null)}
										style={{ minHeight: "44px" }}
									>
										Отмена
									</button>
									<button
										type="button"
										className="roster-btn roster-btn-primary"
										onClick={handleSaveDrawerShift}
										style={{ minHeight: "44px" }}
									>
										<Check size={16} />
										<span>Сохранить смену</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="roster-footer">
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Баланс рабочего времени: 33 ч/нед (врачи) • Форма Т-13
					</div>
					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onClose}
							style={{ minHeight: "44px" }}
						>
							Закрыть
						</button>
						<button
							type="button"
							data-testid="roster-apply-close-btn"
							className="roster-btn roster-btn-primary"
							onClick={() => handleSaveAll(true)}
							style={{ minHeight: "44px" }}
						>
							<Save size={16} />
							<span>Применить и закрыть</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
