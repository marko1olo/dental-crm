import { Tag } from "lucide-react";
import React from "react";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraftPackageEngine";

interface KraftLivePreviewViewProps {
	previewPackage?: KraftPackageRecord | undefined;
	previewLabelSize: "58x40" | "43x25";
	onPreviewLabelSizeChange: (size: "58x40" | "43x25") => void;
}

export function KraftLivePreviewView({
	previewPackage,
	previewLabelSize,
	onPreviewLabelSizeChange,
}: KraftLivePreviewViewProps) {
	if (!previewPackage) return null;

	return (
		<div className="kraft-preview-card">
			<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
					<Tag size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
					Превью термоэтикетки со штрихкодом
				</span>
				<div style={{ display: "flex", gap: "6px" }}>
					<button
						type="button"
						onClick={() => onPreviewLabelSizeChange("58x40")}
						className={`kraft-pill-btn ${previewLabelSize === "58x40" ? "active" : ""}`}
						style={{ minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
					>
						58×40 мм
					</button>
					<button
						type="button"
						onClick={() => onPreviewLabelSizeChange("43x25")}
						className={`kraft-pill-btn ${previewLabelSize === "43x25" ? "active" : ""}`}
						style={{ minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
					>
						43×25 мм
					</button>
				</div>
			</div>

			<div
				className="kraft-label-preview-wrapper"
				dangerouslySetInnerHTML={{
					__html: generateThermalStickerHtml(previewPackage, { size: previewLabelSize }),
				}}
			/>

			<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
				Векторный 2D DataMatrix и линейный Code128 штрихкод маркировки упаковки
			</div>
		</div>
	);
}
