import { readFile } from "node:fs/promises";

const appSource = await readFile("apps/web/src/App.tsx", "utf8");
const documentsViewSource = await readFile("apps/web/src/DocumentsView.tsx", "utf8");
const scheduleViewSource = await readFile("apps/web/src/ScheduleView.tsx", "utf8");
const settingsViewSource = await readFile("apps/web/src/SettingsView.tsx", "utf8");
const documentUiSource = `${appSource}\n${documentsViewSource}`;
const scheduleUiSource = `${appSource}\n${scheduleViewSource}`;
const settingsUiSource = `${appSource}\n${settingsViewSource}`;
const sharedSource = await readFile("packages/shared/src/index.ts", "utf8");
const styleSource = await readFile("apps/web/src/styles/main.css", "utf8");

function fail(message) {
  throw new Error(message);
}

function sourceSlice(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  if (start === -1) fail(`Missing marker: ${startMarker}`);
  const end = appSource.indexOf(endMarker, start);
  if (end === -1) fail(`Missing marker: ${endMarker}`);
  return appSource.slice(start, end);
}

const typeBlock = sourceSlice("type UiPreferences = {", "type UiPreferencesInput");
const saveEffectBlock = sourceSlice("saveUiPreferences({", "  }, [");
const saveServerPreferencesBlock = sourceSlice("async function saveServerUiPreferences", "async function responseErrorMessage");
const clinicProfileSaveBlock = sourceSlice("async function saveClinicProfileFromDraft", "async function saveClinicProfileIfDirty");
const clinicModeBlock = sourceSlice("async function changeClinicMode", "async function addStaffMember");
const staffCreateBlock = sourceSlice("async function addStaffMember", "async function saveStaffSchedule");
const staffScheduleBlock = sourceSlice("async function saveStaffSchedule", "async function saveAppointmentSchedule");
const chairCreateBlock = sourceSlice("async function addChair", "function chooseRecognitionPreset");

const requiredPreferenceKeys = [
  "uiLanguage",
  "selectedWorkspaceRole",
  "selectedSpecialty",
  "selectedProtocolId",
  "selectedPatientId",
  "scheduleDoctorFilterId",
  "scheduleAssistantFilterId",
  "scheduleChairFilterId",
  "scheduleDefaultDoctorUserId",
  "scheduleDefaultAssistantUserId",
  "scheduleDefaultChairId",
  "scheduleStatusFilter",
  "scheduleDateFilter",
  "paymentMethod",
  "taxDocumentYear",
  "selectedDocumentKind",
  "taxApplicationForm",
  "taxApplicationDeliveryChannel",
  "paymentReceiptTaxSupportRequested",
  "documentIssueSignatureMode",
  "documentIssueStaffFullName",
  "documentIssueStaffRole",
  "procedureConsentProcedureType",
  "postVisitCareTopic",
  "pricelistSourceKind",
  "usePricelistAi",
  "recognitionKind",
  "recognitionTarget",
  "importSourceKind",
  "documentIngestionTarget",
  "imagingImportSourceKind",
  "smartImportMode",
  "imagingKindFilter",
  "dicomWebEndpointUrl",
  "ohifBaseUrl",
  "telegramBotConfigId",
  "telegramLinkSubjectType",
  "telegramLinkStaffId",
  "telegramOutboxStatusFilter",
  "telegramOutboxTemplateFilter",
  "onboardingDismissed",
  "onboardingDismissedAt",
  "onboardingStep",
  "onboardingDraftMode"
];

const forbiddenClinicalKeys = [
  "transcript",
  "importText",
  "imagingImportText",
  "smartImportText",
  "pricelistText",
  "paymentAmount",
  "communicationNote",
  "recognitionText",
  "pricelistImageBase64",
  "pricelistImageName",
  "pricelistImageNote",
  "imagingViewerAnnotations",
  "imagingViewerNote",
  "recordExtractComplaintAndAnamnesis",
  "outpatient025uAllergyHistory",
  "outpatient025uFinalEpicrisis"
];

if (!appSource.includes('const uiPreferencesStorageKey = "dental-crm:web-ui-preferences:v1";')) {
  fail("UI preference storage key is missing or changed.");
}

