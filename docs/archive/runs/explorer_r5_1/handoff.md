# Handoff Report — Explorer 1 (Resurrected Session R5)

## 1. Observation

### Target Files & Locations
- **`apps/web/src/SettingsView.tsx`**:
  - Line 1864: `<motion.section className="settings-zone panel" ...>`
  - Lines 1880-1912: `<div className="settings-heading">` containing `<p className="eyebrow">Настройки</p>` and `<h2>Настройки клиники</h2>`
  - Lines 1914-1948: `<div className="settings-tabs" role="tablist">` rendering group headers `<span className="settings-tabs-group-header">{group.title}</span>` (e.g. `"МОЙ АККАУНТ"`) and tab buttons (e.g. `"Мой профиль"`)
  - Line 1951: `<div className="settings-tab-panel">` rendering active tab components (e.g. `<SettingsProfileTab />`)
- **`apps/web/src/components/settings/SettingsProfileTab.tsx`**:
  - Line 361: `<div className="settings-tab-pane animate-fade-in-up">`
  - Line 362-365: `<div className="settings-header"><h2 id="tabpanel-profile-title">Мой профиль</h2><p>...</p></div>`
- **`apps/web/src/styles/main.css`**:
  - Line 14389: `.settings-tabs button.active { order: -1; }` under `@media (max-width: 860px)`
  - Lines 15008-15014: `.settings-tabs { display: flex; flex-direction: column; gap: 6px; position: sticky; top: 100px; }`
  - Lines 15470-15561: Mobile overrides `@media (max-width: 860px)` for `.settings-zone`, `.settings-heading`, `.settings-tabs`, `.settings-tabs-group`, `.settings-tabs-group-header`, and `.settings-tab-panel`.

---

## 2. Logic Chain

1. **DOM Hierarchy in `SettingsView.tsx`**:
   - `SettingsView` renders three consecutive blocks inside `.settings-zone`:
     1. `.settings-heading`: Eyebrow `"Настройки"` + Title `"Настройки клиники"` + Action buttons.
     2. `.settings-tabs`: Grouped container with sub-containers `.settings-tabs-group`, each containing a `.settings-tabs-group-header` (e.g. `"МОЙ АККАУНТ"`) and tab `<button>` elements (e.g. `"Мой профиль"`).
     3. `.settings-tab-panel`: Tab panel container wrapping child components like `<SettingsProfileTab />`, which has its own `<div className="settings-header"><h2>Мой профиль</h2>...</div>`.

2. **The `order: -1` Flex Reordering Defect (Root Cause 1)**:
   - In `main.css` line 14389 under `@media (max-width: 860px)`, there is a rule:
     ```css
     .settings-tabs button.active {
       order: -1;
     }
     ```
   - When `.settings-tabs-group` was introduced for sidebar grouping, `.settings-tabs button` elements became children of `.settings-tabs-group` (`display: flex; flex-direction: row`).
   - Applying `order: -1` to an active tab button inside `.settings-tabs-group` forces the active button (`"Мой профиль"`) to visually jump BEFORE its group header (`"МОЙ АККАУНТ"`).
   - On narrow mobile screens (390px viewport width in `Mobile_Dark`), this reordering breaks the horizontal flow, causing the tab button `"Мой профиль"`, the group header `"МОЙ АККАУНТ"`, and the main header `"НАСТРОЙКИ Настройки клиники"` to collide and visually overlap on top of each other.

3. **Stacking Context & Framer Motion Collision (Root Cause 2)**:
   - `SettingsView.tsx` wraps `.settings-zone` in a Framer Motion `<motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>`.
   - `SettingsProfileTab.tsx` wraps its panel in `<div className="settings-tab-pane animate-fade-in-up">`, which triggers keyframe animation `fadeInUp` (`transform: translateY(...)`).
   - CSS `transform` creates a new stacking context. In `@media (max-width: 860px)`, `.settings-heading` is given `z-index: 2` and `.settings-tabs` is given `z-index: 1`, but `.settings-tab-panel` has no explicit `z-index` or clearance.
   - When `animate-fade-in-up` executes on mobile, the tab content transforms upwards during mount and overlaps the `.settings-tabs` strip and `.settings-heading`.

