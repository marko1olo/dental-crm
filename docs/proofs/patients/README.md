# Patient Studio SSOT & Express Registration Proofs (Mandates 8b, 8e, 8n, 8am, 8ap, Apple HIG)

## 🏛️ Каноническая консолидация Patient Studio Modal SSOT

Каноническая студия пациентов `PatientStudioModal.tsx` консолидирована в единый монолитный мастер-компонент в пределах проектного Sweet Spot (436 строк, диапазон 400–480 строк per Mandate 8b / 8zi), ликвидировав искусственное расчленение на микро-файлы и разорванный стейт:

- **`PatientStudioModal.tsx`** (436 строк) — каноническая студия: экспресс-регистрация за 10 секунд (только ФИО + телефон по Мандату 8e), соматическая норма в 1 клик («✓ Соматически здоров / Интактные зубы»), единый семейный кошелек родственников с погашением долгов в 1 клик (Мандат 8n), 0 float-ошибок (целочисленные `balanceKopecks`), ровно 1 Primary CTA кнопка `#0d9488` (`var(--teal)`), которая НИКОГДА не блокируется (`disabled={false}`).
- **`DirectPatientStudioLauncher.tsx`** (64 строки, Sweet Spot 60–80 строк) — единый автономный лаунчер, слушающий хэши `#patients`, `#patient-studio`, `#patient-card`, `#express-patient`, параметры URL `?patients=1`, `?patient_studio=1` и кастомные события `dente:open-patients`, `dente:open-patient-studio`.
- **`styles/patientStudio.css`** (319 строк, Sweet Spot 250–350 строк) — чистые стили в стиле Apple iOS Contacts, нативный Bottom Sheet на мобильных (390×844) со скруглением `rounded-t-[24px]`, тактильным драг-хэндлом 36×5px, сенсорными зонами $\ge 44\times 44$px, Natural Thumb Zone и 0px горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
- **`patientCatalogData.ts`** (351 строка, Sweet Spot 300–380 строк) — контрактная модель пациента РФ, нормализация телефонов, дедупликация, семейный трансфер без бюрократии, демо-каталог.
- **`studioModal/`** — обратно-совместимые фасады сабкомпонентов (`usePatientStudioState`, `PatientStudioHeader`, `PatientExpressRegistrationForm`, `PatientFamilyWalletSection`, `PatientProfileDetailView`, `PatientStudioFooterActions`).

## 📸 4-State Visual Proofs (Red Team Verified)

Все скриншоты сняты Playwright в реальном браузере Chromium с живого приложения `http://127.0.0.1:5173/?patients=1#patient-studio` и лично проверены через `read_file` по 7 смертным грехам интерфейса:

1. ☀️ **PC Light (1440×900)**: `01_patient_studio_pc_light_1440x900.png` (55.6 KB) — идеальная светлая тема, контрастность WCAG AAA, 0 наездов иконок, 1 Primary CTA.
2. 🌙 **PC Dark (1440×900)**: `02_patient_studio_pc_dark_1440x900.png` (67.6 KB) — глубокая темная тема без слепящих белых пятен, тонированные карточки `var(--paper)`.
3. 📱 **Mobile Light (390×844)**: `03_patient_studio_mobile_light_390x844.png` (114.3 KB) — нативный iOS Bottom Sheet (Drag Handle 36×5px, `rounded-t-[24px]`), тач-таргеты $\ge 44\times 44$px, Natural Thumb Zone, 0px горизонтального скролла.
4. 📱 **Mobile Dark (390×844)**: `04_patient_studio_mobile_dark_390x844.png` (115.9 KB) — безупречная сенсорная эргономика в темной теме, Primary CTA во всю ширину нижней трети экрана.

## 🧪 Тестовое покрытие (100% PASS)

- `apps/web/src/components/patients/__tests__/patientStudioSSOT.test.tsx` (15 тестов PASS)
- `apps/web/src/components/patients/__tests__/patientSSOTSuite.test.tsx` (6 тестов PASS)
- `apps/web/src/components/patients/__tests__/patientStudioDecomposedModules.test.tsx` (5 тестов PASS)
