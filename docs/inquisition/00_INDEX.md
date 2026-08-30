# ВЕЛИКАЯ ИНКВИЗИЦИЯ DENTE CRM: ГЕНЕРАЛЬНЫЙ АКТ И СВОДНЫЙ РЕЕСТР БРАКА

**Дата фиксации:** 2026-08-30  
**Стандарт:** The Hammer Supreme Constitution (`.agents/MASTER_PROMPT.md`, `.agents/THE_HAMMER_MASTER_PROMPT.md`, `.agents/AGENTS.md`)  
**Принцип:** **ПРЕЗУМПЦИЯ БРАКА (100% BRUTAL TRUTH, НУЛЕВАЯ СИКОФАНТИЯ)**  
**Статус:** `ПРОВЕРЕНО` (11 независимых субагентов-инквизиторов отсмотрели 100% скриншотов попиксельно через `view_file` и вскрыли код Playwright-раннеров).

---

## 🏛️ ГЛОБАЛЬНЫЙ ВЕРДИКТ И ПРЕЗУМПЦИЯ БРАКА

По результатам тотальной инспекции 25 ключевых экранов и модулей CRM, 78+ скриншотов во всех 4 базовых состояниях (PC Light 1440px, PC Dark 1440px, Mobile Light 390px, Mobile Dark 390px) и 22 скриптов съёмки, кодовая база признана **НЕПРИГОДНОЙ ДЛЯ ПРОДАКШЕНА**.

Выявлены 6 фундаментальных системных патологий:
1. **Синтетическая бутафория и фикция данных (~60%):** Скриншоты снимались не из реальной CRM, а из изолированной песочницы `ClinicalModalsStudioStandalone.tsx` со статическим контекстом `mockStudioAppLogicValue`. Модуль КЛКТ генерировал черные пустые экраны (`#000000`) в 3 из 4 вьюпортов и оперировал физически невозможной плотностью (`-1720 HU` в воздухе, `98 HU` в кортикальной кости).
2. **Эпидемия мультяшных эмодзи:** Официальные медицинские протоколы (ИДС 1051н, рецепты 107-1/у, акты 804н, памятки) напичканы инфантильными смайликами (`🔪`, `💉`, `🧚`, `🦴`, `🔩`, `👑`, `💊`, `🧊`, `🥛`, `☕`, `⚠️`).
3. **Мобильный паралич (390px):** Катастрофический коллапс таб-баров в нечитаемые пятна букв (`15_form043_clinical_print_modal_mobile`), обрубленные троеточиями ФИО врачей и диагнозы, блокировка рабочих слотов плавающим софтфоном.
4. **Матрешки 3–4 уровня вложенности:** Карточки внутри карточек, рамочные боксы вокруг каждого поля ввода, избыточные серые подложки, захламляющие рабочее пространство врача.
5. **Баннерный блоат (250–440px):** Декоративные дашборды и шапки сжирают до 50% высоты экрана на мониторах 1440px, оставляя медицинским таблицам 1–3 видимых строки.
6. **Нарушение законов эргономики (Фиттс, Хик, Миллер):** Частоколы из 10+ кнопок в ряд, дублирование Primary Action кнопок, микроскопические тач-таргеты 8–18px при норме $\ge 44\text{px}$.

---

## 🗂️ КАТАЛОГ МАТЕРИАЛОВ ИНКВИЗИЦИИ

