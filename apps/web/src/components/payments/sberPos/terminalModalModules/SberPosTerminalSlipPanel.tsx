import type { SberPosTransactionResponse } from "@dental/shared";
import { CheckCheck, Copy, CreditCard, Printer } from "lucide-react";
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
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							activeSlipTab === "customer"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Чек пациента
					</button>
					<button
						type="button"
						onClick={() => setActiveSlipTab("merchant")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							activeSlipTab === "merchant"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Чек клиники
					</button>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleCopySlip}
						title="Скопировать реквизиты авторизации"
						data-testid="sber-copy-slip-btn"
						className="min-w-[40px] min-h-[40px] p-2 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer"
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
						title="Распечатать квитанцию на терминале"
						data-testid="sber-print-slip-btn"
						className="min-w-[40px] min-h-[40px] p-2 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer disabled:opacity-40"
					>
						<Printer
							className={`w-4 h-4 ${isPrinting ? "animate-spin text-[var(--teal,#0d9488)]" : ""}`}
						/>
					</button>
				</div>
			</div>

			<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] max-h-[300px] overflow-y-auto select-all text-xs font-mono">
				{lastResponse ? (
					<div className="space-y-2">
						<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2 text-[var(--muted,#64748b)]">
							<span className="font-sans font-bold text-[var(--ink,#0f172a)]">
								{lastResponse.cardIssuer || "Банковская карта"}
							</span>
							<span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
								Авторизовано
							</span>
						</div>
						<div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
							<div>
								<span className="text-[var(--muted,#64748b)] font-sans block">Номер RRN:</span>
								<strong className="text-[var(--ink,#0f172a)]">{lastResponse.rrn || "—"}</strong>
							</div>
							<div>
								<span className="text-[var(--muted,#64748b)] font-sans block">Код авторизации:</span>
								<strong className="text-[var(--ink,#0f172a)]">{lastResponse.authCode || "—"}</strong>
							</div>
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)] font-mono whitespace-pre-wrap pt-2 border-t border-[var(--line,#e2e8f0)] leading-relaxed">
							{activeSlipTab === "customer" ? lastResponse.customerSlip : lastResponse.merchantSlip}
						</div>
					</div>
				) : (
					<div className="py-10 text-center text-[var(--muted,#64748b)] font-sans text-xs">
						<CreditCard className="w-8 h-8 mx-auto text-[var(--muted,#64748b)] opacity-40 mb-2" />
						<p className="font-semibold text-[var(--ink,#0f172a)]">Данные авторизации терминала</p>
						<p className="text-[11px] mt-1 text-[var(--muted,#64748b)]">
							После подтверждения на терминале здесь отобразятся RRN, код авторизации и чек
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
