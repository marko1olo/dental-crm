import { Search } from "lucide-react";
import React from "react";
import type { MacroMaterialGroup } from "../MaterialBomsQuickCatalogModal.js";

export const DOMAIN_TABS: readonly { readonly id: MacroMaterialGroup; readonly label: string }[] = [
	{ id: "all", label: "Все направления" },
	{ id: "implant", label: "Имплантаты (16 систем)" },
	{ id: "bone_graft", label: "Костная пластика (НКР)" },
	{ id: "surg", label: "Хирургия (швы/гемостаз)" },
	{ id: "endo", label: "Эндодонтия (файлы/силеры)" },
	{ id: "ortho", label: "Ортодонтия (брекеты/дуги/TAD)" },
	{ id: "prostho", label: "Ортопедия (слепки/цементы)" },
	{ id: "therapy", label: "Терапия (композиты/бонды)" },
	{ id: "lab", label: "ЗТЛ / CAD/CAM (диоксид/e.max)" },
];

export interface MaterialBomsCatalogSearchHeaderProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly activeGroup: MacroMaterialGroup;
	readonly onSelectGroup: (group: MacroMaterialGroup) => void;
}

export const MaterialBomsCatalogSearchHeader: React.FC<MaterialBomsCatalogSearchHeaderProps> = ({
	searchQuery,
	onSearchChange,
	activeGroup,
	onSelectGroup,
}) => {
	return (
		<div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border, #e2e8f0)", display: "flex", flexDirection: "column", gap: "10px" }}>
			<div style={{ position: "relative" }}>
				<Search
					size={16}
					style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
				/>
				<input
					type="text"
					className="material-boms-form-input"
					style={{ paddingLeft: "32px", width: "100%", boxSizing: "border-box" }}
					placeholder="Поиск по названию, бренду, производителю (например: Osstem, Bio-Oss, ProTaper, Damon, RelyX)..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>

			<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
				{DOMAIN_TABS.map((tab) => {
					const isActive = activeGroup === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onSelectGroup(tab.id)}
							style={{
								padding: "6px 12px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: isActive ? 600 : 400,
								border: isActive ? "1px solid var(--primary, #0d9488)" : "1px solid var(--border, #e2e8f0)",
								backgroundColor: isActive ? "var(--primary-subtle, rgba(13,148,136,0.1))" : "var(--paper, #fff)",
								color: isActive ? "var(--primary, #0d9488)" : "var(--ink, #1e293b)",
								cursor: "pointer",
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default MaterialBomsCatalogSearchHeader;
