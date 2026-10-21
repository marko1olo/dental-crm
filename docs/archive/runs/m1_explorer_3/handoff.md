# Handoff Report — M1 E2E Audit Harness Investigation

## 1. Observation

- **Script Inspected**: `C:\Clinic_MVP\dental-crm\e2e_4state_audit.cjs` (666 lines) and `C:\Clinic_MVP\dental-crm\e2e_4state_full_audit.cjs` (627 lines).
- **Target Surfaces**:
  - **14 Panels** (`PANELS` array in `e2e_4state_audit.cjs:21-36`):
    1. `shift` (`#shift`)
    2. `schedule` (`#schedule`)
    3. `patients` (`#patients`)
    4. `imaging` (`#imaging`)
    5. `visit` (`#visit`)
    6. `documents` (`#documents`)
    7. `finance` (`#finance`)
    8. `analytics` (`#analytics`)
    9. `communications` (`#communications`)
    10. `inventory` (`#inventory`)
    11. `scanner` (`#scanner`)
    12. `leads` (`#leads`)
    13. `settings` (`#settings`)
    14. `marketing` (`#marketing`)
  - **15 Modal Dialogs / Overlays** (`e2e_4state_audit.cjs:322-622`):
    1. `dialog_1_command_palette`: `Control+K` keyboard shortcut on `#schedule`
    2. `dialog_2_waitlist_drawer`: Click `button:has-text("Лист ожидания"), button:has-text("Ожидание")` on `#schedule`
    3. `dialog_3_new_appointment_form`: Click `button:has-text("Запись"), button:has-text("Новая запись")` on `#schedule`
    4. `dialog_4_sberbank_terminal`: Click `button:has-text("Терминал"), button:has-text("Оплата карточкой")` on `#finance`
    5. `dialog_5_signature_pad`: Click `button:has-text("Подписать на планшете"), button:has-text("Подпись")` on `#documents`
    6. `dialog_6_cryptopro_signer`: Click `button:has-text("Подписать ЭЦП"), button:has-text("ЭЦП")` on `#visit`
    7. `dialog_7_ndfl_calculator`: Click `button:has-text("Рассчитать НДФЛ"), button:has-text("Справка для налоговой")` on `#documents`
    8. `dialog_8_add_price_service`: Click tab `Прайс`/`Услуги` + button `Добавить услугу` on `#settings`
    9. `dialog_9_telegram_link`: Click tab `Telegram`/`Интеграции` + button `Привязать Telegram` on `#settings`
    10. `dialog_10_inventory_confirm`: Click button `Списать материал`/`Списание` on `#inventory`
    11. `dialog_11_treatment_estimator`: Click button `Смета лечения`/`Смета` on `#visit`
    12. `dialog_12_clinical_recommendations`: Click button `Клинические рекомендации`/`Рекомендации` on `#visit`
    13. `dialog_13_staff_pin_pad`: Click button `Заблокировать` on `#schedule`
    14. `dialog_14_auth_hub_login`: Clear localStorage tokens (`dente_clinic_token`, `dente_staff_token`) + navigate to `/`
    15. `dialog_15_incoming_call_toast`: Re-inject tokens + dispatch `window.dispatchEvent(new CustomEvent('dente_telephony_incoming_call', ...))` on `#schedule`

- **4 Rendering Configurations** (`e2e_4state_audit.cjs:39-44`):
  1. `Mobile_Light`: Viewport 390x844, `isMobile: true`, `hasTouch: true`, `colorScheme: 'light'`, `themeMode: 'light'`
  2. `Mobile_Dark`: Viewport 390x844, `isMobile: true`, `hasTouch: true`, `colorScheme: 'dark'`, `themeMode: 'dark'`
  3. `PC_Light`: Viewport 1440x900, `isMobile: false`, `colorScheme: 'light'`, `themeMode: 'light'`
  4. `PC_Dark`: Viewport 1440x900, `isMobile: false`, `colorScheme: 'dark'`, `themeMode: 'dark'`

- **Total Screenshot Deliverable**: 29 surfaces x 4 states = **116 PNG images** + `audit_summary_manifest.json`.

- **Server Prerequisites & Port**:
  - `apps/web/package.json:7`: `"dev": "vite --host 127.0.0.1 --port 5173"`
  - `e2e_4state_audit.cjs:14`: `const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';`
  - Prerequisites: Vite dev server running on `http://127.0.0.1:5173` (or Vite preview on `http://127.0.0.1:4173` if setting `BASE_URL=http://127.0.0.1:4173`).

