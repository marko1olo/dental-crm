import type {
	Appointment,
	Dashboard,
	ScheduleWarning,
	StaffWorkingHours,
} from "@dental/shared";
import { useRef } from "react";
import type {
	AppointmentScheduleDraft,
	StaffScheduleDraft,
} from "../../AppConstants";
import {
	appointmentCreateInputFromDraft,
	appointmentScheduleDraftFromAppointment,
	appointmentScheduleDraftSignature,
	appointmentScheduleMissingFields,
	appointmentUpdateInputFromDraft,
	defaultStaffScheduleDraft,
	newAppointmentDraftFromDashboard,
	normalizeWorkingDaysDraft,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useScheduleStore } from "../../store/scheduleStore";
import { useSettingsStore } from "../../store/settingsStore";
import { fetchWithHandling } from "../../utils/networkUtils";
import { useWorkspaceProfileStore } from "../useWorkspaceProfile";

/**
 * Сервер отказал в изменении расписания и требует секрет администратора.
 *
 * Маршруты расписания отвечают `ScheduleAdminSecretRequired`, когда секрет
 * задан в окружении и не совпал, и `ScheduleAdminSecretMissing`, когда секрет
 * на сервере не задан вовсе, а незащищённые изменения запрещены. Только в этих
 * двух случаях у пользователя имеет смысл спрашивать секрет.
 */
export async function scheduleAdminSecretRefusal(
	response: Response,
): Promise<string | null> {
	if (response.status !== 403 && response.status !== 503) return null;
	try {
		const payload = (await response.clone().json()) as {
			error?: unknown;
			message?: unknown;
		};
		const code = typeof payload.error === "string" ? payload.error : "";
		if (
			code !== "ScheduleAdminSecretRequired" &&
			code !== "ScheduleAdminSecretMissing"
		)
			return null;
		return code;
	} catch {
		return null;
	}
}

