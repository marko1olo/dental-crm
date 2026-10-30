import React from "react";
import { formatPassportString } from "@dental/shared";
import type { A4DocumentMedicalCardData } from "@dental/shared";

export function MedicalCardPassportTable({
	medicalCardData,
}: {
	medicalCardData: A4DocumentMedicalCardData;
}): React.JSX.Element {
	return (
		<table className="a4-table">
			<tbody>
				<tr>
					<td
						style={{
							width: "25%",
							fontWeight: "bold",
							background: "#f5f5f5",
						}}
					>
						Пациент (ФИО):
					</td>
					<td style={{ width: "45%" }}>
						<strong>{medicalCardData.patient.fullName}</strong>
					</td>
					<td
						style={{
							width: "15%",
							fontWeight: "bold",
							background: "#f5f5f5",
						}}
					>
						Дата рождения:
					</td>
					<td style={{ width: "15%" }}>
						{medicalCardData.patient.birthDate || "—"}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						Пол / Контакты:
					</td>
					<td>
						{medicalCardData.patient.gender === "female"
							? "Женский"
							: medicalCardData.patient.gender === "male"
								? "Мужской"
								: "—"}{" "}
						· Тел: {medicalCardData.patient.phone || "—"}
					</td>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						СНИЛС / ОМС:
					</td>
					<td>
						{medicalCardData.patient.snils ||
							medicalCardData.patient.omsPolis ||
							"—"}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						Паспортные данные:
					</td>
					<td colSpan={3}>{formatPassportString(medicalCardData.patient)}</td>
				</tr>
				<tr>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						Адрес проживания:
					</td>
					<td colSpan={3}>
						{medicalCardData.patient.address ||
							medicalCardData.patient.registrationAddress ||
							"—"}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						Аллергологический статус:
					</td>
					<td colSpan={3}>
						<strong>
							{medicalCardData.allergyStatus ||
								"Не отягощен (со слов пациента)"}
						</strong>
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
						Соматический статус:
					</td>
					<td colSpan={3}>
						{medicalCardData.somaticStatus ||
							"Соматически здоров, сопутствующих заболеваний нет"}
					</td>
				</tr>
			</tbody>
		</table>
	);
}
