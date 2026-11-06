# 🤖 DENTE AI COPILOT & WORKSTATION HARNESS TEST REGISTRY

> 🏛️ **SSOT И СТАНДАРТ ТЕСТИРОВАНИЯ ИИ-АССИСТЕНТА:**  
> Канонический реестр верификации соло-копайлота DENTE CRM и Workstation-Харнесса по Конституции [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md), Мандатам 8e (автономия врача), 8n (соло-практика), 8x (клинический язык без канцелярита) и 8z (запрет моков).
> 
> 🎯 **СТРОГО ОДИН МУДРЫЙ СОЛО-АГЕНТ:**  
> Внутри софта клиники работает ровно один умный chairside copilot за плечом врача (ноль внутренних роев и микро-агентов внутри софта).

---

## 1. СТРУКТУРА ТЕСТОВОГО СЬЮТА (`copilotAutonomousHarness.test.ts`)

- **Путь к тесту:** [`apps/api/src/ai/__tests__/copilotAutonomousHarness.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/__tests__/copilotAutonomousHarness.test.ts)
- **Команда запуска:** `npx tsx --test apps/api/src/ai/__tests__/copilotAutonomousHarness.test.ts`
- **Время выполнения:** $\le 6$ секунд (Strict Gate: $\le 10$ с).
- **Результат прогона:** **17 passed, 0 failed (100% PASS)**.

```mermaid
flowchart TD
    Prompt["Врач: 'Кариес 36 зуба, наложи коффердам и изолирующую прокладку'"] --> GuardCheck{"Проверка уровня доверия"}
    GuardCheck -->|cautious| BlockAll["Блокировка всех тулов ➔ 2-Phase Guard Confirmation"]
    GuardCheck -->|supervised (Default)| ReadWriteCheck{"Тип инструмента"}
    ReadWriteCheck -->|READ: search, EMR| AutoExec["Автоматическое выполнение без задержки"]
    ReadWriteCheck -->|WRITE: update_tooth, appointment| GuardPrompt["2-Phase Guard: Требуется подтверждение врача"]
    GuardCheck -->|autonomous| AutoAll["Авто-выполнение всех тулов + аудит-лог событий"]
    GuardPrompt -->|Врач: '✓ Применить в карту'| DbWrite["Запись в PostgreSQL 18 + история изменений"]
    GuardPrompt -->|Врач: 'Отклонить'| SafeRollback["Детерминированная отмена без повреждения данных"]
```

---

## 2. КАТАЛОГ ПРОВЕРЯЕМЫХ ИНВАРИАНТОВ

| № | Инвариант | Тестовый блок | Результат |
| :--- | :--- | :--- | :--- |
| **1** | **Маскирование секретов API** | `1.1 Masking prevents secret leakage` | **PASS** (`sk-***cdef`, `gsk_***5678`, `agentrouter...7890`) |
| **2** | **Round-Robin ротация ключей** | `1.2 Round-Robin selects keys in sequence` | **PASS** (детерминированная ротация alpha ➔ beta ➔ gamma ➔ alpha) |
| **3** | **429 Cooldown & Failover** | `1.3 429 Rate Limit places key on cooldown` | **PASS** (авто-переключение на здоровый ключ из пула) |
| **4** | **Exhausted Pool Guard** | `1.4 Exhausted pool throws explicit error` | **PASS** (`AgentRouterAllKeysExhaustedError` с `availableInMs`) |
| **5** | **Авто-восстановление ключей** | `1.5 noteKeySuccess resets failure count` | **PASS** (сброс счетчика сбоев при успехе) |
| **6** | **Режим Осторожный (Параноик)** | `2.1 Cautious Mode (confirm_all)` | **PASS** (блокирует даже read-инструменты для подтверждения) |
| **7** | **Режим Под наблюдением (Дефолт)** | `2.2 Supervised Mode (balanced)` | **PASS** (read без ожидания, destructive через 2-Phase Guard) |
| **8** | **Режим Автономный (Суперагент)** | `2.3 Autonomous Mode` | **PASS** (мгновенное применение по Мандату 8e + живой аудит) |
| **9** | **Валидация зубной формулы FDI** | `3.1 update_tooth_status FDI validation` | **PASS** (11–48 и 51–85 валидны, зубы вне диапазона отклоняются) |
| **10** | **Суверенитет соло-врача (8n)** | `3.2 create_appointment no forced assistant` | **PASS** (бронь слота без обязательного ассистента) |
| **11** | **Чистый клинический язык (8x)** | `3.3 generate_clinical_protocol SOAP` | **PASS** (ноль канцелярских номеров, дневник приёма SOAP) |
| **12** | **Изоляция Web vs Desktop** | `4.1 Web mode refuses desktop OS tools` | **PASS** (`DESKTOP_DENIED` при попытке запуска софта из браузера) |
| **13** | **Штатный вызов CRM-поиска** | `4.2 Web mode executes CRM tools` | **PASS** (каталог услуг и цен СтАР доступен в вебе) |

---

## 3. СОПУТСТВУЮЩИЕ ТЕСТЫ AI HARNESS

Дополнительно в контуре проверены и дают 100% PASS:
- `apps/api/src/ai/desktopSystemTools.test.ts` — 15 passed (системные тулы ПК, чтение DICOM, запуск Romexis, скриншот ROI).
- `apps/web/src/components/copilot/__tests__/copilotTriEnvironmentSettings.test.tsx` — 17 passed (Zustand стор, переключение 3 уровней доверия, таймер фаз анализа).
- `apps/api/src/ai/agentHarness.test.ts` — 5 passed (базовый ReAct цикл, AbortController, защита от зацикливания).
- `apps/api/src/ai/clinicalModelRouter.test.ts` — 6 passed (маршрутизация задач, классификатор сложности, валидатор ключей).
- `apps/api/src/ai/dentalTools.test.ts` — 9 passed (каталог прейскуранта, расчет анестезии, одонтограмма).

---

## 4. 4-СОСТОЯТЕЛЬНЫЙ ВИЗУАЛЬНЫЙ ПРУФ (RED TEAM 4-STATE PROOF)

Все скриншоты сняты на живом приложении (`http://127.0.0.1:5173/`), размер каждого $\ge 40$ КБ:

| Состояние | Файл скриншота | Размер | Проверенные инварианты |
| :--- | :--- | :--- | :--- |
| ☀️ **PC Light (1440×900)** | [`01_copilot_studio_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/01_copilot_studio_pc_light_1440x900.png) | 59.4 КБ | 0 клиппинга, 1 Primary CTA «✓ Применить в карту», карточка 2-Phase Guard |
| 🌙 **PC Dark (1440×900)** | [`02_copilot_studio_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/02_copilot_studio_pc_dark_1440x900.png) | 57.8 КБ | 100% тёмные токены, WCAG AAA контраст, ноль слепящих белых пятен |
| 📱 **Mobile Light (390×844)** | [`03_copilot_studio_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/03_copilot_studio_mobile_light_390x844.png) | 45.8 КБ | Bottom Sheet с Drag Handle 36×5px, тач $\ge 44\times 44$px, Natural Thumb Zone |
| 🌙 **Mobile Dark (390×844)** | [`04_copilot_studio_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/04_copilot_studio_mobile_dark_390x844.png) | 44.7 КБ | Тёмный Bottom Sheet, Apple Segmented Control, 0px горизонтального скролла |
| ⚙️ **Настройки доверия PC** | [`11_copilot_settings_trust_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/copilot/11_copilot_settings_trust_pc_light_1440x900.png) | 76.8 КБ | 3 уровня доверия (Параноик / Под наблюдением / Суперагент) + Auto-Approve |