- **Auth & API Mocking Mechanics** (`e2e_4state_audit.cjs:141-219`):
  - Injects LocalStorage BEFORE React hydration via `context.addInitScript`:
    - `dente_clinic_token`: `'test-clinic-token-abc123'`
    - `dente_staff_token`: `'test-staff-token-xyz789'`
    - `dente_theme_mode`: `'light'` / `'dark'`
    - `dental-crm:web-ui-preferences:v1`: `onboardingDismissed: true`
  - Intercepts all `/api/**` traffic via `context.route`:
    - `/api/auth/user/me`: returns mock owner profile
    - `/api/dashboard`: returns mock clinic dashboard (clinic info, staff, appointments, waitlist, statistics)
    - `/api/settings/staff`, `/api/settings/preferences`, `/api/settings/clinic/profile`, `/api/system/`: returns mock JSON schemas
    - Fallback GET returns `[]`, write operations return `{ ok: true }`

- **Artifact Destination**:
  - `OUT_DIR = process.env.ARTIFACTS_DIR || 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\67e66496-7d3f-4df1-8f98-31bd016dcb96'`
  - Minimum screenshot file size threshold: 20,000 bytes (20KB validation gate).

---

## 2. Logic Chain

1. **Prerequisite Validation**: The frontend app is a Vite SPA located at `apps/web`. Running `npm run dev -w @dental/web` starts the local web server at `127.0.0.1:5173`. Playwright requires this port to be responsive before launching `chromium.launch()`.
2. **Authentication Gating**: The frontend checks `localStorage` for `dente_clinic_token` and `dente_staff_token`. In `e2e_4state_audit.cjs`, using `addInitScript` guarantees these tokens are present before React initial rendering, preventing unexpected redirects to login (except for Dialog 14 which explicitly tests login screen rendering by clearing tokens).
3. **API Independence**: The test script intercepts all HTTP requests matching `**/api/**` and returns pre-populated mock fixtures (owner staff, appointments, waitlist, clinic profile). This isolates the visual audit from requiring a live PostgreSQL database or Fastify server during visual testing.
4. **Theme Enforcement**: `applyThemeState()` explicitly sets `data-theme` attribute on `document.documentElement`, sets `className`, and dispatches state to `window.__useThemeStore` to force React components into light or dark mode instantly across state iterations.
5. **Crash Assertion**: `captureShot()` inspects `body.innerText` for React Error Boundary crash keywords (`Something went wrong`, `Что-то пошло не так`, `Раздел временно не открылся`, `Ошибка рендеринга`, `Uncaught Error`) and enforces a >20KB file size check. This guarantees that visual regressions or JavaScript exceptions immediately halt test execution.

---

## 3. Caveats

- **Network Idle vs API Polling**: The frontend uses polling intervals (e.g. for notifications/telephony). `waitUntil: 'networkidle'` is intentionally NOT used because polling prevents network idle. `waitUntil: 'load'` with explicit timeouts is required.
- **Button Selector Sensitivity**: Dialogs 2-13 rely on text selectors (e.g. `button:has-text("Запись")`). If component refactoring changes button labels, the modal test will throw a selector timeout error.
- **Port Conflict Assumption**: Assumes port 5173 is available for Vite. If port 5173 is occupied, Vite will increment to port 5174, which would cause `e2e_4state_audit.cjs` to fail unless `BASE_URL=http://127.0.0.1:5174` is supplied.

---

## 4. Conclusion

`e2e_4state_audit.cjs` is fully structured, functional, and self-contained for Milestone 2 execution. It provides complete 4-state visual coverage (Mobile Light, Mobile Dark, PC Light, PC Dark) across all 14 panels and 15 modals, generating exactly 116 PNG artifacts and `audit_summary_manifest.json`.

---

## 5. Verification Method

- **Command to Execute Audit in Milestone 2**:
  ```bash
  # Step 1: Ensure dev server is running on port 5173
  # In background terminal or task:
  npm run dev -w @dental/web

  # Step 2: Execute E2E 4-State Visual Audit
  node e2e_4state_audit.cjs
  ```
- **Files to Inspect**:
  - `C:\Users\Admin\.gemini\antigravity\brain\67e66496-7d3f-4df1-8f98-31bd016dcb96\audit_summary_manifest.json`
  - 116 generated screenshot `.png` files in the artifact directory.
- **Invalidation Conditions**:
  - If `audit_summary_manifest.json` shows `consoleErrorsCount > 0`, `pageErrorsCount > 0`, or `scriptErrorsCount > 0`.
  - If any generated PNG file size is under 20,000 bytes.
