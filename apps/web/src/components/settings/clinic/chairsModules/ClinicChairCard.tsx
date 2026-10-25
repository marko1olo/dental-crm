/**
 * apps/web/src/components/settings/clinic/chairsModules/ClinicChairCard.tsx
 *
 * Layer 4: Individual Chair Card with shift presets, weekday toggles,
 * per-day detailed hours, autosave indicators, and soft-deactivation.
 */

import React from "react";
import type { ClinicChairCardProps } from "./clinicChairsTypes";
import { ClinicChairCardHeader } from "./ClinicChairCardHeader";
import { ClinicChairShiftBar } from "./ClinicChairShiftBar";
import { ClinicChairDaysBar } from "./ClinicChairDaysBar";
import { ClinicChairPerDayHours } from "./ClinicChairPerDayHours";

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

	const onToggleActive = () => {
		if (chair.active) {
			void deleteChair(chair.id);
		} else if (onEditChair) {
			void onEditChair({ ...chair, active: true });
		}
	};

	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3"
			key={chair.id}
			data-testid={`clinic-chair-card-${chair.id}`}
		>
			<ClinicChairCardHeader
				chair={chair}
				specialtyLabels={specialtyLabels}
				onEditChair={onEditChair}
				onToggleActive={onToggleActive}
			/>

			<div className="chair-schedule-editor-box space-y-2.5">
				<ClinicChairShiftBar
					chairId={chair.id}
					start={scheduleDraft?.start ?? "08:00"}
					end={scheduleDraft?.end ?? "20:00"}
					updateChairScheduleDraft={updateChairScheduleDraft}
					showToast={showToast}
				/>

				<ClinicChairDaysBar
					chairId={chair.id}
					chairName={chair.name}
					workingDays={scheduleDraft?.workingDays ?? []}
					typedWeekdayOptions={typedWeekdayOptions}
					setChairPresetDays={setChairPresetDays}
					applyChairHoursToAll={applyChairHoursToAll}
					toggleChairWorkingDay={toggleChairWorkingDay}
				/>

				<ClinicChairPerDayHours
					chairId={chair.id}
					chairName={chair.name}
					workingDays={scheduleDraft?.workingDays ?? []}
					typedWeekdayOptions={typedWeekdayOptions}
					perDay={scheduleDraft?.perDay}
					defaultStart={scheduleDraft?.start ?? "08:00"}
					defaultEnd={scheduleDraft?.end ?? "20:00"}
					updateChairScheduleDay={updateChairScheduleDay}
				/>

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
