import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { MedicalCardDentalFormulaTable } from "./MedicalCardDentalFormulaTable";
import { MedicalCardPassportTable } from "./MedicalCardPassportTable";

export function MedicalCardSheetPage1({
	medicalCardData,
}: {
	medicalCardData: A4DocumentMedicalCardData;
}): React.JSX.Element {
	const isClosed = medicalCardData.isClosedOrSigned ?? false;
	const isDraft = medicalCardData.isDraft ?? !isClosed;

	return (
		<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
			{isDraft ? (
				<div
					style={{
						position: "absolute",
						top: "40%",
						left: "10%",
						width: "80%",
						textAlign: "center",
						fontSize: "48pt",
						fontWeight: "bold",
						color: "rgba(148, 163, 184, 0.16)",
						transform: "rotate(-32deg)",
						pointerEvents: "none",
						userSelect: "none",
						zIndex: 5,
						letterSpacing: "0.1em",
					}}
					data-testid="watermark-draft"
				>
					ЧЕРНОВИК
				</div>
			) : (
				<div
					style={{
						position: "absolute",
						top: "40%",
						left: "10%",
						width: "80%",
						textAlign: "center",
						fontSize: "38pt",
						fontWeight: "bold",
						color: "rgba(13, 148, 136, 0.12)",
						transform: "rotate(-32deg)",
						pointerEvents: "none",
						userSelect: "none",
						zIndex: 5,
						letterSpacing: "0.08em",
					}}
					data-testid="watermark-signed"
				>
					ПОДПИСАНО ВРАЧОМ
				</div>
			)}
			<div className="a4-sheet-body">
				<header className="a4-header">
					<div className="a4-clinic-name">
						{medicalCardData.clinic.legalName || medicalCardData.clinic.name}
					</div>
					<div className="a4-clinic-requisites">
						Адрес:{" "}
						{medicalCardData.clinic.actualAddress ||
							medicalCardData.clinic.address}{" "}
						· Тел: {medicalCardData.clinic.phone} · ИНН:{" "}
						{medicalCardData.clinic.inn}
						<br />
						Лицензия на осуществление медицинской деятельности: №{" "}
						{medicalCardData.clinic.licenseNumber}
					</div>
				</header>

				{isDraft && (
					<div
						style={{
							border: "1.5pt solid #cbd5e1",
							color: "#475569",
							background: "#f8fafc",
							fontSize: "8pt",
							fontWeight: "bold",
							textAlign: "center",
							padding: "3px 8px",
							marginBottom: "8px",
							borderRadius: "4px",
							letterSpacing: "0.04em",
						}}
					>
						ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
					</div>
				)}

				<h1 className="a4-doc-title">
					МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА
				</h1>
				<div className="a4-doc-subtitle">
					Амбулаторная карта стоматологического пациента №{" "}
					<strong>{medicalCardData.cardNumber}</strong>
				</div>

				<h2 className="a4-section-heading">
					1. Паспортная часть и соматический статус
				</h2>
				<MedicalCardPassportTable medicalCardData={medicalCardData} />

				<h2 className="a4-section-heading">
					2. Протокол клинического осмотра и статус полости рта
				</h2>
				<div style={{ fontSize: "9pt", margin: "4px 0" }}>
					<strong>Жалобы:</strong>{" "}
					{medicalCardData.complaints ||
						"Жалоб на момент осмотра активно не предъявляет."}
				</div>
				<div style={{ fontSize: "9pt", margin: "4px 0" }}>
					<strong>Анамнез заболевания (Anamnesis morbi):</strong>{" "}
					{medicalCardData.anamnesisMorbi ||
						"Обратился для планового осмотра и санации полости рта."}
				</div>
				<div style={{ fontSize: "9pt", margin: "4px 0" }}>
					<strong>Объективный осмотр (Status localis):</strong>{" "}
					{medicalCardData.statusLocalis}
				</div>

				<h2 className="a4-section-heading">
					3. Зубная формула (FDI World Dental Federation)
				</h2>
				<MedicalCardDentalFormulaTable medicalCardData={medicalCardData} />
			</div>

			<div className="a4-running-footer">
				<span>
					Медицинская карта № {medicalCardData.cardNumber} — Пациент:{" "}
					{medicalCardData.patient.fullName}
				</span>
				<span>Лист 1 из 2</span>
			</div>
		</section>
	);
}
