/**
 * apps/web/src/components/billing/paymentModalModules/PaymentFiscalPreview.tsx
 *
 * Layer 4: Live 54-FZ Thermal Receipt Tape Preview & Taxation System (СНО) Selector.
 * Styled via Studio Clinical HIG (WCAG AAA contrast, authentic 80mm tape).
 * Governed by Mandates 8d pt 5, 8e, 8n.
 */

import React, { useState } from "react";
import { Printer, Receipt, Scale, Send } from "lucide-react";
import { ReceiptPreview } from "../ReceiptPreview.js";
import type { PaymentFiscalPreviewProps } from "./types.js";

export const PaymentFiscalPreview: React.FC<PaymentFiscalPreviewProps> = ({
	clinicLegalName,
	totalDueRub,
	patientName,
	patientPhone,
	patientEmail,
	effectiveCashier,
	isWarranty100,
	tendersHook,
	discountsHook,
	showReceiptSidePanel,
	mobileTab,
	items,
	toothNumber,
}) => {
	const [taxSystem, setTaxSystem] = useState<"usn_income" | "usn_all" | "osn" | "patent">("usn_income");
	const [deliveryMode, setDeliveryMode] = useState<"paper_print" | "electronic_sms" | "electronic_email">("paper_print");

	if (!showReceiptSidePanel && mobileTab !== "receipt") {
		return null;
	}

	const isMobileActive = mobileTab === "receipt";

	return (
		<div className={`w-full lg:w-[380px] shrink-0 p-2 sm:p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/40 overflow-y-auto flex flex-col items-center border-t lg:border-t-0 ${isMobileActive ? "flex" : "hidden md:flex"}`}>
			<div className="w-full max-w-[345px] space-y-1.5">
				{/* Header & 54-FZ Status */}
				<div className="flex items-center justify-between text-xs px-1 select-none">
					<span className="font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1">
						<Receipt size={13} className="text-teal-600" />
						<span>Предпросмотр чека</span>
					</span>
					<div className="flex items-center gap-1.5">
						<span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
							Онлайн-касса 54-ФЗ
						</span>
					</div>
				</div>

				{/* 54-FZ Receipt Delivery Switcher (Apple Segmented Bar) */}
				<div className="space-y-1">
					<div className="payment-doc-segmented-bar w-full">
						<button
							type="button"
							onClick={() => setDeliveryMode("paper_print")}
							className={`payment-doc-tab flex-1 ${deliveryMode === "paper_print" ? "is-active" : ""}`}
							data-testid="btn-delivery-paper"
							title="Бумажный чек на кассе"
						>
							<Printer size={12} />
							<span>Бумажный</span>
						</button>
						<button
							type="button"
							onClick={() => setDeliveryMode("electronic_sms")}
							className={`payment-doc-tab flex-1 ${deliveryMode === "electronic_sms" ? "is-active" : ""}`}
							data-testid="btn-delivery-sms"
							title={`SMS чек на ${patientPhone || "телефон"}`}
						>
							<Send size={12} />
							<span>SMS</span>
						</button>
						<button
							type="button"
							onClick={() => setDeliveryMode("electronic_email")}
							className={`payment-doc-tab flex-1 ${deliveryMode === "electronic_email" ? "is-active" : ""}`}
							data-testid="btn-delivery-email"
							title={`Email чек на ${patientEmail || "почту"}`}
						>
							<Receipt size={12} />
							<span>Email</span>
						</button>
					</div>
				</div>

				{/* 54-FZ Taxation System (СНО) Quick Selector */}
				<div className="flex items-center justify-between gap-1 px-1 py-1 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[11px]">
					<div className="flex items-center gap-1 text-[var(--muted,#64748b)] shrink-0">
						<Scale size={12} className="text-teal-600" />
						<span className="font-semibold">СНО:</span>
					</div>
					<div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
						<button
							type="button"
							onClick={() => setTaxSystem("usn_income")}
							className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${taxSystem === "usn_income" ? "bg-teal-600 text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}
							title="УСН Доходы (без НДС по ст. 149 НК РФ)"
						>
							УСН Доходы
						</button>
						<button
							type="button"
							onClick={() => setTaxSystem("patent")}
							className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${taxSystem === "patent" ? "bg-teal-600 text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}
							title="Патентная система налогообложения (ПСН)"
						>
							ПСН
						</button>
						<button
							type="button"
							onClick={() => setTaxSystem("osn")}
							className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${taxSystem === "osn" ? "bg-teal-600 text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}
							title="Общая система налогообложения"
						>
							ОСН
						</button>
					</div>
				</div>

				{/* Authentic 80mm Thermal Receipt Tape */}
				<ReceiptPreview
					clinicLegalName={clinicLegalName}
					totalDueRub={totalDueRub}
					patientName={patientName}
					patientPhone={patientPhone}
					cashierFullName={effectiveCashier}
					isWarranty100={isWarranty100}
					isPaid={false}
					items={items}
					toothNumber={toothNumber}
					payments={{
						cardRub: tendersHook.activeMethod === "card_terminal" ? totalDueRub : tendersHook.splitCardRub,
						sbpRub: tendersHook.activeMethod === "sbp_qr" ? totalDueRub : tendersHook.splitSbpRub,
						cashRub: tendersHook.activeMethod === "cash" ? totalDueRub : tendersHook.splitCashRub,
						receivedCashRub: tendersHook.receivedCashRub,
						changeRub: tendersHook.cashChange.changeRub,
						depositRub: tendersHook.activeMethod === "family_deposit" ? totalDueRub : tendersHook.splitDepositRub,
					}}
					showActionsBar={true}
				/>
			</div>
		</div>
	);
};
