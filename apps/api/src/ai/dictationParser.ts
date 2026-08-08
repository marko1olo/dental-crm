import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
} from "../speech/keyPool.js";

export type ParserContext = "schedule" | "patient" | "visit";

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

export async function parseDictationWithLLM(
	transcript: string,
	context: ParserContext,
	timeZone?: string | null,
): Promise<any> {
	const modelName = "llama-3.3-70b-versatile";
	const baseUrl = "https://api.groq.com/openai/v1";
	const keyProviderId = "groq_whisper"; // Assuming this key pool has Groq keys

	const systemPrompt = buildDictationSystemPrompt(context, timeZone);

	const requestBody = {
		model: modelName,
		temperature: 0.1,
		response_format: { type: "json_object" },
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
	};

	const triedFingerprints = new Set<string>();
	const maxAttempts = keyRetryLimit(keyProviderId);

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const keyCandidate = selectProviderKey(keyProviderId, triedFingerprints);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		try {
			const response = await fetchWithProviderTimeout(
				`${baseUrl}/chat/completions`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${keyCandidate.value}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
				15000,
			);

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error("LLM Error");

			const content = (payload as any).choices?.[0]?.message?.content;
			if (!content) throw new Error("Empty LLM response");

			let parsed: any;
			try {
				parsed = JSON.parse(content.trim());
			} catch {
				const match = content.match(/\{[\s\S]*\}/);
				if (match) parsed = JSON.parse(match[0]);
				else throw new Error("Invalid JSON");
			}

			recordProviderKeySuccess(keyProviderId, keyCandidate);

			return parsed; // Returning raw parsed JSON from LLM
		} catch (error) {
			recordProviderKeyFailure(keyProviderId, keyCandidate, error);
			if (!shouldTryNextProviderKey(error)) break;
		}
	}

	throw new Error("Не удалось распарсить диктовку через ИИ.");
}
