import type React from "react";
import { Beaker, User } from "lucide-react";
import type { LabOrderData } from "./guestPortalTypes.js";
import { getLabPortalStatusLabel, renderLabPortalStatusIcon } from "./guestPortalTypes.js";

export interface GuestLabPortalHeaderProps {
	readonly order: LabOrderData;
}

export function GuestLabPortalHeader({ order }: GuestLabPortalHeaderProps): React.JSX.Element {
	const statusLabel = getLabPortalStatusLabel(order.status);
	const orderShortId = (order.id ?? "").substring(0, 8).toUpperCase();

	return (
		<>
			<div
				className="guest-portal-icon-wrapper"
				style={{
					background: "var(--teal-soft)",
					color: "var(--teal)",
					borderColor: "transparent",
				}}
			>
				<Beaker size={32} />
			</div>
			<h1 className="guest-portal-title">
				Портал Зуботехнической Лаборатории
			</h1>
			<p className="guest-portal-subtitle">
				Безопасный доступ к деталям заказа
			</p>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "16px",
				}}
			>
				<div style={{ textAlign: "left" }}>
					<p
						style={{
							fontSize: "12px",
							textTransform: "uppercase",
							color: "var(--text-secondary)",
							marginBottom: "4px",
						}}
					>
						Заказ № {orderShortId}
					</p>
					<h2
						style={{
							fontSize: "20px",
							fontWeight: "600",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							margin: 0,
						}}
					>
						<User size={20} />
						{order.patientFullName || "Пациент не указан"}
					</h2>
				</div>
				<div className={`guest-portal-status-badge ${order.status}`}>
					{renderLabPortalStatusIcon(order.status)}
					{statusLabel}
				</div>
			</div>
		</>
	);
}