| Документ | Роль / Область инспекции | Ключевые вскрытые дефекты |
| :--- | :--- | :--- |
| **[`01_DARK_MODE_CONTRAST_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/01_DARK_MODE_CONTRAST_DEFECTS.md)** | Инквизитор 1: Dark Mode Contrast Hound (`83aecae3`) | Черный невидимый текст на черном фоне (1.05:1), слепящие белые плашки `#FFFFFF` в темноте, невидимые границы таблиц, тусклые подписи. |
| **[`02_LIGHT_MODE_CONTRAST_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/02_LIGHT_MODE_CONTRAST_DEFECTS.md)** | Инспектор 2: Light Mode Contrast Hound (`4f183c6c`) | Черные дыры и утечки Dark Theme в файлы `_light.png`, слепые светло-серые шрифты (1.48:1), слипающиеся белые карточки без границ. |
| **[`03_MOBILE_390PX_OVERFLOW_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/03_MOBILE_390PX_OVERFLOW_DEFECTS.md)** | Инквизитор 3: Mobile 390px Overflow Sniper (`50752b5f`) | Схлопывание табов в кашу, обрезка ФИО и сумм троеточиями, перекрытие интерактивных слотов софтфоном, вылет кнопок за экран. |
| **[`04_ZINDEX_COLLISION_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/04_ZINDEX_COLLISION_DEFECTS.md)** | Инквизитор 4: Z-Index & Collision Auditor (`b7914c35`) | Перекрытие сетки расписания (13:00–15:00) софтфоном, наезд WebRTC шторки на прием, выпадающие списки рендерятся под таблицами. |
| **[`05_FITTS_TOUCH_TARGET_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/05_FITTS_TOUCH_TARGET_DEFECTS.md)** | Инквизитор 5: Fitts's Law & Touch Target Auditor (`c62c7de2`) | Микро-таргеты 14–18px на мобилках, зазоры между кнопками <8px (ложные нажатия в перчатках), срезы поверхностей зубов 8–12px. |
| **[`06_HICKS_MILLER_OVERLOAD_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/06_HICKS_MILLER_OVERLOAD_DEFECTS.md)** | Инквизитор 6: Hick's & Miller's Overload Auditor (`e21a6eec`) | Частокол из 10 кнопок тулбара, 2 Primary кнопки `+ Запись`, свалка по 5 кнопок в строках таблиц (50 кнопок на экране), 12 табов СанПиН. |
| **[`07_CBCT_RADIOLOGY_TRUTH_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/07_CBCT_RADIOLOGY_TRUTH_DEFECTS.md)** | Инквизитор 7: CBCT Anatomical Truth Auditor (`ebf8a4a5`) | Черные экраны `#000000` в Coronal/Sagittal/Cross-Section, воздух `-1720 HU`, кость `98 HU`, зуб 16 вверх ногами, нерв IAN сквозь корни. |
| **[`08_MEDICAL_DENSITY_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/08_MEDICAL_DENSITY_DEFECTS.md)** | Инквизитор 8: Medical Density Auditor (`33148efd`) | Шапки 250–440px вытесняют таблицы (всего 2–3 строки), строки расписания 60px, строки счетов 72px, срез корней зубов на главном экране. |
| **[`09_TYPOGRAPHY_EMOJIS_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/09_TYPOGRAPHY_EMOJIS_DEFECTS.md)** | Инквизитор 9: Typography, Emojis & Formatting Sniper (`ffcb0522`) | Мультяшные эмодзи в ИДС 1051н и рецептах, разрыв сумм `482 \n 500 \n ₽`, отрыв знаков `%` и `₽`, висячие дефисы, англицизмы `&`. |
| **[`10_ANTI_MATRYOSHKA_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/10_ANTI_MATRYOSHKA_DEFECTS.md)** | Инквизитор 10: Anti-Matryoshka Auditor (`34317db8`) | Вложенность карточек 4-го уровня (ВКК, планы лечения, наряды ЗТЛ), обрамленные боксы инпутов, пустой белый экран детской одонтограммы. |
| **[`11_SCREENSHOT_PIPELINE_AUTHENTICITY.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/11_SCREENSHOT_PIPELINE_AUTHENTICITY.md)** | Аудитор Скриншот-Пайплайна (`4e511bbd`) | Инвентаризация 22 скриптов, 48 подавителей `.catch(() => {})`, маскирующих белые экраны, клонирование файлов с одинаковыми MD5. |
| **[`12_WORKER_SQUADS_DISPATCH_PROMPTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/12_WORKER_SQUADS_DISPATCH_PROMPTS.md)** | Архитектор L1: Боевые промпты 7 Бригад | Детальные, исчерпывающие, длиннющие ТЗ для запуска специализированных воркеров с жесткими гейтами компиляции и тайпчека. |

---

## 🗺️ СВОДНАЯ МАТРИЦА 25 ЭКРАНОВ С ПРИВЯЗКОЙ К ДЕФЕКТАМ

| № | Экран / Модуль | Исходный файл компонента | Главные выявленные дефекты | Бригада |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Расписание & Экстренный буфер** | `apps/web/src/components/schedule/ScheduleGrid.tsx` | Коллизия софтфона (слоты 13:00–15:00), 2 кнопки Primary Action, тулбар из 10 кнопок, строки 60px | **Бригада 2 & 6** |
| **2** | **Планы лечения (3 тарифа)** | `apps/web/src/components/treatment-plans/TreatmentPlan3TierComparison.tsx` | Матрешка 3-го уровня, футер перекрывает 60% мобильного экрана, конкурирующие Primary кнопки | **Бригада 3** |
| **3** | **Планы лечения (4 этапа)** | `apps/web/src/components/treatment-plans/TreatmentPlan4StagesView.tsx` | Обрезание Этапов 3 и 4 на ПК, вылет кнопок на мобилке, троеточия в диагнозах | **Бригада 3** |
| **4** | **Касса & Счета 54-ФЗ** | `apps/web/src/components/finance/PatientBillingModal.tsx` | Эмодзи (`💳`,`💵`,`📱`,`🤝`), разрыв суммы `482 \n 500 \n ₽`, строки 72px, 5 кнопок оплаты в ряд | **Бригада 1 & 2** |
| **5** | **Экспорт 1С Бухгалтерия** | `apps/web/src/components/finance/Billing1CExportModal.tsx` | Горизонтальный скролл на 390px, разрыв `20 \n %`, отрыв знака `₽`, висячее тире в датах | **Бригада 1 & 2** |
| **6** | **Одонтограмма & PSR** | `apps/web/src/components/odontogram/OdontogramView.tsx` | Квадранты сжаты до 180px, срез корней 47..37 на ПК, клик-таргеты 8–12px, слепой серый текст | **Бригада 2 & 5** |
| **7** | **Детская одонтограмма** | `apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx` | Пустой белый экран `#FFFFFF` (сбой рендера), кнопки 24px, молочные зубы сжаты до 34px | **Бригада 2 & 5** |
| **8** | **ТРГ & Цефалометрия** | `apps/web/src/components/radiology/CephalometricAnalysisModal.tsx` | Панель точек вытесняет снимок (85% экрана), точки 8–12px с зазором 4px, кнопки зума 24px | **Бригада 5** |
| **9** | **Журналы СанПиН (12 табов)** | `apps/web/src/components/sanpin/SanpinRegistersView.tsx` | Частокол из 12 вкладок, шапка 340px вытесняет таблицу (всего 3 строки), 2 Primary Action | **Бригада 4** |
| **10** | **Стерилизация & Класс Б** | `apps/web/src/components/sanpin/SterilizationCycleModal.tsx` | Обрезание полей температуры на 390px, dropdown рендерится под таблицей | **Бригада 4** |
| **11** | **3D КЛКТ MPR Студия** | `apps/web/src/components/radiology/cbctObliqueMath.ts` | Черные экраны `#000000` в 3 вьюпортах, `-1720 HU` воздух, `98 HU` кость, IAN нерв сквозь корни | **Бригада 5** |
| **12** | **2D DICOM Просмотрщик** | `apps/web/src/components/radiology/RadiologyDicomViewerModal.tsx` | Инверсия зуба 16 вверх ногами, слепой текст дропзоны 1.48:1, ползунки вылетают за 390px | **Бригада 5 & 6** |
| **13** | **Зуботехнический наряд (ZTL)**| `apps/web/src/components/lab/DentalLabOrderModal.tsx` | Эмодзи (`👑`,`✨`,`🔩`,`🦷`), английский `&`, матрешка 4 уровня, срез блока VITA на 390px | **Бригада 1 & 3** |
| **14** | **Гостевой портал лаборатории**| `apps/web/src/components/lab/GuestLabPortalView.tsx` | Карточка 400px с 65% пустоты на мониторах 1440px, обрезание статусов наряда | **Бригада 3 & 6** |
| **15** | **Списание материалов (BOM)** | `apps/web/src/components/materials/MaterialBomDeductionModal.tsx` | Card-in-Table высотой 80px (всего 2 строки на экране), обрезание остатков на 390px | **Бригада 3 & 6** |
| **16** | **Памятка пациента (Post-Op)** | `apps/web/src/components/documents/PostOpCarePatientMemoModal.tsx` | Эмодзи (`🧊`,`🧚`,`🥛`,`☕`,`⚠️`), матрешка 3 уровня в печатном бланке, срез `Отправить в Wh...` | **Бригада 1 & 3** |
| **17** | **Удержание пациентов (Отток)**| `apps/web/src/components/retention/RetentionAnalyticsView.tsx` | Строки 90px с 5 кнопками (50 кнопок на экране), скрытые столбцы LTV на мобилке | **Бригада 3 & 6** |
| **18** | **Телефония: Софтфон** | `apps/web/src/components/telephony/TelephonyFloatingWidget.tsx` | Перекрытие расписания (слоты 13:00–15:00), обрезание кнопок `* 0 #`, пустой стаб на ПК | **Бригада 2 & 6** |
| **19** | **Телефония: Входящий звонок** | `apps/web/src/components/telephony/IncomingCallPopupModal.tsx` | Эмодзи (`⚡`,`🗓️`), наезд шторки на кнопки приема, срез заголовка на 390px | **Бригада 1 & 2** |
| **20** | **Матрица прав (RBAC)** | `apps/web/src/components/settings/AccessMatrixModal.tsx` | Шапка 440px (всего 2 строки прав), 8 табов ролей вылетают за 390px, чекбоксы 14x14px | **Бригада 2 & 6** |
| **21** | **Комиссии врачей** | `apps/web/src/components/settings/StaffCommissionsModal.tsx` | Плашки уровней 22px, обрезка формул расчета на мобилке | **Бригада 6** |
| **22** | **Хаб начмеда (ЕГИСЗ/РЭМД)** | `apps/web/src/components/cmo/CmoComplianceRemdHubModal.tsx` | Плашки метрик 160px (таблица 2 строки), срез статусов `Зарег...`, `Ошиб...` на 390px | **Бригада 3 & 6** |
| **23** | **Форма 043/у (Печать & ВКК)** | `apps/web/src/components/documents/Form043ClinicalPrintModal.tsx` | Схлопывание 5 вкладок в кашу на 390px, 4 уровня матрешки, разрыв заголовка на 5 строк | **Бригада 1 & 2** |
| **24** | **Локальный оффлайн-сейф** | `apps/web/src/components/backup/OfflineBackupVaultPanel.tsx` | Обрыв `Резервное \n копирова...`, разрыв `AES- \n 256`, разрыв `SHA- \n 256`, кнопки 36px | **Бригада 1 & 6** |
| **25** | **Кокпит врача в смене** | `apps/web/src/components/doctor/DoctorShiftCockpitModal.tsx` | Нижняя плашка таймера перекрывает телефон и диагноз пациента, одонтограмма вытеснена | **Бригада 2** |
