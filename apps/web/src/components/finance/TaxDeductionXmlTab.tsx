import React from "react";
import { Check, Copy, Receipt } from "lucide-react";

export interface TaxDeductionXmlTabProps {
	selectedYear: number;
	yearPaymentsCount: number;
	fileName: string;
	xmlContent: string;
	isCopiedXml: boolean;
	onCopyXml: () => void;
	onClose: () => void;
}

export const TaxDeductionXmlTab: React.FC<TaxDeductionXmlTabProps> = ({
	selectedYear,
	yearPaymentsCount,
	fileName,
	xmlContent,
	isCopiedXml,
	onCopyXml,
	onClose,
}) => {
	if (yearPaymentsCount === 0) {
		return (
			<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
				<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
					<Receipt className="w-6 h-6" />
				</div>
				<div className="space-y-1.5 max-w-md mx-auto">
					<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
						Нет данных за {selectedYear} год для генерации реестра XML (КНД 1184043)
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
						Электронный реестр для ФНС формируется на основании фискальных чеков за выбранный налоговый период.
					</p>
				</div>
				<div className="flex items-center justify-center gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
					>
						Закрыть
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
						Электронный XML-реестр сведений (КНД 1184043, Формат 5.01)
					</span>
					<span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
						Имя файла: {fileName}
					</span>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={onCopyXml}
						className="min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 cursor-pointer"
					>
						{isCopiedXml ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
						<span>{isCopiedXml ? "Скопировано" : "Копировать XML"}</span>
					</button>
				</div>
			</div>

			<div className="relative">
				<pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[340px] border border-slate-800">
					{xmlContent}
				</pre>
			</div>
		</div>
	);
};
