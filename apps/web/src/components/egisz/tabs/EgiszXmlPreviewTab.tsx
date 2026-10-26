/**
 * EgiszXmlPreviewTab.tsx
 *
 * Tab: Medical Document Status & Telemetry (Export & Background Queue).
 * Mandates 8e, 8n, 8x, 8am: Quiet Telemetry («Отправлено в ЕГИСЗ ✓»),
 * zero raw XML trees in doctor's default path. Administrative XML spoiler.
 */

import React from "react";
import type { EgiszXmlPreviewTabProps } from "./xmlPreview/xmlPreviewTabTypes";
import { XmlTelemetryStatusCard } from "./xmlPreview/XmlTelemetryStatusCard";
import { XmlTechAccordion } from "./xmlPreview/XmlTechAccordion";

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
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<XmlTelemetryStatusCard
				semdDocCode={semdDocCode}
				clinic={clinic}
				doctor={doctor}
				patient={patient}
				diagnoses={diagnoses}
				procedures={procedures}
				onExportCurrentPackageZip={onExportCurrentPackageZip}
				onDownloadXml={onDownloadXml}
			/>

			<XmlTechAccordion
				generatedXml={generatedXml}
				xmlValidation={xmlValidation}
				onValidateCdaXml={onValidateCdaXml}
				onDownloadXml={onDownloadXml}
				onExportCurrentPackageZip={onExportCurrentPackageZip}
				onSendToRegistry={onSendToRegistry}
				onCopyXml={onCopyXml}
				isSending={isSending}
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
		</div>
	);
};
