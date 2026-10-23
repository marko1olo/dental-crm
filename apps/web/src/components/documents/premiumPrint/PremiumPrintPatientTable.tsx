import React from "react";
import type { PremiumPatientInfo } from "./types";

export interface PremiumPrintPatientTableProps {
	patient: PremiumPatientInfo | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	doctorSnils?: string | null | undefined;
	formattedDate: string;
}

export const PremiumPrintPatientTable: React.FC<PremiumPrintPatientTableProps> = ({
	patient,
	doctorName,
	doctorSpecialty,
	doctorSnils,
	formattedDate,
}) => {
	return (
		<table className="doc-meta-table">
			<tbody>
				<tr>
					<td className="doc-label">Пациент (ФИО):</td>
					<td className="doc-val" style={{ width: "45%" }}>
						<strong>{patient?.fullName || "—"}</strong>
					</td>
					<td className="doc-label">Дата приёма:</td>
					<td className="doc-val">{formattedDate}</td>
				</tr>
				<tr>
					<td className="doc-label">Дата рождения:</td>
					<td className="doc-val">
						{patient?.birthDate || "—"}{" "}
						{patient?.gender ? `(${patient.gender === "female" ? "Жен." : "Муж."})` : ""}
					</td>
					<td className="doc-label">№ Медицинской карты:</td>
					<td className="doc-val">
						<strong>{patient?.medicalCardNumber || "—"}</strong>
					</td>
				</tr>
				<tr>
					<td className="doc-label">Паспортные данные:</td>
					<td className="doc-val">{patient?.passport || "—"}</td>
					<td className="doc-label">Полис ОМС / ДМС:</td>
					<td className="doc-val">{patient?.omsPolis || "—"}</td>
				</tr>
				<tr>
					<td className="doc-label">СНИЛС:</td>
					<td className="doc-val">{patient?.snils || "—"}</td>
					<td className="doc-label">Контактный телефон:</td>
					<td className="doc-val">{patient?.phone || "—"}</td>
				</tr>
				<tr>
					<td className="doc-label">Лечащий врач:</td>
					<td className="doc-val" colSpan={3}>
						<strong>{doctorName || "—"}</strong>{" "}
						{doctorSpecialty ? `(${doctorSpecialty})` : ""}{" "}
						{doctorSnils ? `• СНИЛС врача: ${doctorSnils}` : ""}
					</td>
				</tr>
			</tbody>
		</table>
	);
};
