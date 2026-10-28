/**
 * autonomousDenteAgent.ts — Autonomous ReAct Clinical AI Agent for DENTE Copilot.
 *
 * Implements the Antigravity ReAct Cycle:
 * Input Context -> Thought -> Action (Tool Call) -> Observation (Execution) -> Next Step -> Final Clinical Verdict.
 *
 * Guarantees:
 * - Anti-infinite loop protection: max 5 iterations strictly bounded.
 * - Mandate 8e (Doctor Autonomy): zero blocking disabled buttons, 1-click draft application.
 * - Mandate 8k (Friction-Killer Law): instantaneous packages instead of endless clicks.
 * - T.A.R.S. 100% Factual Honesty: dry, fact-dense clinical summary without conversational fluff.
 * - Exact kopecks arithmetic & price catalog compliance.
 * - Mandate 8b: Monolith decomposed into denteAgentParser.ts & denteAgentExecution.ts.
 */

import {
	parseClinicalPromptAndContext,
	type AutonomousDenteAgentInput,
	type LabOrderRequest,
	type AppointmentRequest,
	type ParsedClinicalContext,
} from "./autonomousDenteAgentModules/denteAgentParser.js";
import {
	executeAutonomousReActCycle,
	type ActionCardType,
	type ProactiveActionCard,
	type ReActStep,
	type AutonomousDenteAgentResult,
} from "./autonomousDenteAgentModules/denteAgentExecution.js";

export type {
	AutonomousDenteAgentInput,
	LabOrderRequest,
	AppointmentRequest,
	ParsedClinicalContext,
	ActionCardType,
	ProactiveActionCard,
	ReActStep,
	AutonomousDenteAgentResult,
};

export class AutonomousDenteAgent {
	private readonly maxIterations = 5;

	/**
	 * Executes the full Antigravity ReAct Cycle:
	 * Thought -> Action -> Observation -> Next Thought -> Verdict.
	 */
	public async execute(
		input: AutonomousDenteAgentInput,
	): Promise<AutonomousDenteAgentResult> {
		const parsedContext = parseClinicalPromptAndContext(input);
		return executeAutonomousReActCycle(input, parsedContext, this.maxIterations);
	}
}

export const defaultAutonomousDenteAgent = new AutonomousDenteAgent();
