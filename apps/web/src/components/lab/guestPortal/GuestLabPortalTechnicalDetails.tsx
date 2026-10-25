import type React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { LabOrderData } from "./guestPortalTypes.js";
import { MATERIAL_LABELS } from "../guestLabPortalHelpers.js";

export interface GuestLabPortalTechnicalDetailsProps {
	readonly order: LabOrderData;
}

export function GuestLabPortalTechnicalDetails({ order }: GuestLabPortalTechnicalDetailsProps): React.JSX.Element {
	const materialDisplay = order.material
		? (MATERIAL_LABELS[order.material] ?? order.material)
		: "—";
	const dueDateDisplay = order.dueDate
		? new Date(order.dueDate).toLocaleDateString("ru-RU")
		: "По согласованию";

	return (
		<div>
			<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
				<CheckCircle2 size={16} /> Технические параметры и задание
			</h3>
			<div
				className="guest-portal-field"
				style={{
					background: "var(--paper)",
					padding: "16px",
					borderRadius: "8px",
					border: "1px solid var(--line)",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
					<span className="guest-portal-field-label">Зуб (FDI):</span>
					<span className="guest-portal-field-value" data-testid="guest-portal-tooth-fdi">
						{order.toothFdi ? (
							<span className="guest-portal-scan-badge" style={{ fontSize: "13px", padding: "2px 8px" }}>
								№ {order.toothFdi}
							</span>
						) : (
							"—"
						)}
					</span>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
					<span className="guest-portal-field-label">Материал:</span>
					<span className="guest-portal-field-value">{materialDisplay}</span>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
					<span className="guest-portal-field-label">Цвет (Vita):</span>
					<span className="guest-portal-field-value">{order.colorVita || "—"}</span>
				</div>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: "12px",
						borderTop: "1px dashed var(--line)",
						paddingTop: "8px",
						marginTop: "4px",
					}}
				>
					<span className="guest-portal-field-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<Clock size={14} /> Срок сдачи (дедлайн):
					</span>
					<span
						className="guest-portal-field-value"
						data-testid="guest-portal-due-date"
						style={{ color: "var(--teal)", fontWeight: 700 }}
					>
						{dueDateDisplay}
					</span>
				</div>
			</div>
		</div>
	);
}
