import React from "react";
import { FileText, Printer, ShieldCheck, Sparkles, Zap } from "lucide-react";

interface OutpatientArchiveQuickToolbarProps {
	onPrintBlankContract: () => void;
	onPrintBlankConsent: () => void;
	onPrintBlankForm043: () => void;
	onOpenLatest: () => void;
}

export const OutpatientArchiveQuickToolbar: React.FC<OutpatientArchiveQuickToolbarProps> = ({
	onPrintBlankContract,
	onPrintBlankConsent,
	onPrintBlankForm043,
	onOpenLatest,
}) => (
	<div
		className="archive-quick-toolbar flex flex-wrap items-center justify-between gap-2.5 p-3 sm:px-4 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl mb-4"
	>
		<div className="flex items-center gap-2 flex-wrap">
			<span className="text-xs font-bold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5">
				<Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
				Печать чистых бланков («________»):
			</span>

			<button
				type="button"
				data-testid="archive-quick-blank-contract-btn"
				onClick={onPrintBlankContract}
				className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
				title="Распечатать чистый бланк договора на медицинские услуги со строками «________» для ручного заполнения"
			>
				<Printer size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Бланк договора</span>
			</button>

			<button
				type="button"
				data-testid="archive-quick-blank-consent-btn"
				onClick={onPrintBlankConsent}
				className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
				title="Распечатать чистый бланк информированного согласия со строками «________» для ручного заполнения"
			>
				<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Бланк согласия</span>
			</button>

			<button
				type="button"
				data-testid="archive-quick-blank-form043-btn"
				onClick={onPrintBlankForm043}
				className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
				title="Распечатать чистый бланк медицинской карты со строками «________» и зубной формулой FDI"
			>
				<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Бланк медкарты</span>
			</button>
		</div>

		<button
			type="button"
			data-testid="archive-quick-open-latest-btn"
			onClick={onOpenLatest}
			className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold text-teal-700 dark:text-teal-300 rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
			title="Открыть последний документ в архиве"
		>
			<Zap size={14} className="text-amber-500 shrink-0" />
			<span>Открыть последний</span>
		</button>
	</div>
);
