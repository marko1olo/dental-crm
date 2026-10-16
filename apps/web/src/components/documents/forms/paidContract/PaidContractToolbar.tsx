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

const btnClass = "inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer";

export const PaidContractToolbar: React.FC<PaidContractToolbarProps> = React.memo(
	function PaidContractToolbar({
		patientFullName, doctorFullName, onFillStandard, onPrintFilled,
		onGenNumber, onCopyText, onReset,
	}) {
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
		const moreMenuRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const handleClickOutside = (e: MouseEvent) => {
				if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
					setIsMoreMenuOpen(false);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, [isMoreMenuOpen]);

		return (
			<div className="flex flex-wrap items-center justify-between gap-3 min-h-[38px] mb-3 pb-2 border-b border-[var(--line)]">
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-bold text-[var(--ink)] truncate m-0">Договор платных медицинских услуг</h3>
					<p className="text-xs text-[var(--muted)] truncate m-0 hidden sm:block">Фиксация номера, сроков, состава услуг, стоимости и обязательных уведомлений</p>
				</div>
				<div className="flex items-center gap-2 shrink-0 relative">
					<button
						type="button"
						onClick={() => void printBlankMedicalContract({ fullName: patientFullName || "" }, { doctorName: doctorFullName || "" })}
						className={btnClass}
						data-testid="btn-paid-contract-print-blank"
						title="Печать пустого бланка договора со строками ________ для ручного заполнения"
					>
						<Printer className="w-4 h-4" />
						<span>Печать договора (бланк со строками _______)</span>
					</button>
					<button
						type="button"
						onClick={onFillStandard}
						className={`${btnClass} text-emerald-700 dark:text-emerald-400 border-emerald-500/40`}
						data-testid="btn-paid-contract-fill-norm"
						title="Заполнить типовой договор клиники со стандартными реквизитами"
					>
						<ShieldCheck className="w-4 h-4 text-emerald-600" />
						<span>Типовой договор</span>
					</button>
					<div className="relative" ref={moreMenuRef}>
						<button
							type="button"
							onClick={() => setIsMoreMenuOpen((p) => !p)}
							className="inline-flex items-center justify-center min-h-[38px] w-[38px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] cursor-pointer"
							data-testid="btn-paid-contract-more"
							title="Дополнительные действия..."
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>
						{isMoreMenuOpen && (
							<div className="absolute right-0 top-full mt-1.5 w-64 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 py-1.5 text-xs text-[var(--ink)]">
								<button
									type="button"
									onClick={() => { setIsMoreMenuOpen(false); onPrintFilled(); }}
									className="w-full px-3 py-2 text-left hover:bg-[var(--line-subtle)] flex items-center gap-2 cursor-pointer font-bold"
									data-testid="btn-paid-contract-print-filled"
								>
									<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
									<span>Печать договора на оказание услуг</span>
								</button>
								<button
									type="button"
									onClick={() => { setIsMoreMenuOpen(false); onGenNumber(); }}
									className="w-full px-3 py-2 text-left hover:bg-[var(--line-subtle)] flex items-center gap-2 cursor-pointer font-semibold"
									data-testid="btn-paid-contract-gen-number"
								>
									<RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
									<span>Новый регламентный номер</span>
								</button>
								<button
									type="button"
									onClick={() => { setIsMoreMenuOpen(false); onCopyText(); }}
									className="w-full px-3 py-2 text-left hover:bg-[var(--line-subtle)] flex items-center gap-2 cursor-pointer font-semibold"
									data-testid="btn-paid-contract-copy-text"
								>
									<Copy className="w-4 h-4 text-slate-500 shrink-0" />
									<span>Копировать текст (для ЭМК)</span>
								</button>
								<div className="my-1 border-t border-[var(--line)]" />
								<button
									type="button"
									onClick={() => { setIsMoreMenuOpen(false); onReset(); }}
									className="w-full px-3 py-2 text-left hover:bg-rose-500/10 text-rose-600 flex items-center gap-2 cursor-pointer font-semibold"
									data-testid="btn-paid-contract-reset"
								>
									<RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
									<span>Очистить поля договора</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);
