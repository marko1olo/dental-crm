/**
 * apps/web/src/components/cashbox/checkout/CheckoutFiscalOptions.tsx
 *
 * 54-FZ Fiscal Receipt Options, Paper/SMS/Email Channels & Status Banners.
 * Governed by Mandate 8x (Clean Russian), Mandate 8e, Apple HIG.
 */

import React from "react";
import { Printer, Send, AlertTriangle, Check } from "lucide-react";
import {
	RECEIPT_PRINT_FORMATS,
	type ReceiptPrintFormat,
} from "../cashboxCatalogData.js";
import type { CheckoutDeliveryMethod } from "./types.js";

export interface CheckoutFiscalOptionsProps {
	readonly fiscalize: boolean;
	readonly setFiscalize: (val: boolean) => void;
	readonly printFormat: ReceiptPrintFormat;
	readonly setPrintFormat: (fmt: ReceiptPrintFormat) => void;
	readonly receiptDelivery: CheckoutDeliveryMethod;
	readonly setReceiptDelivery: (del: CheckoutDeliveryMethod) => void;
	readonly customerContact: string;
	readonly setCustomerContact: (val: string) => void;
	readonly errorMessage: string | null;
	readonly receiptSuccess: any | null;
}

export const CheckoutFiscalOptions: React.FC<CheckoutFiscalOptionsProps> = ({
	fiscalize,
	setFiscalize,
	printFormat,
	setPrintFormat,
	receiptDelivery,
	setReceiptDelivery,
	customerContact,
	setCustomerContact,
	errorMessage,
	receiptSuccess,
}) => {
	return (
		<div className="space-y-3">
			{/* Fiscal Check & Delivery Options */}
			<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
				<div className="flex items-center justify-between">
					<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink)]">
						<input
							type="checkbox"
							checked={fiscalize}
							onChange={(e) => setFiscalize(e.target.checked)}
							className="rounded border-[var(--line)] text-[var(--teal,#0d9488)] w-4 h-4"
						/>
						<span>Чек с фискализацией</span>
					</label>
					<div className="flex gap-1">
						{RECEIPT_PRINT_FORMATS.map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setPrintFormat(f.id)}
								className={`min-h-[44px] px-2 py-1 text-[11px] font-semibold rounded-md border cursor-pointer ${
									printFormat === f.id
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{f.id === "tape_80mm" ? "80 мм" : f.id === "tape_58mm" ? "58 мм" : "Акт А4"}
							</button>
						))}
					</div>
				</div>

				{/* Delivery Channels */}
				<div className="flex flex-col sm:flex-row gap-2 pt-1">
					<button
						type="button"
						data-testid="btn-delivery-paper"
						onClick={() => setReceiptDelivery("print")}
						className={`flex-1 min-h-[44px] px-2 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
							receiptDelivery === "print"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
						}`}
					>
						<Printer className="w-4 h-4 shrink-0" />
						<span>Печать на кассе</span>
					</button>
					<button
						type="button"
						data-testid="btn-delivery-sms"
						onClick={() => setReceiptDelivery("sms")}
						className={`flex-1 min-h-[44px] px-2 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
							receiptDelivery === "sms"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
						}`}
					>
						<Send className="w-3.5 h-3.5 shrink-0" />
						<span>SMS</span>
					</button>
					<button
						type="button"
						data-testid="btn-delivery-email"
						onClick={() => setReceiptDelivery("email")}
						className={`flex-1 min-h-[44px] px-2 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
							receiptDelivery === "email"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
						}`}
					>
						<span>Email</span>
					</button>
				</div>

				{receiptDelivery !== "print" && (
					<div className="pt-1">
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Контакт для отправки электронного чека (телефон или e-mail):
						</label>
						<input
							type="text"
							value={customerContact}
							onChange={(e) => setCustomerContact(e.target.value)}
							placeholder="+7 (999) 000-00-00 или client@example.com"
							className="w-full min-h-[44px] px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
						/>
					</div>
				)}
			</div>

			{/* Feedback Messages */}
			{errorMessage && (
				<div className="p-3 rounded-xl bg-[var(--danger,#ef4444)]/10 border border-[var(--danger,#ef4444)]/30 text-[var(--danger,#ef4444)] text-xs flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			)}
			{receiptSuccess && (
				<div className="p-3 rounded-xl bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)] text-xs flex items-center gap-2 font-semibold">
					<Check className="w-4 h-4 shrink-0" />
					<span>Оплата успешно проведена. Фискальный чек сформирован.</span>
				</div>
			)}
		</div>
	);
};
