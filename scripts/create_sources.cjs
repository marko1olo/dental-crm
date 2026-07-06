const fs = require('fs');
const block = fs.readFileSync('scripts/extracted_block.tsx', 'utf8');
let innerJsx = block.replace(/^\{settingsTab === "sources" \? \(/, '').replace(/\) : null\}\s*$/, '');

const result = `import { Database, ImageDown, Cloud, Network, Bot, AlertTriangle, CheckCircle2, ChevronRight, Play, RefreshCw, Layers, MonitorSmartphone, X, FileBox, Link, Settings2, Trash2, FolderSearch, Search, Stethoscope, BriefcaseMedical } from 'lucide-react';
import type { SettingsViewProps } from '../../SettingsView';

export function SettingsSourcesTab({ props }: { props: SettingsViewProps }) {
  const {
    activeOrganizationId, typedImagingConnectorCards, connectorSourceStatus, connectorSourceStats,
    typedDicomViewerToolStateBundle, removeDicomViewerToolStateBundle, imagingSourceIntegrationPresets,
    applyImagingSourceIntegrationPreset, dicomViewerWorkbenchManifest, setDicomViewerWorkbenchManifest,
    removeDicomViewerWorkbenchBundle, saveDicomViewerWorkbenchBundleToLocal, clinicProfileDraft,
    openDicomWorkbenchPreview, startDicomFolderSeriesScan, dicomFolderSeriesScan, dicomFolderWorkupPlan,
    startDicomFolderWorkup, saveDicomFolderWorkupArtifacts, dicomSeriesPreview, setDicomSeriesPreview,
    ...rest
  } = props as any;

  return (
    <>
      ${innerJsx}
    </>
  );
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsSourcesTab.tsx', result);
console.log('SettingsSourcesTab.tsx created successfully');
