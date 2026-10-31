# Patient Studio SSOT & Express Registration Proofs (Mandates 8b, 8e, 8n, 8am)

## 🏛️ Архитектура и декомпозиция Patient Studio Modal

Каноническая студия пациентов `PatientStudioModal.tsx` была успешно декомпозирована из монолита в 563 строки в модульную директорию `apps/web/src/components/patients/studioModal/`:

- **`usePatientStudioState.ts`** (213 строк) — хук бизнес-логики: быстрый поиск, редактирование, 10-секундная регистрация, переключение карточек, управление семейным балансом.
- **`PatientStudioHeader.tsx`** (241 строка) — эргономичная шапка с быстрым поиском по пациентам (отступ `padding-left: 40px` исключает наезд лупы на текст), навигационными вкладками («Анкета», «Семейный баланс» / «Семья», «История») и бейджами.
- **`PatientExpressRegistrationForm.tsx`** (208 строк) — экспресс-форма за 10 секунд (только ФИО + телефон по Мандату 8e), соматическая норма в 1 клик, категории (Первичный / Постоянный / VIP) и опциональные документы после приёма.
- **`PatientFamilyWalletSection.tsx`** (145 строк) — единый семейный кошелек родственников (Мандат 8n), списание задолженностей с авансов членов семьи в 1 клик без бюрократии, адаптивное отображение ФИО без срезания многоточиями.
- **`PatientProfileDetailView.tsx`** (153 строки) — детализированный профиль, баланс, аллергии, заметки и история визитов.
- **`PatientStudioFooterActions.tsx`** (61 строка) — нижняя плавающая панель действий с ровно 1 Primary CTA кнопкой (`#0d9488`, `var(--teal)`), которая НИКОГДА не блокируется (`disabled={false}`).
- **`PatientStudioModal.tsx`** (163 строки) — стройный координатор-фасад со 100% обратной совместимостью и портальным рендерингом.

## 📸 4-State Visual Proofs (Red Team Verified)

Все скриншоты сняты с реального приложения `http://127.0.0.1:5173/?demo=true#patient-studio` и проверены по 7 смертным грехам интерфейса:

1. ☀️ **PC Light (1440×900)**: `01_patient_studio_pc_light_1440x900.png` (153.9 KB) — идеальная светлая тема, контрастность WCAG AAA, 0 наездов иконок.
2. 🌙 **PC Dark (1440×900)**: `02_patient_studio_pc_dark_1440x900.png` (151.9 KB) — темная тема без слепящих белых пятен, глубокие тонированные карточки `var(--paper)`.
3. 📱 **Mobile Light (390×844)**: `03_patient_studio_mobile_light_390x844.png` (114.5 KB) — нативный iOS Bottom Sheet (Drag Handle 36×5px, `rounded-t-[24px]`), тач-таргеты $\ge 44\times 44$px, полное отображение ФИО родственников, 0px горизонтального скролла.
4. 📱 **Mobile Dark (390×844)**: `04_patient_studio_mobile_dark_390x844.png` (115.6 KB) — идеальная сенсорная эргономика в темной теме, 1 Primary CTA во всю ширину нижней трети экрана.

## 🧪 Тестовое покрытие

- `apps/web/src/components/patients/__tests__/patientSSOTSuite.test.tsx` (6 тестов PASS)
- `apps/web/src/components/patients/__tests__/patientStudioDecomposedModules.test.tsx` (5 тестов PASS)
- `apps/web/src/components/patients/__tests__/patientStudioClinicalErgonomics.test.tsx` (5 тестов PASS)
