import { Prompts } from "./aiPromptRouter";
import { smartBookingParser } from "./smartBookingParser";
import { parsePatientDictationLocal } from "./smartPatientParser";
import { parsePriceDictationLocal } from "./smartPriceParser";
import { parseVisitDictationLocal } from "./smartVisitParser";

export function parsePaymentDictationLocal(input: string): {
	amount: string;
	method: string | null;
	taxDeductionCode: string | null;
} {
	const lower = input.toLowerCase();

	// Extract amount
	let amount = "";
	const thousandsMatch = lower.match(/(\d+)[\s]*(тыс|тысяч|т\.р\.|тр)/i);
	if (thousandsMatch?.[1]) {
		amount = String(parseInt(thousandsMatch[1], 10) * 1000);
	} else {
		const match = input.replace(/\s+/g, "").match(/\d{2,7}/);
		if (match) amount = match[0];
	}

	// Extract method
	let method: string | null = null;
	if (/(карт|терминал|безнал)/i.test(lower)) method = "card";
	else if (/(налич|нал)/i.test(lower)) method = "cash";
	else if (/(сбп|перевод|банк|qr)/i.test(lower)) method = "bank_transfer";
	else if (/(онлайн|ссылк)/i.test(lower)) method = "online";

	// Extract tax deduction
	let taxDeductionCode: string | null = null;
	if (/(вычет|код 1|налог)/i.test(lower)) taxDeductionCode = "1";
	else if (/(код 2)/i.test(lower)) taxDeductionCode = "2";

	return { amount, method, taxDeductionCode };
}
export type AiIntent =
	| "schedule_appointment"
	| "fill_emk"
	| "parse_patient_document"
	| "manage_prices"
	| "clinical_audit"
	| "imaging_analysis"
	| "patient_communication"
	| "unknown";

export interface AiRouterResult<T> {
	source: "local_algorithm" | "llm_required";
	data?: T;
	suggestedPrompt?: string;
	systemPrompt?: string;
}

