import React from "react";
import type { A4DocumentActData } from "@dental/shared";
import { ActServicesTable } from "./ActServicesTable";
import { ActSignGrid } from "./ActSignGrid";
import { ActWarrantyBox } from "./ActWarrantyBox";

export interface ActSheetProps {
	zoomClass: string;
	actData: A4DocumentActData;
}

export const ActSheet: React.FC<ActSheetProps> = ({ actData }) => {
	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-act-content">
			<section
				className="pro-a4-page-sheet"
				data-testid="pro-a4-physical-sheet"
			>
				<div className="a4-sheet-body">
					<header className="a4-header">
						<div className="a4-clinic-name">
							{actData.clinic.legalName || actData.clinic.name}
						</div>
						<div className="a4-clinic-requisites">
							Адрес: {actData.clinic.actualAddress || actData.clinic.address} ·
							Тел: {actData.clinic.phone} · ИНН: {actData.clinic.inn} · ОГРН:{" "}
							{actData.clinic.ogrn}
							<br />
							Лицензия на осуществление медицинской деятельности: №{" "}
							{actData.clinic.licenseNumber}
						</div>
					</header>

					<h1 className="a4-doc-title">
						АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № {actData.actNumber}
					</h1>
					<div className="a4-doc-subtitle">
						к Договору на оказание платных медицинских услуг №{" "}
						<strong>{actData.contractNumber}</strong> от {actData.contractDate}{" "}
						г.
						<br />
						Дата составления Акта: <strong>«{actData.actDate}» г.</strong>
					</div>

					<table className="a4-table" style={{ marginBottom: "8px" }}>
						<tbody>
							<tr>
								<td
									style={{
										width: "25%",
										fontWeight: "bold",
										background: "#f5f5f5",
									}}
								>
									Исполнитель:
								</td>
								<td style={{ width: "75%" }}>
									{actData.clinic.legalName || actData.clinic.name} (Лицензия №{" "}
									{actData.clinic.licenseNumber})
								</td>
							</tr>
							<tr>
								<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
									Заказчик / Пациент:
								</td>
								<td>
									<strong>{actData.patient.fullName}</strong>
								</td>
							</tr>
							<tr>
								<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>
									Лечащий врач:
								</td>
								<td>
									<strong>{actData.doctorFullName}</strong> (
									{actData.doctorSpecialty || "Врач-стоматолог"})
								</td>
							</tr>
						</tbody>
					</table>

					<h2 className="a4-section-heading">
						Перечень фактически оказанных медицинских услуг
					</h2>
					<ActServicesTable actData={actData} />

					<ActWarrantyBox actData={actData} />

					<ActSignGrid actData={actData} />
				</div>

				<div className="a4-running-footer">
					<span>
						Акт № {actData.actNumber} от {actData.actDate} г. к Договору №{" "}
						{actData.contractNumber}
					</span>
					<span>Лист 1 из 1</span>
				</div>
			</section>
		</div>
	);
};
