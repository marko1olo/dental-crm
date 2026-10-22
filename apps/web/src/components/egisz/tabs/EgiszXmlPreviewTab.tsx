/**
 * EgiszXmlPreviewTab.tsx
 *
 * Tab 5: Canonical HL7 CDA R2 XML Preview & Validation Inspector.
 * Formatted C14N XML viewer, collapsible CDA sections, and export buttons.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { XmlCodeViewer } from "./xmlPreview/XmlCodeViewer";
import { XmlPreviewToolbar } from "./xmlPreview/XmlPreviewToolbar";
import type { EgiszXmlPreviewTabProps } from "./xmlPreview/xmlPreviewTabTypes";
import { XmlStructureSectionsTree } from "./xmlPreview/XmlStructureSectionsTree";

export type { EgiszXmlPreviewTabProps } from "./xmlPreview/xmlPreviewTabTypes";

export const EgiszXmlPreviewTab: React.FC<EgiszXmlPreviewTabProps> = ({
	generatedXml,
	xmlValidation,
	onValidateCdaXml,
	onDownloadXml,
	onExportCurrentPackageZip,
	onSendToRegistry,
	onCopyXml,
	isSending,
	collapsedSections,
	onToggleSection,
	semdDocCode,
	clinic,
	doctor,
	patient,
	semdPayload,
	diagnoses,
	procedures,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<XmlPreviewToolbar
				tagCount={xmlValidation.tagCount}
				onValidateCdaXml={onValidateCdaXml}
				onDownloadXml={onDownloadXml}
				onExportCurrentPackageZip={onExportCurrentPackageZip}
				onSendToRegistry={onSendToRegistry}
				onCopyXml={onCopyXml}
				isSending={isSending}
			/>

			<XmlStructureSectionsTree
				collapsedSections={collapsedSections}
				onToggleSection={onToggleSection}
				semdDocCode={semdDocCode}
				clinic={clinic}
				doctor={doctor}
				patient={patient}
				semdPayload={semdPayload}
				diagnoses={diagnoses}
				procedures={procedures}
			/>

			<XmlCodeViewer generatedXml={generatedXml} />
		</div>
	);
};
