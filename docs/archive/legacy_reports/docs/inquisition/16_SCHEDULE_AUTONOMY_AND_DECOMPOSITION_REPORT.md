# Отчёт Red Team Инквизиции: Расписание, Быстрая Запись и Декомпозиция Монолитов

> **Статус:** [ПРОВЕРЕНО: ЧИСТО]  
> **Мандаты:** 8b (Anti-Monolith $\le 120$ строк), 8e (Автономия врача), 8n (Суверенитет соло-врача и малой клиники), 8x (Живой язык без канцелярита), 8ap (Запрет законов в коде и шаблонах), 8ze/8al (Apple HIG & 4-State Visual Proof).

---

## 1. Ликвидация номеров законов и бюрократии (Мандаты 8x, 8ap)
- **Удалены псевдо-нормативные алиасы:** `generate152FzSlotOfferMessage` и `generate152FzWaitlistOfferMessage` удалены из экспортов и переведены на чистый доменный язык `generateSlotOfferMessage` и `generateWaitlistOfferMessage`.
- **Теплые клинические шаблоны сообщений:** тексты предложений пациенту избавлены от бюрократии и канцелярита («освободилось удобное время для визита к доктору...»).
- **Очистка каталога услуг в расписании:** из `SelectedServicesSummaryCard.tsx` удален вывод сырого кода `{svc.code804n}`, теперь отображается понятное клиническое наименование процедуры и длительность.
- **Обновлены тесты:** `smartSlotRecovery.test.ts`, `waitlistCancellation.test.ts`, `stageBookingFromTreatmentPlan.test.ts` синхронизированы без регрессий.

---

## 2. Декомпозиция 4 монолитов на модули строго $\le 120$ строк (Мандат 8b)

### Монолит 1: `GridAppointmentMenu.tsx` (был 528 строк $\to$ фасад 91 строка)
- `apps/web/src/components/schedule/gridAppointmentMenu/types.ts` (20 строк)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentClinicalActions.tsx` (108 строк)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentPatientActions.tsx` (88 строк)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentStatusSubmenu.tsx` (61 строка)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentCommunicationSubmenu.tsx` (107 строк)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentRescheduleDuration.tsx` (78 строк)
- `apps/web/src/components/schedule/gridAppointmentMenu/GridAppointmentReassignSection.tsx` (111 строк)
- **Фасад:** `GridAppointmentMenu.tsx` (91 строка)

### Монолит 2: `PatientSearchModal.tsx` (был 572 строки $\to$ фасад 114 строк)
- `apps/web/src/components/schedule/patientSearch/types.ts` (14 строк)
- `apps/web/src/components/schedule/patientSearch/PatientSearchHighlightedParts.tsx` (21 строка)
- `apps/web/src/components/schedule/patientSearch/PatientSearchInputBar.tsx` (51 строка)
- `apps/web/src/components/schedule/patientSearch/PatientQuickCreateToolbar.tsx` (26 строк)
- `apps/web/src/components/schedule/patientSearch/PatientQuickCreateInlineForm.tsx` (93 строки)
- `apps/web/src/components/schedule/patientSearch/PatientSearchResultCard.tsx` (112 строк)
- `apps/web/src/components/schedule/patientSearch/PatientSearchResultsList.tsx` (77 строк)
- **Фасад:** `PatientSearchModal.tsx` (114 строк) — синхронизирован с Wave 45 и 48 тестами (36/36 passing).

### Монолит 3: `FreedSlotsPanel.tsx` (был 513 строк $\to$ фасад 76 строк)
- `apps/web/src/components/schedule/freedSlots/types.ts` (94 строки)
- `apps/web/src/components/schedule/freedSlots/useFreedSlotsReport.ts` (86 строк)
- `apps/web/src/components/schedule/freedSlots/FreedSlotCandidateDispatcher.tsx` (103 строки)
- `apps/web/src/components/schedule/freedSlots/FreedSlotRow.tsx` (43 строки)
- `apps/web/src/components/schedule/freedSlots/FreedSlotsEmptyOrError.tsx` (41 строка)
- **Фасад:** `FreedSlotsPanel.tsx` (76 строк)

### Монолит 4: `useSchedule.ts` (был 749 строк $\to$ фасад 89 строк)
- `apps/web/src/components/schedule/scheduleHooks/useChairSlotsLoader.ts` (61 строка)
- `apps/web/src/components/schedule/scheduleHooks/useChairAssignmentsState.ts` (37 строк)
- `apps/web/src/components/schedule/scheduleHooks/useSingleShiftAssigner.ts` (97 строк)
- `apps/web/src/components/schedule/scheduleHooks/useDateRangeShiftAssigner.ts` (70 строк)
- `apps/web/src/components/schedule/scheduleHooks/useShiftCopyActions.ts` (95 строк)
- `apps/web/src/components/schedule/scheduleHooks/useChairEntityOperations.ts` (77 строк)
- `apps/web/src/components/schedule/scheduleHooks/useAppointmentSlotMovement.ts` (56 строк)
- **Фасад:** `useSchedule.ts` (89 строк) — 15/15 тестов parity passing.

---

## 3. Автономия врача и Rollback Toast (Мандаты 8e, 8n)
- Кнопки быстрых действий, сохранения и отмены не блокируются (`disabled={false}`).
- Добавлен 5-секундный Gmail Rollback Toast при переносе визита, смене статуса и отмене приёма.
- Мягкий овербукинг (`allowOverbooking: true`, `allowEmergencyOverride: true`) при перетаскивании визитов.

---

## 4. 4-State Visual Proof (Мандаты 8ze, 8al)
Сняты и визуально проверены скриншоты:
1. `docs/proofs/schedule/01_schedule_pc_light.png` (164.5 KB, 1440x900) — сетка приёма, статусы, таймлайн.
2. `docs/proofs/schedule/02_schedule_pc_dark.png` (147.6 KB, 1440x900) — темная тема, высокий контраст.
3. `docs/proofs/schedule/03_schedule_mobile_light.png` (145.0 KB, 390x844) — Apple HIG Agenda View, тач-таргеты $\ge 44$px.
4. `docs/proofs/schedule/04_schedule_mobile_dark.png` (144.1 KB, 390x844) — темный мобильный таймлайн.
