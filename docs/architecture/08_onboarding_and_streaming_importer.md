# Быстрый онбординг клиники и потоковый импортер данных (30-Second Fast Onboarding & Streaming Data Importer)

## 1. Архитектурная цель и нормативная база
Модуль быстрого онбординга DENTE Dental CRM (`RapidLaunchWizard`) и конвейер потокового импорта данных (`StreamingDataImporter`) обеспечивают:
- **Мандат 8e (Автономия врача):** Готовность к первому приёму за 30–60 секунд. Кнопки «Пропустить настройку», «Начать приём прямо сейчас» и «Продолжить» никогда не блокируются (`disabled`). Дебаунсированный автосейв черновиков на лету.
- **Мандат 8n (Суверенитет масштаба):** Соло-врач (аренда кресла / частный кабинет на 1 кресло), малая клиника (2–3 кресла) и сетевые клиники (от 4 кресел). Автоматическая адаптация интерфейса под масштаб практики без тупиков (Zero Dead-Ends).
- **Мандаты 8x и 8ap (Дебюрократизация):** Полный выкос советского птичьего канцелярита и номеров законов из интерфейса (вместо «Прейскурант 804н» -> «15 ключевых услуг»; вместо «Касса 54-ФЗ» -> «0-клик касса и чеки»; вместо «СанПиН 3.3686-21» -> «журналы стерилизации»).
- **Мандат 8wy (Zero Mocks & Dual-Mode):** 100% реальные транзакции PostgreSQL 18 для импорта пациентов, услуг, кресел и параметров клиники с изоляцией по `organizationId`.
- **Apple HIG & Mobile Touch Ergonomics:** Полный адаптив под смартфоны (390×844) с Floating Bottom Bar, сенсорным минимумом $\ge 44\times 44\text{px}$, 0px паразитного горизонтального скролла и нативным 2-строчным заголовком.

---

## 2. Архитектура компонентов

### Фронтенд (`apps/web`):
- `RapidLaunchWizard.tsx`: Главный модальный мастер с 3 пошаговыми экранами, переключателем шагов и плавающей нижней панелью действий.
- `Step1ClinicProfile.tsx`: Выбор операционного режима (Scale Presets: Solo Doctor, 1-Chair, Small Clinic, Network) и базовых реквизитов (название, телефон, таймзона).
- `Step2ChairsSchedule.tsx`: Настройка установок (кресел), рабочего времени (09:00–20:00) и дней недели с гарантией сохранения хотя бы 1 кресла (Мандат 8k).
- `Step3StarterPricelist.tsx`: 15 ключевых стоматологических услуг с расчетом в копейках (`amountKopecks`), выборочный сидинг и потоковая загрузка прайсов/пациентов из внешних файлов.
- `AppModalsContainer.tsx`: Глобальное монтирование в дерево приложения через `#onboarding` и событие `dente-open-rapid-onboarding`.
- `onboarding-wizard.css`: Высокоприоритетные CSS-стили с оверлеем (`z-index: 99999`), переменными дизайн-токенов темы DENTE и Apple HIG медиа-запросами.

### Бэкенд (`apps/api`):
- `services/import/streamingDataImporter.ts`: Потоковый RFC 4180 парсер CSV/TSV матриц с поддержкой экранированных кавычек, многострочных ячеек и кодировок UTF-8/Windows-1251. Нормализация категорий, дедупликация телефонов пациентов и валидация цен.
- `routes/onboarding/index.ts`: Fastify-эндпоинты:
  - `GET /api/onboarding/status`: Проверка статуса онбординга организации, режима масштаба и количества кресел/услуг.
  - `POST /api/onboarding/complete`: Транзакционное сохранение профиля, клиники, кресел и флагов фич в PostgreSQL.
  - `POST /api/onboarding/skip`: Моментальный пропуск онбординга без блокировки врача.
  - `POST /api/onboarding/import/upload`: Потоковый предпросмотр структуры файла и валидация строк.
  - `POST /api/onboarding/import/commit`: Транзакционная пакетная вставка импортированных пациентов или услуг в БД.

---

## 3. Инструментальные доказательства (Visual Proofs & Tests)

### Скриншоты 4 состояний (docs/proofs/onboarding/):
1. ☀️ **PC Light (1440×900)**: `docs/proofs/onboarding/01_onboarding_pc_light.png`
2. 🌙 **PC Dark (1440×900)**: `docs/proofs/onboarding/02_onboarding_pc_dark.png`
3. 📱 **Mobile Light (390×844)**: `docs/proofs/onboarding/03_onboarding_mobile_light.png`
4. 📱 **Mobile Dark (390×844)**: `docs/proofs/onboarding/04_onboarding_mobile_dark.png`

### Тестовое покрытие:
- Бэкенд (`apps/api/src/tests/routes/onboardingAndImportPipeline.test.ts`): **8/8 passing**
- Фронтенд (`apps/web/src/components/onboarding/__tests__/`): **45/45 passing** across 4 suites:
  - `rapidLaunchWizardProgression.test.tsx`
  - `onboardingStaffChairAutonomy.test.tsx`
  - `onboardingDismissAutonomy.test.tsx`
  - `onboardingFinishAutonomy.test.tsx`
- Компиляция бэкенда (`npm run typecheck -w @dental/api`): **Exit Code 0**
