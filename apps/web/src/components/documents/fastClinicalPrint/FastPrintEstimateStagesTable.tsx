import React from "react";
import type { FastPrintPlanStage } from "../FastClinicalPrintEngine";

export const DEFAULT_STAGES: FastPrintPlanStage[] = [
	{
		title: "Этап 1: Неотложная санация и терапия",
		total: 12500,
		dueDate: "1-2 недели",
		services: [
			{ name: "Лечение глубокого кариеса зуба 16", tooth: "16", price: 4800 },
			{
				name: "Эндодонтическое лечение периодонтита 26 (3 канала)",
				tooth: "26",
				price: 7700,
			},
		],
	},
	{
		title: "Этап 2: Профессиональная гигиена и пародонтология",
		total: 6500,
		dueDate: "3 неделя",
		services: [
			{
				name: "Комплекс AirFlow + ультразвук обеих челюстей",
				tooth: "18-48",
				price: 6500,
			},
		],
	},
	{
		title: "Этап 3: Ортопедическое восстановление",
		total: 35000,
		dueDate: "4-6 недель",
		services: [
			{
				name: "Коронка из диоксида циркония с фиксацией",
				tooth: "26",
				price: 35000,
			},
		],
	},
];

export function FastPrintEstimateStagesTable({
	stages,
}: {
	stages: FastPrintPlanStage[];
}): React.JSX.Element {
	return (
		<>
			{stages.map((st) => (
				<div
					key={st.title}
					className="fast-print-avoid-break"
					style={{ marginBottom: 12 }}
				>
					<div
						style={{
							fontWeight: 700,
							fontSize: 11.5,
							background: "#f3f4f6",
							padding: "4px 8px",
							border: "1px solid #000000",
							borderBottom: "none",
						}}
					>
						{st.title} {st.dueDate ? `· (Плановый срок: ${st.dueDate})` : ""}
					</div>
					<table className="fast-print-table" style={{ margin: 0 }}>
						<thead>
							<tr>
								<th style={{ width: "6%" }}>№</th>
								<th style={{ width: "64%" }}>Процедура / Манипуляция</th>
								<th style={{ width: "10%" }}>Зуб</th>
								<th style={{ width: "20%" }}>Стоимость (₽)</th>
							</tr>
						</thead>
						<tbody>
							{st.services.map((srv, sIdx) => (
								<tr key={srv.name}>
									<td style={{ textAlign: "center" }}>{sIdx + 1}</td>
									<td>{srv.name}</td>
									<td style={{ textAlign: "center" }}>{srv.tooth || "—"}</td>
									<td style={{ textAlign: "right" }}>
										{srv.price.toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							))}
							<tr className="fast-print-total-row">
								<td colSpan={3} style={{ textAlign: "right" }}>
									ИТОГО ЗА ЭТАП:
								</td>
								<td style={{ textAlign: "right" }}>
									{st.total.toLocaleString("ru-RU")} ₽
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			))}
		</>
	);
}
