/**
 * apps/web/src/components/settings/clinic/SettingsClinicScheduleSection.tsx
 *
 * Operational schedule configuration for clinic Administrator:
 * Working hours presets (08:00–20:00, 08:00–21:00, 09:00–21:00),
 * Working days presets (Пн-Пт, Пн-Сб, Пн-Вс),
 * Grid step (15/30 min), default visit duration (30/45/60 min),
 * Sanitary intervals / buffer between patients (0/10/15 min) per SanPiN.
 *
 * Mandates 8b, 8c, 8d, 8e: <= 800 lines, vector Lucide icons, desktop density.
 */

import React from "react";
import {
	CalendarDays,
	Clock,
	HelpCircle,
	ShieldAlert,
	Sparkles,
	Timer,
	Users,
} from "lucide-react";
import type { ClinicMode } from "@dental/shared";

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
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
	// Quick presets for clinic working hours
	const applyHoursPreset = (start: string, end: string, label: string) => {
		updateClinicProfileDraft("workdayStart", start);
		updateClinicProfileDraft("workdayEnd", end);
		showToast(`Установлены часы работы клиники: ${label} (${start}–${end})`, "info");
	};

	// Quick presets for working days
	const applyDaysPreset = (days: number[], label: string) => {
		updateClinicProfileDraft("workingDays", days);
		showToast(`Установлены рабочие дни: ${label}`, "info");
	};

	// Quick presets for visit duration
	const applyDurationPreset = (minutes: number) => {
		updateClinicProfileDraft("defaultVisitMinutes", String(minutes));
		showToast(`Длительность визита по умолчанию: ${minutes} мин`, "info");
	};

	// Quick presets for sanitary buffer
	const applyBufferPreset = (minutes: number) => {
		updateClinicProfileDraft("appointmentBufferMinutes", String(minutes));
		showToast(
			minutes > 0
				? `Санитарный интервал СанПиН: ${minutes} мин между пациентами`
				: "Санитарный интервал отключен (0 мин)",
			"info",
		);
	};

	const currentDays: number[] = clinicProfileDraft?.workingDays ?? [1, 2, 3, 4, 5, 6];
	const currentStart = clinicProfileDraft?.workdayStart || "08:00";
	const currentEnd = clinicProfileDraft?.workdayEnd || "20:00";
	const currentDuration = Number(clinicProfileDraft?.defaultVisitMinutes || 30);
	const currentBuffer = Number(clinicProfileDraft?.appointmentBufferMinutes || 10);

	return (
		<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5" aria-label="График работы клиники и санитарные интервалы">
			{/* Section Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Clock size={18} />
					</div>
					<div>
						<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							График работы клиники и сетка расписания
						</h3>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Часы приёма, дни работы, длительность визитов и санитарные интервалы по СанПиН
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--paper)] px-2.5 py-1 rounded-lg border border-[var(--line)]">
					<Timer size={13} className="text-teal-600" />
					<span>Шаг расписания: <strong>{currentDuration} мин</strong> + буфер <strong>{currentBuffer} мин</strong></span>
				</div>
			</div>

			{/* Operating Mode: Solo vs Standard */}
			<div>
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
					Режим приёма в клинике:
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{[
						{
							value: "solo_doctor",
							title: "Частный кабинет / Соло-врач",
							desc: "1–2 кресла, субаренда или кабинет без обязательного ассистента",
						},
						{
							value: "small_clinic",
							title: "Стандартная клиника",
							desc: "3–5 кресел, сменные ассистенты и администратор на ресепшене",
						},
					].map((opt) => {
						const isSelected = clinicProfileDraft.mode === opt.value;
						return (
							<button
								key={opt.value}
								type="button"
								onClick={() => updateClinicProfileDraft("mode", opt.value)}
								className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
									isSelected
										? "bg-teal-500/10 border-teal-500/40 text-[var(--ink)] shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-slate-400"
								}`}
							>
								<div className="flex items-center justify-between">
									<strong className="text-xs text-[var(--ink)]">{opt.title}</strong>
									{isSelected && (
										<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-600 text-white">
											АКТИВЕН
										</span>
									)}
								</div>
								<span className="text-[11px] text-[var(--muted)] mt-1">{opt.desc}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Working Hours + Presets */}
			<div className="space-y-2">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						Часы работы клиники:
					</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-[var(--muted)]">Быстрый выбор:</span>
						<button
							type="button"
							onClick={() => applyHoursPreset("08:00", "20:00", "08:00–20:00")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							08:00–20:00
						</button>
						<button
							type="button"
							onClick={() => applyHoursPreset("08:00", "21:00", "08:00–21:00")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							08:00–21:00
						</button>
						<button
							type="button"
							onClick={() => applyHoursPreset("09:00", "21:00", "09:00–21:00")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							09:00–21:00
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<span>Открытие (начало приёма)</span>
						<input
							type="time"
							value={currentStart}
							onChange={(e: InputChangeEvent) =>
								updateClinicProfileDraft("workdayStart", e.target.value)
							}
							className="px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
					</label>

					<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
						<span>Закрытие (окончание смены)</span>
						<input
							type="time"
							value={currentEnd}
							onChange={(e: InputChangeEvent) =>
								updateClinicProfileDraft("workdayEnd", e.target.value)
							}
							className="px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
					</label>
				</div>
			</div>

			{/* Working Days + Presets */}
			<div className="space-y-2">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						Рабочие дни недели:
					</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-[var(--muted)]">Пресеты:</span>
						<button
							type="button"
							onClick={() => applyDaysPreset([1, 2, 3, 4, 5], "Пн–Пт")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							Пн–Пт
						</button>
						<button
							type="button"
							onClick={() => applyDaysPreset([1, 2, 3, 4, 5, 6], "Пн–Сб")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							Пн–Сб
						</button>
						<button
							type="button"
							onClick={() => applyDaysPreset([1, 2, 3, 4, 5, 6, 7], "Без выходных")}
							className="px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
						>
							Все 7 дней
						</button>
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Рабочие дни клиники">
					{typedWeekdayOptions.map((day) => {
						const isActive = currentDays.includes(day.value);
						return (
							<button
								key={day.value}
								type="button"
								onClick={() => toggleClinicWorkingDay(day.value)}
								aria-pressed={isActive}
								className={`h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border inline-flex items-center justify-center ${
									isActive
										? "bg-teal-600 text-white border-teal-600 shadow-xs"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"
								}`}
							>
								{day.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Schedule Grid Step & Sanitary Buffer (СанПиН 3.3686-21) */}
			<div className="pt-3 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* Visit Duration */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
							<Timer size={14} className="text-teal-600" />
							Длительность визита по умолчанию:
						</span>
						<span className="text-xs font-mono font-bold text-teal-600">
							{currentDuration} мин
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						{[15, 30, 45, 60].map((mins) => (
							<button
								key={mins}
								type="button"
								onClick={() => applyDurationPreset(mins)}
								className={`flex-1 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
									currentDuration === mins
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
								}`}
							>
								{mins} мин
							</button>
						))}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Базовый слот в расписании при создании новой записи пациента
					</p>
				</div>

				{/* Sanitary Interval (СанПиН) */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
							<ShieldAlert size={14} className="text-indigo-600" />
							Санитарный интервал (СанПиН 3.3686-21):
						</span>
						<span className="text-xs font-mono font-bold text-indigo-600">
							{currentBuffer > 0 ? `+${currentBuffer} мин` : "0 мин"}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						{[
							{ val: 0, label: "Без буфера (0м)" },
							{ val: 10, label: "10 мин" },
							{ val: 15, label: "15 мин (СанПиН)" },
						].map((item) => (
							<button
								key={item.val}
								type="button"
								onClick={() => applyBufferPreset(item.val)}
								className={`flex-1 h-8 min-h-[32px] rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
									currentBuffer === item.val
										? "bg-indigo-600 text-white border-indigo-600"
										: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
								}`}
							>
								{item.label}
							</button>
						))}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Автоматический перерыв между приёмами для дезинфекции установки и проветривания
					</p>
				</div>
			</div>
		</section>
	);
};

export default SettingsClinicScheduleSection;
