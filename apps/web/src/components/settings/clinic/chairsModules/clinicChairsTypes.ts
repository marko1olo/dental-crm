/**
 * apps/web/src/components/settings/clinic/chairsModules/clinicChairsTypes.ts
 *
 * Layer 0: Core types, props interfaces, and schedule contracts for clinic chairs section.
 * Zero-runtime dependencies.
 */

import type React from "react";
import type { Chair, DentalSpecialty, StaffWorkingHours } from "@dental/shared";

export type TextInputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type WeekdayOption = { value: number; label: string };

export interface ChairDayHours {
	start?: string;
	end?: string;
}

export interface ChairScheduleDraft {
	start: string;
	end: string;
	workingDays: number[];
	perDay: Record<number, ChairDayHours>;
}

export interface ChairUpdatePatch {
	name?: string;
	room?: string | null;
	specialization?: DentalSpecialty | null;
	color?: string | null;
	active?: boolean;
	isActive?: boolean;
	hasXraySensor?: boolean;
	hasMicroscope?: boolean;
	hasSurgeryKit?: boolean;
	notes?: string | null;
	defaultDoctorId?: string | null;
	workingHours?: StaffWorkingHours | null;
}

export interface SettingsClinicChairsSectionProps {
	typedChairs: Chair[];
	newChairName: string;
	setNewChairName?: (name: string) => void;
	handleAddChair: (overrideName?: string) => void;
	newChairReadyToCreate?: boolean;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void);
	chairScheduleDrafts: Record<string, Partial<ChairScheduleDraft> | Record<string, unknown>>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds?: Set<string> | ReadonlySet<string> | string[] | Record<string, boolean> | unknown;
	chairScheduleSavingId?: string | null;
	staffScheduleDraftFromWorkingHours: (hours: unknown) => ChairScheduleDraft;
	updateChairScheduleDraft: (chairId: string, partial: Partial<ChairScheduleDraft> | Partial<Chair>) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	updateChairScheduleDay: (chairId: string, day: number, hours: Partial<ChairDayHours>) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	deleteChair: (chairId: string) => Promise<void> | void;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export interface ClinicChairCardProps {
	chair: Chair;
	rawScheduleDraft: Partial<ChairScheduleDraft> | null | undefined;
	scheduleSaveState: string;
	scheduleDirty: boolean;
	scheduleSaving: boolean;
	scheduleSaveLabel: string;
	specialtyLabels: Record<string, string>;
	typedWeekdayOptions: WeekdayOption[];
	updateChairScheduleDraft: (chairId: string, partial: Partial<ChairScheduleDraft> | Partial<Chair>) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	updateChairScheduleDay: (chairId: string, day: number, hours: Partial<ChairDayHours>) => void;
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	deleteChair: (chairId: string) => Promise<void> | void;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
	onEditChair?: (chair: Chair) => void;
}

export interface ClinicChairEditModalProps {
	isOpen: boolean;
	chair: Chair | null;
	onClose: () => void;
	onSave: (chairId: string, patch: ChairUpdatePatch) => Promise<void> | void;
	specialtyLabels: Record<string, string>;
}
