import React, { useState } from "react";
import { Copy, FileCheck, FileText, MoreHorizontal, Printer, ShieldCheck } from "lucide-react";

export interface InformedConsentToolbarProps {
	isClosedOrSigned: boolean;
	onPrintConsent: () => void;
	onOpenModal: () => void;
	onFillNorm: () => void;
	onPrintBlank: () => void;
	onCopySummary: () => void;
}

const btnClass = "inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer";

export const InformedConsentToolbar: React.FC<InformedConsentToolbarProps> = React.memo(
	function InformedConsentToolbar({
		isClosedOrSigned,
		onPrintConsent,
		onOpenModal,
		onFillNorm,
		onPrintBlank,
		onCopySummary,
	}) {
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

		return (
			<div className="informed-consent-toolbar flex items-center justify-between min-h-[38px] mb-3 pb-1 gap-2 flex-nowrap">
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						className={btnClass}
						data-testid="btn-print-informed-consent"
						onClick={onPrintConsent}
						title={isClosedOrSigned ? "Печать бланка ИДС (ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ)" : "Печать бланка ИДС (ЧЕРНОВИК)"}
					>
						<Printer className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
						<span>Печать бланка ИДС</span>
					</button>
					<button
						type="button"
						className={`${btnClass} text-emerald-700 dark:text-emerald-400 border-emerald-500/40`}
						data-testid="btn-open-consent-modal"
						onClick={onOpenModal}
						title="Открыть консоль ИДС: пакеты (терапия, ортопедия, хирургия) и подписание"
					>
						<FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Подписать на планшете</span>
					</button>
				</div>
				<div className="relative inline-flex items-center shrink-0">
					<button
						type="button"
						className="inline-flex items-center justify-center min-h-[38px] w-[38px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] cursor-pointer"
						onClick={() => setIsMoreMenuOpen((v) => !v)}
						title="Дополнительные действия (заполнить нормой, чистый бланк, памятка)"
						aria-label="Дополнительные действия ИДС"
						data-testid="btn-informed-consent-more-menu"
					>
						<MoreHorizontal className="w-4 h-4" />
					</button>
					{isMoreMenuOpen && (
						<div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsMoreMenuOpen(false)} />
					)}
					<div
						className={`absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
							isMoreMenuOpen ? "block" : "hidden"
						}`}
						data-testid="informed-consent-dropdown-menu"
					>
						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-bold text-[var(--ink)] hover:bg-[var(--line-subtle)] border-none bg-transparent cursor-pointer"
							data-testid="btn-informed-consent-fill-norm"
							onClick={() => { setIsMoreMenuOpen(false); onFillNorm(); }}
						>
							<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>Заполнить нормой</span>
						</button>
						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] border-none bg-transparent cursor-pointer"
							data-testid="btn-print-blank-informed-consent"
							onClick={() => { setIsMoreMenuOpen(false); onPrintBlank(); }}
							title="Печать чистого бланка ИДС со строками «________» для ручного заполнения"
						>
							<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Печать чистого бланка («________»)</span>
						</button>
						<button
							type="button"
							className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] border-none bg-transparent cursor-pointer"
							data-testid="btn-copy-consent-patient-summary"
							onClick={() => { setIsMoreMenuOpen(false); onCopySummary(); }}
							title="Скопировать выжимку ИДС для отправки пациенту"
						>
							<Copy className="w-4 h-4 text-blue-600 shrink-0" />
							<span>Копировать выжимку для пациента</span>
						</button>
					</div>
				</div>
			</div>
		);
	},
);
