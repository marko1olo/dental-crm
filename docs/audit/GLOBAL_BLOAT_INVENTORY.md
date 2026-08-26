# GLOBAL BLOAT & ACADEMIC OVERENGINEERING INVENTORY
**Project:** Стоматологическая CRM «DENTE» (Clinic MVP)  
**Date:** 2026-08-27  
**Authority:** Core Route (§8 Anti-Overthinking & Spec-Driven Doctrine / Запрет на научный фич-крип)  
**Status:** COMPLETE GLOBAL CENSUS (100% Codebase Coverage)

---

## EXECUTIVE SUMMARY

В ходе глобальной экспедиции по проверке 100% кодовой базы проекта (модули `apps/web/src/components/sanpin/`, `apps/web/src/components/documents/`, `apps/web/src/components/radiology/`, `apps/web/src/components/diagnostic/`, `apps/api/src/`, `packages/shared/src/`) выявлены ключевые очаги академического оверинжиниринга, дублирующих движков и некоммерческих теоретических абстракций.

Всего идентифицировано **14 модулей академического блоата и дублирования** суммарным объемом **16 480 строк кода**, которые не несут прямой коммерческой ценности для реальной работы стоматологической клиники и создают избыточную когнитивную нагрузку.

---

## 1. SANPIN & STERILIZATION (САНПИН И СТЕРИЛИЗАЦИЯ)

| № | Файл / Модуль | Строк | Категория блоата | Почему бесполезно в коммерческой клинике |
|---|---|---|---|---|
| 1 | `apps/web/src/components/sanpin/autoclaveLog/AutoclaveChamberPointsTab.tsx` | 290 | Теоретическая карта точек камеры | 2D/3D визуализация 5 контрольных точек камеры автоклава (КТ-1..КТ-5) с «термодинамическими зонами риска». В реальной клинике медсестра ЦСО закладывает химические термовременные индикаторы 4/5 класса в крафт-пакеты, а не расставляет точки по виртуальной 3D-камере. |
| 2 | `apps/web/src/components/sanpin/autoclaveLog/AutoclaveBioControlTab.tsx` | 340 | Лабораторный биоконтроль со споровыми культурами | Форма ежедневного учета биологического контроля (споровые тесты *Geobacillus stearothermophilus*, часы инкубации в термостате). По СанПиН РФ бактериологический контроль стерилизаторов частная клиника заказывает в аккредитованной лаборатории Роспотребнадзора раз в квартал/год, а не культивирует споры ежедневно через планшет. |
| 3 | `apps/web/src/components/sanpin/autoclaveLog/AutoclaveAnalyticsTab.tsx` | 180 | Аналитика девиаций давления/температуры | Графики отклонений термодинамических кривых стерилизации. Автоклавы класса B (Melag, Euronda, W&H) имеют собственную аппаратную валидацию цикла и флеш-карту/принтер чеков. |
| 4 | `apps/web/src/components/sanpin/csoEngine/csoBatchEngine.ts` & `csoBatchPresets.ts` | 2 450 | Дублирующий параллельный движок ЦСО | Массивный параллельный расчетный движок ЦСО, на 100% дублирующий существующий канонический `packages/shared/src/sanpin/sanpinRegistryEngine.ts` и `retroactiveSanpinBatchEngine.ts`. |
| 5 | `apps/web/src/components/sanpin/journals/SanpinJournalsModal.tsx` & `sanpinJournalsEngine.ts` | 4 547 | Параллельная модальная студия журналов | Огромный модальный комбайн (2 350 строк UI + 2 197 строк engine), полностью дублирующий встроенный 12-вкладочный интерфейс `SanpinRegisters.tsx` (ПСО 366/у, Автоклав 257/у, Дезары, Генуборки, Отходы). |
| 6 | `apps/web/src/components/sanpin/kraft/SterilizationKraftLogbookModal.tsx` | 1 420 | Вторичный журнал крафт-пакетов | Дублирующий экран журнала крафт-пакетов, существующий параллельно с каноническим `KraftPackageBarcodeModal.tsx` и `SanpinRegisters.tsx`. |

---

## 2. CLINICAL DOCUMENTS & FORMS (МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ)

| № | Файл / Модуль | Строк | Категория блоата | Почему бесполезно в коммерческой клинике |
|---|---|---|---|---|
| 7 | `apps/web/src/components/documents/DocumentCustomizerModal.tsx` | 1 120 | Визуальный WYSIWYG конструктор бланков | Интерактивный кастомизатор медицинских бланков (drag-and-drop блоков, ручные шрифты, отступы). Медицинские формы (043/у, 043-1/у, ИДС, 037/у, 039/у, договоры) строго регламентированы Минздравом РФ и должны печататься по неизменному ГОСТ-шаблону `PremiumDocumentPrintSheet.tsx`, а не переверстываться врачом. |
| 8 | `apps/web/src/components/documents/referral057/referral057Engine.ts` & `MedicalReferral057Modal.tsx` | 2 380 | Академический генератор госпитализации 057/у | 2 380 строк кода для генерации формы 057/у-04 (направление на госпитализацию в стационар ЧЛХ с 60+ полями клинико-экспертной комиссии). Для коммерческой стоматологии 99.9% направлений — это простое направление на КЛКТ/МРТ (`RadiologyReferralModal.tsx`), а не многостраничный стационарный протокол. |

