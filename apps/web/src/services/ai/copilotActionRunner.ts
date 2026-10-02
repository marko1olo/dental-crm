/**
 * copilotActionRunner.ts — Action Execution Engine with 1-Click Confirmation & Local Store Dispatch.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (1-click non-blocking execution, no modal dead-ends)
 * - Mandate 8l: Action Engine (Zero mocks, real CRM store + REST API dispatch)
 * - Mandate 8n: Scale Sovereignty (Offline-resilient fallback for solo doctors & small clinics)
 */

import {
	type CRMActionResult,
	type CRMToolCall,
	dispatchCrmAction,
	getActionTitleRu,
	isDestructiveAction,
} from "./aiActionDispatcher";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { useVisitStore, type ToothState } from "../../store/visitStore";

export interface PendingActionRecord {
	callId: string;
	name: string;
	args: Record<string, unknown>;
	createdAt: number;
	expiresAt: number;
	destructive: boolean;
	titleRu: string;
}

export interface ExecutedActionRecord {
	callId: string;
	name: string;
	args: Record<string, unknown>;
	result: CRMActionResult;
	timestamp: number;
	previousState?: {
		toothCode?: string | undefined;
		state?: ToothState | undefined;
		diagnosis?: string | undefined;
	} | undefined;
}

export type ActionRunnerEventType =
	| "action_pending"
	| "action_executed"
	| "action_rejected"
	| "action_undone"
	| "queue_updated";

export interface ActionRunnerEvent {
	type: ActionRunnerEventType;
	callId?: string;
	actionName?: string;
	data?: unknown;
}

export class CopilotActionRunner {
	private pendingActions: Map<string, PendingActionRecord> = new Map();
	private executionHistory: ExecutedActionRecord[] = [];
	private listeners: Set<(event: ActionRunnerEvent) => void> = new Set();
	private maxHistoryLength = 50;

