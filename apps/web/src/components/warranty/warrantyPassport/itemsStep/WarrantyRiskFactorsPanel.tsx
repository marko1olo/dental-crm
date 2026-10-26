import type React from "react";
import { formatShortDate, type WarrantyCalculationResult, type WarrantyRiskFactors } from "../../warrantyEngine.js";

export interface WarrantyRiskFactorsPanelProps {
	riskFactors: WarrantyRiskFactors;
	onRiskFactorsChange: React.Dispatch<React.SetStateAction<WarrantyRiskFactors>>;
	calculation: WarrantyCalculationResult;
}

export const WarrantyRiskFactorsPanel: React.FC<WarrantyRiskFactorsPanelProps> = ({
	riskFactors,
	onRiskFactorsChange,
	calculation,
}) => {
	const riskBadgeText = calculation.riskLevel === "low" ? "Низкий риск"
		: calculation.riskLevel === "moderate" ? "Умеренный"
		: calculation.riskLevel === "high" ? "Высокий риск" : "Критический";

	return (
		<div className="warranty-risk-panel">
			<div className="warranty-risk-header">
				<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Калькулятор рисков (OHI-S & Соматика)</h4>
				<span className={`warranty-risk-score-badge ${calculation.riskLevel}`}>{riskBadgeText}</span>
			</div>

			{/* OHI-S Индекс */}
			<div className="warranty-slider-wrap">
				<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
					<span className="warranty-label">Индекс гигиены OHI-S (Green-Vermillion):</span>
					<strong style={{ color: "var(--teal)" }}>{riskFactors.hygieneScore.toFixed(1)}</strong>
				</div>
				<input
					type="range" min="0.0" max="3.0" step="0.1" value={riskFactors.hygieneScore}
					onChange={(e) => onRiskFactorsChange((prev) => ({ ...prev, hygieneScore: parseFloat(e.target.value) }))}
					style={{ width: "100%", accentColor: "var(--teal)" }}
				/>
				<div className="warranty-slider-labels">
					<span>0.0 (Отл.)</span><span>1.2 (Норма)</span><span>1.8 (Удовл.)</span><span>3.0 (Плохо)</span>
				</div>
			</div>

			{/* Бруксизм & Каппа */}
			<div className="warranty-toggle-row">
				<span>Бруксизм / Гипертонус мышц</span>
				<button
					type="button" className={`warranty-toggle-switch ${riskFactors.bruxism ? "active" : ""}`}
					onClick={() => onRiskFactorsChange((prev) => ({ ...prev, bruxism: !prev.bruxism }))} aria-label="Бруксизм"
				/>
			</div>
			{riskFactors.bruxism && (
				<div className="warranty-toggle-row" style={{ paddingLeft: "16px", background: "var(--paper-soft)" }}>
					<span>Ношение защитной каппы</span>
					<button
						type="button" className={`warranty-toggle-switch ${riskFactors.nightGuardUsed ? "active" : ""}`}
						onClick={() => onRiskFactorsChange((prev) => ({ ...prev, nightGuardUsed: !prev.nightGuardUsed, nightGuardPrescribed: true }))}
						aria-label="Ночная каппа"
					/>
				</div>
			)}

			{/* Курение */}
			<div className="warranty-form-group">
				<label className="warranty-label">Статус курения табака</label>
				<select
					className="warranty-select" value={riskFactors.smoking}
					onChange={(e) => onRiskFactorsChange((prev) => ({ ...prev, smoking: e.target.value as "none" | "light" | "heavy" }))}
				>
					<option value="none">Не курит (0 сигарет)</option>
					<option value="light">Умеренно (до 10 сигарет/сутки)</option>
					<option value="heavy">Интенсивно (&gt; 10 сигарет/сутки)</option>
				</select>
			</div>

			{/* Диабет */}
			<div className="warranty-form-group">
				<label className="warranty-label">Сахарный диабет</label>
				<select
					className="warranty-select" value={riskFactors.diabetes}
					onChange={(e) => onRiskFactorsChange((prev) => ({ ...prev, diabetes: e.target.value as "none" | "compensated" | "decompensated" }))}
				>
					<option value="none">Отсутствует</option>
					<option value="compensated">Компенсированный (HbA1c &lt; 7.0%)</option>
					<option value="decompensated">Декомпенсированный (HbA1c &ge; 7.0%)</option>
				</select>
			</div>

			{/* Прикус & Пародонтит */}
			<div className="warranty-toggle-row">
				<span>Травматический прикус / окклюзия</span>
				<button
					type="button" className={`warranty-toggle-switch ${riskFactors.malocclusion ? "active" : ""}`}
					onClick={() => onRiskFactorsChange((prev) => ({ ...prev, malocclusion: !prev.malocclusion }))} aria-label="Малокклюзия"
				/>
			</div>
			<div className="warranty-form-group">
				<label className="warranty-label">Заболевания пародонта</label>
				<select
					className="warranty-select" value={riskFactors.periodontitis}
					onChange={(e) => onRiskFactorsChange((prev) => ({ ...prev, periodontitis: e.target.value as "none" | "mild" | "moderate" | "severe" }))}
				>
					<option value="none">Пародонт здоров (интактен)</option>
					<option value="mild">Пародонтит легкой степени</option>
					<option value="moderate">Пародонтит средней степени</option>
					<option value="severe">Генерализованный тяжелый пародонтит</option>
				</select>
			</div>

			{/* HUD итог */}
			<div className="warranty-hud-summary">
				<div className="warranty-hud-row"><span className="lbl">Базовая гарантия:</span><span className="val">{calculation.baseWarrantyMonths} мес.</span></div>
				<div className="warranty-hud-row"><span className="lbl">Коэффициент надежности:</span><span className="val">{Math.round(calculation.totalRiskMultiplier * 100)}%</span></div>
				<div className="warranty-hud-row"><span className="lbl">Адаптированная гарантия:</span><span className="val highlight">{calculation.adjustedWarrantyMonths} мес.</span></div>
				<div className="warranty-hud-row"><span className="lbl">Срок службы:</span><span className="val">{calculation.adjustedServiceLifeMonths} мес. ({(calculation.adjustedServiceLifeMonths / 12).toFixed(1)} лет)</span></div>
				<div className="warranty-hud-row"><span className="lbl">Следующий чекап:</span><span className="val" style={{ color: "var(--teal)" }}>{formatShortDate(calculation.nextCheckupDueDate)}</span></div>
			</div>
		</div>
	);
};
