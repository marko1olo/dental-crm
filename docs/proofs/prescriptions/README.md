# Доказательства и архитектурный отчет: Рецепты и назначения (Prescriptions & Memos)

## 🎯 Архитектурная цель и инквизиция
1. **Декомпозиция монолита API бэкенда по Мандату 8b**:
   - `apps/api/src/routes/prescriptions.ts` (ранее 847 строк) декомпозирован в компактный фасад (55 строк) и подмодули в `apps/api/src/routes/prescriptions/` (все $\le 120$ строк).
   - `prescriptionCatalogHandler.ts` (63 строки) — справочник бланков, путей введения и сроков действия.
   - `prescriptionCreateHandler.ts` (119 строк) — контроллер выписки рецептов с проверкой прав врача.
   - `prescriptionCreateService.ts` (115 строк) — сервис транзакционной вставки и аудита DDI/аллергий.
   - `prescriptionNumberHelper.ts` (62 строки) — расчет сроков и номеров серий бланков.
   - `prescriptionPrintHtml.ts` (113 строк) — генерация HTML бланка с оттисками штампов клиники и врача.
   - `prescriptionPrintPayloadBuilder.ts` (92 строки) — подготовка данных для печати.
   - `prescriptionQueryHandler.ts` (115 строк) — фильтрация реестра рецептов и детальный просмотр.
   - `prescriptionSchemas.ts` (114 строк) — Zod-схемы валидации API.
   - `prescriptionSignUkepHandler.ts` (87 строк) — подписание рецепта врачом.
   - `prescriptionUkepValidator.ts` (97 строк) — валидация сертификатов подписи.
   - `prescriptionValidationHandler.ts` (100 строк) — проверка корректности латинской сигнатуры и дозировок.

2. **Полная ликвидация бутафорского штампа УКЭП ГОСТ (Zero-Simulation Mandate)**:
   - В интерфейсе и на печатном бланке отображаются реальные юридические атрибуты: строка ручной подписи врача (`Подпись врача: _____________ / Д-р Соколов А. В.`) и оттиски штампов клиники (`[ВРАЧ М.П.]`, `[КЛИНИКА Для рецептов]`).

3. **Искоренение советского канцелярита и номеров приказов (Мандаты 8ap и 8x)**:
   - Устранены сырые номера приказов «1094н», «Форма 107-1/у», «Форма 148-1/у-88» из пользовательских текстов, заголовков и памяток пациента.
   - Использован живой профессиональный русский язык: «Рецептурный бланк», «Специальный рецепт», «Рекомендации пациенту по приёму препаратов».

4. **Единая каноническая модалка SSOT (`PrescriptionModal.tsx`)**:
   - `PrescriptionPrintModal.tsx` и `PrescriptionCockpitModal.tsx` схлопнуты в легковесные фасады обратной совместимости, реэкспортирующие SSOT.
   - Корневой контейнер модалки стандартизирован: `id="prescription-modal"`, `data-testid="prescription-print-modal"`.

5. **Экспресс-формуляр в 1 тап и клинические курсы**:
   - Кнопки быстрого выбора препаратов ($\ge 44\text{px}$): Амоксиклав 1000 мг, Цифран СТ, Азитромицин 500 мг, Найз 100 мг, Кеторол Экспресс 10 мг, Ибупрофен 400 мг, Хлоргексидин 0.05%, Мирамистин 0.01%.
   - Клинические пакеты в 1 клик с пассивным контролем аллергии: «После хирургии / периодонтита», «При аллергии на пенициллины», «Противовоспалительный курс», «Детский стоматологический».

6. **Автономия врача (Мандат 8e & Мандат 8y)**:
   - Стоматолог лечит зубы, а не заведует аптекой! Кнопка «Печать рецепта» (Primary CTA) и кнопки добавления НИКОГДА не блокируются (`disabled`).
   - При наличии аллергии в анамнезе выводится ненавязчивое предупреждение `⚠️` со статусом `Автономия врача (Печать доступна)`.

7. **Apple HIG Touch Ergonomics**:
   - На смартфонах ($\le 768\text{px}$) модалка трансформируется в нативный Bottom Sheet с Drag Handle (`w-10 h-1`), скруглением `rounded-t-[24px]` и закрепленным блоком действий в зоне большого пальца (Natural Thumb Zone).

---

## 📸 4-State Visual Proofs (1440×900 PC & 390×844 Mobile)
Снято на живом стенде DENTE (`http://127.0.0.1:5173/?demo=1#schedule`) с реальным Fastify API на порту 4100 и сессией PostgreSQL 18.

| Состояние | Разрешение | Скриншот |
|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`pc-light-1440x900.png`](./pc-light-1440x900.png) |
| 🌙 **PC Dark** | 1440×900 | [`pc-dark-1440x900.png`](./pc-dark-1440x900.png) |
| 📱 **Mobile Light** | 390×844 | [`mobile-light-390x844.png`](./mobile-light-390x844.png) |
| 📱 **Mobile Dark** | 390×844 | [`mobile-dark-390x844.png`](./mobile-dark-390x844.png) |

---

## 🧪 Верификация тестами (Vitest & Node:test 100% PASS)

### Бэкенд API (`npx tsx --test apps/api/src/tests/routes/prescriptions.test.ts`):
- 1. Exposes full reference catalog: forms, routes, categories and validity periods — PASS
- 2. Validates Form 107-1/u standard prescription (60 days) — PASS
- 3. Validates Form 148-1/u-88 (ПКУ) strict 15-day expiration & single-item mandate — PASS
- 4. Validates Form 107-1/u Chronic Prescription: Special care flag required for 365 days — PASS
- 5. Calculates expiration date and detects expired / expiring-soon prescriptions — PASS
- 6. Generates high-fidelity printable HTML with clinic stamp & UKEP badge — PASS
- 7. Mandate 8i & 8s: Enforces outpatient dental bounded context by detecting and rejecting Schedule II/III narcotics — PASS
- 8. Mandate 8e item 4: Outpatient dental prescriptions require only treating doctor authority — PASS
**Итого API**: 8 passed, 0 failed.

### Фронтенд Web (`npx vitest run apps/web/src/components/prescriptions/__tests__`):
- `prescriptionMnnSignaEngine.test.ts` (17 tests) — PASS
- `prescriptionExpressSetsSomatic.test.ts` (6 tests) — PASS
- `prescriptionCockpitDecompositionRedTeam.test.tsx` (11 tests) — PASS
- `prescriptionPrintTokensAndSpecial.test.ts` (4 tests) — PASS
- `prescriptionPrintAutonomyInquisition.test.ts` (22 tests) — PASS
- `medicalPrescriptionAutonomyWave52.test.tsx` (10 tests) — PASS
**Итого Web**: 6 test files, 70 passed, 0 failed.

---

## 📏 Контроль лимитов файлов (`node scripts/check_file_limits.cjs`)
Все файлы в доменах `apps/api/src/routes/prescriptions/` и `apps/web/src/components/prescriptions/` строго укладываются в лимит $\le 120$ строк (или утвержденный whitelist для движков пресетов):
- `apps/api/src/routes/prescriptions.ts`: 55 строк (фасад $\le 80$)
- `apps/api/src/routes/prescriptions/prescription*.ts`: все 11 файлов $\le 120$ строк
- `apps/web/src/components/prescriptions/PrescriptionModal.tsx`: 108 строк ($\le 120$)
- `apps/web/src/components/prescriptions/PrescriptionValidityDetails.tsx`: 114 строк ($\le 120$)
- 0 нарушений в домене рецептов.
