/**
 * ClinicalXrayProtocolPanel.tsx — Протокол рентгенодиагностики (Мандаты 8e, 8n)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Check, CheckCircle, FileText, Loader2, Printer } from "lucide-react";
import type { ToothUpdate, ClinicalXrayProtocolPanelProps } from "./xrayProtocol/types.js";
import { useClinicalXrayApply } from "./xrayProtocol/useClinicalXrayApply.js";

export type { ToothUpdate, ClinicalXrayProtocolPanelProps };

export function ClinicalXrayProtocolPanel({
	summary,
	toothUpdates,
	onPrint,
	studyTitle,
	patientId,
	onApplyToChart,
	onInsertToDiary,
}: ClinicalXrayProtocolPanelProps) {
	const updates = toothUpdates ?? [];
	const criticalCount = updates.filter((u) => {
		const s = (u?.state ?? "").toLowerCase();
		return s.includes("caries") || s.includes("pulpitis") || s.includes("periodont");
	}).length;

	const { isApplying, isApplied, handleApplyFindings } = useClinicalXrayApply({
		updates, summary, patientId, onApplyToChart, onInsertToDiary,
	});

	return (
		<div className="sa-panel clinical-xray-panel">
			<div className="sa-panel-header">
				<div className="sa-panel-title flex items-center gap-2">
					<FileText size={15} className="text-teal-500" />
					<span className="font-semibold text-sm text-[var(--ink)]">Протокол рентгенодиагностики</span>
					{criticalCount > 0 && <span className="sa-badge-critical">{criticalCount} очаг(а)</span>}
				</div>
				<div className="sa-panel-actions min-w-0 flex items-center gap-2">
					{studyTitle && (
						<span className="sa-study-label truncate min-w-0 text-xs text-[var(--muted)]" title={studyTitle}>
							{studyTitle}
						</span>
					)}
					{onPrint && (
						<button className="sa-icon-btn shrink-0" onClick={onPrint} title="Распечатать протокол рентгенодиагностики" type="button">
							<Printer size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="sa-panel-body">
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2.5">
					<div className="min-w-0 flex-1">
						<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<FileText size={13} className="text-[var(--primary)] shrink-0" />
							<span>Перенос данных в карту</span>
						</div>
						<div className="text-[11px] text-[var(--muted)] truncate">В зубную формулу и дневник приёма медицинской карты</div>
					</div>
					<button
						type="button"
						className={`h-8 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
							isApplied
								? "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/30 cursor-default"
								: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-2xs"
						}`}
						disabled={isApplying || isApplied}
						onClick={handleApplyFindings}
					>
						{isApplying ? (
							<><Loader2 size={12} className="animate-spin" /><span>Перенос...</span></>
						) : isApplied ? (
							<><Check size={12} /><span>Перенесено</span></>
						) : (
							<><CheckCircle size={12} /><span>В карту</span></>
						)}
					</button>
				</div>

				<div className="sa-summary-section mt-2 text-xs leading-relaxed text-[var(--ink)]">{summary}</div>

				{updates.length > 0 && (
					<div className="sa-findings-list mt-3 flex flex-col gap-1.5">
						<span className="text-[11px] font-semibold text-[var(--ink-muted)]">
							Детализация по зубам ({updates.length})
						</span>
						<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
							{updates.map((u, i) => (
								<div key={`${u.code}-${i}`} className="px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs">
									<span className="font-mono font-bold text-[var(--primary)]">Зуб #{u.code}</span>
									<span className="text-[var(--ink)] text-right truncate max-w-[200px]" title={u.diagnosisOrFinding}>
										{u.diagnosisOrFinding}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default ClinicalXrayProtocolPanel;
