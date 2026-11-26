# 📋 SCREEN REGISTRY — ПОЛНЫЙ РЕЕСТР ЭКРАНОВ DENTE CRM (SSOT)

> **Источник истины:** [`scripts/screen-targets.mjs`](../scripts/screen-targets.mjs) (синхронизировано с `packages/shared/src/navigation/workspaceRoutes.ts`, `apps/web/src/router/routeResolver.ts`, `WorkspaceStudioOverlayHost.tsx`, `AppModalsContainer.tsx`, `publicPortalRoute.ts`).
>
> **Всего целей:** **70** уникальных поверхностей (`21` views + `34` overlays + `7` modals + `4` portals + `4` empty) × 4 состояния (`1440×900 light`, `1440×900 dark`, `390×844 light`, `390×844 dark`) = **276 скриншотов + 276 `.metrics.json`**.

---

## 1. ОСНОВНЫЕ РАЗДЕЛЫ РАБОЧЕГО МЕСТА (`group: views` — 21 цель)

| ID | Домен | Компонент | Hash URL | Viewports |
|---|---|---|---|---|
| `001` | `shift` | `ShiftView` | `#shift` | D, M |
| `002` | `schedule` | `ScheduleView` | `#schedule` | D, M |
| `003` | `patients` | `PatientsView` | `#patients` | D, M |
| `004` | `visit` | `VisitView` | `#visit` | D, M |
| `005` | `treatment_plans` | `TreatmentPipeline` | `#treatment-plans` | D, M |
| `006` | `finance` | `FinanceView` | `#finance` | D, M |
| `007` | `warehouse` | `InventoryView` | `#warehouse` | D, M |
| `008` | `lab` | `LabOrdersPage` | `#lab` | D, M |
| `009` | `imaging` | `ImagingView` | `#imaging` | D, M |
| `010` | `documents` | `DocumentsView` | `#documents` | D, M |
| `011` | `communications` | `CommunicationsView` | `#communications` | D, M |
| `012` | `leads` | `LeadsKanbanView` | `#leads` | D, M |
| `013` | `analytics` | `AnalyticsDashboardView` | `#analytics` | D, M |
| `014` | `analytics` | `MarketingView` | `#marketing` | D, M |
| `015` | `settings` | `SettingsClinicTab` | `#settings/clinic` | D, M |
| `016` | `settings` | `SettingsStaffTab` | `#settings/staff` | D, M |
| `017` | `settings` | `SettingsPricesTab` | `#pricelist` | D, M |
| `018` | `settings` | `SettingsAccessTab` | `#settings/access` | D, M |
| `019` | `settings` | `SettingsHardwareTab` | `#settings/hardware` | D, M |
| `020` | `settings` | `SettingsMessengersTab` | `#settings/messengers` | D, M |
| `021` | `warehouse` | `ScannerView` | `#scanner` | D, M |

---

## 2. СТУДИИ И ШТОРКИ `WorkspaceStudioOverlayHost` (`group: overlays` — 34 цели)

