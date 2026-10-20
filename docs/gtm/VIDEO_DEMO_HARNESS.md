# DENTE Dental CRM — Exhibition Video & GIF Demo Harness

> **MANDATE COMPLIANCE:** Mandates 8c, 8e, 8k, 8n, 8y, Order 1094n, Apple HIG Touch Ergonomics, 152-FZ & 63-FZ.  
> **PURPOSE:** Studio-grade deterministic Playwright testbed and automated production pipeline for 15–20 second exhibition screencasts and lightweight animated GIFs (< 5 MB) optimized for dental Telegram channels, Stomchats, and GTM sales demonstrations.

---

## 1. Why Visual Screencasts Win Dentists
Practicing clinic owners and dental surgeons do not read lengthy technical specifications. They evaluate dental software in the first **10–15 seconds** based on one simple criterion:
*«Does this eliminate my daily bureaucratic headache in 1 click, or does it force me to click 20 form fields?»*

To prove DENTE superiority without marketing fluff, this automated testbed captures real, un-mocked clinical workflows directly against the live application (`http://127.0.0.1:5173/` on PostgreSQL 18).

---

## 2. Core Technical Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │      LIVE DENTE RUNTIME (Port 5173 / 4100)   │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │      Playwright Video Recorder Suite         │
                    │   (scripts/gtm/demo_video_recorder.cjs)      │
                    ├──────────────────────────────────────────────┤
                    │ • Cubic Bezier Cursor Interpolation (Smooth) │
                    │ • DOM Ripple Effect on Mouse Click           │
                    │ • Exhibition Seed State (showcaseSeedData)   │
                    │ • Mobile Touch Ergonomics (390x844 iPhone)   │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼ Raw WebM Recordings
                            (artifacts/gtm_demos/videos/*.webm)
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │      High-Fidelity FFmpeg Post-Processor     │
                    │   (scripts/gtm/export_telegram_gifs.cjs)     │
                    ├──────────────────────────────────────────────┤
                    │ • Pass A: Optimal Color Palette (palettegen) │
                    │ • Pass B: Bayer Dither + Lanczos (paletteuse)│
                    │ • Universal Web MP4 (H.264 / yuv420p)        │
                    │ • First-Frame High-Res Cover Poster (PNG)    │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         FINAL GTM EXPORT ARTIFACTS           │
                    │       (artifacts/gtm_demos/exports/)         │
                    │   • crisp animated GIF < 5 MB for Telegram   │
                    │   • H.264 MP4 with faststart for web video   │
                    │   • Cover PNG poster for message previews    │
                    └──────────────────────────────────────────────┘
```

---

## 3. The 4 Studio Exhibition Scenarios

### Scenario 1: «Запись на приём за 3 секунды» (Desktop 1920×1080)
- **Target Audience:** Администраторы клиник, старшие регистраторы, соло-врачи.
- **Storyline:**
  1. Курсор плавно наводится на кнопку `+ Запись` в тулбаре расписания.
  2. В выезжающей шторке в 1 клик выбирается срочный пациент с острой болью (Cito Express).
  3. В 1 клик активируется пилюля длительности `[30 мин]`.
  4. Нажимается `Создать запись (Ctrl+Enter)`.
  5. Слот моментально фиксируется в сетке расписания кабинета.
- **Result Video:** `artifacts/gtm_demos/videos/scenario1_quick_booking_3sec.webm`
- **Telegram GIF:** `artifacts/gtm_demos/exports/scenario1_quick_booking_3sec.gif`

---

### Scenario 2: «Удаленное подписание сметы на смартфоне» (Mobile 390×844)
- **Target Audience:** Пациенты, кураторы лечения, финансовые директора клиник.
- **Storyline:**
  1. Пациент открывает защищенную ссылку сметы `#/portal/budget/<token>` на смартфоне.
  2. 2FA подтверждение доступа без паролей (ввод 4 последних цифр номера телефона `1234`).
  3. Плавный скролл сметы имплантации: **Straumann BLX 36**, формирователь, циркониевый абатмент, коронка Prettau (98 000 ₽ со скидкой клиники).
  4. 1-клик штамп ПЭП (простая электронная подпись по 63-ФЗ / 152-ФЗ) либо росчерк на сенсорном Canvas.
  5. Нажатие «Согласовать смету и план лечения в 1 клик».
  6. Мгновенная трансформация экрана в зеленый бейдж `Согласовано` с расчетом SHA-256 хеша целостности.
- **Result Video:** `artifacts/gtm_demos/videos/scenario2_mobile_estimate_signing.webm`
- **Telegram GIF:** `artifacts/gtm_demos/exports/scenario2_mobile_estimate_signing.gif`

---

### Scenario 3: «Выписка рецепта у кресла в 1 клик» (Desktop 1920×1080)
- **Target Audience:** Стоматологи-хирурги, имплантологи, терапевты.
- **Storyline:**
  1. Врач находится в приёме пациента у кресла (ЭМК / Одонтограмма).
  2. Через меню действий открывается «Рецептурный модуль Минздрава РФ (Приказ № 1094н)».
  3. Нажимается 1-клик пресет: «Комплект после удаления / имплантации».
  4. Автоматически комплектуются 3 препарата с латинскими Rp. и точной дозировкой:
     - **Амоксиклав** (Амоксициллин + Клавулановая кислота 875+125 мг)
     - **Нимесил** (Нимесулид 100 мг гран.)
     - **Хлоргексидин** (Раствор 0.05%)
  5. В правой части отображается официальный рецептурный бланк формы № 107-1/у со штампом клиники и личной печатью врача.
- **Result Video:** `artifacts/gtm_demos/videos/scenario3_chairside_prescription_1click.webm`
- **Telegram GIF:** `artifacts/gtm_demos/exports/scenario3_chairside_prescription_1click.gif`

---

### Scenario 4: «Оперативная шторка Copilot (To do)» (Desktop 1920×1080)
- **Target Audience:** Главные врачи, управляющие, ассистенты.
- **Storyline:**
  1. Клик по кнопке ИИ-ассистента `ДЕНТА` в верхней панели клиники (`#topbar-copilot-btn`).
  2. Выезд шторки Copilot в режиме Split-View без перекрытия рабочего стола.
  3. Переключение на вкладку `Задачи` (сводка долгов смены).
  4. Фокус на просроченных рекаллах гигиены и зависших сметах имплантации.
  5. 1-клик отправка напоминания в WhatsApp / запуск сценария дожима.
- **Result Video:** `artifacts/gtm_demos/videos/scenario4_copilot_tasks_drawer.webm`
- **Telegram GIF:** `artifacts/gtm_demos/exports/scenario4_copilot_tasks_drawer.gif`

---

## 4. Humanized Bezier Cursor Motion & Visual Feedback

Для исключения роботизированных рывков мыши внедрена математическая интерполяция:
```javascript
// Кубическая функция плавности
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Движение с дугообразным отклонением траектории (Cubic Bezier curve)
async function smoothMouseMove(page, targetX, targetY, durationMs = 600) {
  // Вычисление нормали к вектору смещения и применение синусоидального изгиба
}
```

Кроме того, в DOM инжектируется визуальный указатель мыши (`#gtm-virtual-cursor`) и динамический круговой ripple-эффект на клик с teal-подсветкой (`#0d9488`), гарантируя читаемость каждого клика на видео.

---

## 5. Инструкция по запуску и экспорту

### Шаг 1: Запуск живых сервисов (если не запущены)
```bash
# Frontend (Vite)
npm --prefix apps/web run dev

# Backend API (Fastify)
npm --prefix apps/api run dev
```

### Шаг 2: Запуск автоматической записи демо-видео
```bash
node scripts/gtm/demo_video_recorder.cjs
```
Файлы `.webm` будут сохранены в `artifacts/gtm_demos/videos/`.

### Шаг 3: Конвертация в MP4, GIF (< 5 МБ) и постеры для Telegram
```bash
node scripts/gtm/export_telegram_gifs.cjs
```
Готовые маркетинговые файлы будут размещены в `artifacts/gtm_demos/exports/`.

---

## 6. Контроль качества (Red Team Quality Gate)
- **Размер файлов:** Все GIF-анимации обязаны быть строго **< 5.0 MB** для плавной отправки и автовоспроизведения в мобильном приложении Telegram.
- **Отсутствие артефактов палитры:** Использование 2-проходного квантования (`palettegen` + `paletteuse=dither=bayer`) устраняет бандинг и «снег» на градиентах.
- **Целостность данных:** Все сценарии оперируют честными данными DENTE CRM (реальные врачи, номенклатура Straumann, Приказ 1094н).
