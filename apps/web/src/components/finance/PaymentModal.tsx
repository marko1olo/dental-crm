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
	Users,
	Sparkles,
} from "lucide-react";
import {
	type SberPosTransactionResponse,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import { SberPayIntegration } from "./SberPayIntegration.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

export type PaymentMethodTab = "card_terminal" | "sberpay_qr" | "biometry" | "cash" | "family_deposit" | "split";

export interface PaymentModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly amountKopecks: number;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
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
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	onClose,
	onSuccess,
}) => {
	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);
	const [isSubmittingSplit, setIsSubmittingSplit] = useState<boolean>(false);
	const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

	// Multi-tender split payment state
	const totalDueRub = Number((amountKopecks / 100).toFixed(2));
	const [splitCardRub, setSplitCardRub] = useState<number>(totalDueRub);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);

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

	const totalAllocatedRub = Number((splitCardRub + splitCashRub + splitDepositRub + splitSbpRub).toFixed(2));
	const isBalanced = Math.abs(totalAllocatedRub - totalDueRub) < 0.009;

	const handleSplitSubmit = async () => {
		let effectiveCardRub = splitCardRub;
		let effectiveCashRub = splitCashRub;
		const effectiveDepositRub = splitDepositRub;
		const effectiveSbpRub = splitSbpRub;

		// Автоматически распределяем остаток до копейки без ошибок и блокировок кассы
		if (!isBalanced) {
			const remainder = Math.max(0, Number((totalDueRub - (effectiveDepositRub + effectiveSbpRub)).toFixed(2)));
			if (effectiveCashRub > 0 && effectiveCardRub === 0) {
				effectiveCashRub = remainder;
			} else {
				effectiveCardRub = Math.max(0, Number((remainder - effectiveCashRub).toFixed(2)));
			}
			setSplitCardRub(effectiveCardRub);
			setSplitCashRub(effectiveCashRub);
		}

		setIsSubmittingSplit(true);
		try {
			const clientMutationId = `split:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const parts: string[] = [];
			if (effectiveCardRub > 0) parts.push(`карта ${effectiveCardRub} ₽`);
			if (effectiveCashRub > 0) parts.push(`нал ${effectiveCashRub} ₽`);
			if (effectiveDepositRub > 0) parts.push(`аванс ${effectiveDepositRub} ₽`);
			if (effectiveSbpRub > 0) parts.push(`СБП ${effectiveSbpRub} ₽`);

			const primaryMethod = effectiveCashRub > effectiveCardRub ? "cash" : "card";
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: totalDueRub,
					method: primaryMethod,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Комбинированная оплата: ${parts.join(" + ")}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка записи комбинированной оплаты: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(`Комбинированная оплата ${totalDueRub} ₽ успешно принята`, "success");
			onSuccess({
				method: "split",
				amountKopecks,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при приёме комбинированной оплаты";
			showToast(errorMsg, "error");
		} finally {
			setIsSubmittingSplit(false);
		}
	};

	const handleDepositSubmit = async (source: "deposit" | "family") => {
		setIsSubmittingDeposit(true);
		try {
			const clientMutationId = `${source}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const amountRubNumber = Number((amountKopecks / 100).toFixed(2));
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountRubNumber,
					method: source === "family" ? "family_deposit" : "deposit",
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: source === "family"
						? `Оплата с семейного баланса (${amountRub} ₽)`
						: `Оплата с лицевого счета / аванса (${amountRub} ₽)`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка списания со счета: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				source === "family"
					? `Оплата ${amountRub} ₽ с семейного баланса успешно списана`
					: `Оплата ${amountRub} ₽ с аванса/депозита успешно списана`,
				"success",
			);
			onSuccess({
				method: source,
				amountKopecks,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при списании со счета";
			showToast(errorMsg, "error");
		} finally {
			setIsSubmittingDeposit(false);
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

					<button
						type="button"
						onClick={() => setActiveMethod("family_deposit")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "family_deposit"
								? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-2 ring-pink-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-payment-family-deposit"
					>
						<Users size={16} className="text-pink-600" />
						<span>Депозит / Семья</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("split")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "split"
								? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Wallet size={16} className="text-purple-600" />
						<span>Комбинированная (Сплит)</span>
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
					) : activeMethod === "split" ? (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-2">
								<div className="flex items-center gap-2">
									<Wallet size={18} className="text-purple-600" />
									<h3 className="text-sm font-bold m-0">Комбинированная оплата (Сплит)</h3>
								</div>
								<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
									К оплате: <strong className="text-[var(--ink,#0f172a)]">{totalDueRub.toLocaleString("ru-RU")} ₽</strong>
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<CreditCard size={14} className="text-blue-600" />
										<span>Банковская карта (Терминал), ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitCardRub || ""}
										onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Banknote size={14} className="text-emerald-600" />
										<span>Наличные (Касса), ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitCashRub || ""}
										onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<QrCode size={14} className="text-teal-600" />
										<span>SberPay QR / СБП, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitSbpRub || ""}
										onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Wallet size={14} className="text-purple-600" />
										<span>Депозит / Аванс, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitDepositRub || ""}
										onChange={(e) => setSplitDepositRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>
							</div>

							{/* 1-Click Fast Auto-Balance Chips */}
							<div className="flex items-center gap-1.5 flex-wrap pt-1">
								<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">1-клик:</span>
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCardRub(kopecksToRub(remKop));
											setSplitCashRub(0);
											setSplitSbpRub(0);
										}}
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 cursor-pointer"
									>
										⚡ Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Карта
									</button>
								)}
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCashRub(kopecksToRub(remKop));
											setSplitCardRub(0);
											setSplitSbpRub(0);
										}}
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 cursor-pointer"
									>
										⚡ Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Нал
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setSplitCardRub(totalDueRub);
										setSplitCashRub(0);
										setSplitDepositRub(0);
										setSplitSbpRub(0);
									}}
									className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-blue-400 cursor-pointer"
								>
									Всё на карту
								</button>
								<button
									type="button"
									onClick={() => {
										setSplitCashRub(totalDueRub);
										setSplitCardRub(0);
										setSplitDepositRub(0);
										setSplitSbpRub(0);
									}}
									className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 cursor-pointer"
								>
									Всё наличными
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop = rubToKopecks(splitCashRub) + rubToKopecks(splitDepositRub) + rubToKopecks(splitSbpRub);
										setSplitCardRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-blue-400 cursor-pointer"
								>
									Остаток на карту
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop = rubToKopecks(splitCardRub) + rubToKopecks(splitDepositRub) + rubToKopecks(splitSbpRub);
										setSplitCashRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 cursor-pointer"
								>
									Остаток наличными
								</button>
							</div>

							{/* Parity indicator */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-bold">
								<span>Всего распределено:</span>
								<span className={`font-mono text-sm ${isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
									{totalAllocatedRub.toLocaleString("ru-RU")} / {totalDueRub.toLocaleString("ru-RU")} ₽
									{isBalanced ? " ✓ Совпадает" : " ⚠ Не сходится"}
								</span>
							</div>

							<button
								type="button"
								onClick={handleSplitSubmit}
								disabled={isSubmittingSplit}
								title={!isBalanced ? "Автоматически сбалансирует остаток и проведет оплату" : undefined}
								className="min-h-[44px] w-full rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all bg-purple-600 hover:bg-purple-700 active:scale-98 disabled:opacity-50"
							>
								<CheckCircle size={16} />
								<span>{isSubmittingSplit ? "Фиксация..." : `Подтвердить комбинированную оплату ${totalDueRub} ₽`}</span>
							</button>
						</div>
					) : (
						<div className="space-y-4" data-testid="payment-family-deposit-view">
							<div className="p-4 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Wallet className="w-5 h-5 text-pink-600" />
										<h3 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
											Оплата с депозита / семейного баланса
										</h3>
									</div>
									<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
										К списанию: {amountRub} ₽
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
									{/* Personal Deposit Card */}
									<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
												<Wallet size={14} className="text-indigo-600" />
												<span>Лицевой счет (Аванс)</span>
											</div>
											<span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
												{patientDepositRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
											{patientDepositRub >= totalDueRub
												? "Средств на лицевом счете достаточно для полной оплаты."
												: patientDepositRub > 0
													? `Доступно ${patientDepositRub} ₽. Недостает ${(totalDueRub - patientDepositRub).toFixed(2)} ₽.`
													: "На лицевом счете пациента нет авансовых средств."}
										</p>
										<button
											type="button"
											disabled={patientDepositRub < totalDueRub || isSubmittingDeposit}
											onClick={() => handleDepositSubmit("deposit")}
											className="w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-deposit-full"
										>
											<CheckCircle size={14} />
											<span>Списать {amountRub} ₽ с депозита</span>
										</button>
									</div>

									{/* Family Wallet Card */}
									<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
												<Users size={14} className="text-pink-600" />
												<span>Семейный общий баланс</span>
											</div>
											<span className="font-mono text-xs font-extrabold text-pink-700 dark:text-pink-300">
												{patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
											{patientFamilyBalanceRub >= totalDueRub
												? "Семейный баланс покрывает 100% стоимости счета."
												: patientFamilyBalanceRub > 0
													? `Доступно ${patientFamilyBalanceRub} ₽. Недостает ${(totalDueRub - patientFamilyBalanceRub).toFixed(2)} ₽.`
													: "Семейный баланс пуст или не подключен."}
										</p>
										<button
											type="button"
											disabled={patientFamilyBalanceRub < totalDueRub || isSubmittingDeposit}
											onClick={() => handleDepositSubmit("family")}
											className="w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-family-full"
										>
											<CheckCircle size={14} />
											<span>Списать {amountRub} ₽ с семейного счета</span>
										</button>
									</div>
								</div>

								{/* Insufficient Balance 1-Click Combo Resolver */}
								{(patientDepositRub < totalDueRub && patientFamilyBalanceRub < totalDueRub) && (patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
									<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
										<div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
											<Sparkles size={14} className="shrink-0" />
											<span>Недостаточно средств для 100% оплаты со счета. Примените 1-клик комбо:</span>
										</div>
										<div className="flex items-center gap-2 flex-wrap">
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => {
														const totalKop = rubToKopecks(totalDueRub);
														const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
														const remKop = Math.max(0, totalKop - depKop);
														setSplitDepositRub(kopecksToRub(depKop));
														setSplitCardRub(kopecksToRub(remKop));
														setSplitCashRub(0);
														setSplitSbpRub(0);
														setActiveMethod("split");
													}}
													className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
												>
													<CreditCard size={13} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток Картой</span>
												</button>
											)}
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => {
														const totalKop = rubToKopecks(totalDueRub);
														const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
														const remKop = Math.max(0, totalKop - depKop);
														setSplitDepositRub(kopecksToRub(depKop));
														setSplitCashRub(kopecksToRub(remKop));
														setSplitCardRub(0);
														setSplitSbpRub(0);
														setActiveMethod("split");
													}}
													className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
												>
													<Banknote size={13} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток Наличными</span>
												</button>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
