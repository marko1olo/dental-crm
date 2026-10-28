import React, { useState, useRef, useEffect } from "react";
import { Printer, ShieldCheck, MoreHorizontal, FileText, RefreshCw, Copy, RotateCcw } from "lucide-react";
import { printBlankMedicalContract } from "../../../patients/blankContractPrint";

export interface PaidContractToolbarProps {
	patientFullName?: string | null | undefined;
	doctorFullName?: string | null | undefined;
	onFillStandard: () => void;
	onPrintFilled: () => void;
	onGenNumber: () => void;
	onCopyText: () => void;
	onReset: () => void;
}

const btnSecondaryClass = "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";
const btnPrimaryClass = "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs transition-colors cursor-pointer shrink-0";

export const PaidContractToolbar: React.FC<PaidContractToolbarProps> = React.memo(
	function PaidContractToolbar({
		patientFullName, doctorFullName, onFillStandard, onPrintFilled,
		onGenNumber, onCopyText, onReset,
	}) {
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
		const moreMenuRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const onOut = (e: MouseEvent) => {
				if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setIsMoreMenuOpen(false);
			};
			document.addEventListener("mousedown", onOut);
			return () => document.removeEventListener("mousedown", onOut);
		}, [isMoreMenuOpen]);

		return (
			<div className="flex flex-wrap items-center justify-between gap-2.5 min-h-[38px] mb-3 pb-2 border-b border-[var(--line)]">
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-bold text-[var(--ink)] truncate m-0">Договор оказания медицинских услуг</h3>
					<p className="text-xs text-[var(--muted)] truncate m-0 hidden sm:block">Стоматологические услуги, сроки, гарантии и оплата</p>
				</div>
				<div className="flex items-center gap-2 shrink-0 relative flex-wrap">
					{/* Мандат 8am: Ровно ОДНА Primary CTA кнопка в видимом контексте */}
					<button
						type="button"
						onClick={onPrintFilled}
						className={btnPrimaryClass}
						data-testid="btn-paid-contract-print-filled"
						title="Печать оформленного договора с реквизитами и услугами (А4)"
					>
						<Printer className="w-4 h-4 text-white" />
						<span>Печать договора</span>
					</button>

					<button
						type="button"
						onClick={() => void printBlankMedicalContract({ fullName: patientFullName || "" }, { doctorName: doctorFullName || "" })}
						className={btnSecondaryClass}
						data-testid="btn-paid-contract-print-blank"
						title="Печать бланка договора со строками _______ для ручного заполнения"
					>
						<FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span className="hidden sm:inline">Бланк со строками</span>
					</button>

					<button
						type="button"
						onClick={onFillStandard}
						className={btnSecondaryClass}
						data-testid="btn-paid-contract-fill-norm"
						title="Заполнить стандартные реквизиты клиники по умолчанию"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
						<span>Типовой</span>
					</button>

					<div className="relative" ref={moreMenuRef}>
						<button
							type="button"
							onClick={() => setIsMoreMenuOpen((p) => !p)}
							className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer"
							data-testid="btn-paid-contract-more"
							title="Дополнительные действия..."
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>
						{isMoreMenuOpen && (
							<div className="absolute right-0 top-full mt-1.5 w-60 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 py-1.5 text-xs text-[var(--ink)]">
								<button type="button" onClick={() => { setIsMoreMenuOpen(false); onGenNumber(); }} className="w-full px-3 py-2 text-left hover:bg-[var(--line-subtle)] flex items-center gap-2 cursor-pointer font-medium" data-testid="btn-paid-contract-gen-number">
									<RefreshCw className="w-4 h-4 text-slate-500 shrink-0" /><span>Новый номер договора</span>
								</button>
								<button type="button" onClick={() => { setIsMoreMenuOpen(false); onCopyText(); }} className="w-full px-3 py-2 text-left hover:bg-[var(--line-subtle)] flex items-center gap-2 cursor-pointer font-medium" data-testid="btn-paid-contract-copy-text">
									<Copy className="w-4 h-4 text-slate-500 shrink-0" /><span>Копировать текст</span>
								</button>
								<div className="my-1 border-t border-[var(--line)]" />
								<button type="button" onClick={() => { setIsMoreMenuOpen(false); onReset(); }} className="w-full px-3 py-2 text-left hover:bg-rose-500/10 text-rose-600 flex items-center gap-2 cursor-pointer font-medium" data-testid="btn-paid-contract-reset">
									<RotateCcw className="w-4 h-4 text-rose-500 shrink-0" /><span>Очистить поля</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);
