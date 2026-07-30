# Y1-price-two-truths — state

STATUS: INSTANCE-2 DEFECT RE-CONFIRMED AT HEAD — building own inventories

## INSTANCE-2 RE-MEASUREMENT (my own commands, not inherited)
DB (read-only via repo pg driver, 127.0.0.1:5432), TRUE_EXIT=0:
  organizations = 2   -> DOSSIER SAID 4. WRONG. Live: d0000000-…d001 «Демо-клиника для снимков»,
                         4a3420d1-…f191 «Стоматология, 1 кабинет». Both clinic_mode='demo'.
  service_catalog_items = 0 rows   (defect precondition CONFIRMED)
  services              = 0 rows
  treatment_items       = 10 rows, count(service_id) = 0  -> every plan line is unpriceable by id
  columns: code NOT NULL, title NOT NULL, base_price_rub NOT NULL, price_rub NOT NULL,
           duration_minutes NOT NULL default 30
  service_category enum = consultation therapy surgery prosthetics orthodontics periodontology
                          hygiene imaging documents other   -> NO "orthopedics" (confirms R3)
Defect at HEAD 320329492, verified with `git show HEAD:…`:
  domainStateHydration.ts:775  `if (serviceRecords.length > 0) {`
  pricelistQuery.ts:22         db.select().from(serviceCatalogItems) read raw, no contract
Instance-1's inherited claim «7 services / prices 1200…26000» NOT yet re-measured by instance 2.
`routes/pricelist.ts:44` DOES call getServiceCatalogForOrganization -> the comment claiming it is TRUE.
HEAD at start (instance 1): 2cf36a1e7a2decc3323b92ed721a969382eaabdf  (STALE)
HEAD at start (instance 2): 320329492e61d56b5a61cc9fc1457a8b36857b14
PACKET: Y1-price-two-truths (MONEY lane, highest severity)

## INSTANCE 2 RESUMPTION NOTE (this is a different agent process)
Instance 1 died after INVENTORIES with an UNCOMMITTED edit already on disk in both owned files.
I inherit nothing as fact. Per cycle-9 delta #4 every inherited number is re-measured before it is
reported. Working-tree state observed by instance 2:
  M apps/api/src/db/domainStateHydration.ts   <- instance 1, price work only (verified by reading diff)
  M apps/api/src/db/pricelistQuery.ts         <- instance 1, price work only
  M apps/api/src/db/schema.ts                 <- NOT MINE: clinic-mode packet (DEFAULT_CLINIC_MODE)
  ?? apps/api/drizzle/0140_clinic_mode_one_vocabulary.sql  <- NOT MINE: clinic-mode packet
  staged by others: apps/api/src/db/rebookingConversionRulesQuery.ts (D),
                    apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx (D)
=> COMMIT PATHSPEC IS EXACTLY TWO FILES:
   apps/api/src/db/domainStateHydration.ts apps/api/src/db/pricelistQuery.ts
   schema.ts and the .sql are another author's and must NOT be staged.
=> schema.ts / migration NOT needed by me: no contract invented, option (a) taken.

## Claim
- apps/api/src/db/domainStateHydration.ts   (CLEAN at start)
- apps/api/src/db/pricelistQuery.ts         (CLEAN at start)
- seeding path of my choice  -> NOT USED, option (a) chosen (table is the only truth)
- schema.ts / migration      -> NOT NEEDED, no contract invented

## Collision watch (NOT mine, do not touch)
Staged by another agent at my start:
  D  apps/api/src/db/rebookingConversionRulesQuery.ts
  D  apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx
