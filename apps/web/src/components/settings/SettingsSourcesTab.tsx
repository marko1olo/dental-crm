import type { ChangeEvent } from "react";

type MprClinicalPreset =
	import("../../mprClinicalStatus").MprClinicalPresetFitTarget;

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
