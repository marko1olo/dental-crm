import React from "react";
import type { Chair } from "@dental/shared";
import { ClinicChairCard } from "./ClinicChairCard";
import type {
	ChairDayHours,
	ChairScheduleDraft,
	WeekdayOption,
} from "./clinicChairsTypes";

interface ClinicChairsListProps {
	typedChairs: Chair[];
	chairScheduleDrafts: Record<string, Partial<ChairScheduleDraft> | Record<string, unknown>>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds?: Set<string> | ReadonlySet<string> | string[] | Record<string, boolean> | unknown;
	chairScheduleSavingId?: string | null | undefined;
	staffScheduleDraftFromWorkingHours?: (hours: unknown) => ChairScheduleDraft;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	updateChairScheduleDraft: (id: string, patch: Partial<ChairScheduleDraft> | Partial<Chair>) => void;
	toggleChairWorkingDay: (id: string, day: number) => void;
	updateChairScheduleDay: (id: string, day: number, patch: Partial<ChairDayHours>) => void;
	setChairPresetDays: (id: string, days: number[]) => void;
	applyChairHoursToAll: (id: string) => void;
	saveChairSchedule: (id: string) => Promise<void> | void;
	deleteChair: (id: string) => Promise<void> | void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
	onEditChair: (chair: Chair) => void;
}

function isChairDirty(dirtyIds: unknown, id: string): boolean {
	if (!dirtyIds) return false;
	if (typeof (dirtyIds as Set<string>).has === "function") {
		return (dirtyIds as Set<string>).has(id);
	}
	if (Array.isArray(dirtyIds)) {
		return dirtyIds.includes(id);
	}
	if (typeof dirtyIds === "object" && dirtyIds !== null) {
		return Boolean((dirtyIds as Record<string, boolean>)[id]);
	}
	return false;
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
				const scheduleDirty = isChairDirty(chairScheduleDirtyIds, chair.id);
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
