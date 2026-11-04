# 🚨 MASTER RED TEAM INQUISITION & CLINICAL AI HARNESS REGISTRY

> 🏛️ **CANONICAL SSOT DOSSIER (LIVE SPEC & CODE CO-EVOLUTION — MANDATE 8az):**  
> Полный сквозной реестр дефектов, скрытых симуляций, каргокульта и архитектурного брака клинического ИИ CRM DENTE.  
> 34 верифицированных дефекта, подтверждённых в реальном коде на диске (Exit Code 0, AST-анализ, Playwright).

---

## 📋 СВОДНАЯ СТАТИСТИКА ДЕФЕКТОВ ПО СТЕКУ

| Зона аудита | Всего | Sev 1 (Critical) | Sev 2 (Major) | Sev 3 (Moderate) | Sev 4 (Low) |
|---|---|---|---|---|---|
| **1. Бэкенд Fastify, ReAct-харнесс и тулы** | 12 | 5 | 5 | 2 | 0 |
| **2. Маршрутизатор моделей, каскад SOTA и пул ключей** | 10 | 4 | 3 | 2 | 1 |
| **3. Фронтенд Копайлота, связь с одонтограммой и голос** | 12 | 4 | 5 | 3 | 0 |
| **ИТОГО** | **34** | **13** | **13** | **7** | **1** |

---

## РАЗДЕЛ I: БЭКЕНД FASTIFY, REACT-ХАРНЕСС И ИНСТРУМЕНТЫ

