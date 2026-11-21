import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
	dentalSpecialtySchema,
} from "@dental/shared";
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
import {
	enqueueOfflineAppointment,
	generateOfflineAppointmentId,
	type OfflineAppointmentItem,
} from "../../../offline/offlineAppointmentQueue";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import { type ScheduleStore, useScheduleStore } from "../../../store/scheduleStore";
import { useSettingsStore } from "../../../store/settingsStore";
import { emptyAppointmentScheduleDraft } from "../../../utils/draftDefaults";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../../../utils/dateTimeUtils";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { scheduleAdminSecretRefusal } from "./scheduleAdminSecretRefusal";

function isNetworkFailure(error: unknown, status?: number): boolean {
	if (typeof navigator !== "undefined" && !navigator.onLine) return true;
	if (status && [502, 503, 504].includes(status)) return true;
	if (error instanceof TypeError) return true;
	const msg = String(error).toLowerCase();
	return (
		msg.includes("failed to fetch") ||
		msg.includes("network") ||
		msg.includes("offline") ||
		msg.includes("econnrefused") ||
		msg.includes("timeout") ||
		msg.includes("abort")
	);
}

function toOfflineAppointmentStatus(
	status: string | undefined,
): OfflineAppointmentItem["status"] {
	switch (status) {
		case "confirmed":
			return "confirmed";
		case "arrived":
			return "arrived";
		case "in_treatment":
			return "in_treatment";
		case "completed":
			return "completed";
		case "cancelled":
			return "cancelled";
		case "no_show":
			return "no_show";
		case "planned":
		case "scheduled":
		default:
			return "planned";
	}
}

