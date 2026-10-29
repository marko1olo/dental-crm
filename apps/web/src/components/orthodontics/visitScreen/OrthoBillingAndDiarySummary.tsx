import React from "react";
import {
	Receipt,
	CreditCard,
	Printer,
	Copy,
	Check,
} from "lucide-react";
import type { OrthoCalculatedService804n } from "../orthoServicesCatalog";

export interface OrthoBillingAndDiarySummaryProps {
	readonly calculatedServices: readonly OrthoCalculatedService804n[];
	readonly totalRub: number;
	readonly generatedProtocol: string;
	readonly onAddToInvoice: () => void;
	readonly onQuickCheckout: () => void;
	readonly onPrintCard: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly onPrintMemo: () => void;
	readonly onCommitProtocol: () => void;
}

export const OrthoBillingAndDiarySummary: React.FC<OrthoBillingAndDiarySummaryProps> = ({
	calculatedServices,
	totalRub,
	generatedProtocol,
	onAddToInvoice,
	onQuickCheckout,
	onPrintCard,
	onCopyPatientMemo,
	onPrintMemo,
	onCommitProtocol,
}) => {
	return (
		<div className="flex flex-col gap-4">
			{/* 1. Billing Summary Box */}
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-3 shadow-xs">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Receipt size={16} className="text-teal-600 dark:text-teal-400" />
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
							Расчет услуг визита ({calculatedServices.length})
						</span>
					</div>
					<span className="text-base font-extrabold text-[var(--teal)]">
						{totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
					{calculatedServices.map((srv, idx) => (
						<div
							key={`${srv.code}-${idx}`}
							className="flex items-center justify-between text-xs py-1 border-b border-[var(--line)]/50 last:border-b-0"
						>
							<div className="min-w-0 mr-2">
								<div className="font-semibold text-[var(--ink)] truncate">{srv.name}</div>
								<div className="text-[10px] text-[var(--muted)]">{srv.code} · {srv.quantity} шт.</div>
							</div>
							<span className="font-bold text-[var(--ink)] whitespace-nowrap">
								{srv.priceRub} ₽
							</span>
						</div>
					))}
				</div>

				{/* Financial Bridge: Instant Checkout Trigger */}
				<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={onAddToInvoice}
						className="secondary-button min-h-[44px] h-10 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs border-[var(--line)]"
						data-testid="bottom-add-services-to-invoice-btn"
						title="Начислить ортодонтические услуги в текущий счет визита"
					>
						<Receipt size={14} className="text-teal-600 dark:text-teal-400" />
						<span>В чек визита</span>
					</button>
					<button
						type="button"
						onClick={onQuickCheckout}
						className="secondary-button min-h-[44px] h-10 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 shadow-2xs"
						data-testid="ortho-quick-checkout-btn"
						title="Открыть кассу и принять оплату за ортодонтию"
					>
						<CreditCard size={14} className="text-emerald-500" />
						<span>Оплатить активацию</span>
					</button>
				</div>
			</div>

			{/* 2. Diary Notes Preview */}
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-xs flex-1">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						Дневник ортодонтического приёма
					</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onPrintCard}
							className="secondary-button h-7 px-2 text-[11px] font-semibold rounded-lg border-[var(--line)]"
							data-testid="bottom-print-protocol-btn"
							title="Печать карты приема"
						>
							<Printer size={12} />
							<span>Печать протокола</span>
						</button>
					</div>
				</div>
				<textarea
					value={generatedProtocol}
					readOnly
					rows={8}
					aria-label="Текст ортодонтического протокола приёма"
					className="w-full p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] leading-relaxed resize-none focus:outline-hidden"
				/>
			</div>

			{/* 3. Patient Memo & Actions */}
			<div className="grid grid-cols-2 gap-2 shrink-0">
				<button
					type="button"
					onClick={onCopyPatientMemo}
					data-testid="ortho-copy-patient-memo-btn"
					className="secondary-button min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer border-[var(--line)]"
					title="Скопировать памятку пациенту для WhatsApp/Telegram"
				>
					<Copy size={14} className="text-[var(--primary)] shrink-0" />
					<span className="truncate">Памятка пациенту</span>
				</button>

				<button
					type="button"
					onClick={onPrintMemo}
					data-testid="ortho-print-patient-memo-btn"
					className="secondary-button min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer border-[var(--line)]"
					title="Распечатать памятку пациенту A4"
				>
					<Printer size={14} className="text-[var(--primary)] shrink-0" />
					<span className="truncate">Печать памятки A4</span>
				</button>
			</div>

			{/* 4. STRICTLY ONE PRIMARY CTA BUTTON (Mandate 8am: #0d9488) */}
			<div className="shrink-0 pt-1">
				<button
					type="button"
					onClick={onCommitProtocol}
					className="primary-button w-full min-h-[48px] h-12 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer bg-[#0d9488] hover:bg-[#0f766e] text-white"
					data-testid="bottom-apply-protocol-btn"
					title="Зафиксировать ортодонтический протокол в медицинскую карту и закрыть"
				>
					<Check size={18} />
					<span>Зафиксировать ортодонтический протокол</span>
				</button>
			</div>
		</div>
	);
};
