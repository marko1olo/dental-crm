/**
 * apps/web/src/components/billing/depositModal/DepositMethodAndOptionsSection.tsx
 *
 * Payment method selector, family wallet toggle, and 54-FZ delivery mode.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CreditCard, QrCode, Banknote, Building2, Users, Printer, Send, Receipt } from "lucide-react";
import type { ReceiptDeliveryMode } from "@dental/shared";
import type { DepositPaymentMethod } from "./depositModalTypes.js";

interface DepositMethodAndOptionsSectionProps {
	readonly paymentMethod: DepositPaymentMethod;
	readonly setPaymentMethod: (m: DepositPaymentMethod) => void;
	readonly isFamilyWallet: boolean;
	readonly setIsFamilyWallet: (v: boolean) => void;
	readonly deliveryMode: ReceiptDeliveryMode;
	readonly setDeliveryMode: (d: ReceiptDeliveryMode) => void;
}

export const DepositMethodAndOptionsSection: React.FC<DepositMethodAndOptionsSectionProps> = ({
	paymentMethod,
	setPaymentMethod,
	isFamilyWallet,
	setIsFamilyWallet,
	deliveryMode,
	setDeliveryMode,
}) => {
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider block">
					Способ внесения средств
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{[
						{ id: "card", label: "Карта POS", icon: CreditCard, testId: "btn-deposit-method-card" },
						{ id: "sbp", label: "QR СБП", icon: QrCode, testId: "btn-deposit-method-sbp" },
						{ id: "cash", label: "Наличные", icon: Banknote, testId: "btn-deposit-method-cash" },
						{ id: "bank_transfer", label: "Перевод / Р/с", icon: Building2, testId: "btn-deposit-method-bank" },
					].map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => setPaymentMethod(item.id as DepositPaymentMethod)}
							className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
								paymentMethod === item.id
									? "border-teal-600 bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold shadow-xs ring-1 ring-teal-500/30"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-slate-400"
							}`}
							data-testid={item.testId}
						>
							<item.icon size={18} />
							<span className="text-xs">{item.label}</span>
						</button>
					))}
				</div>
			</div>

			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
						<Users size={16} />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)]">Семейный доступ (Family Wallet)</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">Разрешить списывать этот депозит членам семьи</div>
					</div>
				</div>
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						checked={isFamilyWallet}
						onChange={(e) => setIsFamilyWallet(e.target.checked)}
						className="sr-only peer"
						data-testid="toggle-family-wallet"
					/>
					<div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
				</label>
			</div>

			<div className="space-y-1.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider block">
					Чек аванса 54-ФЗ (Тег 1213)
				</label>
				<div className="payment-doc-segmented-bar w-full">
					<button
						type="button"
						onClick={() => setDeliveryMode("paper_print")}
						className={`payment-doc-tab flex-1 ${deliveryMode === "paper_print" ? "is-active" : ""}`}
						data-testid="btn-deposit-delivery-paper"
					>
						<Printer size={13} />
						<span>Бумажный чек</span>
					</button>
					<button
						type="button"
						onClick={() => setDeliveryMode("electronic_sms")}
						className={`payment-doc-tab flex-1 ${deliveryMode === "electronic_sms" ? "is-active" : ""}`}
						data-testid="btn-deposit-delivery-sms"
					>
						<Send size={13} />
						<span>SMS чек</span>
					</button>
					<button
						type="button"
						onClick={() => setDeliveryMode("electronic_email")}
						className={`payment-doc-tab flex-1 ${deliveryMode === "electronic_email" ? "is-active" : ""}`}
						data-testid="btn-deposit-delivery-email"
					>
						<Receipt size={13} />
						<span>Email чек</span>
					</button>
				</div>
			</div>
		</div>
	);
};
