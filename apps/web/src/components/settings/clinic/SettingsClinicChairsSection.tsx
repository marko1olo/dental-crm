/**
 * apps/web/src/components/settings/clinic/SettingsClinicChairsSection.tsx
 *
 * Operational chairs & installation shifts management for Clinic Administrator.
 * Quick presets for shifts (08:00–14:00 1st shift, 14:00–20:00 2nd shift, 08:00–21:00 full day),
 * equipment tags (RVG, microscope, surgery kit), individual day hours, and soft-deactivation.
 *
 * Mandates 8b, 8c, 8d, 8e: <= 800 lines, vector Lucide icons, desktop density.
 */

import React from "react";
import type { Chair } from "@dental/shared";
import {
	CalendarDays,
	ChevronDown,
	Clock,
	Plus,
	PowerOff,
	Save,
	ShieldCheck,
	Sparkles,
} from "lucide-react";

type TextInputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type WeekdayOption = { value: number; label: string };

export interface SettingsClinicChairsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	typedChairs: Chair[];
	newChairName: string;
	setNewChairName?: (name: string) => void;
	handleAddChair: () => void;
	newChairReadyToCreate?: boolean;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	chairScheduleDrafts: Record<string, any>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds: Set<string>;
	chairScheduleSavingId?: string | null;
	staffScheduleDraftFromWorkingHours: (hours: any) => any;
	updateChairScheduleDraft: (chairId: string, partial: any) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	updateChairScheduleDay: (chairId: string, day: number, hours: any) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	deleteChair: (chairId: string) => Promise<void> | void;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const SettingsClinicChairsSection: React.FC<SettingsClinicChairsSectionProps> = ({
	typedChairs,
	newChairName,
	setNewChairName,
	handleAddChair,
	newChairReadyToCreate,
	newChairHasXraySensor,
	setNewChairHasXraySensor,
	newChairHasMicroscope,
	setNewChairHasMicroscope,
	newChairHasSurgeryKit,
	setNewChairHasSurgeryKit,
	chairScheduleDrafts,
	chairScheduleSaveStates,
	chairScheduleDirtyIds,
	chairScheduleSavingId,
	staffScheduleDraftFromWorkingHours,
	updateChairScheduleDraft,
	toggleChairWorkingDay,
	updateChairScheduleDay,
	saveChairSchedule,
	deleteChair,
	specialtyLabels,
	typedWeekdayOptions,
	setChairPresetDays,
	applyChairHoursToAll,
	showToast,
}) => {
	// Quick shift preset for a specific chair
	const applyChairShift = (chairId: string, start: string, end: string, shiftName: string) => {
		updateChairScheduleDraft(chairId, { start, end });
		showToast(`Установлена смена кресла: ${shiftName} (${start}–${end})`, "info");
	};

	return (
		<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
			<div className="panel-heading flex items-center justify-between">
				<div>
					<h3 className="font-bold text-base text-[var(--ink)] m-0">Кресла и стоматологические установки</h3>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Оснащение установок (RVG, микроскоп, хирургия) и индивидуальные графики смен
					</p>
				</div>
				<span className="status-pill status-confirmed px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
					{typedChairs.length} {typedChairs.length === 1 ? "кресло" : "кресел"}
				</span>
			</div>

			{/* Quick Create Chair */}
			<div className="quick-create flex items-center gap-2">
				<input
					aria-label="Новое кресло"
					placeholder="Название кресла или кабинета"
					value={newChairName}
					onChange={(event: TextInputChangeEvent) =>
						setNewChairName?.(event.target.value)
					}
					className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
				/>
				<button
					aria-label="Добавить кресло или кабинет"
					className="icon-button flex items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer shrink-0"
					type="button"
					onClick={handleAddChair}
					disabled={false}
					style={{ minHeight: "44px", minWidth: "44px" }}
				>
					<Plus aria-hidden="true" size={20} />
				</button>
			</div>

			{/* Chair Templates */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--muted)] font-semibold">
					Шаблоны кабинетов:
				</span>
				<button
					type="button"
					className="compact-button secondary-button px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
					onClick={() => {
						setNewChairName?.(`Кабинет №${typedChairs.length + 1} (Терапия)`);
						setNewChairHasXraySensor(true);
						setNewChairHasMicroscope(false);
						setNewChairHasSurgeryKit(false);
					}}
					title="Кабинет общей терапии с RVG визиографом"
				>
					+ Терапия (с RVG)
				</button>
				<button
					type="button"
					className="compact-button secondary-button px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
					onClick={() => {
						setNewChairName?.(`Кабинет №${typedChairs.length + 1} (Хирургия)`);
						setNewChairHasXraySensor(true);
						setNewChairHasMicroscope(true);
						setNewChairHasSurgeryKit(true);
					}}
					title="Хирургический кабинет с микроскопом и хирургическим набором"
				>
					+ Хирургия (RVG + Микроскоп)
				</button>
				<button
					type="button"
					className="compact-button secondary-button px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
					onClick={() => {
						setNewChairName?.("Кабинет гигиены и профосмотра");
						setNewChairHasXraySensor(false);
						setNewChairHasMicroscope(false);
						setNewChairHasSurgeryKit(false);
					}}
					title="Кабинет гигиены"
				>
					+ Гигиена
				</button>
			</div>

			{/* Equipment Toggles for New Chair */}
			<div
				role="toolbar"
				className="role-picker equipment-picker flex items-center gap-1.5"
				aria-label="Оборудование кресла"
			>
				<span className="text-[11px] text-[var(--muted)] font-semibold mr-1">Оснащение:</span>
				<button
					className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${newChairHasXraySensor ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasXraySensor}
					onClick={() =>
						setNewChairHasXraySensor((value: boolean) => !value)
					}
				>
					RVG визиограф
				</button>
				<button
					className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${newChairHasMicroscope ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasMicroscope}
					onClick={() =>
						setNewChairHasMicroscope((value: boolean) => !value)
					}
				>
					Микроскоп
				</button>
				<button
					className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${newChairHasSurgeryKit ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}
					type="button"
					aria-pressed={newChairHasSurgeryKit}
					onClick={() =>
						setNewChairHasSurgeryKit((value: boolean) => !value)
					}
				>
					Хирургия
				</button>
			</div>

			{/* Chairs List */}
			<div className="staff-list space-y-3 pt-2">
				{typedChairs.map((chair) => {
					const scheduleDraft =
						chairScheduleDrafts[chair.id] ??
						staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
					const scheduleSaveState =
						chairScheduleSaveStates[chair.id] ?? "saved";
					const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
					const scheduleSaving =
						chairScheduleSavingId === chair.id ||
						scheduleSaveState === "saving";
					const scheduleSaveLabel = scheduleSaving
						? "Автосохранение"
						: scheduleSaveState === "error"
							? "Не сохранено"
							: scheduleDirty
								? "Ждет автосохранения"
								: "Сохранено";

					return (
						<div
							className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3"
							key={chair.id}
						>
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
								<div className="flex items-center gap-2.5">
									<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
										<CalendarDays size={16} aria-hidden="true" />
									</div>
									<div>
										<strong className="text-sm font-bold text-[var(--ink)] block">{chair.name}</strong>
										<p className="text-xs text-[var(--muted)] m-0">
											{chair.room ?? "кабинет не указан"} ·{" "}
											{chair.specialization
												? specialtyLabels[chair.specialization]
												: "универсально"}
										</p>
									</div>
								</div>

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
							</div>

							{/* Schedule Editor for this chair */}
							<div className="staff-schedule-editor space-y-2.5">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
									{/* Shift Presets */}
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="text-[11px] text-[var(--muted)] font-semibold">Смена:</span>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => applyChairShift(chair.id, "08:00", "14:00", "1-я смена")}
										>
											08:00–14:00 (1-я)
										</button>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => applyChairShift(chair.id, "14:00", "20:00", "2-я смена")}
										>
											14:00–20:00 (2-я)
										</button>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => applyChairShift(chair.id, "08:00", "21:00", "Весь день")}
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
												value={scheduleDraft.start}
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
												value={scheduleDraft.end}
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
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5])}
										>
											Пн–Пт
										</button>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6])}
										>
											Пн–Сб
										</button>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer"
											onClick={() => setChairPresetDays(chair.id, [1, 2, 3, 4, 5, 6, 7])}
										>
											Все дни
										</button>
										<button
											type="button"
											className="px-2 py-0.5 rounded text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer inline-flex items-center gap-1"
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
												(scheduleDraft.workingDays ?? []).includes(day.value),
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
																value={dayHours?.start ?? scheduleDraft.start}
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
																value={dayHours?.end ?? scheduleDraft.end}
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
											className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
											type="button"
											onClick={() => void saveChairSchedule(chair.id)}
											disabled={scheduleSaving}
										>
											{scheduleSaving ? "Сохраняю…" : "Сохранить график"}
										</button>
										<button
											className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer"
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
				})}
			</div>
		</article>
	);
};

export default SettingsClinicChairsSection;
