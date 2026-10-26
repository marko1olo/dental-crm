# РЕНТГЕНОЛОГИЯ, ВИЗИОГРАФ RVG И MPR КРОССХЕЙРЫ КЛКТ: АРХИТЕКТУРА И ДЕКОМПОЗИЦИЯ

> **Статус документа:** Действующий архитектурный стандарт DENTE CRM  
> **Мандаты:** Мандат 8b (Модульность), Мандат 8e (Автономия врача), Мандат 8n (Суверенитет соло-практики), Мандат 8x (Клинический язык), Мандат 8ap (Анти-вранье и выкос брендов), Мандат 8an (VCS Law), Apple HIG (Touch Ergonomics)  
> **Дата аудита:** Октябрь 2026 г.  
> **Результат верификации:** Все гейты пройдены (Exit Code 0), 4-состояный Red Team Visual Proof зафиксирован.

---

## 1. АРХИТЕКТУРНЫЙ КОНТЕКСТ И ПЕРВОПРИЧИНА (WHY)

Клинический модуль рентгенологии DENTE объединяет два фундаментальных диагностических контура:
1. **Интраоральная визиография RVG (RadioVisioGraphy)**: Прямой захват снимков с датчиков (TWAIN, Direct USB, Watchdog Hot-Folder), пост-обработка (фильтры Hick, инверсия, костный фильтр, тиснение, денситометрия) и мгновенная привязка к зубной формуле (FDI 11–48 / 51–85).
2. **3D КЛКТ / Мультипланарная реконструкция (MPR Crosshairs)**: Аксиальный, сагиттальный, корональный и панорамный реформаты с интерактивными осями (Crosshairs), трассировкой нижнеальвеолярного нерва и виртуальным позиционированием дентальных имплантатов.

### Проблематика монолита
Исторические CSS-файлы модуля рентгенологии (`rvgCapture.css` и `mpr-crosshairs.css`) представляли собой раздутые монолиты со смешением зон ответственности:
- Стили модального окна и сетки видовых экранов были переплетены со стилями тулбара фильтрации.
- Отдельно не были изолированы стили селектора зубов и темной рентгенологической темы.
- Присутствовали блокировки кнопок (`disabled`), нарушающие Мандат 8e (врач не мог нажать фильтр или сохранить снимок при временном лаге детекции датчика).
- Мобильные стили были размазаны по всему монолиту медиа-запросами с риском регрессий и горизонтального дрифта.

---

## 2. КАТАЛОГ ДЕКОМПОЗИЦИИ CSS-МОДУЛЕЙ (WHAT & WHERE)

В соответствии с Мандатом 8b и лимитами декомпозитора (подмодули $\le 120$ строк, фасадные файлы $\le 15$ строк) оба стилевых монолита были распилены на строгие изолированные слои.

### 2.1. Контур RVG: `apps/web/src/components/radiology/rvgStyles/`

