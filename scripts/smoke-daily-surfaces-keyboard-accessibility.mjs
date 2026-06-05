import { readFileSync } from "node:fs";

const sources = {
  app: readFileSync("apps/web/src/App.tsx", "utf8"),
  shell: readFileSync("apps/web/src/workspaceShell.tsx", "utf8"),
  css: readFileSync("apps/web/src/styles/main.css", "utf8"),
  schedule: readFileSync("apps/web/src/ScheduleView.tsx", "utf8"),
  documents: readFileSync("apps/web/src/DocumentsView.tsx", "utf8"),
  payment: readFileSync("apps/web/src/PaymentCapture.tsx", "utf8"),
  patients: readFileSync("apps/web/src/PatientsView.tsx", "utf8"),
  communications: readFileSync("apps/web/src/CommunicationsView.tsx", "utf8"),
  settings: readFileSync("apps/web/src/SettingsView.tsx", "utf8")
};

const missing = [];

function requireIn(sourceName, snippet, message) {
  if (!sources[sourceName].includes(snippet)) missing.push(`${sourceName}: ${message}`);
}

function requirePattern(sourceName, pattern, message) {
  if (!pattern.test(sources[sourceName])) missing.push(`${sourceName}: ${message}`);
}

function requireButtonTypes(sourceName) {
  const source = sources[sourceName];
  const buttonOpenTags = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const start = source.indexOf("<button", searchIndex);
    if (start === -1) break;
    let index = start;
    let braceDepth = 0;
    let quote = "";
    while (index < source.length) {
      const char = source[index];
      if (quote) {
        if (char === quote && source[index - 1] !== "\\") quote = "";
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === "{") {
        braceDepth += 1;
      } else if (char === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (char === ">" && braceDepth === 0) {
        buttonOpenTags.push(source.slice(start, index + 1));
        index += 1;
        break;
      }
      index += 1;
    }
    searchIndex = index;
  }
  for (const tag of buttonOpenTags) {
    if (!/\stype=/.test(tag)) {
      missing.push(`${sourceName}: button missing explicit type attribute: ${tag.slice(0, 120)}`);
    }
  }
}

for (const sourceName of ["schedule", "documents", "payment", "communications", "settings", "shell"]) {
  requireButtonTypes(sourceName);
}

for (const view of ["schedule", "documents", "finance", "communications", "settings"]) {
  requireIn("app", `<WorkspaceRouteErrorBoundary view="${view}"`, `daily ${view} route must have an isolated error boundary.`);
}

requireIn("app", 'className="skip-link"', "desktop keyboard users need a skip link before shell navigation.");
requireIn("app", 'href="#workspace-content"', "skip link must target the workspace content region.");
requireIn("app", 'id="workspace-content"', "workspace content must be addressable by the skip link.");
requireIn("app", "tabIndex={-1}", "workspace content must accept programmatic focus after skip navigation.");
requireIn("app", 'aria-label="', "workspace region and lazy fallbacks must expose readable names.");
requireIn("app", 'aria-busy="true"', "lazy daily-route fallbacks must expose loading state.");

requireIn("shell", "export const appViews", "shell must own the hash-routed view registry.");
for (const view of ["schedule", "documents", "finance", "communications", "settings"]) {
  requireIn("shell", `"${view}"`, `shell view registry must include ${view}.`);
}
requireIn("shell", 'href={`#${view}`}', "sidebar links must stay keyboard-native hash anchors.");
requireIn("shell", 'aria-current={currentView === view ? "page" : undefined}', "sidebar must announce the active page.");
requireIn("shell", 'aria-label={`${viewLabels[view]}: ${viewHints[view]}`}', "sidebar links must include label plus operator hint.");
requireIn("shell", 'title={`${viewLabels[view]}: ${viewHints[view]}`}', "sidebar links must expose hover hints for desktop shell users.");
requireIn("shell", "onFocus={() => onViewIntent?.(view)}", "keyboard focus must preload lazy daily routes.");
requireIn("shell", '<details className="workspace-role-switcher"', "role switcher must use keyboard-native details/summary.");
requireIn("shell", "aria-pressed={selectedWorkspaceRole === role}", "role switcher buttons must expose selected state.");
requireIn("shell", 'aria-label="', "icon-only topbar shortcuts must have accessible names.");

requireIn("css", ":focus-visible", "global CSS must expose visible keyboard focus.");
requireIn("css", ".skip-link:focus-visible", "skip link must become visible on keyboard focus.");
requireIn("css", "@media (prefers-reduced-motion: reduce)", "mobile assistive navigation must respect reduced motion.");
requireIn("css", "scroll-behavior: auto !important", "reduced-motion mode must disable smooth scrolling.");
requireIn("css", "transition-duration: 0.01ms !important", "reduced-motion mode must suppress transitions.");
requirePattern("css", /\.round-link\s*\{[\s\S]*?height:\s*44px;[\s\S]*?width:\s*44px;[\s\S]*?\}/, "patient row open controls must keep a 44px mobile touch target.");

