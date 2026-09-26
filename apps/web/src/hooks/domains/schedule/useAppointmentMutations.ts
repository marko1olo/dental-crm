import type { Dashboard } from "@dental/shared";
import { useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import {
	appointmentCreateInputFromDraft,
	appointmentScheduleDraftFromAppointment,
	appointmentScheduleDraftSignature,
	appointmentScheduleMissingFields,
	appointmentUpdateInputFromDraft,
	newAppointmentDraftFromDashboard,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { DEFAULT_SOLO_CHAIR } from "../../../components/schedule/ScheduleGrid";
import { useSettingsStore } from "../../../store/settingsStore";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { scheduleAdminSecretRefusal } from "./scheduleAdminSecretRefusal";

export interface UseAppointmentMutationsProps {
	dashboard: any;
	setError: (msg: string | null) => void;
	auth: any;
	setDashboard: (d: any) => void;
	selectedPatientId: string | null;
	selectedSpecialty: string | null;
	setEditingAppointmentId: React.Dispatch<React.SetStateAction<string | null>>;
	setSelectedPatientId: (id: string | null) => void;
	setNewAppointmentError: (msg: string | null) => void;
	appointmentScheduleDraftsRef: React.MutableRefObject<Record<string, AppointmentScheduleDraft>>;
	newAppointmentDraftUserEditedRef: React.MutableRefObject<boolean>;
	scheduleStore: any;
}

export function useAppointmentMutations({
	dashboard,
	setError,
	auth,
	setDashboard,
	selectedPatientId,
	selectedSpecialty,
	setEditingAppointmentId,
	setSelectedPatientId,
	setNewAppointmentError,
	appointmentScheduleDraftsRef,
	newAppointmentDraftUserEditedRef,
	scheduleStore,
}: UseAppointmentMutationsProps) {
	const appointmentMutationIdRef = useRef<string | null>(null);
	const [slotConflict, setSlotConflict] = useState<{
		message: string;
		suggestedSlots: string[];
		appointmentId?: string;
	} | null>(null);

	const { setScheduleAdminSecretDemand } = useSettingsStore();

	const {
		setScheduleDefaultDoctorUserId,
		setScheduleDefaultAssistantUserId,
		setScheduleDefaultChairId,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
		setAppointmentScheduleErrors,
		newAppointmentDraft,
		setNewAppointmentDraft,
		newAppointmentSaveState,
		setNewAppointmentSaveState,
	} = scheduleStore;

	function newAppointmentMissingFields(
		draft: AppointmentScheduleDraft,
	): string[] {
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

	async function saveAppointmentSchedule(
		appointmentId: string,
		options: {
			closeEditorOnSave?: boolean;
			allowOverbooking?: boolean;
			allowEmergencyOverride?: boolean;
		} = {},
	): Promise<boolean> {
		if (appointmentScheduleSaveStates[appointmentId] === "saving") {
			setError("Дождитесь завершения текущего сохранения записи.");
			return false;
		}
		const draft = appointmentScheduleDrafts[appointmentId];
		if (!draft) {
			const message = "Откройте запись в расписании перед сохранением.";
			setAppointmentScheduleErrors((current: any) => ({
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

		// Авто-подстановка кресла и врача при их отсутствии перед валидацией (Мандат 8e / 8n)
		if (!draft.chairId && dashboard?.clinicSettings?.chairs) {
			const activeChairs = dashboard.clinicSettings.chairs.filter(
				(c: any) => c.active,
			);
			if (activeChairs.length > 0 && activeChairs[0]) {
				draft.chairId = activeChairs[0].id;
			}
		}
		if (!draft.doctorUserId && dashboard?.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m: any) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length > 0 && activeDocs[0]) {
				draft.doctorUserId = activeDocs[0].id;
			}
		}

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
			setAppointmentScheduleErrors((current: any) => ({
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
		setAppointmentScheduleErrors((current: any) => ({
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
						...(options.allowOverbooking !== undefined
							? { allowOverbooking: options.allowOverbooking }
							: {}),
						...(options.allowEmergencyOverride !== undefined
							? { allowEmergencyOverride: options.allowEmergencyOverride }
							: {}),
					}),
				},
			);
			if (!response.ok) {
				setScheduleAdminSecretDemand(
					(await scheduleAdminSecretRefusal(response)) ?? "",
				);
				if (response.status === 409) {
					const errPayload = (await response
						.clone()
						.json()
						.catch(() => null)) as {
						message?: string;
						suggestedSlots?: string[];
					} | null;
					if (Array.isArray(errPayload?.suggestedSlots)) {
						setSlotConflict({
							message: errPayload.message || "Слот уже занят",
							suggestedSlots: errPayload.suggestedSlots,
							appointmentId,
						});
					}
				}
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
				setAppointmentScheduleDrafts((current: any) => ({
					...current,
					[appointmentId]:
						appointmentScheduleDraftFromAppointment(savedAppointment),
				}));
			}
			if (latestMatchesSaved) {
				setAppointmentScheduleDirtyIds((current: Set<string>) => {
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
			showToast(message, "error");
			setAppointmentScheduleErrors((current: any) => ({
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

	async function createAppointmentFromDraft(
		options: {
			allowOverbooking?: boolean;
			allowEmergencyOverride?: boolean;
		} = {},
	): Promise<boolean> {
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
		if (!newAppointmentDraft.chairId) {
			const activeChairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
				(c: any) => c.active,
			);
			newAppointmentDraft.chairId = activeChairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
		}
		if (!newAppointmentDraft.doctorUserId && dashboard?.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m: any) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length > 0 && activeDocs[0]) {
				newAppointmentDraft.doctorUserId = activeDocs[0].id;
			}
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
			(dashboard?.appointments ?? []).map((appointment: any) => appointment.id),
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
					...(options.allowOverbooking !== undefined
						? { allowOverbooking: options.allowOverbooking }
						: {}),
					...(options.allowEmergencyOverride !== undefined
						? { allowEmergencyOverride: options.allowEmergencyOverride }
						: {}),
				}),
			});
			if (!response.ok) {
				setScheduleAdminSecretDemand(
					(await scheduleAdminSecretRefusal(response)) ?? "",
				);
				if (response.status === 409) {
					const errPayload = (await response
						.clone()
						.json()
						.catch(() => null)) as {
						message?: string;
						suggestedSlots?: string[];
					} | null;
					if (Array.isArray(errPayload?.suggestedSlots)) {
						setSlotConflict({
							message: errPayload.message || "Слот уже занят",
							suggestedSlots: errPayload.suggestedSlots,
						});
					}
				}
				throw new Error(
					await responseErrorMessage(response, "Запись не создана"),
				);
			}
			appointmentMutationIdRef.current = null;
			setScheduleAdminSecretDemand("");
			const payload = await response.json();
			const nextDashboard = payload as Dashboard;
			if (
				nextDashboard &&
				typeof nextDashboard === "object" &&
				!Array.isArray(nextDashboard.appointments)
			) {
				nextDashboard.appointments = [];
			}
			const createdAppointment =
				nextDashboard.appointments?.find(
					(appointment) => !previousIds.has(appointment.id),
				) ?? null;
			const nextDraftPreferences = {
				selectedPatientId: newAppointmentDraft.patientId || selectedPatientId,
				selectedSpecialty: (selectedSpecialty as any) || undefined,
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
			showToast(message, "error");
			setNewAppointmentError(message);
			setNewAppointmentSaveState("error");
			setError(message);
			return false;
		}
	}

	const applySuggestedSlot = (slotTime: string, appointmentId?: string) => {
		const [hh, mm] = slotTime.split(":").map(Number);
		if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) {
			setSlotConflict(null);
			return;
		}

		if (appointmentId) {
			const draft = appointmentScheduleDraftsRef.current[appointmentId];
			if (draft?.startsAt) {
				const origStart = Date.parse(draft.startsAt);
				const origEnd = draft.endsAt ? Date.parse(draft.endsAt) : origStart + 30 * 60_000;
				const durationMs = origEnd > origStart ? origEnd - origStart : 30 * 60_000;

				const d = new Date(origStart);
				if (draft.startsAt.endsWith("Z")) {
					d.setUTCHours(hh, mm, 0, 0);
				} else {
					d.setHours(hh, mm, 0, 0);
				}
				const newStartIso = d.toISOString();
				const newEndIso = new Date(d.getTime() + durationMs).toISOString();

				const sourceAppointment = dashboard?.appointments?.find(
					(appointment: any) => appointment.id === appointmentId,
				);
				setAppointmentScheduleDrafts((current: any) => ({
					...current,
					[appointmentId]: {
						...(current[appointmentId] ??
							(sourceAppointment
								? appointmentScheduleDraftFromAppointment(sourceAppointment)
								: {})),
						startsAt: newStartIso,
						endsAt: newEndIso,
					},
				}));
				setAppointmentScheduleDirtyIds((current: Set<string>) => {
					const next = new Set(current);
					next.add(appointmentId);
					return next;
				});

				showToast(
					`Время записи изменено на ${slotTime}. Нажмите «Сохранить» для применения.`,
					"success",
				);
			}
		} else if (newAppointmentDraft?.startsAt) {
			const origStart = Date.parse(newAppointmentDraft.startsAt);
			const origEnd = newAppointmentDraft.endsAt
				? Date.parse(newAppointmentDraft.endsAt)
				: origStart + 30 * 60_000;
			const durationMs = origEnd > origStart ? origEnd - origStart : 30 * 60_000;

			const d = new Date(origStart);
			if (newAppointmentDraft.startsAt.endsWith("Z")) {
				d.setUTCHours(hh, mm, 0, 0);
			} else {
				d.setHours(hh, mm, 0, 0);
			}
			const newStartIso = d.toISOString();
			const newEndIso = new Date(d.getTime() + durationMs).toISOString();

			newAppointmentDraftUserEditedRef.current = true;
			setNewAppointmentDraft((current: any) => ({
				...current,
				startsAt: newStartIso,
				endsAt: newEndIso,
			}));
			showToast(
				`Время записи изменено на ${slotTime}. Нажмите «Создать запись» для сохранения.`,
				"success",
			);
		}
		setSlotConflict(null);
	};

	return {
		slotConflict,
		setSlotConflict,
		applySuggestedSlot,
		saveAppointmentSchedule,
		createAppointmentFromDraft,
		newAppointmentMissingFields,
	};
}
