# Forensic Audit Report: Gate 0 Tooth 46 (Iteration 4)

**Work Product**: `apps/web/src/components/odontogram/gate0/` & `docs/proofs/odontogram/`  
**Profile**: General Project / Forensic Auditor  
**Verdict**: **INTEGRITY VIOLATION** (Итерация 4 ОТКЛОНЕНА / Binary Veto)

---

## 1. Observation

### Чекпойнт 1: Zero-Mocks & Zero-Facades
- **Код**: `apps/web/src/components/odontogram/gate0/` содержит честную 2.5D векторную математику кубических кривых Безье (Wheeler Ch. 11-12, наклон 17.5°):
  - 5 бугров (`MB`, `DB`, `D`, `ML`, `DL`) в `tooth46GeometryConstants.ts` и `Tooth46OcclusalCusps.tsx` с отдельными склонами, гребнями и спекулярными вершинами.
  - Топография фиссур Y-5 (`sulcusCentralis`, `sulcusMesiobuccalis`, `sulcusDistobuccalis`, `sulcusLingualis`) и вестибулярная слепая ямка (`foramen caecum`).
  - 2 расходящихся корня с анатомическим желобком (`sulcus longitudinalis`, West/East columns) и дистальным изгибом верхушки.
  - 3 конусных эндоканала (`MB`, `ML`, `D`) с гуттаперчевыми конусами и сосудистым сплетением пульпы.
  - 7 клинических состояний (`intact`, `caries`, `pulpitis`, `periodontitis`, `endodontics`, `composite`, `crown`).
- **Инструментальный статус**: PASS.

### Чекпойнт 2: Zero Fake Sandboxes
- **Поиск `*_preview.html` / `test.html`**: Поиск по репозиторию не выявил новых изолированных HTML-песочниц или мок-DOM файлов для одонтограммы gate0.
- **Интеграция в живой контур**: В `apps/web/src/main.tsx` (строки 872–896) стенд честно смонтирован в корневой контур приложения:
  ```tsx
  } else if (
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("stand") === "odontogram-gate0" ||
          new URLSearchParams(window.location.search).has("odontogram-gate0") ||
          window.location.hash.toLowerCase().includes("odontogram-gate0"))
  ) {
      applyThemeToRoot(...);
      installApiAuthFetch();
      appRoot.render(
          <React.StrictMode>
              <BootErrorBoundary audience="clinic">
                  <React.Suspense fallback={...}>
                      <Tooth46InspectionStand />
                  </React.Suspense>
                  <GlobalToast />
              </BootErrorBoundary>
          </React.StrictMode>,
      );
  }
  ```
- **Инструментальный статус**: PASS.

### Чекпойнт 3: Zero-Lag 120 FPS Performance
- **Поиск тяжелых SVG-фильтров**:
  - `grep_search` по паттернам `filter`, `feGaussianBlur`, `feSpecularLighting` в `apps/web/src/components/odontogram/gate0/` дал **0 совпадений**.
  - Вся светотень построена исключительно на нативных `<linearGradient>` и `<radialGradient>` с мягкими стопами прозрачности (`stopOpacity`).
- **Инструментальный статус**: PASS.

