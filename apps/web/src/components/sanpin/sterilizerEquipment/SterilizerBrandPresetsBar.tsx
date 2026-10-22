import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type PopularSterilizerBrandPreset,
} from "@dental/shared";
import { Sparkles } from "lucide-react";
import React from "react";

export interface SterilizerBrandPresetsBarProps {
	readonly selectedPresetId: string | null;
	readonly onApplyPreset: (preset: PopularSterilizerBrandPreset) => void;
}

export function SterilizerBrandPresetsBar({
	selectedPresetId,
	onApplyPreset,
}: SterilizerBrandPresetsBarProps) {
	return (
		<div
			style={{
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "0.75rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.5rem",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<span
					style={{
						fontSize: "0.8rem",
						fontWeight: 700,
						color: "var(--ink, #0f172a)",
						display: "flex",
						alignItems: "center",
						gap: "0.35rem",
					}}
				>
					<Sparkles size={14} color="#0d9488" /> Выберите популярную марку или введите вручную:
				</span>
				<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>Типовой профиль EN 13060</span>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
				{POPULAR_STERILIZER_BRAND_PRESETS.map((p) => {
					const isSelected = selectedPresetId === p.id;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onApplyPreset(p)}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "34px",
								padding: "0.25rem 0.6rem",
								fontSize: "0.775rem",
								fontWeight: isSelected ? 700 : 500,
								background: isSelected ? "var(--teal-600, #0d9488)" : "var(--paper, #ffffff)",
								color: isSelected ? "#ffffff" : "var(--ink, #0f172a)",
								border: `1px solid ${isSelected ? "var(--teal-600, #0d9488)" : "var(--line, #cbd5e1)"}`,
								borderRadius: "6px",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.3rem",
							}}
							title={`${p.descriptionRu} (${p.manufacturerRu})`}
						>
							<span>{p.brandModel}</span>
							<span
								style={{
									fontSize: "0.675rem",
									opacity: 0.85,
									background: isSelected ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)",
									padding: "0.05rem 0.3rem",
									borderRadius: "3px",
								}}
							>
								{p.chamberVolumeLiters} л
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
