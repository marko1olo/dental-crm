/**
 * DmsInsurerChipsSelector.tsx — Панель 1-клик выбора страховых компаний РФ (Закон Хика)
 */

import { Building2, Check } from "lucide-react";
import React from "react";
import { QUICK_RUSSIAN_DMS_INSURER_CHIPS } from "./types.js";

export interface DmsInsurerChipsSelectorProps {
	readonly insurerKey: string;
	readonly onInsurerKeyChange: (key: string) => void;
}

export function DmsInsurerChipsSelector({
	insurerKey,
	onInsurerKeyChange,
}: DmsInsurerChipsSelectorProps) {
	return (
		<div className="dms-quick-toolbar" style={{ marginBottom: "14px" }}>
			<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px" }}>
				<Building2 size={13} />
				<span>1-Клик выбор:</span>
			</span>
			{QUICK_RUSSIAN_DMS_INSURER_CHIPS.map((ins) => (
				<button
					key={ins.key}
					type="button"
					onClick={() => onInsurerKeyChange(ins.key)}
					className={`dms-quick-chip dente-filter-chip ${insurerKey === ins.key ? "active" : ""}`}
					title={`Выбрать страховую компанию ${ins.name}`}
				>
					{insurerKey === ins.key && <Check size={12} />}
					<span>{ins.name}</span>
				</button>
			))}
		</div>
	);
}