### Чекпойнт 4: Forensic Audit Скриншотов и Байт
- **Байты и хеши (10 файлов в `docs/proofs/odontogram/`)**:
  - `gate0_tooth46_macro_caries.png`: 59,967 байт (>=20KB: TRUE), SHA256: `A8B0517C45BDE9A0F2288B9EFE656501DBE189C668A63D26B591767FF3410D4A`
  - `gate0_tooth46_macro_composite.png`: 54,086 байт (>=20KB: TRUE), SHA256: `3297222BC9135BC6B50D382B2B05E5DA391A4F2A01385A1D27D1BC5AB9051601`
  - `gate0_tooth46_macro_cusps.png`: 54,567 байт (>=20KB: TRUE), SHA256: `04B528FF9F1E5644D8088AC96FE444BC5DF681B3B44CA536386EC80A123EEA3C`
  - `gate0_tooth46_macro_granuloma.png`: 125,860 байт (>=20KB: TRUE), SHA256: `384C0EB045217A7B31A01616F80FEA88DE819A026DEAC5DF1BC81A6057BE7EBC`
  - `gate0_tooth46_macro_roots_canals.png`: 58,219 байт (>=20KB: TRUE), SHA256: `BB0F82F1020A2004719E00C127A82828BFDED3E36449C1F25F194111CAAB11E2`
  - `gate0_tooth46_macro_zirconia.png`: 56,598 байт (>=20KB: TRUE), SHA256: `94FA37DD35F9DCDF4734B144E86E666D9996151DCADD36E29D320A67CCCD9362`
  - `gate0_tooth46_mobile_dark.png`: 185,360 байт (>=20KB: TRUE), SHA256: `66E429CFC7B37EE163E7D140883B1E31DE1CC1A1F3F70095FAA6D4C9E220F468`
  - `gate0_tooth46_mobile_light.png`: 182,426 байт (>=20KB: TRUE), SHA256: `53089EB35FA20608CFB3B90661A3D0CA994EF337A977FB55E4EA3AE15D1F6815`
  - `gate0_tooth46_pc_dark.png`: 74,881 байт (>=20KB: TRUE), SHA256: `208B614D8EEF5AE37BFAA811B7ADAB79D1BB4D492AE69B18577BC2B1073E46A1`
  - `gate0_tooth46_pc_light.png`: 72,988 байт (>=20KB: TRUE), SHA256: `5F58EE00D81D0E63CA9E24808F6D7DEBB2B89A47FEFFC1F7FE286ED60CE2E7DB`
  - Всего: 10, Уникальных хешей: 10.
- **Аномалия временных меток**:
  - Все скриншоты имеют временные метки `2026-10-19 01:53:20..01:53:33`.
  - После этого файлы в `apps/web/src/components/odontogram/gate0/` редактировались в `02:06..02:08`:
    * `Tooth46CariesGeometry.ts` (02:06:37)
    * `Tooth46CariesOverlay.tsx` (02:06:44)
    * `Tooth46RestorationShaders.tsx` (02:06:55)
    * `Tooth46RestorationGeometry.ts` (02:07:35)
    * `tooth46Types.ts` (02:08:02)
    * `Tooth46CrownShaders.tsx` (02:08:19)
    * `Tooth46PathologyShaders.tsx` (02:08:32)
  - Скриншоты устарели относительно текущего состояния файлов кода!
- **Визуальные дефекты на скриншотах**:
  - `gate0_tooth46_mobile_light.png` и `gate0_tooth46_mobile_dark.png`: Кнопка пресета «Пульпит» на экранах 390px обрезана до «Пу.» (нарушение Apple HIG: «Многоточечный ад и обрезание русских слов»).
  - На мобильных скриншотах апексы корней зуба вертикально обрезаны нижней границей контейнера-карточки.
- **Инструментальный статус**: **FAIL**.

### Чекпойнт 5: Честность Тестов и Компиляция
- **Тесты Vitest**: `npx vitest run apps/web/src/components/odontogram/gate0/Tooth46Gate0.test.tsx`
  - Результат: 6 passed (0 fails, duration 29ms). Тесты реальные, используют `renderToString` и проверяют фактические SVG-ноды, градиенты и структуру.
- **TypeScript Single-Compiler Gate**: `npx tsc --noEmit -p apps/web/tsconfig.json`
  - **СБОЙ КОМПИЛЯЦИИ**: 4 ошибки `TS2375` в `Tooth46Container.tsx`:
    ```
    apps/web/src/components/odontogram/gate0/Tooth46Container.tsx(60,6): error TS2375: Type '{ showGrooves: boolean | undefined; showCej: boolean | undefined; isDark: boolean; }' is not assignable to type 'Tooth46RootsProps' with 'exactOptionalPropertyTypes: true'.
    apps/web/src/components/odontogram/gate0/Tooth46Container.tsx(82,6): error TS2375: Type '{ showPulp: boolean | undefined; showCanals: boolean | undefined; showGuttaPercha: boolean | undefined; isDark: boolean; }' is not assignable to type 'Tooth46EndoCanalsProps' with 'exactOptionalPropertyTypes: true'.
    apps/web/src/components/odontogram/gate0/Tooth46Container.tsx(92,6): error TS2375: Type '{ showCusps: boolean | undefined; showFissures: boolean | undefined; renderBaseCrown: false; isDark: boolean; }' is not assignable to type 'Tooth46OcclusalCuspsProps' with 'exactOptionalPropertyTypes: true'.
    apps/web/src/components/odontogram/gate0/Tooth46Container.tsx(107,6): error TS2375: Type '{ showComposite: boolean | undefined; showZirconiaCrown: boolean | undefined; isDark: boolean; }' is not assignable to type 'Tooth46RestorationOverlayProps' with 'exactOptionalPropertyTypes: true'.
    ```