Dirty by others: apps/web/src/{MarketingView,PaymentCapture,ScheduleView,useAppLogic}.tsx,
components/odontogram/TreatmentEstimator.tsx, components/settings/SettingsPricesTab.tsx,
apps/api/src/routes/clinical.ts, apps/api/src/tests/webCallsExistingRoutes.test.ts,
packages/shared/dist/*.  => commit with explicit pathspec after `--`.

## Milestones
- [x] STARTED
- [x] AUTHORITY READ (AGENTS.md, INDEX.md, BILLING_AND_FINANCE.md, DOCUMENTS_LIFECYCLE.md — full)
- [x] DEFECT CONFIRMED (domainStateHydration.ts:775)
- [x] INVENTORIES
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## INVENTORY A — readers of the IN-MEMORY demo catalogue (sampleData.ts)
Declarations: sampleData.ts:565 serviceCatalogMap, :573 getServiceCatalogItem, :583 serviceCatalog
(SEVEN items, not six), :880 index build, :167 organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191".
API:
- sampleData.ts:1284  buildBillingSummary -> taxDeductionEligibleRub
- sampleData.ts:8828  buildDenteTelegramRecallItems -> hygiene recall
- sampleData.ts:10385 buildDashboard -> Dashboard.serviceCatalog  (the wire)
- domainStateHydration.ts:80,81,776,780,781 (writer/gate)
- tests/sampleData.test.ts:12,13,128-156,337-357
WEB (all via Dashboard.serviceCatalog, i.e. the same wire):
- useAppLogic.tsx:5059, :5089, :11382, :13686
- FinanceView.tsx:242, :247 -> FinancePlanning.tsx:138 ServiceCatalogStrip (slice(0,6))
- FinanceLedger.tsx:6,21,37,44
- components/odontogram/TreatmentEstimator.tsx:298, :531
- components/plan/ComparativePlannerDashboard.tsx:322, :690, :712, :978
- components/InventoryView.tsx:143, :183
- components/settings/SettingsPricesTab.tsx:99
- components/settings/SettingsImportsTab.tsx:1866, SettingsAuditTab.tsx:1869,
  SmartImportStudio.tsx:2283, LegacyMigrationStudio.tsx:2279
- useSettingsDerivations.tsx:2268, workspaceUiLabels.ts:174, AppHelpers.tsx:3818

## INVENTORY B — readers/writers of the TABLE service_catalog_items
READ:
- pricelistQuery.ts:23  getServiceCatalogForOrganization  <- documentQuery.ts:345
  -> renderDocument.ts:658 serviceCatalogMap(context), :688 financialServiceRows,
     :696 services.get(item.serviceId), :697 title = service?.title ?? item.serviceId
- domainStateHydration.ts:305 selectByOrganization(schema.serviceCatalogItems)
- routes/inventory.ts:380, :451, :531 (material rules validate serviceId against the table)
- routes/workspaceProfile.ts:821 (existence probe)
WRITE:
- routes/workspaceProfile.ts:771  <-- BROKEN, see R3
- routes/workspaceProfile.ts:932
- scripts/migrateStateToDb.ts:43 (delete all)
- tests/routes/diaryDeductionProof.ts:221/:407, tests/routes/diarySigningCeremony.test.ts:141/:343

## MEASUREMENTS (all commands actually run)
DB (read-only, 127.0.0.1:5432):
  organizations = 2  (4a3420d1-6ffb-4459-bd8f-7f7087f5e191 "Стоматология, 1 кабинет";
                      d0000000-0000-4000-8000-00000000d001 "Демо-клиника для снимков")
                      -> dossier said 4; live count is 2 today.
  service_catalog_items = 0 rows, services = 0 rows
  treatment_items = 10 rows, service_id NOT NULL on 0 of them (all NULL)
  service_catalog_items columns: base_price_rub AND price_rub, both NOT NULL; title NOT NULL, no default
  service_category enum: consultation therapy surgery prosthetics orthodontics periodontology
                         hygiene imaging documents other   (NO "orthopedics")
API (live 127.0.0.1:4100, real 2-segment token):
  GET /api/dashboard org 4a3420d1 -> 200, serviceCatalog length 7, prices 1200/6800/1500/4500/
    1800/5200/26000, treatmentPlanItems 0
  GET /api/dashboard org d0000000 -> 200, serviceCatalog length 7 STAMPED WITH ORG 4a3420d1
    (cross-tenant leak), treatmentPlanItems 10 with serviceId "" and prices 7200/5400/14800/26500,
    billingSummary.taxDeductionEligibleRub = 0 while totalPaidRub = 67400

## THREE ROOT CAUSES
R1 domainStateHydration.ts:775 `if (serviceRecords.length > 0)` — empty table keeps the compiled-in
   demo array. Confirmed live.
R2 TWO independent mappers of the same row: pricelistQuery.ts:24-36 vs domainStateHydration.ts:678-708.
   Different clamping, and hydration silently DROPS rows failing serviceCatalogItemSchema while
   pricelistQuery keeps them raw -> the two surfaces can disagree even with a filled table.
R3 The only production writer is broken: routes/workspaceProfile.ts:723-771 inserts `name:` where the
   column is `title` (NOT NULL, no default) and uses category "orthopedics" which is not in the enum.
   NOT MINE TO "FIX" — its prices (3500/7500/5500/35000/15000) are invented, and the packet forbids
   seeding invented prices. Reported as a blocker for the lead.

## §3 CHANNEL ALREADY EXISTS AND IS DEAD BECAUSE OF R1
FinancePlanning.tsx:153-160 renders «Каталог услуг пуст. Заполните прайс в настройках, чтобы план
лечения и оплаты не требовали ручных сумм.» + button «Открыть прайс». Unreachable today because the
fallback always supplies 7 services. Removing the fallback ACTIVATES it. No UI edit needed.
slice(0,6) at FinancePlanning.tsx:139 is why the recon capture showed SIX of the seven.

## Log
- STARTED / AUTHORITY READ / DEFECT CONFIRMED / INVENTORIES.
- Next: rewrite pricelistQuery.ts as the single projection, make hydration use it, drop the gate.
