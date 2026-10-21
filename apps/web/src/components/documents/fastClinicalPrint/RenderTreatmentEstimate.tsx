import React from "react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastPrintPlanStage,
} from "../FastClinicalPrintEngine";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";

const DEFAULT_STAGES: FastPrintPlanStage[] = [
	{
		title: "Этап 1: Неотложная санация и терапия", total: 12500, dueDate: "1-2 недели",
		services: [
			{ name: "Лечение глубокого кариеса зуба 16", tooth: "16", price: 4800 },
			{ name: "Эндодонтическое лечение периодонтита 26 (3 канала)", tooth: "26", price: 7700 },
		],
	},
	{
		title: "Этап 2: Профессиональная гигиена и пародонтология", total: 6500, dueDate: "3 неделя",
		services: [{ name: "Комплекс AirFlow + ультразвук обеих челюстей", tooth: "18-48", price: 6500 }],
	},
	{
		title: "Этап 3: Ортопедическое восстановление", total: 35000, dueDate: "4-6 недель",
		services: [{ name: "Коронка из диоксида циркония с фиксацией", tooth: "26", price: 35000 }],
	},
];

export function RenderTreatmentEstimate({
	clinic, doctor, patient, planStages, totalAmount: _totalAmount,
}: {
	clinic: FastPrintClinicInfo; doctor?: FastPrintDoctorInfo | undefined; patient: FastPrintPatientInfo;
	planStages?: FastPrintPlanStage[] | undefined; totalAmount: number;
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveStages = (planStages && planStages.length > 0) ? planStages : DEFAULT_STAGES;
	const planGrandTotal = effectiveStages.reduce((acc, st) => acc + st.total, 0);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">Приложение №1 к Договору об оказании медицинских услуг · Лицензия: {effClinic.licenseNumber}</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Врач-куратор: <strong className="font-bold">{effDoctor.fullName}</strong></div>
					<div>Дата: {todayStr}</div>
				</div>
			</div>
			<div className="fast-print-doc-title">План комплексного стоматологического лечения и смета расходов</div>
			<div style={{ marginBottom: 12, fontSize: 11 }}>
				<strong>Пациент:</strong> {patient.fullName} · <strong>Карта №:</strong> {patient.cardNumber}
			</div>

			{effectiveStages.map((st) => (
				<div key={st.title} className="fast-print-avoid-break" style={{ marginBottom: 12 }}>
					<div style={{ fontWeight: 700, fontSize: 11.5, background: "#f3f4f6", padding: "4px 8px", border: "1px solid #000000", borderBottom: "none" }}>
						{st.title} {st.dueDate ? `· (Плановый срок: ${st.dueDate})` : ""}
					</div>
					<table className="fast-print-table" style={{ margin: 0 }}>
						<thead>
							<tr>
								<th style={{ width: "6%" }}>№</th><th style={{ width: "64%" }}>Процедура / Манипуляция</th>
								<th style={{ width: "10%" }}>Зуб</th><th style={{ width: "20%" }}>Стоимость (₽)</th>
							</tr>
						</thead>
						<tbody>
							{st.services.map((srv, sIdx) => (
								<tr key={srv.name}>
									<td style={{ textAlign: "center" }}>{sIdx + 1}</td><td>{srv.name}</td>
									<td style={{ textAlign: "center" }}>{srv.tooth || "—"}</td><td style={{ textAlign: "right" }}>{srv.price.toLocaleString("ru-RU")} ₽</td>
								</tr>
							))}
							<tr className="fast-print-total-row">
								<td colSpan={3} style={{ textAlign: "right" }}>ИТОГО ЗА ЭТАП:</td><td style={{ textAlign: "right" }}>{st.total.toLocaleString("ru-RU")} ₽</td>
							</tr>
						</tbody>
					</table>
				</div>
			))}

			<div style={{ border: "2px solid #000000", padding: "8px 12px", margin: "14px 0", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div style={{ fontWeight: 800 }}>ИТОГОВАЯ СТОИМОСТЬ ВСЕХ ЭТАПОВ ЛЕЧЕНИЯ:</div>
				<div style={{ fontSize: 14, fontWeight: 800 }}>{planGrandTotal.toLocaleString("ru-RU")} ₽</div>
			</div>
			<div style={{ fontSize: 10, color: "#374151", margin: "8px 0" }}>
				С планом лечения и финансовой сметой ознакомлен(а), согласен(на). Возможные альтернативные варианты, сроки гарантии и клинические риски разъяснены лечащим врачом в полном объеме.
			</div>
			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Врач-куратор плана:</div><div className="font-bold">{doctor.fullName}</div>
					<div className="fast-print-sign-line" /><div className="fast-print-sub text-center">(подпись)</div>
				</div>
				<div>
					<div className="fast-print-sub">Пациент:</div><div className="font-bold">{patient.fullName}</div>
					<div className="fast-print-sign-line" /><div className="fast-print-sub text-center">(подпись согласовано)</div>
				</div>
			</div>
		</div>
	);
}