	/**
	 * Subscribes to runner events.
	 */
	public subscribe(listener: (event: ActionRunnerEvent) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(event: ActionRunnerEvent): void {
		this.listeners.forEach((fn) => {
			try {
				fn(event);
			} catch (err) {
				console.error("[CopilotActionRunner] Listener error:", err);
			}
		});
	}

	/**
	 * Returns all currently pending actions awaiting 1-click confirmation.
	 */
	public getPendingActions(): PendingActionRecord[] {
		const now = Date.now();
		// Prune expired actions (> 15 minutes)
		for (const [id, record] of this.pendingActions.entries()) {
			if (record.expiresAt < now) {
				this.pendingActions.delete(id);
			}
		}
		return Array.from(this.pendingActions.values());
	}

	/**
	 * Returns the history of executed actions.
	 */
	public getExecutionHistory(): ExecutedActionRecord[] {
		return [...this.executionHistory];
	}

	/**
	 * Executes a tool call directly.
	 * If the action is destructive and unconfirmed, registers it for 1-click confirmation.
	 */
	public async executeAction(
		toolCall: CRMToolCall,
		options: {
			apiBaseUrl?: string;
			autoConfirmSafe?: boolean;
		} = {},
	): Promise<CRMActionResult> {
		const { apiBaseUrl = "", autoConfirmSafe = true } = options;
		const callId = toolCall.callId || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const name = toolCall.name;
		const args = toolCall.arguments || {};
		const destructive = isDestructiveAction(name, args);

		// If destructive and not explicitly confirmed by the doctor:
		if (destructive && !toolCall.confirmed) {
			const pendingRecord: PendingActionRecord = {
				callId,
				name,
				args,
				createdAt: Date.now(),
				expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins TTL
				destructive: true,
				titleRu: getActionTitleRu(name),
			};
			this.pendingActions.set(callId, pendingRecord);
			this.emit({
				type: "action_pending",
				callId,
				actionName: name,
				data: pendingRecord,
			});

			return {
				success: false,
				callId,
				actionName: name,
				category: "clinical_odontogram",
				needsConfirmation: true,
				destructive: true,
				message: `Действие «${pendingRecord.titleRu}» ожидает 1-клик подтверждения врача.`,
				data: args,
			};
		}

		// Snapshot prior state for undo if it's an odontogram update
		let previousStateSnapshot: ExecutedActionRecord["previousState"] | undefined;
		if (name.includes("tooth") || name.includes("odontogram")) {
			const tooth = String(args.tooth ?? args.toothNumber ?? "36");
			const currentToothState = useVisitStore.getState().visitToothStateByCode[tooth];
			const currentToothDiag = useVisitStore.getState().visitAiDiagnosesByCode[tooth];
			previousStateSnapshot = {
				toothCode: tooth,
				state: currentToothState,
				diagnosis: currentToothDiag,
			};
		}

		// Execute action via dispatcher into store & API
		const result = await dispatchCrmAction(
			{ ...toolCall, callId, confirmed: true },
			apiBaseUrl,
		);

		// Record in execution history
		const executedRecord: ExecutedActionRecord = {
			callId,
			name,
			args,
			result,
			timestamp: Date.now(),
			previousState: previousStateSnapshot,
		};

		this.executionHistory.unshift(executedRecord);
		if (this.executionHistory.length > this.maxHistoryLength) {
			this.executionHistory.pop();
		}

		// Clean up from pending if it was there
		if (this.pendingActions.has(callId)) {
			this.pendingActions.delete(callId);
		}

		this.emit({
			type: "action_executed",
			callId,
			actionName: name,
			data: result,
		});

		return result;
	}

	/**
	 * 1-Click approval for an action: dispatches it with doctor confirmation.
	 */
	public async confirmAction(
		callId: string,
		modifiedArgs?: Record<string, unknown>,
		apiBaseUrl = "",
	): Promise<CRMActionResult> {
		const pending = this.pendingActions.get(callId);
		const finalArgs = {
			...(pending ? pending.args : {}),
			...(modifiedArgs || {}),
		};
		const actionName = pending ? pending.name : "action";

		// Notify backend if API is configured
		if (apiBaseUrl) {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			fetch(`${apiBaseUrl}/api/v1/copilot/confirm`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					callId,
					decision: "confirm",
					modifiedArgs: finalArgs,
				}),
			}).catch(() => {
				// Local-first fallback: ignore network error
			});
		}

		return await this.executeAction(
			{
				callId,
				name: actionName,
				arguments: finalArgs,
				confirmed: true,
			},
			{ apiBaseUrl },
		);
	}

	/**
	 * 1-Click rejection for an action.
	 */
	public async rejectAction(
		callId: string,
		reason = "Отклонено врачом",
		apiBaseUrl = "",
	): Promise<void> {
		this.pendingActions.delete(callId);

		if (apiBaseUrl) {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			fetch(`${apiBaseUrl}/api/v1/copilot/confirm`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					callId,
					decision: "reject",
					reason,
				}),
			}).catch(() => {});
		}

		this.emit({
			type: "action_rejected",
			callId,
			data: { reason },
		});
	}

	/**
	 * Reverts the most recent reversible action (e.g. Odontogram change).
	 */
	public undoLastAction(): boolean {
		const record = this.executionHistory.find((r) => r.previousState?.toothCode);
		if (!record || !record.previousState?.toothCode) {
			return false;
		}

		const { toothCode, state = "idle", diagnosis = "" } = record.previousState;
		useVisitStore.getState().setToothState(toothCode, state);
		useVisitStore.getState().applyAiToothCodes(
			[toothCode],
			state,
			{ [toothCode]: state },
			{ [toothCode]: diagnosis },
		);

		// Remove the record from history
		this.executionHistory = this.executionHistory.filter((r) => r.callId !== record.callId);

		this.emit({
			type: "action_undone",
			callId: record.callId,
			actionName: record.name,
			data: { toothCode, restoredState: state },
		});

		return true;
	}
}

export const copilotActionRunner = new CopilotActionRunner();
