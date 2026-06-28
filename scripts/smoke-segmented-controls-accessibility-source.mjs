import { readFileSync } from "node:fs";

const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8"),
  readFileSync("apps/web/src/ImagingView.tsx", "utf8"),
  readFileSync("apps/web/src/VisitView.tsx", "utf8")
].join("\n");
const settingsSource = readFileSync("apps/web/src/SettingsView.tsx", "utf8");

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'aria-current={step.id === onboardingStep ? "step" : undefined}', "Onboarding step buttons must expose the current step.");
requireIn(appSource, "aria-pressed={step.id === onboardingStep}", "Onboarding step buttons must expose selected state.");
requireIn(appSource, "aria-pressed={selectedWorkspaceRole === role}", "Onboarding role picker must expose selected state.");
requireIn(appSource, "aria-pressed={selectedSpecialty === specialty}", "Onboarding and visit specialty pickers must expose selected state.");
requireIn(appSource, "aria-pressed={newStaffRole === role}", "Onboarding team role picker must expose selected state.");
requireIn(appSource, "aria-pressed={newStaffSpecialty === specialty}", "Onboarding team specialty picker must expose selected state.");
requireIn(appSource, "aria-pressed={clinicProfileDraft.workingDays.includes(day.value)}", "Onboarding clinic working-day toggles must expose selected state.");
requireIn(appSource, "aria-pressed={pricelistSourceKind === kind}", "Onboarding price source picker must expose selected state.");
requireIn(appSource, "aria-pressed={importSourceKind === kind}", "Onboarding patient import source picker must expose selected state.");
requireIn(appSource, "aria-pressed={smartImportMode === mode}", "Onboarding smart import mode picker must expose selected state.");
requireIn(appSource, "aria-pressed={documentIngestionTarget === target}", "Onboarding document route picker must expose selected state.");
requireIn(appSource, "aria-pressed={imagingImportSourceKind === kind}", "Onboarding imaging source picker must expose selected state.");
requireIn(appSource, 'aria-pressed={imagingKindFilter === "all"}', "Imaging all-filter button must expose selected state.");
requireIn(appSource, "aria-pressed={imagingKindFilter === kind}", "Imaging kind filter buttons must expose selected state.");
requireIn(appSource, "aria-pressed={imagingViewerState.flipHorizontal}", "Imaging mirror toggle must expose selected state.");
requireIn(appSource, "aria-pressed={imagingViewerState.inverted}", "Imaging inversion toggle must expose selected state.");
requireIn(appSource, "aria-pressed={selectedProtocolTemplate.id === template.id}", "Visit protocol template picker must expose selected state.");

requireIn(settingsSource, 'role="tablist"', "Settings tabs must expose a tablist role.");
requireIn(settingsSource, 'role="tab"', "Settings tab buttons must expose tab roles.");
requireIn(settingsSource, 'role="tabpanel"', "Settings active tab content must expose a tabpanel role.");
requireIn(settingsSource, "aria-selected={tabSelected}", "Settings tabs must expose selected state through aria-selected.");
requireIn(settingsSource, "aria-controls={settingsTabPanelId(tab.id)}", "Settings tabs must point to the active panel id.");
requireIn(settingsSource, "tabIndex={tabSelected ? 0 : -1}", "Settings tabs must keep a single tab stop.");
requireIn(settingsSource, "handleSettingsTabKeyDown", "Settings tabs must support arrow-key navigation.");
requireIn(settingsSource, "const nextTabButtonId = settingsTabButtonId(nextTab.id);", "Settings tab keyboard navigation must compute the exact next tab button id.");
requireIn(settingsSource, "document.getElementById(nextTabButtonId)?.focus()", "Settings tab keyboard navigation must focus the exact target tab button.");
requireIn(settingsSource, "aria-pressed={tabSelected}", "Settings tabs must preserve pressed state for existing button styling and tests.");
requireIn(settingsSource, "aria-pressed={dashboard.clinicSettings.profile.mode === mode}", "Settings clinic mode picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={newStaffRole === role}", "Settings staff role picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={newStaffSpecialty === specialty}", "Settings staff specialty picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={scheduleDraft.workingDays.includes(day.value)}", "Settings schedule working-day toggles must expose selected state.");
requireIn(settingsSource, "aria-pressed={newChairHasXraySensor}", "Settings chair RVG toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={newChairHasMicroscope}", "Settings chair microscope toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={newChairHasSurgeryKit}", "Settings chair surgery toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={pricelistSourceKind === kind}", "Settings price source picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={usePricelistAi}", "Settings price AI toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={recognitionKind === preset.kind && recognitionTarget === preset.target}", "Settings recognition preset picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={smartImportMode === mode}", "Settings smart import mode picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={imagingImportSourceKind === kind}", "Settings imaging source picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={typedDicomFirstFrameViewerState.flipHorizontal}", "Settings first-slice mirror toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={typedDicomFirstFrameViewerState.inverted}", "Settings first-slice inversion toggle must expose selected state.");
requireIn(settingsSource, "aria-pressed={importSourceKind === kind}", "Settings legacy import source picker must expose selected state.");
requireIn(settingsSource, "aria-pressed={documentIngestionTarget === target}", "Settings document ingestion route picker must expose selected state.");

if (missing.length > 0) {
  console.error("Segmented controls accessibility source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checkedFiles: 2, checks: 36 }, null, 2));
