/**
 * toolDispatcher.ts — Tool Invocation, Two-Phase Confirmation Guard & Stuck Sentinel
 */

import type { TaskPlan } from "@dental/shared";
import type { AgentRouterToolCall } from "../agentRouterClient.js";
import { safeParseToolArguments } from "../agentRouterClient.js";
import {
	type DentalToolContext,
	executeDentalTool,
	getToolDescriptionRu,
	isDestructiveDentalTool,
} from "../dentalTools.js";
import type { AgentHarnessEvent, GranularAgentPermissions } from "./harnessTypes.js";

export interface ToolDispatchResult {
	toolName: string;
	parsedArgs: Record<string, unknown>;
	result: unknown;
	activePlan?: TaskPlan | undefined;
	isConfirmationRequired?: boolean | undefined;
}

export class ToolDispatcher {
	private consecutiveFailures = 0;
	private lastFailedToolName = "";

	constructor(
		private readonly effectiveToolContext: DentalToolContext,
		private readonly requireConfirmationForDestructive = false,
		private readonly onEvent?: (event: AgentHarnessEvent) => void | Promise<void>,
		private readonly trustLevel: "confirm_all" | "balanced" | "autonomous" = "balanced",
		private readonly granularPermissions?: GranularAgentPermissions,
	) {}

	/**
	 * Dispatches a single tool call with safety guards and stuck detection.
	 */
	async dispatchToolCall(
		call: AgentRouterToolCall,
		currentPlan?: TaskPlan,
	): Promise<ToolDispatchResult> {
		const toolName = call.function.name;
		const parsedArgs =
			safeParseToolArguments<Record<string, unknown>>(call) || {};

		this.onEvent?.({
			type: "tool_start",
			tool: toolName,
			args: parsedArgs,
			callId: call.id,
		});

		// 1. Two-phase execution guard based on Trust Level & Fine-Grained Permissions
		let isAutoApprovedByGranular = false;
		if (this.granularPermissions) {
			if (this.granularPermissions.autoApproveFileReads && ["search_workstation_files", "read_clinical_file", "list_patient_study_directory", "open_patient_dropzone_folder"].includes(toolName)) {
				isAutoApprovedByGranular = true;
			} else if (this.granularPermissions.autoApproveFileWrites && ["write_clinical_file", "replace_file_content"].includes(toolName)) {
				isAutoApprovedByGranular = true;
			} else if (this.granularPermissions.autoApproveClinicalMutations && ["update_tooth_status", "generate_form_043_entry"].includes(toolName)) {
				isAutoApprovedByGranular = true;
			} else if (this.granularPermissions.autoApproveFinancialDrafts && toolName === "create_invoice_draft") {
				isAutoApprovedByGranular = true;
			} else if (this.granularPermissions.autoApproveExternalSoftware && toolName === "launch_workstation_app") {
				isAutoApprovedByGranular = true;
			}
		}

		const isDestructive = isDestructiveDentalTool(toolName);
		const needsConfirmation =
			this.trustLevel === "confirm_all"
				? !isAutoApprovedByGranular
				: this.trustLevel === "autonomous"
					? false
					: isAutoApprovedByGranular
						? false
						: (this.requireConfirmationForDestructive || isDestructive) &&
							!this.effectiveToolContext.allowLocalExecution;

		if (needsConfirmation) {
			const descRu = getToolDescriptionRu(toolName);
			this.onEvent?.({
				type: "confirmation_required",
				tool: toolName,
				args: parsedArgs,
				callId: call.id,
				descriptionRu: descRu,
			});

			const pendingResult = {
				status: "confirmation_required",
				destructive: true,
				message: `Действие '${descRu}' требует подтверждения врача.`,
				args: parsedArgs,
			};

			this.onEvent?.({
				type: "tool_end",
				tool: toolName,
				result: pendingResult,
				callId: call.id,
			});

			return {
				toolName,
				parsedArgs,
				result: pendingResult,
				activePlan: currentPlan,
				isConfirmationRequired: true,
			};
		}

		// 2. Tool Execution
		let toolResult: unknown;
		try {
			toolResult = await executeDentalTool(
				toolName,
				parsedArgs,
				this.effectiveToolContext,
			);
		} catch (toolExecErr) {
			const msg =
				toolExecErr instanceof Error
					? toolExecErr.message
					: String(toolExecErr);
			toolResult = {
				success: false,
				code: "TOOL_EXECUTION_FAILED",
				error: "ToolExecutionFailed",
				message: msg,
				recoverable: true,
			};
		}

		// 3. Stuck detection / Repetitive tool failure sentinel
		const isFailed = Boolean(
			toolResult &&
				typeof toolResult === "object" &&
				(("success" in toolResult &&
					(toolResult as { success?: boolean }).success === false) ||
					("error" in toolResult &&
						Boolean((toolResult as { error?: unknown }).error)) ||
					("status" in toolResult &&
						(toolResult as { status?: string }).status === "failed")),
		);

		if (isFailed) {
			this.consecutiveFailures++;
			this.lastFailedToolName = toolName;
			if (this.consecutiveFailures >= 2) {
				const warningMsg = `[STUCK_DETECTION] Повторный сбой инструмента '${toolName}' (${this.consecutiveFailures} раз подряд). Категорически запрещено повторять аналогичный вызов с теми же аргументами. Смените стратегию или обратитесь к врачу.`;
				if (typeof toolResult === "object" && toolResult !== null) {
					(toolResult as Record<string, unknown>).stuckDetectionWarning =
						warningMsg;
				}
			}
		} else {
			this.consecutiveFailures = 0;
			this.lastFailedToolName = "";
		}

		// 4. Task plan synchronization
		let updatedPlan = currentPlan;
		if (
			(toolName === "manage_task_plan" || toolName === "task_plan") &&
			toolResult &&
			typeof toolResult === "object" &&
			"plan" in toolResult &&
			(toolResult as { plan?: TaskPlan }).plan
		) {
			updatedPlan = (toolResult as { plan: TaskPlan }).plan;
			this.onEvent?.({
				type: "plan_updated",
				plan: updatedPlan,
			});
		}

		this.onEvent?.({
			type: "tool_end",
			tool: toolName,
			result: toolResult,
			callId: call.id,
		});

		return {
			toolName,
			parsedArgs,
			result: toolResult,
			activePlan: updatedPlan,
			isConfirmationRequired: false,
		};
	}
}
