import React from "react";
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

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { EgiszBlankPermissionsWidget } from "../integrations/EgiszBlankPermissionsWidget";
import { DicomServerConfigPanel } from "./sources/dicomCapability/DicomServerConfigPanel";
import { SourcesConnectorGrid } from "./sources/SourcesConnectorGrid";
import { SourcesDicomCapability } from "./sources/SourcesDicomCapability";
import { SourcesIntegrationPresets } from "./sources/SourcesIntegrationPresets";

export function SettingsSourcesTab() {
	const appLogic = useAppLogicContext() as {
		setDicomWebEndpointUrl?: (url: string) => void;
		checkDicomWebConnector?: () => Promise<void> | void;
	};
	return (
		<>
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 items-start">
				<DicomServerConfigPanel
					onSaveConfig={(cfg) => {
						const nextEndpoint = `http://${cfg.host.trim() || "127.0.0.1"}:${cfg.port || 8042}/dicom-web`;
						appLogic?.setDicomWebEndpointUrl?.(nextEndpoint);
						void appLogic?.checkDicomWebConnector?.();
					}}
				/>
				<div className="[&>div]:!my-0">
					<EgiszBlankPermissionsWidget />
				</div>
			</div>
			<SourcesConnectorGrid />
			<SourcesDicomCapability />
			<SourcesIntegrationPresets />
		</>
	);
}