requireIn("patients", 'id="patients"', "patients panel must be addressable.");
requireIn("patients", 'className="round-link"', "patient rows must expose a dedicated open-card control.");
requireIn("patients", "aria-label={`", "patient row open controls must have contextual accessible names.");
requireIn("patients", "aria-pressed={patientIsSelected}", "patient row open controls must expose selected state.");

requireIn("schedule", 'id="schedule"', "schedule panel must be addressable.");
requireIn("schedule", 'data-testid="schedule-shift-summary"', "shift summary must be test-addressable.");
requireIn("schedule", 'aria-live="polite"', "schedule updates and blockers must use polite announcements.");
requireIn("schedule", 'className="schedule-filter-strip" aria-label=', "schedule filters must have a group name.");
requireIn("schedule", "onKeyDown={(event: KeyboardEvent<HTMLInputElement>)", "schedule admin unlock must support keyboard submission.");
requireIn("schedule", 'event.key === "Enter"', "schedule admin unlock must submit on Enter.");
requireIn("schedule", 'id="schedule-admin-unlock-guidance"', "schedule admin secret guidance must be addressable.");
requireIn("schedule", 'aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}', "schedule admin unlock controls must point to guidance.");
requireIn("schedule", "disabled={!adminSecretReady}", "schedule admin unlock must block empty secret submission.");
requireIn("schedule", 'id="new-appointment-create-missing"', "new appointment blocker guidance must be addressable.");
requireIn("schedule", "aria-describedby={!newAppointmentReadyToCreate ? \"new-appointment-create-missing\" : undefined}", "create appointment button must point to blocker guidance.");
requireIn("schedule", "aria-busy={newAppointmentSaveState === \"saving\" || undefined}", "new appointment create button must expose busy state.");
requireIn("schedule", "aria-expanded={appointmentEditing}", "appointment edit buttons must expose expanded state.");
requireIn("schedule", "aria-controls={appointmentEditorId}", "appointment edit buttons must point to the controlled editor.");
requireIn("schedule", "aria-label={`", "repeated schedule row actions must have contextual accessible names.");
requireIn("schedule", "id={appointmentSaveMissingId}", "edited appointment blocker guidance must be addressable.");
requireIn("schedule", "aria-describedby={!appointmentReadyToSave && appointmentMissingSteps.length ? appointmentSaveMissingId : undefined}", "edited appointment save button must point to blocker guidance.");
requireIn("schedule", 'className="schedule-empty-state"', "schedule empty state must offer keyboard-reachable recovery actions.");

requireIn("documents", 'id="documents"', "documents panel must be addressable.");
requireIn("documents", "latestDocumentOpenGuidanceId", "latest-document disabled state must have a stable guidance id.");
requireIn("documents", "aria-describedby={!activeUsableDocuments[0] ? latestDocumentOpenGuidanceId : undefined}", "open-latest document button must point to empty-state guidance.");
requireIn("documents", "aria-busy={isSelectedDocumentCreating || undefined}", "document creation must expose busy state.");
requireIn("documents", "disabled={Boolean(documentCreateSavingKind)}", "document creation must block duplicate submits.");
requireIn("documents", "const documentActionContext =", "document list actions must compute contextual names.");
requireIn("documents", "aria-label={`", "document list actions must use explicit accessible names.");
requireIn("documents", "aria-busy={documentAuditLoading || undefined}", "document audit/passport action must expose row-local loading state.");
requireIn("documents", 'role="dialog"', "document issue and void confirmations must expose dialog semantics.");
requireIn("documents", 'const documentIssueMissingGuidanceId = "document-issue-missing-guidance"', "document issue blockers must have a stable guidance id.");
requireIn("documents", 'const documentVoidMissingGuidanceId = "document-void-missing-guidance"', "document void blockers must have a stable guidance id.");
requireIn("documents", "aria-describedby={!documentIssueAttestationReady ? documentIssueMissingGuidanceId : undefined}", "issue confirmation button must point to blocker guidance.");
requireIn("documents", "aria-describedby={!documentVoidReady ? documentVoidMissingGuidanceId : undefined}", "void confirmation button must point to blocker guidance.");

