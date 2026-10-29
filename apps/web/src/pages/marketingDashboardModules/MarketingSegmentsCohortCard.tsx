/**
 * MarketingSegmentsCohortCard.tsx
 *
 * Секция 4 дашборда: Сегментированная пациентская база и запуск сценариев.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React from "react";
import { ChevronRight, Users } from "lucide-react";
import { showToast } from "../../components/GlobalToast";
import { DEFAULT_PATIENT_SEGMENTS } from "../../components/marketing/marketingPresets";

export interface MarketingSegmentsCohortCardProps {
	readonly onOpenLeakDetector?: (() => void) | undefined;
	readonly onNavigateToRecalls?: (() => void) | undefined;
}

export function MarketingSegmentsCohortCard({
	onOpenLeakDetector,
	onNavigateToRecalls,
}: MarketingSegmentsCohortCardProps) {
	return (
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
					Возвращаемость (210д) →
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
	);
}
