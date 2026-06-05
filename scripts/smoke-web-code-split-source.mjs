import { readFileSync } from "node:fs";

const mainSource = readFileSync("apps/web/src/main.tsx", "utf8");
const shellSource = readFileSync("apps/web/src/AppShell.tsx", "utf8");
const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const settingsSource = readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const viteSource = readFileSync("apps/web/vite.config.ts", "utf8");
const webBundleBudgetSource = readFileSync("scripts/smoke-web-bundle-budget.mjs", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
const workspaceUiLabelsSource = readFileSync("apps/web/src/workspaceUiLabels.ts", "utf8");
const imagingUiLabelsSource = readFileSync("apps/web/src/imagingUiLabels.ts", "utf8");
const ctPlanningCatalogSource = readFileSync("apps/web/src/ctPlanningCatalog.ts", "utf8");
const ctPlanningToolsSource = readFileSync("apps/web/src/ctPlanningTools.tsx", "utf8");
const ctPlanningStateSource = readFileSync("apps/web/src/ctPlanningState.ts", "utf8");
const ctPlanningGeometrySource = readFileSync("apps/web/src/ctPlanningGeometry.ts", "utf8");
const ctPlanningMeasurementPlanSource = readFileSync("apps/web/src/ctPlanningMeasurementPlan.ts", "utf8");
const ctPlanningMeasurementPanelSource = readFileSync("apps/web/src/ctPlanningMeasurementPanel.tsx", "utf8");
const ctPlanningWorkflowPlanSource = readFileSync("apps/web/src/ctPlanningWorkflowPlan.ts", "utf8");
const ctPlanningWorkflowPanelSource = readFileSync("apps/web/src/ctPlanningWorkflowPanel.tsx", "utf8");
const ctPlanningImplantFitSource = readFileSync("apps/web/src/ctPlanningImplantFit.ts", "utf8");
const ctPlanningImplantFitPanelSource = readFileSync("apps/web/src/ctPlanningImplantFitPanel.tsx", "utf8");
const ctPlanningImplantModelSource = readFileSync("apps/web/src/ctPlanningImplantModel.ts", "utf8");
const ctPlanningImplantModelPanelSource = readFileSync("apps/web/src/ctPlanningImplantModelPanel.tsx", "utf8");
const ctPlanningReconstructionSource = readFileSync("apps/web/src/ctPlanningReconstruction.ts", "utf8");
const ctPlanningReconstructionPanelSource = readFileSync("apps/web/src/ctPlanningReconstructionPanel.tsx", "utf8");
const ctPlanningValidationSource = readFileSync("apps/web/src/ctPlanningValidation.ts", "utf8");
const ctPlanningValidationPanelSource = readFileSync("apps/web/src/ctPlanningValidationPanel.tsx", "utf8");
const ctPlanningExportSource = readFileSync("apps/web/src/ctPlanningExport.ts", "utf8");
const ctPlanningExportPanelSource = readFileSync("apps/web/src/ctPlanningExportPanel.tsx", "utf8");
const ctPlanningExportScenarioSummarySource = readFileSync("apps/web/src/ctPlanningExportScenarioSummary.ts", "utf8");
const ctPlanningExportScenarioPanelSource = readFileSync("apps/web/src/ctPlanningExportScenarioPanel.tsx", "utf8");
const ctPlanningArtifactCommandsSource = readFileSync("apps/web/src/ctPlanningArtifactCommands.ts", "utf8");
const ctPlanningArtifactPanelSource = readFileSync("apps/web/src/ctPlanningArtifactPanel.tsx", "utf8");

const missing = [];

if (!mainSource.includes('import { AppShell } from "./AppShell";')) {
  missing.push("main.tsx must import AppShell");
}

if (mainSource.includes('from "./App";')) {
  missing.push("main.tsx must not synchronously import the heavy workspace");
}

if (!shellSource.includes('lazy(() => import("./App")')) {
  missing.push("AppShell must lazy-load App.tsx");
}

if (!shellSource.includes("module.App")) {
  missing.push("AppShell must map the named App export");
}

if (!shellSource.includes("<Suspense")) {
  missing.push("AppShell must keep a Suspense fallback");
}

if (!shellSource.includes('aria-busy="true"')) {
  missing.push("AppShell loading state must expose busy state");
}

if (!shellSource.includes("<h1>DENTE</h1>")) {
  missing.push("AppShell loading state must use the DENTE brand spelling");
}

if (!shellSource.includes("AppShellErrorBoundary")) {
  missing.push("AppShell must wrap lazy workspace loading in a boot error boundary");
}

if (!shellSource.includes("getDerivedStateFromError") || !shellSource.includes("componentDidCatch")) {
  missing.push("AppShell boot error boundary must catch lazy import and runtime boot failures");
}

if (!shellSource.includes('role="alert"') || !shellSource.includes('aria-live="assertive"')) {
  missing.push("AppShell boot failure state must announce a blocking recovery message");
}

if (!shellSource.includes("window.location.reload()")) {
  missing.push("AppShell boot failure state must offer a deterministic reload action");
}

if (
  !shellSource.includes("Не удалось открыть рабочее место клиники.") ||
  !shellSource.includes("Файлы интерфейса не загрузились.")
) {
  missing.push("AppShell boot failure state must explain recovery in clinic-readable text");
}

if (!cssSource.includes(".boot-state-error") || !cssSource.includes("max-width: min(520px, calc(100vw - 40px));")) {
  missing.push("Boot failure copy must be styled with a bounded readable measure");
}

if (/\?{4,}/.test(appSource)) {
  missing.push("Lazy route fallbacks must not expose question-mark mojibake to users");
}

for (const label of ["Расписание", "Быстрый поиск", "Документы и согласия", "Настройки"]) {
  if (!appSource.includes(label)) {
    missing.push(`App.tsx lazy route fallback missing readable label: ${label}`);
  }
}

if (!viteSource.includes("normalizedId.endsWith(\"/apps/web/src/App.tsx\")")) {
  missing.push("vite config must route App.tsx into a workspace chunk");
}

if (!viteSource.includes("return \"workspace\"")) {
  missing.push("vite config must name the heavy lazy chunk");
}

if (!viteSource.includes("return \"boot-state\"")) {
  missing.push("vite config must split boot states out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"browser-continuity\"")) {
  missing.push("vite config must split browser continuity probes out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-preload\"")) {
  missing.push("vite config must split workspace route preload policy out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-shell\"")) {
  missing.push("vite config must split workspace shell chrome out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-continuity\"")) {
  missing.push("vite config must split workspace continuity UI out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-route-boundary\"")) {
  missing.push("vite config must split route recovery UI out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"motion-preference\"")) {
  missing.push("vite config must split reduced-motion scroll helpers out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"rub-amount-input\"")) {
  missing.push("vite config must split whole-ruble input helpers out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"clinical-rules\"")) {
  missing.push("vite config must split clinical rule panel out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"settings-static-data\"")) {
  missing.push("vite config must split bulky settings static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"imaging-ui-labels\"")) {
  missing.push("vite config must split imaging/MPR UI labels out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"ct-planning-tools\"")) {
  missing.push("vite config must split CT planning tools UI out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"ct-planning-catalog\"")) {
  missing.push("vite config must split CT planning static catalog out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-state\"")) {
  missing.push("vite config must split CT planning task normalization out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-geometry\"")) {
  missing.push("vite config must split CT planning geometry math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-measurement-plan\"")) {
  missing.push("vite config must split CT planning measurement plan math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-measurement-panel\"")) {
  missing.push("vite config must split CT planning measurement plan UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-workflow-plan\"")) {
  missing.push("vite config must split CT planning workflow math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-workflow-panel\"")) {
  missing.push("vite config must split CT planning workflow UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-implant-fit\"")) {
  missing.push("vite config must split CT planning implant-library fit math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-implant-fit-panel\"")) {
  missing.push("vite config must split CT planning implant-library fit UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-implant-model\"")) {
  missing.push("vite config must split CT planning implant model math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-implant-model-panel\"")) {
  missing.push("vite config must split CT planning implant model UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-reconstruction\"")) {
  missing.push("vite config must split CT planning reconstruction math out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-reconstruction-panel\"")) {
  missing.push("vite config must split CT planning reconstruction UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-validation\"")) {
  missing.push("vite config must split CT planning clinical validation out of the CT state/tools chunks");
}

if (!viteSource.includes("return \"ct-planning-validation-panel\"")) {
  missing.push("vite config must split CT planning validation UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-export\"")) {
  missing.push("vite config must split CT planning handoff packet logic out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-viewer-restore\"")) {
  missing.push("vite config must split CT planning viewer restore adapter contract out of the scenario summary chunk");
}

if (!viteSource.includes("return \"ct-planning-viewer-bridge-launch\"")) {
  missing.push("vite config must split CT planning viewer bridge launch gate out of the restore chunk");
}

if (!viteSource.includes("return \"ct-planning-viewer-bridge-audit\"")) {
  missing.push("vite config must split CT planning viewer bridge audit proof out of the restore chunk");
}

if (!viteSource.includes("return \"ct-planning-viewer-bridge-handoff\"")) {
  missing.push("vite config must split CT planning viewer bridge handoff envelope out of the panel chunks");
}

if (!viteSource.includes("ctPlanningViewerBridgeAttributes.ts")) {
  missing.push("vite config must route CT planning viewer bridge DOM attributes away from panel chunks");
}

if (!viteSource.includes("return \"ct-planning-export-scenario-summary\"")) {
  missing.push("vite config must split CT planning current-scenario handoff summary out of the panel chunk");
}

if (!viteSource.includes("return \"ct-planning-export-scenario-panel\"")) {
  missing.push("vite config must split CT planning current-scenario handoff UI out of the export panel chunk");
}

if (!viteSource.includes("return \"ct-planning-export-panel\"")) {
  missing.push("vite config must split CT planning handoff UI out of the CT tools chunk");
}

if (!webBundleBudgetSource.includes("ct-planning-export-(?!(?:panel|scenario-panel|scenario-summary)-)")) {
  missing.push("web bundle budget must not count ct-planning-export panels as the CT export logic chunk");
}

if (!webBundleBudgetSource.includes("ct-planning-export-scenario-summary-")) {
  missing.push("web bundle budget must measure the CT current-scenario handoff summary separately");
}

if (!webBundleBudgetSource.includes("ct-planning-viewer-restore-")) {
  missing.push("web bundle budget must measure the CT viewer restore adapter contract separately");
}

if (!webBundleBudgetSource.includes("ct-planning-viewer-bridge-launch-")) {
  missing.push("web bundle budget must measure the CT viewer bridge launch gate separately");
}

if (!webBundleBudgetSource.includes("ct-planning-viewer-bridge-audit-")) {
  missing.push("web bundle budget must measure the CT viewer bridge audit proof separately");
}

if (!webBundleBudgetSource.includes("ct-planning-viewer-bridge-handoff-")) {
  missing.push("web bundle budget must measure the CT viewer bridge handoff envelope separately");
}

if (!webBundleBudgetSource.includes("ct-planning-export-scenario-panel-")) {
  missing.push("web bundle budget must measure the CT current-scenario handoff panel separately");
}

if (!webBundleBudgetSource.includes("ct-planning-catalog-")) {
  missing.push("web bundle budget must measure the CT planning static catalog separately");
}

if (!viteSource.includes("return \"ct-planning-artifact-commands\"")) {
  missing.push("vite config must split CT planning artifact command logic out of the CT tools chunk");
}

if (!viteSource.includes("return \"ct-planning-artifact-panel\"")) {
  missing.push("vite config must split CT planning artifact authoring UI out of the CT tools chunk");
}

if (!viteSource.includes("return \"imaging-comparison\"")) {
  missing.push("vite config must split imaging comparison helpers out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"mpr-control-math\"")) {
  missing.push("vite config must split MPR control math out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"mpr-clinical-status\"")) {
  missing.push("vite config must split MPR clinical status helpers out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"pricelist-ui-meta\"")) {
  missing.push("vite config must split pricelist UI metadata out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"visit-specialty-data\"")) {
  missing.push("vite config must split visit specialty static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"visit-dictation-data\"")) {
  missing.push("vite config must split visit dictation static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"post-visit-care-data\"")) {
  missing.push("vite config must split post-visit care static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"communication-task-data\"")) {
  missing.push("vite config must split communication task static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-static-options\"")) {
  missing.push("vite config must split workspace static options out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-ui-labels\"")) {
  missing.push("vite config must split workspace UI labels out of the heavy workspace chunk");
}

if (!appSource.includes('from "./workspaceStaticOptions"')) {
  missing.push("App.tsx must import shared workspace static options instead of owning bulky option tables");
}

if (!appSource.includes('from "./workspaceUiLabels"')) {
  missing.push("App.tsx must import shared workspace UI labels instead of owning bulky label tables");
}

if (!appSource.includes('from "./imagingUiLabels"')) {
  missing.push("App.tsx must import shared imaging UI labels instead of owning bulky CT/DICOM tables");
}

if (!appSource.includes('from "./ctPlanningTools"')) {
  missing.push("App.tsx must import the shared CT planning tools panel instead of owning implant-planning tables inline");
}

if (!settingsSource.includes('from "./ctPlanningTools"')) {
  missing.push("SettingsView.tsx must reuse the shared CT planning tools panel instead of duplicating implant-planning tables");
}

if (
  !ctPlanningCatalogSource.includes("export const ctPlanningTools") ||
  !ctPlanningCatalogSource.includes("export const ctImplantLibrary") ||
  !ctPlanningCatalogSource.includes("export const ctPlanningQuickActions") ||
  !ctPlanningCatalogSource.includes("export const ctPlanningMetrics") ||
  !ctPlanningCatalogSource.includes("export function implantPlanFromLibraryItem") ||
  !ctPlanningCatalogSource.includes("export function findCtPlanningQuickActionForArtifactCommand") ||
  !ctPlanningCatalogSource.includes("artifactCommandIds") ||
  !ctPlanningToolsSource.includes('from "./ctPlanningCatalog"') ||
  !ctPlanningToolsSource.includes("export function CtPlanningToolsPanel")
) {
  missing.push("ctPlanningCatalog.ts must own the CT planning static catalog while ctPlanningTools.tsx owns the reusable panel");
}

if (!ctPlanningStateSource.includes("export function buildCtPlanningTaskSnapshot")) {
  missing.push("ctPlanningState.ts must own CT planning task normalization outside the visual panel chunk");
}

if (!ctPlanningGeometrySource.includes("export function buildCtPlanningGeometrySummary")) {
  missing.push("ctPlanningGeometry.ts must own CT planning math outside the visual panel chunk");
}

if (!ctPlanningMeasurementPlanSource.includes("export function buildCtPlanningMeasurementPlan")) {
  missing.push("ctPlanningMeasurementPlan.ts must own CT measurement readiness outside the visual panel chunk");
}

if (!ctPlanningMeasurementPanelSource.includes("export function CtPlanningMeasurementPanel")) {
  missing.push("ctPlanningMeasurementPanel.tsx must own CT measurement UI outside the CT tools chunk");
}

if (!ctPlanningWorkflowPlanSource.includes("export function buildCtPlanningWorkflowPlan")) {
  missing.push("ctPlanningWorkflowPlan.ts must own CT clinical workflow normalization outside the visual panel chunk");
}

if (!ctPlanningWorkflowPanelSource.includes("export function CtPlanningWorkflowPanel")) {
  missing.push("ctPlanningWorkflowPanel.tsx must own CT clinical workflow UI outside the CT tools chunk");
}

if (!ctPlanningImplantFitSource.includes("export function buildCtPlanningImplantFitPlan")) {
  missing.push("ctPlanningImplantFit.ts must own CT implant-library fit screening outside the visual panel chunk");
}

if (!ctPlanningImplantFitPanelSource.includes("export function CtPlanningImplantFitPanel")) {
  missing.push("ctPlanningImplantFitPanel.tsx must own CT implant-library fit UI outside the CT tools chunk");
}

if (!ctPlanningImplantModelSource.includes("export function buildCtPlanningImplantModelPlan")) {
  missing.push("ctPlanningImplantModel.ts must own CT implant model math outside the visual panel chunk");
}

if (!ctPlanningImplantModelPanelSource.includes("export function CtPlanningImplantModelPanel")) {
  missing.push("ctPlanningImplantModelPanel.tsx must own CT implant model UI outside the CT tools chunk");
}

if (!ctPlanningReconstructionSource.includes("export function buildCtPlanningReconstructionPlan")) {
  missing.push("ctPlanningReconstruction.ts must own CT OPG reconstruction math outside the visual panel chunk");
}

if (!ctPlanningReconstructionPanelSource.includes("export function CtPlanningReconstructionPanel")) {
  missing.push("ctPlanningReconstructionPanel.tsx must own CT OPG reconstruction UI outside the CT tools chunk");
}

if (!ctPlanningValidationSource.includes("export function buildCtPlanningValidationSummary")) {
  missing.push("ctPlanningValidation.ts must own CT clinical validation outside the visual panel chunk");
}

if (!ctPlanningValidationPanelSource.includes("export function CtPlanningValidationGrid")) {
  missing.push("ctPlanningValidationPanel.tsx must own CT clinical validation UI outside the CT tools chunk");
}

if (!ctPlanningExportSource.includes("export function buildCtPlanningExportPacket")) {
  missing.push("ctPlanningExport.ts must own CT handoff packet normalization outside the visual panel chunk");
}

if (!ctPlanningExportPanelSource.includes("export function CtPlanningExportPanel")) {
  missing.push("ctPlanningExportPanel.tsx must own CT handoff UI outside the CT tools chunk");
}

if (!ctPlanningExportScenarioSummarySource.includes("export function buildCtPlanningExportScenarioSummary")) {
  missing.push("ctPlanningExportScenarioSummary.ts must own CT current-scenario summary normalization outside the visual panel chunk");
}

if (!ctPlanningExportScenarioPanelSource.includes("export function CtPlanningExportScenarioPanel")) {
  missing.push("ctPlanningExportScenarioPanel.tsx must own CT current-scenario handoff UI outside the export panel chunk");
}

if (!ctPlanningArtifactCommandsSource.includes("export function buildCtPlanningArtifactCommandStates")) {
  missing.push("ctPlanningArtifactCommands.ts must own CT artifact command state outside the visual panel chunk");
}

if (!ctPlanningArtifactPanelSource.includes("export function CtPlanningArtifactPanel")) {
  missing.push("ctPlanningArtifactPanel.tsx must own CT artifact authoring UI outside the CT tools chunk");
}

if (!workspaceUiLabelsSource.includes("export const appointmentLabels") || !workspaceUiLabelsSource.includes("export function paymentTaxYearForUi")) {
  missing.push("workspaceUiLabels.ts must own the stable workspace labels and helpers");
}

if (
  !imagingUiLabelsSource.includes("export const imagingKindLabels") ||
  !imagingUiLabelsSource.includes("export const mprClinicalPresets") ||
  !imagingUiLabelsSource.includes('balanced_mpr: "рабочие КТ-срезы"') ||
  !imagingUiLabelsSource.includes('stack_2d_textures: "срезы по одному"')
) {
  missing.push("imagingUiLabels.ts must own imaging/MPR labels and current DICOM render-plan labels");
}

if (!appSource.includes('from "./imagingComparison"')) {
  missing.push("App.tsx must import imaging comparison helpers instead of owning extra workspace code");
}

if (!appSource.includes('from "./mprControlMath"')) {
  missing.push("App.tsx must import MPR control math instead of owning extra workspace code");
}

if (!appSource.includes('from "./mprClinicalStatus"')) {
  missing.push("App.tsx must import MPR clinical status helpers instead of owning extra workspace code");
}

if (!appSource.includes('from "./pricelistUiMeta"')) {
  missing.push("App.tsx must import pricelist UI metadata instead of owning extra workspace code");
}

if (!appSource.includes('from "./browserContinuity"')) {
  missing.push("App.tsx must import browser continuity probes instead of owning them inline");
}

if (!appSource.includes('from "./workspacePreload"')) {
  missing.push("App.tsx must import workspace route preloading instead of owning it inline");
}

if (missing.length > 0) {
  console.error("Web code split smoke failed:");
  for (const entry of missing) console.error(`- ${entry}`);
  process.exit(1);
}

console.log({
  mainImportsShell: true,
  lazyWorkspace: true,
  manualWorkspaceChunk: true,
  manualBootAndShellChunks: true,
  manualBrowserContinuityChunk: true,
  manualWorkspacePreloadChunk: true,
  manualWorkspaceContinuityChunk: true,
  manualWorkspaceRouteBoundaryChunk: true,
  manualMotionPreferenceChunk: true,
  manualRubAmountInputChunk: true,
  manualClinicalRulesChunk: true,
  manualSettingsStaticDataChunk: true,
  manualImagingUiLabelsChunk: true,
  manualCtPlanningToolsChunk: true,
  manualCtPlanningCatalogChunk: true,
  manualCtPlanningStateChunk: true,
  manualCtPlanningGeometryChunk: true,
  manualCtPlanningMeasurementPlanChunk: true,
  manualCtPlanningMeasurementPanelChunk: true,
  manualCtPlanningWorkflowPlanChunk: true,
  manualCtPlanningWorkflowPanelChunk: true,
  manualCtPlanningImplantFitChunk: true,
  manualCtPlanningImplantFitPanelChunk: true,
  manualCtPlanningImplantModelChunk: true,
  manualCtPlanningImplantModelPanelChunk: true,
  manualCtPlanningReconstructionChunk: true,
  manualCtPlanningReconstructionPanelChunk: true,
  manualCtPlanningValidationChunk: true,
  manualCtPlanningValidationPanelChunk: true,
  manualCtPlanningExportChunk: true,
  manualCtPlanningViewerRestoreChunk: true,
  manualCtPlanningViewerBridgeHandoffChunk: true,
  manualCtPlanningExportScenarioSummaryChunk: true,
  manualCtPlanningExportScenarioPanelChunk: true,
  manualCtPlanningExportPanelChunk: true,
  manualCtPlanningArtifactCommandsChunk: true,
  manualCtPlanningArtifactPanelChunk: true,
  manualImagingComparisonChunk: true,
  manualMprControlMathChunk: true,
  manualMprClinicalStatusChunk: true,
  manualPricelistUiMetaChunk: true,
  manualVisitSpecialtyDataChunk: true,
  manualVisitDictationDataChunk: true,
  manualPostVisitCareDataChunk: true,
  manualCommunicationTaskDataChunk: true,
  manualWorkspaceStaticOptionsChunk: true,
  manualWorkspaceUiLabelsChunk: true,
  recoverableBootErrors: true,
  readableRouteFallbacks: true
});
