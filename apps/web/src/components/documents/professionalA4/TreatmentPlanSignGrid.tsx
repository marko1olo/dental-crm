import type React from "react";
import type { A4DocumentTreatmentPlanData } from "@dental/shared";

export function TreatmentPlanSignGrid({
	treatmentPlanData,
}: {
	treatmentPlanData: A4DocumentTreatmentPlanData;
}): React.JSX.Element {
	return (
		<div className="a4-sign-grid">
			<div className="a4-sign-col">
				<strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong>
				<br />
				<br />
				Лечащий врач:
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">
					/ {treatmentPlanData.doctorFullName} /{" "}
					<span className="stamp-box">М.П.</span>
				</div>
			</div>
			<div className="a4-sign-col">
				<strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong>
				<br />
				<br />
				Пациент (Заказчик):
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">
					/ {treatmentPlanData.patient.fullName} / (с планом, сроками и
					стоимостью согласен)
				</div>
			</div>
		</div>
	);
}
