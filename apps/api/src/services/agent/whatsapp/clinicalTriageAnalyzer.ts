/**
 * clinicalTriageAnalyzer.ts — Layer 2: Clinical Triage Analyzer (Structured LLM via OmniGateway + Fast Semantic Engine).
 *
 * Invariants:
 * - 1:1 Verbatim Behavioral Conservation of clinical emergency triage logic.
 * - Handles severe symptoms (acute unbearable pain 10/10, facial swelling/flux, trismus, fever 38.5+, heavy bleeding, trauma).
 * - Accurately respects semantic negations ("отека нет", "боли нет", "температура 36.6").
 */

import { omniLlmGateway } from "../omniGateway.js";
import type { ChatOptions } from "../omniGatewayTypes.js";
import {
	type PatientSentiment,
	type TriageAnalysisResult,
	type TriageIntent,
	type TriageUrgency,
	WhatsAppTriageLlmSchema,
} from "./types.js";
import { sanitizePatientInput } from "./webhookPayloadParser.js";

export class WhatsAppTriageAnalyzer {
	/**
	 * Analyzes patient message using OmniGateway LLM with strict Zod structured output.
	 */
	public async analyzeAsync(
		text: string,
		context?: {
			patientName?: string | null | undefined;
			recentVisitDate?: string | null | undefined;
			recentDiagnoses?: string[] | undefined;
			activeDoctor?: string | null | undefined;
		},
		options: ChatOptions = {},
	): Promise<TriageAnalysisResult> {
		const cleanText = sanitizePatientInput(text);
		if (!cleanText) {
			return this.analyze(cleanText, context);
		}

		const systemPrompt = [
			"You are an expert Chief Medical Officer / Dental Triage AI in a high-end Dental Clinic.",
			"Perform urgent clinical classification on the patient's incoming WhatsApp message.",
			"CRITICAL TRIAGE PROTOCOLS:",
			"1. CRITICAL URGENCY: Acute unbearable pain (9-10/10, analgesics fail, cannot sleep), severe facial/gum swelling/flux/phlegmon, trismus (cannot open mouth), high fever 38.5C+, continuous heavy post-op bleeding (>2-3h), dental trauma/avulsion (knocked-out permanent tooth, jaw fracture).",
			"2. URGENT: Lost filling, broken crown/veneer, chipped tooth with mild/moderate pain, poking orthodontic wire, loose bracket.",
			"3. NORMAL: Routine booking inquiries, price requests, rescheduling, confirmation, feedback.",
			"4. NEGATIONS: If a symptom is negated or mild (e.g. 'отека нет', 'крови нет', 'температура 36.6', 'боль терпимая'), DO NOT classify as CRITICAL.",
		].join("\n");

		const contextStr = context
			? `\nКонтекст пациента: ${context.patientName || "Пациент"}, Врач: ${context.activeDoctor || "Не указан"}, Недавние диагнозы: ${(context.recentDiagnoses || []).join(", ") || "Нет"}`
			: "";

		try {
			const result = await omniLlmGateway.generateStructuredJson(
				WhatsAppTriageLlmSchema,
				[
					{
						role: "user",
						content: `Сообщение пациента:\n"""\n${cleanText}\n"""${contextStr}\n\nВыполни клинический триаж.`,
					},
				],
				{
					...options,
					system: systemPrompt,
				},
			);

			const data = WhatsAppTriageLlmSchema.parse(result.data);
			const normalizedSymptoms = new Set(data.detectedSymptoms);
			const lowerSummary =
				`${data.clinicalSummary} ${data.reasoning} ${cleanText}`.toLowerCase();

			const hasSwellingNeg =
				lowerSummary.includes("отека нет") ||
				lowerSummary.includes("отёка нет") ||
				lowerSummary.includes("без отека") ||
				lowerSummary.includes("не опух");
			if (
				!hasSwellingNeg &&
				(lowerSummary.includes("отек") ||
					lowerSummary.includes("отёк") ||
					lowerSummary.includes("раздул") ||
					lowerSummary.includes("опух") ||
					lowerSummary.includes("флюс"))
			) {
				normalizedSymptoms.add("swelling");
			}

			if (
				lowerSummary.includes("тризм") ||
				lowerSummary.includes("рот не") ||
				lowerSummary.includes("рот трудно") ||
				lowerSummary.includes("челюсть сводит")
			) {
				normalizedSymptoms.add("trismus");
			}
			if (
				lowerSummary.includes("38.5") ||
				lowerSummary.includes("38.8") ||
				lowerSummary.includes("39") ||
				lowerSummary.includes("40") ||
				lowerSummary.includes("жар") ||
				lowerSummary.includes("лихорад")
			) {
				normalizedSymptoms.add("fever_above_38");
			}
			if (
				!lowerSummary.includes("боли нет") &&
				!lowerSummary.includes("не болит") &&
				(lowerSummary.includes("острая боль") ||
					lowerSummary.includes("10/10") ||
					lowerSummary.includes("нестерпим"))
			) {
				normalizedSymptoms.add("acute_pain");
			}
			if (
				!lowerSummary.includes("не кровит") &&
				(lowerSummary.includes("хлещет") ||
					lowerSummary.includes("струе") ||
					lowerSummary.includes("кровотечение"))
			) {
				normalizedSymptoms.add("continuous_bleeding");
			}
			if (
				lowerSummary.includes("выбит") ||
				lowerSummary.includes("травм") ||
				lowerSummary.includes("сломал челюсть")
			) {
				normalizedSymptoms.add("trauma_fracture");
			}

			return {
				...data,
				detectedSymptoms: Array.from(normalizedSymptoms),
			};
		} catch (err) {
			console.warn(
				"[WhatsAppTriageAnalyzer:WARN] OmniGateway structured triage failed, using fast-path semantic parser:",
				err instanceof Error ? err.message : String(err),
			);
			return this.analyze(cleanText, context);
		}
	}

