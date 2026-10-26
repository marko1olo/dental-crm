import React from "react";
import { ShieldCheck, Tag } from "lucide-react";
import type { LabelPresetType } from "./printerTypes.js";

interface Props {
	activePreset: LabelPresetType;
	onPresetChange: (preset: LabelPresetType) => void;
}

export const PrinterHeaderAndTabs: React.FC<Props> = ({ activePreset, onPresetChange }) => {
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
					Принтеры этикеток (Стерилизация оборудования и пробирки PRP/PRF)
				</div>
				<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
					Прямая термопечать штрихкодов стерилизации для ЦСО и биоматериалов плазмолифтинга.
				</div>
			</div>

			<div style={{ display: "flex", gap: "6px" }}>
				<button
					type="button"
					className={`hw-studio-category-tab ${activePreset === "kraft_sanpin" ? "active" : ""}`}
					onClick={() => onPresetChange("kraft_sanpin")}
					data-testid="label-tab-sanpin"
				>
					<ShieldCheck size={13} />
					<span>Стерилизация упаковок</span>
				</button>
				<button
					type="button"
					className={`hw-studio-category-tab ${activePreset === "prp_tube" ? "active" : ""}`}
					onClick={() => onPresetChange("prp_tube")}
					data-testid="label-tab-prp"
				>
					<Tag size={13} />
					<span>Пробирки PRP/PRF</span>
				</button>
			</div>
		</div>
	);
};
