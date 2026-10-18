import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import { Activity, Sparkles, Wallet } from "lucide-react";
import { DesktopKpiAuxiliaryStrip } from "./DesktopKpiAuxiliaryStrip";
import { DesktopRevenueCard } from "./DesktopRevenueCard";
import {
	computeChairEconomicsSummary,
	formatRublesClean,
} from "./executiveAnalyticsTypes";

export interface DesktopExecutiveKpiCardsProps {
	readonly kpis: ExecutiveKpisSummary;
	readonly onOpenPnl: () => void;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function DesktopExecutiveKpiCards({
	kpis,
	onOpenPnl,
	onNavigateToSection,
}: DesktopExecutiveKpiCardsProps) {
	const chairEcon = computeChairEconomicsSummary(kpis);
	const doctorIncomeDisplay = kpis.doctorNetIncomeRub && kpis.doctorNetIncomeRub > 0
		? formatRublesClean(kpis.doctorNetIncomeRub)
		: formatRublesClean(kpis.doctorPayrollFormatted || Math.round((kpis.totalRevenueRub ?? 0) * 0.28));

	return (
		<div className="space-y-3" role="region" aria-label="3 ключевые цифры соло-врача и аналитика клиники">
			<section className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="3 ключевые карточки KPI">
				<DesktopRevenueCard kpis={kpis} />

				{/* 2. Доход врача */}
				<div
					className="executive-kpi-card"
					style={{ "--card-accent": "var(--ok-fg, #10b981)", cursor: "pointer" } as React.CSSProperties}
					onClick={onOpenPnl}
					title="Нажмите для открытия подробного P&L калькулятора клиники"
					data-testid="kpi-card-net-profit"
				>
					<div>
						<div className="executive-kpi-header">
							<span className="executive-kpi-label" title="Чистый доход врача к выплате из кассы">
								2. Доход врача к выплате
							</span>
							<div className="executive-kpi-icon-wrap executive-kpi-icon-teal"><Wallet size={18} aria-hidden="true" /></div>
						</div>
						<div className="executive-kpi-main-val font-mono text-[28px] font-bold" style={{ color: "var(--ok-fg, #10b981)" }}>
							{doctorIncomeDisplay}
						</div>
					</div>
					<div className="executive-kpi-subtext">
						<span>ФОТ: 28% выручки</span>
						<span className="executive-pill executive-pill-success"><Sparkles size={11} aria-hidden="true" /> P&amp;L расчет</span>
					</div>
					<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
						<span>Чистая прибыль клиники:</span>
						<strong style={{ color: (kpis.netProfitKopecks ?? 0) >= 0 ? "var(--ink,#0f172a)" : "var(--err-fg,#ef4444)" }}>
							{formatRublesClean(kpis.netProfitFormatted)}
						</strong>
					</div>
				</div>

				{/* 3. Загрузка кресла */}
				<div
					className="executive-kpi-card"
					style={{
						"--card-accent": "var(--teal, #0d9488)",
						cursor: onNavigateToSection ? "pointer" : "default",
					} as React.CSSProperties}
					onClick={onNavigateToSection ? () => onNavigateToSection("freed_slots") : undefined}
					title={`Себестоимость кресло-часа: ${chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч`}
					data-testid="kpi-card-chair-occupancy"
				>
					<div>
						<div className="executive-kpi-header">
							<span className="executive-kpi-label" title="Коэффициент полезной загрузки кресел клиники">
								3. Загрузка кресла (%)
							</span>
							<div className="executive-kpi-icon-wrap executive-kpi-icon-teal"><Activity size={18} aria-hidden="true" /></div>
						</div>
						<div className="executive-kpi-main-val font-mono text-[28px] font-bold">
							{kpis.chairOccupancyRatePercent ?? 0}%
						</div>
					</div>
					<div className="executive-kpi-subtext">
						<span>Кресел: {kpis.totalChairsCount ?? 1} шт.</span>
						<span className={`executive-pill ${(kpis.cancellationRatePercent ?? 0) > 15 ? "executive-pill-warning" : "executive-pill-neutral"}`}>
							Отмены: {kpis.cancellationRatePercent ?? 0}%
						</span>
					</div>
					<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
						<span>Стоимость простоя:</span>
						<span style={{ color: "var(--err-fg, #ef4444)", fontWeight: 600 }}>
							{chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч
						</span>
					</div>
				</div>
			</section>

			<DesktopKpiAuxiliaryStrip kpis={kpis} onOpenPnl={onOpenPnl} />
		</div>
	);
}
