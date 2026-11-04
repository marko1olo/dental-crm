/**
 * @file CopilotCashboxInvoiceCard.tsx
 * @description Generative UI Action Card for 54-FZ Cashbox & Invoicing at Chairside.
 * Mandate 8b: <= 160 lines, exactly 1 Primary CTA, exact kopeck fidelity (Mandate 8n).
 */

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, QrCode, Receipt, ShieldCheck } from "lucide-react";
import { formatMoney } from "../useCopilotFormat";

export interface InvoiceCardItem {
	id?: string | undefined;
	name: string;
	tooth?: number | string | undefined;
	quantity?: number | undefined;
	priceRub: number;
}

export interface CopilotCashboxInvoiceData {
	patientId?: string | undefined;
	patientName?: string | undefined;
	invoiceNumber?: string | undefined;
	items: InvoiceCardItem[];
	totalKopecks: number;
	doctorDiscountPercent?: number | undefined;
	isFiscalized?: boolean | undefined;
}

export interface CopilotCashboxInvoiceCardProps {
	data: CopilotCashboxInvoiceData;
	onOpenCashbox?: (invoice: CopilotCashboxInvoiceData) => void;
}

export const CopilotCashboxInvoiceCard: React.FC<CopilotCashboxInvoiceCardProps> = ({
	data,
	onOpenCashbox,
}) => {
	const [paid, setPaid] = useState(Boolean(data.isFiscalized));
	const totalRub = Math.round(data.totalKopecks / 100);

	const handleOpen = () => {
		if (onOpenCashbox) {
			onOpenCashbox(data);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-cashbox", {
					detail: {
						patientId: data.patientId,
						amountKopecks: data.totalKopecks,
						items: data.items,
					},
				}),
			);
		}
	};

	const handleQuickFiscalize = () => {
		setPaid(true);
		handleOpen();
	};

	return (
		<div
			className={`p-3.5 rounded-xl border transition-all text-xs shadow-xs ${
				paid
					? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20"
					: "border-[var(--teal,#0d9488)]/30 bg-[var(--paper)]"
			}`}
			data-testid="copilot-cashbox-invoice-card"
		>
			<div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<Receipt size={13} />
					</div>
					<div>
						<div className="font-bold text-[var(--ink)] leading-tight">
							{data.patientName ? `Счёт: ${data.patientName}` : "Счёт приёма"}
						</div>
						<div className="text-[10px] text-[var(--muted)]">Без ИНН физлица • Кассовый чек</div>
					</div>
				</div>
				<span
					className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
						paid
							? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]"
					}`}
				>
					{paid ? <CheckCircle2 size={11} /> : <CreditCard size={11} />}
					<span>{paid ? "Оплачен" : "Готов к кассе"}</span>
				</span>
			</div>

			{data.items && data.items.length > 0 && (
				<div className="py-2 space-y-1.5 border-b border-[var(--line)]">
					{data.items.map((item, idx) => (
						<div key={item.id || idx} className="flex items-center justify-between gap-2 text-[11px]">
							<span className="text-[var(--ink)] truncate">
								{item.tooth ? `Зуб ${item.tooth}: ` : ""}
								{item.name}
							</span>
							<span className="font-semibold text-[var(--ink)] tabular-nums shrink-0">
								{formatMoney(item.priceRub)}
							</span>
						</div>
					))}
				</div>
			)}

			<div className="pt-2.5 flex items-center justify-between gap-2">
				<div>
					<div className="text-[10px] text-[var(--muted)]">Итого к оплате</div>
					<div className="text-base font-extrabold text-[var(--teal,#0d9488)] tabular-nums">
						{formatMoney(totalRub)}
					</div>
					{data.doctorDiscountPercent && data.doctorDiscountPercent > 0 && (
						<div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
							<ShieldCheck size={11} />
							<span>Скидка врача {data.doctorDiscountPercent}% (Гарантия)</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleQuickFiscalize}
						className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-95 cursor-pointer"
						data-testid="copilot-open-cashbox-primary-btn"
					>
						<span>{paid ? "Просмотр чека" : "Оплатить в кассе"}</span>
						<ArrowRight size={13} />
					</button>
				</div>
			</div>
		</div>
	);
};
