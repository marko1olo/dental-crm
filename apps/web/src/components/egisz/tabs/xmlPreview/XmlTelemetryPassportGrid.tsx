/**
 * XmlTelemetryPassportGrid.tsx
 * Passport grid and diagnoses / procedures overview for quiet telemetry card.
 */

import React from "react";
import type {
	EgiszClinicInfo,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";

export interface XmlTelemetryPassportGridProps {
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
}

export const XmlTelemetryPassportGrid: React.FC<XmlTelemetryPassportGridProps> = ({
	clinic,
	doctor,
	patient,
	diagnoses,
	procedures,
}) => {
	return (
		<>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "0.75rem",
					marginTop: "0.5rem",
					fontSize: "0.8125rem",
				}}
			>
				<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
					<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Пациент</span>
					<strong style={{ color: "var(--ink)" }}>{patient?.patientFullName || "Смирнов Алексей Викторович"}</strong>
					<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
						СНИЛС: {patient?.patientSnils || "—"}
					</span>
				</div>
				<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
					<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Врач</span>
					<strong style={{ color: "var(--ink)" }}>{doctor?.doctorFullName || "Иванов Сергей Владимирович"}</strong>
					<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
						{doctor?.doctorPosition || "Врач-стоматолог-терапевт"}
					</span>
				</div>
				<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
					<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Медицинская организация</span>
					<strong style={{ color: "var(--ink)" }}>{clinic?.clinicName || "ООО «ДЕНТЕ КЛИНИК»"}</strong>
					<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
						ОГРН: {clinic?.clinicOgrn || "1157746123457"}
					</span>
				</div>
			</div>

			{(diagnoses.length > 0 || procedures.length > 0) && (
				<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.25rem", fontSize: "0.8125rem" }}>
					{diagnoses.length > 0 && (
						<div style={{ color: "var(--ink)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
							<span style={{ color: "var(--muted)" }}>Диагноз:</span>
							{diagnoses.map((d, i) => (
								<span key={i} style={{ fontWeight: 600 }}>
									{d.icd10Code} {d.diagnosisName}{d.tooth ? ` (зуб ${d.tooth})` : ""}
								</span>
							))}
						</div>
					)}
					{procedures.length > 0 && (
						<div style={{ color: "var(--ink)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
							<span style={{ color: "var(--muted)" }}>Оказано услуг:</span>
							<span style={{ fontWeight: 600 }}>{procedures.length} {procedures.length === 1 ? "услуга" : "услуги"}</span>
						</div>
					)}
				</div>
			)}
		</>
	);
};