for (const marker of [
  "const localConvenienceRetentionMs = 30 * 24 * 60 * 60 * 1000;",
  "const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;",
  "const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;",
  "function localSavedAtFresh(savedAt: string | null | undefined, retentionMs: number",
  "function normalizedLocalOrganizationId(organizationId: string | null | undefined)"
]) {
  if (!appSource.includes(marker)) fail(`Sensitive browser storage retention marker missing ${marker}.`);
}

for (const marker of [
  "documentIssueSignatureLocalKey",
  "documentPaymentSelectionLocalKey",
  "documentPayloadDraftLocalKey",
  "if (!localSavedAtFresh(savedAt, localConvenienceRetentionMs))",
  "if (!savedAt || !localSavedAtFresh(savedAt, localConvenienceRetentionMs))",
  "if (!localSavedAtFresh(entry.savedAt, sensitiveLocalDraftRetentionMs))",
  "documentIssueSignatureHydratedOrganizationIdRef",
  "loadDocumentIssueSignatureDraft(organizationId",
  "saveDocumentIssueSignatureDraft(\n      dashboard?.clinicSettings.profile.organizationId ?? null",
  "documentPayloadDraftKey(\n        \"outpatient_medical_card_025u\",\n        documentLocalPersistenceOrganizationId",
  "loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId, taxPaymentSelectionPersistenceKey)",
  "saveDocumentPaymentSelection(\n      documentLocalPersistenceOrganizationId,",
  "loadOutpatient025uDocumentDraft(documentLocalPersistenceOrganizationId, outpatient025uDraftPersistenceKey)",
  "saveOutpatient025uDocumentDraft(\n      documentLocalPersistenceOrganizationId,",
  "setDocumentIssueSignatureMode(normalizedDocumentIssueSignatureMode(event.target.value))"
]) {
  if (!documentUiSource.includes(marker)) fail(`Clinic-scoped local document preference wiring missing ${marker}.`);
}

for (const marker of [
  "function visitLocalDraftKey(visitId: string, organizationId: string | null | undefined = null)",
  "window.localStorage.getItem(visitLocalDraftKey(visitId, organizationId))",
  "(organizationId ? window.localStorage.getItem(visitLocalDraftKey(visitId)) : null)",
  "if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs))",
  "loadVisitLocalDraft(dashboard.activeVisit.id, activeOrganizationId)",
  "saveVisitLocalDraft(\n        {\n          version: 1,",
  "activeOrganizationId\n      );",
  "organizationScopedLocalStorageKey",
  "pendingVisitSaveQueueLocalKey",
  "pendingSpeechChunkQueueLocalKey",
  "localQueueOrganizationMatches",
  "loadPendingVisitSaves(activeOrganizationId)",
  "loadPendingSpeechChunks(activeOrganizationId)",
  "queuePendingSpeechChunk(chunk, activeOrganizationId)",
  "localImagingRecoveryHydratedOrganizationIdRef",
  "if (!localSavedAtFresh(parsed?.clientSavedAt, sensitiveLocalDraftRetentionMs))",
  "if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))",
  "if (!localSavedAtFresh(parsed.createdAt, localConvenienceRetentionMs))",
  "if (!localSavedAtFresh(parsed.savedAt, localConvenienceRetentionMs))",
  "loadLocalDicomWorkbenchDraft(activeOrganizationId)",
  "loadLocalImagingFolderDraft(organizationId)",
  "loadBrowserPickedImagingFolderPreview(organizationId)",
  "saveLocalImagingFolderDraft(draft, activeOrganizationId)",
  "saveBrowserPickedImagingFolderPreview(preview, activeOrganizationId)",
  "saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId)",
  "saveLocalImagingViewerDraft(\n      selectedImagingStudy.id,",
  "loadLocalImagingViewerDraft(studyId, activeOrganizationId)"
]) {
  if (!appSource.includes(marker)) fail(`Clinic-scoped local imaging recovery wiring missing ${marker}.`);
}

