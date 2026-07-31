# UI Integration & Panel Audit Report — DENTE CRM

**Generated:** 2026-07-31  
**Project:** DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`)  

## 1. Summary of [ЧАСТИЧНО] Features Audit

All 11 features marked as `[ЧАСТИЧНО]` in `docs/competitive-audit/FEATURES_REGISTRY.md` have been evaluated across frontend components (`apps/web/src/components/`), routing, and API integration layers:

1. **`финансы::прямой_эквайринг_через_терминал_сбербанка` (#26)**
   - UI Component: `PaymentCapture.tsx` (in `FinanceView.tsx`)
   - Mount Status: Mounted in `#finance`
   - API Status: Missing live POS API integration. Selection is manual `card` without Sber POS driver/webhook.

2. **`кадры::выделенная_роль_куратор_пациентов` (#27)**
   - UI Component: `workspaceShell.tsx`, `SettingsStaffTab.tsx`
   - Mount Status: Unmounted / Missing Role Enum in `@dental/shared`.
   - API Status: Curator analytics and dedicated curator staff role are absent.

3. **`аналитика::онлайн_запись_в_маркетинговых_отчетах` (#28)**
   - UI Component: `AnalyticsDashboardView.tsx`, `ManagerReportsPanel.tsx`
   - Mount Status: Mounted in `#analytics`
   - API Status: Partial API integration; online booking vs admin attribution metrics missing in API output.

4. **`аналитика::рабочий_стол_директора_конверсия_первичных` (#29)**
   - UI Component: `AnalyticsDashboardView.tsx`, `ManagerReportsPanel.tsx`
   - Mount Status: Mounted in `#analytics`
   - API Status: Revenue & flow reports live, but AI primary lead conversion funnel lacks API calculation fields.

5. **`документы::выгрузка_справки_ндфл_в_xml_для_эдо` (#33)**
   - UI Component: `DocumentsView.tsx`, `taxApplicationBlockers.ts`
   - Mount Status: Mounted in `#documents`
   - API Status: Front-end NDFL calculations working; FNS XML schema export for EDO submission is missing endpoint.

6. **`пациенты::обязательность_заполнения_телефона_и_источника` (#35)**
   - UI Component: `PatientOverviewTab.tsx`, `SettingsClinicTab.tsx`
   - Mount Status: Mounted in `#patients`
   - API Status: Fields present; dynamic requirement toggles missing in backend schema.

7. **`прием::рабочий_стол_врача` (#38)**
   - UI Component: `VisitView.tsx`, `ShiftView.tsx`
   - Mount Status: Mounted via `#visit` and `#shift`
   - API Status: EHR and shift views functional, but unified single-screen "Doctor's Desktop" dashboard is fragmented across tabs.

8. **`план_лечения::валидация_цен_и_услуг_при_добавлении_в_наряд` (#41)**
   - UI Component: `planPricing.ts`, `CompletedServicesChecklist.tsx`
   - Mount Status: Mounted in `#visit`
   - API Status: Pricelist checked on client; backend transaction validation blocking zero-priced/archived services is missing.

9. **`система::индикация_нагрузки_и_хватки_оперативной_памяти` (#44)**
   - UI Component: `browserContinuity.ts`, `App.tsx`
   - Mount Status: Mounted in `App.tsx`
   - API Status: Client `performance.memory` API used; backend sysadmin telemetry alert gateway is absent.

10. **`прием::раздел_проверка_историй_болезни_главврачом` (#45)**
    - UI Component: `SettingsAuditTab.tsx`, `VisitView.tsx`
    - Mount Status: Partially mounted (Audit tab only)
    - API Status: Audit logs exist; Chief Doctor approval workflow view (`Unfilled` -> `Approved`) is unmounted as a top-level view.

11. **`кадры::карточка_сотрудника_блокировка_дублей_пароли` (#51)**
    - UI Component: `SettingsStaffTab.tsx`
    - Mount Status: Mounted in `#settings/staff`
    - API Status: Staff management live; password strength meter, duplicate blocker, and 3-column layout partially missing.

## 2. Orphaned / Unmounted UI Panels Audit

Five UI components in `apps/web/src/components/` were found to be explicitly unmounted due to missing backend API endpoints or missing DB writers:
1. `DadataGeocodedAddressesWidget.tsx` (in `components/integrations/`)
2. `SingleSessionEnforcementsWidget.tsx` (in `components/crm/`)
3. `BulkImageOperationLogsWidget.tsx` (in `components/crm/`)
4. `PatientServiceLineagesWidget.tsx` (in `components/crm/`)
5. `CustomCrmTaskTypesWidget.tsx` (in `components/crm/`)
