/**
 * apps/web/src/components/finance/PaymentModal.tsx
 *
 * DENTE Dental CRM — Universal Payment & Sberbank POS Terminal Modal.
 * Supports Cash, Sberbank POS Terminal, SberPay QR, FacePay Biometry, Family Wallet, and Split Payments.
 */

import React, { useState } from "react";
import {
	X,
	CreditCard,
	Banknote,
	QrCode,
	Smile,
	Wallet,
	Printer,
	ShieldCheck,
	CheckCircle,
} from "lucide-react";
import type { SberPosTransactionResponse } from "@dental/shared";
import { SberPayIntegration } from "./SberPayIntegration.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

export type PaymentMethodTab = "card_terminal" | "sberpay_qr" | "biometry" | "cash" | "family_deposit";

export interface PaymentModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly amountKopecks: number;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly onClose: () => void;
	readonly onSuccess: (paymentData: {
		method: string;
		amountKopecks: number;
		rrn?: string | undefined;
		authCode?: string | undefined;
	}) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
	isOpen,
	patientId,
	patientName,
	amountKopecks,
	invoiceId,
	visitId,
	documentId,
	defaultMethod = "card_terminal",
	onClose,
	onSuccess,
}) => {
	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);

	if (!isOpen) return null;

	const amountRub = (amountKopecks / 100).toFixed(2);

	const handleCashSubmit = async () => {
		setIsSubmittingCash(true);
		try {
			const clientMutationId = `cash:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const amountRubNumber = Number((amountKopecks / 100).toFixed(2));
			// Record Cash transaction in backend via canonical billing payments endpoint
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountRubNumber,
					method: "cash",
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата наличными через кассу (${amountRub} ₽)`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					(errorData && typeof errorData.error === "string" && errorData.error) ||
					`Ошибка приёма наличных: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(`Оплата ${amountRub} ₽ наличными принята в кассу`, "success");
			onSuccess({
				method: "cash",
				amountKopecks,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg =
				err instanceof Error ? err.message : "Сбой соединения при приёме оплаты наличными";
			showToast(errorMsg, "error");
		} finally {
			setIsSubmittingCash(false);
		}
	};

	const handleSberSuccess = (posRes: SberPosTransactionResponse) => {
		onSuccess({
			method: posRes.operationType,
			amountKopecks: posRes.amountKop,
			rrn: posRes.rrn,
			authCode: posRes.authCode,
		});
		setTimeout(() => {
			onClose();
		}, 1200);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
		>
			<div className="w-full max-w-xl rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Modal Header */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div>
						<h2 id="payment-modal-title" className="text-base sm:text-lg font-bold m-0 flex items-center gap-2">
							<ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
							<span>Прием оплаты • {amountRub} ₽</span>
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
					>
						<X size={18} />
					</button>
				</div>

				{/* Method Selector Tabs */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-2 overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveMethod("card_terminal")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "card_terminal"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<CreditCard size={16} className="text-emerald-600" />
						<span>POS Терминал Сбербанк</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("sberpay_qr")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "sberpay_qr"
								? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<QrCode size={16} className="text-teal-600" />
						<span>SberPay QR (СБП)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("cash")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "cash"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Banknote size={16} className="text-emerald-600" />
						<span>Наличные</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-1 space-y-4">
					{activeMethod === "card_terminal" || activeMethod === "sberpay_qr" || activeMethod === "biometry" ? (
						<SberPayIntegration
							patientId={patientId}
							patientName={patientName}
							amountKopecks={amountKopecks}
							invoiceId={invoiceId}
							visitId={visitId}
							documentId={documentId}
							onPaymentSuccess={handleSberSuccess}
							onSelectAlternativeMethod={(alt) => {
								if (alt === "cash") setActiveMethod("cash");
								if (alt === "deposit") setActiveMethod("family_deposit");
							}}
						/>
					) : activeMethod === "cash" ? (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4 text-center">
							<div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
								<Banknote size={24} />
							</div>
							<div>
								<h3 className="text-sm font-bold m-0">Прием наличных денежных средств</h3>
								<p className="text-xs text-[var(--muted,#64748b)] m-0">
									Сумма к внесению в кассу клиники: <strong>{amountRub} ₽</strong>
								</p>
							</div>

							<button
								type="button"
								onClick={handleCashSubmit}
								disabled={isSubmittingCash}
								className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
							>
								<CheckCircle size={16} />
								<span>{isSubmittingCash ? "Фиксация..." : `Подтвердить прием ${amountRub} ₽ в кассу`}</span>
							</button>
						</div>
					) : (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center text-xs">
							Депозит / семейный кошелек
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
