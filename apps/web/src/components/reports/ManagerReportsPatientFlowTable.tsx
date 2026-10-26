import type React from "react";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsPatientFlowTableProps {
	readonly summary: ReportsSummary;
}

export const ManagerReportsPatientFlowTable: React.FC<
	ManagerReportsPatientFlowTableProps
> = ({ summary }) => {
	const points = summary.patientFlow?.points ?? [];
	if (points.length === 0) return null;

	return (
		<>
			<h3 className="ops-section-title">Первичные и повторные пациенты</h3>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<thead>
						<tr>
							<th scope="col">Месяц</th>
							<th scope="col">Первичные</th>
							<th scope="col">Повторные</th>
						</tr>
					</thead>
					<tbody>
						{points.map((point, idx) => (
							<tr key={point?.bucket ?? `flow-pt-${idx}`}>
								<td className="ops-strong" data-label="Месяц">{point?.bucket ?? "—"}</td>
								<td className="ops-num" data-label="Первичные">{point?.newPatients ?? 0}</td>
								<td className="ops-num" data-label="Повторные">{point?.returningPatients ?? 0}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="ops-hint">
				Первичный — тот, у кого это первый завершённый приём за всю историю клиники.
			</p>
		</>
	);
};
