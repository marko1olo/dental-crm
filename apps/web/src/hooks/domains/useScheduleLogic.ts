import type {
	Appointment,
	ScheduleWarning,
	StaffWorkingHours,
} from "@dental/shared";
import {
	type AppointmentScheduleDraft,
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
	type StaffScheduleDraft,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
} from "../../AppHelpers";
import { useScheduleStore } from "../../store/scheduleStore";

export function useScheduleLogic({
	dashboard,
	query,
	setError,
	auth,
	setDashboard,
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
}: any) {
	const scheduleStore = useScheduleStore();
	const {
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleAssistantFilterId,
		setScheduleAssistantFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		staffScheduleSavingId,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		chairScheduleSavingId,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
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

	function openAppointmentEditor(appointment: Appointment) {
		setEditingAppointmentId(appointment.id);
		setAppointmentScheduleDrafts((current: any) => ({
			...current,
			[appointment.id]:
				current[appointment.id] ??
				appointmentScheduleDraftFromAppointment(appointment),
		}));
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

	function newAppointmentPreferenceDefaults() {
		return {
			selectedPatientId,
			selectedSpecialty,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId,
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
		setStaffScheduleSaveStates((current: any) => ({
			...current,
			[staffId]: "saving",
		}));
		try {
			const response = await fetch(
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
				setStaffScheduleDirtyIds((current) => {
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
			const response = await fetch(
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
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: "error",
			}));
			setError(message);
			return false;
		}
		const isOmni = dashboard?.clinicSettings?.profile?.isOmniRole ?? false;
		const missing = appointmentScheduleMissingFields(
			draft,
			isOmni,
			dashboard?.clinicSettings?.staff,
		);
		if (missing.length) {
			const message = `Перед сохранением записи: ${missing.join("; ")}.`;
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: "error",
			}));
			setError(message);
			return false;
		}
		const expectedSignature = appointmentScheduleDraftSignature(draft);
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "saving",
		}));
		setAppointmentScheduleErrors((current) => ({
			...current,
			[appointmentId]: null,
		}));
		try {
			const response = await fetch(`/api/appointments/${appointmentId}`, {
				method: "PATCH",
				headers: auth.scheduleMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(appointmentUpdateInputFromDraft(draft)),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Запись не сохранена"),
				);
			const payload = await response.json();
			const nextDashboard = payload as any;
			setDashboard(nextDashboard);
			const savedAppointment = nextDashboard.appointments?.find(
				(appointment) => appointment.id === appointmentId,
			);
			const latestDraft = appointmentScheduleDraftsRef.current[appointmentId];
			const latestMatchesSaved = latestDraft
				? appointmentScheduleDraftSignature(latestDraft) === expectedSignature
				: true;
			if (savedAppointment && latestMatchesSaved) {
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
			setAppointmentScheduleSaveStates((current: any) => ({
				...current,
				[appointmentId]: latestMatchesSaved ? "saved" : "idle",
			}));
			if (latestMatchesSaved && options.closeEditorOnSave !== false)
				setEditingAppointmentId(null);
			setError(null);
			return true;
		} catch (saveError) {
			const message = operatorWorkflowFailureMessage(
				"Запись не сохранена",
				saveError,
			);
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
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
		const isOmni = dashboard?.clinicSettings?.profile?.isOmniRole ?? false;
		return appointmentScheduleMissingFields(
			draft,
			isOmni,
			dashboard?.clinicSettings?.staff,
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
			const response = await fetch("/api/appointments", {
				method: "POST",
				headers: auth.scheduleMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(
					appointmentCreateInputFromDraft(newAppointmentDraft),
				),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Запись не создана"),
				);
			const payload = await response.json();
			const nextDashboard = payload as any;
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
