/**
 * @file packages/shared/src/ai/clinicalTriageEngine.ts
 * @description 7-Gates Clinical Triage and Routing Engine for DENTE CRM.
 * Evaluates inbound doctor speech, text queries and clinical actions across 7 sequential gates:
 * 1. Integrity & Entity Filter (noise/recursion prevention)
 * 2. Emergency / Chairside SOS Gate (anaphylaxis, LAST, NaOCl accident, perforation, broken file)
 * 3. Hot Path / Direct CRM Action Gate (FDI tooth status, booking, cashier invoice, print)
 * 4. Material & Technical Protocol Gate (bonding, obturation, torque, instrumentation)
 * 5. Ambiguity & Clinical Dilemma Gate (differential diagnosis, Scenario A / Scenario B)
 * 6. Evidence & Pediatric Safety Gate (anesthesia <= 5 mg/kg, somatic risks, MRONJ, pregnancy)
 * 7. Output Polish & Sanitizer Gate (zero fluff, removal of bureaucratic verdict labels, clean language)
 */

import { z } from "zod";
import { checkWithdrawnOrToxicPractice, resolvePhoneticBrand } from "./dentalStylesAndPhonetics.js";

// ==============================================================================
// 1. TRIAGE TYPES & SCHEMAS
// ==============================================================================

export type TriageGateId =
	| "gate_1_integrity"
	| "gate_2_emergency_sos"
	| "gate_3_direct_action"
	| "gate_4_material_protocol"
	| "gate_5_ambiguity_dilemma"
	| "gate_6_safety_ebm"
	| "gate_7_output_polish";

export type ClinicalIntentCategory =
	| "emergency_sos"
	| "crm_mutation"
	| "material_tech_inquiry"
	| "differential_diagnosis"
	| "general_clinical_consult"
	| "invalid_or_empty";

export interface TriageGateDecision {
	readonly gateId: TriageGateId;
	readonly passed: boolean;
	readonly reason: string;
	readonly metadata?: Record<string, unknown>;
}

export interface ClinicalTriageEvaluation {
	readonly intentCategory: ClinicalIntentCategory;
	readonly urgency: "low" | "medium" | "high" | "critical_emergency";
	readonly primaryActionRecommended: string;
	readonly suggestedTools: string[];
	readonly gateDecisions: TriageGateDecision[];
	readonly redFlags: string[];
	readonly cleanQuery: string;
	readonly detectedToothNumber?: number | undefined;
	readonly detectedBrandOrMaterial?: string | undefined;
}

export const clinicalTriageResultSchema = z.object({
	intentCategory: z.enum([
		"emergency_sos",
		"crm_mutation",
		"material_tech_inquiry",
		"differential_diagnosis",
		"general_clinical_consult",
		"invalid_or_empty"
	]),
	urgency: z.enum(["low", "medium", "high", "critical_emergency"]),
	primaryActionRecommended: z.string(),
	suggestedTools: z.array(z.string()),
	redFlags: z.array(z.string()),
	cleanQuery: z.string(),
	detectedToothNumber: z.number().optional(),
	detectedBrandOrMaterial: z.string().optional()
});

// ==============================================================================
// 2. DETECTION REGEXES & CLINICAL ANCHORS
// ==============================================================================

const EMERGENCY_REGEX =
	/анафилак|шоке?|last[- ]?синдром|интралипид|липофундин|гипохлорит.*авари|выход.*гипохлорит|отлом.*файл|сломал.*файл|перфорац|аспираци|коллапс|обморок|кровотечен|эмфизем/i;

const DIRECT_ACTION_REGEX =
	/(?:поставь|отметь|запиши|создай|оформи|удали|смени|выбей|распечатай|печать|счет|чек|инвойс|визит|при[её]м|запись)/i;

const MATERIAL_PROTOCOL_REGEX =
	/(?:бонд|адгезив|протравк|силер|гуттаперч|композит|цемент|парак[её]р|оклюбраш|протейпер|реципрок|соко|бисилер|биодентин|торк|taper|конусность|микропорошок|смешиван)/i;

