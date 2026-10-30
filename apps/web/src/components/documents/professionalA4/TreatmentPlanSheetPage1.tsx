import React from "react";
import type { A4DocumentTreatmentPlanData } from "@dental/shared";
import { TreatmentPlanStagesTable } from "./TreatmentPlanStagesTable";

export function TreatmentPlanSheetPage1({
	treatmentPlanData,
}: {
	treatmentPlanData: A4DocumentTreatmentPlanData;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
			<div className="a4-sheet-body">
				<header className="a4-header">
					<div className="a4-clinic-name">
						{treatmentPlanData.clinic.legalName ||
							treatmentPlanData.clinic.name}
					</div>
					<div className="a4-clinic-requisites">
						Адрес:{" "}
						{treatmentPlanData.clinic.actualAddress ||
							treatmentPlanData.clinic.address}{" "}
						· Тел: {treatmentPlanData.clinic.phone} · ИНН:{" "}
						{treatmentPlanData.clinic.inn}
						<br />
						Лицензия на медицинскую деятельность: №{" "}
						{treatmentPlanData.clinic.licenseNumber}
					</div>
				</header>

				<h1 className="a4-doc-title">
					ПЛАН КОМПЛЕКСНОГО СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ И СМЕТА
				</h1>
				<div className="a4-doc-subtitle">
					Приложение к Договору на оказание платных медицинских услуг · Дата
					составления: «{treatmentPlanData.planDate}» г.
				</div>

				<table className="a4-table" style={{ marginBottom: "6px" }}>
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
								<strong>{treatmentPlanData.patient.fullName}</strong>
							</td>
							<td
								style={{
									width: "15%",
									fontWeight: "bold",
									background: "#f5f5f5",
								}}
							>
								№ карты:
							</td>
							<td style={{ width: "15%" }}>
								<strong>{treatmentPlanData.patient.cardNumber || "б/н"}</strong>
							</td>
						</tr>
						<tr>
							<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
								Дата рождения / Тел:
							</td>
							<td>
								{treatmentPlanData.patient.birthDate || "—"} · Тел:{" "}
								{treatmentPlanData.patient.phone || "—"}
							</td>
							<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
								Лечащий врач:
							</td>
							<td>
								<strong>{treatmentPlanData.doctorFullName}</strong>
							</td>
						</tr>
						<tr>
							<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
								Клинический диагноз:
							</td>
							<td colSpan={3}>
								{treatmentPlanData.diagnosisSummary ||
									treatmentPlanData.clinicalReason ||
									"Первичная консультация и комплексная санация"}
							</td>
						</tr>
					</tbody>
				</table>

				<h2 className="a4-section-heading">
					Этапы и калькуляция лечебных мероприятий
				</h2>
				<TreatmentPlanStagesTable
					stages={treatmentPlanData.stages.slice(0, 2)}
				/>
			</div>

			<div className="a4-running-footer">
				<span>
					План комплексного лечения — Пациент:{" "}
					{treatmentPlanData.patient.fullName}
				</span>
				<span>Лист 1 из 2</span>
			</div>
		</section>
	);
}
