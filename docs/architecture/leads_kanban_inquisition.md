# Инквизиция воронки первичных обращений и канбана лидов (Leads CRM Funnel)

## 1. Архитектурная цель и контекст (Why)
- **Консолидация стилей**: Устранена фрагментация из 18 разрозненных микро-CSS файлов в `apps/web/src/components/leads/styles/`. Все правила канбана, разворота колонок, мобильной ленты и модальных окон объединены в единый SSOT-файл `apps/web/src/components/leads/leadsKanban.css` с применением дизайн-токенов (`var(--paper)`, `var(--ink)`, `var(--line)`).
- **Ликвидация аудио-муляжей (Мандаты 8e / 8n)**: Устранены псевдо-компоненты и заброшенные canvas/hook-реализации плеера звонков. `LeadAudioPlayerWidget.tsx` переведен на честный нативный HTML5 элемент `<audio controls preload="metadata">` с отображением стенограммы входящего звонка и поддержкой тестируемых атрибутов `data-testid="lead-audio-play-btn"`.
- **Бесшовная 1-клик конверсия лида в расписание (Мандат 8e / 8n)**:
  - Пациент и запись создаются без бюрократических стопперов (без обязательного ввода СНИЛС или паспорта).
  - Контекст лида (источник UTM, имя, телефон, жалобы/комментарии) автоматически передается в `pendingStageBooking` через расширенный `PendingBookingInfo`.
  - В расписании врач и кресло сразу видят источник обращения и исходные заметки администратора.
- **Мобильная эргономика Apple HIG (390×844)**:
  - Сенсорные зоны `Touch Target >= 44x44px` для кнопок быстрого звонка, чата и записи на прием в `LeadsMobileFeedView.tsx`.
  - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
- **Единый дизайн-код CTA (Мандат 8am)**:
  - Ровно ОДНА Primary CTA кнопка на экране («+ Новое обращение»).
  - Вторичные действия карточки канбана («Записать на приём») переведены в аккуратный `secondary-button` с акцентной рамкой `border-[var(--teal)]`, исключая визуальную конкуренцию.

---

## 2. Ключевые компоненты и файлы (What & Where)
- `apps/web/src/components/leads/leadsKanban.css` — каноническая консолидированная таблица стилей (1640+ строк).
- `apps/web/src/components/leads/leadsMobileFeed.css` — легкий фасад-импорт канонических стилей.
- `apps/web/src/components/leads/LeadAudioPlayerWidget.tsx` — нативный HTML5 аудио-плеер записей звонков с поддержкой тултипов стенограмм.
- `apps/web/src/components/leads/card/LeadCardActionButtons.tsx` — вторичное акцентное оформление кнопки быстрой записи.
- `apps/web/src/components/leads/kanbanView/useLeadBookingNavigation.ts` — обогащение `pendingStageBooking` источником и комментариями.
- `apps/web/src/components/leads/kanbanView/useLeadConvertModalSubmit.ts` & `useLeadScheduleHandlers.ts` — проброс данных лида в буфер расписания.
- `apps/web/src/components/leads/styles/` — папка удалена (18 устаревших микро-CSS файлов).

---

## 3. Доказательства работоспособности (Proof & Verification)
1. **Тесты компонентов**:
   - `npx --prefix apps/web vitest run src/components/leads` -> **9 test files passed, 129 passed, Exit Code 0**.
2. **Проверка кодировок**:
   - `npm run check:encoding` -> **14620 файлов проверено, 0 замечаний, Exit Code 0**.
3. **TypeScript**:
   - `npx tsc -p apps/web/tsconfig.json --noEmit` -> в директории `src/components/leads/` **0 ошибок**.
4. **Визуальный пруф (4-State Screenshots на живом dev-сервере)**:
   - ☀️ `docs/proofs/leads/leads_kanban_live_pc_light.png` (1440×900)
   - 🌙 `docs/proofs/leads/leads_kanban_live_pc_dark.png` (1440×900)
   - ☀️ `docs/proofs/leads/leads_convert_modal_pc_light.png` (модалка конверсии, светлая)
   - 🌙 `docs/proofs/leads/leads_convert_modal_pc_dark.png` (модалка конверсии, тёмная)
   - 📱 `docs/proofs/leads/leads_mobile_live_light.png` (390×844)
   - 📱 `docs/proofs/leads/leads_mobile_live_dark.png` (390×844)
