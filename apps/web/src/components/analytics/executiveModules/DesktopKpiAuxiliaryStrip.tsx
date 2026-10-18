import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import { Sparkles } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface DesktopKpiAuxiliaryStripProps {
	readonly kpis: ExecutiveKpisSummary;
	readonly onOpenPnl: () => void;
}

export function DesktopKpiAuxiliaryStrip({
	kpis,
	onOpenPnl,
}: DesktopKpiAuxiliaryStripProps) {
	return (
		<div
			className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[12px] text-[var(--muted,#64748b)]"
			aria-label="Вспомогательные показатели эффективности"
		>
			<div className="flex items-center gap-4 flex-wrap">
				<span>
					Ср. чек: <strong className="text-[var(--ink,#0f172a)] font-mono">{formatRublesClean(kpis.averageCheckFormatted)}</strong>
				</span>
				<span>
					Первичные: <strong className="text-[var(--ink,#0f172a)] font-mono">{kpis.primaryPatientsCount ?? 0} пац.</strong>
				</span>
				<span>
					LTV: <strong className="text-[var(--ink,#0f172a)] font-mono">{formatRublesClean(kpis.patientLtvFormatted)}</strong>
				</span>
				<span>
					Конверсия в санацию: <strong className="text-[var(--ink,#0f172a)] font-mono">{kpis.leadToSanitationConversionPercent ?? 0}%</strong>
				</span>
			</div>
			<button
				type="button"
				className="secondary-button text-[12px] py-1 px-2.5 h-7"
				onClick={onOpenPnl}
				title="Открыть полный P&L отчет"
			>
				<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
				<span>P&amp;L отчет</span>
			</button>
		</div>
	);
}
