/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster & Workload Studio HUD
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Heatmap
 * Architecture: Modular orchestration via DoctorRosterToolbar and DoctorRosterMatrix (Anti-Monolith <800 lines)
 */

import React, { useEffect, useMemo, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import {
	TimesheetT13Modal,
	type EmployeeInfo,
} from "../../payroll/TimesheetT13Modal";
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
	calculateShiftDurationHours,
	calculateStaffRosterStats,
	detectRosterConflicts,
	type DoctorShift,
	exportFormT13ToCsv,
	generateFormT13Matrix,
	generatePrintableRosterHtml,
	type RosterConflict,
} from "./doctorShiftRosterEngine";
import { DoctorRosterToolbar } from "./DoctorRosterToolbar";
import { DoctorRosterMatrix } from "./DoctorRosterMatrix";
import "./doctorShiftRoster.css";

export { DoctorRosterToolbar } from "./DoctorRosterToolbar";
export { DoctorRosterMatrix } from "./DoctorRosterMatrix";
export type {
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
	MedicalStaffRole,
};

/**
 * Weekly doctor-to-chair shift allocation engine with 1-click presets (Mandates 8e, 8k, 8n)
 * Presets:
 * - "five_day": Mon-Fri standard schedule for active doctors and chairs
 * - "two_two": 2/2 rolling shifts across week (alternating pairs with zero double-booking)
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
	const allChairs: Array<{ cabinetId: string; chairId: string; name: string }> =
		[];
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			allChairs.push({
				cabinetId: cab.id,
				chairId: chair.id,
				name: chair.name,
			});
		}
	}
	if (allChairs.length === 0) {
		allChairs.push({
			cabinetId: "cab-1",
			chairId: "chair-1a",
			name: "Кресло 1",
		});
	}

	const doctors = staffList.filter((s) => s.isDoctor);
	const assistants = staffList.filter((s) => s.isAssistant);
	const fallbackDoctors = DEFAULT_CLINIC_STAFF.filter((s) => s.isDoctor);
	const effectiveDoctors =
		doctors.length > 0 ? doctors : fallbackDoctors;

	function allocateChairForDoctor(
		doc: StaffMember,
		usedChairIds: Set<string>,
		preferredIndex: number,
	): { cabinetId: string; chairId: string; name: string } | null {
		if (doc.preferredChairId && !usedChairIds.has(doc.preferredChairId)) {
			const found = allChairs.find((c) => c.chairId === doc.preferredChairId);
			if (found) {
				usedChairIds.add(found.chairId);
				return found;
			}
		}
		const candidate = allChairs[preferredIndex % allChairs.length];
		if (candidate && !usedChairIds.has(candidate.chairId)) {
			usedChairIds.add(candidate.chairId);
			return candidate;
		}
		const freeChair = allChairs.find((c) => !usedChairIds.has(c.chairId));
		if (freeChair) {
			usedChairIds.add(freeChair.chairId);
			return freeChair;
		}
		return null;
	}

	function allocateAssistantForDoctor(
		doc: StaffMember,
		usedAssistantIds: Set<string>,
	): StaffMember | null {
		if (doc.defaultAssistantId && !usedAssistantIds.has(doc.defaultAssistantId)) {
			const asst = staffList.find((s) => s.id === doc.defaultAssistantId) || null;
			if (asst) {
				usedAssistantIds.add(asst.id);
				return asst;
			}
		}
		if (assistants.length > 0) {
			const freeAsst = assistants.find((a) => !usedAssistantIds.has(a.id));
			if (freeAsst) {
				usedAssistantIds.add(freeAsst.id);
				return freeAsst;
			}
		}
		return null;
	}

	const parts = (startDateIso || "").split("-").map(Number);
	const startYear = parts[0] || 2026;
	const startMonth = parts[1] || 8;
	const startDay = parts[2] || 24;

	const shifts: DoctorShift[] = [];

	for (let d = 0; d < 7; d++) {
		const curDate = new Date(
			Date.UTC(startYear, startMonth - 1, startDay + d),
		);
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfWeek = curDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		if (preset === "five_day") {
			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				const numDocs = effectiveDoctors.length;

				let mornDocs: StaffMember[] = [];
				let eveDocs: StaffMember[] = [];

				if (numDocs === 1) {
					// Solo doctor works 1 morning shift per day (30h/week per TK RF Article 350)
					mornDocs = [effectiveDoctors[0]!];
				} else {
					// Split doctors across morning and evening shifts with daily rotation
					const half = Math.ceil(numDocs / 2);
					const rotatedDocs = Array.from(
						{ length: numDocs },
						(_, i) => effectiveDoctors[(i + d) % numDocs]!,
					);
					mornDocs = rotatedDocs.slice(0, half);
					eveDocs = rotatedDocs.slice(half);
				}

				// Morning shift allocation (08:30-14:30)
				const usedMornChairs = new Set<string>();
				const usedMornAssistants = new Set<string>();
				for (let i = 0; i < mornDocs.length; i++) {
					const doc = mornDocs[i]!;
					const chair = allocateChairForDoctor(doc, usedMornChairs, i);
					if (!chair) break;

					const asst = allocateAssistantForDoctor(doc, usedMornAssistants);

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
				const usedEveChairs = new Set<string>();
				const usedEveAssistants = new Set<string>();
				for (let j = 0; j < eveDocs.length; j++) {
					const eveDoc = eveDocs[j]!;
					const eveChair = allocateChairForDoctor(eveDoc, usedEveChairs, j);
					if (!eveChair) break;

					const eveAsst = allocateAssistantForDoctor(eveDoc, usedEveAssistants);

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
			} else if (dayOfWeek === 6 && effectiveDoctors.length > 1) {
				const chair = allChairs[0]!;
				const doc = effectiveDoctors[d % effectiveDoctors.length]!;
				shifts.push({
					id: `shift-${dateIso}-${chair.chairId}-${doc.id}-sat`,
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
			const numDocs = effectiveDoctors.length;
			const numChairs = allChairs.length;

			if (numDocs === 1) {
				if (d % 4 < 2) {
					const doc = effectiveDoctors[0]!;
					const chair = allChairs[0]!;
					const asst = allocateAssistantForDoctor(doc, new Set<string>());
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
			} else if (numChairs >= numDocs) {
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				effectiveDoctors.forEach((doc, docIdx) => {
					const isWorkDay = (d + (docIdx % 2) * 2) % 4 < 2;
					if (isWorkDay) {
						const chair = allocateChairForDoctor(doc, usedChairs, docIdx);
						if (chair) {
							const asst = allocateAssistantForDoctor(doc, usedAssistants);
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
					}
				});
			} else {
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let c = 0; c < numChairs; c++) {
					const docTeam1 = effectiveDoctors[(2 * c) % numDocs];
					const docTeam2 = (2 * c + 1 < numDocs) ? effectiveDoctors[2 * c + 1] : null;

					const activeDoc = (d % 4 < 2) ? docTeam1 : docTeam2;
					if (activeDoc) {
						const chair = allocateChairForDoctor(activeDoc, usedChairs, c);
						if (chair) {
							const asst = allocateAssistantForDoctor(activeDoc, usedAssistants);
							shifts.push({
								id: `shift-${dateIso}-${chair.chairId}-${activeDoc.id}-2-2`,
								doctorId: activeDoc.id,
								doctorName: activeDoc.shortName || activeDoc.fullName,
								doctorRole: activeDoc.role,
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
					}
				}
			}
		} else if (preset === "morning") {
			if (dayOfWeek !== 0) {
				const activeCount = Math.min(allChairs.length, effectiveDoctors.length);
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

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
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

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
				const usedChairs = new Set<string>();
				const usedAssistants = new Set<string>();
				for (let i = 0; i < activeCount; i++) {
					const doc = effectiveDoctors[(i + d) % effectiveDoctors.length]!;
					const chair = allocateChairForDoctor(doc, usedChairs, i + d);
					if (!chair) break;
					const asst = allocateAssistantForDoctor(doc, usedAssistants);

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
	appointments?:
		| Array<{
				chairId: string;
				startsAt: string;
				endsAt: string;
				status?: string | undefined;
		  }>
		| undefined;
	clinicName?: string | undefined;
	onSave?: ((shifts: DoctorShift[]) => Promise<void> | void) | undefined;
	onOpenT13Timesheet?: (() => void) | undefined;
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	currentDate?: string | undefined;
}

/**
 * Dynamic Monday calculation without hardcoded historical dates (Mandates 8e, 8n)
 */
