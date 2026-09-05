/**
 * apps/web/src/components/finance/PaymentModal.tsx
 *
 * DENTE Dental CRM — Universal Payment & Sberbank POS Terminal Modal.
 * Supports Cash, Sberbank POS Terminal, SberPay QR, FacePay Biometry, Family Wallet, and Split Payments.
 */

import React, { useState, useMemo } from "react";
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
	CheckCircle2,
	AlertCircle,
	Coins,
	Building2,
	User,
	FileText,
	Users,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	type SberPosTransactionResponse,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import {
	calculateCashChange,
	validate54FzBuyerInn,
	type PayerType,
} from "./cashboxOperations.js";
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

	// 54-FZ Buyer Details & Cashier Autonomy state (Mandates 8e & 8n)
	const [payerType, setPayerType] = useState<PayerType>("physical");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerInnError, setBuyerInnError] = useState<string | null>(null);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(totalDueRub);

	const cashChange = useMemo(() => {
		return calculateCashChange(totalDueRub, receivedCashRub);
	}, [receivedCashRub, totalDueRub]);

	const handleInnChange = (value: string) => {
		const cleaned = value.replace(/\D/g, "").slice(0, 12);
		setBuyerInn(cleaned);
		if (cleaned.length > 0) {
			const validation = validate54FzBuyerInn(cleaned, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Некорректный ИНН");
			} else {
				setBuyerInnError(null);
			}
		} else {
			setBuyerInnError(null);
		}
	};

	const applyExactCashPreset = () => {
		setActiveMethod("cash");
		setReceivedCashRub(totalDueRub);
		setSplitCashRub(totalDueRub);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		showToast(`Применен пресет: Без сдачи (${totalDueRub.toLocaleString("ru-RU")} ₽ нал)`, "info", 2000);
	};

	const applyFullCardPreset = () => {
		setActiveMethod("card_terminal");
		setSplitCardRub(totalDueRub);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		showToast(`Применен пресет: Оплата картой 100% (${totalDueRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const applyDepositPlusCardPreset = () => {
		const available = Math.min(totalDueRub, patientDepositRub);
		const remainder = Number((totalDueRub - available).toFixed(2));
		setSplitDepositRub(available);
		setSplitCardRub(remainder);
		setSplitCashRub(0);
		setSplitSbpRub(0);
		setActiveMethod("split");
		showToast(
			`Применен пресет: Аванс ${available.toLocaleString("ru-RU")} ₽ + Карта ${remainder.toLocaleString("ru-RU")} ₽`,
			"info",
			3000,
		);
	};

	if (!isOpen) return null;

	const amountRub = (amountKopecks / 100).toFixed(2);

	const handleCashSubmit = async () => {
		if (payerType === "legal_entity") {
			const validation = validate54FzBuyerInn(buyerInn, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
				showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
				return;
			}
		}

		setIsSubmittingCash(true);
		try {
			const clientMutationId = `cash:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const amountRubNumber = Number((amountKopecks / 100).toFixed(2));
			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const changeNote = cashChange.changeRub > 0 ? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)` : "";

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
					note: `Оплата наличными через кассу (${amountRub} ₽)${changeNote}${innNote}`,
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
		if (payerType === "legal_entity") {
			const validation = validate54FzBuyerInn(buyerInn, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
				showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
				return;
			}
		}

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
			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
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
					note: `Комбинированная оплата: ${parts.join(" + ")}${innNote}`,
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

	const handleDepositOrPartialCombo = (source: "deposit" | "family") => {
		const availableBalance = source === "deposit" ? patientDepositRub : patientFamilyBalanceRub;
		if (availableBalance >= totalDueRub) {
			handleDepositSubmit(source);
		} else if (availableBalance > 0) {
			const totalKop = rubToKopecks(totalDueRub);
			const balKop = Math.min(totalKop, rubToKopecks(availableBalance));
			const remKop = Math.max(0, totalKop - balKop);
			if (source === "deposit") {
				setSplitDepositRub(kopecksToRub(balKop));
				setSplitCardRub(kopecksToRub(remKop));
				setSplitCashRub(0);
				setSplitSbpRub(0);
			} else {
				setSplitDepositRub(kopecksToRub(balKop));
				setSplitCardRub(kopecksToRub(remKop));
				setSplitCashRub(0);
				setSplitSbpRub(0);
			}
			setActiveMethod("split");
			showToast(
				`Зачтено ${kopecksToRub(balKop)} ₽ ${source === "family" ? "из семьи" : "с аванса"}. Остаток ${kopecksToRub(remKop)} ₽ перенесён на карту.`,
				"info",
				3500,
			);
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
							<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
								<CheckCircle2 size={12} />
								<span>54-ФЗ</span>
							</span>
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

				{/* 1-Click Fast Presets Bar (Mandates 8e & 8n: Frictionless checkout) */}
				<div className="p-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted,#64748b)]">
						<Zap size={14} className="text-amber-500 shrink-0" />
						<span>1-клик пресеты:</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={applyExactCashPreset}
							className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeMethod === "cash" && cashChange.isExact
									? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-exact-cash"
						>
							<Banknote size={14} className={activeMethod === "cash" && cashChange.isExact ? "text-white" : "text-emerald-600"} />
							<span>Без сдачи ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
						<button
							type="button"
							onClick={applyFullCardPreset}
							className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeMethod === "card_terminal"
									? "bg-blue-600 text-white border-blue-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-full-card"
						>
							<CreditCard size={14} className={activeMethod === "card_terminal" ? "text-white" : "text-blue-600"} />
							<span>Картой 100% ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
						{patientDepositRub > 0 && (
							<button
								type="button"
								onClick={applyDepositPlusCardPreset}
								className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0
										? "bg-purple-600 text-white border-purple-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-deposit-plus-card"
							>
								<Wallet size={14} className={activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0 ? "text-white" : "text-purple-600"} />
								<span>Весь аванс ({Math.min(totalDueRub, patientDepositRub).toLocaleString("ru-RU")} ₽) + Карта</span>
							</button>
						)}
					</div>
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
					{/* 54-FZ Buyer Details (Mandates 8e & 8n: Frictionless, optional for physical persons) */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
								<Building2 size={14} className="text-indigo-600" />
								<span>Чек 54-ФЗ: Данные покупателя</span>
							</div>
							<div className="flex items-center gap-1 p-0.5 bg-[var(--paper,#ffffff)] rounded-lg border border-[var(--line,#e2e8f0)]">
								<button
									type="button"
									onClick={() => {
										setPayerType("physical");
										setBuyerInnError(null);
									}}
									className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "physical"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-physical"
								>
									<User size={12} />
									<span>Физлицо (Гражданин)</span>
								</button>
								<button
									type="button"
									onClick={() => setPayerType("legal_entity")}
									className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "legal_entity"
											? "bg-indigo-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-legal"
								>
									<Building2 size={12} />
									<span>Юрлицо / ИП</span>
								</button>
							</div>
						</div>

						{payerType === "physical" ? (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
									<span className="flex items-center gap-1">
										<FileText size={12} className="text-emerald-600" />
										<span>ИНН пациента (необязательно, для справки НДФЛ 13%):</span>
									</span>
									<span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
										По 54-ФЗ для физлиц не требуется
									</span>
								</div>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="Необязательно (12 цифр для налогового вычета)"
										maxLength={12}
										className="h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
										data-testid="input-buyer-inn-physical"
									/>
									{buyerInn && (
										<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
											{buyerInn.length}/12
										</span>
									)}
								</div>
								{buyerInnError && (
									<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError} (оплата не блокируется)</span>
									</p>
								)}
							</div>
						) : (
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-[var(--ink,#0f172a)] flex items-center justify-between">
									<span>ИНН юридического лица / ИП (10 или 12 цифр):</span>
									<span className="text-[10px] text-indigo-600 font-bold">* Обязательно по 54-ФЗ</span>
								</label>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="Введите 10 цифр (ООО) или 12 цифр (ИП)"
										maxLength={12}
										className={`h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border rounded-lg text-[var(--ink,#0f172a)] outline-none ${
											buyerInnError
												? "border-rose-500 focus:border-rose-600"
												: "border-[var(--line,#e2e8f0)] focus:border-indigo-500"
										}`}
										data-testid="input-buyer-inn-legal"
									/>
									{buyerInn && (
										<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
											{buyerInn.length} знаков
										</span>
									)}
								</div>
								{buyerInnError ? (
									<p className="text-[10px] text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError}</span>
									</p>
								) : buyerInn.length === 10 || buyerInn.length === 12 ? (
									<p className="text-[10px] text-emerald-600 dark:text-emerald-400 m-0 flex items-center gap-1">
										<CheckCircle2 size={10} />
										<span>ИНН валиден по формату 54-ФЗ для B2B расчетов</span>
									</p>
								) : null}
							</div>
						)}
					</div>

					{totalDueRub === 0 && (
						<div
							className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap"
							data-testid="banner-payment-zero-warranty"
						>
							<div className="flex items-center gap-2">
								<CheckCircle size={18} className="text-emerald-600" />
								<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
									Гарантийный прием / 100% скидка (к оплате 0 ₽)
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
									onSuccess({
										method: "warranty_discount_100",
										amountKopecks: 0,
									});
									onClose();
								}}
								className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
								data-testid="btn-payment-close-warranty-zero"
							>
								<Sparkles size={14} />
								<span>Закрыть визит в 1 клик (0 ₽)</span>
							</button>
						</div>
					)}

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
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
									<Banknote size={20} />
								</div>
								<div>
									<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
										Прием наличных денежных средств
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Сумма к внесению в кассу: <strong className="text-[var(--ink,#0f172a)]">{totalDueRub.toLocaleString("ru-RU")} ₽</strong>
									</p>
								</div>
							</div>

							<div className="space-y-2 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center justify-between">
									<span>Получено от пациента наличными, ₽:</span>
									<button
										type="button"
										onClick={() => setReceivedCashRub(totalDueRub)}
										className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
										data-testid="btn-cash-exact-amount"
									>
										<Coins size={12} />
										<span>Ровно без сдачи ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
									</button>
								</label>
								<div className="flex items-center gap-2">
									<input
										type="number"
										min={0}
										step="1"
										value={receivedCashRub || ""}
										onChange={(e) => setReceivedCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-10 w-full px-3 text-base font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
										data-testid="input-cash-received"
									/>
									<button
										type="button"
										onClick={() => setReceivedCashRub(totalDueRub)}
										className="h-10 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
									>
										<Zap size={14} />
										<span>Без сдачи</span>
									</button>
								</div>

								{/* Change Calculation Box */}
								{cashChange.changeRub > 0 ? (
									<div
										className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs"
										data-testid="cash-change-display"
									>
										<span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
											<Coins size={14} />
											<span>Сдача пациенту:</span>
										</span>
										<span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
											{cashChange.changeRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								) : cashChange.isExact ? (
									<div
										className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5"
										data-testid="cash-exact-display"
									>
										<CheckCircle2 size={14} />
										<span>Внесено ровно, без сдачи</span>
									</div>
								) : cashChange.shortageRub > 0 ? (
									<div
										className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between"
										data-testid="cash-shortage-display"
									>
										<span className="flex items-center gap-1.5">
											<AlertCircle size={14} />
											<span>Недостает до полной суммы:</span>
										</span>
										<span className="font-mono font-bold">
											{cashChange.shortageRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								) : null}
							</div>

							<button
								type="button"
								onClick={handleCashSubmit}
								disabled={isSubmittingCash}
								className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
								data-testid="btn-cash-submit"
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
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 cursor-pointer flex items-center gap-1"
									>
										<Zap size={12} />
										<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Карта</span>
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
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 cursor-pointer flex items-center gap-1"
									>
										<Zap size={12} />
										<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Нал</span>
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
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop = rubToKopecks(splitCardRub) + rubToKopecks(splitCashRub) + rubToKopecks(splitDepositRub);
										setSplitSbpRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-purple-400 cursor-pointer"
									data-testid="btn-payment-remainder-sbp"
								>
									Остаток через СБП
								</button>
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const otherKop = rubToKopecks(splitCardRub) + rubToKopecks(splitCashRub) + rubToKopecks(splitSbpRub);
											const remKop = Math.max(0, totalKop - otherKop);
											setSplitDepositRub(kopecksToRub(Math.min(remKop, rubToKopecks(patientDepositRub))));
										}}
										className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-indigo-400 cursor-pointer"
										data-testid="btn-payment-remainder-deposit"
									>
										Остаток из аванса
									</button>
								)}
							</div>

							{/* Parity indicator */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-bold">
								<span>Всего распределено:</span>
								<span className={`font-mono text-sm flex items-center gap-1 ${isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
									<span>{totalAllocatedRub.toLocaleString("ru-RU")} / {totalDueRub.toLocaleString("ru-RU")} ₽</span>
									{isBalanced ? (
										<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
											<CheckCircle2 size={13} /> Совпадает
										</span>
									) : (
										<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-amber-600 dark:text-amber-400">
											<AlertCircle size={13} /> Не сходится
										</span>
									)}
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
											disabled={patientDepositRub <= 0 || isSubmittingDeposit}
											onClick={() => handleDepositOrPartialCombo("deposit")}
											title={
												isSubmittingDeposit
													? "Выполняется списание с депозита..."
													: patientDepositRub >= totalDueRub
													? `Списать ${amountRub} ₽ с личного депозита пациента`
													: patientDepositRub > 0
													? `Зачесть ${patientDepositRub} ₽ с аванса + остаток ${(totalDueRub - patientDepositRub).toFixed(2)} ₽ оплатить картой (в 1 клик)`
													: "На лицевом счете пациента нет авансовых средств"
											}
											className="w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-deposit-full"
										>
											{patientDepositRub >= totalDueRub ? (
												<>
													<CheckCircle size={14} />
													<span>Списать {amountRub} ₽ с депозита</span>
												</>
											) : patientDepositRub > 0 ? (
												<>
													<Zap size={14} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток картой</span>
												</>
											) : (
												<span>На депозите нет средств (0 ₽)</span>
											)}
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
											disabled={patientFamilyBalanceRub <= 0 || isSubmittingDeposit}
											onClick={() => handleDepositOrPartialCombo("family")}
											title={
												isSubmittingDeposit
													? "Выполняется списание с семейного баланса..."
													: patientFamilyBalanceRub >= totalDueRub
													? `Списать ${amountRub} ₽ с семейного баланса`
													: patientFamilyBalanceRub > 0
													? `Зачесть ${patientFamilyBalanceRub} ₽ из семьи + остаток ${(totalDueRub - patientFamilyBalanceRub).toFixed(2)} ₽ оплатить картой (в 1 клик)`
													: "Семейный баланс пуст или не подключен"
											}
											className="w-full min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-family-full"
										>
											{patientFamilyBalanceRub >= totalDueRub ? (
												<>
													<CheckCircle size={14} />
													<span>Списать {amountRub} ₽ с семейного счета</span>
												</>
											) : patientFamilyBalanceRub > 0 ? (
												<>
													<Zap size={14} />
													<span>Зачесть из семьи {patientFamilyBalanceRub} ₽ + остаток картой</span>
												</>
											) : (
												<span>Семейный баланс пуст (0 ₽)</span>
											)}
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
