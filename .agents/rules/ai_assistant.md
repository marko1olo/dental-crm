---
description: "DENTE Chairside AI Copilot: solo chairside assistant, clinical tools, token priority, Gemini voice, invariants"
trigger: always_on
---

# DENTE CLINICAL AI COPILOT — МУДРЫЙ СОЛО-АССИСТЕНТ КЛИНИКИ

> 🦷 **SOLO COPILOT:** В софте работает СТРОГО 1 СОЛО-АГЕНТ (0 роев в UI!). Умный клинический советник у кресла.

## 1. ПОВЕДЕНИЕ И ФИЛОСОФИЯ
1. **Автономия врача (8e):** Кнопки («Сохранить», «Печать», «Оплатить») НИКОГДА не `disabled`.
2. **Клинический язык (8x/8zg):** «Медицинская карта приёма», «Дневник приёма», «Прейскурант», «Касса». Ноль `043/у`, `804н`, `54-ФЗ` и «1 клик» в видимом UI.
3. **T.A.R.S.:** Сразу суть — готовый осмотр, смета или статус зуба без сервильности («Конечно!»).
4. **Пассивная безопасность (8y):** Аллергии тихой строкой `⚠️`, Primary CTA всегда разблокирован.
5. **Норма по умолчанию:** Физиологическая норма выставляется одним действием; дебаунс-автосейв на лету.

## 2. КЛИНИЧЕСКИЙ ИНСТРУМЕНТАРИЙ И ГОЛОС
- Зубная формула: `updateToothStatusTool` — FDI (`11–48` / `51–85`) батчем без затирания нормы.
- Расписание: `createAppointmentTool` — слоты без обязательного ассистента (8n).
- Финансы: `createInvoiceDraftTool` — сметы/чеки СТРОГО в копейках (`amountKopecks`, `BIGINT`).
- ЭМК и Печать: `generateForm043Tool` (`clinicalProtocolTool`, внутренний ID без утечки кода в UI) и `printDocumentTool`.
- **Голосовой пайплайн (`useUnifiedDictation.ts`):** Сквозная диктовка для дневников, стенографа, Copilot и `Ctrl+K`. В приоритете реальный облачный пайплайн (**Gemini** / Whisper / SpeechKit с проверкой ключей в health-чеке); браузерный `webkitSpeechRecognition` — строго крайний fallback. На мобильных — нативный `BottomSheetSurface` (`>= 44px`).

## 3. КАРТА КОДА И НАСТРОЙКИ
- Backend: `apps/api/src/ai/harness/` (`systemPromptBuilder.ts`, `swarmRoles.ts`, `toolDispatcher.ts`, `sessionLifecycle.ts`), `apps/api/src/routes/agentRoutes.ts` (`clinicalAiRoutes.ts` через `defineStreamRoute` — `0` удержанных PG TX во время LLM `fetch`!).
- Frontend: `apps/web/src/components/copilot/` (`ChairsideCopilotHUD.tsx`, `CopilotStudioModal.tsx`), `copilotStore.ts`, `useUnifiedDictation.ts`.
- Возможности ИИ: уровень доверия/подтверждения мутаций, живая индикация генерации/записи, история/поиск/память диалогов; на ПК (Desktop Electron) — локальные инструменты файлов/диффов/логов.

## 4. НЕПРИКОСНОВЕННЫЕ ИНВАРИАНТЫ
1. **Авторизация и честные ошибки:** `apiAuthFetch` / клиенты Copilot ОБЯЗАНЫ передавать `staffToken || clinicToken` в `Authorization` (НИКОГДА `clinicToken` первым, иначе `403`!), проверять `res.ok`, не глотать `4xx`/`5xx`.
2. **Чистота кода:** Модули `<= 300–500L`, длина строки `< 240` символов (0 однострочного спагетти!). Токены 8am (`var(--primary)`, `var(--paper)`, `var(--danger)`), 1 Primary CTA.
3. Аллергии/стоп-факторы, FDI, МКБ-10 и `*Kopecks` (`BIGINT`) неприкосновенны; двухфазное `confirmation_required` для мутаций БД.
4. Запрет `setTimeout(1500)`-симуляций и моков: путь реален (`Prompt -> Tool -> Fastify -> PG18 -> UI`); Desktop I/O в вебе возвращает `DESKTOP_DENIED`.
