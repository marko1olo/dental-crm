/**
 * streamFallbackRecovery.ts — Deterministic Copilot Fallback & Recovery Orchestrator.
 *
 * Mandates 8l, 8e, 8n: Routes doctor and staff natural language requests to CRM tools
 * when external LLMs are unavailable or offline, preventing service dropouts.
 * Decomposed under Mandate 8b into clinicalFallbackRouter and operationalFallbackRouter.
 */

import { SemanticRouter } from "../../semanticRouter.js";
import type { LLMStreamEvent } from "../../types.js";
import {
	tryResolveDirectComponentKnowledge,
	tryResolveKnowledgeInquiry,
} from "../knowledgeFallback.js";
import type { FallbackRouteContext } from "../types.js";
import { tryRouteClinicalFallback } from "./clinicalFallbackRouter.js";
import { tryRouteOperationalFallback } from "./operationalFallbackRouter.js";
import {
	emitDone,
	emitTextDelta,
	emitToolUse,
	streamCharacters,
} from "./tokenStreamEmitter.js";

const DEFAULT_WELCOME_TEXT =
	"DENTE Ассистент готов помочь врачу у кресла:\n" +
	"• Поиск пациентов и просмотр медицинских карт\n" +
	"• Подбор услуг, сметы и формирование планов лечения\n" +
	"• Совместимость препаратов и лекарственная безопасность\n" +
	"• Заполнение зубной формулы и расписание приёмов\n" +
	"• Наряды в зуботехническую лабораторию и дневник приёма.\n\n" +
	"Назовите зуб, клиническую жалобу или действие.";

/**
 * Deterministically routes clinician natural language input when external LLM fails.
 */
export async function* routeCopilotFallback(
	ctx: FallbackRouteContext,
): AsyncIterable<LLMStreamEvent> {
	const { userText, lower, contextTooth, contextPatientId } = ctx;

	// 0. Fast Deterministic Semantic Router for Compound Doctor Prompts
	const decomposedPlan = SemanticRouter.decompose(userText, {
		currentTooth: contextTooth,
		patientId: contextPatientId,
	});

	if (
		decomposedPlan.hasClinical &&
		(decomposedPlan.hasFinance || decomposedPlan.hasBooking)
	) {
		const aggregated = SemanticRouter.dispatchAndAggregate(decomposedPlan, {
			currentTooth: contextTooth,
			patientId: contextPatientId,
		});

		yield emitTextDelta(`${aggregated.unifiedResponseRu}\n\n`);

		const clinicalTask = decomposedPlan.subtasks.find(
			(s) => s.intent === "clinical",
		);
		const tooth =
			(clinicalTask && "toothNumber" in clinicalTask
				? clinicalTask.toothNumber
				: undefined) || contextTooth;
		const diagnosis =
			clinicalTask && "diagnoses" in clinicalTask && clinicalTask.diagnoses?.[0]
				? clinicalTask.diagnoses[0]
				: "K02.1";

		yield emitToolUse(
			"clinical.suggest_treatment_plan",
			{
				patientId: contextPatientId,
				tooth,
				primaryDiagnosis: diagnosis,
			},
			"call_plan",
		);
		yield emitDone("tool_use");
		return;
	}

	// 0.5. CRM Component Knowledge & Clinical Guidance (Mandates 8l, 8e, 8n)
	const knowledgeAnswer = tryResolveKnowledgeInquiry(userText, lower);
	if (knowledgeAnswer) {
		yield emitTextDelta(knowledgeAnswer);
		yield emitDone("stop");
		return;
	}

	// 1. Clinical Domain Router (odontogram, timeline, lab, plan, rx, ddi, soap, rag)
	let clinicalMatched = false;
	for await (const event of tryRouteClinicalFallback(ctx)) {
		clinicalMatched = true;
		yield event;
	}
	if (clinicalMatched) return;

	// 2. Operational & Scheduling Router (appointments, reschedules, cancel, family, revenue, 54-FZ, stock)
	let operationalMatched = false;
	for await (const event of tryRouteOperationalFallback(ctx)) {
		operationalMatched = true;
		yield event;
	}
	if (operationalMatched) return;

	// 3. Greeting / General Assistance
	if (
		lower.startsWith("привет") ||
		lower.startsWith("здравствуй") ||
		lower.includes("чем ты можешь помочь") ||
		lower.includes("что ты умеешь") ||
		lower.includes("помоги")
	) {
		yield* streamCharacters(DEFAULT_WELCOME_TEXT);
		return;
	}

	// 4. Direct Knowledge Lookup for high-confidence component queries
	const directAnswer = tryResolveDirectComponentKnowledge(userText);
	if (directAnswer) {
		yield emitTextDelta(directAnswer);
		yield emitDone("stop");
		return;
	}

	// 5. Default Welcome Greeting
	yield* streamCharacters(DEFAULT_WELCOME_TEXT);
}
