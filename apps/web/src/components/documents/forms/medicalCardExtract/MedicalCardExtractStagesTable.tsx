import React from "react";
import type { MedicalExtractTreatmentStage } from "@dental/shared";

export interface MedicalCardExtractStagesTableProps {
	stages: MedicalExtractTreatmentStage[];
}

export const MedicalCardExtractStagesTable: React.FC<MedicalCardExtractStagesTableProps> = ({
	stages,
}) => {
	return (
		<div style={{ overflowX: "auto", marginBottom: "16px" }}>
			<table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
				<thead>
					<tr>
						<th>Дата</th>
						<th>Зуб</th>
						<th>Диагноз</th>
						<th>Проведенное лечение</th>
						<th>Врач</th>
					</tr>
				</thead>
				<tbody>
					{stages.length === 0 ? (
						<tr>
							<td colSpan={5} style={{ textAlign: "center", padding: "16px", color: "var(--muted, #64748b)" }}>
								Этапы лечения не добавлены. Нажмите «+ Добавить этап»
							</td>
						</tr>
					) : (
						stages.map((st, idx) => (
							<tr key={idx}>
								<td>{st.treatmentDate}</td>
								<td>{st.toothOrAnatomicalArea || "—"}</td>
								<td>{st.diagnosisText || st.diagnosisIcd10}</td>
								<td>{st.performedIntervention}</td>
								<td>{st.attendingDoctorFullName}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
