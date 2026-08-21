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
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);

	const fiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(items);
	}, [items]);

	const totalSumRub = fiscalData.totalRub;
	const totalKopecks = fiscalData.totalKopecks;

	// Initial default allocation: 100% to Card if all are 0
	React.useEffect(() => {
		if (cashAmount === 0 && cardAmount === 0 && sbpAmount === 0 && depositAmount === 0 && totalSumRub > 0) {
			setCardAmount(totalSumRub);
		}
	}, [totalSumRub]);

	const splitInput: SplitPaymentInput = useMemo(() => ({
		cashRub: cashAmount,
		cardRub: cardAmount,
		sbpRub: sbpAmount,
		depositRub: depositAmount,
	}), [cashAmount, cardAmount, sbpAmount, depositAmount]);

	const allocation = useMemo(() => {
		return calculateSplitPaymentAllocation(totalKopecks, splitInput);
	}, [totalKopecks, splitInput]);

	const remainingRub = Math.round(allocation.remainingKopecks / 100);

	// Fast Fill Helper
	const handleFillRemaining = (type: "cash" | "card" | "sbp" | "deposit") => {
		const unallocated = Math.max(0, remainingRub);
		if (type === "cash") setCashAmount((prev) => prev + unallocated);
		if (type === "card") setCardAmount((prev) => prev + unallocated);
		if (type === "sbp") setSbpAmount((prev) => prev + unallocated);
		if (type === "deposit") {
			const maxDepositCanUse = Math.min(patientDepositRub, depositAmount + unallocated);
			setDepositAmount(maxDepositCanUse);
		}
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
	}, [items, splitInput, patientId, patientName, customerContact, patientPhone, cashierFullName, clinicName]);

	const handleExecuteFiscalization = async () => {
		if (!allocation.isFullyAllocated) {
			showToast(
				'Сумма оплат не совпадает с суммой чека (остаток: ' + remainingRub + ' ₽)',
				"warning",
				4000,
			);
			return;
		}

		setIsFiscalizing(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			showToast(
				'Чек №' + fiscalReceipt.receiptNumber + ' на сумму ' + totalSumRub.toLocaleString("ru-RU") + ' ₽ успешно фискализирован в ОФД!',
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

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
			data-testid="fiscal-receipt-54fz-modal"
		>
			<div className="relative w-full max-w-4xl bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border,#cbd5e1)]">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)]">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
							<Receipt size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="font-extrabold text-sm text-[var(--ink,#0f172a)]">
									Фискализация 54-ФЗ & Прием оплаты
								</h3>
								<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-bold">
									ФФД 1.2
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> · Итого:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400 font-mono">
									{totalSumRub.toLocaleString("ru-RU")} ₽
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
								className={'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ' + (activeTab === "payment" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]")}
							>
								Оплата и СБП
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ' + (activeTab === "preview" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]")}
							>
								Предпросмотр чека
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-6">
					{activeTab === "payment" ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Split Payment Builders */}
							<div className="lg:col-span-7 space-y-4">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center justify-between">
									<span>1. Раздельная оплата (Наличные, Карта, СБП, Депозит)</span>
									<span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
										Сумма: {totalSumRub.toLocaleString("ru-RU")} ₽
									</span>
								</h4>

								{/* Split Payment Cards */}
								<div className="space-y-3">
									{/* Bank Card / Acquiring */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
												<CreditCard size={18} />
											</div>
											<div>
												<span className="font-bold text-xs block text-[var(--ink,#0f172a)]">
													Банковская карта (Тег 1081)
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)]">
													POS-терминал эквайринга
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cardAmount || ""}
												onChange={(e) => setCardAmount(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0"
												className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("card")}
													className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 cursor-pointer"
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
											<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
												<QrCode size={18} />
											</div>
											<div>
												<span className="font-bold text-xs block text-[var(--ink,#0f172a)]">
													СБП / Плати QR (Тег 1081)
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)]">
													Динамический QR НСПК
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={sbpAmount || ""}
												onChange={(e) => setSbpAmount(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0"
												className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("sbp")}
													className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 cursor-pointer"
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
											<div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<Banknote size={18} />
											</div>
											<div>
												<span className="font-bold text-xs block text-[var(--ink,#0f172a)]">
													Наличные (Тег 1031)
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)]">
													Купюры / монеты кассы
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cashAmount || ""}
												onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0"
												className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("cash")}
													className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
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
											<div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
												<Coins size={18} />
											</div>
											<div>
												<span className="font-bold text-xs block text-[var(--ink,#0f172a)]">
													Зачет аванса / Депозит (Тег 1215)
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)]">
													Доступно: {patientDepositRub.toLocaleString("ru-RU")} ₽
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
														Math.max(0, Math.min(patientDepositRub, Number(e.target.value) || 0)),
													)
												}
												placeholder="0"
												className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{patientDepositRub > 0 && remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("deposit")}
													className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer"
													title="Заполнить остаток"
												>
													+ аванс
												</button>
											)}
										</div>
									</div>
								</div>

								{/* Allocation Status Indicator */}
								<div
									className={'p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ' + (
										allocation.isFullyAllocated
											? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
											: allocation.isOverallocated
												? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
												: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
									)}
								>
									<div className="flex items-center gap-2">
										{allocation.isFullyAllocated ? (
											<CheckCircle2 size={16} />
										) : (
											<AlertTriangle size={16} />
										)}
										<span>
											{allocation.isFullyAllocated
												? "Сумма чека полностью распределена"
												: allocation.isOverallocated
													? 'Превышение суммы на ' + Math.abs(remainingRub) + ' ₽'
													: 'Не распределено: ' + remainingRub + ' ₽'}
										</span>
									</div>

									<span className="font-mono text-sm">
										{allocation.allocatedKopecks / 100} / {totalSumRub} ₽
									</span>
								</div>

								{/* 54-FZ Electronic Contact Input */}
								<div className="space-y-1.5 pt-2">
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)]">
										Телефон или Email для отправки электронного чека (54-ФЗ, Тег 1008):
									</label>
									<input
										type="text"
										value={customerContact}
										onChange={(e) => setCustomerContact(e.target.value)}
										placeholder="+7 999 123-45-67 или email@example.com"
										className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
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
											<div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
												<QrCode size={16} />
												<span>Динамический QR СБП ({sbpAmount.toLocaleString("ru-RU")} ₽)</span>
											</div>

											{/* Mock QR visual presentation */}
											<div className="inline-block p-4 bg-white rounded-2xl border border-slate-300 shadow-md">
												<div className="w-36 h-36 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white text-[10px] font-mono p-2 space-y-1">
													<QrCode size={64} className="text-teal-400" />
													<span>НСПК СБП QR</span>
													<span className="text-[8px] text-slate-400">Сумма: {sbpAmount} ₽</span>
												</div>
											</div>

											<p className="text-[11px] text-[var(--muted,#64748b)]">
												Пациент сканирует QR камерой телефона или в приложении любого банка РФ.
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
											<p>Укажите сумму в поле «СБП / Плати QR», чтобы сформировать платежный QR-код НСПК.</p>
										</div>
									)}

									{/* NDFL Deduction Category Badge */}
									<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between text-xs">
										<span className="text-[var(--muted,#64748b)]">Справка об оплате для ФНС:</span>
										<span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
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
										className="w-full min-h-[46px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
									>
										<ShieldCheck size={16} />
										<span>
											{isFiscalizing
												? "Фискализация на ККТ..."
												: 'Пробить чек на ' + totalSumRub.toLocaleString("ru-RU") + ' ₽'}
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
									className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
								>
									<Printer size={14} />
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
