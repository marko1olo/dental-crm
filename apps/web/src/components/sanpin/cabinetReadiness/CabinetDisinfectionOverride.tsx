import { Sparkles } from "lucide-react";
import React from "react";

interface CabinetDisinfectionOverrideProps {
	disinfectionCompleted: boolean;
	setDisinfectionCompleted: (v: boolean) => void;
	disinfectantBrand: string;
	setDisinfectantBrand: (v: string) => void;
	exposureMinutes: number;
	setExposureMinutes: (v: number) => void;
	minExposureMinutes: number;
}

export function CabinetDisinfectionOverride(p: CabinetDisinfectionOverrideProps) {
	return (
		<div
			style={{
				background: "var(--paper-subtle, #f8fafc)",
				border: "1px solid var(--paper-border, #e2e8f0)",
				borderRadius: "0.75rem",
				padding: "1rem",
			}}
		>
			<h4
				style={{
					fontSize: "0.9rem",
					fontWeight: 700,
					marginBottom: "0.6rem",
					color: "var(--teal, #0d9488)",
					display: "flex",
					alignItems: "center",
					gap: "0.4rem",
				}}
			>
				<Sparkles size={16} /> Параметры дезинфекции поверхностей:
			</h4>

			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.6rem",
					fontSize: "0.85rem",
					marginBottom: "0.6rem",
					cursor: "pointer",
					minHeight: "40px",
				}}
			>
				<input
					type="checkbox"
					checked={p.disinfectionCompleted}
					onChange={(e) => p.setDisinfectionCompleted(e.target.checked)}
					style={{ width: "18px", height: "18px" }}
				/>
				<span>Санитарная дезинфекция поверхностей (СанПиН 3.3686-21)</span>
			</label>

			<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
				<div>
					<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.2rem" }}>
						Дезсредство:
					</label>
					<input
						type="text"
						value={p.disinfectantBrand}
						onChange={(e) => p.setDisinfectantBrand(e.target.value)}
						className="sanpin-input"
						style={{ minHeight: "40px", fontSize: "0.85rem" }}
					/>
				</div>
				<div>
					<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.2rem" }}>
						Экспозиция (мин):
					</label>
					<input
						type="number"
						min={1}
						max={30}
						value={p.exposureMinutes}
						onChange={(e) => p.setExposureMinutes(Number(e.target.value))}
						className="sanpin-input"
						style={{ minHeight: "40px", fontSize: "0.85rem" }}
					/>
				</div>
			</div>
			{p.exposureMinutes < p.minExposureMinutes && (
				<div style={{ color: "var(--bad-fg, #ef4444)", fontSize: "0.75rem", marginTop: "0.3rem", fontWeight: 600 }}>
					Внимание: по нормативу требуется экспозиция не менее {p.minExposureMinutes} мин!
				</div>
			)}
		</div>
	);
}
