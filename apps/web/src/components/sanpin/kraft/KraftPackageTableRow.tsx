import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import React from "react";
import type { KraftPackageRecord } from "./kraftPackageEngine.js";
import {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets.js";

export interface KraftPackageTableRowProps {
	readonly pack: KraftPackageRecord;
	readonly onToggleBreached: (id: string) => void;
	readonly onDeletePackage: (id: string) => void;
}

export const KraftPackageTableRow: React.FC<KraftPackageTableRowProps> = ({
	pack,
	onToggleBreached,
	onDeletePackage,
}) => {
	return (
		<tr>
			<td style={{ fontFamily: "monospace", fontWeight: 700 }}>
				{pack.barcode128}
			</td>
			<td>
				<div style={{ fontWeight: 600 }}>{pack.toolSetNameRu}</div>
				<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
					{pack.batchId} #{pack.serialNumber}
				</div>
			</td>
			<td>
				<div>{getKraftMaterialDefinition(pack.packageType).shortLabelRu}</div>
				<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
					{getKraftSizeDefinition(pack.packageSize).dimensionsMmRu}
				</div>
			</td>
			<td>{pack.packDate}</td>
			<td style={{ fontWeight: 700 }}>{pack.expDate}</td>
			<td>{pack.daysRemaining} дн.</td>
			<td>
				<span className={`kraft-status-badge ${pack.status}`}>
					{pack.status === "sterile_valid" && <CheckCircle2 size={12} />}
					{pack.status === "expiring_soon_7d" && <Clock size={12} />}
					{pack.status === "expired" && <AlertTriangle size={12} />}
					{pack.status === "recalled" && <ShieldAlert size={12} />}
					{pack.status === "sterile_valid" && "Стерильно"}
					{pack.status === "expiring_soon_7d" && "Истекает"}
					{pack.status === "expired" && "Просрочено"}
					{pack.status === "recalled" && "Отозвано"}
				</span>
			</td>
			<td>
				<span
					style={{
						fontSize: "0.75rem",
						background: "var(--paper-strong)",
						padding: "2px 6px",
						borderRadius: "4px",
					}}
				>
					{pack.autoclaveId} / Ц#{pack.cycleNumber}
				</span>
			</td>
			<td>
				<div style={{ display: "flex", gap: "4px" }}>
					<button
						type="button"
						onClick={() => onToggleBreached(pack.id)}
						title={
							pack.isBreached
								? "Восстановить статус"
								: "Отметить нарушение целостности"
						}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: pack.isBreached ? "#059669" : "#dc2626",
							padding: "4px",
						}}
					>
						<ShieldAlert size={16} />
					</button>
					<button
						type="button"
						onClick={() => onDeletePackage(pack.id)}
						title="Удалить запись"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
							padding: "4px",
						}}
					>
						<Trash2 size={16} />
					</button>
				</div>
			</td>
		</tr>
	);
};
