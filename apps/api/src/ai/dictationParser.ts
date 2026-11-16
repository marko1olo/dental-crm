import { agentRouterClient } from "./agentRouterClient.js";

export type ParserContext = "schedule" | "patient" | "visit";

export interface DictationScheduleResult {
	patientName?: string;
	doctorName?: string;
	date?: string;
	startTime?: string;
	reason?: string;
	note?: string;
}

export interface DictationPatientResult {
	fullName?: string;
	phone?: string;
	birthDate?: string;
	notes?: string;
	email?: string;
}

export interface DictationVisitResult {
	toothUpdates?: Array<{ code: string; state: string }>;
	emkUpdates?: {
		complaint?: string;
		anamnesis?: string;
		objectiveStatus?: string;
		diagnosis?: string;
		treatmentPlan?: string;
	};
}

export type DictationParseResult =
	| DictationScheduleResult
	| DictationPatientResult
	| DictationVisitResult
	| Record<string, unknown>;

/**
 * СЕГОДНЯШНЯЯ ДАТА ДЛЯ ПОДСКАЗКИ МОДЕЛИ — ДЕНЬ КЛИНИКИ, А НЕ ДЕНЬ ПО UTC.
 *
 * ЧТО БЫЛО СЛОМАНО. В подсказку подставлялось
 * `new Date().toISOString().split("T")[0]` — календарный день по UTC. У всех
 * российских поясов смещение положительное, поэтому день по UTC отстаёт от
 * местного каждую ночь: в Москве с 00:00 до 03:00, в Самаре (пояс по умолчанию
 * в схеме клиник) до 04:00, на Камчатке — половину суток. Вечерняя смена
 * работает именно в этом окне.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Врач диктует «запиши на завтра», модель отсчитывает
 * «завтра» от вчерашнего числа и возвращает СЕГОДНЯ. Ошибка приходит из модели
 * уже готовой датой в поле `date`, и проверить её на глаз в тексте ответа
 * нельзя: администратор видит правдоподобную дату и сохраняет запись.
 *
 * Пояс приходит из `clinics.timezone` от вызывающего маршрута. Если пояс
 * неизвестен или не разбирается, берётся местный день СЕРВЕРА — не UTC:
 * сервер клиники стоит в её же поясе куда чаще, чем в нулевом.
 */
export function dictationTodayDate(
	timeZone?: string | null,
	now: Date = new Date(),
): string {
	const pad = (value: number) => String(value).padStart(2, "0");
	const serverCalendarDay = () =>
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	if (!timeZone) return serverCalendarDay();
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
				.formatToParts(now)
				.map((part) => [part.type, part.value]),
		);
		const year = parts.get("year");
		const month = parts.get("month");
		const day = parts.get("day");
		if (!year || !month || !day) return serverCalendarDay();
		return `${year}-${month}-${day}`;
	} catch {
		// Пояс не существует в ICU. Подсказка модели обязана содержать дату, поэтому
		// отказываться нельзя — отдаём день сервера.
		return serverCalendarDay();
	}
}

/**
 * Системная подсказка для разбора диктовки. Вынесена из `parseDictationWithLLM`
 * отдельной функцией, чтобы дату в подсказке можно было проверить прогоном, не
 * обращаясь к внешнему провайдеру.
 */
export function buildDictationSystemPrompt(
	context: ParserContext,
	timeZone?: string | null,
	now: Date = new Date(),
): string {
	if (context === "schedule") {
		return `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные о записи на прием из диктовки и вернуть СТРОГО в формате JSON.
Формат JSON:
{
  "patientName": "Имя пациента",
  "doctorName": "Имя врача",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "reason": "Услуга/Причина",
  "note": "Комментарий"
}
Если данных для поля нет, не добавляйте его. Для вычисления даты сегодня: ${dictationTodayDate(timeZone, now)}. Время переводи в 24ч (например, в 2 часа -> 14:00).`;
	}
	if (context === "patient") {
		return `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные нового пациента из диктовки и вернуть СТРОГО в формате JSON.
Формат JSON:
{
  "fullName": "ФИО (с заглавной буквы)",
  "phone": "Телефон (формат +7...)",
  "birthDate": "YYYY-MM-DD",
  "notes": "Текстовые заметки, жалобы",
  "email": "Электронная почта"
}
Если данных для поля нет, не добавляйте его.`;
	}
	if (context === "visit") {
		return `Вы — AI-ассистент врача-стоматолога. Ваша задача — извлечь данные для ЭМК (электронной медицинской карты) из диктовки врача и вернуть СТРОГО в формате JSON.
Формат JSON:
{
  "toothUpdates": [
    { "code": "номер зуба (напр. 45)", "state": "статус (treatment, missing, watch, planned, done)" }
  ],
  "emkUpdates": {
    "complaint": "Жалобы",
    "anamnesis": "Анамнез",
    "objectiveStatus": "Объективно",
    "diagnosis": "Диагноз по МКБ-10",
    "treatmentPlan": "Проведенное лечение и рекомендации"
  }
}
Если врач упоминает зубы, распределяй их статусы. Кариес/лечение = "treatment", удаление = "missing", наблюдение = "watch". Если данных для поля нет, не возвращайте его в JSON.`;
	}
	return "";
}

/**
 * @deprecated Use canonical agentRouterClient or parseDictationLocally instead.
 * Parses spoken dictation into structured JSON using canonical LLM AgentRouter.
 */
export async function parseDictationWithLLM(
	transcript: string,
	context: ParserContext = "schedule",
	timeZone?: string | null,
): Promise<DictationParseResult> {
	const modelName =
		process.env.DENTAL_DICTATION_MODEL?.trim() || "qwen/qwen3.6-27b";
	const systemPrompt = buildDictationSystemPrompt(context, timeZone);

	try {
		const response = await agentRouterClient.createChatCompletion({
			model: modelName,
			temperature: 0.1,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: `Текст диктовки: "${transcript}"`,
				},
			],
		});

		const content = response.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error("Пустой ответ сервиса распознавания диктовки");
		}

		let parsed: DictationParseResult;
		try {
			parsed = JSON.parse(content.trim()) as DictationParseResult;
		} catch {
			const match = content.match(/\{[\s\S]*\}/);
			if (match?.[0]) {
				parsed = JSON.parse(match[0]) as DictationParseResult;
			} else {
				throw new Error("Некорректный формат JSON в ответе распознавания");
			}
		}

		return parsed;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Не удалось распарсить диктовку через канонический ИИ-роутер: ${msg}`);
	}
}
