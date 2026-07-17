import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	Database,
	ExternalLink,
	FileText,
	Gauge,
	History,
	ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	ScanSearch,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { CtPlanningToolsPanel } from "../../ctPlanningTools";

type MprClinicalPreset =
	import("../../mprClinicalStatus").MprClinicalPresetFitTarget;

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

type StringTokenGroup = { title: string; items: string[] };
type CbctWorkbenchPlane = { key: string; title: string; detail: string };
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

import { SourcesConnectorGrid } from "./sources/SourcesConnectorGrid";
import { SourcesDicomCapability } from "./sources/SourcesDicomCapability";
import { SourcesIntegrationPresets } from "./sources/SourcesIntegrationPresets";

export function SettingsSourcesTab() {
	return (
		<>
			<SourcesConnectorGrid />
			<SourcesDicomCapability />
			<SourcesIntegrationPresets />
		</>
	);
}
