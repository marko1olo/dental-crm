import type { SterilizerEquipment } from "@dental/shared";
import { Archive, CheckCircle2, RotateCcw, Trash2, Wrench } from "lucide-react";
import React from "react";

export interface SterilizerFleetCardActionsProps {
	readonly item: SterilizerEquipment;
	readonly onToggleMaintenance: (item: SterilizerEquipment) => void;
	readonly onDecommission: (item: SterilizerEquipment) => void;
	readonly onDelete: (item: SterilizerEquipment) => void;
}

export function SterilizerFleetCardActions({
	item,
	onToggleMaintenance,
	onDecommission,
	onDelete,
}: SterilizerFleetCardActionsProps) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.35rem",
				marginTop: "auto",
				paddingTop: "0.4rem",
				borderTop: "1px solid var(--line, #e2e8f0)",
			}}
		>
			<div style={{ display: "flex", gap: "0.3rem" }}>
				{item.status !== "decommissioned" ? (
					<button
						type="button"
						onClick={() => onToggleMaintenance(item)}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{
							minHeight: "28px",
							height: "28px",
							padding: "0.1rem 0.5rem",
							fontSize: "0.725rem",
							fontWeight: 600,
							color: item.status === "in_maintenance" ? "#059669" : "#d97706",
						}}
						title={item.status === "in_maintenance" ? "Вернуть аппарат в строй" : "Отправить на техобслуживание (ТО)"}
					>
						{item.status === "in_maintenance" ? <CheckCircle2 size={12} /> : <Wrench size={12} />}
						<span>{item.status === "in_maintenance" ? "В строй" : "На ТО"}</span>
					</button>
				) : null}

				<button
					type="button"
					onClick={() => onDecommission(item)}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{
						minHeight: "28px",
						height: "28px",
						padding: "0.1rem 0.5rem",
						fontSize: "0.725rem",
						fontWeight: 600,
						color: item.status === "decommissioned" ? "#2563eb" : "#dc2626",
					}}
					title={item.status === "decommissioned" ? "Восстановить аппарат" : "Списать аппарат с баланса"}
				>
					{item.status === "decommissioned" ? <RotateCcw size={12} /> : <Archive size={12} />}
					<span>{item.status === "decommissioned" ? "Восстановить" : "Списать"}</span>
				</button>
			</div>

			<button
				type="button"
				onClick={() => onDelete(item)}
				className="sanpin-btn-icon"
				style={{ minHeight: "28px", minWidth: "28px", color: "var(--muted, #94a3b8)" }}
				title="Удалить из реестра"
			>
				<Trash2 size={13} />
			</button>
		</div>
	);
}
