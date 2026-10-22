import React from "react";
import { Printer } from "lucide-react";

export interface BactericidalTableToolbarProps {
	readonly equipments: any[];
	readonly selectedEquipId: string;
	readonly setSelectedEquipId: (id: string) => void;
	readonly onPrintJournal: () => void;
}

export function BactericidalTableToolbar({
	equipments,
	selectedEquipId,
	setSelectedEquipId,
	onPrintJournal,
}: BactericidalTableToolbarProps) {
	return (
		<div
			className="sanpin-table-toolbar"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				padding: "0.35rem 0.65rem",
				background: "var(--paper-soft, #f8fafc)",
				borderBottom: "1px solid var(--line, #e2e8f0)",
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
				<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>Фильтр:</span>
				<select
					value={selectedEquipId}
					onChange={(e) => setSelectedEquipId(e.target.value)}
					className="sanpin-select"
					style={{ minHeight: "44px", height: "44px", fontSize: "0.85rem", padding: "0.4rem 0.75rem", borderRadius: "8px" }}
				>
					<option value="all">Все облучатели клиники</option>
					{equipments.map((e) => (
						<option key={e.id} value={e.id}>
							{e.roomName} ({e.deviceBrand})
						</option>
					))}
				</select>
			</div>
			<button
				type="button"
				onClick={onPrintJournal}
				className="sanpin-btn sanpin-btn-secondary touch-manipulation"
				style={{
					minHeight: "44px",
					height: "44px",
					padding: "0.4rem 0.85rem",
					fontSize: "0.85rem",
					fontWeight: 600,
					cursor: "pointer",
					whiteSpace: "nowrap",
					display: "inline-flex",
					alignItems: "center",
					gap: "0.35rem",
					borderRadius: "8px",
				}}
				title="Выгрузка официального журнала регистрации и контроля работы бактерицидной установки со штампами"
				data-testid="bactericidal-print-official-btn"
			>
				<Printer size={15} /> <span>Печать журнала</span>
			</button>
		</div>
	);
}
