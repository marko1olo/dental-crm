import type { SberPosTransactionResponse } from "@dental/shared";
import { CheckCheck, Copy, Printer } from "lucide-react";
import type React from "react";
import { useSberPosSlipActions } from "./useSberPosSlipActions.js";

export interface SberPosTerminalSlipPanelProps {
	readonly lastResponse: SberPosTransactionResponse | null;
}

export const SberPosTerminalSlipPanel: React.FC<
	SberPosTerminalSlipPanelProps
> = ({ lastResponse }) => {
	const {
		activeSlipTab,
		setActiveSlipTab,
		isCopied,
		isPrinting,
		handleCopySlip,
		handlePrintSlip,
	} = useSberPosSlipActions(lastResponse);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1 bg-[var(--paper-soft,#f8fafc)] p-0.5 rounded-xl border border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						onClick={() => setActiveSlipTab("customer")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeSlipTab === "customer"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-sm"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Чек клиента
					</button>
					<button
						type="button"
						onClick={() => setActiveSlipTab("merchant")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeSlipTab === "merchant"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-sm"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Чек клиники
					</button>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handleCopySlip}
						title="Скопировать слип-чек"
						data-testid="sber-copy-slip-btn"
						className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					>
						{isCopied ? (
							<CheckCheck className="w-4 h-4 text-emerald-600" />
						) : (
							<Copy className="w-4 h-4" />
						)}
					</button>
					<button
						type="button"
						onClick={handlePrintSlip}
						disabled={isPrinting}
						title="Распечатать чек на терминале"
						data-testid="sber-print-slip-btn"
						className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] disabled:opacity-40"
					>
						<Printer
							className={`w-4 h-4 ${isPrinting ? "animate-spin text-[var(--ok-fg,#059669)]" : ""}`}
						/>
					</button>
				</div>
			</div>

			<div className="sber-slip-box p-3 max-h-[300px] overflow-y-auto select-all">
				{lastResponse ? (
					activeSlipTab === "customer" ? (
						lastResponse.customerSlip
					) : (
						lastResponse.merchantSlip
					)
				) : (
					<div className="py-12 text-center text-[var(--muted,#64748b)] font-sans text-xs">
						<p className="font-semibold">Банковский слип еще не сформирован</p>
						<p className="text-[10px] mt-1 opacity-75">
							Запустите операцию на терминале для получения чека
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
