# Red Team Inquisition & Purification: Schedule & Appointments Domain

## 1. Контекст и архитектурная цель (Why)
- **Ликвидация бюрократических тупиков и блокировок (Мандат 8e):** Устранены остаточные блокировки кнопок `disabled={...}` в расписании, карточках визитов, листах ожидания и онлайн-заявках (`PendingOnlineBookingsModal.tsx`, `DayConfirmationsTable.tsx`, `WaitlistBookingCard.tsx`, `ArrivedInTreatmentActions.tsx` и др.). Блокировки заменены на non-blocking debounced обработчики с `aria-busy` и тактильной индикацией без отключения кнопок из DOM.
- **Суверенитет соло-врача (Мандат 8n):** В расписании никогда не требуется принудительного выбора ассистента, медсестры или начмеда (все роли опциональны). Запись на острую боль (CITO / Overbooking) всегда разрешена поверх занятых слотов по кнопке «Записать на это время (острая боль)» без запрещающих алертов.
- **Apple HIG Touch Ergonomics на мобильных (390×844):** Расписание на смартфонах выводится в виде вертикальной хронологической повестки дня (Agenda View) с крупным временем слева, цветными маркерами и чипами статусов. Нативные нижние шторки (Bottom Sheets) снабжены тактильным Drag Handle 36×5px (`w-[36px] h-[5px] bg-[var(--line-strong)]`) и тач-таргетами $\ge 44\times 44$px (`pointer-coarse:min-h-[44px]`).
- **Анти-монолит (Мандат 8b):** Монолитный файл `PendingOnlineBookingsModal.tsx` (267 строк) декомпозирован на чистые модули строго $\le 120$ строк:
  - `pendingOnlineBookingsTypes.ts` (16 строк)
  - `pendingOnlineBookingsHelpers.ts` (47 строк)
  - `PendingOnlineBookingCard.tsx` (114 строк)
  - `PendingOnlineBookingsEmptyState.tsx` (17 строк)
  - `PendingOnlineBookingsModal.tsx` (105 строк)

---

## 2. Перечень изменений (What & Where)
- `apps/web/src/components/schedule/PendingOnlineBookingsModal.tsx`: декомпозиция, устранен `disabled={isConfirming}`, добавлены `aria-busy`, debounced клик, `pointer-coarse:min-h-[44px]`.
- `apps/web/src/components/schedule/PendingOnlineBookingCard.tsx`: отдельный модуль карточки онлайн-заявки с быстрыми действиями.
- `apps/web/src/components/schedule/pendingOnlineBookingsHelpers.ts`: форматирование времени, доменные хелперы извлечения имен пациентов и врачей.
- `apps/web/src/components/schedule/pendingOnlineBookingsTypes.ts`: типизированные контракты интерфейса.
- `apps/web/src/components/schedule/PendingOnlineBookingsEmptyState.tsx`: состояние отсутствия ожидающих заявок.
- `apps/web/src/components/schedule/DayConfirmationsTable.tsx`: устранен `disabled` на кнопках «✓ Подтверждён» и «✕ В лист ожидания».
- `apps/web/src/components/schedule/DayConfirmationsPanel.tsx`: устранен `disabled={loading}` на кнопке «Обновить».
- `apps/web/src/components/schedule/WaitlistBookingCard.tsx`: убран `disabled={isBooking}`.
- `apps/web/src/components/schedule/WaitlistCandidateCard.tsx`: убран `disabled={loadingId === item.id}` на кнопках записи и меню.
- `apps/web/src/components/schedule/WaitlistMatchesBlock.tsx`: убран `disabled={loading}` и `disabled={Boolean(bookingId)}`.
- `apps/web/src/components/schedule/WaitlistQuickAddForm.tsx`: убран `disabled={isSubmitting}`.
- `apps/web/src/components/schedule/ScheduleClipboardPanel.tsx`: убран `disabled={loading}` и `disabled={busyId === item.id}`.
- `apps/web/src/components/schedule/appointmentCardActions/ArrivedInTreatmentActions.tsx`: убран `disabled={isQuickStatusUpdating}` на кнопках «В кресло», «+15 мин» и «Завершить».
- `apps/web/src/components/schedule/appointmentCardActions/CancelledNoShowActions.tsx`: убран `disabled={isQuickStatusUpdating}` на кнопках «Восстановить» и «Прибыл».
- `apps/web/src/components/schedule/appointmentCardActions/PlannedConfirmedActions.tsx`: убран `disabled={isQuickStatusUpdating}` на кнопках «Прибыл» и «Начать приём».
- `apps/web/src/components/schedule/appointmentCardModules/AppointmentCardVisualBody.tsx`: убран `disabled={isQuickStatusUpdating}`.
- `apps/web/src/components/schedule/appointmentContextMenu/CancellationMenuSection.tsx`: убран `disabled={isQuickStatusUpdating}` на меню отмены.
- `apps/web/src/components/schedule/appointmentModalModules/AppointmentModalDialog.tsx`: тактильный Drag Handle 36×5px по Apple HIG.
- `apps/web/src/components/schedule/appointmentStatus/AppointmentMobileBottomSheet.tsx`: тактильный Drag Handle 36×5px по Apple HIG.
- `apps/web/src/components/schedule/grid/scheduleMobileSheet/ScheduleMobileSheetHeader.tsx`: тактильный Drag Handle 36×5px по Apple HIG.
- `apps/web/src/components/schedule/__tests__/pendingOnlineBookingsRedTeamInquisition.test.tsx`: Red Team тесты на 0 disabled кнопок, touch targets $\ge 44$px и лимит $\le 120$ строк.

---

## 3. Доказательства работоспособности (Proof & Verification)
1. **Unit & Integration Tests:**
   - Команда: `npx vitest run apps/web/src/components/schedule/`
   - Результат: **83 passed test files, 758 passed tests, 0 failed** (Exit Code 0).
2. **Red Team Visual Proof (4-состояния на живом сервере Vite 127.0.0.1:5173):**
   - ☀️ **PC Light (1440×900):** [`schedule_pc_light.png`](schedule_pc_light.png) — 198 561 байт.
   - 🌙 **PC Dark (1440×900):** [`schedule_pc_dark.png`](schedule_pc_dark.png) — 183 150 байт.
   - 📱 **Mobile Light (390×844):** [`schedule_mobile_light.png`](schedule_mobile_light.png) — 57 550 байт.
   - 📱 **Mobile Dark (390×844):** [`schedule_mobile_dark.png`](schedule_mobile_dark.png) — 57 312 байт.
   - Все 4 скриншота лично открыты через `read_file` и проверены по чек-листу 8 глобальных осей и 12 дефектов UI. Дефектов не обнаружено.
