import React from "react";
import { CheckCircle2, Clock, Flame, Sparkles, Zap } from "lucide-react";
import type { SterilizationRegimeId } from "../autoclaveLogPresets.js";

export interface NewCycleExpressModesProps {
	readonly selectedRegimeId: SterilizationRegimeId;
	readonly actualTime: number;
	readonly onStandardCycle: () => void;
	readonly onDelicateCycle: () => void;
	readonly onFastCycle: () => void;
}

export const NewCycleExpressModes: React.FC<NewCycleExpressModesProps> = ({
	selectedRegimeId, actualTime, onStandardCycle, onDelicateCycle, onFastCycle,
}) => (
	<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 1.25rem", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "14px" }}>
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
			<span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
				<Zap size={16} color="var(--teal, #0d9488)" /> Быстрые режимы стерилизации
			</span>
			<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Автозаполнение параметров и индикаторов за одно нажатие</span>
		</div>
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.625rem" }}>
			<button
				type="button" data-testid="express-standard-cycle-btn" onClick={onStandardCycle} className="autoclave-btn"
				style={{
					minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
					padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 700,
					background: selectedRegimeId === "steam_134_5min" && actualTime === 5 ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "var(--paper, #ffffff)",
					color: selectedRegimeId === "steam_134_5min" && actualTime === 5 ? "#ffffff" : "var(--ink, #0f172a)",
					border: selectedRegimeId === "steam_134_5min" && actualTime === 5 ? "1px solid #0f766e" : "1px solid var(--line, #e2e8f0)",
				}}
				title="Экспресс-заполнение: Стандартный цикл (134°C / 5 мин / 14 упаковок)"
				aria-label="Экспресс-заполнение: Стандартный цикл (134°C / 5 мин / 14 упаковок)"
			>
				<Flame size={16} color={selectedRegimeId === "steam_134_5min" && actualTime === 5 ? "#ffffff" : "var(--teal, #0d9488)"} />
				<span>Экспресс-заполнение: Стандартный цикл (134°C / 5 мин / 14 упаковок)</span>
			</button>
			<button
				type="button" onClick={onDelicateCycle} className="autoclave-btn"
				style={{
					minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
					padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
					background: selectedRegimeId === "steam_121_20min" ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "var(--paper, #ffffff)",
					color: selectedRegimeId === "steam_121_20min" ? "#ffffff" : "var(--ink, #0f172a)",
					border: selectedRegimeId === "steam_121_20min" ? "1px solid #0f766e" : "1px solid var(--line, #e2e8f0)",
				}}
			>
				<Clock size={16} color={selectedRegimeId === "steam_121_20min" ? "#ffffff" : "var(--teal, #0d9488)"} />
				<span>121°C / 1.15 бар / 20 мин (Резина/пластик)</span>
			</button>
			<button
				type="button" onClick={onFastCycle} className="autoclave-btn"
				style={{
					minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
					padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
					background: selectedRegimeId === "steam_134_quick" ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "var(--paper, #ffffff)",
					color: selectedRegimeId === "steam_134_quick" ? "#ffffff" : "var(--ink, #0f172a)",
					border: selectedRegimeId === "steam_134_quick" ? "1px solid #0f766e" : "1px solid var(--line, #e2e8f0)",
				}}
			>
				<Sparkles size={16} color={selectedRegimeId === "steam_134_quick" ? "#ffffff" : "var(--teal, #0d9488)"} />
				<span>134°C / 2.1 бар / 3.5 мин (Наконечники)</span>
			</button>
		</div>
	</div>
);