	/**
	 * Fast-path semantic triage parser for synchronous operations and offline unit testing.
	 */
	public analyze(
		text: string,
		context?:
			| {
					patientName?: string | null | undefined;
					recentVisitDate?: string | null | undefined;
					recentDiagnoses?: string[] | undefined;
					activeDoctor?: string | null | undefined;
			  }
			| undefined,
	): TriageAnalysisResult {
		const rawClean = (text || "").trim();
		const cleanText = sanitizePatientInput(rawClean);
		const lower = cleanText.toLowerCase();

		const matchedKeywords: string[] = [];
		const detectedSymptoms: string[] = [];

		// Semantic Negations
		const hasSwellingNegation =
			lower.includes("отека нет") ||
			lower.includes("отёка нет") ||
			lower.includes("без отека") ||
			lower.includes("без отёка") ||
			lower.includes("не опухло") ||
			lower.includes("отек спал") ||
			lower.includes("отёк спал") ||
			lower.includes("нет отека");

		const hasBleedingNegation =
			lower.includes("не кровит") ||
			lower.includes("кровь остановилась") ||
			lower.includes("крови нет") ||
			lower.includes("без крови") ||
			lower.includes("перестало кровить");

		const isMildBleeding =
			lower.includes("чуть-чуть") ||
			lower.includes("слегка") ||
			lower.includes("немного") ||
			lower.includes("мажет") ||
			lower.includes("розовая слюна");

		const hasPainNegation =
			lower.includes("боли нет") ||
			lower.includes("не болит") ||
			lower.includes("боль прошла") ||
			lower.includes("боль утихла") ||
			lower.includes("терпимо") ||
			lower.includes("острой боли нет");

		const hasHighFever =
			lower.includes("38.5") ||
			lower.includes("38.6") ||
			lower.includes("38.7") ||
			lower.includes("38.8") ||
			lower.includes("38.9") ||
			lower.includes("39") ||
			lower.includes("40") ||
			lower.includes("жар") ||
			lower.includes("лихорад");

		const hasSeverePain =
			!hasPainNegation &&
			(lower.includes("нестерпим") ||
				lower.includes("10 из 10") ||
				lower.includes("10/10") ||
				lower.includes("дикая боль") ||
				lower.includes("умираю от боли") ||
				lower.includes("не спал всю ночь") ||
				lower.includes("не спала всю ночь") ||
				(lower.includes("пульсир") && lower.includes("бол")) ||
				(lower.includes("не помогает") &&
					(lower.includes("кетанов") ||
						lower.includes("кеторол") ||
						lower.includes("нурофен") ||
						lower.includes("найз") ||
						lower.includes("нимесил"))));

		const hasSevereSwelling =
			!hasSwellingNegation &&
			(lower.includes("опух") ||
				lower.includes("раздул") ||
				lower.includes("отек") ||
				lower.includes("отёк") ||
				lower.includes("флюс") ||
				lower.includes("гной") ||
				lower.includes("свищ") ||
				lower.includes("абсцесс") ||
				lower.includes("флегмон") ||
				lower.includes("тризм") ||
				lower.includes("рот трудно открыть") ||
				lower.includes("не могу открыть рот") ||
				lower.includes("челюсть сводит") ||
				lower.includes("рот не открывается"));

		const hasHeavyBleeding =
			!hasBleedingNegation &&
			!isMildBleeding &&
			(lower.includes("хлещет") ||
				lower.includes("струей") ||
				lower.includes("струёй") ||
				lower.includes("не останавливается") ||
				lower.includes("полный рот сгустков") ||
				lower.includes("уже 4 часа") ||
				lower.includes("уже 3 часа") ||
				(lower.includes("кровь") && lower.includes("насквозь")));

		const hasTrauma =
			lower.includes("выбит") ||
			lower.includes("выбили") ||
			lower.includes("сломал челюсть") ||
			lower.includes("перелом челюсти") ||
			lower.includes("авария") ||
			lower.includes("удар в челюсть") ||
			lower.includes("ударился зубом") ||
			lower.includes("вывих зуба");

		const isBrokenRestoration =
			lower.includes("выпала пломба") ||
			lower.includes("вылетела пломба") ||
			lower.includes("откололся зуб") ||
			lower.includes("скололся зуб") ||
			lower.includes("слетела коронка") ||
			lower.includes("отклеился винир");

		const isOrthodontic =
			lower.includes("отклеился брекет") ||
			lower.includes("натирает протез") ||
			lower.includes("колет дуга") ||
			lower.includes("царапает дуга") ||
			lower.includes("проволока");

		const isPriceInquiry =
			lower.includes("сколько стоит") ||
			lower.includes("прайс") ||
			lower.includes("цен") ||
			lower.includes("стоимост");

		let urgency: TriageUrgency = "NORMAL";
		let sentiment: PatientSentiment = "neutral";
		let intent: TriageIntent = "general_inquiry";
		let painLevel = 0;
		const details: string[] = [];

		if (hasSeverePain || hasSevereSwelling || (hasHighFever && !lower.includes("36.")) || hasHeavyBleeding || hasTrauma) {
			urgency = "CRITICAL";
			sentiment = "emergency";
			intent = "emergency";

			if (hasSeverePain) {
				detectedSymptoms.push("acute_pain");
				matchedKeywords.push("острая боль");
				details.push("острая некупируемая боль");
				painLevel = 10;
			}
			if (hasSevereSwelling) {
				detectedSymptoms.push("swelling");
				matchedKeywords.push("отек/флюс");
				details.push("отек челюстно-лицевой области");
				if (
					lower.includes("тризм") ||
					lower.includes("рот трудно открыть") ||
					lower.includes("челюсть сводит") ||
					lower.includes("рот не открывается")
				) {
					detectedSymptoms.push("trismus");
					details.push("тризм / ограничение открывания рта");
				}
			}
			if (hasHighFever) {
				detectedSymptoms.push("fever_above_38");
				matchedKeywords.push("температура 38.5+");
				details.push("высокая температура");
				if (lower.includes("удалил") || lower.includes("удален") || lower.includes("лунк")) {
					detectedSymptoms.push("extraction_complication");
				}
			}
			if (hasHeavyBleeding) {
				detectedSymptoms.push("continuous_bleeding");
				matchedKeywords.push("кровотечение");
				details.push("Обильное кровотечение");
				if (lower.includes("удалил") || lower.includes("удален") || lower.includes("лунк")) {
					detectedSymptoms.push("extraction_complication");
				}
			}
			if (hasTrauma) {
				detectedSymptoms.push("trauma_fracture");
				matchedKeywords.push("травма зуба");
				details.push("Острая травма / вывих зуба");
			}
		} else if (isBrokenRestoration) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			detectedSymptoms.push("broken_restoration");
			matchedKeywords.push("дефект реставрации");
			details.push("Выпадение пломбы / дефект коронки");
		} else if (isOrthodontic) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			detectedSymptoms.push("orthodontic_issue");
			matchedKeywords.push("ортодонтический дискомфорт");
			details.push("Дискомфорт ортодонтической конструкции");
		} else if (lower.includes("удалил") || lower.includes("после удаления")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "symptom_report";
			detectedSymptoms.push("post_op_monitoring");
			if (isMildBleeding) detectedSymptoms.push("mild_oozing");
			details.push("Плановый послеоперационный мониторинг");
		} else if (isPriceInquiry) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "price_inquiry";
			details.push("Запрос стоимости услуг");
		} else if (
			lower.includes("записат") ||
			lower.includes("прием") ||
			lower.includes("окно") ||
			lower.includes("чистк") ||
			lower.includes("консультаци")
		) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "booking_request";
			details.push("Запрос на плановую запись");
		} else if (lower.includes("перенес")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "reschedule_request";
			details.push("Запрос на перенос визита");
		} else if (lower.includes("отменит")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "cancellation_request";
			details.push("Запрос на отмену визита");
		}

		const summary = details.join("; ") || "Плановое обращение пациента";
		let suggestedAction = "";
		let recommendedDoctorRole = "";

		if (urgency === "CRITICAL") {
			suggestedAction =
				"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета";
			recommendedDoctorRole = "Стоматолог-хирург / Терапевт (Дежурный)";
		} else if (urgency === "URGENT") {
			suggestedAction =
				"Предложить запись на осмотр в день обращения или завтра в первой половине дня.";
			recommendedDoctorRole = "Стоматолог-терапевт / Ортопед";
		} else {
			suggestedAction =
				"Предоставить стандартный вежливый ответ клиники и согласовать удобное время визита.";
			recommendedDoctorRole = "Администратор клиники";
		}

		return {
			urgency,
			sentiment,
			intent,
			confidence: 0.95,
			matchedKeywords: Array.from(new Set(matchedKeywords)),
			clinicalSummary: summary,
			suggestedAction,
			recommendedDoctorRole,
			requiresImmediateCall: urgency === "CRITICAL",
			requiresImmediateIntervention: urgency === "CRITICAL",
			detectedSymptoms: Array.from(new Set(detectedSymptoms)),
			recommendedAction: suggestedAction,
			reasoning: summary,
			painLevelEstimate: painLevel > 0 ? painLevel : undefined,
		};
	}
}

export const whatsappTriageAnalyzer = new WhatsAppTriageAnalyzer();
