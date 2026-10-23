import React from "react";
import type { FastPrintPatientInfo } from "../FastClinicalPrintEngine";

export interface PartisanMetaTableProps {
	patient: FastPrintPatientInfo;
	todayDateStr: string;
	todayTimeStr: string;
	ageStr: string;
}

export const PartisanMetaTable: React.FC<PartisanMetaTableProps> = ({
	patient,
	todayDateStr,
	todayTimeStr,
	ageStr,
}) => {
	return (
		<table className="partisan-meta-table">
			<tbody>
				<tr>
					<td className="partisan-cell-label">Пациент (Ф.И.О.):</td>
					<td className="partisan-cell-val">
						<strong>{patient.fullName}</strong>
					</td>
					<td className="partisan-cell-label">Дата рожд.:</td>
					<td className="partisan-cell-val">
						{patient.birthDate} ({ageStr})
					</td>
				</tr>
				<tr>
					<td className="partisan-cell-label">Карта / ID:</td>
					<td className="partisan-cell-val">
						<strong>№ {patient.cardNumber}</strong>
					</td>
					<td className="partisan-cell-label">Дата и время:</td>
					<td className="partisan-cell-val">
						<strong>
							{todayDateStr}, {todayTimeStr}
						</strong>
					</td>
				</tr>
				<tr>
					<td className="partisan-cell-label">Аллергоанамнез:</td>
					<td colSpan={3} className="partisan-cell-val partisan-allergy-text">
						{patient.allergies ||
							"Не отягощен (непереносимость местных анестетиков и антибиотиков отрицает)"}
					</td>
				</tr>
				<tr>
					<td className="partisan-cell-label">Соматический анамнез:</td>
					<td colSpan={3} className="partisan-cell-val">
						{patient.somaticNotes ||
							"Соматически здоров, хронические заболевания в стадии компенсации"}
					</td>
				</tr>
			</tbody>
		</table>
	);
};
