import { fetchWithProviderTimeout, getProviderKeyPoolSummary, keyRetryLimit, selectProviderKey, recordProviderKeySuccess, recordProviderKeyFailure, shouldTryNextProviderKey } from "../speech/keyPool.js";

export type ParserContext = "schedule" | "patient" | "visit";

export async function parseDictationWithLLM(transcript: string, context: ParserContext): Promise<any> {
  const modelName = "llama-3.3-70b-versatile";
  const baseUrl = "https://api.groq.com/openai/v1";
  const keyProviderId = "groq_whisper"; // Assuming this key pool has Groq keys

  let systemPrompt = "";

  if (context === "schedule") {
    systemPrompt = `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные о записи на прием из диктовки и вернуть СТРОГО в формате JSON.
Вы должны определить интент (намерение) пользователя.
Возможные интенты ("intent"): 
- "CREATE" (Создать/записать на прием)
- "CANCEL" (Отменить прием)
- "RESCHEDULE" (Перенести прием)
- "NOTE" (Просто оставить заметку/комментарий к пациенту)
- "UNKNOWN" (Непонятно)

Если интент относится к расписанию (CREATE, CANCEL, RESCHEDULE), попытайтесь извлечь:
- "dateStr": дата в формате YYYY-MM-DD. Сегодняшняя дата: ${new Date().toISOString().split("T")[0]}. Вычислите правильную дату относительно сегодня.
- "timeStr": время в формате HH:MM (например, "14:30"). Если сказано "в 2 часа", верните "14:00".
- "patientName": ФИО пациента (только имя, без мусора). Очистите от слов вроде "запиши", "отмени", "пожалуйста".
- "service": стоматологическая услуга (например, "Профессиональная гигиена", "Лечение кариеса", "Удаление зуба", "Консультация", "Снимки").

Если интент NOTE, верните текст заметки в поле "note", а также "patientName" (если упомянуто).
Если данных нет, не добавляйте поле.`;
  } else if (context === "patient") {
    systemPrompt = `Вы — AI-ассистент администратора стоматологии. Ваша задача — извлечь данные нового пациента из диктовки и вернуть СТРОГО в формате JSON.
Извлеките следующие поля:
- "fullName": полное имя пациента с заглавной буквы (например "Иванов Иван Иванович"). Очистите от мусора ("запиши", "новый пациент").
- "phone": номер телефона в формате +79991234567. Очистите от пробелов, скобок, тире. Если начинается с 8, замените на +7.
- "birthDate": дата рождения в формате YYYY-MM-DD. Если год указан двумя цифрами, логически определите век (например 90 -> 1990, 15 -> 2015).
- "notes": любые дополнительные текстовые заметки (пометки, комментарии, жалобы, аллергии).
Если данных нет, не добавляйте поле.`;
  } else if (context === "visit") {
    systemPrompt = `Вы — AI-ассистент врача-стоматолога. Ваша задача — извлечь данные для ЭМК (электронной медицинской карты) из диктовки врача и вернуть СТРОГО в формате JSON.
Извлеките следующие поля (текстом, в профессиональном медицинском стиле):
- "complaints": жалобы пациента.
- "objectiveStatus": объективный статус, что видит врач при осмотре.
- "diagnosis": диагноз (по МКБ-10, если врач назвал).
- "treatment": проведенное лечение и рекомендации.
- "toothCodes": массив строк (например ["45", "46"]), если врач упомянул конкретные номера зубов.
Если врач говорит сбивчиво, логично распределите его речь по этим полям. Если данных для поля нет, не возвращайте его.`;
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
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        },
        15000
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
