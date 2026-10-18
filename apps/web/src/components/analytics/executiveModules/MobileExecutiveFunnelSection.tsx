import React from "react";
import { Sparkles } from "lucide-react";

export interface MobileFunnelStageItem {
	num: number;
	title: string;
	count: number;
	conversion: number;
	isAi: boolean;
	volume?: string;
}

interface MobileExecutiveFunnelSectionProps {
	readonly funnelStages: MobileFunnelStageItem[];
}

export const MobileExecutiveFunnelSection: React.FC<MobileExecutiveFunnelSectionProps> = ({
	funnelStages,
}) => {
	return (
		<section className="mobile-exec-section" aria-label="Сквозная воронка первичных пациентов">
			<div className="mobile-exec-section-header">
				<span className="mobile-exec-section-title">Сквозная воронка пациентов</span>
				<span className="mobile-exec-badge-funnel">{funnelStages.length} этапов</span>
			</div>

			<div className="mobile-exec-grouped-card">
				{funnelStages.length > 0 ? (
					funnelStages.map((st) => (
						<div key={st.num} className="mobile-exec-grouped-row">
							<div className="grouped-row-left">
								<div className="funnel-step-badge">{st.num}</div>
								<div className="grouped-row-meta">
									<div className="grouped-row-name flex items-center gap-1.5">
										<span>{st.title}</span>
										{st.isAi && (
											<span className="funnel-ai-tag">
												<Sparkles size={11} aria-hidden="true" />
												Diagnocat
											</span>
										)}
									</div>
									{st.volume && (
										<div className="grouped-row-sub font-mono text-[var(--teal)]">
											Объем: {st.volume}
										</div>
									)}
								</div>
							</div>

							<div className="grouped-row-right">
								<div className="grouped-row-amount font-mono">{st.count} пац.</div>
								<div className="grouped-row-status">Конверсия {st.conversion}%</div>
							</div>
						</div>
					))
				) : (
					<div style={{ padding: "1.25rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						Воронка формируется на основе лидов и консультаций
					</div>
				)}
			</div>
		</section>
	);
};
