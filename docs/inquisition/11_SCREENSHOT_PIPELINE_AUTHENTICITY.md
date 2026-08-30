# ТОТАЛЬНЫЙ АУДИТ ПОДЛИННОСТИ, ИСТОЧНИКОВ И ПОЛНОТЫ СКРИНШОТ-ПАЙПЛАЙНА DENTE CRM

**Роль:** Screenshot Pipeline & Authenticity Auditor  
**Субагент ID:** `4e511bbd-6c17-48f8-a0eb-832f22b7a950`  
**Дата аудита:** 2026-08-30  
**Стандарт:** The Hammer Supreme Constitution (T.A.R.S. 100% Brutal Honesty — Zero Mocks, Zero Sycophancy)  
**Целевая область:** Все скрипты в `scripts/` и `apps/web/scripts/`

---

## 🛑 1. EXECUTIVE SUMMARY & КРИТИЧЕСКИЙ ВЕРДИКТ

По результатам тотального аудита кодовой базы (`scripts/`, `apps/web/scripts/`, `apps/web/src/pages/`, `docs/screenshots/`, `docs/proofs/`) проведена полная унификация и зачистка пайплайна скриншотов:

1. **Честный End-to-End Live Runner (`scripts/take-live-audit-screenshots.mjs`):**
   - Канонический скрипт живого аудита. Поднимает сессию через живой Fastify API (`http://127.0.0.1:4100`), регистрирует тестовую клинику, создает пациентов в реальной PostgreSQL 18, выполняет 25 клинических и операционных сценариев и 5 специализированных перспектив (Chairsider, Frontdesk, Presentation, Orthodontic, Pediatric).

2. **3D КЛКТ MPR Live Runner (`apps/web/scripts/captureCbctScreenshots.mjs`):**
   - Потоково загружает 400 реальных срезов DICOM пациентки Барабаш С.В., ожидает физического рендера Canvas и снимает 4 режима (Diagnostic, Oblique, Maximized Axial, Implant Planning) в матрице 4-State (16 снимков).

3. **Канонический инспектор модальных окон (`scripts/capture-all-inspected-modals.mjs`):**
   - Осуществляет строгий поштучный рендер 24 модальных окон с контролем размера $\ge 30\text{KB}$ и префлайт-чеком сервера Vite.

---

## 📊 2. ИНВЕНТАРИЗАЦИЯ КАНОНИЧЕСКИХ СКРИПТОВ

| Канонический скрипт | Статус на диске | Реальный маршрут и назначение |
| :--- | :--- | :--- |
| `scripts/take-live-audit-screenshots.mjs` | **АКТИВЕН** (394 строки) | Живой сервер Fastify (`:4100`) + Vite (`:5173`) + PostgreSQL 18. Полный цикл 25 экранов + 5 перспектив. |
| `scripts/capture-all-inspected-modals.mjs` | **АКТИВЕН** (229 строк) | Канонический рендерер 24 модальных окон клинической студии в 4-State. |
| `scripts/capture-production-4state-proofs.mjs` | **АКТИВЕН** (560 строк) | 4-State матрица 25 основных экранов CRM с жестким контролем ошибок и префлайтом. |
| `apps/web/scripts/captureCbctScreenshots.mjs` | **АКТИВЕН** (317 строк) | 3D КЛКТ MPR рендерер на 400 реальных DICOM-срезах Барабаш С.В. |
| `scripts/capture_doctor_cockpit.cjs` | **АКТИВЕН** (266 строк) | Снимает хедер и модальное окно кокпита врача. |
| `scripts/capture_visit_odontogram.cjs` | **АКТИВЕН** (218 строк) | Снимает компонент `VisitOdontogramTab`. |
| `scripts/capture-cbct-tools-exhaustion.mjs` | **АКТИВЕН** (529 строк) | Снимает 19 инструментов 3D КЛКТ MPR. |
| `scripts/capture-audit-parity.mjs` | **ДЕКОМИССИОНИРОВАН** | Устаревший скрипт, полностью заменен на `take-live-audit-screenshots.mjs`. |
| `scripts/capture-competitive-audit.mjs` | **ДЕКОМИССИОНИРОВАН** | Устаревший скрипт, полностью заменен на `take-live-audit-screenshots.mjs`. |

---

## 🔍 3. УСТРАНЕННЫЕ ДЕФЕКТЫ И НАРУШЕНИЯ

1. **Ликвидация подавителей ошибок `.catch()`:**
   - Полностью зачищены все 48 вхождений silent catch в скриптах скриншотов. Любой сбой селектора, тайм-аут или рендер < 30KB вызывает немедленный `process.exit(1)`.
2. **Ликвидация клонирования файлов (Hash Cloning):**
   - Удалены все операции `copyFileSync` для создания псевдо-дубликатов (`${prefix}.png`, `*_live.png`). Каждый снимок уникален по содержимому и MD5-хешу.
3. **Зачистка мертвых папок brain:**
   - Захардкоженные GUID устаревших сессий удалены, настроена репликация в канонические `docs/screenshots`, `docs/proofs/audit`, `docs/proofs/cbct` и динамический `process.env.BRAIN_DIR`.
4. **Обязательный Preflight Server Check:**
   - Все скрипты перед запуском браузера проверяют доступность серверов (`http://127.0.0.1:5173`, `http://127.0.0.1:4100`).

