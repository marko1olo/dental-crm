import type { ChangeEvent } from "react";

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type MprClinicalPreset =
	import("../../mprClinicalStatus").MprClinicalPresetFitTarget;

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type StringTokenGroup = { title: string; items: string[] };
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type CbctWorkbenchPlane = { key: string; title: string; detail: string };
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
