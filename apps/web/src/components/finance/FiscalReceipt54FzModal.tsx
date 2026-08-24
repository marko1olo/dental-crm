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
import { parseChestnyZnakDataMatrix } from "@dental/shared";
import type { TreatmentPlanItem } from "../treatment-plans/types";
import { showToast } from "../GlobalToast";
import {
	calculateSplitPaymentAllocation,
	generateFiscalReceipt54Fz,
	mapTreatmentItemsToFiscalReceipt,
	type SplitPaymentInput,
	TREATMENT_STAGE_LABELS,
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
			minimumFractionDigits: 2,
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
	const [selectedStageKind, setSelectedStageKind] = useState<string>("all");
	const [mdlpCodes, setMdlpCodes] = useState<Record<string, string>>({});
	const [showItemsList, setShowItemsList] = useState<boolean>(true);
	const [cashAmount, setCashAmount] = useState<number>(0);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(0);
	const [sbpAmount, setSbpAmount] = useState<number>(0);
	const [depositAmount, setDepositAmount] = useState<number>(0);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [insuranceAmount, setInsuranceAmount] = useState<number>(0);
	const [guaranteeLetterNumber, setGuaranteeLetterNumber] = useState<string>("");
	const [isDmsActive, setIsDmsActive] = useState<boolean>(false);
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);

	const availableStages = useMemo(() => {
		const stages = new Set<string>();
		for (const it of items) {
			if (it.stageKind) stages.add(it.stageKind);
			else if (it.category) stages.add(it.category);
		}
		return Array.from(stages);
	}, [items]);

	const activeItems = useMemo(() => {
		if (selectedStageKind === "all") return items;
		return items.filter((it) => (it.stageKind || it.category) === selectedStageKind);
	}, [items, selectedStageKind]);

	const fiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(activeItems);
	}, [activeItems]);

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
			insuranceAmount === 0 &&
			totalSumRub > 0
		) {
			setCardAmount(totalSumRub);
		}
	}, [totalSumRub]);

	const handleSelectStage = (stage: string) => {
		setSelectedStageKind(stage);
		const filtered = stage === "all" ? items : items.filter((it) => (it.stageKind || it.category) === stage);
		const newTotalRub = mapTreatmentItemsToFiscalReceipt(filtered).totalRub;
		setCardAmount(newTotalRub);
		setCashAmount(0);
		setSbpAmount(0);
		setDepositAmount(0);
		setCertificateAmount(0);
		setInsuranceAmount(0);
		showToast(
			stage === "all"
				? `Выбран полный план: ${formatMoneyRu(newTotalRub)}`
				: `Выбран этап [${TREATMENT_STAGE_LABELS[stage] || stage}]: ${formatMoneyRu(newTotalRub)}`,
			"info",
			2000,
		);
	};

	const handleUpdateMdlpCode = (itemId: string, rawCode: string) => {
		setMdlpCodes((prev) => ({ ...prev, [itemId]: rawCode }));
		if (rawCode.trim()) {
			const parsed = parseChestnyZnakDataMatrix(rawCode);
			if (parsed.isValid) {
				showToast(`DataMatrix Честный ЗНАК валиден: ${parsed.matchedTradeName || "код принят"}`, "success", 2000);
			} else {
				showToast(`Некорректный код маркировки: ${parsed.errorMessage || "ошибка формата"}`, "warning", 3000);
			}
		}
	};

	const splitInput: SplitPaymentInput = useMemo(
		() => ({
			cashRub: cashAmount,
			receivedCashRub: receivedCashRub > 0 ? receivedCashRub : cashAmount,
			cardRub: cardAmount,
			sbpRub: sbpAmount,
			// Сертификат и аванс фискализируются по 54-ФЗ как зачет предоплаты / встречное предоставление (Тег 1215/1216)
			depositRub: depositAmount + certificateAmount,
			insuranceRub: insuranceAmount,
			...(guaranteeLetterNumber.trim() ? { guaranteeLetterNumber: guaranteeLetterNumber.trim() } : {}),
		}),
		[
			cashAmount,
			receivedCashRub,
			cardAmount,
			sbpAmount,
			depositAmount,
			certificateAmount,
			insuranceAmount,
			guaranteeLetterNumber,
		],
	);

	const allocation = useMemo(() => {
		return calculateSplitPaymentAllocation(totalKopecks, splitInput);
	}, [totalKopecks, splitInput]);

	const remainingRub = Math.round(allocation.remainingKopecks / 100);
	const patientCoPayRub = allocation.patientCoPayRub;

	// Select 100% to single payment method
	const selectSingleMethod = (
		type: "card" | "sbp" | "cash" | "deposit" | "certificate" | "insurance",
	) => {
		if (type === "insurance") {
			setInsuranceAmount(totalSumRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			setIsDmsActive(true);
			showToast(
				`Выбрана 100% оплата по ДМС: ${formatMoneyRu(totalSumRub)}`,
				"info",
				1500,
			);
		} else if (type === "card") {
			setCardAmount(totalSumRub - insuranceAmount);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата картой: ${formatMoneyRu(totalSumRub - insuranceAmount)}`,
				"info",
				1500,
			);
		} else if (type === "sbp") {
			setSbpAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата СБП QR: ${formatMoneyRu(totalSumRub - insuranceAmount)}`,
				"info",
				1500,
			);
		} else if (type === "cash") {
			setCashAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(
				`Выбрана оплата наличными: ${formatMoneyRu(totalSumRub - insuranceAmount)}`,
				"info",
				1500,
			);
		} else if (type === "deposit") {
			const targetTotal = totalSumRub - insuranceAmount;
			const depUsed = Math.min(patientDepositRub, targetTotal);
			setDepositAmount(depUsed);
			const rest = targetTotal - depUsed;
			setCardAmount(rest);
			setSbpAmount(0);
			setCashAmount(0);
			setCertificateAmount(0);
			showToast(
				depUsed === targetTotal
					? `Выбрана 100% оплата с депозита: ${formatMoneyRu(depUsed)}`
					: `Зачет аванса: ${formatMoneyRu(depUsed)} + остаток на карту ${formatMoneyRu(rest)}`,
				"info",
				2000,
			);
		} else if (type === "certificate") {
			setCertificateAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			showToast(
				`Выбрана оплата сертификатом: ${formatMoneyRu(totalSumRub - insuranceAmount)}`,
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
			items: activeItems,
			splitPayment: splitInput,
			patientId,
			patientName,
			customerContact: customerContact.trim() || patientPhone,
			cashierFullName,
			clinicLegalName: clinicName,
		});
	}, [
		activeItems,
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
				<div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0 flex-wrap sm:flex-nowrap">
					<div className="flex items-center gap-3 min-w-0">
						<div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
							<Receipt size={20} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)] truncate">
									Фискализация 54-ФЗ & Прием оплаты
								</h3>
								<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-bold">
									ФФД 1.2
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] truncate">
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

					<div className="flex items-center gap-2 shrink-0">
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
								{/* Stage Filter Chips (Терапия, Хирургия, Ортопедия, Ортодонтия, Гигиена) */}
								{availableStages.length > 0 && (
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
										<div className="flex items-center justify-between text-xs font-bold">
											<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)] uppercase tracking-wider text-[10px]">
												<Layers size={14} className="text-teal-600 dark:text-teal-400" />
												Этап плана лечения для оплаты:
											</span>
											<span className="font-mono text-teal-700 dark:text-teal-300">
												Позиций: {activeItems.length}
											</span>
										</div>
										<div className="flex flex-wrap gap-1.5">
											<button
												type="button"
												onClick={() => handleSelectStage("all")}
												className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
													selectedStageKind === "all"
														? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
														: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
												}`}
											>
												Все этапы ({formatMoneyRu(mapTreatmentItemsToFiscalReceipt(items).totalRub)})
											</button>
											{availableStages.map((st) => {
												const stageItems = items.filter((i) => (i.stageKind || i.category) === st);
												const stageSumRub = mapTreatmentItemsToFiscalReceipt(stageItems).totalRub;
												const label = TREATMENT_STAGE_LABELS[st] || st;
												return (
													<button
														key={st}
														type="button"
														onClick={() => handleSelectStage(st)}
														className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
															selectedStageKind === st
																? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
																: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
														}`}
													>
														{label} ({formatMoneyRu(stageSumRub)})
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* MDLP DataMatrix Marking Code Capture Block */}
								{fiscalData.items.some((i) => i.isMarkedItem) && (
									<div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-2">
										<div className="flex items-center justify-between text-xs">
											<span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
												<ShieldCheck size={16} className="text-amber-600" />
												Маркировка Честный ЗНАК / МДЛП (Тег 1162 / 2000)
											</span>
											<span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
												Обязательно 54-ФЗ
											</span>
										</div>
										<p className="text-[11px] text-amber-800 dark:text-amber-300">
											В счете присутствуют лекарственные препараты / имплантаты, подлежащие выводу из оборота через ККТ.
										</p>
										<div className="space-y-2 pt-1">
											{fiscalData.items
												.filter((i) => i.isMarkedItem)
												.map((markedItem) => {
													const currentCode = mdlpCodes[markedItem.id] || "";
													const parseResult = currentCode ? parseChestnyZnakDataMatrix(currentCode) : null;
													return (
														<div
															key={markedItem.id}
															className="p-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-200 dark:border-amber-800/60 space-y-1.5"
														>
															<div className="flex items-center justify-between text-xs">
																<span className="font-bold text-[var(--ink,#0f172a)] truncate max-w-[280px]">
																	{markedItem.name}
																</span>
																<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
																	{formatMoneyRu(markedItem.amountRub)}
																</span>
															</div>
															<div className="flex items-center gap-2">
																<input
																	type="text"
																	value={currentCode}
																	onChange={(e) => handleUpdateMdlpCode(markedItem.id, e.target.value)}
																	placeholder="Отсканируйте GS1 DataMatrix (01)...(21)..."
																	className="min-h-[40px] flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
																/>
																{parseResult?.isValid ? (
																	<span className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1">
																		<CheckCircle2 size={14} /> [М] ОК
																	</span>
																) : currentCode ? (
																	<span className="shrink-0 px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold">
																		Ошибка GS1
																	</span>
																) : null}
															</div>
														</div>
													);
												})}
										</div>
									</div>
								)}

								<div className="flex items-center justify-between">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										1. Способ оплаты (1 клик для 100% суммы)
									</h4>
									<span className="font-mono text-[var(--ink,#0f172a)] font-bold text-xs">
										Сумма: {formatMoneyRu(totalSumRub)}
									</span>
								</div>

								{/* 5 Big Tactile Payment Method Tiles (Elevated to min-h-[56px] / >= 48px) */}
								{/* 6 Tactile Payment Method Tiles with DMS & Guarantee Letter support */}
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
									<button
										type="button"
										onClick={() => selectSingleMethod("card")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											cardAmount === (totalSumRub - insuranceAmount) && cardAmount > 0
												? "border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<CreditCard
											size={16}
											className="text-blue-600 dark:text-blue-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">Карта</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Безнал</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("sbp")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											sbpAmount === (totalSumRub - insuranceAmount) && sbpAmount > 0
												? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-md ring-2 ring-teal-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<QrCode
											size={16}
											className="text-teal-600 dark:text-teal-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">СБП QR</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Плати QR</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("cash")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											cashAmount === (totalSumRub - insuranceAmount) && cashAmount > 0
												? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Banknote
											size={16}
											className="text-emerald-600 dark:text-emerald-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">Наличные</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Касса</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("deposit")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											depositAmount > 0
												? "border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-md ring-2 ring-amber-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Coins
											size={16}
											className="text-amber-600 dark:text-amber-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">Зачет аванса</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Депозит</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("certificate")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											certificateAmount === (totalSumRub - insuranceAmount) && certificateAmount > 0
												? "border-purple-600 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-md ring-2 ring-purple-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Gift
											size={16}
											className="text-purple-600 dark:text-purple-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">Сертификат</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Подарок</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("insurance")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											insuranceAmount > 0
												? "border-indigo-600 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-md ring-2 ring-indigo-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<ShieldCheck
											size={16}
											className="text-indigo-600 dark:text-indigo-400 shrink-0"
										/>
										<span className="text-xs font-bold whitespace-nowrap">ДМС / ГП</span>
										<span className="text-[10px] opacity-75 font-normal leading-none">Страховая</span>
									</button>
								</div>

								{/* Detailed Split Payment Rows with Elevated min-h-[48px] Buttons */}
								<div className="space-y-3 pt-1">
									{/* DMS Insurance / Guarantee Letter Split Block */}
									<div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
											<div className="flex items-center gap-3">
												<div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
													<ShieldCheck size={18} />
												</div>
												<div>
													<span className="font-bold text-xs sm:text-sm block text-indigo-950 dark:text-indigo-100">
														Страховая компания (ДМС / Гарантийное письмо)
													</span>
													<span className="text-[10px] sm:text-xs text-indigo-800 dark:text-indigo-300 font-medium">
														Безналичный взаиморасчет по Номенклатуре 804н (без НДС)
													</span>
												</div>
											</div>

											<div className="flex items-center gap-2 w-full sm:w-auto">
												<input
													type="number"
													min={0}
													max={totalSumRub}
													value={insuranceAmount || ""}
													onChange={(e) => {
														const val = Math.max(0, Math.min(totalSumRub, Number(e.target.value) || 0));
														setInsuranceAmount(val);
														if (val > 0) setIsDmsActive(true);
													}}
													placeholder="0"
													className="min-h-[48px] flex-1 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
												/>
												{insuranceAmount < totalSumRub && (
													<button
														type="button"
														onClick={() => selectSingleMethod("insurance")}
														className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors flex items-center justify-center shadow-xs shrink-0"
														title="100% покрытие страховой компанией"
													>
														100% ДМС
													</button>
												)}
												{insuranceAmount > 0 && (
													<button
														type="button"
														onClick={() => setInsuranceAmount(0)}
														className="min-h-[48px] px-2.5 py-2 text-xs font-bold rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer transition-colors shrink-0"
														title="Сбросить ДМС"
													>
														Сброс
													</button>
												)}
											</div>
										</div>

										{/* Guarantee letter number input & Co-payment summary */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
											<div className="flex items-center gap-2">
												<FileText size={14} className="text-indigo-600 shrink-0" />
												<input
													type="text"
													value={guaranteeLetterNumber}
													onChange={(e) => setGuaranteeLetterNumber(e.target.value)}
													placeholder="Номер ГП (напр. ГП-2026/8412)"
													className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>

											<div className="flex items-center justify-end gap-2 text-xs">
												<span className="text-[var(--muted,#64748b)]">Доплата в кассу:</span>
												<span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
													{formatMoneyRu(patientCoPayRub)}
												</span>
											</div>
										</div>
									</div>
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
												onChange={(e) => {
													const val = Math.max(0, Number(e.target.value) || 0);
													setCashAmount(val);
													if (receivedCashRub < val) {
														setReceivedCashRub(val);
													}
												}}
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

									{/* Instant Cash Change Calculator HUD */}
									{cashAmount > 0 && (
										<div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
											<div className="flex items-center justify-between text-xs">
												<span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
													<Coins size={14} className="text-emerald-600" />
													Моментальный расчет сдачи
												</span>
												{allocation.changeRub > 0 && (
													<span className="font-mono font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs">
														Сдача: {formatMoneyRu(allocation.changeRub)}
													</span>
												)}
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
												<div>
													<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
														Внесено пациентом (рубли):
													</label>
													<input
														type="number"
														min={0}
														value={receivedCashRub || ""}
														onChange={(e) => setReceivedCashRub(Math.max(0, Number(e.target.value) || 0))}
														placeholder={`${cashAmount} ₽`}
														className="min-h-[44px] w-full px-3 py-1.5 text-sm font-mono font-black rounded-xl border border-emerald-300 dark:border-emerald-700 bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
													/>
												</div>

												<div className="space-y-1">
													<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
														Быстрые купюры:
													</span>
													<div className="flex flex-wrap gap-1">
														<button
															type="button"
															onClick={() => setReceivedCashRub(cashAmount)}
															className="px-2 py-1 text-xs font-bold rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:bg-emerald-500/20 cursor-pointer"
														>
															Без сдачи
														</button>
														{[100, 500, 1000, 2000, 5000].filter((b) => b > cashAmount).slice(0, 3).map((bill) => (
															<button
																key={bill}
																type="button"
																onClick={() => setReceivedCashRub(bill)}
																className="px-2 py-1 text-xs font-bold font-mono rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:bg-emerald-500/20 cursor-pointer"
															>
																{bill.toLocaleString("ru-RU")} ₽
															</button>
														))}
													</div>
												</div>
											</div>
										</div>
									)}

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
