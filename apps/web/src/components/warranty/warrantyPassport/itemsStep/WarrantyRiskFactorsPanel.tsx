import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
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
	const [isExpanded, setIsExpanded] = useState(false);

	const riskBadgeText =
		calculation.riskLevel === "low"
			? "Низкий риск"
			: calculation.riskLevel === "moderate"
				? "Умеренный риск"
				: calculation.riskLevel === "high"
					? "Высокий риск"
					: "Критический риск";

	const hasNonStandardFactors =
		riskFactors.hygieneScore > 1.2 ||
		riskFactors.bruxism ||
		riskFactors.smoking !== "none" ||
		riskFactors.diabetes !== "none" ||
		riskFactors.malocclusion ||
		riskFactors.periodontitis !== "none";

	return (
		<div className="warranty-card-section warranty-risk-accordion-card">
			<div
				className="warranty-risk-accordion-header"
				onClick={() => setIsExpanded(!isExpanded)}
				role="button"
				tabIndex={0}
				aria-expanded={isExpanded}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsExpanded(!isExpanded);
					}
				}}
			>
				<div className="warranty-risk-header-left">
					<Activity size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="font-semibold text-sm text-[var(--ink)]">
						Клинические условия и факторы риска (OHI-S, соматика):
					</span>
					<span className={`warranty-risk-score-badge ${calculation.riskLevel}`}>
						{riskBadgeText} ({Math.round(calculation.totalRiskMultiplier * 100)}%)
					</span>
					{hasNonStandardFactors && (
						<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warn-bg,rgba(245,158,11,0.15))] text-[var(--warn-fg,#d97706)] font-medium">
							Особые условия
						</span>
					)}
				</div>

				<div className="warranty-risk-header-right">
					<span className="text-xs text-[var(--ink-muted)] hidden md:inline">
						Гарантия: {calculation.adjustedWarrantyMonths} мес. • Срок службы: {Math.round(calculation.adjustedServiceLifeMonths / 12)} лет
					</span>
					<button
						type="button"
						className="warranty-btn-secondary dente-btn-secondary"
						style={{ height: "28px", minHeight: "28px", padding: "0 10px", fontSize: "12px" }}
						onClick={(e) => {
							e.stopPropagation();
							setIsExpanded(!isExpanded);
						}}
					>
						{isExpanded ? "Свернуть" : "Настроить риски"}
						{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className="warranty-risk-expanded-body">
					<div className="warranty-risk-factors-grid">
						{/* 1. OHI-S Индекс гигиены */}
						<div className="warranty-slider-wrap">
							<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
								<span className="warranty-label">Индекс гигиены OHI-S (Green-Vermillion):</span>
								<strong style={{ color: "var(--teal)" }}>{riskFactors.hygieneScore.toFixed(1)}</strong>
							</div>
							<input
								type="range"
								min="0.0"
								max="3.0"
								step="0.1"
								value={riskFactors.hygieneScore}
								onChange={(e) =>
									onRiskFactorsChange((prev) => ({
										...prev,
										hygieneScore: Number.parseFloat(e.target.value),
									}))
								}
								style={{ width: "100%", accentColor: "var(--teal)" }}
							/>
							<div className="warranty-slider-labels">
								<span>0.0 (Отл.)</span>
								<span>1.2 (Норма)</span>
								<span>1.8 (Удовл.)</span>
								<span>3.0 (Плохо)</span>
							</div>
						</div>

						{/* 2. Бруксизм & Защитная каппа */}
						<div className="flex flex-col gap-2">
							<div className="warranty-toggle-row">
								<span>Бруксизм / Гипертонус</span>
								<button
									type="button"
									className={`warranty-toggle-switch ${riskFactors.bruxism ? "active" : ""}`}
									onClick={() => onRiskFactorsChange((prev) => ({ ...prev, bruxism: !prev.bruxism }))}
									aria-label="Бруксизм"
								/>
							</div>
							{riskFactors.bruxism && (
								<div className="warranty-toggle-row" style={{ paddingLeft: "14px", background: "var(--paper-soft)" }}>
									<span>Ношение защитной каппы</span>
									<button
										type="button"
										className={`warranty-toggle-switch ${riskFactors.nightGuardUsed ? "active" : ""}`}
										onClick={() =>
											onRiskFactorsChange((prev) => ({
												...prev,
												nightGuardUsed: !prev.nightGuardUsed,
												nightGuardPrescribed: true,
											}))
										}
										aria-label="Ночная каппа"
									/>
								</div>
							)}
							<div className="warranty-toggle-row">
								<span>Травматический прикус</span>
								<button
									type="button"
									className={`warranty-toggle-switch ${riskFactors.malocclusion ? "active" : ""}`}
									onClick={() => onRiskFactorsChange((prev) => ({ ...prev, malocclusion: !prev.malocclusion }))}
									aria-label="Малокклюзия"
								/>
							</div>
						</div>

						{/* 3. Курение, Диабет, Пародонтит */}
						<div className="flex flex-col gap-2">
							<div className="warranty-form-group">
								<label className="warranty-label">Статус курения табака</label>
								<select
									className="warranty-select"
									value={riskFactors.smoking}
									onChange={(e) =>
										onRiskFactorsChange((prev) => ({
											...prev,
											smoking: e.target.value as "none" | "light" | "heavy",
										}))
									}
								>
									<option value="none">Не курит (0 сигарет)</option>
									<option value="light">Умеренно (до 10 сиг./сутки)</option>
									<option value="heavy">Интенсивно (&gt; 10 сиг./сутки)</option>
								</select>
							</div>

							<div className="warranty-form-group">
								<label className="warranty-label">Сахарный диабет</label>
								<select
									className="warranty-select"
									value={riskFactors.diabetes}
									onChange={(e) =>
										onRiskFactorsChange((prev) => ({
											...prev,
											diabetes: e.target.value as "none" | "compensated" | "decompensated",
										}))
									}
								>
									<option value="none">Отсутствует</option>
									<option value="compensated">Компенсированный (HbA1c &lt; 7%)</option>
									<option value="decompensated">Декомпенсированный (HbA1c &ge; 7%)</option>
								</select>
							</div>

							<div className="warranty-form-group">
								<label className="warranty-label">Заболевания пародонта</label>
								<select
									className="warranty-select"
									value={riskFactors.periodontitis}
									onChange={(e) =>
										onRiskFactorsChange((prev) => ({
											...prev,
											periodontitis: e.target.value as "none" | "mild" | "moderate" | "severe",
										}))
									}
								>
									<option value="none">Пародонт здоров (интактен)</option>
									<option value="mild">Пародонтит легкой степени</option>
									<option value="moderate">Пародонтит средней степени</option>
									<option value="severe">Тяжелый генерализованный</option>
								</select>
							</div>
						</div>
					</div>

					{/* Итоговый расчет внизу раскрытого аккордеона */}
					<div className="warranty-hud-summary" style={{ marginTop: "10px" }}>
						<div className="warranty-hud-row">
							<span className="lbl">Базовая гарантия:</span>
							<span className="val">{calculation.baseWarrantyMonths} мес.</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Коэффициент надежности:</span>
							<span className="val">{Math.round(calculation.totalRiskMultiplier * 100)}%</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Адаптированная гарантия:</span>
							<span className="val highlight">{calculation.adjustedWarrantyMonths} мес.</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Срок службы:</span>
							<span className="val">
								{calculation.adjustedServiceLifeMonths} мес. ({(calculation.adjustedServiceLifeMonths / 12).toFixed(1)} лет)
							</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Следующий чекап:</span>
							<span className="val" style={{ color: "var(--teal)" }}>
								{formatShortDate(calculation.nextCheckupDueDate)}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
