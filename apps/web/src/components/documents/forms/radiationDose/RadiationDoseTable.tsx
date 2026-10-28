import React from "react";
import {
	type PatientRadiationExposureRecord,
	dentalRadiologyStudyLabels,
} from "@dental/shared";

export interface RadiationDoseTableProps {
	records: PatientRadiationExposureRecord[];
}

export const RadiationDoseTable: React.FC<RadiationDoseTableProps> = ({ records }) => {
	return (
		<div style={{ overflowX: "auto" }}>
			<table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
				<thead>
					<tr>
						<th>Дата</th>
						<th>Вид исследования</th>
						<th>Область</th>
						<th>Аппарат</th>
						<th>Доза (мЗв)</th>
						<th>Доза (мкЗв)</th>
						<th>Исполнитель</th>
					</tr>
				</thead>
				<tbody>
					{records.map((r, idx) => (
						<tr key={idx}>
							<td>{r.studyDate}</td>
							<td>{(dentalRadiologyStudyLabels as Record<string, string>)[r.studyType] ?? r.studyType}</td>
							<td>{r.anatomicalArea}</td>
							<td>{r.apparatusName}</td>
							<td>
								<strong>{Number(r.effectiveDoseMsv ?? 0).toFixed(4)}</strong>
							</td>
							<td>{Number(r.effectiveDoseMicrosv ?? 0).toFixed(1)}</td>
							<td>{r.technicianOrDoctorFullName}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
