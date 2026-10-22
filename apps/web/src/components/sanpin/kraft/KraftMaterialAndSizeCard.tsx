import React, { useMemo } from "react";
import {
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	getKraftMaterialDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackagePresets.js";

export interface KraftMaterialAndSizeCardProps {
	readonly selectedMaterialId: KraftPackageMaterialId;
	readonly onMaterialChange: (id: KraftPackageMaterialId) => void;
	readonly selectedSizeId: KraftPackageSizeId;
	readonly onSizeChange: (id: KraftPackageSizeId) => void;
}

export const KraftMaterialAndSizeCard: React.FC<KraftMaterialAndSizeCardProps> = ({
	selectedMaterialId,
	onMaterialChange,
	selectedSizeId,
	onSizeChange,
}) => {
	const selectedMaterial = useMemo(
		() => getKraftMaterialDefinition(selectedMaterialId),
		[selectedMaterialId],
	);

	return (
		<div className="kraft-panel-card">
			<div className="kraft-panel-title">
				<span>2. Материал упаковки и срок стерильности</span>
				<span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>
					Срок: {selectedMaterial.statutoryShelfLifeDays} суток
				</span>
			</div>
			<div className="kraft-presets-grid">
				{KRAFT_PACKAGE_MATERIALS.map((mat) => (
					<div
						key={mat.id}
						onClick={() => onMaterialChange(mat.id)}
						className={`kraft-preset-item ${selectedMaterialId === mat.id ? "selected" : ""}`}
						style={{ cursor: "pointer" }}
					>
						<div className="kraft-preset-title">{mat.nameRu}</div>
						<div className="kraft-preset-desc">{mat.sealingMethodRu}</div>
						<span
							className="kraft-preset-badge"
							style={{
								background:
									mat.statutoryShelfLifeDays >= 60
										? "rgba(16, 185, 129, 0.12)"
										: "rgba(245, 158, 11, 0.12)",
								color: mat.statutoryShelfLifeDays >= 60 ? "#059669" : "#d97706",
							}}
						>
							{mat.statutoryShelfLifeDays} суток ({mat.sanpinClauseRu.split(" ")[0]})
						</span>
					</div>
				))}
			</div>

			<div style={{ marginTop: "0.5rem" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
					Типоразмер пакета:
				</label>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
					{KRAFT_PACKAGE_SIZES.map((sz) => (
						<button
							key={sz.id}
							type="button"
							onClick={() => onSizeChange(sz.id)}
							className={`kraft-pill-btn ${selectedSizeId === sz.id ? "active" : ""}`}
							style={{ fontSize: "0.8rem", textAlign: "center", minHeight: "44px" }}
						>
							{sz.dimensionsMmRu}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
