/**
 * XmlTechAccordion.tsx
 * Administrative Collapsed Details for Tech XML Tree and Toolbar.
 */

import React from "react";
import { XmlPreviewToolbar } from "./XmlPreviewToolbar";
import { XmlStructureSectionsTree } from "./XmlStructureSectionsTree";
import { XmlCodeViewer } from "./XmlCodeViewer";
import type {
	EgiszClinicInfo,
	EgiszDentalCdaPayload,
	EgiszDentalSemdCode,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";

export interface XmlTechAccordionProps {
	readonly generatedXml: string;
	readonly xmlValidation: { readonly tagCount: number };
	readonly onValidateCdaXml: () => void;
	readonly onDownloadXml: () => void;
	readonly onExportCurrentPackageZip: () => void;
	readonly onSendToRegistry: () => void;
	readonly onCopyXml: () => void;
	readonly isSending: boolean;
	readonly collapsedSections: Record<string, boolean>;
	readonly onToggleSection: (sectionKey: string) => void;
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly semdPayload: EgiszDentalCdaPayload | null;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
}

export const XmlTechAccordion: React.FC<XmlTechAccordionProps> = ({
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
		<details
			className="egisz-tech-accordion"
			style={{
				border: "1px solid var(--line)",
				borderRadius: "10px",
				padding: "0.75rem 1rem",
				background: "var(--paper-strong)",
			}}
		>
			<summary
				style={{
					cursor: "pointer",
					fontSize: "0.8125rem",
					fontWeight: 600,
					color: "var(--muted)",
					userSelect: "none",
				}}
			>
				Технические сведения для администратора (структура XML, тегов: {xmlValidation.tagCount})
			</summary>

			<div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
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
		</details>
	);
};
