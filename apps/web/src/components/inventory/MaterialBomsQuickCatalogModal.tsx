/**
 * MaterialBomsQuickCatalogModal.tsx — Модальное окно быстрого выбора клинических материалов
 * из канонического каталога 90% рынка РФ/СНГ (Мандаты 8d, 8e, 8n).
 * Декомпозирован до <= 120 строк.
 */

import {
	type ClinicalMarketMaterialItem,
	searchClinicalMaterials,
} from "@dental/shared";
import { Layers, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { MaterialBomsCatalogRow } from "./quickCatalog/MaterialBomsCatalogRow.js";
import {
	DOMAIN_TABS,
	MaterialBomsCatalogSearchHeader,
} from "./quickCatalog/MaterialBomsCatalogSearchHeader.js";

export type MacroMaterialGroup =
	| "all" | "implant" | "bone_graft" | "surg" | "endo" | "ortho" | "prostho" | "therapy" | "lab";

export interface MaterialBomsQuickCatalogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
}

export { DOMAIN_TABS };

export function MaterialBomsQuickCatalogModal({
	isOpen,
	onClose,
	onSelectMaterial,
}: MaterialBomsQuickCatalogModalProps) {
	const [activeGroup, setActiveGroup] = useState<MacroMaterialGroup>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredMaterials = useMemo(() => {
		let list = searchClinicalMaterials(searchQuery);

		if (activeGroup === "implant") list = list.filter((m) => m.domain === "implant_system");
		else if (activeGroup === "bone_graft") list = list.filter((m) => m.domain === "bone_graft_membrane");
		else if (activeGroup === "surg") list = list.filter((m) => m.domain === "surg_suture" || m.domain === "surg_hemostatic");
		else if (activeGroup === "endo") list = list.filter((m) => m.domain.startsWith("endo_"));
		else if (activeGroup === "ortho") list = list.filter((m) => m.domain.startsWith("ortho_"));
		else if (activeGroup === "prostho") list = list.filter((m) => m.domain.startsWith("prostho_"));
		else if (activeGroup === "therapy") list = list.filter((m) => m.domain.startsWith("therapy_"));
		else if (activeGroup === "lab") list = list.filter((m) => m.domain === "lab_cad_material");

		return list;
	}, [searchQuery, activeGroup]);

	if (!isOpen) return null;

	return (
		<div className="material-boms-modal-backdrop" role="dialog" aria-modal="true">
			<div
				className="material-boms-modal"
				style={{ maxWidth: "880px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
			>
				<div className="material-boms-modal-header" style={{ padding: "16px 20px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Layers size={20} style={{ color: "var(--primary, #0d9488)" }} />
						<div>
							<h3 className="material-boms-modal-title" style={{ margin: 0, fontSize: "16px" }}>
								Каталог клинических материалов РФ/СНГ (90% рынка)
							</h3>
						</div>
					</div>
					<button
						type="button"
						style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<MaterialBomsCatalogSearchHeader
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					activeGroup={activeGroup}
					onSelectGroup={setActiveGroup}
				/>

				<div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
					{filteredMaterials.length === 0 ? (
						<div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
							По запросу ничего не найдено в каталоге
						</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
							{filteredMaterials.map((mat) => (
								<MaterialBomsCatalogRow
									key={mat.id}
									mat={mat}
									onSelectMaterial={onSelectMaterial}
									onClose={onClose}
								/>
							))}
						</div>
					)}
				</div>

				<div className="material-boms-modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ fontSize: "12px", color: "var(--muted)" }}>
						Найдено позиций: {filteredMaterials.length}
					</span>
					<button type="button" className="material-boms-btn material-boms-btn-secondary" onClick={onClose}>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}

export default MaterialBomsQuickCatalogModal;
