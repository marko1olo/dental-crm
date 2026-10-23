import React from "react";
import { ShieldCheck, Stethoscope } from "lucide-react";

export interface PartisanClinicalTableProps {
	toothDisplay: string;
	cavityLocalization: string;
	diagnosisText: string;
	complaintsText: string;
	objectiveText: string;
	treatmentText: string;
	recommendationsText: string;
	warrantyText: string;
}

export const PartisanClinicalTable: React.FC<PartisanClinicalTableProps> = ({
	toothDisplay,
	cavityLocalization,
	diagnosisText,
	complaintsText,
	objectiveText,
	treatmentText,
	recommendationsText,
	warrantyText,
}) => {
	return (
		<>
			<div className="partisan-section-bar">
				<Stethoscope size={12} className="partisan-section-icon" />
				<span>ПРОТОКОЛ СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (ДНЕВНИК ВИЗИТА)</span>
			</div>
			<table className="partisan-meta-table">
				<tbody>
					<tr>
						<td className="partisan-cell-label">Зуб (FDI):</td>
						<td className="partisan-cell-val">
							<span className="partisan-fdi-badge">{toothDisplay}</span>
						</td>
						<td className="partisan-cell-label">Поверхность:</td>
						<td className="partisan-cell-val">
							<strong>{cavityLocalization}</strong>
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Диагноз (МКБ-10):</td>
						<td colSpan={3} className="partisan-cell-val">
							<div className="partisan-diagnosis-box">
								<strong>{diagnosisText}</strong>
							</div>
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Жалобы (S):</td>
						<td colSpan={3} className="partisan-cell-val">
							{complaintsText}
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Status Localis (O):</td>
						<td colSpan={3} className="partisan-cell-val">
							{objectiveText}
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Проведённое лечение (P):</td>
						<td colSpan={3} className="partisan-cell-val">
							{treatmentText}
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Рекомендации:</td>
						<td colSpan={3} className="partisan-cell-val">
							{recommendationsText}
						</td>
					</tr>
					<tr>
						<td className="partisan-cell-label">Гарантийный срок:</td>
						<td colSpan={3} className="partisan-cell-val">
							<div className="partisan-warranty-row">
								<ShieldCheck size={12} className="partisan-warranty-icon" />
								<strong>{warrantyText}</strong>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</>
	);
};