| ID | Домен | Компонент | Hash URL | Viewports |
|---|---|---|---|---|
| `030` | `patients` | `PatientCardModal_View` | `#patient-card?patientId={{patientId}}` | D, M |
| `031` | `patients` | `PatientCardModal_Create` | `#new-patient` | D, M |
| `032` | `finance` | `CashRegisterStudioModal` | `#cashbox?patientId={{patientId}}&amountRub=12500` | D, M |
| `033` | `schedule` | `QuickBookingDrawer` | `#quick-booking?patientId={{patientId}}` | D, M |
| `034` | `visit` | `MedicalRecordStudioModal` | `#emr-record?patientId={{patientId}}` | D, M |
| `035` | `odontogram` | `OdontogramFullscreen_Adult` | `#odontogram?patientId={{patientId}}&dentition=adult` | D, M |
| `036` | `odontogram` | `OdontogramFullscreen_Mixed` | `#odontogram?patientId={{patientId}}&dentition=mixed` | D, M |
| `037` | `odontogram` | `PerioStudioModal` | `#perio?patientId={{patientId}}` | D, M |
| `038` | `odontogram` | `EndodonticStudioModal` | `#endo?patientId={{patientId}}&toothFdi=36` | D, M |
| `039` | `surgery` | `ChairsideSurgeryHubModal` | `#surgery?patientId={{patientId}}&toothFdi=46` | D, M |
| `040` | `odontogram` | `OrthopedicsChairsidePanel` | `#orthopedics?patientId={{patientId}}&toothFdi=16` | D, M |
| `041` | `odontogram` | `OrthodonticsStudioModal` | `#orthodontics?patientId={{patientId}}` | D, M |
| `042` | `visit` | `HygieneStudioModal` | `#hygiene?patientId={{patientId}}` | D, M |
| `043` | `odontogram` | `PediatricMixedDentitionModal` | `#pediatric?patientId={{patientId}}` | D, M |
| `044` | `odontogram` | `PediatricBraveryDiplomaModal` | `#pediatric-diploma?patientId={{patientId}}` | D, M |
| `045` | `imaging` | `ClinicalPhotoProtocolModal` | `#photo-protocol?patientId={{patientId}}` | D, M |
| `046` | `imaging` | `DsdAestheticStudioModal` | `#dsd?patientId={{patientId}}` | D, M |
| `047` | `imaging` | `DirectRvgCaptureModal` | `#rvg-capture?patientId={{patientId}}&toothFdi=36` | D, M |
| `048` | `finance` | `CashShiftClosingModal` | `#shift-close` | D, M |
| `049` | `copilot` | `CopilotStudioModal` | `#copilot?patientId={{patientId}}` | D, M |
| `050` | `documents` | `PrescriptionStudioModal` | `#prescriptions?patientId={{patientId}}` | D, M |
| `051` | `communications` | `PatientRecallsHubModal` | `#recalls` | D, M |
| `052` | `documents` | `WarrantyPassportModal` | `#warranty?patientId={{patientId}}` | D, M |
| `053` | `documents` | `DocumentsStudioModal_Consents` | `#consents?patientId={{patientId}}` | D, M |
| `054` | `documents` | `UkepDocumentSigningModal` | `#ukep?patientId={{patientId}}` | D, M |
| `055` | `finance` | `DmsStudioModal` | `#dms?patientId={{patientId}}` | D, M |
| `056` | `finance` | `LoyaltyStudioModal` | `#loyalty?patientId={{patientId}}` | D, M |
| `057` | `warehouse` | `SterilizationBatchCycleModal` | `#sanpin` | D, M |
| `058` | `communications` | `TelephonyStudioModal` | `#telephony` | D, M |
| `059` | `layout` | `KnowledgeBaseHubModal` | `#knowledge-base` | D, M |
| `060` | `schedule` | `WaitlistMatchesBlock` | `#waitlist-matches` | D, M |
| `061` | `schedule` | `TomorrowRemindersModal` | `#tomorrow-reminders` | D, M |
| `062` | `treatment_plans` | `ClinicalBundlesHost` | `#clinical-bundles` | D, M |
| `063` | `finance` | `DoctorPayrollStudioModal` | `#doctor-payroll` | D, M |

---

## 3. ГЛОБАЛЬНЫЕ МОДАЛКИ И ТРИГГЕРЫ (`group: modals` — 7 целей)

| ID | Домен | Компонент | Адрес / Триггер | Viewports |
|---|---|---|---|---|
| `070` | `documents` | `EgiszCertificatesHubModal` | `?certificates=1&section=tax_deduction#documents` | D, M |
| `071` | `settings` | `RapidLaunchWizard` | `?onboarding=1#shift` | D, M |
| `072` | `visit` | `EmergencyRescueModal` | `?emergency=1#visit` | D, M |
| `073` | `imaging` | `CbctMprImplantStudioModal` | `?cbct=1#imaging` | D, M |
| `074` | `layout` | `GlobalOmnibarSearch` | `#shift` + `Ctrl+K` | D |
| `075` | `lab` | `DentalLabStudioModal` | `#lab` + `dente-open-create-lab-order` | D, M |
| `076` | `treatment_plans` | `TreatmentPlanStudioModal` | `#visit?perspective=presentation&patientId={{patientId}}` | D, M |

---

## 4. ПУБЛИЧНЫЕ ПОРТАЛЫ И КИОСКИ (`group: portals` — 4 цели)

| ID | Домен | Компонент | Hash URL | Viewports |
|---|---|---|---|---|
| `080` | `portal` | `PublicBookingPortal` | `#/portal/booking/{{organizationId}}` | D, M |
| `081` | `portal` | `PatientCabinetPortal` | `#/portal/cabinet/{{organizationId}}` | D, M |
| `082` | `portal` | `PatientKioskSurface` | `#/portal/kiosk/{{organizationId}}` | D, M |
| `083` | `portal` | `ReceptionBoardSurface` | `#reception-board` | D |

---

## 5. ЧИСТЫЕ EMPTY STATES — DAY 0 (`group: empty` — 4 цели)

| ID | Домен | Компонент | Hash URL | Viewports |
|---|---|---|---|---|
| `090` | `schedule` | `ScheduleView_Empty` | `#schedule` (пустая клиника) | D, M |
| `091` | `patients` | `PatientsView_Empty` | `#patients` (пустая клиника) | D, M |
| `092` | `finance` | `FinanceView_Empty` | `#finance` (пустая клиника) | D, M |
| `093` | `warehouse` | `InventoryView_Empty` | `#warehouse` (пустая клиника) | D, M |

---

> **Расширение:** Чтобы добавить новую цель (например, внутреннюю вкладку карточки пациента или новый модал), добавь объект в `scripts/screen-targets.mjs` и строку в этот файл — коллектор, агрегатор и верификатор подхватят его автоматически.
