import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type PopularSterilizerBrandPreset,
} from "@dental/shared";
import { Flame, Plus, Sparkles } from "lucide-react";
import React from "react";

export interface SterilizerFleetOnboardingProps {
	readonly onQuickAddPreset: (preset: PopularSterilizerBrandPreset) => void;
	readonly onAddNew: () => void;
}

export function SterilizerFleetOnboarding({
	onQuickAddPreset,
	onAddNew,
}: SterilizerFleetOnboardingProps) {
	return (
		<div
			className="sanpin-onboarding-card"
			style={{
				padding: "2.5rem 1.5rem",
				borderRadius: "12px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1.5px dashed var(--line, #cbd5e1)",
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "1.25rem",
			}}
			data-testid="sterilizer-fleet-onboarding"
		>
			<div
				style={{
					width: "60px",
					height: "60px",
					borderRadius: "16px",
					background: "rgba(13, 148, 136, 0.12)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--teal-600, #0d9488)",
				}}
			>
				<Flame size={32} />
			</div>

			<div style={{ maxWidth: "560px" }}>
				<h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Парк стерилизаторов клиники не настроен
				</h3>
				<p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
					Для регистрации циклов по Форме № 257/у, автоматической генерации DataMatrix-этикеток крафт-пакетов и прохождения проверок Роспотребнадзора зарегистрируйте автоклавы и сухожары клиники.
				</p>
			</div>

			{/* Типовые профили оснащения */}
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
				<span style={{ fontSize: "0.775rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
					Быстрое добавление типового аппарата:
				</span>
				<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.4rem", maxWidth: "650px" }}>
					{POPULAR_STERILIZER_BRAND_PRESETS.slice(0, 6).map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => onQuickAddPreset(preset)}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.8rem",
								fontWeight: 600,
								background: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								border: "1px solid var(--line, #cbd5e1)",
								borderRadius: "6px",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
							}}
							title={`Добавить ${preset.brandModel} (${preset.chamberVolumeLiters} л)`}
						>
							<Sparkles size={13} color="var(--teal)" />
							<span>{preset.brandModel}</span>
							<span style={{ fontSize: "0.7rem", opacity: 0.75 }}>({preset.chamberVolumeLiters} л)</span>
						</button>
					))}
				</div>
			</div>

			<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
				<button
					type="button"
					onClick={onAddNew}
					className="sanpin-btn sanpin-btn-primary touch-manipulation"
					style={{
						minHeight: "42px",
						padding: "0.5rem 1.5rem",
						fontSize: "0.875rem",
						fontWeight: 700,
						background: "var(--teal)",
						color: "var(--on-teal, #ffffff)",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.4rem",
					}}
				>
					<Plus size={16} />
					<span>Добавить аппарат вручную</span>
				</button>
			</div>
		</div>
	);
}
