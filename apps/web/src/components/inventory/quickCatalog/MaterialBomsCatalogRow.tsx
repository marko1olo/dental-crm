import type { ClinicalMarketMaterialItem } from "@dental/shared";
import { Award, Check } from "lucide-react";
import React from "react";

export interface MaterialBomsCatalogRowProps {
	readonly mat: ClinicalMarketMaterialItem;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
	readonly onClose: () => void;
}

export const MaterialBomsCatalogRow: React.FC<MaterialBomsCatalogRowProps> = ({
	mat,
	onSelectMaterial,
	onClose,
}) => {
	const isTop = mat.marketRank === 1 || mat.isMarketLeader;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "10px 14px",
				borderRadius: "8px",
				border: isTop ? "1px solid var(--primary, #0d9488)" : "1px solid var(--border, #e2e8f0)",
				backgroundColor: isTop ? "var(--primary-subtle, rgba(13,148,136,0.03))" : "var(--paper, #fff)",
				gap: "12px",
			}}
		>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							padding: "2px 6px",
							borderRadius: "4px",
							backgroundColor: isTop ? "#0d9488" : "var(--muted-bg, #f1f5f9)",
							color: isTop ? "#fff" : "var(--muted, #64748b)",
							display: "inline-flex",
							alignItems: "center",
							gap: "3px",
						}}
					>
						{isTop && <Award size={12} />}
						{isTop ? "№1 Лидер рынка" : `№${mat.marketRank} в категории`}
					</span>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						[{mat.domain}]
					</span>
					<span style={{ fontSize: "11px", color: "var(--muted)" }}>
						{mat.manufacturer} ({mat.country})
					</span>
				</div>
				<div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink, #1e293b)" }}>
					{mat.nameRu}
				</div>
				<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
					Показания: {mat.clinicalIndicationsRu}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink, #1e293b)" }}>
						1 {mat.defaultUnit}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)" }}>
						~{mat.approximatePriceRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<button
					type="button"
					className="material-boms-btn material-boms-btn-primary"
					style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
					onClick={() => {
						onSelectMaterial(mat);
						onClose();
					}}
				>
					<Check size={14} />
					Выбрать
				</button>
			</div>
		</div>
	);
};

export default MaterialBomsCatalogRow;
