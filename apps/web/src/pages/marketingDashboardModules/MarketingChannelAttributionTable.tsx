/**
 * MarketingChannelAttributionTable.tsx
 *
 * Layer 4: Секция 1 левой колонки дашборда:
 * Каналы привлечения пациентов с распределением лидов, визитов, расходов и CAC.
 */

import React from "react";
import { Globe } from "lucide-react";
import type { MarketingChannelAttributionTableProps } from "./marketingDashboardTypes";

export function MarketingChannelAttributionTable({
	channels,
}: MarketingChannelAttributionTableProps) {
	const maxLeads = Math.max(...channels.map((c) => c.leadsCount), 1);

	return (
		<div className="marketing-section-card" data-testid="marketing-channels-section">
			<div className="marketing-section-card-header">
				<h2 className="marketing-section-title">
					<Globe size={16} className="text-[var(--teal)]" />
					<span>Каналы привлечения пациентов</span>
				</h2>
				<span className="marketing-section-badge">
					{channels.length} активных источников
				</span>
			</div>

			<div className="marketing-channels-list">
				{channels.map((ch) => {
					const barPercent = Math.round((ch.leadsCount / maxLeads) * 100);

					return (
						<div
							key={ch.channelKey}
							className="marketing-channel-row"
							data-testid={`channel-row-${ch.channelKey}`}
						>
							<div className="marketing-channel-left">
								<span
									className="marketing-channel-bullet"
									style={{ background: ch.color || "var(--teal)" }}
								/>
								<div style={{ minWidth: 0, flex: 1 }}>
									<div className="marketing-channel-name" title={ch.channelLabel}>
										{ch.channelLabel}
									</div>
									<div className="marketing-channel-bar-wrap">
										<div
											className="marketing-channel-bar"
											style={{
												width: `${barPercent}%`,
												background: ch.color || "var(--teal)",
											}}
										/>
									</div>
								</div>
							</div>

							<div className="marketing-channel-stats">
								<div className="marketing-channel-metric">
									<span className="marketing-channel-metric-val">
										{ch.leadsCount} лид.
									</span>
									<span className="marketing-channel-metric-sub">
										{ch.showUpCount} виз. ({ch.showUpRatePercent}%)
									</span>
								</div>

								<div className="marketing-channel-metric" style={{ minWidth: 65 }}>
									<span className="marketing-channel-metric-val">
										{ch.spendRub > 0 ? `${ch.spendRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
									</span>
									<span className="marketing-channel-metric-sub">
										{ch.cacRub > 0 ? `CAC ${ch.cacRub.toLocaleString("ru-RU")} ₽` : "CPL 0 ₽"}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
