import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";

export function MedicalCardSheetPage2({
	medicalCardData,
}: {
	medicalCardData: A4DocumentMedicalCardData;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet">
			<div className="a4-sheet-body">
				<div className="a4-running-header">
					<span>
						{medicalCardData.clinic.legalName || medicalCardData.clinic.name} ·
						Карта № {medicalCardData.cardNumber}
					</span>
					<span>Пациент: {medicalCardData.patient.fullName} · Лист 2 из 2</span>
				</div>

				<h2 className="a4-section-heading">4. Клинический диагноз (МКБ-10)</h2>
				<div style={{ fontSize: "9pt", margin: "4px 0" }}>
					<strong>Код МКБ-10:</strong>{" "}
					<span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
						{medicalCardData.diagnosisIcd10}
					</span>{" "}
					— {medicalCardData.diagnosisDescription}
					{medicalCardData.diagnosisTooth
						? ` (Область/Зуб FDI: № ${medicalCardData.diagnosisTooth})`
						: ""}
				</div>

				<h2 className="a4-section-heading">
					5. Дневник приёма и протокол проведённого лечения
				</h2>
				<div
					style={{
						fontSize: "9pt",
						lineHeight: 1.35,
						textAlign: "justify",
						margin: "4px 0",
					}}
				>
					<strong>Дата приёма:</strong> «{medicalCardData.visitDate}» г.
					<br />
					<strong>Проведённое лечение:</strong>
					<br />
					{medicalCardData.treatmentProtocol}
				</div>
				{medicalCardData.materialsUsed ? (
					<div style={{ fontSize: "8.5pt", margin: "3px 0" }}>
						<strong>Примененные препараты и материалы:</strong>{" "}
						{medicalCardData.materialsUsed}
					</div>
				) : null}

				<div style={{ fontSize: "9pt", margin: "4px 0" }}>
					<strong>Рекомендации и назначения:</strong>{" "}
					{medicalCardData.recommendations}
				</div>

				<div className="a4-sign-grid" style={{ marginTop: "30px" }}>
					<div className="a4-sign-col">
						<strong>ЛЕЧАЩИЙ ВРАЧ:</strong>
						<br />
						<br />
						{medicalCardData.doctorSpecialty || "Врач-стоматолог"}:<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/ {medicalCardData.doctorFullName} /{" "}
							<span className="stamp-box">М.П.</span>
						</div>
					</div>
					<div className="a4-sign-col">
						<strong>ПАЦИЕНТ:</strong>
						<br />
						<br />С диагнозом, планом лечения и рекомендациями ознакомлен:
						<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/ {medicalCardData.patient.fullName} /
						</div>
					</div>
				</div>
			</div>

			<div className="a4-running-footer">
				<span>
					Медицинская карта № {medicalCardData.cardNumber} — Пациент:{" "}
					{medicalCardData.patient.fullName}
				</span>
				<span>Лист 2 из 2</span>
			</div>
		</section>
	);
}
