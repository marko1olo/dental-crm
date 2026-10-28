/**
 * CashRegisterFiscalSection.tsx — Fiscal Receipt Toggle & Electronic Delivery (Print, SMS, Email).
 * Mandate 8b: <= 110 lines. Mandate 8e: Doctor & Cashier Autonomy.
 */

import React from "react";
import { ShieldCheck, Printer, Smartphone, Mail } from "lucide-react";

export type ReceiptDeliveryMethod = "print" | "sms" | "email";

export interface CashRegisterFiscalSectionProps {
	readonly fiscalize: boolean;
	readonly onFiscalizeChange: (val: boolean) => void;
	readonly receiptDelivery: ReceiptDeliveryMethod;
	readonly onReceiptDeliveryChange: (val: ReceiptDeliveryMethod) => void;
	readonly customerContact: string;
	readonly onCustomerContactChange: (val: string) => void;
}

export const CashRegisterFiscalSection: React.FC<CashRegisterFiscalSectionProps> = ({
	fiscalize,
	onFiscalizeChange,
	receiptDelivery,
	onReceiptDeliveryChange,
	customerContact,
	onCustomerContactChange,
}) => {
	return (
		<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span className="text-xs sm:text-sm font-medium text-[var(--ink)]">
						Чек с фискализацией
					</span>
				</div>
				<label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
					<input
						type="checkbox"
						checked={fiscalize}
						onChange={(e) => onFiscalizeChange(e.target.checked)}
						className="sr-only peer"
					/>
					<div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--teal,#0d9488)]" />
				</label>
			</div>

			{fiscalize && (
				<div className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle,var(--line))]">
					<button
						type="button"
						data-testid="btn-delivery-paper"
						onClick={() => onReceiptDeliveryChange("print")}
						className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
							receiptDelivery === "print"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
								: "border-[var(--line,#e2e8f0)] bg-transparent text-[var(--muted,#64748b)]"
						}`}
					>
						<Printer className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">Печать на кассе</span>
						<span className="sm:hidden">Печать</span>
					</button>
					<button
						type="button"
						data-testid="btn-delivery-sms"
						onClick={() => onReceiptDeliveryChange("sms")}
						className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
							receiptDelivery === "sms"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
								: "border-[var(--line,#e2e8f0)] bg-transparent text-[var(--muted,#64748b)]"
						}`}
					>
						<Smartphone className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">По SMS</span>
						<span className="sm:hidden">SMS</span>
					</button>
					<button
						type="button"
						data-testid="btn-delivery-email"
						onClick={() => onReceiptDeliveryChange("email")}
						className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
							receiptDelivery === "email"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
								: "border-[var(--line,#e2e8f0)] bg-transparent text-[var(--muted,#64748b)]"
						}`}
					>
						<Mail className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">По Email</span>
						<span className="sm:hidden">Email</span>
					</button>
				</div>
			)}

			{fiscalize && receiptDelivery !== "print" && (
				<div className="pt-1">
					<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
						{receiptDelivery === "sms"
							? "Телефон пациента для отправки чека"
							: "Email пациента для отправки чека"}
					</label>
					<input
						type="text"
						value={customerContact}
						onChange={(e) => onCustomerContactChange(e.target.value)}
						placeholder={
							receiptDelivery === "sms" ? "+7 (999) 000-00-00" : "patient@mail.ru"
						}
						className="w-full min-h-[44px] px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink)]"
					/>
				</div>
			)}
		</div>
	);
};

export default CashRegisterFiscalSection;
