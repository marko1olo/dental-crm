import { Sparkles } from "lucide-react";
import type React from "react";

export interface MedicalWasteQuickShiftBannerProps {
	readonly onQuickShiftWaste: () => void;
	readonly isSubmittingQuickShift: boolean;
}

export const MedicalWasteQuickShiftBanner: React.FC<MedicalWasteQuickShiftBannerProps> = ({
	onQuickShiftWaste,
	isSubmittingQuickShift,
}) => {
	return (
		<div
			style={{
				display: "flex", flexDirection: "column", gap: "0.6rem", padding: "1rem",
				borderRadius: "12px", background: "var(--teal-soft, #f0fdfa)",
				border: "2px solid var(--teal, #0d9488)", boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
						<Sparkles size={18} color="var(--teal, #0d9488)" />
						<span>Экспресс-учет отходов смены</span>
					</div>
					<div style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
						Автоматическое формирование двух регламентных записей: мягкие отходы (желтый пакет 2.5 кг) + острые отходы (контейнер игл 0.8 кг)
					</div>
				</div>

				<button
					type="button"
					onClick={onQuickShiftWaste}
					aria-busy={isSubmittingQuickShift}
					className="touch-manipulation"
					style={{
						minHeight: "44px", padding: "0.6rem 1.25rem", fontSize: "0.925rem", fontWeight: 800,
						borderRadius: "8px", background: "var(--teal, #0d9488)", color: "#ffffff", border: "none",
						cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem",
						boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)", whiteSpace: "nowrap",
					}}
					title="Сдать отходы смены (пакет 2.5 кг + контейнер игл 0.8 кг)"
					data-testid="waste-quick-shift-btn"
				>
					<Sparkles size={18} />
					<span>{isSubmittingQuickShift ? "Оформление смены..." : "Сдать отходы смены (пакет 2.5 кг + контейнер игл 0.8 кг)"}</span>
				</button>
			</div>
		</div>
	);
};