for (const marker of [
  "function reconcileDashboardScopedUiSelections()",
  "const protocolIds = new Set(dashboard.protocolTemplates.map((template) => template.id))",
  "if (selectedPatientId && !activePatientIds.has(selectedPatientId)) setSelectedPatientId(firstActivePatientId)",
  "if (selectedProtocolId && !protocolIds.has(selectedProtocolId)) setSelectedProtocolId(null)",
  "if (scheduleDoctorFilterId && !doctorIds.has(scheduleDoctorFilterId)) setScheduleDoctorFilterId(null)",
  "if (scheduleDefaultDoctorUserId && !doctorIds.has(scheduleDefaultDoctorUserId)) setScheduleDefaultDoctorUserId(null)",
  "if (telegramLinkStaffId && !staffIds.has(telegramLinkStaffId)) setTelegramLinkStaffId(\"\")",
  "reconcileDashboardScopedUiSelections();"
]) {
  if (!appSource.includes(marker)) fail(`Dashboard-scoped UI selection reconciliation missing ${marker}.`);
}

if (appSource.includes("English, fallback")) {
  fail("Language selector must not expose an English UI promise before localization coverage exists.");
}

if (appSource.includes('<option value="en">')) {
  fail("English UI language must not be selectable until a real localization dictionary exists.");
}

if (!appSource.includes("function normalizeUiLanguageInput(value: unknown): UiLanguage")) {
  fail("Language selector must normalize unsupported values back to Russian instead of trusting DOM input.");
}

if (appSource.includes("event.target.value as UiLanguage")) {
  fail("Language selector must not cast raw DOM values as a trusted UI language.");
}

if (!appSource.includes("uiLanguageOptions.map((option) =>")) {
  fail("Language selector must render from the shared Russian-only language option list.");
}

if (!appSource.includes("Выбор сохраняется автоматически и остается до смены языка")) {
  fail("Language settings must tell doctors that the current Russian choice is autosaved until changed.");
}

const forbiddenDoctorFacingEnglishFragments = [
  "Русский fallback, английский интерфейс позже",
  "Smart import",
  "DICOM import",
  "Preview DICOM series",
  "DICOM series preview",
  "Admin-only connector check and viewer manifest",
  "Check this PC",
  "Check archive",
  "Local DICOM folder discovery",
  "Found {dicomLocalFolderDiscovery.candidates.length} candidate(s)",
  "Folder path and patient-like names stay hidden until selected",
  "Use folder",
  "Local imaging organizer",
  "DICOM headers:",
  "DICOM first-frame preview",
  "Browser continuity checks",
  "Local workstation bridge readiness",
  "Bridge preflight",
  "Local bridge use plans",
  "checksum есть",
  "checksum mismatch",
  "checksum ok",
  "Проверка backup",
  "Нужна проверка backup",
  '"ok" : "review"',
  "Файловый extractor",
  "ZIP/XML extractor",
  "PDF без OCR best-effort",
  "{documentIngestion.extractedFiles.length} files",
  "Extracted archive files",
  "{file.rowCount} rows",
  'route.enabled ? "ready" : "skip"',
  "local bridge",
  "transfer syntax",
  "viewer-модулю",
  "Audio chunk cannot be read",
  "smart chunks",
  "smart chunking",
  "smart {Math.round(speechGatewayStatus.chunkingPolicy.minChunkMs",
  "chunk до {Math.round(speechGatewayStatus.maxChunkBytes",
  "dedupe {speechGatewayStatus.chunkingPolicy.dedupeWindowChars}",
  "prompt {speechGatewayStatus.promptPolicy.enabled",
  "keys {speechGatewayStatus.keyPool.availableKeyCount}",
  " · rotation",
  " · retry",
  " · timeout",
  "prompt terms",
  "max {speechGatewayStatus.promptPolicy.maxChars} chars",
  ")} c · фрагмент до",
  ")} c. терминов словаря",
  ")} c</span>",
  "cooldown-ключей",
  "стоматологический prompt включен",
  "prompt выключен",
  'title: "Axial"',
  'title: "Coronal"',
  'title: "Sagittal"',
  '"Oblique"',
  "Image cannot be read",
  "Image cannot be decoded",
  "Image note",
  "Saved image notes",
  "No streaming volume id yet",
  "Open viewer URL",
  "parserMode.replace",
  "model.role.replace",
  "policy.auditEvents.join",
  "> Note",
  "> Retry",
  "server-only",
  "tenant auth",
  "Username общего бота",
  "Username бота клиники",
  "planned/paid/overdue/rescheduled/cancelled",
  "Commit сначала",
  "AI summary",
  "ceph-анализ",
  "DICOM slices, cache",
  "Study/Series UID",
  "Pixel data",
  "Groq vision",
  "Groq JSON",
  '"modality ?"',
  '"series uid ?"',
  '"photometric ?"',
  '"bits ?"',
  '"WL / WW"',
  "CBCT mandible",
  "Ceph lateral",
  '"Panoramic"',
  "RVG bridge",
  "Sidexis export",
  "OPG export"
];

