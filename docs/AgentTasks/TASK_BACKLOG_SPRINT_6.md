# 📋 СПРИНТ 6: СПЕЦИФИКАЦИЯ И БЭКЛОГ (ФИНАНСОВОЕ СТОРНО, ДОКУМЕНТЫ И МОБИЛЬНАЯ ЭРГОНОМИКА)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [Высшая Конституция THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)  
> **Статус:** **ВЫПОЛНЕНО И ЗАКРЫТО (`ПРОВЕРЕНО`)**  
> **Дата реализации:** 2026-08-03 (Актуализировано: 2026-09-04)  
> **Цель:** Защита клиники от переплат при возвратах (Payroll Refund Clawback), модульность форм документов и мобильная доступность (Touch Targets >= 44px) — все 3 таска внедрены, проверены и закрыты в коде.  
> **Стандарты качества:** Мандаты 8b, 8e, 8g, 8h, 8i, 8k, 8n (Zero Mocks, Doctor Autonomy, Rule != Task, Bounded Context).  

---

## 🗺️ ИЕРАРХИЯ ЗАДАЧ СПРИНТА 6

```
[СПРИНТ 6: ФИНАНСОВОЕ СТОРНО, ДОКУМЕНТЫ И ЭРГОНОМИКА] [ЗАКРЫТО]
   ├── 📌 TASK-6.1: Сторнирование комиссии врача при возвратах (Clawback Payroll Deduction) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-6.2: Модульная форма плана лечения (TreatmentPlanDocumentForm.tsx) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-6.3: Мобильная эргономика и соответствие WCAG 2.1 Touch Targets (>= 44px) [РЕАЛИЗОВАНО]
   └── 🏛️ КОНСТИТУЦИОННЫЙ АУДИТ МАНДАТОВ 8e, 8n (АВТОНОМИЯ ВРАЧА И КАССА 54-ФЗ) [ЗАКРЫТО]
```

---

## 📌 ТАСКИ СПРИНТА 6

### 📌 TASK-6.1: Сторнирование комиссии врача при возвратах (Clawback Payroll Deduction) [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файлы:**
  * [apps/api/src/services/finance/doctorPayouts.ts:404-410, 458](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/finance/doctorPayouts.ts#L404-L410)
  * [apps/api/src/services/finance/doctorPayouts.test.ts:93-120](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/finance/doctorPayouts.test.ts#L93-L120)
- **Проблема:** Если оплата прошла в месяце 1, а частичный или полный возврат оформлен в месяце 2, ведомость месяца 2 не вычитала комиссию за возвращенную услугу, что приводило к переплате клиники врачу.
- **Решение:** В функции `computeDoctorPayout` внедрен строгий расчет чистой выручки `netRevenueRub` с вычетом возвратов и начислением сторно-вычета `refundClawbackRub`:
  ```typescript
  const netRevenueRub = roundMoney(
      new Decimal(input.revenueRub).minus(new Decimal(input.refundRub ?? 0)),
  );
  const accruedRub = percentOfMoney(netRevenueRub, input.commissionPct);
  const refundClawbackRub = input.refundRub && input.refundRub > 0
      ? percentOfMoney(input.refundRub, input.commissionPct)
      : 0;
  ```
  В соответствии с ТК РФ выплата не может уходить в отрицательные значения: `payoutRub = roundMoney(Decimal.max(0, rawPayout))`. При гарантийных работах (`isWarranty: true`) расходы ЗТЛ относятся на рекламационный фонд клиники и не удерживаются с врача.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

### 📌 TASK-6.2: Модульная форма плана лечения (`TreatmentPlanDocumentForm.tsx`) [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файлы:**
  * [apps/web/src/components/documents/forms/TreatmentPlanDocumentForm.tsx:1-342](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/forms/TreatmentPlanDocumentForm.tsx#L1-L342)
  * [apps/web/src/DocumentsView.tsx:64, 2858](file:///C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx#L64)
- **Проблема:** Блок детализации плана лечения (альтернативные планы, этапы, гарантийные обязательства, графическая одонтограмма) загромождал монолит `DocumentsView.tsx`.
- **Решение:** Выделен компонент `TreatmentPlanDocumentForm` со строгим типизированным контрактом пропсов, привязкой к одонтограмме осмотра и печатью с водяным знаком «ЧЕРНОВИК» при незакрытом согласовании.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

### 📌 TASK-6.3: Мобильная эргономика и соответствие WCAG 2.1 Touch Targets (>= 44px) [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файлы:**
  * [apps/web/src/styles/modules/mobile-touch.css:1-186](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/mobile-touch.css#L1-L186)
  * [apps/web/src/styles/main.css:48](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/main.css#L48)
- **Проблема:** На мобильных экранах и планшетах врача кнопки зубной формулы, переключатели тарифов и быстрые действия имели зоны нажатия < 44px, вызывая ошибочные нажатия в медицинских перчатках.
- **Решение:** Внедрены глобальные стили `mobile-touch.css`:
  * Интерактивные зоны `button`, `[role="button"]`, `.quick-chip`, `.tooth-cell` защищены правилом `touch-action: manipulation`.
  * Для тач-устройств (`@media (pointer: coarse)` и `@media (max-width: 768px)`) минимальный размер тач-таргета установлен строго $\ge 44\times 44\text{px}$.
  * Изоляция горизонтального скролла (`overflow-x: hidden`) и учет Safe Area Insets (`env(safe-area-inset-top)`).
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 🏛️ КОНСТИТУЦИОННЫЙ АУДИТ КЛИНИЧЕСКИХ ИНВАРИАНТОВ (МАНДАТЫ 8e, 8n)

1. **Касса 54-ФЗ без палок в колёса (Мандаты 8e, 8n):**
   - [apps/web/src/components/finance/PaymentModal.tsx](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/PaymentModal.tsx) — моментальный прием платежа (наличные, карта, СБП, комбинированная оплата) без обязательного запроса ИНН с физических лиц.
   - [apps/api/src/services/billing/fiscal54fzService.ts:181, 597](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/billing/fiscal54fzService.ts#L181) — фискализация чека в 1 клик с формированием QR ФНС.
   - **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

2. **Свобода скидок врача и гарантийных переделок (Мандат 8e):**
   - Врач имеет право применить скидку вплоть до 100% на переделки и персонал без запроса мастер-пароля администратора.
   - Гарантийные наряды ЗТЛ (`isWarranty: true`) не удерживаются из зарплаты врача, а списываются на гарантийный фонд клиники.
   - **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

3. **Мягкий овердрафт склада и медсестра (Мандаты 8e, 8n):**
   - [apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx:123](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx#L123) — медсестра списывает пустые карпулы анестетиков в 1 клик без создания комиссии из 3 человек.
   - Задержка оприходования накладной не блокирует оказание помощи (мягкий овердрафт с предупреждением вместо отказа).
   - **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

4. **Отклонение бюрократических ограничений:**
   - ❌ Требование ИНН у пациентов при оплате -> `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e, 8n]`.
   - ❌ Создание комиссии из 3 сотрудников для списания каждой ампулы -> `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e]`.
   - ❌ Блокировка операции или списания материалов при нулевом остатке на складе -> `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8e, 8n]`.
