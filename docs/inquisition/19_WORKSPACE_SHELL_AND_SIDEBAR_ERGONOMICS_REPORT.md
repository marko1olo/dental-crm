# 19. WORKSPACE SHELL & SIDEBAR ERGONOMICS REPORT

> **Канонический статус**: Завершён  
> **Мандаты**: 8b (Anti-Monolith $\le 120$ строк), 8am (Единый дизайн-код и шапки), 8ze (Touch Ergonomics), 8wy (Zero-Mocks, 100% реальные токены), VCS Law (§2).

---

## 1. Контекст и первопричины (Root Cause)

В ходе Red Team аудита рабочей оболочки (Workspace Shell) были выявлены следующие дефекты эргономики боковой панели (`WorkspaceSidebar.tsx` и `sidebar.css`):
1. **Визуальный шум и перегрузка `.sidebar-quick-tools`**:
   - Кнопки быстрых действий («Клинические задачи» и «Профосмотры») имели толстые рамки, тяжёлые тени (`shadow-2xs`) и выглядели как массивные инородные кирпичи, выбиваясь из общей иерархии боковой панели.
   - В свернутом состоянии (`collapsed=true`) текст исчезал, но кнопки сохраняли прямоугольную форму без центрирования и тултипов.
2. **Селекторная ловушка и обрезание текста в collapsed-режиме**:
   - В `sidebar.css` селектор `[data-collapsed="true"] .sidebar` искал потомка `.sidebar` внутри контейнера с атрибутом `data-collapsed`. При нахождении атрибута прямо на `aside.sidebar` селектор не срабатывал. В результате в компактном рельсе под иконками отображались неаккуратно обрезанные многоточиями строки («Смена Пока...», «Записи График...»).
3. **Дисбаланс подвала (`.sidebar-footer`)**:
   - Кнопка сворачивания (`.sidebar-collapse-button`) и виджет переключения тем (`ThemeQuickAccessWidget`) в свернутом виде не имели строго фиксированных размеров 32×32px, что приводило к смещению по вертикали.
4. **Монолитность `WorkspaceSidebar.tsx` (Мандат 8b)**:
   - Исходный компонент насчитывал 326 строк, объединяя в себе данные навигации, иконки, логику фильтрации по режимам клиники и правам ролей, списки навигации и подвал.

---

## 2. Архитектурное решение и декомпозиция (Мандат 8b $\le 120$ строк)

Монолит разделен на 4 модульных компонента с сохранением 100% обратной совместимости для внешних потребителей:

1. **[`sidebarNavigationData.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/workspaceShellModules/sidebarNavigationData.ts) (99 строк)**:
   - `sidebarIcons`, `actionIcons` (строго Lucide без кустарных SVG).
   - `sidebarHints`, `collapsedNavLabels` (микро-хинты и краткие подписи).
   - Чистые функции фильтрации: `viewsHiddenByFeatureFlags`, `getVisibleRailViews`, `getRailViewsHiddenByMode`.
2. **[`SidebarQuickTools.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/workspaceShellModules/SidebarQuickTools.tsx) (74 строки)**:
   - Легковесные плавающие строки (`floating capsules`) без тяжелых рамок и теней в развернутом режиме.
   - Центрированные квадратные кнопки 36×36px с иконками `ClipboardCheck` и `PhoneCall` в компактном рельсе (`collapsed=true`).
   - 100% сохранение кастомных событий: `dente:open-clinical-tasks` и `dente:open-recalls-hub`.
3. **[`SidebarNavList.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/workspaceShellModules/SidebarNavList.tsx) (94 строки)**:
   - Рендеринг основного списка разделов CRM с поддержкой hover/focus intent предзагрузки (`onViewIntent`).
   - Отображение бейджа дефицита склада `reorderItemsCount` (`data-testid="sidebar-inventory-reorder-badge"`).
4. **[`WorkspaceSidebar.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/workspaceShellModules/WorkspaceSidebar.tsx) (107 строк)**:
   - Корневая оркестрация сайдбара, интеграция `ThemeQuickAccessWidget`, `sidebar-collapse-button` и `ClinicControlPill`.
   - Реэкспорт хелперов и иконок для обратной совместимости.
5. **[`sidebar.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/modules/sidebar.css)**:
   - Исправлены селекторы `.sidebar[data-collapsed="true"]` для безусловного скрытия `.nav-copy` и `.nav-hint`.
   - Добавлен 0px CLS transition `width 0.18s cubic-bezier(0.4, 0, 0.2, 1)`.
   - Стилизованы `.sidebar-quick-tool-btn--expanded` и `.sidebar-quick-tool-btn--collapsed`.
   - Выровнены кнопки в подвале (32×32px).

---

## 3. Машинные гейты и верификация (Proof & Verification)

- **Unit-тесты (vitest)**:
  - `apps/web/src/__tests__/workspaceSidebarErgonomics.test.ts` (2 tests) — PASSED.
  - `apps/web/src/components/theme/__tests__/ThemeInquisitionAndSilenceAudit.test.ts` (5 tests) — PASSED.
  - `apps/web/src/tests/scaleSovereigntyRoleSwitcher.test.tsx` (10 tests) — PASSED.
  - Итого: 17 unit-тестов, 0 failing.
- **Гейт кодировки (`npm run check:encoding`)**: 21 388 файлов проверено, 0 замечаний.
- **Гейт CSS-токенов (`node scripts/check-css-tokens.mjs`)**: 1 487 файлов, 0 неразрешенных переменных.
- **4-состояный визуальный пруф (Red Team Visual Proof)**:
  - ☀️ PC Light (1440×900, expanded): `scratch/sidebar_pc_light_expanded.png` (226 KB)
  - ☀️ PC Light (1440×900, collapsed): `scratch/sidebar_pc_light_collapsed.png` (135 KB)
  - 🌙 PC Dark (1440×900, expanded): `scratch/sidebar_pc_dark_expanded.png` (153 KB)
  - 🌙 PC Dark (1440×900, collapsed): `scratch/sidebar_pc_dark_collapsed.png` (246 KB)