for (const fragment of forbiddenDoctorFacingEnglishFragments) {
  if (appSource.includes(fragment)) fail(`Doctor-facing English fragment leaked: ${fragment}`);
}

if (!appSource.includes('const uiPreferencesServerPath = "/api/settings/preferences";')) {
  fail("Server preference endpoint is missing.");
}

if (!appSource.includes('const onboardingStorageKey = "dental-crm:onboarding:v1";')) {
  fail("Legacy onboarding dismissal storage key is missing.");
}

for (const marker of [
  "function onboardingLocalKey",
  "loadOnboardingDismissalState(organizationId",
  "onboardingDismissalHydratedOrganizationIdRef",
  "saveOnboardingDismissed(\n      true,\n      dismissalSavedAt,\n      false,\n      dashboard?.clinicSettings.profile.organizationId ?? null",
  "saveOnboardingDismissed(\n      true,\n      dismissalSavedAt,\n      true,\n      dashboard?.clinicSettings.profile.organizationId ?? null"
]) {
  if (!appSource.includes(marker)) fail(`Clinic-scoped onboarding persistence wiring missing ${marker}.`);
}

if (!appSource.includes('const clinicProfileEndpoint = "/api/settings/clinic/profile";')) {
  fail("Clinic profile settings endpoint is missing.");
}

for (const marker of [
  'className="schedule-filter-strip"',
  "setScheduleDoctorFilterId(event.target.value || null)",
  "setScheduleAssistantFilterId(event.target.value || null)",
  "setScheduleChairFilterId(event.target.value || null)",
  "setScheduleStatusFilter(normalizedAppointmentStatusFilter(event.target.value))",
  'setScheduleStatusFilter("all")',
  "scheduleDateFilter"
]) {
  if (!scheduleUiSource.includes(marker)) fail(`Schedule filter persistence UI is missing ${marker}.`);
}

for (const marker of [
  "normalizedAppointmentStatusFilter",
  "normalizedDocumentKind",
  "normalizedTaxApplicationForm",
  "normalizedTaxApplicationDeliveryChannel",
  "normalizedProcedureSpecificConsentProcedure",
  "normalizedPostVisitCareTopic",
  "normalizedClinicalRuleAction",
  "normalizedClinicalRuleSeverity",
  "normalizedServiceCategory"
]) {
  if (!appSource.includes(marker)) fail(`Persisted workflow select normalization is missing ${marker}.`);
}

for (const marker of [
  "telegramOutboxStatusFilter",
  "telegramOutboxTemplateFilter",
  "setTelegramOutboxStatusFilter",
  "setTelegramOutboxTemplateFilter",
  "normalizedTelegramOutboxStatusFilter",
  "normalizedTelegramOutboxTemplateFilter",
  "normalizedTelegramBotMode",
  "normalizedTelegramPrivacyMode",
  "normalizedTelegramLinkSubjectType",
  "filteredTelegramOutboxItems",
  "telegram-outbox-controls",
  "По выбранным фильтрам задач нет."
]) {
  if (!settingsUiSource.includes(marker) && !styleSource?.includes?.(marker)) fail(`Telegram outbox persisted filter UI is missing ${marker}.`);
}

if (!appSource.includes("loadServerUiPreferences") || !appSource.includes("saveServerUiPreferences")) {
  fail("UI preferences must sync with the server-backed settings endpoint.");
}

