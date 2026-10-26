import React from "react";
import { CheckCircle2 } from "lucide-react";

export const ScannerHeader: React.FC = () => {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				padding: "12px 14px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
			}}
		>
			<div>
				<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
					2D Сканеры DataMatrix и штрихкодов («Честный ЗНАК» / МДЛП)
				</div>
				<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
					Распознавание маркированных упаковок, карпул анестезии, имплантатов и крафт-пакетов стерилизации.
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
				<span className="hw-counter-pill ready" title="Сканер готов к работе">
					<CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
					<span>Сканер готов</span>
				</span>
			</div>
		</div>
	);
};
