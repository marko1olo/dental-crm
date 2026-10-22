import { Printer, ShieldCheck } from "lucide-react";

export interface CryptoProModalHeaderAndDraftProps {
	lockInProgress: boolean;
	onPrintDraft?: (() => void) | undefined;
}

export function CryptoProModalHeaderAndDraft({
	lockInProgress,
	onPrintDraft,
}: CryptoProModalHeaderAndDraftProps) {
	const handlePrint = () => {
		if (onPrintDraft) onPrintDraft();
		else if (typeof window !== "undefined") window.print();
	};

	return (
		<>
			<div className="absolute top-0 left-0 w-full h-1 bg-[var(--teal)]" />
			<h3
				id="crypto-signer-modal-title"
				className="text-xl font-bold text-[var(--ink)] mb-2 flex items-center gap-2"
			>
				<ShieldCheck className="w-6 h-6 text-[var(--teal,var(--brand-primary))]" />
				Подписание дневника
			</h3>
			<p className="text-[var(--muted)] text-sm mb-4">
				После подписания запись защищается от случайных правок. При необходимости исправления вносятся через «Исправленному верить».
			</p>
			<div className="mb-4">
				<button
					type="button"
					disabled={lockInProgress}
					onClick={handlePrint}
					className="w-full py-2.5 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
					title="Распечатать карту или протокол приёма со штампом черновика для бумажной подписи"
				>
					<Printer className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
					<span>Печать протокола (черновик со штампом врача)</span>
				</button>
			</div>
		</>
	);
}
