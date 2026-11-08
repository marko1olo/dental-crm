# 🗂️ Patient Card, EMR & Patient Search Engine SSOT & Red Team Surgical Inquest

> 🎯 **МАНДАТ 8bd / 8s / 8ap / 8am / 8e**: Бескомпромиссная хирургия Карточки Пациента, ЭМК и Поискового Движка клиники DENTE CRM.  
> Полная ликвидация паразитных файлов-клонов, устранение 5 архитектурных дефектов ТИП 1 и консолидация вокруг единого канонического SSOT.

---

## 🏛️ 1. КАНОНИЧЕСКИЙ SSOT И ИТОГИ ХИРУРГИИ

1. **Канонический мастер-компонент Карточки Пациента (SSOT):**
   - [`apps/web/src/components/patients/PatientCardModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCardModal.tsx) (597 строк)
   - Объединяет просмотр, редактирование, экспресс-регистрацию, 9 клинических вкладок («Паспортные данные», «Анамнез», «Визиты и файлы», «Счета и баланс», «Снимки и КТ», «Формула», «Пародонтология», «Документы», «Семья»).
   - 1-клик физиологическая норма («✓ Соматически здоров / норма»).
   - 0 заблокированных кнопок по Мандату 8e.
   - Ровно 1 Primary CTA (`bg-[var(--teal)] text-white`).
   - На смартфонах — нативный Apple HIG Bottom Sheet со скруглением 24px, drag handle 36x4px и фиксированной панелью действий в Зоне большого пальца.

2. **Единый SSOT Реестра и Поиска Пациентов:**
   - Реестр: `apps/web/src/PatientsView.tsx` (`PatientsMasterList` + `PatientDetailsPanel`).
   - Поисковый движок: `apps/web/src/utils/patientSearchUtils.ts` + `apps/web/src/components/patients/patientSearch/`.
   - Сабмодули расписания `components/schedule/patientSearchEngine/` перенаправлены на единый канонический SSOT.

---

## 🗑️ 2. РАССТРЕЛЬНЫЙ СПИСОК УДАЛЕННЫХ КЛОНОВ (48 ФАЙЛОВ ПОД `git rm`)

1. **Клон 1: Паразитная шторка PatientDrawer (8 файлов):**
   - `apps/web/src/components/patients/PatientDrawer.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawer.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawerActionButtons.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawerFinanceCard.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawerFooter.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawerHeader.tsx`
   - `apps/web/src/components/patients/drawer/PatientDrawerSafetyCard.tsx`
   - `apps/web/src/components/patients/drawer/patientDrawerTypes.ts`

2. **Клон 2: Мертвая папка detailsModal (11 файлов):**
   - `apps/web/src/components/patients/detailsModal/` (все 11 файлов)

3. **Клон 3: Мертвая папка studioModal (7 файлов):**
   - `apps/web/src/components/patients/studioModal/` (все 7 файлов)

4. **Клон 4: Заброшенный PatientJourneyTimeline (12 файлов):**
   - `apps/web/src/components/PatientJourneyTimeline.tsx`
   - `apps/web/src/components/PatientJourneyTimeline.css`
   - `apps/web/src/components/patientJourneyModules/` (все 10 файлов)

5. **Клон 5: Мертвая карточка PatientCard (8 файлов):**
   - `apps/web/src/components/patients/PatientCard.tsx`
   - `apps/web/src/components/patients/patientCardModules/` (все 7 файлов)

6. **Дублирующие скореры расписания (2 файла):**
   - `apps/web/src/components/schedule/patientSearchEngine/duplicateNameScorer.ts`
   - `apps/web/src/components/schedule/patientSearchEngine/duplicatePhoneScorer.ts`

---

## 🛠️ 3. УСТРАНЕНИЕ 5 АРХИТЕКТУРНЫХ ДЕФЕКТОВ ТИП 1

- **Дефект 1 (2FP регулярки заметок):**
  - `useMobilePatientSafetyAlerts.ts`: ликвидирован синтаксический анализ свободных заметок на кардиостимулятор, диабет и беременность; соматические риски и аллергии извлекаются СТРОГО из реляционного `clinicalSafetyProfile` через `evaluatePatientSafetyFlags`.
  - `patientFormatters.ts`: функция `extractAllergy` защищена от ложных срабатываний (`isNegativeAllergyStatement`), возвращая `null` на отрицания («не отягощен», «отрицает»).
  - `somaticTextParser.ts`: исправлена ложная детекция кардиостимулятора (ЭКС) на слова `экс-супруг`, `экспертиза`, `экс-пациент`, добавлена защита от отрицаний.

- **Дефект 2 (Хардкод моков и врача "Д-р Иванов А.С."):**
  - `radiologyPatientSearch/utils.ts` и `types.ts`: ликвидирован безусловный возврат дефолтных моковых визитов с прибитым гвоздями врачом "Д-р Иванов А.С.". В боевом режиме обеспечен честный Empty State (`[]`), синтетические данные изолированы строго за `isDemoShowcaseMode()`, а имя врача формируется динамически.

- **Дефект 3 (Чужой бренд StomX):**
  - `PatientCardModal.tsx` и `patientCardModalTypes.ts`: устранены паразитные символы `STOMX_REPRESENTATIVE_CATALOG`, `StomxRepresentativeType`, `StomxRepresentativeTypeMeta`. Заменены на суверенные `DENTE_REPRESENTATIVE_CATALOG`, `DenteRepresentativeType`, `DenteRepresentativeTypeMeta`.

- **Дефект 4 (Скрытые бутафорские ширмы `<div className="hidden">`):**
  - `PatientCardModal.tsx`: физически удалены мертвые обертки `<div className="hidden">` с компонентами `PatientAnamnesisTab` и `PatientFamilyCard`.

- **Дефект 5 (Советские шифры форм):**
  - `DocumentsView.tsx`: архаичные шифры `outpatient_medical_card_025u` и `dental_medical_card_043u` заменены на чистый доменный язык `dental_medical_card` и `outpatient_visit_record`.

---

## 📸 4. 4-STATE VISUAL PROOF (ЛИЧНЫЙ ОСМОТР ЧЕРЕЗ READ_FILE)

Все 4 скриншота сняты на живом локальном стенде (`http://127.0.0.1:5173/`) и лично исследованы через инструмент мультимодального зрения:
1. `patient_card_pc_light_1440x900.png` (248 KB) — PC Desktop Light: шапка, 9 табов, 1-клик соматическая норма, суверенный каталог представителей DENTE, 1 Primary CTA.
2. `patient_card_pc_dark_1440x900.png` (249 KB) — PC Desktop Dark: 100% токены тёмной темы, WCAG AAA контраст, ноль белых пятен.
3. `patient_card_mobile_light_390x844.png` (119 KB) — Mobile Light (Apple HIG): нативный Bottom Sheet со скруглением 24px, drag handle 36x4px, тач-таргеты >= 44x44px, Floating Bar в Natural Thumb Zone.
4. `patient_card_mobile_dark_390x844.png` (121 KB) — Mobile Dark (Apple HIG): глубокая темная палитра, фиксированная кнопка «Сохранить» 48px, 0px горизонтального скролла.