for (const forbiddenCast of [
  "setScheduleStatusFilter(event.target.value as Appointment",
  "setSelectedDocumentKind(event.target.value as GeneratedDocument",
  "setTaxApplicationForm(event.target.value as TaxDeductionApplicationForm)",
  "setTaxApplicationDeliveryChannel(event.target.value as TaxDeductionApplicationDeliveryChannel)",
  "setProcedureConsentProcedureType(event.target.value as ProcedureSpecificConsentProcedure)",
  "changePostVisitCareTopic(event.target.value as PostVisitCareTopic)",
  "setNewRuleAction(event.target.value as",
  "setNewRuleSeverity(event.target.value as",
  "setNewRuleCategory(event.target.value as",
  "setTelegramModeDraft(event.target.value as DenteTelegramBotMode)",
  "setTelegramPrivacyModeDraft(event.target.value as DenteTelegramPrivacyMode)",
  "setTelegramLinkSubjectType(event.target.value as TelegramLinkSubjectType)",
  "setTelegramOutboxStatusFilter(event.target.value as TelegramOutboxStatusFilter)",
  "setTelegramOutboxTemplateFilter(event.target.value as TelegramOutboxTemplateFilter)"
]) {
  if (appSource.includes(forbiddenCast)) fail(`Persisted select must normalize DOM values before saving state: ${forbiddenCast}`);
}

if (saveServerPreferencesBlock.includes("telegramControlPlaneHeaders")) {
  fail("Personal UI preference autosave must not depend on the clinic admin secret.");
}

for (const [label, block] of [
  ["clinic profile", clinicProfileSaveBlock],
  ["clinic mode", clinicModeBlock],
  ["staff create", staffCreateBlock],
  ["staff schedule", staffScheduleBlock],
  ["chair create", chairCreateBlock]
]) {
  if (!block.includes('settingsAccessHeaders({ "Content-Type": "application/json" })')) {
    fail(`Settings mutation must send the settings admin secret header when configured: ${label}.`);
  }
}

if (!sharedSource.includes("onboardingDraftMode: z.boolean().default(false)")) {
  fail("Shared UI preference schema must persist onboarding draft mode.");
}

if (
  !sharedSource.includes('telegramBotConfigId: z.string().trim().max(160).default("")') ||
  !sharedSource.includes("telegramOutboxStatusFilter") ||
  !sharedSource.includes("telegramOutboxTemplateFilter")
) {
  fail("Shared UI preference schema must persist Telegram outbox filters.");
}

if (!sharedSource.includes("savedAt: z.string().optional()")) {
  fail("Shared UI preference input schema must accept client savedAt for stale-write protection.");
}

if (!saveServerPreferencesBlock.includes("response.ok")) {
  fail("Server UI preference saves must check response.ok instead of silently swallowing API failures.");
}

if (
  !appSource.includes("denteAdminSecretRequestHeaders") ||
  !saveServerPreferencesBlock.includes("denteAdminSecretRequestHeaders") ||
  !appSource.includes("loadServerUiPreferences(preferencesAccessSecret)") ||
  !appSource.includes("!settingsAdminSecretSession.trim()")
) {
  fail("Server UI preference sync must use the unlocked admin/read secret and stay local-only before unlock.");
}

if (!appSource.includes("uiPreferencesSyncErrorMessage")) {
  fail("UI preference server sync failures must have a reusable user-facing Russian warning.");
}

if (appSource.includes("saveServerUiPreferences(savedPreferences).catch(() => undefined)")) {
  fail("Scheduled server UI preference saves must not silently swallow sync failures.");
}

if (!appSource.includes("setUiPreferencesSyncError(uiPreferencesSyncErrorMessage(preferencesError))")) {
  fail("Server UI preference sync failures must be visible in the app shell.");
}

for (const marker of [
  "pendingUiPreferencesSyncRef",
  "uiPreferencesSyncInFlightRef",
  "uiPreferencesRetryTimerRef",
  "queueUiPreferencesServerSync",
  "flushPendingUiPreferencesServerSync",
  "window.addEventListener(\"online\", retryPendingUiPreferences)",
  "delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0"
]) {
  if (!appSource.includes(marker)) fail(`UI preference retry/backoff wiring missing ${marker}.`);
}

if (!appSource.includes("{!error && uiPreferencesSyncError ? (")) {
  fail("UI preference sync warning must render when the main error banner is empty.");
}