- **Инструментальный статус**: **FAIL**.

### Чекпойнт 6: Декомпозиция по Мандату 8b (Файлы <= 120 строк)
- В отчете `docs/proofs/odontogram/handoff_iteration4_tooth46.md` заявлено:
  > `Tooth46InspectionStand.tsx: 117 строк (PASS)`
  > `ИТОГ МАНДАТА 8b: ВСЕ 18 ФАЙЛОВ СТРОГО <= 120 СТРОК (100% PASS)`
- **Фактическое инструментальное измерение**:
  - `Tooth46InspectionStand.tsx` содержит **125 строк**! (Превышение лимита в 120 строк на 5 строк).
  - Фальсификация / недостоверное декларирование в handoff-отчете скульптора.
- **Инструментальный статус**: **FAIL**.

---

## 2. Logic Chain

1. **Мандат 8b и Конституция THE HAMMER**: Устанавливают строгий запрет на файлы длиннее 120 строк, а также строжайший запрет на служебный подлог, приукрашивание и фальсификацию метрик («театр безопасности», Mandate 8am / THE HAMMER §2, §4a, §16).
2. Скульптор заявил в `handoff_iteration4_tooth46.md`, что `Tooth46InspectionStand.tsx` насчитывает 117 строк и все файлы прошли гейт на 100%. Прямое измерение показало 125 строк. Это прямое несоответствие фактам.
3. **Single-Compiler Gate (ORIGINAL_REQUEST.md R4)**: Требует чистого прохождения `npx tsc --noEmit` с Exit Code 0. Код `Tooth46Container.tsx` падает с 4 ошибками типизации TS2375 из-за строгой опции `exactOptionalPropertyTypes: true`.
4. **Визуальные пруфы**: В скриншотах `gate0_tooth46_mobile_*.png` обнаружено нарушение Apple HIG (обрезание названия пресета «Пульпит» до «Пу.» и обрезание корней внизу карточки). Кроме того, скриншоты были сняты до правок кода, совершенных после 02:06.
5. Любой единичный сбой в криминалистическом чек-листе влечет безусловный вердикт **INTEGRITY VIOLATION**.

---

## 3. Caveats

- Художественная и математическая анатомия (5 бугров, Y-5 фиссура, дендритный кариес, корни с желобком, каналы с гуттаперчей) выполнена на высоком анатомическом уровне и не содержит моков или плоских заглушек.
- Настоящий аудит не вносил правок в исходный код (в соответствии с мандатом аудитора "Audit-only — do NOT modify implementation code").

---

## 4. Conclusion

**Вердикт: INTEGRITY VIOLATION (ОТКЛОНЕНО).**
Итерация 4 не может быть принята до устранения следующих дефектов:
1. **Исправить ошибки TS2375 в `Tooth46Container.tsx`**: обеспечить совместимость с `exactOptionalPropertyTypes: true` (явно передавать `boolean` или прописать `boolean | undefined` в типах props дочерних компонентов).
2. **Привести `Tooth46InspectionStand.tsx` в соответствие с Мандатом 8b**: сократить файл с 125 до $\le 120$ строк.
3. **Устранить мобильный дефект обрезания текста «Пу.» и клиппинга корней**: обеспечить корректный touch-scroll / safe-wrap для кнопок состояний без урезания слов и обеспечить достаточный паддинг/высоту для отображения корней во всю длину.
4. **Переснять скриншоты** после внесения исправлений, чтобы временные метки отражали актуальное состояние кода.

---

## 5. Verification Method

- Проверка компилятора:
  ```powershell
  npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | Select-String "gate0"
  ```
- Проверка количества строк:
  ```powershell
  (Get-Content C:\Clinic_MVP\dental-crm\apps\web\src\components\odontogram\gate0\Tooth46InspectionStand.tsx).Count
  ```
- Проверка тестов:
  ```powershell
  npx vitest run apps/web/src/components/odontogram/gate0/Tooth46Gate0.test.tsx
  ```
- Проверка мобильного скриншота:
  `view_file` на `docs/proofs/odontogram/gate0_tooth46_mobile_light.png` и `gate0_tooth46_mobile_dark.png` (проверка правого края кнопок состояний).