export function getMondayOfWeekIso(dateIso?: string): string {
	let targetDate: Date;
	if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
		const parts = dateIso.split("-").map(Number);
		targetDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
	} else if (dateIso) {
		const parsed = new Date(dateIso);
		if (Number.isNaN(parsed.getTime())) {
			const now = new Date();
			targetDate = new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
			);
		} else {
			targetDate = new Date(
				Date.UTC(
					parsed.getUTCFullYear(),
					parsed.getUTCMonth(),
					parsed.getUTCDate(),
				),
			);
		}
	} else {
		const now = new Date();
		targetDate = new Date(
			Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
		);
	}

	const day = targetDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
	const diff = targetDate.getUTCDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(
		Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), diff),
	);
	return monday.toISOString().slice(0, 10);
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
	// Base date: Monday of current/active week
	const defaultMonday = useMemo(
		() => getMondayOfWeekIso(currentDate),
		[currentDate],
	);
	const [weekStartDateIso, setWeekStartDateIso] =
		useState<string>(defaultMonday);
	const [activeTab, setActiveTab] = useState<
		"cabinets" | "doctors" | "t13" | "utilization"
	>("cabinets");

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
	const [editingShift, setEditingShift] = useState<Partial<DoctorShift> | null>(
		initialEditingShift ?? null,
	);
	const [isNewShift, setIsNewShift] = useState(false);

	// Notification banner
	const [notification, setNotification] = useState<{
		type: "success" | "info" | "error";
		message: string;
	} | null>(null);

	const [isT13ModalOpen, setIsT13ModalOpen] = useState<boolean>(false);

	// 7 days of the selected week (Timezone-safe UTC arithmetic)
	const weekDays = useMemo(() => {
		const days: Array<{
			dateIso: string;
			dayName: string;
			dayNumber: string;
			isWeekend: boolean;
		}> = [];
		const parts = weekStartDateIso.split("-").map(Number);
		const startYear = parts[0] || 2026;
		const startMonth = parts[1] || 8;
		const startDay = parts[2] || 24;

		const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

		for (let i = 0; i < 7; i++) {
			const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + i));
			const dateIso = d.toISOString().substring(0, 10);
			const dayOfWeek = d.getUTCDay();
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
	const selectedYear =
		Number.parseInt(weekStartDateIso.substring(0, 4), 10) || 2026;
	const selectedMonth =
		Number.parseInt(weekStartDateIso.substring(5, 7), 10) || 8;
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[selectedMonth];

	// Run conflict detection
	const conflicts = useMemo(() => {
		return detectRosterConflicts(shifts, staffList);
	}, [shifts, staffList]);

	// Run staff statistics
	const staffStats = useMemo(() => {
		return calculateStaffRosterStats(
			staffList,
			shifts,
			selectedYear,
			selectedMonth,
		);
	}, [staffList, shifts, selectedYear, selectedMonth]);

	// Run Form T-13 matrix
	const t13Matrix = useMemo(() => {
		return generateFormT13Matrix(
			staffList,
			shifts,
			selectedYear,
			selectedMonth,
		);
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
			const departmentRu = s.isDoctor
				? "Лечебное отделение"
				: "Сестринская служба";
			const defaultShiftHours = s.isDoctor
				? 6.0
				: s.role === "assistant"
					? 7.8
					: 6.0;
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
			const item: {
				chairId: string;
				startsAt: string;
				endsAt: string;
				status?: string;
			} = {
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
			(s) =>
				s.dateIso >= weekStartDateIso &&
				s.dateIso <= weekEndDateIso &&
				s.status !== "cancelled" &&
				s.durationHours > 0,
		);

		const totalWeeklyHours = weekShifts.reduce(
			(sum, s) => sum + s.durationHours,
			0,
		);
		const totalWithAssistants = weekShifts.filter((s) => s.assistantId).length;
		const assistantPairingPct =
			weekShifts.length > 0
				? Math.round((totalWithAssistants / weekShifts.length) * 100)
				: 0;

		return {
			totalWeekShifts: weekShifts.length,
			totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
			assistantPairingPct,
			conflictCount: conflicts.length,
			errorConflictCount: conflicts.filter((c) => c.severity === "error")
				.length,
		};
	}, [shifts, weekStartDateIso, weekEndDateIso, conflicts]);

	// Navigation handlers
	const handlePrevWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		const cur = new Date(
			Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) - 7),
		);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	const handleNextWeek = () => {
		const parts = weekStartDateIso.split("-").map(Number);
		const cur = new Date(
			Date.UTC(parts[0] || 2026, (parts[1] || 8) - 1, (parts[2] || 24) + 7),
		);
		setWeekStartDateIso(cur.toISOString().substring(0, 10));
	};

	// Open Edit Drawer
	const handleOpenEdit = (shift: DoctorShift) => {
		setEditingShift({ ...shift });
		setIsNewShift(false);
	};

	const handleOpenCreateInCell = (
		dateIso: string,
		cabinetId: string,
		chairId: string,
	) => {
		const defaultDoc =
			staffList.find((s) => s.isDoctor) ||
			staffList[0] ||
			DEFAULT_CLINIC_STAFF[0]!;
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
			effectiveCab.chairs[0] || {
				id: "chair-1a",
				name: "Кресло 1А",
				equipment: "",
			};

		const effectiveDate = editingShift.dateIso || weekStartDateIso;

		const { durationHours, nightHours } = calculateShiftDurationHours(
			editingShift.startTime || "08:30",
			editingShift.endTime || "14:30",
			editingShift.breakMinutes || 0,
		);

		const asst = editingShift.assistantId
			? staffList.find((s) => s.id === editingShift.assistantId)
			: null;

		const finalizedShift: DoctorShift = {
			id: editingShift.id || `shift-${Date.now()}`,
			doctorId: effectiveDoc.id,
			doctorName:
				effectiveDoc.shortName ||
				editingShift.doctorName ||
				effectiveDoc.fullName,
			doctorRole: effectiveDoc.role || editingShift.doctorRole || "therapist",
			assistantId: asst ? asst.id : null,
			assistantName: asst ? asst.shortName || asst.fullName : null,
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
			...(editingShift.customNotes
				? { customNotes: editingShift.customNotes }
				: {}),
			status: editingShift.status || "scheduled",
			...(editingShift.absenceReason
				? { absenceReason: editingShift.absenceReason }
				: {}),
		};

		if (isNewShift) {
			setShifts((prev) => [...prev, finalizedShift]);
		} else {
			setShifts((prev) =>
				prev.map((s) => (s.id === finalizedShift.id ? finalizedShift : s)),
			);
		}

		setEditingShift(null);
		setNotification({
			type: "success",
			message: "Смена успешно сохранена в графике",
		});
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
		const csvContent = exportFormT13ToCsv(
			t13Matrix,
			selectedYear,
			selectedMonth,
			clinicName,
		);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Form_T13_Tabele_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setNotification({
			type: "success",
			message: "Табель Т-13 успешно экспортирован в CSV (UTF-8 BOM)",
		});
		setTimeout(() => setNotification(null), 4000);
	};

	// Print Official Schedule (A4 Landscape)
	const handlePrintSchedule = () => {
		const html = generatePrintableRosterHtml(
			shifts,
			weekStartDateIso,
			weekEndDateIso,
			clinicName,
			cabinets,
		);
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
		<div
			className="roster-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Студия графиков сменности"
		>
			<div className="roster-modal-container">
				{/* Top Header, KPIs, Period Selector, 1-Click Presets & Conflict Ribbon */}
				<DoctorRosterToolbar
					clinicName={clinicName}
					kpis={kpis}
					monthNormObj={monthNormObj}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					weekStartDateIso={weekStartDateIso}
					weekEndDateIso={weekEndDateIso}
					selectedYear={selectedYear}
					onPrevWeek={handlePrevWeek}
					onNextWeek={handleNextWeek}
					onAutoFillDefault={handleAutoFillDefault}
					onApplyPreset={handleApplyPreset}
					onPrintSchedule={handlePrintSchedule}
					onExportT13={handleExportT13}
					onSaveAll={handleSaveAll}
					onClose={onClose}
					notification={notification}
					conflicts={conflicts}
				/>

				{/* Main Content Workspace: Cabinets, Doctors, T-13, Utilization */}
				<DoctorRosterMatrix
					activeTab={activeTab}
					weekDays={weekDays}
					weekStartDateIso={weekStartDateIso}
					weekEndDateIso={weekEndDateIso}
					selectedYear={selectedYear}
					selectedMonth={selectedMonth}
					monthNormObj={monthNormObj}
					cabinets={cabinets}
					staffList={staffList}
					shifts={shifts}
					conflicts={conflicts}
					t13Matrix={t13Matrix}
					sanitizedAppointments={sanitizedAppointments}
					onOpenEdit={handleOpenEdit}
					onOpenCreateInCell={handleOpenCreateInCell}
					onOpenT13Timesheet={onOpenT13Timesheet}
					onOpenInternalT13Modal={() => setIsT13ModalOpen(true)}
					onExportT13={handleExportT13}
					onClose={onClose}
				/>

				{/* Quick Shift Edit Drawer */}
				{editingShift && (
					<div
						className="roster-drawer-overlay"
						onClick={() => setEditingShift(null)}
					>
						<div
							className="roster-drawer-panel"
							onClick={(e) => e.stopPropagation()}
						>
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
												assistantId:
													doc?.defaultAssistantId ?? prev.assistantId ?? null,
											};
										});
									}}
								>
									{staffList
										.filter((s) => s.isDoctor)
										.map((doc) => (
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
									{staffList
										.filter((s) => s.isAssistant)
										.map((asst) => (
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
										onChange={(e) =>
											setEditingShift((prev) => ({
												...prev,
												chairId: e.target.value,
											}))
										}
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
										onChange={(e) =>
											setEditingShift((prev) => ({
												...prev,
												dateIso: e.target.value,
											}))
										}
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
												startTime:
													arch.startTime || prev?.startTime || "08:30",
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
										onChange={(e) =>
											setEditingShift((prev) => ({
												...prev,
												startTime: e.target.value,
											}))
										}
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
										onChange={(e) =>
											setEditingShift((prev) => ({
												...prev,
												endTime: e.target.value,
											}))
										}
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
									onChange={(e) =>
										setEditingShift((prev) => ({
											...prev,
											customNotes: e.target.value,
										}))
									}
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
					<div
						style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}
					>
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
							<Check size={16} />
							<span>Применить и закрыть</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
