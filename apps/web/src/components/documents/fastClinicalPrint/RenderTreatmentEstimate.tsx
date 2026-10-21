import React from "react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastPrintPlanStage,
} from "../FastClinicalPrintEngine";
import {
	DEFAULT_STAGES,
	FastPrintEstimateStagesTable,
} from "./FastPrintEstimateStagesTable";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";

export function RenderTreatmentEstimate({
	clinic,
	doctor,
	patient,
	planStages,
	totalAmount: _totalAmount,
}: {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	planStages?: FastPrintPlanStage[] | undefined;
	totalAmount: number;
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveStages =
		planStages && planStages.length > 0 ? planStages : DEFAULT_STAGES;
	const planGrandTotal = effectiveStages.reduce((acc, st) => acc + st.total, 0);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">
						Приложение №1 к Договору об оказании медицинских услуг · Лицензия:{" "}
						{effClinic.licenseNumber}
					</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>
						Врач-куратор:{" "}
						<strong className="font-bold">{effDoctor.fullName}</strong>
					</div>
					<div>Дата: {todayStr}</div>
				</div>
			</div>
			<div className="fast-print-doc-title">
				План комплексного стоматологического лечения и смета расходов
			</div>
			<div style={{ marginBottom: 12, fontSize: 11 }}>
				<strong>Пациент:</strong> {patient.fullName} · <strong>Карта №:</strong>{" "}
				{patient.cardNumber}
			</div>

			<FastPrintEstimateStagesTable stages={effectiveStages} />

			<div
				style={{
					border: "2px solid #000000",
					padding: "8px 12px",
					margin: "14px 0",
					fontSize: 12,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div style={{ fontWeight: 800 }}>
					ИТОГОВАЯ СТОИМОСТЬ ВСЕХ ЭТАПОВ ЛЕЧЕНИЯ:
				</div>
				<div style={{ fontSize: 14, fontWeight: 800 }}>
					{planGrandTotal.toLocaleString("ru-RU")} ₽
				</div>
			</div>
			<div style={{ fontSize: 10, color: "#374151", margin: "8px 0" }}>
				С планом лечения и финансовой сметой ознакомлен(а), согласен(на).
				Возможные альтернативные варианты, сроки гарантии и клинические риски
				разъяснены лечащим врачом в полном объеме.
			</div>
			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Врач-куратор плана:</div>
					<div className="font-bold">{effDoctor.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись)</div>
				</div>
				<div>
					<div className="fast-print-sub">Пациент:</div>
					<div className="font-bold">{patient.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">
						(подпись согласовано)
					</div>
				</div>
			</div>
		</div>
	);
}
