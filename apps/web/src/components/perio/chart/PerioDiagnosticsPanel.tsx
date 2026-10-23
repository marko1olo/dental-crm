/**
 * apps/web/src/components/perio/chart/PerioDiagnosticsPanel.tsx
 *
 * Фасад диагностической панели (PSR, O'Leary PCR, динамика визитов) (Мандат 8b, <= 120 строк).
 */

import type { OlearyPcrSummary, PerioDynamicsSummary, PsrSextantResult } from "@dental/shared";
import React from "react";
import { PerioDiagnosticsDynamicsCard } from "./PerioDiagnosticsDynamicsCard";
import { PerioDiagnosticsOlearyCard } from "./PerioDiagnosticsOlearyCard";
import { PerioDiagnosticsPsrCard } from "./PerioDiagnosticsPsrCard";

export interface PerioDiagnosticsPanelProps {
	readonly isDiagnosticsExpanded: boolean;
	readonly onCloseDiagnostics: () => void;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly olearyPcr: OlearyPcrSummary;
	readonly dynamics: PerioDynamicsSummary;
}

export const PerioDiagnosticsPanel: React.FC<PerioDiagnosticsPanelProps> = React.memo(({
	isDiagnosticsExpanded,
	onCloseDiagnostics,
	psrSummaryText,
	psrSextants,
	olearyPcr,
	dynamics,
}) => {
	if (!isDiagnosticsExpanded) return null;

	return (
		<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)]">
					Диагностические индексы и динамика пародонта
				</h4>
				<button
					type="button"
					onClick={onCloseDiagnostics}
					className="secondary-button text-xs !min-h-[28px] !h-7 !px-2.5"
				>
					Свернуть
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<PerioDiagnosticsPsrCard psrSummaryText={psrSummaryText} psrSextants={psrSextants} />
				<PerioDiagnosticsOlearyCard olearyPcr={olearyPcr} />
				<PerioDiagnosticsDynamicsCard dynamics={dynamics} />
			</div>
		</div>
	);
});

PerioDiagnosticsPanel.displayName = "PerioDiagnosticsPanel";
