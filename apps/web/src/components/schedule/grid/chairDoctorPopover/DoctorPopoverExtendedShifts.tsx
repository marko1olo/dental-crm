/**
 * DoctorPopoverExtendedShifts.tsx — Multi-day and rotation template shift buttons inside chair popover.
 */

import React from "react";
import { Calendar, CalendarRange, Clock, UserCheck, Zap } from "lucide-react";
import { getMondayOfWeekIso, applyDoctorChairWeeklyTemplate } from "../../roster/DoctorShiftRosterModal";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../../lib/safeLocalStorage";
import type { ScheduleChairDoctorPopoverProps, ShiftPresetType } from "./chairDoctorPopoverTypes";

interface DoctorPopoverExtendedShiftsProps {
	chair: ScheduleChairDoctorPopoverProps["chair"];
	targetDocId: string;
	doctors: ScheduleChairDoctorPopoverProps["doctors"];
	currentDocId?: string;
	dateKey: string;
	dashboard: ScheduleChairDoctorPopoverProps["dashboard"];
	handleAssignDoctorWeek: ScheduleChairDoctorPopoverProps["handleAssignDoctorWeek"];
	handleAssignDoctorMonth: ScheduleChairDoctorPopoverProps["handleAssignDoctorMonth"];
	handleConfirmAssignDoctor: ScheduleChairDoctorPopoverProps["handleConfirmAssignDoctor"];
	handleQuickSubstituteDoctor: ScheduleChairDoctorPopoverProps["handleQuickSubstituteDoctor"];
	onClose: () => void;
}

const btnClass = "min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all";

export function DoctorPopoverExtendedShifts({
	chair, targetDocId, doctors, currentDocId, dateKey, dashboard,
	handleAssignDoctorWeek, handleAssignDoctorMonth, handleConfirmAssignDoctor,
	handleQuickSubstituteDoctor, onClose,
}: DoctorPopoverExtendedShiftsProps) {
	const applyTemplate = (templateId: "two_two_full" | "even_odd_month", fallbackPreset: ShiftPresetType) => {
		if (!targetDocId) return;
		if (typeof window !== "undefined") {
			const mondayIso = getMondayOfWeekIso(dateKey);
			const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
			const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
				weekStartDateIso: mondayIso, templateId, doctorId: targetDocId, chairId: chair.id,
				staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
			});
			safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
		}
		handleConfirmAssignDoctor(chair.id, targetDocId, fallbackPreset);
		onClose();
	};

	return (
		<>
			<button
				type="button" onClick={() => { if (targetDocId) handleAssignDoctorWeek(chair.id, targetDocId); onClose(); }}
				className={btnClass} style={{ minHeight: "44px" }} data-testid={`chair-popover-shift-week-${chair.id}`}
			>
				<Calendar size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />
				<span className="truncate">На всю неделю (Пн–Пт)</span>
			</button>
			<button
				type="button" onClick={() => { if (targetDocId) handleAssignDoctorWeek(chair.id, targetDocId, true); onClose(); }}
				className={btnClass} style={{ minHeight: "44px" }} data-testid={`chair-popover-shift-week-full-${chair.id}`}
			>
				<Calendar size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
				<span className="truncate">На всю неделю (Пн–Вс)</span>
			</button>
			<button
				type="button" onClick={() => applyTemplate("two_two_full", "two_shifts")}
				className={btnClass} style={{ minHeight: "44px" }} data-testid={`chair-popover-shift-two-two-${chair.id}`}
			>
				<Clock size={15} className="text-purple-500 shrink-0" aria-hidden="true" />
				<span className="truncate">2 через 2 (08–20)</span>
			</button>
			<button
				type="button" onClick={() => {
					const day = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
					applyTemplate("even_odd_month", day % 2 === 0 ? "morning" : "evening");
				}}
				className={btnClass} style={{ minHeight: "44px" }} data-testid={`chair-popover-shift-even-odd-${chair.id}`}
			>
				<Zap size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
				<span className="truncate">Чет / Нечет</span>
			</button>
			<button
				type="button" onClick={() => { if (targetDocId) handleAssignDoctorMonth(chair.id, targetDocId); onClose(); }}
				className={btnClass} style={{ minHeight: "44px" }} data-testid={`chair-popover-shift-month-${chair.id}`}
			>
				<CalendarRange size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
				<span className="truncate">На весь месяц</span>
			</button>
			<button
				type="button" onClick={() => {
					const sub = doctors.find((d) => d.id !== currentDocId) || doctors[0];
					if (sub) handleQuickSubstituteDoctor(chair.id, sub.id);
					onClose();
				}}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer transition-all"
				style={{ minHeight: "44px" }} data-testid={`chair-popover-substitute-${chair.id}`}
			>
				<UserCheck size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
				<span className="truncate">Подменить врача на сегодня</span>
			</button>
		</>
	);
}