export function useScheduleLogic({
	dashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	query,
	setError,
	auth,
	setDashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	setQuery,
	selectedPatientId,
	setEditingAppointmentId,
	newAppointmentDraftUserEditedRef,
	setSelectedPatientId,
	setNewAppointmentError,
	clinicProfileDraft,
	setSettingsTab,
	staffScheduleDraftsRef,
	chairScheduleDraftsRef,
	appointmentScheduleDraftsRef,
	loadDashboard,
	selectedSpecialty,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
}: any) {
	const appointmentMutationIdRef = useRef<string | null>(null);
	const scheduleStore = useScheduleStore();
	const { setScheduleAdminSecretDemand } = useSettingsStore();
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleDoctorFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleDoctorFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleAssistantFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleAssistantFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleChairFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleStatusFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleDateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleDateFilter,
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSavingId,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSavingId,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentScheduleDirtyIds,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentScheduleErrors,
		setAppointmentScheduleErrors,
		newAppointmentDraft,
		setNewAppointmentDraft,
		newAppointmentSaveState,
		setNewAppointmentSaveState,
	} = scheduleStore;

	function markStaffScheduleDirty(staffId: string) {
		setStaffScheduleDirtyIds((current) => {
			const next = new Set(current);
			next.add(staffId);
			return next;
		});
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setStaffScheduleSaveStates((current: any) => ({
			...current,
			[staffId]: "idle",
		}));
	}

	function markChairScheduleDirty(chairId: string) {
		setChairScheduleDirtyIds((current) => {
			const next = new Set(current);
			next.add(chairId);
			return next;
		});
		setChairScheduleSaveStates((current) => ({
			...current,
			[chairId]: "idle",
		}));
	}

	function updateStaffScheduleDraft(
		staffId: string,
		patch: Partial<StaffScheduleDraft>,
	) {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setStaffScheduleDrafts((current: any) => {
			const base = current[staffId] ?? defaultStaffScheduleDraft();
			const nextWorkingDays = normalizeWorkingDaysDraft(
				patch.workingDays ?? base.workingDays,
			);
			const nextStart = patch.start ?? base.start;
			const nextEnd = patch.end ?? base.end;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setChairScheduleDrafts((current: any) => {
			const base = current[chairId] ?? defaultStaffScheduleDraft();
			const nextWorkingDays = normalizeWorkingDaysDraft(
				patch.workingDays ?? base.workingDays,
			);
			const nextStart = patch.start ?? base.start;
			const nextEnd = patch.end ?? base.end;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setStaffScheduleDrafts((current: any) => {
			const base = current[staffId] ?? defaultStaffScheduleDraft();
			return {
				...current,
				[staffId]: {
					...base,
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setChairScheduleDrafts((current: any) => {
			const base = current[chairId] ?? defaultStaffScheduleDraft();
			return {
				...current,
				[chairId]: {
					...base,
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					perDay: base.perDay.map((day: any) =>
						day.weekday === weekday ? { ...day, ...patch } : day,
					),
				},
			};
		});
		markChairScheduleDirty(chairId);
	}

	function openAppointmentEditor(appointment: Appointment) {
		setEditingAppointmentId(appointment.id);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleDrafts((current: any) => ({
			...current,
			[appointment.id]:
				current[appointment.id] ??
				appointmentScheduleDraftFromAppointment(appointment),
		}));
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointment.id]: "idle",
		}));
		setAppointmentScheduleErrors((current) => ({
			...current,
			[appointment.id]: null,
		}));
	}

	function markAppointmentScheduleDirty(appointmentId: string) {
		setAppointmentScheduleDirtyIds((current) => {
			const next = new Set(current);
			next.add(appointmentId);
			return next;
		});
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "idle",
		}));
		setAppointmentScheduleErrors((current) => ({
			...current,
			[appointmentId]: null,
		}));
	}

	function updateAppointmentScheduleDraft<
		K extends keyof AppointmentScheduleDraft,
	>(appointmentId: string, key: K, value: AppointmentScheduleDraft[K]) {
		const sourceAppointment = dashboard?.appointments?.find(
			(appointment) => appointment.id === appointmentId,
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleDrafts((current: any) => ({
			...current,
			[appointmentId]: {
				...(current[appointmentId] ??
					(sourceAppointment
						? appointmentScheduleDraftFromAppointment(sourceAppointment)
						: {})),
				[key]: value,
			} as AppointmentScheduleDraft,
		}));
		markAppointmentScheduleDirty(appointmentId);
	}

	const workspaceProfile = useWorkspaceProfileStore();

	function newAppointmentPreferenceDefaults() {
		let defaultChairId = scheduleDefaultChairId;
		if (
			!workspaceProfile.hasMultipleChairs &&
			dashboard?.clinicSettings?.chairs
		) {
			const activeChairs = dashboard.clinicSettings.chairs.filter(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(c: any) => c.active,
			);
			if (activeChairs.length > 0) {
				defaultChairId = activeChairs[0].id;
			}
		}
		return {
			selectedPatientId,
			selectedSpecialty,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId: defaultChairId,
		};
	}

	function updateNewAppointmentDraft<K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) {
		newAppointmentDraftUserEditedRef.current = true;
		setNewAppointmentDraft((current) => ({ ...current, [key]: value }));
		if (key === "patientId" && typeof value === "string")
			setSelectedPatientId(value || null);
		if (key === "doctorUserId" && typeof value === "string")
			setScheduleDefaultDoctorUserId(value || null);
		if (key === "assistantUserId" && typeof value === "string")
			setScheduleDefaultAssistantUserId(value || null);
		if (key === "chairId" && typeof value === "string")
			setScheduleDefaultChairId(value || null);
		setNewAppointmentSaveState("idle");
		setNewAppointmentError(null);
	}

	function resetNewAppointmentDraft() {
		if (!dashboard) return;
		newAppointmentDraftUserEditedRef.current = false;
		setNewAppointmentDraft(
			newAppointmentDraftFromDashboard(
				dashboard,
				newAppointmentPreferenceDefaults(),
			),
		);
		setNewAppointmentSaveState("idle");
		setNewAppointmentError(null);
	}

	function closeAppointmentEditor(appointmentId: string) {
		setEditingAppointmentId((current) =>
			current === appointmentId ? null : current,
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "idle",
		}));
		setAppointmentScheduleErrors((current) => ({
			...current,
			[appointmentId]: null,
		}));
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
				(member) => member.active,
			) ?? [];
		const activeDoctors = activeStaff.filter(
			(member) => member.role === "doctor" || member.role === "owner",
		);
		const activeAssistants = activeStaff.filter(
			(member) => member.role === "assistant",
		);
		const activeChairs =
			(dashboard?.clinicSettings?.chairs || []).filter(
				(chair) => chair.active,
			) ?? [];
		if (!activeDoctors.length) issues.push("врач для первого приема");
		if (!activeDoctors.some((member) => member.canSignMedicalRecords))
			issues.push("врач с правом подписи ЭМК");
		if (!activeChairs.length) issues.push("кресло / кабинет");
		if (
			dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" &&
			!activeAssistants.length
		)
			issues.push("ассистент");
		const activeAppointmentReadiness = dashboard?.activeVisit?.appointmentId
			? dashboard.appointmentReadiness?.find(
					(readiness) =>
						readiness.appointmentId === dashboard?.activeVisit?.appointmentId,
				)
			: null;
		const activeAppointmentBlockingChecks =
			(activeAppointmentReadiness?.checks || []).filter(
				(check) =>
					(check.key === "team" || check.key === "schedule") && !check.ready,
			) ?? [];
		for (const check of activeAppointmentBlockingChecks) {
			issues.push(`${check.title.toLocaleLowerCase("ru-RU")}: ${check.detail}`);
		}
		return issues;
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

	function openScheduleWarning(warning: ScheduleWarning) {
		if (warning.actionLabel.toLowerCase().includes("связ")) {
			window.location.hash = "communications";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("оплат")) {
			window.location.hash = "finance";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("документ")) {
			window.location.hash = "documents";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("роль")) {
			window.location.hash = "settings";
			setSettingsTab("clinic");
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("пациент")) {
			window.location.hash = "patients";
			return;
		}
		window.location.hash = "visit";
	}

	async function saveStaffSchedule(staffId: string): Promise<boolean> {
		const draft = staffScheduleDrafts[staffId];
		if (!draft) return false;
		const expectedSignature = staffScheduleDraftSignature(draft);
		setStaffScheduleSavingId(staffId);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
				setStaffScheduleDirtyIds((current) => {
					const next = new Set(current);
					next.delete(staffId);
					return next;
				});
			}
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		setChairScheduleSaveStates((current) => ({
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
				setChairScheduleSaveStates((current) => ({
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
				setChairScheduleDirtyIds((current) => {
					const next = new Set(current);
					next.delete(chairId);
					return next;
				});
			}
			setChairScheduleSaveStates((current) => ({
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
			setChairScheduleSaveStates((current) => ({
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

	async function saveAppointmentSchedule(
		appointmentId: string,
		options: { closeEditorOnSave?: boolean } = {},
	): Promise<boolean> {
		if (appointmentScheduleSaveStates[appointmentId] === "saving") {
			setError("Дождитесь завершения текущего сохранения записи.");
			return false;
		}
		const draft = appointmentScheduleDrafts[appointmentId];
		if (!draft) {
			const message = "Откройте запись в расписании перед сохранением.";
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: "error",
			}));
			setError(message);
			return false;
		}
		// БЫЛО: сюда передавался булев isOmniRole, а функция ждёт РЕЖИМ клиники
		// ("solo_doctor" и т.п.). И false, и true не равны "solo_doctor", поэтому
		// требование выбрать ассистента срабатывало всегда. В режиме solo_doctor
		// поле ассистента при этом принудительно очищается — условие становилось
		// невыполнимым, и такая клиника не могла сохранить НИ ОДНУ запись:
		// кнопка «Сохранить» активна, а сохранение молча возвращает ошибку.
		const missing = appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode,
			dashboard?.clinicSettings?.staff,
			{
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
			},
		);
		if (missing.length) {
			const message = `Перед сохранением записи: ${missing.join("; ")}.`;
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: "error",
			}));
			setError(message);
			return false;
		}
		const expectedSignature = appointmentScheduleDraftSignature(draft);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "saving",
		}));
		setAppointmentScheduleErrors((current) => ({
			...current,
			[appointmentId]: null,
		}));
		try {
			if (!appointmentMutationIdRef.current) {
				appointmentMutationIdRef.current =
					typeof crypto !== "undefined" && "randomUUID" in crypto
						? crypto.randomUUID()
						: `appointment-${Date.now()}`;
			}
			const mutationId = appointmentMutationIdRef.current;
			const response = await fetchWithHandling(
				`/api/appointments/${appointmentId}`,
				{
					method: "PATCH",
					headers: auth.scheduleMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...appointmentUpdateInputFromDraft(draft),
						clientMutationId: mutationId,
					}),
				},
			);
			if (!response.ok) {
				setScheduleAdminSecretDemand(
					(await scheduleAdminSecretRefusal(response)) ?? "",
				);
				throw new Error(
					await responseErrorMessage(response, "Запись не сохранена"),
				);
			}
			appointmentMutationIdRef.current = null;
			setScheduleAdminSecretDemand("");
			const payload = await response.json();
			const nextDashboard = payload as Dashboard;
			setDashboard(nextDashboard);
			const savedAppointment = nextDashboard.appointments?.find(
				(appointment) => appointment.id === appointmentId,
			);
			const latestDraft = appointmentScheduleDraftsRef.current[appointmentId];
			const latestMatchesSaved = latestDraft
				? appointmentScheduleDraftSignature(latestDraft) === expectedSignature
				: true;
			if (savedAppointment && latestMatchesSaved) {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				setAppointmentScheduleDrafts((current: any) => ({
					...current,
					[appointmentId]:
						appointmentScheduleDraftFromAppointment(savedAppointment),
				}));
			}
			if (latestMatchesSaved) {
				setAppointmentScheduleDirtyIds((current) => {
					const next = new Set(current);
					next.delete(appointmentId);
					return next;
				});
			}
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: latestMatchesSaved ? "saved" : "idle",
			}));
			if (latestMatchesSaved && options.closeEditorOnSave !== false)
				setEditingAppointmentId(null);
			setError(null);
			return true;
		} catch (saveError) {
			showToast(
				actionFailureToast(
					"Запись не сохранена",
					(saveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			const message = operatorWorkflowFailureMessage(
				"Запись не сохранена",
				saveError,
			);
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: "error",
			}));
			setError(message);
			return false;
		}
	}

	function newAppointmentMissingFields(
		draft: AppointmentScheduleDraft,
	): string[] {
		// См. комментарий выше: нужен режим клиники, а не флаг isOmniRole.
		return appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode,
			dashboard?.clinicSettings?.staff,
			{
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
			},
		);
	}

	async function createAppointmentFromDraft(): Promise<boolean> {
		if (!dashboard) {
			setError(
				"Данные клиники еще не загружены. Повторите создание записи после загрузки рабочего экрана.",
			);
			return false;
		}
		if (newAppointmentSaveState === "saving") {
			setError("Дождитесь завершения текущего создания записи.");
			return false;
		}
		const missing = newAppointmentMissingFields(newAppointmentDraft);
		if (missing.length) {
			const message = `Перед созданием записи: ${missing.join("; ")}.`;
			setNewAppointmentError(message);
			setNewAppointmentSaveState("error");
			setError(message);
			return false;
		}
		setNewAppointmentSaveState("saving");
		setNewAppointmentError(null);
		const previousIds = new Set(
			(dashboard?.appointments ?? []).map((appointment) => appointment.id),
		);
		try {
			if (!appointmentMutationIdRef.current) {
				appointmentMutationIdRef.current =
					typeof crypto !== "undefined" && "randomUUID" in crypto
						? crypto.randomUUID()
						: `appointment-${Date.now()}`;
			}
			const mutationId = appointmentMutationIdRef.current;
			const response = await fetchWithHandling("/api/appointments", {
				method: "POST",
				headers: auth.scheduleMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					...appointmentCreateInputFromDraft(newAppointmentDraft),
					clientMutationId: mutationId,
				}),
			});
			if (!response.ok) {
				setScheduleAdminSecretDemand(
					(await scheduleAdminSecretRefusal(response)) ?? "",
				);
				throw new Error(
					await responseErrorMessage(response, "Запись не создана"),
				);
			}
			appointmentMutationIdRef.current = null;
			setScheduleAdminSecretDemand("");
			const payload = await response.json();
			const nextDashboard = payload as Dashboard;
			const createdAppointment =
				nextDashboard.appointments?.find(
					(appointment) => !previousIds.has(appointment.id),
				) ?? null;
			const nextDraftPreferences = {
				selectedPatientId: newAppointmentDraft.patientId || selectedPatientId,
				selectedSpecialty,
				scheduleDefaultDoctorUserId: newAppointmentDraft.doctorUserId || null,
				scheduleDefaultAssistantUserId:
					newAppointmentDraft.assistantUserId || null,
				scheduleDefaultChairId: newAppointmentDraft.chairId || null,
			};
			setSelectedPatientId(nextDraftPreferences.selectedPatientId ?? null);
			setScheduleDefaultDoctorUserId(
				nextDraftPreferences.scheduleDefaultDoctorUserId,
			);
			setScheduleDefaultAssistantUserId(
				nextDraftPreferences.scheduleDefaultAssistantUserId,
			);
			setScheduleDefaultChairId(nextDraftPreferences.scheduleDefaultChairId);
			setDashboard(nextDashboard);
			newAppointmentDraftUserEditedRef.current = false;
			setNewAppointmentDraft(
				newAppointmentDraftFromDashboard(nextDashboard, nextDraftPreferences),
			);
			setNewAppointmentSaveState("saved");
			if (createdAppointment) {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				setAppointmentScheduleDrafts((current: any) => ({
					...current,
					[createdAppointment.id]:
						appointmentScheduleDraftFromAppointment(createdAppointment),
				}));
				setEditingAppointmentId(createdAppointment.id);
			}
			setError(null);
			return true;
		} catch (createError) {
			showToast(
				actionFailureToast(
					"Запись не создана",
					(createError as { status?: number })?.status ?? null,
				),
				"error",
			);
			const message = operatorWorkflowFailureMessage(
				"Запись не создана",
				createError,
			);
			setNewAppointmentError(message);
			setNewAppointmentSaveState("error");
			setError(message);
			return false;
		}
	}

	return {
		...scheduleStore,
		markStaffScheduleDirty,
		markChairScheduleDirty,
		updateStaffScheduleDraft,
		updateChairScheduleDraft,
		updateStaffScheduleDay,
		updateChairScheduleDay,
		openAppointmentEditor,
		markAppointmentScheduleDirty,
		updateAppointmentScheduleDraft,
		newAppointmentPreferenceDefaults,
		updateNewAppointmentDraft,
		resetNewAppointmentDraft,
		closeAppointmentEditor,
		buildOnboardingFirstAppointmentIssues,
		saveOnboardingSchedulesIfDirty,
		openScheduleWarning,
		saveStaffSchedule,
		saveChairSchedule,
		saveAppointmentSchedule,
		newAppointmentMissingFields,
		createAppointmentFromDraft,
	};
}
