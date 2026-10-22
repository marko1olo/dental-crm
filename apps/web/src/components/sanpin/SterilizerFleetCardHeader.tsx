import type { SterilizerEquipment } from "@dental/shared";
import { Archive, CheckCircle2, Edit3, Wrench } from "lucide-react";
import React from "react";

export interface SterilizerFleetCardHeaderProps {
	readonly item: SterilizerEquipment;
	readonly onEdit: (item: SterilizerEquipment) => void;
}

export function SterilizerFleetCardHeader({ item, onEdit }: SterilizerFleetCardHeaderProps) {
	return (
		<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
					<span
						className="sanpin-tag"
						style={{
							fontSize: "0.7rem",
							padding: "0.1rem 0.4rem",
							background: item.deviceType === "dry_heat" ? "rgba(234, 88, 12, 0.1)" : "rgba(13, 148, 136, 0.1)",
							color: item.deviceType === "dry_heat" ? "var(--warn-fg)" : "var(--teal)",
							fontWeight: 700,
						}}
					>
						{item.deviceType === "dry_heat" ? "Сухожар 180°C" : item.deviceClass === "autoclave_class_s" ? "B/S-Класс" : "B-Класс 134°C"}
					</span>

					<span
						className="sanpin-tag"
						style={{
							fontSize: "0.7rem",
							padding: "0.1rem 0.4rem",
							background: "rgba(0,0,0,0.05)",
							color: "var(--ink, #0f172a)",
							fontWeight: 600,
						}}
					>
						{item.chamberVolumeLiters} л
					</span>

					{item.status === "active" && (
						<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
							<CheckCircle2 size={11} /> В работе
						</span>
					)}

					{item.status === "in_maintenance" && (
						<span className="sanpin-tag sanpin-tag-warning" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
							<Wrench size={11} /> На ТО
						</span>
					)}

					{item.status === "decommissioned" && (
						<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
							<Archive size={11} /> Списан
						</span>
					)}
				</div>

				<h4
					style={{
						margin: 0,
						fontSize: "0.925rem",
						fontWeight: 700,
						color: "var(--ink, #0f172a)",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
					title={item.name}
				>
					{item.name}
				</h4>
				<span style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)", display: "block" }}>
					{item.brandModel}
				</span>
			</div>

			<button
				type="button"
				onClick={() => onEdit(item)}
				className="sanpin-btn-icon"
				style={{ minHeight: "30px", minWidth: "30px" }}
				title="Редактировать параметры аппарата"
			>
				<Edit3 size={14} />
			</button>
		</div>
	);
}