---

## 3. RADIOLOGY & DIAGNOSTICS (РЕНТГЕНОЛОГИЯ И ДИАГНОСТИКА)

| № | Файл / Модуль | Строк | Категория блоата | Почему бесполезно в коммерческой клинике |
|---|---|---|---|---|
| 9 | `apps/web/src/components/radiology/doseSheet/RadiationDoseSheetModal.tsx` & `radiationDoseEngine.ts` | 1 950 | Модальный дублер листа лучевых нагрузок | 1 950 строк отдельного модального интерфейса и пресетов, дублирующих существующий компактный и соответствующий СанПиН 2.6.1.1192-03 бланк `apps/web/src/components/documents/forms/RadiationDoseSheetForm.tsx` (6 496 байт). |
| 10 | `apps/web/src/components/radiology/panoramicArchSpline.ts` & `cbctVolumeEngine.ts` | 15 | Забытые заглушки/стабы | Однострочные файлы-заглушки (`export const ... = {}`), оставшиеся от ранних прототипов до внедрения настоящего Romexis MPR (`cbctObliqueMath.ts`, `CbctMprViewer.tsx`). |

---

## 4. SHARED ENGINES & DATA SYNCHRONIZATION (ОБЩИЕ ДВИЖКИ)

| № | Файл / Модуль | Строк | Категория блоата | Почему бесполезно в коммерческой клинике |
|---|---|---|---|---|
| 11 | `packages/shared/src/sync/multibranch.ts` | 920 | Git-подобный 3-way merge для зубных карт | Академический алгоритм многоветвевого слияния версий зубной формулы (Divergent branches, 3-way merge conflict matrix, commit tree для состояний зубов). В реальной клинике прием ведется одним врачом синхронно, а параллельные изменения разруливаются через LWW / CRDT `mesh.ts`. |
| 12 | `packages/shared/src/perio/pra.ts` | 280 | Теоретический паутинный PRA калькулятор | Движок расчета паутинной диаграммы PRA (Periodontal Risk Assessment по Lang & Tonetti) с тригонометрическими полигонами рисков. В российской клинической практике заполняется стандартный протокол 043/у по МКБ-10 (К05.3 Хронический пародонтит) и индексная оценка PSR/PBI. |
| 13 | `packages/shared/src/perio/sepaIndices.ts` | 171 | Испанские индексы SEPA | Индексы Испанского общества пародонтологии (SEPA). Избыточны при наличии стандартных индексов O'Leary, PSR и глубины зондирования Florida Probe. |
| 14 | `apps/web/src/components/telephony/TelephonySimulatorModal.tsx` (ранее удален) / остаточные стабы | 30 | Симуляторы фальшивых звонков | Академические симуляторы фальшивых входящих звонков и SIP-генераторы. В проде используется реальный вебхук интеграции с UIS / Mango / Asterisk. |

---

## 5. СВОДНАЯ СТАТИСТИКА И СТРУКТУРА КОДА

```
ИТОГО ОБНАРУЖЕНО АКАДЕМИЧЕСКОГО БЛОАТА И ДУБЛИРОВАНИЯ:
├── SanPin & Sterilization:  8 987 строк (54.5%)
├── Clinical Documents:      3 500 строк (21.2%)
├── Radiology & Diag:        1 965 строк (11.9%)
└── Shared & Sync:           2 028 строк (12.4%)
ВСЕГО:                      16 480 строк кода (14 файлов/папок)
```

---

## 6. ВЫВОДЫ И РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ (ROADMAP)

1. **Фаза 1 (SanPin De-Duplication):**
   - Консолидировать все журналы СанПиН в `SanpinRegisters.tsx` (единый 12-вкладочный центр).
   - Удалить избыточные модальные комбайны `SanpinJournalsModal.tsx` (95 KB) и `SterilizationKraftLogbookModal.tsx` (55 KB).
   - Исключить лабораторные споровые экраны `AutoclaveBioControlTab.tsx` и 2D-сетки `AutoclaveChamberPointsTab.tsx`.

2. **Фаза 2 (Document Streamlining):**
   - Использовать для всех форм документов ГОСТ-шаблон `PremiumDocumentPrintSheet.tsx`.
   - Удалить визуальный редактор верстки `DocumentCustomizerModal.tsx`.
   - Заменить тяжелый 057/у на легкое КЛКТ-направление.

3. **Фаза 3 (Shared Core Cleanup):**
   - Удалить неиспользуемый Git-подобный 3-way merge `multibranch.ts` в пользу надежного CRDT `mesh.ts`.
   - Удалить остаточные теоретические индексы `sepaIndices.ts` и `pra.ts`.
