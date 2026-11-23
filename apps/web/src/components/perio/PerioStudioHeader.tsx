/**
 * apps/web/src/components/perio/PerioStudioHeader.tsx
 *
 * Шапка кабинета пародонтологии: статус PSR, индексы BOP/карманы, печать, сохранение и кнопка закрытия.
 * Mandate 8b: < 90 строк.
 */

import React from "react";
import type { PerioChartSummary } from "@dental/shared";
import { Activity, Check, Info, Printer, X } from "lucide-react";

export interface PerioStudioHeaderProps {
	readonly psrFormula: string;
	readonly patientName: string;
	readonly summary: PerioChartSummary;
	readonly syncStatus: "idle" | "saving" | "saved";
	readonly isModal: boolean;
	readonly onPrintProtocol: () => void;
	readonly onToggleIndices: () => void;
	readonly onSave: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const PerioStudioHeader: React.FC<PerioStudioHeaderProps> = React.memo(({
	psrFormula,
	patientName,
	summary,
	syncStatus,
	isModal,
	onPrintProtocol,
	onToggleIndices,
	onSave,
	onClose,
}) => {
	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-[var(--line)] perio-header-row">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
					<Activity className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<h2 className="text-sm font-bold text-[var(--ink)] leading-tight flex flex-wrap items-center gap-1.5">
						Студия пародонтологии и гигиены
						<span className="text-[11px] px-2 py-0.5 rounded font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 whitespace-nowrap shrink-0">
							{psrFormula}
						</span>
					</h2>
					<p className="text-xs text-[var(--muted)] truncate max-w-xs sm:max-w-sm">{patientName}</p>
				</div>
			</div>

			<div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0 perio-toolbar-actions">
				<div className="flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs whitespace-nowrap shrink-0 perio-indices-badge">
					<span className="w-2 h-2 rounded-full bg-[var(--success,#10b981)] shrink-0" />
					<span className="text-[var(--muted)] font-medium">BOP:</span>
					<span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span>
					<span className="text-[var(--line)]">|</span>
					<span className="text-[var(--muted)] font-medium">Карманы:</span>
					<span
						className={`font-bold ${
							summary.deepPocketsCount > 0 ? "text-[var(--danger,#e11d48)]" : "text-[var(--success,#10b981)]"
						}`}
					>
						{summary.deepPocketsCount}
					</span>
				</div>
				<button
					type="button"
					onClick={onPrintProtocol}
					data-testid="perio-print-protocol-btn"
					className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
					title="Печать карты"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span className="hidden sm:inline">Печать</span>
				</button>
				<button
					type="button"
					onClick={onToggleIndices}
					data-testid="perio-calc-indices-btn"
					className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
					title="Индексы"
				>
					<Info className="w-4 h-4 shrink-0" />
					<span className="hidden sm:inline">Индексы</span>
				</button>
				<div className="hidden sm:inline-flex shrink-0 perio-desktop-primary-cta">
					<button
						type="button"
						onClick={onSave}
						aria-busy={syncStatus === "saving"}
						data-testid="perio-save-draft-btn"
						title="Сохранить пародонтограмму"
						className="min-h-[36px] h-9 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer transition-all perio-primary-cta-btn"
					>
						<Check className="w-4 h-4 shrink-0" />
						{syncStatus === "saving" ? "Сохранение..." : "Сохранить пародонтограмму"}
						<span className="sr-only">Сохранить периодонтограмму</span>
					</button>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						data-testid="perio-modal-close-btn"
						className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] sm:h-9 sm:w-9 rounded-xl bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center shrink-0 cursor-pointer transition-colors ml-auto sm:ml-0 perio-close-btn"
						aria-label={isModal ? "Закрыть" : "Свернуть перио-карту"}
						title={isModal ? "Закрыть" : "Свернуть перио-карту"}
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
});

PerioStudioHeader.displayName = "PerioStudioHeader";