| ID | Область | Sev | Описание дефекта | Файл и строки |
|---|---|---|---|---|
| **AI-REV-01** | Tool Routing / API | **Sev 1** | **Потёмкинская деревня в Fastify**: `/api/v1/copilot/tools/execute` возвращает фейковый `success: true, executed: true`, если тул не найден в `defaultToolRegistry`. Реальный `update_tooth_status` не выполняется, в базу ничего не пишется! | [`clinicalToolRoutes.ts#L371-L379`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot/clinicalToolRoutes.ts#L371-L379) |
| **AI-REV-02** | Frontend Fallback | **Sev 1** | **Симуляция обновления зуба в бою**: `CopilotWorkspaceHost.tsx` при ошибке сети генерирует фальшивый ответ ассистента о якобы обновленном статусе зуба по СтАР без проверки `isDemoShowcaseMode()`. | [`CopilotWorkspaceHost.tsx#L146-L160`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotWorkspaceHost.tsx#L146-L160) |
| **AI-REV-03** | Error Handling | **Sev 1** | **Обрыв детерминированного фолбека**: `agentRouterCore.ts` при исчерпании ключей бросает `Error("AgentRouter exhausted all keys...")`, но `sessionLifecycle.ts` не распознает эту строку и роняет чат с 500 ошибкой вместо запуска локального ReAct! | [`agentRouterCore.ts#L259-L261`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/agentRouterCore.ts#L259-L261), [`sessionLifecycle.ts#L396-L407`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/sessionLifecycle.ts#L396-L407) |
| **AI-REV-04** | Tool Naming | **Sev 1** | **Смертельный мисматч имени инструмента**: Системный промпт и роли велят звать `check_somatic_risks`, а в реестре зарегистрирован `check_somatic_risks_and_contraindications`. Вызов падает с `TOOL_NOT_FOUND`. | [`systemPromptBuilder.ts#L96`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/systemPromptBuilder.ts#L96), [`somaticScreeningTool.ts#L87`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/calculatorModules/somaticScreeningTool.ts#L87) |
| **AI-REV-05** | Prompt / Context | **Sev 1** | **Зубной склероз (Tooth Blindness)**: `activeTooth` передается с фронта и валидируется Zod, но в `sessionLifecycle.ts` не пробрасывается в `buildAgentSystemPrompt`. Модель не знает выбранный зуб врача! | [`sessionLifecycle.ts#L43-L71`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/sessionLifecycle.ts#L43-L71), [`systemPromptBuilder.ts#L23-L31`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/systemPromptBuilder.ts#L23-L31) |
| **AI-REV-06** | Frontend Chat | **Sev 2** | **Одноразовая память чата**: `CopilotStudioModal.tsx` шлет в `POST /api/agent/chat` массив строго из 1 сообщения `[{ role: "user", content: query }]`. Вся история беседы отрезается, многошаговый диалог сломан. | [`CopilotStudioModal.tsx#L150-L157`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L150-L157) |
| **AI-REV-07** | Prompt / Context | **Sev 2** | **Потеря ID визита (`activeVisitId`)**: `activeVisitId` есть в контексте Fastify, но `systemPromptBuilder.ts` не выводит его в текст системного промпта. Модель не может привязать карту к текущему приему. | [`systemPromptBuilder.ts#L64-L67`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/systemPromptBuilder.ts#L64-L67) |
| **AI-REV-08** | Tool Schemas | **Sev 2** | **Жесткие схемы тулов ломают вызовы LLM**: В `updateToothStatusTool`, `createAppointmentTool`, `createInvoiceDraftTool` параметры `patientId` и `doctorId` строго обязательны в Zod, вместо мягкого фолбека на `context.patientId`/`context.doctorId`. | [`updateToothStatusTool.ts#L14`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/databaseModules/updateToothStatusTool.ts#L14), [`createAppointmentTool.ts#L12-L13`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/databaseModules/createAppointmentTool.ts#L12-L13) |
| **AI-REV-09** | Model Routing | **Sev 2** | **Мертвый код `resolveEffectiveKeys` и блокировка Gemini**: `resolveEffectiveKeys` нигде не вызывается. Все Gemini-модели принудительно идут через AgentRouter прокси без прямого Google API. | [`modelAdapters.ts#L260`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/modelAdapters.ts#L260), [`modelAdapters.ts#L286-L287`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/modelAdapters.ts#L286-L287) |
| **AI-REV-10** | Finance / Math | **Sev 2** | **Расчет сметы во float**: `createInvoiceDraftTool.ts` считает промежуточные суммы через `item.priceRub * quantity` с плавающей точкой JS, нарушая Мандат 8n о расчете строго в целочисленных копейках `amountKopecks`. | [`createInvoiceDraftTool.ts#L49-L55`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/databaseModules/createInvoiceDraftTool.ts#L49-L55) |
| **AI-REV-11** | Prompt / Slang | **Sev 3** | **Каргокульт роя IDE и мультяшные эмодзи**: Дефолтный промпт содержит «Ты — Верховный Клинический Оркестратор L1» и запрещенные эмодзи `🩻`, `📞`, `📋`, `💳`, нарушая Мандат 8d pt 7 и закон о Соло-Копайлоте. | [`swarmRoles.ts#L28-L95`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/swarmRoles.ts#L28-L95) |
| **AI-REV-12** | Clinical Naming | **Sev 3** | **Советский канцелярит в коде и ответах**: Имя инструмента `generate_form_043_entry`, заголовок `(ФОРМА № 043/У)` в протоколе и строка `(готовность к 54-ФЗ)` в чеке нарушают Мандат 8x о живом языке врача. | [`clinicalProtocolTool.ts#L84,L92`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/calculatorModules/clinicalProtocolTool.ts#L84), [`createInvoiceDraftTool.ts#L103`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/dentalTools/databaseModules/createInvoiceDraftTool.ts#L103) |

---

## РАЗДЕЛ II: МАРШРУТИЗАТОР МОДЕЛЕЙ, КАСКАД SOTA И ПУЛ КЛЮЧЕЙ

| ID | Область | Sev | Описание дефекта | Файл и строки |
|---|---|---|---|---|
| **ROUTER-01** | Fault Tolerance | **Sev 1** | **Срыв фолбека на локальный ReAct движок**: При 429 Rate Limit или HTTP 402 модель падает с `AgentRouter exhausted all keys...` или `AgentRouterModelOverloadedError`. Однако `isKeyOrAuthError` в `sessionLifecycle.ts` ищет точные строки и пропускает их, сваливаясь в 500 ошибку. | [`sessionLifecycle.ts#L396-L425`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/sessionLifecycle.ts#L396-L425), [`agentRouterCore.ts#L259-L262`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/agentRouterCore.ts#L259-L262) |
| **ROUTER-02** | Security | **Sev 1** | **Хардкод реальных API-ключей в кодовой базе**: В `routerTypes.ts` в открытом виде зашиты два реальных боевых ключа `sk-6osQfoRXk...` и `sk-LhzyJtJx...`, используемые как дефолтный пул. Нарушение инварианта безопасности. | [`routerTypes.ts#L21-L24`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/routerTypes.ts#L21-L24) |
| **ROUTER-03** | Key Rotation | **Sev 1** | **Мертвый код ротации `GOOGLE_API_KEYS`**: `AgentRouterClient` инициализирует пул только из `AGENTROUTER_API_KEYS`. Функция `resolveEffectiveKeys` нигде не вызывается. Ключи `GOOGLE_API_KEYS` и `GEMINI_API_KEYS` из `.env` полностью игнорируются! | [`agentRouterCore.ts#L52-L57`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/agentRouterCore.ts#L52-L57), [`modelAdapters.ts#L260-L269`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/modelAdapters.ts#L260-L269) |
| **ROUTER-04** | SOTA Cascade | **Sev 1** | **Отсутствие каскада моделей при выбивании тира (30-минутный паралич сессии)**: `clinicalModelRouter.ts` жестко возвращает `gemini-3.6-flash`. При HTTP 402 модель банится на 1800 сек, после чего ВСЕ последующие запросы врача на операции и визиографию гарантированно крашатся без перехода на `gemini-3.5-flash` или Groq `llama-3.3-70b-versatile` / `qwen`. | [`clinicalModelRouter.ts#L106-L136`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/clinicalModelRouter.ts#L106-L136), [`agentRouterCore.ts#L90-L101`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/agentRouterCore.ts#L90-L101) |
| **ROUTER-05** | Routing | **Sev 2** | **Блокировка прямого Gemini API в `modelAdapters.ts`**: Проверка `!defaultBaseUrl.includes("agentrouter.org")` сделала `isGemini` всегда `false`. Прямое обращение к Google API заблокировано. | [`modelAdapters.ts#L286-L288`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/modelAdapters.ts#L286-L288) |
| **ROUTER-06** | BYOK | **Sev 2** | **Загрязнение глобального пула сервера персональными ключами врача**: При сбое запроса с личным ключом врача (`params.apiKey`) вызывается `this.keyPool.noteKeyFailure(key)`, что заносит персональный ключ врача в глобальный пул синглтона. | [`agentRouterCore.ts#L189-L213`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/agentRouterCore.ts#L189-L213) |
| **ROUTER-07** | Observability | **Sev 2** | **Псевдо-маскирование `maskApiKey(turnErr.message)`**: Функция `maskApiKey` обрезает строку ошибки до 5 символов и приписывает `agentrouter...`. В результате полезное сообщение об ошибке уничтожается. | [`sessionLifecycle.ts#L390-L394`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/harness/sessionLifecycle.ts#L390-L394), [`keyPoolManager.ts#L16-L21`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/keyPoolManager.ts#L16-L21) |
| **ROUTER-08** | Validation | **Sev 3** | **Отсутствие провайдера `groq` в валидаторе ключей Fastify**: В Zod-схеме `/api/agent/validate-key` провайдер `groq` отсутствует. `validateUniversalApiKeyLive` шлет Anthropic и Groq ключи на URL `api.openai.com`. | [`agentRoutes.ts#L258-L264`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/agentRoutes.ts#L258-L264), [`modelAdapters.ts#L199-L201`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/modelAdapters.ts#L199-L201) |
| **ROUTER-09** | Stale Tiers | **Sev 3** | **Устаревшие модели в тестах и тарифах**: В тестах и `telemetryAuditor.ts` сохраняются тарифы `gpt-3.5-turbo`, `claude-3-haiku`, `gemini-1.5-flash`, `gemini-2.5-flash`. | [`agentHarness.test.ts#L96`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/agentHarness.test.ts#L96), [`telemetryAuditor.ts#L93-L122`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/agent/telemetryAuditor.ts#L93-L122) |
| **ROUTER-10** | Chairside SLA | **Sev 4** | **Опасный дефолтный таймаут 120 секунд для Chairside Fast**: При подвисании шлюза вызов висит до 120 секунд на попытку вместо мгновенного переключения в локальный детерминированный режим (<1-2 сек). | [`routerTypes.ts#L26`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/routerTypes.ts#L26) |

---

## РАЗДЕЛ III: ФРОНТЕНД КОПАЙЛОТА, МОСТ С ОДОНТОГРАММОЙ И ГОЛОС

| ID | Область | Sev | Описание дефекта | Файл и строки |
|---|---|---|---|---|
| **DEF-FRONT-01** | Voice Engine | **Sev 1** | **Бесконечный цикл зависания вкладки при ошибках микрофона**: Если микрофон заблокирован (`NotAllowedError`), `rec.onerror` вызывает `rec.onend`, который безусловно делает `rec.start()`. Вкладка браузера намертво виснет с 100% CPU. | [`voiceEngine.ts#L201-L211`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/voice/voiceEngine.ts#L201-L211) |
| **DEF-FRONT-02** | Voice Input | **Sev 1** | **Затирание набранного вручную текста первой же голосовой фразой**: Врач набирает текст, включает микрофон — `useEffect` безусловно делает `setInputText(voice.fullText)`, полностью уничтожая всё ранее набранное врачом! | [`CopilotStudioModal.tsx#L101-L103`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L101-L103) |
| **DEF-FRONT-03** | Odontogram Bridge | **Sev 1** | **Двойное монтирование и намертво зашитый зуб 36 / Иванов в `DirectCopilotLauncher`**: `DirectCopilotLauncher` слушает событие `dente:open-copilot` с хардкодным зубом 36 и пациентом "Иванов И.И.", перекрывая реальный приём врача. | [`DirectCopilotLauncher.tsx#L44,L68-L76`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/DirectCopilotLauncher.tsx#L44) |
| **DEF-FRONT-04** | Odontogram Bridge | **Sev 2** | **Изоляция сторов: клик по зубу в карточке визита не доходит до Копайлота**: Селектор зубов визита пишет в `visitStore.activeToothNumber`, а копайлот слушает ТОЛЬКО `appStore.activeTooth`. Копайлот оперирует устаревшим зубом. | [`useCopilotContextSyncHook.ts#L15`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/contextSync/useCopilotContextSyncHook.ts#L15), [`useVisitToothHandlers.ts#L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/view/viewStateModules/useVisitToothHandlers.ts#L75) |
| **DEF-FRONT-05** | Event Bus | **Sev 2** | **Разрыв шины `dente-apply-soap-protocol`**: Кнопка Primary CTA всегда шлет захардкоженный кариес K02.1, а обработчик `useSoapProtocolEventListener` игнорирует `detail.tooth`, блокируя обновление одонтограммы. | [`CopilotStudioModal.tsx#L211-L216`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L211-L216), [`useSoapProtocolEventListener.ts#L44`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/toothSync/useSoapProtocolEventListener.ts#L44) |
| **DEF-FRONT-06** | Mock Leak / API | **Sev 1** | **Симуляция успеха инструментов Fastify API в бою**: При сетевой ошибке блок `catch` логирует `status: "success"` с фейковыми `40ms` и показывает тост «Успешно сохранено», хотя в PostgreSQL ничего не записалось. | [`CopilotStudioModal.tsx#L218-L229`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L218-L229) |
| **DEF-FRONT-07** | Mock Leak | **Sev 2** | **Утечка фейкового пациента "Иванов И.И." при пустом боевом приёме**: Дефолт `patientName = "Иванов Иван Иванович"` подставляется всегда, когда пациент не выбран, вместо честного «Пациент не выбран». | [`CopilotStudioModal.tsx#L60-L61`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L60-L61) |
| **DEF-FRONT-08** | SSE Streaming | **Sev 2** | **Утечка сырого тега `<<<SUGGESTIONS: [...]>>>` во время стриминга**: Пока не прилетел закрывающий токен `>>>`, сырой кусок тега рендерится прямо в сообщении у врача на глазах. | [`CopilotStudioModal.tsx#L40-L47`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L40-L47) |
| **DEF-FRONT-09** | SSE Streaming | **Sev 2** | **Хрупкость SSE-буфера при CRLF и потеря завершающего чанка**: Разделитель `\n\n` не ловит `\r\n\r\n`, а при `done === true` хвост буфера выбрасывается без обработки. | [`CopilotStudioModal.tsx#L167-L176`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L167-L176) |
| **DEF-FRONT-10** | State Persistence | **Sev 2** | **Испарение истории сообщений при закрытии шторки**: Функция `saveThreadMessages` нигде не вызывается. При закрытии модалки весь диалог врача бесследно стирается. | [`CopilotStudioModal.tsx#L64`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L64) |
| **DEF-FRONT-11** | Apple HIG | **Sev 3** | **Интерактивные кнопки мельче 44×44px**: Кнопка "Стоп" записи речи (26px), кнопки "Отклонить" и "Применить" (32px), кнопки истории (28px). Врач в перчатках промахивается. | [`CopilotStudioModal.tsx#L291,L345`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx#L291) |
| **DEF-FRONT-12** | Apple HIG / Fake CoT | **Sev 3** | **Десктопная 4-колоночная таблица на 390px и фейковый CoT текст**: Таблица на 600px требует горизонтального скролла на смартфонах; `CopilotThinkingIndicator` выводит захардкоженный текст размышлений про кариес K02.1 при пустом ответе модели. | [`CopilotSettingsCapabilitiesTable.tsx#L68`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/settings/CopilotSettingsCapabilitiesTable.tsx#L68), [`CopilotThinkingIndicator.tsx#L22`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotThinkingIndicator.tsx#L22) |

---

## 🛠️ ГЕНЕРАЛЬНЫЙ ПЛАН УСТРАНЕНИЯ ДЕФЕКТОВ ПО ВОЛНАМ

### Волна 1: Ликвидация критических блокеров и симуляций (Sev 1)
1. **DEF-FRONT-01**: Устранить бесконечный цикл `onerror -> onend -> rec.start()` в `voiceEngine.ts`.
2. **DEF-FRONT-02**: Защитить ручной черновик от стирания голосом в `CopilotStudioModal.tsx`.
3. **AI-REV-01 & DEF-FRONT-06**: Подключить реальный `executeDentalTool` в `clinicalToolRoutes.ts`, вырезать фейковые `status: "success"` из `executeApiTool`.
4. **AI-REV-03 & ROUTER-01**: Починить перехват ошибок исчерпания ключей в `sessionLifecycle.ts`, гарантировать мгновенный запуск `runDeterministicClinicalFallback`.
5. **ROUTER-02 & ROUTER-03**: Вырезать сырые ключи из `routerTypes.ts`, подключить пул `GOOGLE_API_KEYS` через `resolveEffectiveKeys`.
6. **ROUTER-04**: Внедрить каскад моделей SOTA (Gemini 3.6 Flash $\to$ Gemini 3.5 Flash $\to$ Groq / Qwen) с проверкой бана.
7. **AI-REV-04**: Зарегистрировать алиас `check_somatic_risks` в `normalizeToolName`.
8. **AI-REV-05 & DEF-FRONT-03**: Пробросить `activeTooth` в системный промпт, изолировать `DirectCopilotLauncher`.

### Волна 2: Мост одонтограммы, память и валидация (Sev 2)
1. **DEF-FRONT-04**: Объединить чтение выбранного зуба: `useAppStore.activeTooth ?? useVisitStore.activeToothNumber`.
2. **DEF-FRONT-05**: Исправить шину `dente-apply-soap-protocol`: читать `detail.tooth` и брать диагноз из `actionProposal`.
3. **AI-REV-06 & DEF-FRONT-10**: Передавать скользящее окно истории на бэкенд и сохранять сообщения в `saveThreadMessages`.
4. **AI-REV-08**: Сделать `patientId` и `doctorId` опциональными в схемах Zod с мягким фолбеком на `context`.
5. **AI-REV-10**: Перевести расчет сметы в `createInvoiceDraftTool.ts` строго на целочисленные копейки `amountKopecks`.
6. **DEF-FRONT-08 & 09**: Экранировать незавершенный тег `<<<SUGGESTIONS:` при стриминге, поддержать CRLF в буфере.

### Волна 3: Эргономика Apple HIG, чистый клинический язык (Sev 3..4)
1. **DEF-FRONT-11**: Довести все кнопки подтверждения и контролов до $\ge 44\times 44$px.
2. **AI-REV-11 & AI-REV-12**: Заменить «Верховный Оркестратор L1» на «Единый клинический советник», вырезать мультяшные эмодзи и канцелярит («043/у», «54-ФЗ»).
3. **DEF-FRONT-12**: Трансформировать 4-колоночную матрицу возможностей в карточки на экранах $\le 640$px, убрать фейковый CoT текст.
