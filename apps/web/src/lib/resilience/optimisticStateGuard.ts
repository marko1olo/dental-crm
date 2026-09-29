/**
 * DENTE CRM — Optimistic State Guard & Rollback Architecture
 *
 * Provides pre-mutation snapshot captures and safe rollback handlers for critical
 * clinical workflows:
 * 1. Schedule Appointment Moves (drag-and-drop / reschedule)
 * 2. Odontogram Tooth Status Toggles (immediate visual feedback on dental formula)
 * 3. Visit Notes Autosave (043/у diaries, anamnesis, clinical complaints)
 *
 * INVARIANTS:
 * - Never throws unhandled exceptions that could crash the React tree.
 * - In case of network drop or server failure after retries, rolls back the UI state
 *   to the pre-mutation snapshot cleanly and notifies the doctor with a clear Russian toast.
 * - Always preserves local keystrokes in L1 RAM / offline cache so clinical documentation
 *   is never lost.
 */

import type { Appointment } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import type { VisitNoteForm } from "../../AppConstants";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../components/odontogram/odontogramStorage";
import type { ToothData } from "../../components/odontogram/ToothChart";
import {
	loadVisitDraftSync,
	saveVisitDraftDebounced,
} from "../../services/offline/offlineStorage";
import { logger } from "../../utils/logger";

export interface OptimisticMutationOptions<TState, TResult> {
	/** Capture a deep or immutable snapshot of relevant state before mutation */
	captureSnapshot: () => TState;
	/** Apply state updates optimistically to local UI/store */
	applyOptimistic: () => void;
	/** Execute remote API call (e.g. with resilientFetch) */
	mutation: () => Promise<TResult>;
	/** Roll back state using the captured snapshot if mutation fails */
	rollback: (snapshot: TState, error: unknown) => void;
	/** Optional callback when mutation succeeds */
	onSuccess?: ((result: TResult) => void) | undefined;
	/** Optional message to notify the doctor when rolled back */
	failureMessage?: string | undefined;
	/** Whether to emit a non-blocking toast to the doctor on failure (default: true) */
	notifyDoctor?: boolean | undefined;
}

export interface OptimisticMutationResult<TResult> {
	success: boolean;
	result?: TResult | undefined;
	error?: unknown;
	rolledBack: boolean;
}

/**
 * Executes an optimistic mutation with pre-mutation snapshot capture and graceful rollback.
 */
export async function executeOptimisticMutation<TState, TResult>(
	options: OptimisticMutationOptions<TState, TResult>,
): Promise<OptimisticMutationResult<TResult>> {
	const {
		captureSnapshot,
		applyOptimistic,
		mutation,
		rollback,
		onSuccess,
		failureMessage = "Не удалось применить изменения. Состояние возвращено к исходному.",
		notifyDoctor = true,
	} = options;

	let snapshot: TState;
	try {
		snapshot = captureSnapshot();
	} catch (snapshotErr) {
		logger.error("[OptimisticStateGuard] Failed to capture pre-mutation snapshot", snapshotErr);
		// Proceeding without snapshot would be dangerous; execute mutation directly
		try {
			const res = await mutation();
			onSuccess?.(res);
			return { success: true, result: res, rolledBack: false };
		} catch (err) {
			return { success: false, error: err, rolledBack: false };
		}
	}

	try {
		// 1. Optimistic update (0ms UI feedback)
		applyOptimistic();
	} catch (applyErr) {
		logger.error("[OptimisticStateGuard] Failed to apply optimistic update", applyErr);
	}

	try {
		// 2. Perform network mutation
		const result = await mutation();
		onSuccess?.(result);
		return {
			success: true,
			result,
			rolledBack: false,
		};
	} catch (error) {
		logger.warn("[OptimisticStateGuard] Mutation failed. Rolling back state...", error);

		try {
			// 3. Graceful rollback to snapshot
			rollback(snapshot, error);
		} catch (rollbackErr) {
			logger.error("[OptimisticStateGuard] Critical: Rollback handler threw exception", rollbackErr);
		}

		if (notifyDoctor) {
			showToast(failureMessage, "warning", 4500);
		}

		return {
			success: false,
			error,
			rolledBack: true,
		};
	}
}