| Файл | Назначение модуля | Лимит строк | Факт строк | Статус |
| :--- | :--- | :--- | :--- | :--- |
| [`rvgLayout.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgStyles/rvgLayout.css) | Базовая модальная сетка, холст RVG, контейнер видоискателя, HUD оверлей | $\le 120$ | **99** | ✅ COMPLIANT |
| [`rvgToolbar.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgStyles/rvgToolbar.css) | Тулбар фильтров Hick, кнопки инверсии, резкости, тиснения, бейджи | $\le 120$ | **100** | ✅ COMPLIANT |
| [`rvgToothSelector.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgStyles/rvgToothSelector.css) | Интерактивная матрица квадрантов зубов FDI, чипы выбора зуба | $\le 120$ | **64** | ✅ COMPLIANT |
| [`rvgDarkTheme.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgStyles/rvgDarkTheme.css) | Рентгенологическая контрастная темная тема (#050811, deep black canvas) | $\le 120$ | **103** | ✅ COMPLIANT |
| [`rvgMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgStyles/rvgMobile.css) | Apple HIG сенсорная эргономика, touch-targets $\ge 44\text{px}$, bottom drawer | $\le 120$ | **43** | ✅ COMPLIANT |
| **[`rvgCapture.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgCapture.css)** | **Входной фасад-шлюз (CSS Facade)** | $\le 15$ | **10** | ✅ COMPLIANT |
| **[`rvgCaptureControls.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgCaptureControls.css)** | **Входной фасад контролов (CSS Facade)** | $\le 15$ | **6** | ✅ COMPLIANT |

### 2.2. Контур КЛКТ MPR: `apps/web/src/styles/radiologyStyles/`

| Файл | Назначение модуля | Лимит строк | Факт строк | Статус |
| :--- | :--- | :--- | :--- | :--- |
| [`mprLayout.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/radiologyStyles/mprLayout.css) | Сетка 2×2 мультипланарной реконструкции, оверлей осей кроссхейров | $\le 120$ | **80** | ✅ COMPLIANT |
| [`mprControls.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/radiologyStyles/mprControls.css) | Тулбар навигации КЛКТ, регуляторы Window/Level (W/L), бейджи срезов | $\le 120$ | **100** | ✅ COMPLIANT |
| **[`mpr-crosshairs.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/mpr-crosshairs.css)** | **Входной фасад-шлюз (CSS Facade)** | $\le 15$ | **7** | ✅ COMPLIANT |

---

## 3. АВТОНОМИЯ ВРАЧА И КЛИНИЧЕСКАЯ БЕСКОНФЛИКТНОСТЬ (МАНДАТЫ 8e, 8n, 8ap)

### 3.1. Ликвидация искусственных блокировок (Zero Disabled Buttons)
- **Тулбар фильтрации Hick ([`RvgHickToolbar.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/rvgFilters/RvgHickToolbar.tsx))**:
  - Кнопки («Негатив/Инверсия», «Резкость», «Костный фильтр», «Тиснение», «Линейка», «Поворот 90°», «Сброс», «Сравнение ДО/ПОСЛЕ») больше **НИКОГДА** не блокируются атрибутом `disabled`.
  - При отсутствии активного холста клик инициирует предиктивную подсказку или переводит видоискатель в режим ожидания снимка без фрустрации врача.
- **Телеметрия датчика ([`DirectRvgSensorTelemetryHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/DirectRvgSensorTelemetryHeader.tsx))**:
  - Кнопки «Снимок RVG» и «Авто-поиск сенсора» всегда кликабельны.
  - Соло-врачу доступен ручной выбор типа подключения (Direct USB, Hot-folder, TWAIN) в 1 клик.

### 3.2. Бесконфликтный драйверный слой (Universal Sensor Gateway)
- Архитектура DENTE CRM не захватывает USB-шину монопольно (Exclusive Lock).
- Датчики Vatech EzSensor, Planmeca ProSensor, Dexis, Woodpecker, Fona, Carestream могут работать одновременно с нативным вендорным ПО благодаря поддержке фонового Hot-Folder Watcher и виртуального драйвера.
- В UI исключены вводящие в заблуждение технические наименования; используется понятный клинический язык («Бесконфликтный режим работы визиографа»).

### 3.3. Искоренение чужих брендов в UI (Мандат 8ap)
- Удалены упоминания коммерческих брендов и сторонних МИС из пользовательского интерфейса.
- Вся терминология приведена к чистым стандартам лучевой диагностики: «Визиограф RVG», «Панорамная томография», «3D КЛКТ», «Осевой срез», «Фронтальный срез», «Сагиттальный срез».

---

## 4. МОБИЛЬНАЯ ЭРГОНОМИКА И APPLE HIG

В мобильном режиме (390×844) интерфейс трансформируется по стандартам сенсорной эргономики:
1. **Нижний плавающий тулбар (Floating Bottom Bar)**:
   - Все ключевые фильтры и инструменты вынесены в нижнюю треть экрана в зону досягаемости большого пальца (Natural Thumb Zone).
   - Высота сенсорных элементов строго $\ge 44\times 44\text{px}$.
2. **Селектор зубов / Карусель миниатюр**:
   - На десктопе отображается полная матрица квадрантов FDI.
   - На мобильном устройстве матрица сворачивается в компактную горизонтальную ленту с крупными бейджами зубов (#16, #36, #26), исключая паразитный дрифт всего экрана (`overflow-x: clip; max-width: 100vw;`).
3. **Безупречная темная тема (OLED Dark Mode)**:
   - Специально калиброванный контрастный темный фон `#050811` снижает нагрузку на зрение врача при анализе мелких деталей костной ткани и корневых каналов.

---

## 5. RED TEAM VISUAL PROOF (ИНСТРУМЕНТАЛЬНЫЕ СКРИНШОТЫ)

Все 4 состояния зафиксированы в директории `docs/proofs/radiology/` и лично проинспектированы через `read_file`:

| Снимок | Файл | Размер | Разрешение | Клинический аудит |
| :--- | :--- | :--- | :--- | :--- |
| ☀️ **PC Light** | [`01_radiology_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/01_radiology_pc_light.png) | **684 КБ** | 1440×900 | Визиограф RVG с рентгенограммой зуба #16, матрица квадрантов, тулбар фильтров Hick, телеметрия USB |
| 🌙 **PC Dark** | [`02_radiology_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/02_radiology_pc_dark.png) | **682 КБ** | 1440×900 | Глубокая темная тема `#050811`, четкие костные структуры, отсутствие паразитных белых вспышек |
| 📱 **Mobile Light** | [`03_radiology_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/03_radiology_mobile_light.png) | **324 КБ** | 390×844 | Сенсорный мобильный видоискатель, нижний бар с кнопками $\ge 44\text{px}$, карусель снимков |
| 🌙 **Mobile Dark** | [`04_radiology_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/04_radiology_mobile_dark.png) | **324 КБ** | 390×844 | Ночной режим для кресла врача, OLED black canvas, кнопки «Негатив», «Контраст», «Линейка», «90°» |

---

## 6. АВТОМАТИЧЕСКИЕ МАШИННЫЕ ГЕЙТЫ (MACHINE QUALITY GATES)

1. **Кодировка и BOM (`npm run check:encoding`)**:
   - Проверено 21 542 файла проекта. Ошибок: **0**.
2. **Токены дизайн-системы (`npm run check:css-tokens`)**:
   - Проверено 1 511 CSS-файлов. Неразрешенных токенов: **0**.
3. **Автотесты рентгенологии (Node.js runner)**:
   - `directRvgCaptureModal.test.tsx`: **9/9 passed** (100%).
   - `universalSensorGateway.test.ts`: **43/43 passed** (100%).
   - `cbctAdaptiveInterpolationPipeline.test.ts`: **11/11 passed** (100%).
   - **Всего: 63/63 passing (100%)**.
