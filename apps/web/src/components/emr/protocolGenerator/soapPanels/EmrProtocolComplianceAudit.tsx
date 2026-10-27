import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { VisitDiaryEntry043, Statutory043ComplianceReport } from "../emrProtocolEngine";

export interface EmrProtocolComplianceAuditProps {
	readonly synthesizedDiary: VisitDiaryEntry043;
	readonly complianceReport: Statutory043ComplianceReport;
}

export const EmrProtocolComplianceAudit: React.FC<EmrProtocolComplianceAuditProps> = React.memo(
	function EmrProtocolComplianceAudit({ synthesizedDiary, complianceReport }) {
		return (
			<div className="space-y-3">
				<div className="p-4 rounded-xl bg-[var(--ok-bg,#f0fdf4)] border border-[var(--ok-fg,#059669)]/30 text-[var(--ok-fg,#059669)]">
					<div className="font-bold text-sm flex items-center gap-2">
						<CheckCircle2 className="w-5 h-5 text-[var(--ok-fg,#059669)]" />
						<span>Оценка клинического соответствия: {complianceReport.complianceScore} / 100 баллов</span>
					</div>
					<p className="text-xs mt-1 leading-relaxed">
						{complianceReport.statutorySummaryText}
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
						<div className="font-semibold text-[var(--ink,#0f172a)]">Клинический диагноз (МКБ-10)</div>
						<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center mt-0.5">
							<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
							<span>Валидный код ({synthesizedDiary.assessmentIcd10Code})</span>
						</div>
					</div>
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
						<div className="font-semibold text-[var(--ink,#0f172a)]">Зубная формула FDI</div>
						<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center mt-0.5">
							<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
							<span>Валидный номер ({synthesizedDiary.toothNumber})</span>
						</div>
					</div>
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
						<div className="font-semibold text-[var(--ink,#0f172a)]">Дозировка анестетика</div>
						<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center mt-0.5">
							<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
							<span>Безопасная терапевтическая доза</span>
						</div>
					</div>
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
						<div className="font-semibold text-[var(--ink,#0f172a)]">Подпись и реквизиты</div>
						<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center mt-0.5">
							<ShieldCheck size={13} className="inline mr-1 shrink-0" />
							<span>{synthesizedDiary.doctorFullName}</span>
						</div>
					</div>
				</div>
			</div>
		);
	},
);
