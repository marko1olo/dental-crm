# Доказательства и архитектурный отчет: Рецепты и назначения (Prescriptions & Memos)

## 🎯 Архитектурная цель и инквизиция
1. **Полная ликвидация бутафорского штампа УКЭП ГОСТ (Zero-Simulation Mandate)**:
   - Удалены `PrescriptionUkepGostStamp.tsx` и `usePrescriptionUkepSigner.ts`.
   - В интерфейсе и на печатном бланке отображаются реальные юридические атрибуты: строка ручной подписи врача (`Подпись врача: _____________ / Д-р Соколов А. В.`) и оттиски штампов клиники (`[ВРАЧ М.П.]`, `[КЛИНИКА Для рецептов]`).
2. **Искоренение советского канцелярита и номеров приказов (Мандаты 8ap и 8x)**:
   - Устранены сырые номера приказов «1094н», «Форма 107-1/у», «Форма 148-1/у-88» из пользовательских текстов, заголовков и памяток пациента.
   - Использован живой профессиональный русский язык: «Рецептурный бланк», «Специальный рецепт», «Рекомендации пациенту по приёму препаратов».
3. **Единая каноническая модалка SSOT (`PrescriptionModal.tsx`)**:
   - `PrescriptionPrintModal.tsx` и `PrescriptionCockpitModal.tsx` схлопнуты в легковесные фасады обратной совместимости, реэкспортирующие SSOT.
   - Корневой контейнер модалки стандартизирован: `id="prescription-modal"`, `data-testid="prescription-print-modal"`.
4. **Экспресс-формуляр в 1 тап и клинические курсы**:
   - Кнопки быстрого выбора препаратов ($\ge 44\text{px}$): Амоксиклав 1000 мг, Цифран СТ, Азитромицин 500 мг, Найз 100 мг, Кеторол Экспресс 10 мг, Ибупрофен 400 мг, Хлоргексидин 0.05%, Мирамистин 0.01%.
   - Клинические пакеты в 1 клик с пассивным контролем аллергии: «После хирургии / периодонтита», «При аллергии на пенициллины», «Противовоспалительный курс», «Детский стоматологический».
5. **Автономия врача (Мандат 8e)**:
   - Кнопка «Печать рецепта» (Primary CTA) и кнопки добавления НИКОГДА не блокируются (`disabled`).
   - При наличии аллергии в анамнезе выводится ненавязчивое предупреждение `⚠️` со статусом `Автономия врача (Печать доступна)`.
6. **Apple HIG Touch Ergonomics**:
   - На смартфонах ($\le 768\text{px}$) модалка трансформируется в нативный Bottom Sheet с Drag Handle (`w-10 h-1`), скруглением `rounded-t-[24px]` и закрепленным блоком действий в зоне большого пальца.

---

## 📸 4-State Visual Proofs (1440×900 PC & 390×844 Mobile)

| Состояние | Разрешение | Скриншот |
|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`01_prescription_modal_pc_light.png`](./01_prescription_modal_pc_light.png) |
| 🌙 **PC Dark** | 1440×900 | [`02_prescription_modal_pc_dark.png`](./02_prescription_modal_pc_dark.png) |
| 📱 **Mobile Light** | 390×844 | [`03_prescription_modal_mobile_light.png`](./03_prescription_modal_mobile_light.png) |
| 📱 **Mobile Dark** | 390×844 | [`04_prescription_modal_mobile_dark.png`](./04_prescription_modal_mobile_dark.png) |

---

## 🧪 Верификация тестами (Vitest Exit Code 0)
- `apps/web/src/components/prescriptions/__tests__/prescriptionMnnSignaEngine.test.ts` (17 tests) — PASS
- `apps/web/src/tests/prescriptionGenerator.test.ts` (11 tests) — PASS
- `apps/web/src/tests/PrescriptionPrintModal.test.ts` (2 tests) — PASS
- `apps/web/src/components/prescriptions/__tests__/prescriptionExpressSetsSomatic.test.ts` (6 tests) — PASS
- `apps/web/src/components/prescriptions/__tests__/prescriptionCockpitDecompositionRedTeam.test.tsx` (11 tests) — PASS
- `apps/web/src/components/prescriptions/__tests__/medicalPrescriptionAutonomyWave52.test.tsx` (10 tests) — PASS
- `apps/web/src/components/prescriptions/__tests__/prescriptionPrintAutonomyInquisition.test.ts` (26 tests) — PASS

**Итого**: 7 test files, 83 passed, 0 failed.
