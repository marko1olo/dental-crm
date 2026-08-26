## 2026-08-25T15:43:40Z
You are the Primary Implementation & Quality Worker for DENTE Dental CRM Round 42.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_r42_1

Your task:
1. Read C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md, C:\Clinic_MVP\dental-crm\PROJECT.md, and C:\Clinic_MVP\dental-crm\.agents\AGENTS.md.
2. Read survey reports from C:\Clinic_MVP\dental-crm\.agents\survey_explorer_1\handoff.md, survey_explorer_2\handoff.md, and survey_explorer_3\handoff.md.
3. Verify and execute all quality and compilation gates:
   - Encoding gate: node scripts/check-encoding.mjs
   - CSS token gate: node scripts/check-css-tokens.mjs
   - Typecheck gate: npm run typecheck across packages
   - Test suites: run unit and integration tests across @dental/shared, @dental/web, and @dental/api
4. Verify all requirements R1-R5:
   - R1: SOAP suggestions chip UI ("Подставить шаблон СтАР?") with "Применить" / "✕ Не надо", non-destructive mergeSoapDiaryState, touch targets >= 48-52px, clean Russian copy.
   - R2: 3-Tier Network (Cloud Fastify/PG18, Wi-Fi LAN P2P broker, IndexedDB CRDT LWW).
   - R3: Cross-Platform (PWA SW cold boot, Windows Desktop Kiosk + USB DataMatrix scanner interceptor + ESC/POS printing, Android APK 375-414px + haptic feedback).
   - R4: 10 Themes (Light, Dark, Calm Teal, Contrast, Emerald, Ocean, Sakura, Warm Sand, Night, Cyber X-Ray) & WCAG contrast >= 4.5:1 across 390px, 1024px, 1440px.
   - R5: 54-FZ Idempotency-Key, Banker's rounding roundHalfEven, PostgreSQL atomic transactions.
5. If any test or gate requires fixes, implement them surgically with zero mocks and AST-safe methods.
6. Adhere strictly to DENTE AGENTS.md mandates (HEAD-hash reporting, per-file git add, kopeck-exact money, complete migrations).
