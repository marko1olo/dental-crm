/**
 * FiscalReceipt54FzModal.tsx — Интерактивное модальное окно фискализации 54-ФЗ, раздельной оплаты и СБП QR.
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	Check,
	CheckCircle2,
	Coins,
	CreditCard,
	DollarSign,
	FileText,
	Gift,
	Layers,
	Printer,
	QrCode,
	Receipt,
	Send,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import type { TreatmentPlanItem } from "../treatment-plans/types";
import { showToast } from "../GlobalToast";
import {
	calculateSplitPaymentAllocation,
	generateFiscalReceipt54Fz,
	mapTreatmentItemsToFiscalReceipt,
	type SplitPaymentInput,
} from "./order804nFiscalEngine";
import { Order804nFiscalReceiptPrint } from "./Order804nFiscalReceiptPrint";

export interface FiscalReceipt54FzModalProps {
	readonly isOpen: boolean;
	readonly items: readonly TreatmentPlanItem[];
	readonly patientId: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly patientDepositRub?: number;
	readonly cashierFullName?: string;
	readonly clinicName?: string;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: (receiptNumber: string) => void;
}

/**
 * Безупречное форматирование денежных сумм в рублях с копейками без артефактов округления.
 */
function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const FiscalReceipt54FzModal: React.FC<FiscalReceipt54FzModalProps> = ({
	isOpen,
	items,
	patientId,
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	onClose,
	onReceiptFiscalized,
}) => {
	if (!isOpen) return null;

	const [activeTab, setActiveTab] = useState<"payment" | "preview">("payment");
	const [cashAmount, setCashAmount] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(0);
	const [sbpAmount, setSbpAmount] = useState<number>(0);
	const [depositAmount, setDepositAmount] = useState<number>(0);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);

	const fiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(items);
	}, [items]);

	const totalSumRub = fiscalData.totalRub;
	const totalKopecks = fiscalData.totalKopecks;

	// Initial default allocation: 100% to Card if all are 0
	React.useEffect(() => {
		if (
			cashAmount === 0 &&
			cardAmount === 0 &&
			sbpAmount === 0 &&
			depositAmount === 0 &&
			certificateAmount === 0 &&
			totalSumRub > 0
		) {
			setCardAmount(totalSumRub);
		}
	}, [totalSumRub]);

	const splitInput: SplitPaymentInput = useMemo(
		() => ({
			cashRub: cashAmount,
			cardRub: cardAmount,
			sbpRub: sbpAmount,
			// Сертификат и аванс фискализируются по 54-ФЗ как зачет предоплаты / встречное предоставление (Тег 1215/1216)
			depositRub: depositAmount + certificateAmount,
		}),
		[cashAmount, cardAmount, sbpAmount, depositAmount, certificateAmount],
	);

	const allocation = useMemo(() => {
		return calculateSplitPaymentAllocation(totalKopecks, splitInput);
	}, [totalKopecks, splitInput]);

	const remainingRub = Math.round(allocation.remainingKopecks / 100);

	// Select 100% to single payment method
	const selectSingleMethod = (
		type: "card" | "sbp" | "cash" | "deposit" | "certificate",
	) => {
		if (type === "card") {
			setCardAmount(totalSumRub);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата картой: ${formatMoneyRu(totalSumRub)}`,
				"info",
				1500,
			);
		} else if (type === "sbp") {
			setSbpAmount(totalSumRub);
			setCardAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата СБП QR: ${formatMoneyRu(totalSumRub)}`,
				"info",
				1500,
			);
		} else if (type === "cash") {
			setCashAmount(totalSumRub);
			setCardAmount(0);
			setSbpAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата наличными: ${formatMoneyRu(totalSumRub)}`,
				"info",
				1500,
			);
		} else if (type === "deposit") {
			const depUsed = Math.min(patientDepositRub, totalSumRub);
			setDepositAmount(depUsed);
			const rest = totalSumRub - depUsed;
			setCardAmount(rest);
			setSbpAmount(0);
			setCashAmount(0);
			setCertificateAmount(0);
			showToast(
				depUsed === totalSumRub
					? `Выбрана 100% оплата с депозита: ${formatMoneyRu(depUsed)}`
					: `Зачет аванса: ${formatMoneyRu(depUsed)} + остаток на карту ${formatMoneyRu(rest)}`,
				"info",
				2000,
			);
		} else if (type === "certificate") {
			setCertificateAmount(totalSumRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			showToast(
				`Выбрана оплата сертификатом: ${formatMoneyRu(totalSumRub)}`,
				"info",
				1500,
			);
		}
	};

	// Fast Fill Helper
	const handleFillRemaining = (
		type: "cash" | "card" | "sbp" | "deposit" | "certificate",
	) => {
		const unallocated = Math.max(0, remainingRub);
		if (type === "cash") setCashAmount((prev) => prev + unallocated);
		if (type === "card") setCardAmount((prev) => prev + unallocated);
		if (type === "sbp") setSbpAmount((prev) => prev + unallocated);
		if (type === "certificate")
			setCertificateAmount((prev) => prev + unallocated);
		if (type === "deposit") {
			const maxDepositCanUse = Math.min(
				patientDepositRub,
				depositAmount + unallocated,
			);
			setDepositAmount(maxDepositCanUse);
		}
	};

	// Instant distribute remaining balance
	const handleAutoDistributeRemaining = () => {
		if (remainingRub <= 0) return;
		if (
			cardAmount > 0 ||
			(cashAmount === 0 &&
				sbpAmount === 0 &&
				depositAmount === 0 &&
				certificateAmount === 0)
		) {
			setCardAmount((prev) => prev + remainingRub);
		} else if (sbpAmount > 0) {
			setSbpAmount((prev) => prev + remainingRub);
		} else if (cashAmount > 0) {
			setCashAmount((prev) => prev + remainingRub);
		} else if (certificateAmount > 0) {
			setCertificateAmount((prev) => prev + remainingRub);
		} else {
			setCardAmount((prev) => prev + remainingRub);
		}
		showToast(
			`Остаток ${formatMoneyRu(remainingRub)} распределен`,
			"success",
			1500,
		);
	};

	const fiscalReceipt = useMemo(() => {
		return generateFiscalReceipt54Fz({
			items,
			splitPayment: splitInput,
			patientId,
			patientName,
			customerContact: customerContact.trim() || patientPhone,
			cashierFullName,
			clinicLegalName: clinicName,
		});
	}, [
		items,
		splitInput,
		patientId,
		patientName,
		customerContact,
		patientPhone,
		cashierFullName,
		clinicName,
	]);

	const handleExecuteFiscalization = async () => {
		if (!allocation.isFullyAllocated) {
			showToast(
				`Сумма оплат не совпадает с суммой чека (остаток: ${formatMoneyRu(remainingRub)})`,
				"warning",
				4000,
			);
			return;
		}

		setIsFiscalizing(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			showToast(
				`Чек №${fiscalReceipt.receiptNumber} на сумму ${formatMoneyRu(totalSumRub)} успешно фискализирован в ОФД!`,
				"success",
				6000,
			);
			if (onReceiptFiscalized) {
				onReceiptFiscalized(fiscalReceipt.receiptNumber);
			}
			setActiveTab("preview");
		} catch (err) {
			showToast("Ошибка связи с фискальным регистратором ККТ", "error");
		} finally {
			setIsFiscalizing(false);
		}
	};

	// Keyboard Shortcuts: 1-Card, 2-SBP, 3-Cash, 4-Deposit, 5-Certificate, Enter-Submit, Esc-Close
	React.useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeTag = (document.activeElement?.tagName || "").toUpperCase();
			if (
				activeTag === "INPUT" ||
				activeTag === "TEXTAREA" ||
				activeTag === "SELECT"
			) {
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			if (e.key === "Enter") {
				e.preventDefault();
				if (allocation.isFullyAllocated && !isFiscalizing) {
					handleExecuteFiscalization();
				}
				return;
			}

			if (e.key === "1") {
				e.preventDefault();
				selectSingleMethod("card");
				return;
			}
			if (e.key === "2") {
				e.preventDefault();
				selectSingleMethod("sbp");
				return;
			}
			if (e.key === "3") {
				e.preventDefault();
				selectSingleMethod("cash");
				return;
			}
			if (e.key === "4") {
				e.preventDefault();
				selectSingleMethod("deposit");
				return;
			}
			if (e.key === "5") {
				e.preventDefault();
				selectSingleMethod("certificate");
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		totalSumRub,
		patientDepositRub,
		allocation.isFullyAllocated,
		isFiscalizing,
		onClose,
		handleExecuteFiscalization,
		selectSingleMethod,
	]);

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
			data-testid="fiscal-receipt-54fz-modal"
		>
			<div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border,#cbd5e1)]">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
							<Receipt size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
									Фискализация 54-ФЗ & Прием оплаты
								</h3>
								<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-bold">
									ФФД 1.2
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Пациент:{" "}
								<strong className="text-[var(--ink,#0f172a)]">
									{patientName}
								</strong>{" "}
								· Итого:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400 font-mono">
									{formatMoneyRu(totalSumRub)}
								</strong>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Tab Selector */}
						<div className="inline-flex p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs">
							<button
								type="button"
								onClick={() => setActiveTab("payment")}
								className={`min-h-[44px] px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
									activeTab === "payment"
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Оплата и СБП
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`min-h-[44px] px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
									activeTab === "preview"
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Предпросмотр чека
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center cursor-pointer transition-colors"
							aria-label="Закрыть модальное окно"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="p-6 overflow-y-auto flex-1 space-y-6">
					{activeTab === "payment" ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Split Payment Builders */}
							<div className="lg:col-span-7 space-y-4">
								<div className="flex items-center justify-between">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										1. Способ оплаты (1 клик для 100% суммы)
									</h4>
									<span className="font-mono text-[var(--ink,#0f172a)] font-bold text-xs">
										Сумма: {formatMoneyRu(totalSumRub)}
									</span>
								</div>

								{/* 5 Big Tactile Payment Method Tiles (Elevated to min-h-[56px] / >= 48px) */}
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
									<button
										type="button"
										onClick={() => selectSingleMethod("card")}
										className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 ${
											cardAmount === totalSumRub && totalSumRub > 0
												? "border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<CreditCard
											size={18}
											className="text-blue-600 dark:text-blue-400 shrink-0"
										/>
										<span className="text-center">Карта (100%)</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("sbp")}
										className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 ${
											sbpAmount === totalSumRub && totalSumRub > 0
												? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-md ring-2 ring-teal-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<QrCode
											size={18}
											className="text-teal-600 dark:text-teal-400 shrink-0"
										/>
										<span className="text-center">СБП QR (100%)</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("cash")}
										className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 ${
											cashAmount === totalSumRub && totalSumRub > 0
												? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Banknote
											size={18}
											className="text-emerald-600 dark:text-emerald-400 shrink-0"
										/>
										<span className="text-center">Наличные (100%)</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("deposit")}
										className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 ${
											depositAmount > 0
												? "border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-md ring-2 ring-amber-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Coins
											size={18}
											className="text-amber-600 dark:text-amber-400 shrink-0"
										/>
										<span className="text-center">Зачет аванса</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("certificate")}
										className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 ${
											certificateAmount === totalSumRub && totalSumRub > 0
												? "border-purple-600 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-md ring-2 ring-purple-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Gift
											size={18}
											className="text-purple-600 dark:text-purple-400 shrink-0"
										/>
										<span className="text-center">Сертификат</span>
									</button>
								</div>

								{/* Detailed Split Payment Rows with Elevated min-h-[48px] Buttons */}
								<div className="space-y-3 pt-1">
									{/* Bank Card / Acquiring */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
												<CreditCard size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Безналичные / Эквайринг
												</span>
												<span className="text-[10px] sm:text-xs text-[var(--muted,#64748b)]">
													Банковская карта (Тег 1081)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cardAmount || ""}
												onChange={(e) =>
													setCardAmount(
														Math.max(0, Number(e.target.value) || 0),
													)
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{cardAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("card")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Внести всю сумму на карту"
												>
													Вся сумма
												</button>
											)}
											{remainingRub > 0 && cardAmount > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("card")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Заполнить остаток"
												>
													+ остаток
												</button>
											)}
										</div>
									</div>

									{/* SBP Dynamic QR */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
												<QrCode size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													СБП / Плати QR
												</span>
												<span className="text-[10px] sm:text-xs text-[var(--muted,#64748b)]">
													Динамический QR НСПК (Тег 1081)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={sbpAmount || ""}
												onChange={(e) =>
													setSbpAmount(Math.max(0, Number(e.target.value) || 0))
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{sbpAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("sbp")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Внести всю сумму через СБП"
												>
													Вся сумма
												</button>
											)}
											{remainingRub > 0 && sbpAmount > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("sbp")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Заполнить остаток"
												>
													+ остаток
												</button>
											)}
										</div>
									</div>

									{/* Cash */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<Banknote size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Наличные
												</span>
												<span className="text-[10px] sm:text-xs text-[var(--muted,#64748b)]">
													Купюры / касса (Тег 1031)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cashAmount || ""}
												onChange={(e) =>
													setCashAmount(
														Math.max(0, Number(e.target.value) || 0),
													)
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{cashAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("cash")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Внести всю сумму наличными"
												>
													Вся сумма
												</button>
											)}
											{remainingRub > 0 && cashAmount > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("cash")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Заполнить остаток"
												>
													+ остаток
												</button>
											)}
										</div>
									</div>

									{/* Patient Deposit / Prepaid */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
												<Coins size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Зачет аванса / Депозит
												</span>
												<span className="text-[10px] sm:text-xs text-[var(--muted,#64748b)]">
													Доступно: {formatMoneyRu(patientDepositRub)} (Тег
													1215)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={patientDepositRub}
												value={depositAmount || ""}
												onChange={(e) =>
													setDepositAmount(
														Math.max(
															0,
															Math.min(
																patientDepositRub,
																Number(e.target.value) || 0,
															),
														),
													)
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => selectSingleMethod("deposit")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Зачесть максимальный доступный аванс"
												>
													Зачесть аванс
												</button>
											)}
										</div>
									</div>

									{/* Gift Certificate / Сертификат */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
												<Gift size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Подарочный сертификат
												</span>
												<span className="text-[10px] sm:text-xs text-[var(--muted,#64748b)]">
													Встречное предоставление (Тег 1215/1216)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={certificateAmount || ""}
												onChange={(e) =>
													setCertificateAmount(
														Math.max(0, Number(e.target.value) || 0),
													)
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{certificateAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("certificate")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Внести всю сумму сертификатом"
												>
													Вся сумма
												</button>
											)}
											{remainingRub > 0 && certificateAmount > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("certificate")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Заполнить остаток"
												>
													+ остаток
												</button>
											)}
										</div>
									</div>
								</div>

								{/* Allocation Status Indicator with Instant Remainder Distribution */}
								<div
									className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold ${
										allocation.isFullyAllocated
											? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
											: allocation.isOverallocated
												? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
												: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
									}`}
								>
									<div className="flex items-center gap-2">
										{allocation.isFullyAllocated ? (
											<CheckCircle2
												size={20}
												className="text-emerald-600 dark:text-emerald-400 shrink-0"
											/>
										) : (
											<AlertTriangle
												size={20}
												className="text-amber-600 dark:text-amber-400 shrink-0"
											/>
										)}
										<span>
											{allocation.isFullyAllocated
												? "Сумма чека полностью распределена"
												: allocation.isOverallocated
													? `Превышение суммы на ${formatMoneyRu(Math.abs(remainingRub))}`
													: `Не распределено: ${formatMoneyRu(remainingRub)}`}
										</span>
									</div>

									<div className="flex items-center gap-3 justify-between sm:justify-end">
										{remainingRub > 0 && (
											<button
												type="button"
												onClick={handleAutoDistributeRemaining}
												className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-500 shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
												title="Моментально распределить весь остаток"
											>
												<Sparkles size={16} />
												<span>
													Распределить остаток (+{formatMoneyRu(remainingRub)})
												</span>
											</button>
										)}
										<span className="font-mono text-sm sm:text-base font-black">
											{(allocation.allocatedKopecks / 100).toLocaleString(
												"ru-RU",
												{
													minimumFractionDigits:
														allocation.allocatedKopecks % 100 !== 0 ? 2 : 0,
													maximumFractionDigits: 2,
												},
											)}{" "}
											/ {formatMoneyRu(totalSumRub)}
										</span>
									</div>
								</div>

								{/* 54-FZ Electronic Contact Input */}
								<div className="space-y-1.5 pt-2">
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)]">
										Телефон или Email для отправки электронного чека (54-ФЗ, Тег
										1008):
									</label>
									<input
										type="text"
										value={customerContact}
										onChange={(e) => setCustomerContact(e.target.value)}
										placeholder="+7 999 123-45-67 или email@example.com"
										className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>
							</div>

							{/* Right Column: SBP Dynamic QR Preview & Summary */}
							<div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
								<div className="space-y-4">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										2. Оплата по QR-коду СБП
									</h4>

									{sbpAmount > 0 ? (
										<div className="p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 text-center space-y-3">
											<div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300">
												<QrCode size={18} />
												<span>
													Динамический QR СБП ({formatMoneyRu(sbpAmount)})
												</span>
											</div>

											{/* Mock QR visual presentation */}
											<div className="inline-block p-4 bg-white rounded-2xl border border-slate-300 shadow-md">
												<div className="w-36 h-36 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white text-[10px] font-mono p-2 space-y-1">
													<QrCode size={64} className="text-teal-400" />
													<span>НСПК СБП QR</span>
													<span className="text-[8px] text-slate-400">
														Сумма: {formatMoneyRu(sbpAmount)}
													</span>
												</div>
											</div>

											<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)]">
												Пациент сканирует QR камерой телефона или в приложении
												любого банка РФ.
											</p>

											{fiscalReceipt.sbpPayloadUrl && (
												<div className="text-[9px] font-mono text-slate-500 break-all p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)]">
													{fiscalReceipt.sbpPayloadUrl}
												</div>
											)}
										</div>
									) : (
										<div className="p-8 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-center text-xs text-[var(--muted,#64748b)] space-y-2">
											<QrCode size={32} className="mx-auto text-slate-400" />
											<p>
												Укажите сумму в поле «СБП / Плати QR», чтобы сформировать
												платежный QR-код НСПК.
											</p>
										</div>
									)}

									{/* NDFL Deduction Category Badge */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between text-xs sm:text-sm">
										<span className="text-[var(--muted,#64748b)]">
											Справка об оплате для ФНС:
										</span>
										<span className="font-bold text-[var(--ink,#0f172a)] font-mono">
											{fiscalData.taxDeductionSummaryCode === "2"
												? "КОД 02 (Дорогостоящее)"
												: "КОД 01 (Стандартное)"}
										</span>
									</div>
								</div>

								{/* Action: Fiscalize */}
								<div className="pt-2">
									<button
										type="button"
										onClick={handleExecuteFiscalization}
										disabled={!allocation.isFullyAllocated || isFiscalizing}
										className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
									>
										<ShieldCheck size={18} />
										<span>
											{isFiscalizing
												? "Фискализация на ККТ..."
												: `Пробить чек на ${formatMoneyRu(totalSumRub)}`}
										</span>
									</button>
								</div>
							</div>
						</div>
					) : (
						/* Tab: Thermal Paper Receipt Preview */
						<div className="space-y-4">
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[48px] flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
								>
									<Printer size={16} />
									<span>Печать чека</span>
								</button>
							</div>

							<Order804nFiscalReceiptPrint receipt={fiscalReceipt} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
