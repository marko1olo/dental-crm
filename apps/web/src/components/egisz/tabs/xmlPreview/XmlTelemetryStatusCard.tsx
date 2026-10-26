/**
 * XmlTelemetryStatusCard.tsx
 * Quiet Telemetry Status Card for EGISZ REMD background submission.
 */

import React from "react";
import type {
	EgiszClinicInfo,
	EgiszDentalSemdCode,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";
import { XmlTelemetryCardHeader } from "./XmlTelemetryCardHeader";
import { XmlTelemetryPassportGrid } from "./XmlTelemetryPassportGrid";
import { XmlTelemetryCardActions } from "./XmlTelemetryCardActions";

export interface XmlTelemetryStatusCardProps {
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
	readonly onExportCurrentPackageZip: () => void;
	readonly onDownloadXml: () => void;
}

export const XmlTelemetryStatusCard: React.FC<XmlTelemetryStatusCardProps> = ({
	semdDocCode,
	clinic,
	doctor,
	patient,
	diagnoses,
	procedures,
	onExportCurrentPackageZip,
	onDownloadXml,
}) => {
	return (
		<div
			className="egisz-telemetry-card"
			data-testid="egisz-quiet-telemetry-card"
			style={{
				background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(14, 165, 233, 0.06) 100%)",
				border: "1px solid rgba(13, 148, 136, 0.25)",
				borderRadius: "12px",
				padding: "1.25rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
			}}
		>
			<XmlTelemetryCardHeader semdDocCode={semdDocCode} />

			<XmlTelemetryPassportGrid
				clinic={clinic}
				doctor={doctor}
				patient={patient}
				diagnoses={diagnoses}
				procedures={procedures}
			/>

			<XmlTelemetryCardActions
				onExportCurrentPackageZip={onExportCurrentPackageZip}
				onDownloadXml={onDownloadXml}
			/>
		</div>
	);
};