export interface UseAppointmentMutationsProps {
	dashboard: Dashboard | null;
	setError: (msg: string | null) => void;
	auth: {
		user?: { id?: string; role?: string } | null;
		scheduleMutationHeaders: (
			extra?: Record<string, string>,
			adminSecretOverride?: string,
		) => Record<string, string>;
	};
	setDashboard: (d: Dashboard | null) => void;
	selectedPatientId: string | null;
	selectedSpecialty: DentalSpecialty | string | null;
	setEditingAppointmentId: React.Dispatch<React.SetStateAction<string | null>>;
	setSelectedPatientId: (id: string | null) => void;
	setNewAppointmentError: (msg: string | null) => void;
	appointmentScheduleDraftsRef: React.MutableRefObject<Record<string, AppointmentScheduleDraft>>;
	newAppointmentDraftRef?: { current: AppointmentScheduleDraft };
	newAppointmentDraftUserEditedRef: React.MutableRefObject<boolean>;
	scheduleStore: ScheduleStore;
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
	newAppointmentDraftRef,
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
				chairs: dashboard?.clinicSettings?.chairs ?? null,
				patients: dashboard?.patients ?? null,
			},
		);
	}

	function fillDefaultResources(draft: AppointmentScheduleDraft) {
		if (!draft.chairId) {
			const activeChairs = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
			draft.chairId = activeChairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
		}
		if (!draft.doctorUserId) {
			const activeDocs = (dashboard?.clinicSettings?.staff ?? []).filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			draft.doctorUserId = activeDocs[0]?.id || auth?.user?.id || "";
		}
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
		const sourceAppointment = dashboard?.appointments?.find((a) => a.id === appointmentId);
		const rawDraft =
			appointmentScheduleDraftsRef?.current?.[appointmentId] ??
			useScheduleStore.getState().appointmentScheduleDrafts?.[appointmentId] ??
			appointmentScheduleDrafts?.[appointmentId] ??
			(sourceAppointment ? appointmentScheduleDraftFromAppointment(sourceAppointment) : undefined);
		if (!rawDraft) {
			const message = "Откройте запись в расписании перед сохранением.";
			setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
			setAppointmentScheduleSaveStates((current) => ({ ...current, [appointmentId]: "error" }));
			setError(message);
			return false;
		}
		const draft: AppointmentScheduleDraft = { ...rawDraft };
		fillDefaultResources(draft);
		if (!draft.patientId && sourceAppointment?.patientId) {
			draft.patientId = sourceAppointment.patientId;
		}

		const missing = appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode,
			dashboard?.clinicSettings?.staff,
			{
				chairs: dashboard?.clinicSettings?.chairs ?? null,
				patients: dashboard?.patients ?? null,
			},
		).filter((m) => {
			// Mandate 8e: не блокируем сохранение при автодефолтах и Drag & Drop переносе слота
			if (m.includes("врач") && draft.doctorUserId) return false;
			if (m.includes("кресл") && draft.chairId) return false;
			// Mandate 8e / Drag & Drop: в БД patient_id nullable, перемещение слота не требует пациента
			if (m.includes("пациент")) return false;
			return true;
		});
		if (missing.length) {
			const message = `Перед сохранением записи: ${missing.join("; ")}.`;
			setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: message }));
			setAppointmentScheduleSaveStates((current) => ({ ...current, [appointmentId]: "error" }));
			setError(message);
			return false;
		}
		const expectedSignature = appointmentScheduleDraftSignature(draft);
		setAppointmentScheduleSaveStates((current) => ({ ...current, [appointmentId]: "saving" }));
		setAppointmentScheduleErrors((current) => ({ ...current, [appointmentId]: null }));
		try {
			if (!appointmentMutationIdRef.current) {
				appointmentMutationIdRef.current =
					typeof crypto !== "undefined" && "randomUUID" in crypto
						? crypto.randomUUID()
						: `appointment-${Date.now()}`;
			}
			const mutationId = appointmentMutationIdRef.current;
			const response = await fetchWithHandling(`/api/appointments/${appointmentId}`, {
				method: "PATCH",
				headers: auth.scheduleMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": mutationId,
				}),
				body: JSON.stringify({
					...appointmentUpdateInputFromDraft(draft),
					clientMutationId: mutationId,
					...(options.allowOverbooking !== undefined ? { allowOverbooking: options.allowOverbooking } : {}),
					...(options.allowEmergencyOverride !== undefined
						? { allowEmergencyOverride: options.allowEmergencyOverride }
						: {}),
				}),
			});
			if (!response.ok) {
				setScheduleAdminSecretDemand((await scheduleAdminSecretRefusal(response)) ?? "");
				if (response.status === 409) {
					const errPayload = (await response.clone().json().catch(() => null)) as {
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
				throw new Error(await responseErrorMessage(response, "Запись не сохранена"));
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
				const nextDraft = appointmentScheduleDraftFromAppointment(savedAppointment);
				setAppointmentScheduleDrafts((current: Record<string, AppointmentScheduleDraft>): Record<string, AppointmentScheduleDraft> => ({
					...current,
					[appointmentId]: nextDraft,
				}));
			}
			if (savedAppointment) {
				const isTimeChanged = latestDraft?.startsAt && latestDraft.startsAt !== savedAppointment.startsAt;
				if (isTimeChanged) {
					StaffActionAuditService.logAppointmentReschedule({
						appointmentId,
						patientId: savedAppointment.patientId ?? "",
						oldTime: latestDraft?.startsAt,
						newTime: savedAppointment.startsAt,
						reason: savedAppointment.reason,
						actorUserId: auth?.user?.id,
						actorRole: auth?.user?.role,
					});
				}
			}
			if (latestMatchesSaved) {
				setAppointmentScheduleDirtyIds((current: Set<string>) => {
					const next = new Set(current);
					next.delete(appointmentId);
					return next;
				});
			}
			setAppointmentScheduleSaveStates((current) => ({
				...current,
				[appointmentId]: latestMatchesSaved ? "saved" : "idle",
			}));
			if (latestMatchesSaved && options.closeEditorOnSave !== false)
				setEditingAppointmentId(null);
			setError(null);
			return true;
		} catch (saveError) {
			if (isNetworkFailure(saveError)) {
				const sourcePatient = dashboard?.patients?.find((p) => p.id === (draft.patientId || sourceAppointment?.patientId));
				const patientName = sourcePatient?.fullName || "Пациент";
				const sourceDoctor = dashboard?.clinicSettings?.staff?.find((s) => s.id === (draft.doctorUserId || sourceAppointment?.doctorUserId));
				const doctorName = sourceDoctor?.fullName || "Врач";

				const offlineAppt: OfflineAppointmentItem = {
					id: appointmentId,
					clientReferenceId: appointmentId,
					patientId: draft.patientId || sourceAppointment?.patientId || "",
					patientName,
					doctorId: draft.doctorUserId || sourceAppointment?.doctorUserId || "",
					doctorName,
					chairId: draft.chairId || sourceAppointment?.chairId || undefined,
					startTime: draft.startsAt,
					endTime: draft.endsAt,
					status: toOfflineAppointmentStatus(draft.status || sourceAppointment?.status),
					notes: draft.reason ?? undefined,
					organizationId:
						dashboard?.clinicSettings?.profile?.organizationId ?? undefined,
					createdAt: new Date().toISOString(),
				};
				await enqueueOfflineAppointment("UPDATE_APPOINTMENT", offlineAppt);

				if (dashboard?.appointments) {
					const updatedAppts: Appointment[] = dashboard.appointments.map((a) =>
						a.id === appointmentId
							? {
									...a,
									startsAt: offlineAppt.startTime,
									endsAt: offlineAppt.endTime,
									status: "planned",
									reason: offlineAppt.notes ?? null,
								}
							: a,
					);
					setDashboard({ ...dashboard, appointments: updatedAppts });
				}

				setAppointmentScheduleDirtyIds((current: Set<string>) => {
					const next = new Set(current);
					next.delete(appointmentId);
					return next;
				});
				setAppointmentScheduleSaveStates((current) => ({
					...current,
					[appointmentId]: "saved",
				}));
				if (options.closeEditorOnSave !== false) {
					setEditingAppointmentId(null);
				}
				setError(null);
				showToast(
					"Изменения записи сохранены локально (офлайн-режим) и будут синхронизированы при восстановлении связи.",
					"success",
				);
				return true;
			}

			const message = operatorWorkflowFailureMessage(
				"Запись не сохранена",
				saveError,
			);
			showToast(message, "error");
			setAppointmentScheduleErrors((current) => ({
				...current,
				[appointmentId]: message,
			}));
			setAppointmentScheduleSaveStates((current) => ({
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
		const activeNewDraft: AppointmentScheduleDraft = {
			...(newAppointmentDraftRef?.current ?? newAppointmentDraft),
		};
		if (!activeNewDraft.chairId) {
			const activeChairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
				(c) => c.active,
			);
			activeNewDraft.chairId = activeChairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
		}
		if (!activeNewDraft.doctorUserId) {
			const activeDocs = (dashboard?.clinicSettings?.staff ?? []).filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			activeNewDraft.doctorUserId = activeDocs[0]?.id || auth?.user?.id || "";
		}

		const missing = newAppointmentMissingFields(activeNewDraft).filter((m) => {
			if (m.includes("врач") && activeNewDraft.doctorUserId) return false;
			if (m.includes("кресл") && activeNewDraft.chairId) return false;
			// Mandate 8e / 8n: создание анонимной брони/резерва слота не блокируется отсутствием пациента
			if (m.includes("пациент")) return false;
			return true;
		});
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
					"Idempotency-Key": mutationId,
				}),
				body: JSON.stringify({
					...appointmentCreateInputFromDraft(activeNewDraft),
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
			const parsedSpecialty = dentalSpecialtySchema.safeParse(selectedSpecialty).data;
			const nextDraftPreferences: {
				selectedPatientId?: string | null;
				selectedSpecialty?: DentalSpecialty;
				scheduleDefaultDoctorUserId?: string | null;
				scheduleDefaultAssistantUserId?: string | null;
				scheduleDefaultChairId?: string | null;
			} = {
				selectedPatientId: activeNewDraft.patientId || selectedPatientId,
				scheduleDefaultDoctorUserId: activeNewDraft.doctorUserId || null,
				scheduleDefaultAssistantUserId:
					activeNewDraft.assistantUserId || null,
				scheduleDefaultChairId: activeNewDraft.chairId || null,
				...(parsedSpecialty ? { selectedSpecialty: parsedSpecialty } : {}),
			};
			setSelectedPatientId(nextDraftPreferences.selectedPatientId ?? null);
			setScheduleDefaultDoctorUserId(
				nextDraftPreferences.scheduleDefaultDoctorUserId ?? null,
			);
			setScheduleDefaultAssistantUserId(
				nextDraftPreferences.scheduleDefaultAssistantUserId ?? null,
			);
			setScheduleDefaultChairId(nextDraftPreferences.scheduleDefaultChairId ?? null);
			setDashboard(nextDashboard);
			newAppointmentDraftUserEditedRef.current = false;
			const freshNewDraft = newAppointmentDraftFromDashboard(
				nextDashboard,
				nextDraftPreferences,
			);
			if (newAppointmentDraftRef) {
				newAppointmentDraftRef.current = freshNewDraft;
			}
			setNewAppointmentDraft(freshNewDraft);
			setNewAppointmentSaveState("saved");
			if (createdAppointment) {
				const nextCreatedDraft = appointmentScheduleDraftFromAppointment(createdAppointment);
				setAppointmentScheduleDrafts((current: Record<string, AppointmentScheduleDraft>): Record<string, AppointmentScheduleDraft> => ({
					...current,
					[createdAppointment.id]: nextCreatedDraft,
				}));
				setEditingAppointmentId(createdAppointment.id);

				StaffActionAuditService.logAppointmentCreate({
					appointmentId: createdAppointment.id,
					patientId: createdAppointment.patientId ?? "",
					scheduledTime: createdAppointment.startsAt,
					doctorUserId: createdAppointment.doctorUserId ?? "",
					reason: createdAppointment.reason,
					actorUserId: auth?.user?.id,
					actorRole: auth?.user?.role,
				});
			}
			setError(null);
			return true;
		} catch (createError) {
			if (isNetworkFailure(createError)) {
				const clientRefId = generateOfflineAppointmentId();
				const matchedPatient = dashboard?.patients?.find((p) => p.id === activeNewDraft.patientId);
				const patientName = matchedPatient?.fullName || "Пациент (офлайн)";
				const matchedDoctor = dashboard?.clinicSettings?.staff?.find(
					(s) => s.id === activeNewDraft.doctorUserId,
				);
				const doctorName = matchedDoctor?.fullName || "Врач";

				const resolvedOrgId =
					dashboard?.clinicSettings?.profile?.organizationId ?? undefined;

				const offlineAppt: OfflineAppointmentItem = {
					id: clientRefId,
					clientReferenceId: clientRefId,
					patientId: activeNewDraft.patientId || selectedPatientId || "pat-offline",
					patientName,
					doctorId: activeNewDraft.doctorUserId || "doc-offline",
					doctorName,
					chairId: activeNewDraft.chairId,
					startTime: activeNewDraft.startsAt,
					endTime: activeNewDraft.endsAt,
					status: "planned",
					notes: activeNewDraft.reason ?? undefined,
					organizationId: resolvedOrgId,
					createdAt: new Date().toISOString(),
					isOfflineCreated: true,
				};
				await enqueueOfflineAppointment("CREATE_APPOINTMENT", offlineAppt);

				const createdAppointmentModel: Appointment = {
					id: clientRefId,
					organizationId: resolvedOrgId || "",
					patientId: offlineAppt.patientId,
					doctorUserId: offlineAppt.doctorId,
					assistantUserId: activeNewDraft.assistantUserId ?? null,
					chairId: offlineAppt.chairId ?? null,
					startsAt: offlineAppt.startTime,
					endsAt: offlineAppt.endTime,
					status: "planned",
					reason: offlineAppt.notes ?? null,
					comment: null,
				};

				const nextAppointments = [...(dashboard?.appointments ?? []), createdAppointmentModel];
				const nextDashboard = { ...(dashboard ?? {}), appointments: nextAppointments } as Dashboard;
				setDashboard(nextDashboard);

				newAppointmentDraftUserEditedRef.current = false;
				const parsedSpecialty = dentalSpecialtySchema.safeParse(selectedSpecialty).data;
				const freshNewDraft = newAppointmentDraftFromDashboard(nextDashboard, {
					selectedPatientId: activeNewDraft.patientId || selectedPatientId,
					scheduleDefaultDoctorUserId: activeNewDraft.doctorUserId || null,
					scheduleDefaultAssistantUserId: activeNewDraft.assistantUserId || null,
					scheduleDefaultChairId: activeNewDraft.chairId || null,
					...(parsedSpecialty ? { selectedSpecialty: parsedSpecialty } : {}),
				});
				if (newAppointmentDraftRef) {
					newAppointmentDraftRef.current = freshNewDraft;
				}
				setNewAppointmentDraft(freshNewDraft);
				setNewAppointmentSaveState("saved");
				setNewAppointmentError(null);
				setError(null);

				showToast(
					"Запись сохранена локально (офлайн-режим) и будет передана на сервер при появлении сети.",
					"success",
				);
				return true;
			}

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
		const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

		if (appointmentId) {
			const draft = appointmentScheduleDraftsRef.current[appointmentId];
			if (draft?.startsAt) {
				const origStart = Date.parse(draft.startsAt);
				const origEnd = draft.endsAt ? Date.parse(draft.endsAt) : origStart + 30 * 60_000;
				const durationMs = origEnd > origStart ? origEnd - origStart : 30 * 60_000;

				const localDateStr = toDateTimeLocalValue(draft.startsAt, timezone).slice(0, 10);
				const targetLocalStr = `${localDateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
				const targetStartIso = fromDateTimeLocalValue(targetLocalStr, timezone);
				const parsedStartMs = Date.parse(targetStartIso);
				const safeStartMs = Number.isFinite(parsedStartMs) ? parsedStartMs : Date.now();
				const newStartIso = new Date(safeStartMs).toISOString();
				const newEndIso = new Date(safeStartMs + durationMs).toISOString();

				const sourceAppointment = dashboard?.appointments?.find(
					(appointment) => appointment.id === appointmentId,
				);
				setAppointmentScheduleDrafts((current: Record<string, AppointmentScheduleDraft>): Record<string, AppointmentScheduleDraft> => {
					const fallbackDraft = sourceAppointment
						? appointmentScheduleDraftFromAppointment(sourceAppointment)
						: emptyAppointmentScheduleDraft();
					const existingDraft = current[appointmentId] ?? fallbackDraft;
					return {
						...current,
						[appointmentId]: {
							...existingDraft,
							startsAt: newStartIso,
							endsAt: newEndIso,
						},
					};
				});
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

			const localDateStr = toDateTimeLocalValue(newAppointmentDraft.startsAt, timezone).slice(0, 10);
			const targetLocalStr = `${localDateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
			const targetStartIso = fromDateTimeLocalValue(targetLocalStr, timezone);
			const parsedStartMs = Date.parse(targetStartIso);
			const safeStartMs = Number.isFinite(parsedStartMs) ? parsedStartMs : Date.now();
			const newStartIso = new Date(safeStartMs).toISOString();
			const newEndIso = new Date(safeStartMs + durationMs).toISOString();

			newAppointmentDraftUserEditedRef.current = true;
			setNewAppointmentDraft((current: AppointmentScheduleDraft): AppointmentScheduleDraft => ({
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
