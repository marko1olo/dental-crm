/**
 * apps/web/src/components/analytics/ExecutiveFunnelMetrics.tsx
 *
 * Интерактивная 8-этапная сквозная воронка первичных пациентов клиники (Фича #29).
 *
 * 1. Первичный лид
 * 2. Запись на консультацию
 * 3. Явка на первичный приём
 * 4. Осмотр + ИИ-диагностика Diagnocat
 * 5. Презентация комплексного плана
 * 6. Согласование плана
 * 7. Оплата и старт лечения
 * 8. Полная санация полости рта
 */

import React, { useState } from "react";
import type { ExecutiveFunnelStageItem, ExecutiveFunnelStage } from "@dental/shared";
import { Sparkles, TrendingDown, Users, ChevronRight, CheckCircle2 } from "lucide-react";

export interface ExecutiveFunnelMetricsProps {
	readonly stages: readonly ExecutiveFunnelStageItem[];
	readonly onStageClick?: (stage: ExecutiveFunnelStage) => void;
}

export const ExecutiveFunnelMetrics: React.FC<ExecutiveFunnelMetricsProps> = ({
	stages,
	onStageClick,
}) => {
	const [selectedStage, setSelectedStage] = useState<ExecutiveFunnelStage | null>(null);

	const handleStageClick = (stage: ExecutiveFunnelStage) => {
		setSelectedStage((prev) => (prev === stage ? null : stage));
		if (onStageClick) {
			onStageClick(stage);
		}
	};

	const firstStageCount = stages.length > 0 ? (stages[0]?.count ?? 1) : 1;
	const maxCount = Math.max(...stages.map((s) => s.count), 1);

	return (
		<div className="executive-funnel-list" role="region" aria-label="Сквозная воронка первичных пациентов">
			{stages.map((st, idx) => {
				const isSelected = selectedStage === st.stage;
				// Нормализованная ширина прогресс-бара от максимума
				const barWidthPercent = Math.max(8, Math.min(100, Math.round((st.count / maxCount) * 100)));

				return (
					<div
						key={st.stage}
						className={`executive-funnel-step-card ${isSelected ? "active-step" : ""}`}
						onClick={() => handleStageClick(st.stage)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handleStageClick(st.stage);
							}
						}}
						tabIndex={0}
						role="button"
						aria-pressed={isSelected}
						aria-label={`${st.stepNumber}. ${st.title}: ${st.count} пациентов, конверсия ${st.conversionFromPreviousPercent}%`}
					>
						<div className="funnel-step-top">
							<div className="funnel-step-info">
								<span className="funnel-step-num">{st.stepNumber}</span>
								<span className="funnel-step-title">{st.title}</span>
								{st.isAiAssisted && (
									<span className="funnel-ai-badge" title="Автоматический скрининг КЛКТ и прикусных снимков в Diagnocat AI">
										<Sparkles size={13} aria-hidden="true" />
										Diagnocat AI
									</span>
								)}
							</div>
							<div className="funnel-step-count">
								{st.count.toLocaleString("ru-RU")}
								<span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--muted, #64748b)", marginLeft: "0.25rem" }}>
									пац.
								</span>
							</div>
						</div>

						{/* Графический индикатор ширины этапа */}
						<div className="funnel-step-progress-track" aria-hidden="true">
							<div
								className="funnel-step-progress-fill"
								style={{
									width: `${barWidthPercent}%`,
									background: idx === 0 ? "var(--teal, #0d9488)" : idx === stages.length - 1 ? "var(--ok-fg, #10b981)" : undefined,
								}}
							/>
						</div>

						{/* Метрики конверсии и отвалов */}
						<div className="funnel-step-metrics">
							<div>
								{idx === 0 ? (
									<span>Базовый пул: <strong>100%</strong></span>
								) : (
									<span>
										Конверсия этапа: <strong>{st.conversionFromPreviousPercent}%</strong>
										<span style={{ color: "var(--muted, #64748b)", marginLeft: "0.5rem" }}>
											(сквозная: {st.conversionFromLeadPercent}%)
										</span>
									</span>
								)}
							</div>

							{idx > 0 && st.dropOffCount > 0 && (
								<div className="funnel-step-dropoff" title={`Потери на данном этапе: ${st.dropOffCount} пациентов`}>
									<TrendingDown size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} aria-hidden="true" />
									Отвал: -{st.dropOffCount} ({st.dropOffPercent}%)
								</div>
							)}

							{st.totalVolumeKopecks > 0 && (
								<div className="funnel-step-cost" title="Финансовый объем этапа">
									Объем: <strong>{st.totalVolumeFormatted}</strong>
								</div>
							)}
						</div>

						{/* Развернутая карточка при клике */}
						{isSelected && (
							<div
								style={{
									marginTop: "0.75rem",
									paddingTop: "0.75rem",
									borderTop: "1px dashed var(--line, #e2e8f0)",
									fontSize: "0.8125rem",
									color: "var(--ink, #334155)",
									display: "flex",
									flexDirection: "column",
									gap: "0.375rem",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<span>Стоимость единицы этапа (Unit Cost):</span>
									<strong>{st.unitCostFormatted}</strong>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<span>Доля от исходных обращений:</span>
									<strong>{st.conversionFromLeadPercent}%</strong>
								</div>
								{st.isAiAssisted && (
									<div style={{ color: "var(--accent, #6366f1)", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }}>
										<CheckCircle2 size={14} />
										Интегрировано с модулем ИИ-рентгенологии Diagnocat PACS
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