if (
  !appSource.includes("uiPreferencesHydratedRef") ||
  !appSource.includes("setUiPreferencesHydrated(true)") ||
  !appSource.includes("if (!uiPreferencesHydrated) return undefined;")
) {
  fail("UI preferences must not rewrite local/server state before server hydration completes.");
}

for (const marker of [
  "type OnboardingStep",
  "loadOnboardingDismissalState",
  "saveOnboardingDismissed",
  "clinicLegalMissingFields",
  "mergeLocalOnboardingDismissal",
  "saveClinicProfileFromDraft",
  "buildOnboardingReadinessIssues",
  "assertOnboardingReadyForFinish",
  "onboardingReadyToFinish",
  "reopenOnboarding",
  "onboardingSteps",
  "initialUiPreferences.onboardingDismissed",
  "initialUiPreferences.onboardingDismissedAt",
  "initialUiPreferences.onboardingStep",
  "initialUiPreferences.onboardingDraftMode",
  "isOnboardingStepPreference",
  "setOnboardingDismissedAt(preferences.onboardingDismissedAt ?? null)",
  "setOnboardingStep(preferences.onboardingStep)",
  "setOnboardingDraftMode(preferences.onboardingDraftMode)",
  "setSelectedProtocolId(preferences.selectedProtocolId)"
]) {
  if (!appSource.includes(marker)) fail(`Onboarding/profile wiring missing ${marker}.`);
}

if (!appSource.includes("if (!selectedProtocolId) return;") || !appSource.includes("if (selectedProtocolId && !protocolIds.has(selectedProtocolId)) setSelectedProtocolId(null);")) {
  fail("Persisted protocol template selection must reset when it no longer matches the selected specialty or dashboard template set.");
}

if (appSource.includes("preferences.onboardingDismissed || loadOnboardingDismissed()")) {
  fail("Onboarding dismissal must be timestamp-merged, not OR-merged from stale localStorage.");
}

if (!appSource.includes("savedAt: localDismissal.savedAt > preferences.savedAt")) {
  fail("Legacy onboarding dismissal merge must advance savedAt so server hydration cannot overwrite a newer local dismissal.");
}

if (!appSource.includes('onboardingStep: localDismissal.dismissed ? preferences.onboardingStep : "intro"')) {
  fail("Legacy onboarding reopen must reset the persisted step to intro.");
}

for (const rawEnumRender of [
  "{dashboard.clinicSettings.profile.mode}</span>",
  "{selectedWorkspaceRole}</span>",
  "{selectedSpecialty}</span>",
  "{task.status}",
  "{event.action}",
  "`${event.entityType}: ${event.entityId}`",
  "<span>{documentIngestion.detectedKind}</span>",
  "{file.detectedKind} ·",
  'tool.replace(/_/g, " ")',
  "<span>{kind}</span>",
  "{dicomViewerToolStateBundle.viewports.length} viewports",
  "{dicomViewerToolStateBundle.annotations.length} annotations",
  "{dicomViewerToolStateBundle.tools.length} tools",
  "renderCachePlan.textureStrategy} /",
  "renderCachePlan.qualityMode}",
  "{dicomWorkstationReadiness.detectedTier} / {dicomWorkstationReadiness.effectiveLoadStrategy}"
]) {
  if (appSource.includes(rawEnumRender)) fail(`Onboarding renders raw enum instead of Russian label: ${rawEnumRender}`);
}

for (const key of requiredPreferenceKeys) {
  if (!typeBlock.includes(`${key}:`)) fail(`UiPreferences missing ${key}.`);
  if (!saveEffectBlock.includes(key)) fail(`saveUiPreferences effect does not write ${key}.`);
  if (!appSource.includes(`initialUiPreferences.${key}`)) fail(`${key} is not initialized from stored preferences.`);
}

for (const key of forbiddenClinicalKeys) {
  if (typeBlock.includes(`${key}:`)) fail(`UiPreferences must not persist clinical/transient field ${key}.`);
}

console.log(
  JSON.stringify({
    ok: true,
    storageKey: "dental-crm:web-ui-preferences:v1",
    requiredPreferenceCount: requiredPreferenceKeys.length,
    forbiddenClinicalKeyCount: forbiddenClinicalKeys.length
  })
);