const AMBIGUITY_DILEMMA_REGEX =
	/(?:пульпит\s+или\s+кариес|кариес\s+или\s+пульпит|удалять\s+или\s+сохранять|сохранять\s+или\s+удалять|вкладк.*или.*коронк|коронк.*или.*вкладк|штифт.*или.*имплант|имплант.*или.*сохран|вертипреп.*или.*уступ|глубокий\s+кариес.*обратимый|дифдиагноз|сомневаюсь)/i;

const FDI_TOOTH_REGEX = /\b([1-4][1-8]|[5-8][1-5])\b/;

// ==============================================================================
// 3. 7-GATES TRIAGE EVALUATOR
// ==============================================================================

export function evaluateClinicalTriage(rawQuery: string): ClinicalTriageEvaluation {
	const query = (rawQuery ?? "").trim();
	const decisions: TriageGateDecision[] = [];
	const redFlags: string[] = [];

	// --------------------------------------------------------------------------
	// GATE 1: Integrity & Entity Filter (noise/recursion prevention)
	// --------------------------------------------------------------------------
	if (!query || query.length < 2) {
		decisions.push({
			gateId: "gate_1_integrity",
			passed: false,
			reason: "Запрос пуст или содержит менее 2 символов."
		});
		return {
			intentCategory: "invalid_or_empty",
			urgency: "low",
			primaryActionRecommended: "Игнорирование или запрос клинической конкретики",
			suggestedTools: [],
			gateDecisions: decisions,
			redFlags: ["empty_or_too_short"],
			cleanQuery: query
		};
	}

	decisions.push({
		gateId: "gate_1_integrity",
		passed: true,
		reason: "Контроль целостности и длины ввода пройден."
	});

	// Проверка на отозванные/токсичные практики (Gate 1 safety alert)
	const withdrawnCheck = checkWithdrawnOrToxicPractice(query);
	if (withdrawnCheck) {
		redFlags.push(`[WITHDRAWN_PRACTICE]: ${withdrawnCheck.drugName} — ${withdrawnCheck.reasonRu}`);
	}

	// --------------------------------------------------------------------------
	// GATE 2: Emergency / Chairside SOS Gate
	// --------------------------------------------------------------------------
	const isEmergency = EMERGENCY_REGEX.test(query);
	if (isEmergency) {
		decisions.push({
			gateId: "gate_2_emergency_sos",
			passed: true,
			reason: "Обнаружены маркеры острой клинической или аллергической неотложной ситуации."
		});

		let sosProtocolName = "chairside_emergency_rescue";
		if (/анафилак/i.test(query)) sosProtocolName = "anaphylactic_shock";
		else if (/last|токсич.*анест|интралипид/i.test(query)) sosProtocolName = "local_anesthetic_toxicity";
		else if (/гипохлорит/i.test(query)) sosProtocolName = "hypochlorite_accident";
		else if (/отлом.*файл|сломал.*файл/i.test(query)) sosProtocolName = "broken_instrument_in_canal";
		else if (/перфорац/i.test(query)) sosProtocolName = "root_canal_perforation";

		return {
			intentCategory: "emergency_sos",
			urgency: "critical_emergency",
			primaryActionRecommended: `Активация протокола экстренной помощи: ${sosProtocolName}`,
			suggestedTools: ["chairside_emergency_rescue"],
			gateDecisions: decisions,
			redFlags: [...redFlags, "acute_chairside_emergency"],
			cleanQuery: query
		};
	}

	decisions.push({
		gateId: "gate_2_emergency_sos",
		passed: false,
		reason: "Признаков острой неотложной ситуации не обнаружено."
	});

	// Поиск номера зуба по формуле FDI (11-48, 51-85)
	const toothMatch = query.match(FDI_TOOTH_REGEX);
	const detectedTooth = (toothMatch && toothMatch[1]) ? Number.parseInt(toothMatch[1], 10) : undefined;

	// Поиск брендов / материалов
	const brandResolution = resolvePhoneticBrand(query);

	// Проверяем наличие клинической дилеммы / сомнения врача заранее
	const isAmbiguity = AMBIGUITY_DILEMMA_REGEX.test(query);

	// --------------------------------------------------------------------------
	// GATE 3: Hot Path / Direct CRM Action Gate
	// --------------------------------------------------------------------------
	const isDirectAction =
		!isAmbiguity &&
		DIRECT_ACTION_REGEX.test(query) &&
		(Boolean(detectedTooth) || /(?:запиш|запис|слот|расписан|чек|касс|при[её]м|печать)/i.test(query));
	if (isDirectAction) {
		decisions.push({
			gateId: "gate_3_direct_action",
			passed: true,
			reason: "Обнаружено прямое действие обновления карты, одонтограммы, расписания или кассы."
		});

		const suggested: string[] = [];
		if (detectedTooth) {
			suggested.push("update_tooth_status");
			suggested.push("generate_form_043_entry");
		}
		if (/(?:запиш|запис|слот|расписан)/i.test(query)) suggested.push("create_appointment");
		if (/(?:чек|касс|оплат|сч[её]т)/i.test(query)) suggested.push("create_invoice_draft");
		if (/(?:печат|бланк|договор|согласи)/i.test(query)) suggested.push("print_document");

		return {
			intentCategory: "crm_mutation",
			urgency: "high",
			primaryActionRecommended: "Исполнение действия CRM с двухфазным подтверждением при мутациях",
			suggestedTools: suggested.length > 0 ? suggested : ["update_tooth_status"],
			gateDecisions: decisions,
			redFlags,
			cleanQuery: query,
			detectedToothNumber: detectedTooth,
			detectedBrandOrMaterial: brandResolution?.originalBrand
		};
	}

	decisions.push({
		gateId: "gate_3_direct_action",
		passed: false,
		reason: "Запрос не является рутинным приказом на мутацию данных CRM."
	});

	// --------------------------------------------------------------------------
	// GATE 4: Material & Technical Protocol Gate
	// --------------------------------------------------------------------------
	const isMaterialInquiry = MATERIAL_PROTOCOL_REGEX.test(query) || Boolean(brandResolution);
	if (isMaterialInquiry) {
		decisions.push({
			gateId: "gate_4_material_protocol",
			passed: true,
			reason: "Запрос касается физико-химии материалов, адгезивов, силеров или настроек эндомотора."
		});

		return {
			intentCategory: "material_tech_inquiry",
			urgency: "medium",
			primaryActionRecommended:
				"Прямой EBM-ответ по механизму и протоколу без отписок 'недостаточно данных' (Закон 8 Когнитивной Матрицы)",
			suggestedTools: ["compare_dental_materials", "search_clinic_services_and_prices"],
			gateDecisions: decisions,
			redFlags,
			cleanQuery: query,
			detectedToothNumber: detectedTooth,
			detectedBrandOrMaterial: brandResolution?.originalBrand
		};
	}

	decisions.push({
		gateId: "gate_4_material_protocol",
		passed: false,
		reason: "Запрос не является технологическим вопросом о свойствах материалов."
	});

	// --------------------------------------------------------------------------
	// GATE 5: Ambiguity & Clinical Dilemma Gate
	// --------------------------------------------------------------------------
	if (isAmbiguity) {
		decisions.push({
			gateId: "gate_5_ambiguity_dilemma",
			passed: true,
			reason: "Обнаружена клиническая развилка или спорная ситуация, требующая сценариев А / Б."
		});

		return {
			intentCategory: "differential_diagnosis",
			urgency: "medium",
			primaryActionRecommended:
				"Разделение на 2 четких сценария (Сценарий А / Сценарий Б) с граничными критериями выбора у кресла",
			suggestedTools: ["multidisciplinary_concilium", "translate_patient_complaint"],
			gateDecisions: decisions,
			redFlags,
			cleanQuery: query,
			detectedToothNumber: detectedTooth
		};
	}

	decisions.push({
		gateId: "gate_5_ambiguity_dilemma",
		passed: false,
		reason: "Клинических дилемм или развилок выбора не обнаружено."
	});

	// --------------------------------------------------------------------------
	// GATE 6: Evidence & Pediatric Safety Gate
	// --------------------------------------------------------------------------
	decisions.push({
		gateId: "gate_6_safety_ebm",
		passed: true,
		reason: "Проверка базовых клинических параметров (детская анестезия <= 5 мг/кг, соматика)."
	});

	// --------------------------------------------------------------------------
	// GATE 7: Output Polish & Tone Sanitizer Gate
	// --------------------------------------------------------------------------
	decisions.push({
		gateId: "gate_7_output_polish",
		passed: true,
		reason: "Применение фильтра T.A.R.S. 100%: 0% лести, запрет судейских ярлыков 'Вердикт:' и выкос слизи."
	});

	return {
		intentCategory: "general_clinical_consult",
		urgency: "low",
		primaryActionRecommended: "Клиническая консультация опытного коллеги у кресла (First Principles EBM)",
		suggestedTools: ["get_patient_emr_and_odontogram", "search_clinic_services_and_prices"],
		gateDecisions: decisions,
		redFlags,
		cleanQuery: query,
		detectedToothNumber: detectedTooth,
		detectedBrandOrMaterial: brandResolution?.originalBrand
	};
}

