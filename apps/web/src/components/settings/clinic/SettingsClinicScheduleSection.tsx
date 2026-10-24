/**
 * apps/web/src/components/settings/clinic/SettingsClinicScheduleSection.tsx
 *
 * Operational schedule configuration for clinic Administrator:
 * Working hours presets, working days presets, grid step, default visit duration,
 * and sanitary intervals / buffer between patients per SanPiN.
 * Decomposed facade strictly <= 120 lines following Mandate 8b.
 */

import React from "react";
import { Clock, Timer } from "lucide-react";
import { ClinicOperatingModeSelector } from "./scheduleModules/ClinicOperatingModeSelector";
import { ClinicWorkingHoursBlock } from "./scheduleModules/ClinicWorkingHoursBlock";
import { ClinicWorkingDaysBlock } from "./scheduleModules/ClinicWorkingDaysBlock";
import { ClinicSlotAndSanitaryBlock } from "./scheduleModules/ClinicSlotAndSanitaryBlock";

type WeekdayOption = { value: number; label: string };

export interface SettingsClinicScheduleSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	toggleClinicWorkingDay: (day: number) => void;
	typedWeekdayOptions: WeekdayOption[];
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const SettingsClinicScheduleSection: React.FC<SettingsClinicScheduleSectionProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	toggleClinicWorkingDay,
	typedWeekdayOptions,
	showToast,
}) => {
	const applyHoursPreset = (start: string, end: string, label: string) => {
		updateClinicProfileDraft("workdayStart", start);
		updateClinicProfileDraft("workdayEnd", end);
		showToast(`Установлены часы работы: ${label} (${start}–${end})`, "info");
	};

	const applyDaysPreset = (days: number[], label: string) => {
		updateClinicProfileDraft("workingDays", days);
		showToast(`Установлены рабочие дни: ${label}`, "info");
	};

	const applyDurationPreset = (minutes: number) => {
		updateClinicProfileDraft("defaultVisitMinutes", String(minutes));
		showToast(`Длительность визита по умолчанию: ${minutes} мин`, "info");
	};

	const applyBufferPreset = (minutes: number) => {
		updateClinicProfileDraft("appointmentBufferMinutes", String(minutes));
		showToast(minutes > 0 ? `Санитарная обработка: ${minutes} мин` : "Санитарный интервал отключен", "info");
	};

	const currentDays: number[] = clinicProfileDraft?.workingDays ?? [1, 2, 3, 4, 5, 6];
	const currentStart = clinicProfileDraft?.workdayStart || "08:00";
	const currentEnd = clinicProfileDraft?.workdayEnd || "20:00";
	const currentDuration = Number(clinicProfileDraft?.defaultVisitMinutes || 30);
	const currentBuffer = Number(clinicProfileDraft?.appointmentBufferMinutes || 10);

	return (
		<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5" aria-label="График работы клиники и санитарные интервалы">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--primary)] flex items-center justify-center shrink-0">
						<Clock size={18} />
					</div>
					<div>
						<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">График работы клиники и сетка расписания</h3>
						<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">Часы приёма, дни работы, длительность визитов и интервалы санобработки</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] bg-[var(--paper)] px-3 h-9 min-h-[36px] rounded-xl border border-[var(--line)]">
					<Timer size={14} className="text-[var(--primary)]" />
					<span>Шаг расписания: <strong>{currentDuration} мин</strong> + буфер <strong>{currentBuffer} мин</strong></span>
				</div>
			</div>

			<ClinicOperatingModeSelector mode={clinicProfileDraft.mode} onSelectMode={(m) => updateClinicProfileDraft("mode", m)} />
			<ClinicWorkingHoursBlock start={currentStart} end={currentEnd} onStartChange={(v) => updateClinicProfileDraft("workdayStart", v)} onEndChange={(v) => updateClinicProfileDraft("workdayEnd", v)} onApplyPreset={applyHoursPreset} />
			<ClinicWorkingDaysBlock currentDays={currentDays} typedWeekdayOptions={typedWeekdayOptions} onToggleDay={toggleClinicWorkingDay} onApplyPreset={applyDaysPreset} />
			<ClinicSlotAndSanitaryBlock currentDuration={currentDuration} currentBuffer={currentBuffer} onApplyDuration={applyDurationPreset} onApplyBuffer={applyBufferPreset} />
		</section>
	);
};

export default SettingsClinicScheduleSection;
