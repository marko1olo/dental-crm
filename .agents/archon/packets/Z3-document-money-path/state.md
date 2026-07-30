# Z3-document-money-path — state

STATUS: DEFECT CONFIRMED (все три), инвентаризация идёт
HEAD на входе: 423a7a39d24ec83af825e64849eac4774ea54b1e
Мои файлы в git status: ЧИСТЫЕ (проверено `git status --porcelain -- apps/api/src/documents/ apps/api/src/migration/`)

## Прочитано полностью
.agents/AGENTS.md, .agents/INDEX.md, .agents/DOCUMENTS_LIFECYCLE.md, .agents/BILLING_AND_FINANCE.md,
.agents/archon/recon/R4-money-precision/dossier.md (704 строки, целиком),
apps/api/src/documents/taxPaymentSnapshot.ts (176), apps/api/src/documents/taxXml.ts (680),
apps/api/src/migration/rowTransform.ts (641), apps/api/src/migration/valueNormalize.ts (1032),
apps/api/src/migration/reconcile.ts (493), packages/shared/src/utils/money.ts (199),
apps/api/src/migration/loader.ts (регион 930-1316, платежи + loaderFor).

## ПОДТВЕРЖДЕНО НА РЕАЛЬНЫХ СТРОКАХ

(a) F11 — ДА. `apps/api/src/documents/taxPaymentSnapshot.ts:174-176`
    `snapshot.payments.reduce((total, payment) => total + payment.amountRub, 0)`.
    Единственный вызов: `apps/api/src/routes/documents.ts:335` внутри `taxSnapshotDocument()`.

(a2) НОВОЕ, дозор не назвал: `apps/api/src/documents/taxXml.ts:338-342` `taxPaymentSum` — ВТОРОЙ
    float-reduce по ТЕМ ЖЕ платежам, он даёт «СуммаКод1»/«СуммаКод2» в XML КНД 1184043 для ФНС.
    То есть у одной справки два независимых итога, и они могут разойтись между собой.

(b) F12/F14 — ДА, и форматтеров ТРИ, а не два:
    1) экран: `apps/web/src/AppHelpers.tsx:2509-2530` `money()` — исправлен, всегда 2 знака;
    2) бумага: `apps/api/src/documents/renderDocument.ts:57-59` `rub()` — голый toLocaleString,
       0..3 знака. ЭТО ФАЙЛ Z1, НЕ ТРОГАЮ, отдаю шов;
    3) XML для ФНС: `apps/api/src/documents/taxXml.ts:344-346` `money()` —
       `Math.max(0, value).toFixed(2)`: 2 знака есть, но вход float и округление молчаливое.
       Это МОЙ файл — правлю его.

(c) F17 — ДА. `apps/api/src/migration/valueNormalize.ts:892` `Math.round(kopecks.value / 100)`,
    вызывается из `apps/api/src/migration/rowTransform.ts:379`; точные копейки считаются строкой
    ниже (:380) и уходят только в normalized_json. Колонка `payments.amount_rub` —
    numeric(12,2) mode:"number" (schema.ts:535), `mapToDriverValue = String`, то есть дробное
    значение записалось бы точно. Округление ничем не оправдано.
    Загрузчик: `apps/api/src/migration/loader.ts:1004,1059` пишет `values.amountRub` в колонку.
    Сопутствующее: `reconcile.ts:173-179` (Math.round на рублёвых суммах), `:367-382` (проверка
    «округление раскрыто»), `:417` (Math.round итога отчёта).

## Следующий шаг
Дочитать engine.ts (регион денег), streamStage.ts, verify-migration-engine.ts:200-240,
tests/valueNormalize.test.ts. Затем правки.
