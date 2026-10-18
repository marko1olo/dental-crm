import React, { useState } from "react";
import type { MarketingFunnelSummary } from "@dental/shared";
import { ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";

export interface MarketingRoiFunnelTabProps {
	readonly summary: MarketingFunnelSummary;
	readonly hasChannels: boolean;
}

export const MarketingRoiFunnelTab: React.FC<MarketingRoiFunnelTabProps> = ({ summary, hasChannels }) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	if (!hasChannels) {
		return (
			<div className="text-center py-12 text-[var(--muted,#94a3b8)] bg-[var(--paper-soft,#0f172a)] rounded-xl border border-[var(--line,rgba(204,251,241,0.15))] p-6 my-2" data-testid="funnel-empty-state">
				<TrendingUp className="w-10 h-10 mx-auto mb-3 text-[var(--muted,#94a3b8)] opacity-40" />
				<div className="text-sm font-bold text-[var(--ink,#f8fafc)]">Нет данных сквозной воронки за период</div>
				<div className="text-xs mt-1">Ожидание звонков из АТС или самозаписи пациентов через онлайн-виджет</div>
			</div>
		);
	}

	return (
		<div className="marketing-roi-funnel-container" data-testid="funnel-view">
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line,rgba(204,251,241,0.15))] flex-wrap gap-2">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-teal-400" />
						<span>Сквозная воронка привлечения пациентов (5 этапов)</span>
					</h3>
					<p className="text-xs text-[var(--muted,#94a3b8)]">
						Отслеживание потерь на каждом этапе от первичного клика до оплаты услуг
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="text-xs font-mono text-[var(--teal,#14b8a6)] bg-[var(--paper-soft,#0f172a)] px-3 py-1 rounded-xl border border-[var(--line,rgba(204,251,241,0.15))]">
						Итоговая конверсия: <b>{summary.conversionRates.overallConversionRate}%</b>
					</div>
					<button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="marketing-roi-toggle-btn" aria-expanded={isExpanded} data-testid="toggle-funnel-stages-btn">
						{isExpanded ? <><ChevronUp size={14} /><span>Скрыть</span></> : <><ChevronDown size={14} /><span>Детализация</span></>}
					</button>
				</div>
			</div>

			{!isExpanded ? (
				<div className="marketing-roi-funnel-compact-strip" data-testid="funnel-compact-summary">
					<div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,rgba(204,251,241,0.15))] flex-wrap gap-2">
						<div className="flex items-center gap-3 flex-wrap">
							<span className="text-[var(--ink,#f8fafc)] font-semibold">Краткая динамика:</span>
							<span className="text-[var(--muted,#94a3b8)]">
								Клики: <b className="text-[var(--ink,#f8fafc)]">{summary.funnelStages[0]?.count ?? 0}</b> → Звонки: <b className="text-sky-400">{summary.funnelStages[1]?.count ?? 0}</b> → Записи: <b className="text-teal-400">{summary.funnelStages[2]?.count ?? 0}</b> → Явки: <b className="text-indigo-400">{summary.funnelStages[3]?.count ?? 0}</b> → Оплачено: <b className="text-emerald-400">{summary.funnelStages[4]?.count ?? 0}</b>
							</span>
						</div>
						<button type="button" onClick={() => setIsExpanded(true)} className="text-[var(--teal,#14b8a6)] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 text-xs">
							<span>Развернуть 5 этапов</span>
							<ChevronDown size={13} />
						</button>
					</div>
				</div>
			) : (
				<div className="space-y-3" data-testid="funnel-stages-expanded">
					{summary.funnelStages.map((stageItem) => {
						const fillPercent = Math.max(8, Math.min(100, stageItem.conversionFromFirst));
						return (
							<div key={stageItem.stage} className="marketing-roi-funnel-card" data-testid={`funnel-stage-${stageItem.stage}`}>
								<div className="marketing-roi-funnel-header-row">
									<div className="marketing-roi-funnel-title"><span>{stageItem.stageLabelRu}</span></div>
									<div className="marketing-roi-funnel-metrics">
										<div className="text-right"><span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Количество:</span><span className="marketing-roi-funnel-count">{stageItem.count.toLocaleString("ru-RU")}</span></div>
										<div className="text-right"><span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Конверсия:</span><span className="text-xs font-bold font-mono text-emerald-400">{stageItem.conversionFromPrevious}%</span></div>
										<div className="text-right"><span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Себестоимость:</span><span className="text-xs font-bold font-mono text-[var(--ink,#f8fafc)]">{stageItem.unitCostFormatted}</span></div>
									</div>
								</div>
								<div className="marketing-roi-funnel-bar-bg"><div className="marketing-roi-funnel-bar-fill" style={{ width: `${fillPercent}%` }} /></div>
								<div className="marketing-roi-funnel-details">
									<span>Сквозная конверсия: <b>{stageItem.conversionFromFirst}%</b></span>
									{stageItem.dropOffCount > 0 ? (
										<span className="text-rose-400 font-semibold">Потери: -{stageItem.dropOffCount} ({stageItem.dropOffPercent}%)</span>
									) : (
										<span className="text-emerald-400 font-semibold">Финальный шаг: оплаченный результат</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