// ---------------------------------------------------------------------------
// 1. SCHEDULE APPOINTMENT MOVE GUARD
// ---------------------------------------------------------------------------

export interface ScheduleMoveSnapshot {
	appointmentId: string;
	previousAppointment: Appointment | null;
	allAppointmentsSnapshot?: Appointment[] | undefined;
}

export interface GuardScheduleMoveParams {
	appointmentId: string;
	newStartsAt: string;
	newEndsAt?: string | undefined;
	newChairId?: string | null | undefined;
	newDoctorUserId?: string | null | undefined;
	mutation: () => Promise<unknown>;
	onSuccess?: ((result?: unknown) => void) | undefined;
	customFailureMessage?: string | undefined;
}

/**
 * Guards schedule moves and appointment reschedulings.
 * Captures previous appointment slot and restores it if the network call fails.
 */
export async function guardScheduleAppointmentMove(
	params: GuardScheduleMoveParams,
): Promise<OptimisticMutationResult<unknown>> {
	const {
		appointmentId,
		newStartsAt,
		newEndsAt,
		newChairId,
		newDoctorUserId,
		mutation,
		onSuccess,
		customFailureMessage = "Не удалось перенести запись пациента. Запись возвращена в исходное время.",
	} = params;

	return executeOptimisticMutation<ScheduleMoveSnapshot, unknown>({
		captureSnapshot: () => {
			const currentDashboard = useAppStore.getState().dashboard;
			const appt = currentDashboard?.appointments?.find((a) => a.id === appointmentId) ?? null;
			return {
				appointmentId,
				previousAppointment: appt ? { ...appt } : null,
				allAppointmentsSnapshot: currentDashboard?.appointments ? [...currentDashboard.appointments] : undefined,
			};
		},
		applyOptimistic: () => {
			useAppStore.setState((state) => {
				if (!state.dashboard?.appointments) return state;
				const updatedAppointments = state.dashboard.appointments.map((a) => {
					if (a.id !== appointmentId) return a;
					return {
						...a,
						startsAt: newStartsAt,
						endsAt: newEndsAt !== undefined ? newEndsAt : a.endsAt,
						chairId: newChairId !== undefined ? newChairId : a.chairId,
						doctorUserId: newDoctorUserId !== undefined ? newDoctorUserId : a.doctorUserId,
					};
				});
				return {
					...state,
					dashboard: {
						...state.dashboard,
						appointments: updatedAppointments,
					},
				};
			});
		},
		mutation,
		rollback: (snapshot) => {
			if (!snapshot.previousAppointment) return;
			useAppStore.setState((state) => {
				if (!state.dashboard?.appointments) return state;
				const restored = state.dashboard.appointments.map((a) =>
					a.id === snapshot.appointmentId ? (snapshot.previousAppointment as Appointment) : a,
				);
				return {
					...state,
					dashboard: {
						...state.dashboard,
						appointments: restored,
					},
				};
			});
		},
		onSuccess,
		failureMessage: customFailureMessage,
	});
}

// ---------------------------------------------------------------------------
// 2. ODONTOGRAM TOOTH STATUS TOGGLE GUARD
// ---------------------------------------------------------------------------

export interface OdontogramToothSnapshot {
	patientId: string;
	toothNumber: number;
	previousTeeth: ToothData[] | null;
	previousToothState?: ToothData | null | undefined;
}

export interface GuardOdontogramToothParams {
	patientId: string;
	toothNumber: number;
	updatedTooth: Partial<ToothData>;
	mutation: () => Promise<unknown>;
	onSuccess?: ((result?: unknown) => void) | undefined;
	customFailureMessage?: string | undefined;
}

/**
 * Guards odontogram tooth status and surface toggles.
 * If server synchronization fails, cleanly rolls back tooth status and in-memory cache.
 */
