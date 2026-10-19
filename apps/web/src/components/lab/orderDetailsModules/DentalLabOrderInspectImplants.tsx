import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import { ABUTMENT_TYPE_OPTIONS } from "../orders/labWorkOrderPresets";

export function DentalLabOrderInspectImplants({
	order,
}: {
	readonly order: DentalLabWorkflowOrder;
}) {
	if (!order.implantPlatform && !order.abutmentType && !order.fixationType) {
		return null;
	}

	return (
		<div
			style={{
				background: "var(--paper-strong, #f8fafc)",
				padding: "10px",
				borderRadius: "6px",
			}}
		>
			<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
				Параметры имплантационной конструкции:
			</h4>
			<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
				{order.implantPlatform && (
					<div>
						Платформа:{" "}
						<strong>
							{order.implantPlatform === "conical"
								? "Конус Морзе"
								: "Шестигранник"}
						</strong>
					</div>
				)}
				{order.abutmentType && (
					<div>
						Абатмент:{" "}
						<strong>
							{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)
								?.nameRu || order.abutmentType}
						</strong>
					</div>
				)}
				{order.fixationType && (
					<div>
						Фиксация:{" "}
						<strong>
							{order.fixationType === "screw_retained"
								? "Винтовая"
								: "Цементная"}
						</strong>
					</div>
				)}
			</div>
		</div>
	);
}
