import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export function DentalLabOrderInspectFinancials({
	order,
}: {
	readonly order: DentalLabWorkflowOrder;
}) {
	return (
		<div
			style={{
				background: "var(--paper-strong, #f8fafc)",
				padding: "10px",
				borderRadius: "6px",
			}}
		>
			<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
				Финансовый расчет:
			</h4>
			<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
				<div>
					Стоимость:{" "}
					<strong>
						{order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div>
					ЗТЛ:{" "}
					<strong>
						{order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div>
					Маржа:{" "}
					<strong style={{ color: "var(--teal, #0d9488)" }}>
						{order.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div>
					ЗП врача ({order.financials.doctorPercent}%):{" "}
					<strong>
						{order.financials.doctorWageRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
			</div>
		</div>
	);
}