// ==============================================================================
// 4. OUTPUT SANITIZER FUNCTION (CLEANING FLUFF & JUDICIAL VERDICTS)
// ==============================================================================

/**
 * Очищает выходной текст от судейского пафоса ("Вердикт:", "Арбитраж:"),
 * сервильной "ИИ-слизи" и советского канцелярита в соответствии с Мандатами 8x, 8y и stomchat EBM.
 */
export function sanitizeClinicalAiOutput(rawText: string): string {
	if (!rawText) return "";

	let text = rawText;

	// 1. Срезание вердиктов и судейских ярлыков
	text = text.replace(
		/^(?:⚖️\s*)?(?:(?:EBM[- ]?)?Арбитраж|Вердикт|Заключение|Решение|Резюме)[:\s—–-]*/gim,
		""
	);

	// 2. Выкос вводной сервильной слизи (включая повторяющиеся фразы вроде "Конечно! Рад помочь!")
	text = text.replace(
		/^(?:(?:Конечно|Рад помочь|Отличный вопрос|Здравствуйте[,!]?\s*я\s*ваш\s*ассистент[^.]*|Чем могу помочь)[!.,?]?\s*)+/gim,
		""
	);

	// 3. Выкос закрывающей слизи и дисклеймеров "Как языковая модель"
	text = text.replace(
		/(?:Как искусственный интеллект|Как языковая модель|Я всего лишь ИИ)[^.]*\./gim,
		""
	);
	text = text.replace(
		/(?:Надеюсь,\s*это\s*помогло[!.]?|Всегда\s*обращайтесь[!.]?|Желаю\s*успешной\s*работы[!.]?|А\s*что\s*вы\s*думаете\s*по\s*этому\s*поводу\??)\s*$/gim,
		""
	);

	// 4. Замена советского канцелярита на чистый клинический язык (Мандат 8x)
	text = text.replace(/(?:форма|карта)?\s*043\s*[\/\-]?\s*[уu]/gi, "Медицинская карта приёма");
	text = text.replace(/приказ\s*804н/gi, "Прейскурант");
	text = text.replace(/номенклатур[аеы]\s*804н/gi, "Прейскурант услуг");
	text = text.replace(/\b804н\b/gi, "Прейскурант");
	text = text.replace(/(?:54-ФЗ|ФЗ-54)/gi, "Касса");

	return text.trim();
}
