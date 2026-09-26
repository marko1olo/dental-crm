import type { StaffWorkingHours } from "@dental/shared";
import type { StaffScheduleDraft } from "../../../AppConstants";
import {
	defaultStaffScheduleDraft,
	normalizeWorkingDaysDraft,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";

export interface UseStaffChairScheduleDraftsProps {
	dashboard: any;
	auth: any;
	setError: (msg: string | null) => void;
	clinicProfileDraft: any;
	staffScheduleDraftsRef: React.MutableRefObject<Record<string, StaffScheduleDraft>>;
	chairScheduleDraftsRef: React.MutableRefObject<Record<string, StaffScheduleDraft>>;
	loadDashboard: () => Promise<void>;
	scheduleStore: any;
}

export function useStaffChairScheduleDrafts({
	dashboard,
	auth,
	setError,
	clinicProfileDraft,
	staffScheduleDraftsRef,
	chairScheduleDraftsRef,
	loadDashboard,
	scheduleStore,
}: UseStaffChairScheduleDraftsProps) {
	const {
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
	} = scheduleStore;

	function markStaffScheduleDirty(staffId: string) {
		setStaffScheduleDirtyIds((current: Set<string>) => {
			const next = new Set(current);
			next.add(staffId);
			return next;
		});
		setStaffScheduleSaveStates((current: any) => ({
			...current,
			[staffId]: "idle",
		}));
	}

	function markChairScheduleDirty(chairId: string) {
		setChairScheduleDirtyIds((current: Set<string>) => {
			const next = new Set(current);
			next.add(chairId);
			return next;
		});
		setChairScheduleSaveStates((current: any) => ({
			...current,
			[chairId]: "idle",
		}));
	}

	function updateStaffScheduleDraft(
		staffId: string,
		patch: Partial<StaffScheduleDraft>,
	) {
		setStaffScheduleDrafts((current: any) => {
			const base = current[staffId] ?? defaultStaffScheduleDraft();
			const nextWorkingDays = normalizeWorkingDaysDraft(
				patch.workingDays ?? base.workingDays,
			);
			const nextStart = patch.start ?? base.start;
			const nextEnd = patch.end ?? base.end;
			const perDay = base.perDay.map((day: any) => ({
				...day,
				enabled: nextWorkingDays.includes(day.weekday),
				start:
					patch.start && nextWorkingDays.includes(day.weekday)
						? nextStart
						: day.start,
				end:
					patch.end && nextWorkingDays.includes(day.weekday)
						? nextEnd
						: day.end,
			}));
			return {
				...current,
				[staffId]: {
					...base,
					...patch,
					start: nextStart,
					end: nextEnd,
					workingDays: nextWorkingDays,
					perDay,
				},
			};
		});
		markStaffScheduleDirty(staffId);
	}

	function updateChairScheduleDraft(
		chairId: string,
		patch: Partial<StaffScheduleDraft>,
	) {
		setChairScheduleDrafts((current: any) => {
			const base = current[chairId] ?? defaultStaffScheduleDraft();
			const nextWorkingDays = normalizeWorkingDaysDraft(
				patch.workingDays ?? base.workingDays,
			);
			const nextStart = patch.start ?? base.start;
			const nextEnd = patch.end ?? base.end;
			const perDay = base.perDay.map((day: any) => ({
				...day,
				enabled: nextWorkingDays.includes(day.weekday),
				start:
					patch.start && nextWorkingDays.includes(day.weekday)
						? nextStart
						: day.start,
				end:
					patch.end && nextWorkingDays.includes(day.weekday)
						? nextEnd
						: day.end,
			}));
			return {
				...current,
				[chairId]: {
					...base,
					...patch,
					start: nextStart,
					end: nextEnd,
					workingDays: nextWorkingDays,
					perDay,
				},
			};
		});
		markChairScheduleDirty(chairId);
	}

	function updateStaffScheduleDay(
		staffId: string,
		weekday: number,
		patch: Partial<Pick<StaffWorkingHours[number], "start" | "end">>,
	) {
		setStaffScheduleDrafts((current: any) => {
			const base = current[staffId] ?? defaultStaffScheduleDraft();
			return {
				...current,
				[staffId]: {
					...base,
					perDay: base.perDay.map((day: any) =>
						day.weekday === weekday ? { ...day, ...patch } : day,
					),
				},
			};
		});
		markStaffScheduleDirty(staffId);
	}

	function updateChairScheduleDay(
		chairId: string,
		weekday: number,
		patch: Partial<Pick<StaffWorkingHours[number], "start" | "end">>,
	) {
		setChairScheduleDrafts((current: any) => {
			const base = current[chairId] ?? defaultStaffScheduleDraft();
			return {
				...current,
				[chairId]: {
					...base,
					perDay: base.perDay.map((day: any) =>
						day.weekday === weekday ? { ...day, ...patch } : day,
					),
				},
			};
		});
		markChairScheduleDirty(chairId);
	}

	function buildOnboardingFirstAppointmentIssues(): string[] {
		if (!clinicProfileDraft) return [];
		const issues: string[] = [];
		const requiredClinicDraftFields: Array<[string, string]> = [
			["название клиники", clinicProfileDraft.clinicName],
			["телефон клиники", clinicProfileDraft.phone],
			["часовой пояс", clinicProfileDraft.timezone],
		];
		for (const [label, value] of requiredClinicDraftFields) {
			if (!value.trim()) issues.push(label);
		}
		const activeStaff =
			(dashboard?.clinicSettings?.staff || []).filter(
				(member: any) => member.active,
			) ?? [];
		const activeDoctors = activeStaff.filter(
			(member: any) => member.role === "doctor" || member.role === "owner",
		);
		const activeAssistants = activeStaff.filter(
			(member: any) => member.role === "assistant",
		);
		const activeChairs =
			(dashboard?.clinicSettings?.chairs || []).filter(
				(chair: any) => chair.active,
			) ?? [];
		if (!activeDoctors.length) issues.push("врач для первого приема");
		if (!activeDoctors.some((member: any) => member.canSignMedicalRecords))
			issues.push("врач с правом подписи ЭМК");
		if (!activeChairs.length) issues.push("кресло / кабинет");
		if (
			dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" &&
			!activeAssistants.length
		)
			issues.push("ассистент");
		const activeAppointmentReadiness = dashboard?.activeVisit?.appointmentId
			? dashboard.appointmentReadiness?.find(
					(readiness: any) =>
						readiness.appointmentId === dashboard?.activeVisit?.appointmentId,
				)
			: null;
		const activeAppointmentBlockingChecks =
			(activeAppointmentReadiness?.checks || []).filter(
				(check: any) =>
					(check.key === "team" || check.key === "schedule") && !check.ready,
			) ?? [];
		for (const check of activeAppointmentBlockingChecks) {
			issues.push(`${check.title.toLocaleLowerCase("ru-RU")}: ${check.detail}`);
		}
		return issues;
	}

	async function saveStaffSchedule(staffId: string): Promise<boolean> {
		const draft = staffScheduleDrafts[staffId];
		if (!draft) return false;
		const expectedSignature = staffScheduleDraftSignature(draft);
		setStaffScheduleSavingId(staffId);
		setStaffScheduleSaveStates((current: any) => ({
			...current,
			[staffId]: "saving",
		}));
		try {
			const response = await fetchWithHandling(
				`/api/settings/staff/${staffId}/working-hours`,
				{
					method: "PUT",
					headers: auth.settingsAccessHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						workingHours: staffWorkingHoursFromDraft(draft),
					}),
				},
			);
			if (!response.ok) {
				setStaffScheduleSaveStates((current: any) => ({
					...current,
					[staffId]: "error",
				}));
				setError(
					await responseErrorMessage(
						response,
						"Расписание сотрудника не сохранено",
					),
				);
				return false;
			}
			const latestDraft = staffScheduleDraftsRef.current[staffId];
			const latestMatchesSaved = latestDraft
				? staffScheduleDraftSignature(latestDraft) === expectedSignature
				: true;
			if (latestMatchesSaved) {
				setStaffScheduleDirtyIds((current: Set<string>) => {
					const next = new Set(current);
					next.delete(staffId);
					return next;
				});
			}
			setStaffScheduleSaveStates((current: any) => ({
				...current,
				[staffId]: latestMatchesSaved ? "saved" : "idle",
			}));
			await loadDashboard();
			return true;
		} catch (scheduleSaveError) {
			showToast(
				actionFailureToast(
					"Расписание сотрудника не сохранено",
					(scheduleSaveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setStaffScheduleSaveStates((current: any) => ({
				...current,
				[staffId]: "error",
			}));
			setError(
				operatorWorkflowFailureMessage(
					"Расписание сотрудника не сохранено",
					scheduleSaveError,
				),
			);
			return false;
		} finally {
			setStaffScheduleSavingId(null);
		}
	}

	async function saveChairSchedule(chairId: string): Promise<boolean> {
		const draft = chairScheduleDrafts[chairId];
		if (!draft) return false;
		const expectedSignature = staffScheduleDraftSignature(draft);
		setChairScheduleSavingId(chairId);
		setChairScheduleSaveStates((current: any) => ({
			...current,
			[chairId]: "saving",
		}));
		try {
			const response = await fetchWithHandling(
				`/api/settings/chairs/${chairId}/working-hours`,
				{
					method: "PUT",
					headers: auth.settingsAccessHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						workingHours: staffWorkingHoursFromDraft(draft),
					}),
				},
			);
			if (!response.ok) {
				setChairScheduleSaveStates((current: any) => ({
					...current,
					[chairId]: "error",
				}));
				setError(
					await responseErrorMessage(
						response,
						"Расписание кресла не сохранено",
					),
				);
				return false;
			}
			const latestDraft = chairScheduleDraftsRef.current[chairId];
			const latestMatchesSaved = latestDraft
				? staffScheduleDraftSignature(latestDraft) === expectedSignature
				: true;
			if (latestMatchesSaved) {
				setChairScheduleDirtyIds((current: Set<string>) => {
					const next = new Set(current);
					next.delete(chairId);
					return next;
				});
			}
			setChairScheduleSaveStates((current: any) => ({
				...current,
				[chairId]: latestMatchesSaved ? "saved" : "idle",
			}));
			await loadDashboard();
			return true;
		} catch (scheduleSaveError) {
			showToast(
				actionFailureToast(
					"Расписание кресла не сохранено",
					(scheduleSaveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setChairScheduleSaveStates((current: any) => ({
				...current,
				[chairId]: "error",
			}));
			setError(
				operatorWorkflowFailureMessage(
					"Расписание кресла не сохранено",
					scheduleSaveError,
				),
			);
			return false;
		} finally {
			setChairScheduleSavingId(null);
		}
	}

	async function saveOnboardingSchedulesIfDirty(): Promise<boolean> {
		if (!dashboard) return true;
		const dirtyStaffIds = Array.from(staffScheduleDirtyIds).filter(
			(staffId: string) => staffScheduleSaveStates[staffId] !== "saving",
		);
		const dirtyChairIds = Array.from(chairScheduleDirtyIds).filter(
			(chairId: string) => chairScheduleSaveStates[chairId] !== "saving",
		);
		if (!dirtyStaffIds.length && !dirtyChairIds.length) return true;
		for (const staffId of dirtyStaffIds) {
			if (!(await saveStaffSchedule(staffId))) return false;
		}
		for (const chairId of dirtyChairIds) {
			if (!(await saveChairSchedule(chairId))) return false;
		}
		return true;
	}

	return {
		markStaffScheduleDirty,
		markChairScheduleDirty,
		updateStaffScheduleDraft,
		updateChairScheduleDraft,
		updateStaffScheduleDay,
		updateChairScheduleDay,
		buildOnboardingFirstAppointmentIssues,
		saveStaffSchedule,
		saveChairSchedule,
		saveOnboardingSchedulesIfDirty,
	};
}
