import { fetchWithProviderTimeout, keyRetryLimit, selectProviderKey, recordProviderKeySuccess, recordProviderKeyFailure, shouldTryNextProviderKey } from "../speech/keyPool.js";
export async function parseDictationWithLLM(transcript, context) {
    const modelName = "llama-3.3-70b-versatile";
    const baseUrl = "https://api.groq.com/openai/v1";
    const keyProviderId = "groq_whisper"; // Assuming this key pool has Groq keys
    let systemPrompt = "";
    if (context === "schedule") {
        systemPrompt = `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные о записи на прием из диктовки и вернуть СТРОГО в формате JSON.
Формат JSON:
{
  "patientName": "Имя пациента",
  "doctorName": "Имя врача",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "reason": "Услуга/Причина",
  "note": "Комментарий"
}
Если данных для поля нет, не добавляйте его. Для вычисления даты сегодня: ${new Date().toISOString().split("T")[0]}. Время переводи в 24ч (например, в 2 часа -> 14:00).`;
    }
    else if (context === "patient") {
        systemPrompt = `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные нового пациента из диктовки и вернуть СТРОГО в формате JSON.
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
    else if (context === "visit") {
        systemPrompt = `Вы — AI-ассистент врача-стоматолога. Ваша задача — извлечь данные для ЭМК (электронной медицинской карты) из диктовки врача и вернуть СТРОГО в формате JSON.
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
    const requestBody = {
        model: modelName,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: `Текст диктовки: "${transcript}"`
            }
        ]
    };
    const triedFingerprints = new Set();
    const maxAttempts = keyRetryLimit(keyProviderId);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const keyCandidate = selectProviderKey(keyProviderId, triedFingerprints);
        if (!keyCandidate)
            break;
        triedFingerprints.add(keyCandidate.fingerprint);
        try {
            const response = await fetchWithProviderTimeout(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${keyCandidate.value}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }, 15000);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error("LLM Error");
            const content = payload.choices?.[0]?.message?.content;
            if (!content)
                throw new Error("Empty LLM response");
            let parsed;
            try {
                parsed = JSON.parse(content.trim());
            }
            catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match)
                    parsed = JSON.parse(match[0]);
                else
                    throw new Error("Invalid JSON");
            }
            recordProviderKeySuccess(keyProviderId, keyCandidate);
            return parsed; // Returning raw parsed JSON from LLM
        }
        catch (error) {
            recordProviderKeyFailure(keyProviderId, keyCandidate, error);
            if (!shouldTryNextProviderKey(error))
                break;
        }
    }
    throw new Error("Не удалось распарсить диктовку через ИИ.");
}
