import React from "react";
import type { Chair } from "@dental/shared";
import { ClinicChairCard } from "./ClinicChairCard";
import type { WeekdayOption } from "./clinicChairsTypes";

interface ClinicChairsListProps {
	typedChairs: Chair[];
	chairScheduleDrafts: Record<string, any>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds: any;
	chairScheduleSavingId?: string | null | undefined;
	staffScheduleDraftFromWorkingHours?: (hours: any) => any;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	updateChairScheduleDraft: (id: string, patch: any) => void;
	toggleChairWorkingDay: (id: string, day: number) => void;
	updateChairScheduleDay: (id: string, day: number, patch: any) => void;
	setChairPresetDays: (id: string, days: number[]) => void;
	applyChairHoursToAll: (id: string) => void;
	saveChairSchedule: (id: string) => Promise<void> | void;
	deleteChair: (id: string) => Promise<void> | void;
	showToast: (msg: string, type: any) => void;
	onEditChair: (chair: Chair) => void;
}

export const ClinicChairsList: React.FC<ClinicChairsListProps> = ({
	typedChairs,
	chairScheduleDrafts,
	chairScheduleSaveStates,
	chairScheduleDirtyIds,
	chairScheduleSavingId,
	staffScheduleDraftFromWorkingHours,
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
	return (
		<div className="staff-list space-y-3 pt-2">
			{typedChairs.map((chair) => {
				const rawScheduleDraft =
					chairScheduleDrafts[chair.id] ??
					(typeof staffScheduleDraftFromWorkingHours === "function"
						? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null)
						: null);
				const scheduleSaveState = chairScheduleSaveStates[chair.id] ?? "saved";
				const scheduleDirty = Boolean(
					chairScheduleDirtyIds && typeof chairScheduleDirtyIds.has === "function"
						? chairScheduleDirtyIds.has(chair.id)
						: Array.isArray(chairScheduleDirtyIds)
							? chairScheduleDirtyIds.includes(chair.id)
							: typeof chairScheduleDirtyIds === "object"
								? Boolean((chairScheduleDirtyIds as Record<string, unknown>)[chair.id])
								: false,
				);
				const scheduleSaving =
					chairScheduleSavingId === chair.id || scheduleSaveState === "saving";
				const scheduleSaveLabel = scheduleSaving
					? "Автосохранение"
					: scheduleSaveState === "error"
						? "Не сохранено"
						: scheduleDirty
							? "Ждет автосохранения"
							: "Сохранено";

				return (
					<ClinicChairCard
						key={chair.id}
						chair={chair}
						rawScheduleDraft={rawScheduleDraft}
						scheduleSaveState={scheduleSaveState}
						scheduleDirty={scheduleDirty}
						scheduleSaving={scheduleSaving}
						scheduleSaveLabel={scheduleSaveLabel}
						specialtyLabels={specialtyLabels}
						typedWeekdayOptions={typedWeekdayOptions}
						updateChairScheduleDraft={updateChairScheduleDraft}
						toggleChairWorkingDay={toggleChairWorkingDay}
						updateChairScheduleDay={updateChairScheduleDay}
						setChairPresetDays={setChairPresetDays}
						applyChairHoursToAll={applyChairHoursToAll}
						saveChairSchedule={saveChairSchedule}
						deleteChair={deleteChair}
						showToast={showToast}
						onEditChair={onEditChair}
					/>
				);
			})}
		</div>
	);
};
