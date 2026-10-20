/**
 * MarketingRoiAndSegmentsPanel.tsx
 *
 * Layer 4: Правая колонка маркетингового дашборда:
 * Секция 3 (Окупаемость рекламы ROMI, CAC, CPL, лидер по ROMI)
 * Секция 4 (Сегментированная пациентская база и переход в триггерные сценарии/детектор оттока).
 */

import React from "react";
import { ChevronRight, Flame, TrendingUp, Users } from "lucide-react";
import { showToast } from "../../components/GlobalToast";
import { DEFAULT_PATIENT_SEGMENTS } from "../../components/marketing/marketingPresets";
import type { MarketingRoiAndSegmentsPanelProps } from "./marketingDashboardTypes";

export function MarketingRoiAndSegmentsPanel({
	summary,
	topChannel,
	onOpenLeakDetector,
	onNavigateToRecalls,
}: MarketingRoiAndSegmentsPanelProps) {
	return (
		<div className="marketing-col">
			{/* СЕКЦИЯ 3: ОКУПАЕМОСТЬ РЕКЛАМЫ (AD ROI / ROMI) */}
			<div className="marketing-section-card" data-testid="marketing-roi-section">
				<div className="marketing-section-card-header">
					<h2 className="marketing-section-title">
						<TrendingUp size={16} className="text-[var(--teal)]" />
						<span>Окупаемость рекламы (ROMI)</span>
					</h2>
					<span className="marketing-section-badge">Unit-экономика</span>
				</div>

				<div className="marketing-romi-hero">
					<div className="marketing-romi-main">
						<span className="marketing-romi-val">
							{summary.romiPercent > 0 ? `+${summary.romiPercent}%` : `${summary.romiPercent}%`}
						</span>
						<span className="marketing-romi-label">
							Итоговая рентабельность инвестиций в маркетинг
						</span>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
							{(summary.totalRevenueRub || 0).toLocaleString("ru-RU")} ₽
						</div>
						<div style={{ fontSize: 11, color: "var(--muted)" }}>
							Привлеченная выручка
						</div>
					</div>
				</div>

				<div className="marketing-romi-details">
					<div className="marketing-romi-detail-box">
						<span className="marketing-romi-detail-val">
							{summary.cacRub > 0 ? `${summary.cacRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
						</span>
						<span className="marketing-romi-detail-lbl">
							CAC (Стоимость привлечения пациента)
						</span>
					</div>

					<div className="marketing-romi-detail-box">
						<span className="marketing-romi-detail-val">
							{summary.cplRub > 0 ? `${summary.cplRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
						</span>
						<span className="marketing-romi-detail-lbl">
							CPL (Стоимость входящей заявки)
						</span>
					</div>
				</div>

				{topChannel && (
					<div className="marketing-best-channel-box">
						<Flame size={15} className="shrink-0" />
						<span className="truncate">
							Лидер по окупаемости: <strong>{topChannel.channelLabel}</strong> ({topChannel.romiPercent}% ROMI)
						</span>
					</div>
				)}
			</div>

			{/* СЕКЦИЯ 4: СЕГМЕНТИРОВАННАЯ ПАЦИЕНТСКАЯ БАЗА */}
			<div className="marketing-section-card" data-testid="marketing-segments-section">
				<div className="marketing-section-card-header">
					<h2 className="marketing-section-title">
						<Users size={16} className="text-[var(--teal)]" />
						<span>Сегментированная пациентская база</span>
					</h2>
					<button
						type="button"
						className="marketing-modal-link"
						onClick={onOpenLeakDetector}
						data-testid="open-leak-detector-btn"
					>
						Детектор оттока (210д) →
					</button>
				</div>

				<div className="marketing-cohorts-grid">
					{DEFAULT_PATIENT_SEGMENTS.map((seg) => (
						<div
							key={seg.id}
							className="marketing-cohort-card"
							data-testid={`segment-card-${seg.id}`}
						>
							<div className="marketing-cohort-top">
								<span className="marketing-cohort-name" title={seg.name}>
									{seg.name}
								</span>
								<span className="marketing-cohort-badge">
									{seg.count} пац.
								</span>
							</div>
							<p className="marketing-cohort-desc" title={seg.description}>
								{seg.description}
							</p>
							<button
								type="button"
								className="marketing-cohort-action"
								onClick={() => {
									if (onNavigateToRecalls) {
										onNavigateToRecalls();
									} else {
										showToast(`Сегмент «${seg.name}» выбран для триггерного сценария`, "info");
									}
								}}
							>
								<span>Запустить сценарий</span>
								<ChevronRight size={12} />
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
