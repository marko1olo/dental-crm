import React from "react";
import type { CabinetHandoverCheckItem } from "./cabinetHandoverTypes";

export interface DoctorCabinetHandoverGridProps {
	readonly items: readonly CabinetHandoverCheckItem[];
	readonly onToggleItem: (id: string) => void;
}

export const DoctorCabinetHandoverGrid: React.FC<DoctorCabinetHandoverGridProps> = ({
	items,
	onToggleItem,
}) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
			gap: "8px",
		}}
	>
		{items.map((item) => (
			<label
				key={item.id}
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: "10px",
					padding: "10px 12px",
					borderRadius: "10px",
					background: item.checked ? "var(--paper-soft)" : "var(--paper)",
					border: item.checked ? "1px solid var(--line)" : "1px solid var(--line-strong, #cbd5e1)",
					cursor: "pointer",
					transition: "all 0.15s ease",
				}}
			>
				<input
					type="checkbox"
					checked={item.checked}
					onChange={() => onToggleItem(item.id)}
					style={{
						marginTop: "2px",
						width: "16px",
						height: "16px",
						accentColor: "var(--teal)",
						cursor: "pointer",
					}}
				/>
				<div style={{ minWidth: 0, flex: 1 }}>
					<strong
						style={{
							display: "block",
							fontSize: "12.5px",
							fontWeight: 600,
							color: "var(--ink)",
							lineHeight: 1.25,
						}}
					>
						{item.title}
					</strong>
					<span
						style={{
							display: "block",
							fontSize: "11px",
							color: "var(--muted)",
							lineHeight: 1.3,
							marginTop: "2px",
						}}
					>
						{item.detailRu}
					</span>
				</div>
			</label>
		))}
	</div>
);