export async function guardOdontogramToothToggle(
	params: GuardOdontogramToothParams,
): Promise<OptimisticMutationResult<unknown>> {
	const {
		patientId,
		toothNumber,
		updatedTooth,
		mutation,
		onSuccess,
		customFailureMessage = "Не удалось обновить статус зуба. Формула возвращена к сохранённому состоянию.",
	} = params;

	return executeOptimisticMutation<OdontogramToothSnapshot, unknown>({
		captureSnapshot: () => {
			const existing = loadStoredTeethData(patientId);
			const currentTooth = existing?.find((t) => t.toothNumber === toothNumber) ?? null;
			return {
				patientId,
				toothNumber,
				previousTeeth: existing ? JSON.parse(JSON.stringify(existing)) : null,
				previousToothState: currentTooth ? { ...currentTooth } : null,
			};
		},
		applyOptimistic: () => {
			const current = loadStoredTeethData(patientId) || [];
			const exists = current.some((t) => t.toothNumber === toothNumber);
			let nextTeeth: ToothData[];

			if (exists) {
				nextTeeth = current.map((t) =>
					t.toothNumber === toothNumber ? ({ ...t, ...updatedTooth } as ToothData) : t,
				);
			} else {
				nextTeeth = [
					...current,
					{ toothNumber, state: "Healthy", ...updatedTooth } as ToothData,
				];
			}

			// Save to local cache immediately (0ms)
			saveStoredTeethData(patientId, nextTeeth);
		},
		mutation,
		rollback: (snapshot) => {
			if (snapshot.previousTeeth) {
				saveStoredTeethData(patientId, snapshot.previousTeeth);
			}
		},
		onSuccess,
		failureMessage: customFailureMessage,
	});
}

// ---------------------------------------------------------------------------
// 3. VISIT NOTES AUTOSAVE GUARD
// ---------------------------------------------------------------------------

export interface VisitNotesSnapshot {
	visitId: string;
	organizationId: string;
	previousForm: VisitNoteForm;
	previousDraftText?: string | undefined;
}

export interface GuardVisitNotesAutosaveParams {
	visitId: string;
	organizationId?: string | undefined;
	newForm: Partial<VisitNoteForm>;
	mutation: () => Promise<unknown>;
	onSuccess?: ((result?: unknown) => void) | undefined;
	customFailureMessage?: string | undefined;
}

/**
 * Guards visit notes and clinical protocol autosave.
 * In case of network failure, guarantees that keystrokes remain securely in L1 RAM / IndexedDB
 * drafts, and notifies the doctor that the draft is safely preserved offline.
 */
export async function guardVisitNotesAutosave(
	params: GuardVisitNotesAutosaveParams,
): Promise<OptimisticMutationResult<unknown>> {
	const {
		visitId,
		organizationId = "org-default",
		newForm,
		mutation,
		onSuccess,
		customFailureMessage = "Сбой сети при синхронизации протокола. Черновик надёжно сохранён в памяти устройства.",
	} = params;

	return executeOptimisticMutation<VisitNotesSnapshot, unknown>({
		captureSnapshot: () => {
			const storeForm = useVisitStore.getState().visitNoteForm;
			const memDraft = loadVisitDraftSync(visitId);
			return {
				visitId,
				organizationId,
				previousForm: { ...storeForm },
				previousDraftText: memDraft ? JSON.stringify(memDraft.data) : undefined,
			};
		},
		applyOptimistic: () => {
			// Update store and immediately queue L1 RAM draft
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				...newForm,
			}));
			useVisitStore.setState({ serverDraftSyncState: "saving" });
			saveVisitDraftDebounced(visitId, newForm, organizationId, 500);
		},
		mutation,
		rollback: (_snapshot, _err) => {
			// Do NOT erase doctor keystrokes! Keep the active doctor input in form and offline draft,
			// but update sync state to reflect that it is safely cached offline.
			useVisitStore.setState({
				serverDraftSyncState: "error",
			});
			// Ensure draft remains safe in offline storage
			saveVisitDraftDebounced(visitId, newForm, organizationId, 0);
		},
		onSuccess: (res) => {
			useVisitStore.setState({
				serverDraftSyncState: "saved",
				lastServerDraftSavedAt: new Date().toISOString(),
			});
			onSuccess?.(res);
		},
		failureMessage: customFailureMessage,
	});
}