/**
 * AI Orchestrator: Smartly routes tasks between fast local parsing and heavy LLM usage.
 * Protects API limits (Local First pattern) and provides rich prompts when LLM is needed.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: automated suppression
export class AiOrchestrator {
	/**
	 * Determine the intent of the text (NLP Routing)
	 */
	static detectIntent(input: string): AiIntent {
		const lower = input.toLowerCase();

		// 0. Check for Price management
		if (
			/(добавь.*в прайс|услугу|цена|стоимость.*руб|прайс)/i.test(lower) &&
			/\d/.test(lower)
		) {
			return "manage_prices";
		}

		// 1. Check for strong temporal markers and booking actions (Schedule Priority)
		const scheduleMatch =
			/(запиш|прием|расписан|запись|перенес|перезапиш|отмен|удали|убери запись)/i.test(
				lower,
			);
		const timeMatch =
			/(на завтра|на сегодня|в \d{1,2}:\d{2}|с \d{1,2}|в \d{1,2} час|на \d{1,2} час|через неделю|послезавтра)/i.test(
				lower,
			);

		// If it has both a patient indicator ("новый пациент", name) + time, or strong booking verb -> It's Schedule
		const isSchedule =
			scheduleMatch ||
			(timeMatch && /(пациент|к врачу|к хирургу|к терапевту|на)/i.test(lower));
		if (isSchedule) return "schedule_appointment";

		// 2. Check for clinical / medical record keywords (EMK)
		const isEmk =
			/(первичный осмотр|создай карту|жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|зуб|экстирпац|пломб|эндо|канал|вскрыл|рентген)/i.test(
				lower,
			);
		// Note: If they mention imaging but it's clearly an EMK dictation, EMK wins unless they explicitly ask for imaging analysis
		const isImagingOnly =
			/(клкт|рентген|панорам|снимок|кист|к\/т|ретенц|мрт)/i.test(lower) &&
			!/(жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|экстирпац|пломб)/i.test(
				lower,
			);

		if (isImagingOnly) return "imaging_analysis";
		if (isEmk) return "fill_emk";

		// 3. Clinical Audit
		if (
			/(проверь карту|аудит|юридическ|косяк|документ|согласи|ошибк|прошлый месяц)/i.test(
				lower,
			)
		)
			return "clinical_audit";

		// 4. Patient Communication
		if (
			/(напиши|напомни|отзыв|телеграм|сообщен|смс|whatsapp|позвони)/i.test(
				lower,
			)
		)
			return "patient_communication";

		// 5. Patient Document Extraction
		if (
			/(паспорт|анкет|выдан|телефон|дата рожден|снилс|инн|фио|полис)/i.test(
				lower,
			)
		)
			return "parse_patient_document";

		return "unknown";
	}

	/**
	 * Route EMK Dictation
	 * Local algorithm first. If it finds tooth or any field, it succeeds. Otherwise fallback to LLM.
	 */
	static processEmkDictation(
		input: string,
	): AiRouterResult<ReturnType<typeof parseVisitDictationLocal>> {
		const localResult = parseVisitDictationLocal(input);
		const hasTooth = localResult.toothUpdates.length > 0;
		const hasEmkFields = !!(
			localResult.emkUpdates.complaint ||
			localResult.emkUpdates.objectiveStatus ||
			localResult.emkUpdates.treatmentPlan ||
			localResult.emkUpdates.diagnosis
		);

		if (hasTooth || hasEmkFields) {
			return { source: "local_algorithm", data: localResult };
		}

		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Medical.StructureEmk(input),
		};
	}

	/**
	 * Route Schedule Booking
	 */
	static processScheduleBooking(
		input: string,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		dashboard: any,
	): AiRouterResult<ReturnType<typeof smartBookingParser>> {
		const localResult = smartBookingParser(input, dashboard);

		// Confident match requires finding an existing patient, a new patient name, OR at least time/date + reason
		if (
			localResult.patientId ||
			localResult.patientName ||
			(localResult.startsAt && localResult.reason)
		) {
			return { source: "local_algorithm", data: localResult };
		}

		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Schedule.AnalyzeNote(input),
		};
	}

	/**
	 * Route Patient Info Extraction
	 */
	static processPatientInfo(
		input: string,
	): AiRouterResult<ReturnType<typeof parsePatientDictationLocal>> {
		const localResult = parsePatientDictationLocal(input);

		if (localResult.fullName || localResult.phone || localResult.birthDate) {
			return { source: "local_algorithm", data: localResult };
		}

		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Patient.ExtractDetails(input),
		};
	}

	/**
	 * Route Price Management Dictation
	 */
	static processPriceDictation(
		input: string,
	): AiRouterResult<ReturnType<typeof parsePriceDictationLocal>> {
		const localResult = parsePriceDictationLocal(input);

		// Confident match requires finding a service name and a price
		if (localResult.serviceName && localResult.price) {
			return { source: "local_algorithm", data: localResult };
		}

		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: `Extract serviceName, price (number), and category from: ${input}`,
		};
	}

	/**
	 * Route Clinical Audit (Pure AI Task)
	 */
	static processClinicalAudit(input: string): AiRouterResult<null> {
		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Medical.ClinicalAudit(input),
		};
	}

	/**
	 * Route Imaging Report Analysis (Pure AI Task)
	 */
	static processImagingAnalysis(input: string): AiRouterResult<null> {
		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Imaging.AnalyzeCTReport(input),
		};
	}

	/**
	 * Route Patient Communication (Pure AI Task)
	 */
	static processPatientCommunication(
		patientName: string,
		recentProcedure: string,
	): AiRouterResult<null> {
		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Marketing.PatientFollowUp(
				patientName,
				recentProcedure,
			),
		};
	}

	/**
	 * Route Marketing Review Generation (Pure AI Task)
	 */
	static processMarketingReview(
		reviewText: string,
		tone: string,
		clinicName: string,
		seoKeys: string[],
	): AiRouterResult<null> {
		return {
			source: "llm_required",
			systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
			suggestedPrompt: Prompts.Marketing.GenerateReviewReply(
				reviewText,
				tone,
				clinicName,
				seoKeys,
			),
		};
	}

	/**
	 * Route Payment / Finance Dictation
	 */
	static processPaymentDictation(
		input: string,
	): AiRouterResult<ReturnType<typeof parsePaymentDictationLocal>> {
		const localResult = parsePaymentDictationLocal(input);
		return {
			source: "local_algorithm",
			data: localResult,
		};
	}

	/**
	 * Parses global voice navigation commands (e.g. view switching, searching, date filtering).
	 */
	static parseGlobalNavigation(input: string): {
		view?: string;
		query?: string;
		date?: string;
		feedbackText: string;
	} {
		const lower = input
			.toLowerCase()
			.trim()
			.replace(/[.,!?]/g, "");

		// 1. Check for search query (e.g. "найди пациента Иванов", "открой карту Петрова")
		const searchMatch = lower.match(
			/^(?:найди|открой|ищи|поиск|найди пациента|открой карту|открой карточку)\s+(.+)$/i,
		);
		if (searchMatch?.[1]) {
			const queryName = searchMatch[1].trim();
			// Capitalize first letter for visual query cleanliness if possible
			const capitalizedQuery =
				queryName.charAt(0).toUpperCase() + queryName.slice(1);
			return {
				view: "patients",
				query: capitalizedQuery,
				feedbackText: `Ищу пациента ${capitalizedQuery}.`,
			};
		}

		// 2. Check view mapping synonyms
		let view: string | undefined;
		let feedbackText = "";

		if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:смен|работу|перв)/i.test(
				lower,
			) ||
			lower === "смена"
		) {
			view = "shift";
			feedbackText = "Открываю смену.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:запис|расписан|календар|очеред)/i.test(
				lower,
			) ||
			/(записи|расписание|календарь)/i.test(lower)
		) {
			view = "schedule";
			feedbackText = "Открываю расписание.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:пациент|карточ)/i.test(
				lower,
			) ||
			lower === "пациенты"
		) {
			view = "patients";
			feedbackText = "Открываю список пациентов.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:сним|рентген|визиогр|клкт|кт)/i.test(
				lower,
			) ||
			/(снимки|рентген|клкт|визиограф)/i.test(lower)
		) {
			view = "imaging";
			feedbackText = "Открываю снимки.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:прием|приём|текущ)/i.test(
				lower,
			) ||
			lower === "прием" ||
			lower === "приём"
		) {
			view = "visit";
			feedbackText = "Открываю текущий прием.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:документ|договор|согласи|справк)/i.test(
				lower,
			) ||
			lower === "документы"
		) {
			view = "documents";
			feedbackText = "Открываю документы.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:оплат|финанс|касс|долг)/i.test(
				lower,
			) ||
			/(оплаты|финансы|касса)/i.test(lower)
		) {
			view = "finance";
			feedbackText = "Открываю финансы.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:связ|сообщен|задач|чат|телеграм)/i.test(
				lower,
			) ||
			lower === "связь" ||
			lower === "сообщения"
		) {
			view = "communications";
			feedbackText = "Открываю связь.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:настройк|профил|клиник)/i.test(
				lower,
			) ||
			lower === "настройки"
		) {
			view = "settings";
			feedbackText = "Открываю настройки.";
		} else if (
			/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:маркетинг|seo|сео|отзыв)/i.test(
				lower,
			) ||
			lower === "маркетинг"
		) {
			view = "marketing";
			feedbackText = "Открываю маркетинг.";
		}

		// 3. Date filtering for Schedule (if view is schedule or active, e.g. "записи на завтра", "расписание сегодня")
		if (
			view === "schedule" ||
			(!view &&
				/(?:запис|расписан|календар|прием|приём|завтра|сегодня|вчера|послезавтра)/i.test(
					lower,
				))
		) {
			const now = new Date();
			const offset = now.getTimezoneOffset();
			const getLocalDateString = (timeMs: number) => {
				return new Date(timeMs - offset * 60 * 1000)
					.toISOString()
					.split("T")[0];
			};

			let dateStr: string | undefined;
			let dateWord = "";

			if (lower.includes("сегодня")) {
				dateStr = getLocalDateString(now.getTime());
				dateWord = "сегодня";
			} else if (lower.includes("завтра")) {
				dateStr = getLocalDateString(now.getTime() + 24 * 60 * 60 * 1000);
				dateWord = "завтра";
			} else if (lower.includes("вчера")) {
				dateStr = getLocalDateString(now.getTime() - 24 * 60 * 60 * 1000);
				dateWord = "вчера";
			} else if (lower.includes("послезавтра")) {
				dateStr = getLocalDateString(now.getTime() + 2 * 24 * 60 * 60 * 1000);
				dateWord = "послезавтра";
			}

			if (dateStr) {
				return {
					view: view || "schedule",
					date: dateStr,
					feedbackText: view
						? `Открываю расписание на ${dateWord}.`
						: `Показываю записи на ${dateWord}.`,
				};
			}
		}

		if (view) {
			return { view, feedbackText };
		}

		return { feedbackText: "" };
	}
}
