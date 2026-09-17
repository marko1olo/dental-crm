/**
 * DENTE Dental CRM — useSchedule Custom Hook (useSchedule.ts)
 *
 * Centralized Schedule, Chairs & Shifts Architecture Hook (StomX / IDENT parity).
 *
 * Mandate Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless shift & chair management)
 * - Mandate 8k: CRM != Reality Simulator (1-click shift presets, automatic defaults)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-chair/solo doctor auto-binding)
 * - Mandate 8d: Apple HIG / Medical touch targets >= 44x44px
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Dashboard } from "@dental/shared";
import type { QuickAddChairData } from "./QuickAddChairModal";
import {
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "./ScheduleGrid";
import {
	type ScheduleChair,
} from "./ScheduleFilterStrip";
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
	resolveChairDutyDoctor,
} from "./QuickBookingDrawer";
import {
	syncShiftsWithServer,
	type SyncShiftPayload,
} from "./chairRosterMath";
import {
	computeShiftAssignment,
	type ShiftPresetType,
} from "./scheduleShiftHelpers";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage";

export {
	resolveChairDutyDoctor,
	syncShiftsWithServer,
	computeShiftAssignment,
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	type ScheduleChair,
	type QuickAddChairData,
	type SyncShiftPayload,
	type ShiftPresetType,
};

export interface UseScheduleOptions {
	dashboard?: Dashboard | undefined;
	dateKey?: string | undefined;
	selectedChairId?: string | null | undefined;
	selectedDoctorId?: string | null | undefined;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	onAssignChairDoctor?:
		| ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void)
		| undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
	onAppointmentMove?:
		| ((appointmentId: string, updates: any) => Promise<any> | void)
		| undefined;
}

export function useSchedule(options: UseScheduleOptions = {}) {
	const {
		dashboard,
		dateKey = new Date().toISOString().slice(0, 10),
		selectedChairId,
		selectedDoctorId,
		chairDoctorAssignments: externalChairAssignments,
		onAssignChairDoctor,
		onAddChair,
		onSelectChair,
		onAppointmentMove,
	} = options;

	const rawChairs = dashboard?.clinicSettings?.chairs ?? [];
	const chairs = useMemo(() => {
		return rawChairs.length > 0 ? rawChairs : [DEFAULT_SOLO_CHAIR as any];
	}, [rawChairs]);
	const isSoloDoctor = chairs.length <= 1;

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(
		selectedChairId ?? null,
	);
	const [localAssignments, setLocalAssignments] = useState<
		Record<string, ChairDoctorShiftAssignment>
	>({});

	useEffect(() => {
		if (selectedChairId !== undefined) {
			setInternalSelectedChairId(selectedChairId);
		}
	}, [selectedChairId]);

	const effectiveSelectedChairId =
		selectedChairId !== undefined ? selectedChairId : internalSelectedChairId;

	const toggleChairFilter = useCallback(
		(chairId: string) => {
			const next = effectiveSelectedChairId === chairId ? null : chairId;
			setInternalSelectedChairId(next);
			if (onSelectChair) {
				onSelectChair(next);
			}
		},
		[effectiveSelectedChairId, onSelectChair],
	);

	// Load stored assignments from localStorage if not passed externally
	useEffect(() => {
		if (!dateKey || typeof window === "undefined") return;
		if (externalChairAssignments && Object.keys(externalChairAssignments).length > 0) {
			return;
		}
		const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
		const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
		if (parsed && typeof parsed === "object") {
			setLocalAssignments((prev) => (JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed));
		}
	}, [dateKey, externalChairAssignments]);

	const effectiveChairDoctorAssignments = useMemo(() => {
		return externalChairAssignments ?? localAssignments;
	}, [externalChairAssignments, localAssignments]);

	// 1-Click Shift Assignment with Presets (StomX / IDENT parity)
	const assignShift = useCallback(
		(
			chair: ScheduleChair,
			preset: ShiftPresetType,
			targetDocId?: string,
		): ChairDoctorShiftAssignment | null => {
			const resolvedDocId =
				targetDocId ||
				effectiveChairDoctorAssignments[chair.id]?.doctorId ||
				(chair as any).defaultDoctorId ||
				doctors[0]?.id;
			const targetDoc = doctors.find((d) => d.id === resolvedDocId) || doctors[0];

			if (!targetDoc) {
				showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
				return null;
			}

			let existingAssignment: ChairDoctorShiftAssignment | null =
				effectiveChairDoctorAssignments[chair.id] || null;

			if (!existingAssignment && typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
				if (parsed?.[chair.id]) {
					existingAssignment = parsed[chair.id];
				}
			}

			const assignment = computeShiftAssignment({
				chair,
				preset,
				targetDoc: {
					id: targetDoc.id,
					fullName: targetDoc.fullName,
					specialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : null,
				},
				existingAssignment,
				dateKey,
			});

			let updatedTodayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				existing[chair.id] = assignment;
				updatedTodayAssignments = existing;
				safeLocalStorageSetJson(storageKey, existing);
				setLocalAssignments(existing);

				if (preset === "even_odd" || preset === "2x2") {
					const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
					const mondayIso = getMondayOfWeekIso(dateKey);
					const templateId =
						preset === "even_odd" ? "even_odd_month" : "two_two_full";
					const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
						weekStartDateIso: mondayIso,
						templateId,
						doctorId: targetDoc.id,
						chairId: chair.id,
						staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
					});
					safeLocalStorageSetJson(
						"dente_doctor_shifts",
						updatedShifts,
					);
				}
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, assignment);
			}

			syncShiftsWithServer(dateKey, updatedTodayAssignments, chairs).catch(() => {});

			showToast(
				`Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${assignment.shiftLabel} • ${chair.name}`,
				"success",
			);

			return assignment;
		},
		[
			effectiveChairDoctorAssignments,
			doctors,
			dateKey,
			dashboard?.clinicSettings?.staff,
			onAssignChairDoctor,
			chairs,
		],
	);

	// Fast Binding of Chairs to Doctors via Date Range (StomX Parity)
	const assignDateRange = useCallback(
		(params: {
			startDateIso: string;
			endDateIso: string;
			doctorId: string;
			chairId: string;
			shiftPreset: DateRangeShiftPreset;
		}) => {
			const { startDateIso, endDateIso, doctorId, chairId, shiftPreset } = params;
			const targetDoc =
				doctors.find((d) => d.id === doctorId) ||
				(dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === doctorId);
			const chairObj = chairs.find((c) => c.id === chairId) || DEFAULT_SOLO_CHAIR;

			if (typeof window !== "undefined") {
				const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
				const updatedShifts = applyDoctorChairDateRange(currentShifts, {
					startDateIso,
					endDateIso,
					doctorId,
					chairId,
					shiftPreset,
					staffList:
						(dashboard?.clinicSettings?.staff as any) || (doctors as any),
				});
				safeLocalStorageSetJson(
					"dente_doctor_shifts",
					updatedShifts,
				);

				if (dateKey && dateKey >= startDateIso && dateKey <= endDateIso) {
					const isMorn = shiftPreset === "morning" || shiftPreset === "morning_9";
					const isEve = shiftPreset === "evening" || shiftPreset === "evening_15";
					const startH =
						shiftPreset === "morning_9"
							? 9
							: shiftPreset === "evening_15"
								? 15
								: isEve
									? 14
									: 8;
					const endH =
						shiftPreset === "morning_9"
							? 15
							: shiftPreset === "evening_15"
								? 21
								: isEve
									? 20
									: 14;
					const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;
					const sLabel =
						shiftPreset === "morning_9"
							? "1 см. 09-15"
							: shiftPreset === "evening_15"
								? "2 см. 15-21"
								: isEve
									? "Вечер 14-20"
									: isMorn
										? "Утро 08-14"
										: "Весь день";

					const assignment: ChairDoctorShiftAssignment = {
						chairId,
						chairName: chairObj.name,
						doctorId,
						doctorName: targetDoc?.fullName || "Врач",
						doctorSpecialty:
							targetDoc && (targetDoc as any).specialty
								? String((targetDoc as any).specialty)
								: undefined,
						shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full",
						shiftLabel: sLabel,
						shiftHours: sHours,
						startHour: startH,
						endHour: endH,
					};

					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
					existing[chairId] = assignment;
					safeLocalStorageSetJson(storageKey, existing);
					setLocalAssignments(existing);
					syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});

					if (onAssignChairDoctor) {
						onAssignChairDoctor(chairId, assignment);
					}
				}
			}

			showToast(
				`График врача ${targetDoc?.fullName ? formatDoctorShortName(targetDoc.fullName) : ""} применен на кресло «${chairObj.name}» (${startDateIso} — ${endDateIso})`,
				"success",
				3500,
			);
		},
		[
			doctors,
			dashboard?.clinicSettings?.staff,
			chairs,
			dateKey,
			onAssignChairDoctor,
		],
	);

	// Quick Doctor Substitution on Chair
	const quickSubstituteDoctor = useCallback(
		(chair: ScheduleChair, newDoctorId: string) => {
			const targetDoc =
				doctors.find((d) => d.id === newDoctorId) ||
				dashboard?.clinicSettings?.staff?.find((s) => s.id === newDoctorId) ||
				doctors[0];
			const newDoctorName = targetDoc ? targetDoc.fullName : newDoctorId;
			const existingAssignment =
				effectiveChairDoctorAssignments[chair.id] || null;

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
				setLocalAssignments(existing);
				syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});
			}

			if (onAssignChairDoctor) {
				onAssignChairDoctor(chair.id, updatedAssignment);
			}

			showToast(
				`Врач ${newDoctorName} подменяет врача на кресле «${chair.name}» (StomX Parity)`,
				"success",
			);
			return updatedAssignment;
		},
		[
			doctors,
			dashboard?.clinicSettings?.staff,
			effectiveChairDoctorAssignments,
			dateKey,
			chairs,
			onAssignChairDoctor,
		],
	);

	// Quick Copy Week Shifts
	const copyWeekShiftsToNextWeek = useCallback(() => {
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
				} else if (srcDay === dateKey && effectiveChairDoctorAssignments) {
					safeLocalStorageSetJson(
						targetKey,
						effectiveChairDoctorAssignments,
					);
					syncShiftsWithServer(
						targetDay,
						effectiveChairDoctorAssignments,
						chairs,
					).catch(() => {});
				}
			}

			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const updatedShifts = copyWeekShiftsToTargetWeek(
				currentShifts,
				mondayIso,
				nextMondayIso,
			);
			safeLocalStorageSetJson(
				"dente_doctor_shifts",
				updatedShifts,
			);
		}

		showToast(
			`График смен кресел скопирован на следующую неделю (${nextMondayIso})`,
			"success",
			3500,
		);
	}, [chairs, dateKey, effectiveChairDoctorAssignments]);

	// Copy Today Shifts to Current Week (workdays or full)
	const copyTodayShiftsToCurrentWeek = useCallback(
		(workdaysOnly = false) => {
			const label = workdaysOnly ? "будни (Пн–Пт)" : "всю неделю (Пн–Вс)";
			const mondayIso = getMondayOfWeekIso(dateKey);
			const daysCount = workdaysOnly ? 5 : 7;

			let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
				effectiveChairDoctorAssignments
					? { ...effectiveChairDoctorAssignments }
					: {};

			if (typeof window !== "undefined" && dateKey) {
				const raw = safeLocalStorageGetItem(
					`dente_chair_doctor_assignments_${dateKey}`,
				);
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
					syncShiftsWithServer(targetDay, todayAssignments, chairs).catch(
						() => {},
					);
				}
			}

			showToast(
				`График смен кресел применен на ${label} (${mondayIso}..) в 1 клик (StomX Parity)`,
				"success",
				3500,
			);
		},
		[dateKey, effectiveChairDoctorAssignments, chairs],
	);

	// Copy Today Shifts to Full Month
	const copyTodayShiftsToMonth = useCallback(() => {
		const year =
			Number.parseInt(dateKey ? dateKey.slice(0, 4) : "2026", 10) || 2026;
		const month =
			Number.parseInt(dateKey ? dateKey.slice(5, 7) : "9", 10) || 9;
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
			effectiveChairDoctorAssignments
				? { ...effectiveChairDoctorAssignments }
				: {};

		if (typeof window !== "undefined" && dateKey) {
			const raw = safeLocalStorageGetItem(
				`dente_chair_doctor_assignments_${dateKey}`,
			);
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
				syncShiftsWithServer(targetDayIso, todayAssignments, chairs).catch(
					() => {},
				);
			}

			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const mondayIso = getMondayOfWeekIso(dateKey);
			const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
			safeLocalStorageSetJson(
				"dente_doctor_shifts",
				updatedShifts,
			);
		}

		showToast(
			`График смен кресел применен на весь текущий месяц (${monthName}) в 1 клик (StomX Parity)`,
			"success",
			3500,
		);
	}, [dateKey, effectiveChairDoctorAssignments, chairs]);

	// Save or Update Chair (with State + Server Fallback per Mandate 8e, 8n)
	const saveChair = useCallback(
		async (data: QuickAddChairData) => {
			if (onAddChair) {
				await onAddChair(data);
				return;
			}

			// Resilient optimistic state update & direct API persistence fallback
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

			if (data.defaultDoctorId && onAssignChairDoctor) {
				assignShift(savedChair, "full", data.defaultDoctorId);
			}
		},
		[onAddChair, dashboard?.clinicSettings, chairs.length, onAssignChairDoctor, assignShift],
	);

	// Duplicate Chair Helper
	const duplicateChair = useCallback(
		(chair: ScheduleChair): QuickAddChairData => {
			return {
				name: `${chair.name} (копия)`,
				room: (chair as any).room || (chair as any).roomNumber || "",
				roomNumber: (chair as any).roomNumber || (chair as any).room || "",
				specialization: (chair as any).specialization || "therapist",
				color: (chair as any).color || "#0d9488",
				isActive: (chair as any).active ?? (chair as any).isActive ?? true,
				defaultDoctorId: (chair as any).defaultDoctorId || null,
				branchId: (chair as any).branchId,
			};
		},
		[],
	);

	// Duty Doctor Resolver for Slot Click
	const resolveDutyDoctorForSlot = useCallback(
		(
			chairId: string,
			slotStartsAt?: string,
			preferredDoctorId?: string | null,
		) => {
			const chairObj =
				chairs.find((c) => c.id === chairId) ||
				(chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
			return resolveChairDutyDoctor(
				chairId,
				slotStartsAt,
				effectiveChairDoctorAssignments,
				dateKey,
				preferredDoctorId,
				(chairObj as any)?.defaultDoctorId ||
					(doctors.length === 1 ? doctors[0]?.id : null),
			);
		},
		[chairs, effectiveChairDoctorAssignments, dateKey, doctors],
	);

	// Free Visit Movement & Rescheduling Helper (Soft Overbooking per Mandate 8e, 8n)
	const moveAppointment = useCallback(
		async (
			appointmentId: string,
			updates: {
				startsAt?: string;
				endsAt?: string;
				chairId?: string;
				doctorUserId?: string;
				allowOverbooking?: boolean;
			},
		) => {
			if (onAppointmentMove) {
				return await onAppointmentMove(appointmentId, {
					...updates,
					allowOverbooking: updates.allowOverbooking ?? true,
					allowEmergencyOverride: true,
				});
			}
		},
		[onAppointmentMove],
	);

	return {
		chairs,
		isSoloDoctor,
		doctors,
		selectedChairId: effectiveSelectedChairId,
		setSelectedChairId: setInternalSelectedChairId,
		toggleChairFilter,
		chairDoctorAssignments: effectiveChairDoctorAssignments,
		assignShift,
		assignDateRange,
		quickSubstituteDoctor,
		copyWeekShiftsToNextWeek,
		copyTodayShiftsToCurrentWeek,
		copyTodayShiftsToMonth,
		saveChair,
		duplicateChair,
		resolveDutyDoctorForSlot,
		moveAppointment,
	};
}

export default useSchedule;
