import type { SterilizerEquipment } from "@dental/shared";
import {
	AlertTriangle,
	Archive,
	CheckCircle2,
	Edit3,
	RotateCcw,
	Trash2,
	Wrench,
} from "lucide-react";
import React from "react";

export interface SterilizerFleetCardProps {
	readonly item: SterilizerEquipment;
	readonly onEdit: (item: SterilizerEquipment) => void;
	readonly onToggleMaintenance: (item: SterilizerEquipment) => void;
	readonly onDecommission: (item: SterilizerEquipment) => void;
	readonly onDelete: (item: SterilizerEquipment) => void;
	readonly todayStr: string;
	readonly in30Days: string;
}

export function SterilizerFleetCard({
	item,
	onEdit,
	onToggleMaintenance,
	onDecommission,
	onDelete,
	todayStr,
	in30Days,
}: SterilizerFleetCardProps) {
	const isVerificationExpired = Boolean(
		item.verificationExpiryDate && item.verificationExpiryDate < todayStr,
	);
	const isVerificationDueSoon = Boolean(
		item.verificationExpiryDate &&
			item.verificationExpiryDate >= todayStr &&
			item.verificationExpiryDate <= in30Days,
	);

	return (
		<div
			className="sanpin-fleet-card"
			style={{
				background: "var(--paper-strong, #ffffff)",
				border: `1px solid ${
					item.status === "in_maintenance"
						? "rgba(217, 119, 6, 0.4)"
						: item.status === "decommissioned"
							? "rgba(220, 38, 38, 0.4)"
							: isVerificationExpired
								? "rgba(220, 38, 38, 0.4)"
								: "var(--line, #e2e8f0)"
				}`,
				borderRadius: "8px",
				padding: "0.85rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.6rem",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
				opacity: item.status === "decommissioned" ? 0.75 : 1,
			}}
		>
			{/* Card Header */}
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

				{/* Quick Action Button: Edit */}
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

			{/* Tech details grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "0.35rem 0.6rem",
					fontSize: "0.775rem",
					background: "var(--paper-soft, #f8fafc)",
					padding: "0.5rem",
					borderRadius: "6px",
				}}
			>
				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Серийный номер:</span>
					<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
						{item.serialNumber}
					</span>
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Инвентарный №:</span>
					<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
						{item.inventoryNumber || "—"}
					</span>
				</div>

				<div style={{ gridColumn: "1 / -1" }}>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Помещение:</span>
					<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
						{item.locationRoom || "ЦСО (Стерилизационная)"}
					</span>
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Поверка годна до:</span>
					{item.verificationExpiryDate ? (
						<span
							style={{
								fontWeight: 700,
								color: isVerificationExpired ? "var(--bad-fg)" : isVerificationDueSoon ? "var(--warn-fg)" : "var(--ok-fg)",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.2rem",
							}}
						>
							{isVerificationExpired && <AlertTriangle size={11} />}
							{new Date(item.verificationExpiryDate).toLocaleDateString("ru-RU")}
						</span>
					) : (
						<span style={{ color: "var(--muted, #64748b)" }}>Не указана</span>
					)}
				</div>

				<div>
					<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Следующее ТО:</span>
					<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
						{item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate).toLocaleDateString("ru-RU") : "По графику"}
					</span>
				</div>
			</div>

			{item.notes && (
				<div style={{ fontSize: "0.725rem", color: "var(--muted, #64748b)", fontStyle: "italic" }}>
					{item.notes}
				</div>
			)}

			{/* Bottom Action Buttons */}
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
		</div>
	);
}
