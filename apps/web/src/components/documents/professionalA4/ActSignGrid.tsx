import type React from "react";
import type { A4DocumentActData } from "@dental/shared";

export function ActSignGrid({
	actData,
}: {
	actData: A4DocumentActData;
}): React.JSX.Element {
	return (
		<div className="a4-sign-grid">
			<div className="a4-sign-col">
				<strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong>
				<br />
				<br />
				Врач-стоматолог:
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">
					/ {actData.doctorFullName} / <span className="stamp-box">М.П.</span>
				</div>
			</div>
			<div className="a4-sign-col">
				<strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong>
				<br />
				<br />
				Пациент / Заказчик:
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">/ {actData.patient.fullName} /</div>
			</div>
		</div>
	);
}