requireIn("payment", 'id="payment-capture"', "payment capture must be addressable from daily finance recovery actions.");
requireIn("payment", 'id="payment-amount-input"', "payment amount input must be addressable from history/empty-state jumps.");
requireIn("payment", 'aria-label="', "payment amount must have an explicit accessible label.");
requireIn("payment", "aria-invalid={paymentAmountInvalid || undefined}", "invalid payment amount must be announced.");
requireIn("payment", "aria-describedby={paymentAmountInvalid ? paymentMissingId : undefined}", "invalid payment amount must point to guidance.");
requireIn("payment", '<details className="payment-capture-detail-section"', "secondary payment facts must be keyboard-native disclosures.");
requireIn("payment", "<summary>", "payment disclosure sections must have keyboard-native summaries.");
requireIn("payment", "aria-pressed={method === paymentMethod}", "payment method segmented controls must expose selected state.");
requireIn("payment", "aria-pressed={taxDeductionCode === code}", "tax deduction segmented controls must expose selected state.");
requireIn("payment", "aria-describedby={!patientTaxDefaultsAvailable ? taxDefaultsGuidanceId : undefined}", "disabled patient defaults action must point to guidance.");
requireIn("payment", 'role="status" aria-live="polite"', "payment feedback and blockers must be announced politely.");
requireIn("payment", "aria-busy={isSaving || undefined}", "payment submit must expose busy state.");
requireIn("payment", "aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}", "payment submit must point to blocker guidance.");
requireIn("payment", "disabled={isSaving || !paymentReadyToSubmit}", "payment submit must block duplicate or incomplete capture.");

requireIn("communications", 'id="communications"', "communications panel must be addressable.");
requireIn("communications", 'className="communication-empty-state"', "communications must expose an empty-state recovery path.");
requireIn("communications", 'className="communications-summary-grid" aria-label=', "communications summary must have a group name.");
requireIn("communications", 'const communicationNoteInputId = "communication-closing-note"', "closing note must use a stable input id.");
requireIn("communications", "htmlFor={communicationNoteInputId}", "closing note label must target the input.");
requireIn("communications", "aria-describedby={communicationNoteDescriptionId}", "closing note and outcomes must point to guidance.");
requireIn("communications", "htmlFor={outcomeSelectId}", "row outcome label must target the select.");
requireIn("communications", "aria-label={`${documentActionLabel}: ${task.title}`}", "document workflow actions must include task context.");
requireIn("communications", "aria-label={`", "task close action must include task context.");
requireIn("communications", "id={savingStatusId}", "row saving status must be addressable.");
requireIn("communications", "aria-busy={isTaskSaving || undefined}", "task close button must expose busy state.");
requireIn("communications", "aria-describedby={isTaskSaving ? `${completionNoteDescriptionId} ${savingStatusId}` : completionNoteDescriptionId}", "task close button must point to note guidance and saving status.");
requireIn("communications", "disabled={communicationSaveInProgress || !selectedOutcome}", "task close must block duplicate or missing outcome submission.");

requireIn("settings", 'id="settings"', "settings panel must be addressable.");
requireIn("settings", 'role="tablist"', "settings navigation must expose tablist semantics.");
requireIn("settings", 'role="tab"', "settings navigation buttons must expose tab semantics.");
requireIn("settings", 'role="tabpanel"', "active settings content must expose tabpanel semantics.");
requireIn("settings", "aria-selected={tabSelected}", "settings tabs must expose selected state.");
requireIn("settings", "aria-controls={settingsTabPanelId(tab.id)}", "settings tabs must point to their panels.");
requireIn("settings", "tabIndex={tabSelected ? 0 : -1}", "settings tabs must keep a single tab stop.");
requireIn("settings", "handleSettingsTabKeyDown", "settings tabs must support keyboard navigation.");
requireIn("settings", 'event.key === "ArrowRight"', "settings tabs must support arrow-key navigation.");
requireIn("settings", 'event.key === "Home"', "settings tabs must support Home key navigation.");
requireIn("settings", 'event.key === "End"', "settings tabs must support End key navigation.");
requireIn("settings", "document.getElementById(nextTabButtonId)?.focus()", "settings keyboard navigation must move focus to the selected tab.");
requireIn("settings", 'id="settings-admin-unlock-guidance"', "settings admin secret guidance must be addressable.");
requireIn("settings", 'aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}', "settings admin unlock controls must point to guidance.");
requireIn("settings", 'event.key === "Enter"', "settings admin unlock must submit on Enter.");
requireIn("settings", 'aria-label="', "settings icon/quick actions must have accessible names.");
requireIn("settings", 'role="status" aria-live="polite"', "settings blockers and async feedback must be announced politely.");

if (missing.length > 0) {
  console.error("Daily surfaces keyboard/accessibility source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedSurfaces: ["schedule", "documents", "payment-capture", "communications", "settings"],
      sourceOnly: true,
      keyboardContracts: {
        shellSkipLink: true,
        nativeAnchorsAndDisclosures: true,
        busyAndDisabledGuidance: true,
        rowContextNames: true,
        settingsTabKeys: true,
        reducedMotion: true
      }
    },
    null,
    2
  )
);
