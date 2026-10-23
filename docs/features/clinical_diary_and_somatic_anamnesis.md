# Дневник клинического приёма (SOAP) и соматический анамнез пациента

## Архитектурный обзор и статус инквизиции
- **Мандат 8e (Автономия врача):** Кнопки («Сохранить», «Печать», «Завершить приём») никогда не блокируются (`disabled={false}`). Врач свободен вносить любые изменения в свои записи.
- **Мандат 8x & 8ap (Анти-канцелярит & живой клинический язык):** Полное выжигание сырых советских бюрократических номеров бланков («Форма 043/у», «043/у») из UI врача и пациента. Замена на живой семантический язык: «Медицинская карта приёма», «Дневник клинического приёма», «Дневник приёма».
- **1-Клик Физиологическая норма:**
  - В карточке анамнеза: кнопка «✓ Соматически здоров (Норма)» заполняет физиологическую норму в 1 клик.
  - В дневнике приёма: кнопка «✓ Соматически здоров / Норма» заполняет все секции SOAP (жалобы, объективно, диагноз Z01.2, лечение) в 1 клик.
- **Пассивный аллергологический статус:** Быстрые чипы аллергенов («Пенициллин», «Лидокаин», «Артикаин», «Латекс», «Йод (Альвожил)») выводятся пассивной индикацией без блокирующей модальной паранойи.
- **Debounced Autosave (400ms):** Защита от потери данных (`DebouncedEmkTextarea`), автоматический сброс буфера на события `pagehide`, `beforeunload`, `blur`, `visibilitychange`, `dente:visit-tab-change`.
- **Автономный лаунчер (Mandate 8aq):** `EmkStandaloneLauncher.tsx` смонтирован в `TherapyLaunchers.tsx` и доступен по прямым параметрам `?emk=1` и `?anamnesis=1`.

## Red Team Visual Proofs (4-State Matrix)

### 1. Дневник клинического приёма (`docs/proofs/emk/`)
- ☀️ **PC Light (1440×900):** `docs/proofs/emk/01_emk_diary_pc_light.png`
- 🌙 **PC Dark (1440×900):** `docs/proofs/emk/02_emk_diary_pc_dark.png`
- 📱 **Mobile Light (390×844):** `docs/proofs/emk/03_emk_diary_mobile_light.png`
- 📱 **Mobile Dark (390×844):** `docs/proofs/emk/04_emk_diary_mobile_dark.png`

### 2. Соматический анамнез пациента (`docs/proofs/patient/`)
- ☀️ **PC Light (1440×900):** `docs/proofs/patient/01_anamnesis_pc_light.png`
- 🌙 **PC Dark (1440×900):** `docs/proofs/patient/02_anamnesis_pc_dark.png`
- 📱 **Mobile Light (390×844):** `docs/proofs/patient/03_anamnesis_mobile_light.png`
- 📱 **Mobile Dark (390×844):** `docs/proofs/patient/04_anamnesis_mobile_dark.png`

## Верификация и тестирование
- Юнит-тесты: `apps/web/src/components/visit/emk/__tests__/` и `apps/web/src/components/patient/__tests__/` (4 тест-файла, 41 тест, 100% pass).
- Регрессионные тесты: `visitAutosaveAndZeroKeystrokeLoss.test.tsx`, `redTeamClinicalInquisitionMandates8e8n.test.tsx` (12 тестов, 100% pass).
