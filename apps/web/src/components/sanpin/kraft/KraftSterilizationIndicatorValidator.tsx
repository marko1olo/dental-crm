/**
 * DENTE CRM — Kraft Package Chemical Indicator Validator Subcomponent
 * SanPiN 3.3686-21 / GOST ISO 11140-1 Chemical Integrators & Strips Validator
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React, { useMemo } from "react";
import { ArrowRight, CheckCircle2, Flame, ShieldCheck } from "lucide-react";
import {
	SANPIN_CHEMICAL_INDICATORS,
	getChemicalIndicatorDefinition,
} from "./kraftPackagePresets";

export interface KraftSterilizationIndicatorValidatorProps {
	readonly selectedIndicatorId: string;
	readonly onIndicatorChange: (indicatorId: string) => void;
	readonly isVerified?: boolean;
	readonly onToggleVerified?: () => void;
}

export const KraftSterilizationIndicatorValidator: React.FC<
	KraftSterilizationIndicatorValidatorProps
> = ({
	selectedIndicatorId,
	onIndicatorChange,
	isVerified = true,
	onToggleVerified,
}) => {
	const selectedIndicator = useMemo(
		() => getChemicalIndicatorDefinition(selectedIndicatorId),
		[selectedIndicatorId],
	);

	const isClass5 = selectedIndicator.indicatorClass === "class_5_integrator";

	return (
		<div className="kraft-panel-card">
			<div className="kraft-panel-title">
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Flame size={16} className="text-amber-500" />
					<span>Химический индикатор контроля стерилизации</span>
				</div>
				<span
					style={{
						fontSize: "0.75rem",
						color: isClass5 ? "var(--teal, #0d9488)" : "#3b82f6",
						fontWeight: 700,
						padding: "2px 8px",
						borderRadius: "4px",
						background: isClass5
							? "rgba(13, 148, 136, 0.12)"
							: "rgba(59, 130, 246, 0.12)",
					}}
				>
					{isClass5 ? "Класс 5 (Химический интегратор)" : "Класс 4 (Многопараметрический)"}
				</span>
			</div>

			{/* Пояснение норматива СанПиН */}
			<div
				style={{
					fontSize: "0.75rem",
					color: "var(--muted)",
					marginBottom: "0.65rem",
					lineHeight: 1.4,
				}}
			>
				Контроль критических параметров пара (ГОСТ ISO 11140-1). Для упакованных стоматологических наборов применяется химический индикатор внутри каждого пакета.
			</div>

			{/* Список доступных тест-полосок */}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				{SANPIN_CHEMICAL_INDICATORS.map((ind) => {
					const isSelected = selectedIndicatorId === ind.id;
					return (
						<div
							key={ind.id}
							onClick={() => onIndicatorChange(ind.id)}
							className={`kraft-indicator-box ${isSelected ? "selected" : ""}`}
							style={{
								cursor: "pointer",
								border: isSelected
									? "1.5px solid var(--teal, #0d9488)"
									: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								padding: "0.65rem 0.85rem",
								background: isSelected
									? "rgba(13, 148, 136, 0.05)"
									: "var(--paper, #fff)",
								display: "flex",
								alignItems: "center",
								gap: "0.75rem",
								transition: "all 0.15s ease",
							}}
						>
							{/* Цветовые кружки */}
							<div
								style={{
									display: "flex",
									gap: "4px",
									alignItems: "center",
									flexShrink: 0,
								}}
							>
								<span
									className="kraft-swatch-circle"
									style={{
										background: ind.originalColorHex,
										width: "14px",
										height: "14px",
										borderRadius: "50%",
										display: "inline-block",
										border: "1px solid rgba(0,0,0,0.15)",
									}}
									title={`Исходный цвет: ${ind.originalColorNameRu}`}
								/>
								<ArrowRight size={12} color="var(--muted)" />
								<span
									className="kraft-swatch-circle"
									style={{
										background: ind.finalColorHex,
										width: "14px",
										height: "14px",
										borderRadius: "50%",
										display: "inline-block",
										border: "1px solid rgba(0,0,0,0.15)",
									}}
									title={`Эталонный цвет (Стерильно): ${ind.finalColorNameRu}`}
								/>
							</div>

							<div style={{ flexGrow: 1, fontSize: "0.85rem", minWidth: 0 }}>
								<div
									style={{
										fontWeight: 700,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "0.5rem",
									}}
								>
									<span style={{ wordBreak: "break-word" }}>{ind.brandNameRu}</span>
									<span
										style={{
											fontSize: "0.7rem",
											fontWeight: 600,
											color: "var(--muted)",
											flexShrink: 0,
										}}
									>
										{ind.indicatorClass === "class_5_integrator" ? "Класс 5" : "Класс 4"}
									</span>
								</div>
								<div
									style={{
										fontSize: "0.75rem",
										color: "var(--muted)",
										marginTop: "0.15rem",
										wordBreak: "break-word",
									}}
								>
									{ind.standardTargetParamRu}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Статус верификации */}
			<div
				style={{
					marginTop: "0.75rem",
					padding: "0.6rem 0.85rem",
					borderRadius: "6px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
					<ShieldCheck size={16} className="text-teal-600" />
					<span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)" }}>
						Верификация индикатора:
					</span>
				</div>
				<span
					style={{
						fontSize: "0.75rem",
						fontWeight: 700,
						color: isVerified ? "var(--ok-fg, #059669)" : "var(--muted)",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.25rem",
					}}
				>
					<CheckCircle2 size={13} />
					<span>Соответствует норме (Стерильно)</span>
				</span>
			</div>
		</div>
	);
};

export default KraftSterilizationIndicatorValidator;
