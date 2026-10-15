/**
 * apps/web/src/components/settings/clinic/chairsModules/ClinicChairCard.tsx
 *
 * Layer 4: Individual Chair Card with shift presets, weekday toggles,
 * per-day detailed hours, autosave indicators, and soft-deactivation.
 */

import React from "react";
import { CalendarDays, ChevronDown, Clock, Edit3 } from "lucide-react";
import type {
	ClinicChairCardProps,
	InputChangeEvent,
} from "./clinicChairsTypes";

export const ClinicChairCard: React.FC<ClinicChairCardProps> = ({
	chair,
	rawScheduleDraft,
	scheduleSaveState,
	scheduleSaving,
	scheduleSaveLabel,
	specialtyLabels,
	typedWeekdayOptions,
	updateChairScheduleDraft,
	toggleChairWorkingDay,
	updateChairScheduleDay,
	setChairPresetDays,
	applyChairHoursToAll,
	saveChairSchedule,
	deleteChair,
	showToast,
	onEditChair,
}) => {
	const scheduleDraft = rawScheduleDraft || {
		start: "08:00",
		end: "20:00",
		workingDays: [1, 2, 3, 4, 5, 6],
		perDay: {},
	};

	const applyChairShift = (start: string, end: string, shiftName: string) => {
		updateChairScheduleDraft(chair.id, { start, end });
		showToast(`Установлена смена кресла: ${shiftName} (${start}–${end})`, "info");
	};

	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3"
			key={chair.id}
			data-testid={`clinic-chair-card-${chair.id}`}
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<div className="flex items-center gap-2.5">
					<div
						className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
						style={{
							backgroundColor: (chair as any).color ? `${(chair as any).color}22` : "rgba(13, 148, 136, 0.1)",
							color: (chair as any).color || "var(--primary)",
						}}
					>
						<span
							className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-white/50"
							style={{ backgroundColor: (chair as any).color || "#AEA7D3" }}
							title={`Цветовой маркер StomX: ${(chair as any).color || "Лаванда (#AEA7D3)"}`}
						/>
					</div>
					<div>
						<div className="flex items-center gap-2">
							<strong className="text-sm font-bold text-[var(--ink)] block">{chair.name}</strong>
							{onEditChair && (
								<button
									type="button"
									onClick={() => onEditChair(chair)}
									className="text-[var(--muted)] hover:text-teal-600 cursor-pointer p-0.5 rounded transition-colors"
									title="Редактировать параметры кресла"
									aria-label={`Редактировать ${chair.name}`}
								>
									<Edit3 size={13} />
								</button>
							)}
						</div>
						<p className="text-xs text-[var(--muted)] m-0">
							{chair.room ?? "кабинет не указан"} ·{" "}
							{chair.specialization
								? specialtyLabels[chair.specialization]
								: "универсально"}
							{(chair as any).defaultDoctorId && " · Врач закреплён"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<div className="flex items-center gap-1.5 flex-wrap">
						{chair.hasXraySensor && (
							<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
								RVG
							</span>
						)}
						{chair.hasMicroscope && (
							<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
								Микроскоп
							</span>
						)}
						{chair.hasSurgeryKit && (
							<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
								Хирургия
							</span>
						)}
						{!chair.hasXraySensor && !chair.hasMicroscope && !chair.hasSurgeryKit && (
							<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-[var(--muted)]">
								Базовое
							</span>
						)}
					</div>

					<label
						className="relative inline-flex items-center cursor-pointer shrink-0 ml-1"
						title={chair.active ? "Кресло активно в расписании" : "Кресло отключено"}
					>
						<input
							type="checkbox"
							checked={chair.active}
							onChange={() => {
								if (chair.active) {
									void deleteChair(chair.id);
								} else if (onEditChair) {
									void onEditChair({ ...chair, active: true });
								}
							}}
							className="sr-only peer"
							aria-label={`Активность кресла ${chair.name}`}
						/>
						<div className="w-[51px] h-[31px] bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-teal-600"></div>
					</label>
				</div>
			</div>

			{/* Schedule Editor for this chair */}
			<div className="chair-schedule-editor-box space-y-2.5">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					{/* Shift Presets */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-[var(--muted)] font-semibold">Смена:</span>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => applyChairShift("08:00", "14:00", "1-я смена")}
						>
							08:00–14:00 (1-я)
						</button>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => applyChairShift("14:00", "20:00", "2-я смена")}
						>
							14:00–20:00 (2-я)
						</button>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => applyChairShift("08:00", "21:00", "Весь день")}
						>
							08:00–21:00 (День)
						</button>
					</div>

					{/* Time Inputs */}
					<div className="flex items-center gap-2 text-xs">
						<label className="flex items-center gap-1 text-[var(--ink)] font-medium">
							<span>С:</span>
							<input
								type="time"
								value={scheduleDraft?.start ?? "08:00"}
								onChange={(event: InputChangeEvent) =>
									updateChairScheduleDraft(chair.id, {
										start: event.target.value,
									})
								}
								className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
							/>
						</label>
						<label className="flex items-center gap-1 text-[var(--ink)] font-medium">
							<span>До:</span>
							<input
								type="time"
								value={scheduleDraft?.end ?? "20:00"}
								onChange={(event: InputChangeEvent) =>
									updateChairScheduleDraft(chair.id, {
										end: event.target.value,
									})
								}
								className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
							/>
						</label>
					</div>
				</div>

				{/* Days Presets & Weekdays Row */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
					<div className="flex items-center gap-1 flex-wrap">
						<span className="text-[11px] text-[var(--muted)] font-semibold">Дни:</span>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5])}
						>
							Пн–Пт
						</button>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6])}
						>
							Пн–Сб
						</button>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
							onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6, 7])}
						>
							Все дни
						</button>
						<button
							type="button"
							className="h-8 px-2.5 rounded-lg text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer inline-flex items-center gap-1"
							onClick={() => applyChairHoursToAll(chair.id)}
							title="Скопировать часы кресла ко всем выбранным дням"
						>
							<Clock size={12} />
							Часы ко всем дням
						</button>
					</div>

					{/* Weekday toggle pills */}
					<fieldset
						className="flex items-center gap-1"
						style={{ border: "none", padding: 0, margin: 0 }}
						aria-label={`Рабочие дни кресла: ${chair.name}`}
					>
						{typedWeekdayOptions.map((day) => {
							const isWorking = (scheduleDraft.workingDays ?? []).includes(day.value);
							return (
								<button
									className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${isWorking ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
									key={day.value}
									type="button"
									aria-pressed={isWorking}
									onClick={() => toggleChairWorkingDay(chair.id, day.value)}
								>
									{day.label}
								</button>
							);
						})}
					</fieldset>
				</div>

				{/* Individual day hours detail */}
				<details className="settings-advanced-block pt-1">
					<summary className="settings-advanced-toggle cursor-pointer text-xs text-[var(--muted)] flex items-center gap-1 hover:text-[var(--ink)]">
						<ChevronDown size={13} className="shrink-0" />
						<span>Индивидуальные часы по отдельным дням недели</span>
					</summary>
					<section
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2"
						aria-label={`Часы по дням кресла: ${chair.name}`}
					>
						{typedWeekdayOptions
							.filter((day) =>
								(scheduleDraft?.workingDays ?? []).includes(day.value),
							)
							.map((day) => {
								const dayHours = scheduleDraft?.perDay?.[day.value];
								return (
									<div
										key={`chair-hours-${chair.id}-${day.value}`}
										className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-1 text-xs"
									>
										<span className="font-bold text-[var(--ink)]">{day.label}</span>
										<div className="flex items-center gap-1">
											<input
												aria-label={`${day.label}, начало кресла`}
												type="time"
												value={dayHours?.start ?? scheduleDraft?.start ?? "08:00"}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDay(chair.id, day.value, {
														start: event.target.value,
													})
												}
												className="px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] text-xs"
											/>
											<span>–</span>
											<input
												aria-label={`${day.label}, конец кресла`}
												type="time"
												value={dayHours?.end ?? scheduleDraft?.end ?? "20:00"}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDay(chair.id, day.value, {
														end: event.target.value,
													})
												}
												className="px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] text-xs"
											/>
										</div>
									</div>
								);
							})}
					</section>
				</details>

				{/* Actions: Save & Disconnect */}
				<div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
					<span className={`text-xs font-semibold ${scheduleSaveState === "saved" ? "text-teal-600" : scheduleSaveState === "error" ? "text-rose-600" : "text-amber-600"}`}>
						{scheduleSaveLabel}
					</span>

					<div className="flex items-center gap-2">
						<button
							className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
							type="button"
							onClick={() => void saveChairSchedule(chair.id)}
							disabled={scheduleSaving}
						>
							{scheduleSaving ? "Сохраняю…" : "Сохранить график"}
						</button>
						<button
							className="h-8 px-3 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer inline-flex items-center"
							type="button"
							onClick={() => void deleteChair(chair.id)}
							title="Мягкое отключение: приёмы сохраняются, кресло скрывается из выборщиков новых записей"
						>
							Отключить
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