4. **Redundant Heading Cramming (Root Cause 3)**:
   - On 390px mobile viewports, the main view heading (`"Настройки / Настройки клиники"`), the tab group header (`"МОЙ АККАУНТ"`), the active tab chip (`"Мой профиль"`), and the tab panel header (`"Мой профиль"`) create 4 lines of heading text jammed into ~120px of vertical space with `margin-bottom: 0 !important;` on `.settings-heading`.

---

## 3. Caveats

- **Scope Limit**: Investigation was strictly read-only per Explorer role. Source code files were not modified directly.
- **Environment**: Visual evidence based on reported `Mobile_Dark_panel_settings.png` defect and code analysis of `SettingsView.tsx`, `SettingsProfileTab.tsx`, `SettingsClinicTab.tsx`, and `main.css`.

---

## 4. Conclusion & Proposed Code Fix Plan

### Proposed CSS Changes (`apps/web/src/styles/main.css`)

Add/update the following rules in `@media (max-width: 860px)` at the end of `main.css`:

```css
@media (max-width: 860px) {
  /* Fix 1: Reset flex order on active settings tab buttons to prevent group header collisions */
  .settings-tabs button.active {
    order: 0 !important;
    transform: none !important;
  }

  /* Fix 2: Provide clean vertical spacing and clearance for settings heading */
  .settings-heading {
    width: 100% !important;
    margin-bottom: 12px !important;
    position: relative !important;
    z-index: 5 !important;
    flex-shrink: 0 !important;
  }

  /* Fix 3: Isolate settings tabs container so horizontal scroll flows cleanly */
  .settings-tabs {
    position: relative !important;
    top: auto !important;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    gap: 12px !important;
    padding: 6px 0 10px !important;
    margin-bottom: 12px !important;
    scrollbar-width: none !important;
    width: 100% !important;
    max-width: 100% !important;
    border-bottom: 1px solid var(--line) !important;
    z-index: 4 !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* Fix 4: Prevent active tab panel from animation stacking over tabs */
  .settings-tab-panel {
    position: relative !important;
    z-index: 1 !important;
    padding: 16px 12px !important;
    margin-top: 0 !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .settings-tab-pane {
    position: relative !important;
    z-index: 1 !important;
  }
}
```

### Proposed Component Adjustments (`apps/web/src/components/settings/SettingsProfileTab.tsx`)

Ensure `SettingsProfileTab.tsx` header has responsive spacing on mobile viewports so that its `<h2>` title does not collide with `.settings-tabs`:

```tsx
/* In SettingsProfileTab.tsx line 362 */
<div className="settings-header mb-4">
    <h2 id="tabpanel-profile-title" className="text-lg md:text-xl font-bold">Мой профиль</h2>
    <p className="text-xs md:text-sm text-[var(--muted)]">Личные данные, пароль и PIN-код для входа в систему.</p>
</div>
```

---

## 5. Verification Method

1. **Typecheck Verification**:
   Run `npm run typecheck -w @dental/web` to confirm zero TypeScript errors.

2. **E2E Visual Audit Script**:
   Run `node e2e_4state_audit.cjs` to render all 4 states (`Mobile_Light`, `Mobile_Dark`, `PC_Light`, `PC_Dark`).

3. **Visual Inspection**:
   Inspect `Mobile_Dark_panel_settings.png` in the artifact directory (`C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688\Mobile_Dark_panel_settings.png`) to visually verify:
   - "НАСТРОЙКИ Настройки клиники" is displayed cleanly at top.
   - The tab scrollbar ("МОЙ АККАУНТ" -> "Мой профиль", "ОСНОВНЫЕ" -> "Клиника") renders horizontally below the heading without overlapping.
   - The tab panel ("Мой профиль" content) renders cleanly beneath the tab navigation bar.
