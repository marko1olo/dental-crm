# ТОТАЛЬНЫЙ АУДИТ ПОДЛИННОСТИ, ИСТОЧНИКОВ И ПОЛНОТЫ СКРИНШОТ-ПАЙПЛАЙНА DENTE CRM

**Роль:** Screenshot Pipeline & Authenticity Auditor  
**Субагент ID:** `4e511bbd-6c17-48f8-a0eb-832f22b7a950`  
**Дата аудита:** 2026-08-30  
**Стандарт:** The Hammer Supreme Constitution (T.A.R.S. 100% Brutal Honesty — Zero Mocks, Zero Sycophancy)  
**Целевая область:** Все 22 скрипта в `scripts/` и `apps/web/scripts/`

---

## 🛑 1. EXECUTIVE SUMMARY & КРИТИЧЕСКИЙ ВЕРДИКТ

По результатам тотального аудита кодовой базы (`scripts/`, `apps/web/scripts/`, `apps/web/src/pages/`, `docs/screenshots/`, `docs/proofs/`) выявлена глубокая архитектурная дифференциация пайплайна верификации на **три несовместимых парадигмы**:

1. **Синтетическая standalone-песочница (`ClinicalModalsStudioStandalone.tsx` / `OdontogramStudioStandalone.tsx`):**
   - **~60% скриншот-скриптов** снимают экраны НЕ из живой CRM, а из изолированного стенда (`#clinical-modals-studio`, `#odontogram-studio`).
   - Данные жестко захардкожены в статический мок-контекст `mockStudioAppLogicValue` (пациент «Смирнова Е.В.», картонные приемы `apt-1`/`apt-2`, статические сметы). Бэкенд Fastify и PostgreSQL 18 в этом контуре не участвуют вовсе.
   - **Плюс:** Позволяет моментально отрендерить и проверить CSS-верстку/темы 24+ тяжелых модалок без поднятия БД.
   - **Минус (Нарушение Конституции):** Не доказывает работоспособность компонентов внутри реального дерева React `AppShell` и привязку к реальным API-хэндлерам.

2. **Гибридный `AppShell` с перехватом API (`page.route` mocks):**
   - Ряд скриптов (`apps/web/scripts/capture_4state.mjs`, `captureCopilotScreenshots.mjs`) открывают реальные роуты (`/#schedule`, `/#visit`, `/#finance`), но подменяют ответы сервера через `page.route('**/api/...', ...)` на статические JSON.

3. **Честный End-to-End Live Runner (`take-live-audit-screenshots.mjs`):**
   - Единственный скрипт, поднимающий полноценную сессию через живой Fastify API (`http://127.0.0.1:4100`), регистрирующий тестовую клинику, создающий пациентов в реальной PostgreSQL 18 и авторизующийся через токены.

---

## 📊 2. ИНВЕНТАРИЗАЦИЯ СКРИПТОВ ИЗ ДОКУМЕНТАЦИИ

| Скрипт из ТЗ | Физический статус на диске | Реальный маршрут и назначение |
| :--- | :--- | :--- |
| `scripts/capture_doctor_cockpit.cjs` | **ЕСТЬ НА ДИСКЕ** (266 строк) | `http://127.0.0.1:5173/#clinical-modals-studio?modal=doctor_shift_cockpit`. Снимает хедер и модальное окно кокпита врача. |
| `scripts/capture_visit_odontogram.cjs` | **ЕСТЬ НА ДИСКЕ** (218 строк) | `http://127.0.0.1:5173/?modal=visit_odontogram#clinical-modals-studio`. Снимает компонент `VisitOdontogramTab`. |
| `scripts/capture-cbct-tools-exhaustion.mjs` | **ЕСТЬ НА ДИСКЕ** (529 строк) | `http://127.0.0.1:5173/?standalone=clinical-modals-studio`. Снимает 19 инструментов 3D КЛКТ MPR на реальных 150 DICOM срезах. |
| `scripts/capture-audit-parity.mjs` | **ОТСУТСТВУЕТ НА ДИСКЕ** | Фантомная ссылка из устаревшей документации / удален в прошлых ревизиях. |
| `scripts/capture-competitive-audit.mjs` | **ОТСУТСТВУЕТ НА ДИСКЕ** | Фантомная ссылка из устаревшей документации. |
| `scripts/capture-all-proofs.mjs` | **ОТСУТСТВУЕТ ПОД ЭТИМ ИМЕНЕМ** | Реальный канонический скрипт называется `scripts/capture-all-inspected-modals.mjs`. |

---

## 🔍 3. КРИТИЧЕСКИЕ ДЕФЕКТЫ И НАРУШЕНИЯ В СКРИПТАХ

1. **Запрещенные подавители ошибок `.catch()`:**
   - Обнаружено **48 вхождений `.catch(() => {})`** в Playwright-скриптах (`scripts/capture-all-inspected-modals.mjs`, `apps/web/scripts/captureCbctScreenshots.mjs`). При падении рендера модалки скрипт молча делает скриншот белого экрана/ошибки 500 и рапортует об успехе с кодом 0!
2. **Клонирование файлов (Hash Cloning):**
   - Скрипты `capture-production-4state-proofs.mjs` и `capture-squad-a-proofs.mjs` дублируют `${prefix}_pc_dark.png` в `${prefix}.png`, создавая идентичные файлы с одинаковыми MD5-хешами.
3. **Хардкод устаревших путей прошлых сессий:**
   - В скриптах захардкожены пути к мертвым папкам `brain/0284cf50-...`, `brain/46a0d6d1-...`.

---

## 🛠️ 4. ПЛАН ОЗДОРОВЛЕНИЯ СКРИНШОТ-ПАЙПЛАЙНА

1. **Принять за золотой стандарт Live-скриншотов:** `scripts/take-live-audit-screenshots.mjs` — он регистрирует реальную клинику через Fastify, заносит патологии в PostgreSQL 18 и делает снимки в честном 4-State.
2. **Принять за золотой стандарт CBCT-скриншотов:** `apps/web/scripts/captureCbctScreenshots.mjs` — загружает 400 реальных DICOM-файлов и снимает 4 режима во всех 4 состояниях.
3. **Зачистить `.catch()`:** Исключить тихое подавление ошибок во всех Playwright-скриптах; при любом сбое селектора скрипт обязан падать с `process.exit(1)`.
4. **Удалить фантомные имена из документации:** Исключить упоминания `capture-audit-parity.mjs` и `capture-competitive-audit.mjs`.
