/**
 * clinicalFallbackRouter.ts — Deterministic Clinical Fallback Routing.
 *
 * Mandate 8e: Doctor autonomy — handles chairside clinical commands:
 * odontogram, timeline, lab orders, treatment plan, prescriptions, DDI, SOAP diaries, RAG.
 */

import type { LLMStreamEvent } from "../../types.js";
import type { FallbackRouteContext } from "../types.js";
import {
	emitDone,
	emitToolUse,
} from "./tokenStreamEmitter.js";

/**
 * Attempts to route clinical commands. Returns an async generator if matched, or null.
 */
export async function* tryRouteClinicalFallback(
	ctx: FallbackRouteContext,
): AsyncIterable<LLMStreamEvent> {
	const { userText, lower, contextTooth, contextPatientId } = ctx;

	// 1. Odontogram & Teeth Status Updates (crm.update_teeth_chart / crm.get_teeth_chart)
	if (
		lower.includes("зубная формула") ||
		lower.includes("одонтограмм") ||
		lower.includes("карта зубов")
	) {
		yield emitToolUse(
			"crm.get_teeth_chart",
			{ patientId: contextPatientId },
			"call_teeth_chart",
		);
		yield emitDone("tool_use");
		return;
	}

	const toothStatusMatch = userText.match(
		/(?:зуб[аеу]?|tooth)\s*#?\s*([1-48][1-8])\s*(?:-|—|:)?\s*(кариес|пульпит|периодонтит|пломба|коронка|удален|имплант|норма)/i,
	);
	if (toothStatusMatch) {
		const toothNum = Number(toothStatusMatch[1]);
		const statusText = toothStatusMatch[2];
		yield emitToolUse(
			"crm.update_teeth_chart",
			{
				patientId: contextPatientId,
				updates: [{ toothNumber: toothNum, status: statusText }],
			},
			"call_update_tooth",
		);
		yield emitDone("tool_use");
		return;
	}

	// 2. Patient Timeline & Visit History (clinical.get_patient_timeline)
	if (
		lower.includes("что делали") ||
		lower.includes("прошлый прием") ||
		lower.includes("прошлом приеме") ||
		lower.includes("история визитов") ||
		lower.includes("когда ставили") ||
		lower.includes("хронологи") ||
		lower.includes("прошлые жалобы")
	) {
		yield emitToolUse(
			"clinical.get_patient_timeline",
			{ patientId: contextPatientId, limit: 10 },
			"call_timeline",
		);
		yield emitDone("tool_use");
		return;
	}

	// 3. Dental Lab Orders (crm.create_lab_order / crm.get_lab_order_status)
	if (
		lower.includes("зтл") ||
		lower.includes("лаборатор") ||
		lower.includes("наряд") ||
		lower.includes("техник") ||
		lower.includes("коронк") ||
		lower.includes("слепок")
	) {
		if (
			lower.includes("статус") ||
			lower.includes("где") ||
			lower.includes("готов")
		) {
			yield emitToolUse(
				"crm.get_lab_order_status",
				{ patientId: contextPatientId },
				"call_lab_status",
			);
		} else {
			const due = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
				.toISOString()
				.slice(0, 10);
			yield emitToolUse(
				"crm.create_lab_order",
				{
					patientId: contextPatientId,
					toothCodes: [contextTooth],
					workType: "Коронка из диоксида циркония",
					material: "Диоксид циркония ZrO2",
					vitaShade: "A2",
					dueDate: due,
				},
				"call_lab_create",
			);
		}
		yield emitDone("tool_use");
		return;
	}

	// 4. Treatment Plan & 3-Tier Estimate
	if (
		lower.includes("план") ||
		lower.includes("смет") ||
		lower.includes("тариф") ||
		lower.includes("эконом") ||
		lower.includes("оптимум") ||
		lower.includes("премиум") ||
		lower.includes("лечени") ||
		lower.includes("кариес") ||
		lower.includes("пульпит") ||
		lower.includes("имплант")
	) {
		const diagnosis = lower.includes("пульпит")
			? "Pulpitis"
			: lower.includes("имплант")
				? "Implantation"
				: "Caries";
		yield emitToolUse(
			"clinical.suggest_treatment_plan",
			{
				patientId: contextPatientId,
				tooth: contextTooth,
				primaryDiagnosis: diagnosis,
			},
			"call_plan",
		);
		yield emitDone("tool_use");
		return;
	}

	// 5. Statutory Prescription Form 107-1/u & Recommendations
	if (
		lower.includes("рецепт") ||
		lower.includes("107") ||
		lower.includes("назнач") ||
		lower.includes("выпиши") ||
		lower.includes("лекарств")
	) {
		yield emitToolUse(
			"crm.recommend_prescription",
			{
				diagnosisCode: "K04.0",
				complaint: userText,
			},
			"call_rx",
		);
		yield emitDone("tool_use");
		return;
	}

	// 6. Drug-Drug Interaction & Allergy Safety Check
	if (
		lower.includes("взаимодейств") ||
		lower.includes("совместим") ||
		lower.includes("аллерг") ||
		lower.includes("ddi") ||
		lower.includes("противопоказ")
	) {
		yield emitToolUse(
			"crm.check_drug_interactions",
			{
				patientId: contextPatientId,
				plannedDrugs: ["Амоксициллин", "Ибупрофен"],
			},
			"call_ddi",
		);
		yield emitDone("tool_use");
		return;
	}

	// 7. Clinical Diary (SOAP)
	if (
		lower.includes("дневник") ||
		lower.includes("осмотр") ||
		lower.includes("диктовка") ||
		lower.includes("жалоб") ||
		lower.includes("соматический статус") ||
		lower.includes("объективный статус") ||
		lower.includes("локальный статус") ||
		lower.includes("протокол приема") ||
		lower.includes("карта приема") ||
		lower.includes("заполни дневник")
	) {
		yield emitToolUse(
			"clinical_notes.parse_voice_dictation",
			{ transcript: userText, specialty: "therapist" },
			"call_notes",
		);
		yield emitDone("tool_use");
		return;
	}

	// 8. Price List / RAG Knowledge Search
	if (
		lower.includes("цена") ||
		lower.includes("стоимост") ||
		lower.includes("почем") ||
		lower.includes("прайс") ||
		lower.includes("сколько стоит") ||
		lower.includes("804н") ||
		lower.includes("гаранти") ||
		lower.includes("протокол")
	) {
		const category = lower.includes("гаранти")
			? "guarantee"
			: lower.includes("протокол")
				? "clinical_protocol"
				: "price_804n";
		yield emitToolUse(
			"internal.search_knowledge_base",
			{ query: userText, category, threshold: 0.75 },
			"call_rag",
		);
		yield emitDone("tool_use");
		return;
	}
}
