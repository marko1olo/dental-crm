import React from "react";
import { EgiszBlankPermissionsWidget } from "../integrations/egiszModules/EgiszBlankPermissionsWidget";
import { DicomServerConfigPanel } from "./sources/dicomCapability/DicomServerConfigPanel";
import { SourcesConnectorGrid } from "./sources/SourcesConnectorGrid";
import { SourcesDicomCapability } from "./sources/SourcesDicomCapability";
import { SourcesIntegrationPresets } from "./sources/SourcesIntegrationPresets";
import { MedflexSettingsTab } from "./integrations/MedflexSettingsTab";

export function SettingsSourcesTab() {
	return (
		<>
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 items-start">
				<DicomServerConfigPanel
					onSaveConfig={(cfg) => {
						const nextEndpoint = `http://${cfg.host.trim() || "127.0.0.1"}:${cfg.port || 8042}/dicom-web`;
						try {
							localStorage.setItem("dente_dicomweb_endpoint", nextEndpoint);
						} catch {
							// safe quota guard
						}
					}}
				/>
				<div className="[&>div]:!my-0">
					<EgiszBlankPermissionsWidget />
				</div>
			</div>
			<div className="mb-6">
				<MedflexSettingsTab />
			</div>
			<SourcesConnectorGrid />
			<SourcesDicomCapability />
			<SourcesIntegrationPresets />
		</>
	);
}
