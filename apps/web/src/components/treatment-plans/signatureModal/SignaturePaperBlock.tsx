import React from "react";
import { CheckCircle2, Printer, ShieldCheck } from "lucide-react";

export interface SignaturePaperBlockProps {
	readonly signatureBase64: string | null;
}

export const SignaturePaperBlock: React.FC<SignaturePaperBlockProps> = ({ signatureBase64 }) => {
	return (
		<div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--ink)]">
						<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Бумажное подписание сметы и плана</span>
					</div>
					<p className="text-xs text-[var(--muted)] leading-relaxed m-0">
						Распечатайте план на А4 для физической подписи пациентом или подтвердите утверждение на бумаге.
					</p>
				</div>

				<button
					type="button"
					onClick={() => window.print()}
					className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-[var(--border)] hover:bg-[var(--paper-strong)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
					data-testid="print-treatment-plan-btn"
				>
					<Printer size={14} />
					<span>Печать плана (А4)</span>
				</button>
			</div>

			{signatureBase64 && (
				<div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
					<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>План подтвержден на бумаге (штамп фиксации сформирован)</span>
				</div>
			)}
		</div>
	);
};
