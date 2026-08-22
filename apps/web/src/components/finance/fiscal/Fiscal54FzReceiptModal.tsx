/**
 * Fiscal54FzReceiptModal.tsx — 54-FZ FFD 1.2 Interactive Fiscalization & Multi-Tender Split Modal.
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Banknote,
	Check,
	CheckCircle2,
	Coins,
	CreditCard,
	FileText,
	Layers,
	Printer,
	QrCode,
	Receipt,
	Send,
	ShieldCheck,
	Sparkles,
	Tag,
	Wallet,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	type SplitTenderState,
	validateDataMatrixBarcode,
} from "./fiscal54fzEngine";
import { FiscalReceiptPrintView } from "./FiscalReceiptPrintView";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export interface Fiscal54FzReceiptModalProps {
	readonly isOpen: boolean;
	readonly items: readonly FiscalItemDraft[];
	readonly patientId: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly patientDepositRub?: number;
	readonly cashierFullName?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: (receiptData: unknown) => void;
}

export const Fiscal54FzReceiptModal: React.FC<Fiscal54FzReceiptModalProps> = ({
	isOpen,
	items,
	patientId,
	patientName = "Пациент",
	patientPhone = "+7 (999) 000-00-00",
	patientDepositRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	onClose,
	onReceiptFiscalized,
}) => {
	if (!isOpen) return null;

	const [activeTab, setActiveTab] = useState<"split" | "preview">("split");
	const [cashAmount, setCashAmount] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(0);
	const [sbpAmount, setSbpAmount] = useState<number>(0);
	const [advanceOffsetAmount, setAdvanceOffsetAmount] = useState<number>(0);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);
	const [itemMarkingCodes, setItemMarkingCodes] = useState<Record<string, string>>({});

	// Merge item marking codes
	const currentItems = useMemo(() => {
		return items.map((it) => ({
			...it,
			markingCode: itemMarkingCodes[it.id] ?? it.markingCode ?? undefined,
		}));
	}, [items, itemMarkingCodes]);

	const tenders: SplitTenderState = useMemo(() => ({
		cashRub: Number(cashAmount) || 0,
		cardRub: Number(cardAmount) || 0,
		sbpRub: Number(sbpAmount) || 0,
		advanceOffsetRub: Number(advanceOffsetAmount) || 0,
		certificateRub: Number(certificateAmount) || 0,
	}), [cashAmount, cardAmount, sbpAmount, advanceOffsetAmount, certificateAmount]);

	const summary = useMemo(() => {
		return compileFiscalDraftSummary(currentItems, tenders);
	}, [currentItems, tenders]);

	// Initialize default 100% to Card on mount
	React.useEffect(() => {
		if (
			cashAmount === 0 &&
			cardAmount === 0 &&
			sbpAmount === 0 &&
			advanceOffsetAmount === 0 &&
			certificateAmount === 0 &&
			summary.totalRub > 0
		) {
			if (patientDepositRub > 0) {
				const offset = Math.min(summary.totalRub, patientDepositRub);
				setAdvanceOffsetAmount(offset);
				setCardAmount(Math.max(0, summary.totalRub - offset));
			} else {
				setCardAmount(summary.totalRub);
			}
		}
	}, [summary.totalRub, patientDepositRub]);

	const handleOneClickMethod = (method: "card" | "cash" | "sbp" | "deposit_all") => {
		setCashAmount(0);
		setCardAmount(0);
		setSbpAmount(0);
		setAdvanceOffsetAmount(0);
		setCertificateAmount(0);

		if (method === "card") {
			setCardAmount(summary.totalRub);
		} else if (method === "cash") {
			setCashAmount(summary.totalRub);
		} else if (method === "sbp") {
			setSbpAmount(summary.totalRub);
		} else if (method === "deposit_all") {
			const offset = Math.min(summary.totalRub, patientDepositRub);
			setAdvanceOffsetAmount(offset);
			setCardAmount(Math.max(0, summary.totalRub - offset));
		}
	};

	const handleMarkingCodeChange = (itemId: string, code: string) => {
		setItemMarkingCodes((prev) => ({
			...prev,
			[itemId]: code,
		}));
	};

	const handleExecuteFiscalization = async () => {
		if (!summary.isFullyAllocated) {
			showToast(`Небаланс оплаты: Сумма оплат должна точно совпадать с итогом (${summary.totalRubFormatted} ₽). Остаток: ${summary.remainingRub.toFixed(2)} ₽`, "error");
			return;
		}

		setIsFiscalizing(true);
		try {
			const payload = {
				patientId,
				customerContact,
				cashierFullName,
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: summary.totalKopecks,
				cashKopecks: Math.round(tenders.cashRub * 100),
				electronicCardKopecks: Math.round(tenders.cardRub * 100),
				sbpKopecks: Math.round(tenders.sbpRub * 100),
				prepaidKopecks: Math.round((tenders.advanceOffsetRub + tenders.certificateRub) * 100),
				items: currentItems.map((it) => ({
					name: it.name,
					priceKopecks: Math.round(it.priceRub * 100),
					quantity: it.quantity,
					amountKopecks: Math.round((it.priceRub * it.quantity - (it.discountRub || 0)) * 100),
					medicalServiceCode804n: it.code804n || null,
					subject: it.subject,
					method: it.method,
					vatRate: it.vatRate,
					measure: it.measure,
					markingCode: it.markingCode || null,
					taxDeductionCode: it.taxDeductionCategory === "2" ? "code_2_expensive_treatment" : "code_1_standard_treatment",
				})),
				taxDeductionSummaryCode: summary.overallTaxDeductionCategory === "2" ? "code_2_expensive_treatment" : "code_1_standard_treatment",
			};

			const response = await fetch("/api/fiscal/receipts", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Ошибка фискализации чека");
			}

			const result = await response.json();
			showToast(`Чек успешно фискализирован: ФД №${result.fiscalDocumentNumber || "1"} · ФПД ${result.fiscalSign || "0"}`, "success");

			onReceiptFiscalized?.(result);
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Не удалось отправить чек на кассу";
			showToast(`Ошибка фискализации: ${message}`, "error");
		} finally {
			setIsFiscalizing(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
			<div
				className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
				data-testid="fiscal-54fz-modal"
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
							<Receipt className="w-6 h-6" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								Фискализация по 54-ФЗ (ФФД 1.2)
								<span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
									Online ККТ
								</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Пациент: <span className="font-semibold text-slate-700 dark:text-slate-300">{patientName}</span>
								{patientDepositRub > 0 && (
									<span className="ml-2 text-blue-600 dark:text-blue-400">
										· Депозит: {patientDepositRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
							<button
								type="button"
								onClick={() => setActiveTab("split")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									activeTab === "split"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Раздельная оплата
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
									activeTab === "preview"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Вид чека
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{activeTab === "split" ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Tenders & 1-Click Fast Allocators */}
							<div className="lg:col-span-7 space-y-5">
								{/* 1-Click Fast Actions */}
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
										1-Click Способ оплаты
									</label>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										<button
											type="button"
											onClick={() => handleOneClickMethod("card")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-white dark:bg-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-200 transition-all text-center"
										>
											<CreditCard className="w-5 h-5 text-blue-600" />
											<span className="text-xs font-bold">100% Картой</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("cash")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-200 transition-all text-center"
										>
											<Banknote className="w-5 h-5 text-emerald-600" />
											<span className="text-xs font-bold">100% Наличные</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("sbp")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-200 transition-all text-center"
										>
											<QrCode className="w-5 h-5 text-purple-600" />
											<span className="text-xs font-bold">100% СБП QR</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("deposit_all")}
											disabled={patientDepositRub <= 0}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 transition-all text-center disabled:opacity-40 disabled:pointer-events-none"
										>
											<Wallet className="w-5 h-5 text-indigo-600" />
											<span className="text-xs font-bold">Зачет депозита</span>
										</button>
									</div>
								</div>

								{/* Multi-Tender Inputs */}
								<div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
										Разделение сумм по видам оплат (рубли)
									</label>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<CreditCard className="w-3.5 h-3.5 text-blue-500" /> Банковская карта (Тег 1081)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={cardAmount || ""}
												onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<Banknote className="w-3.5 h-3.5 text-emerald-500" /> Наличные (Тег 1031)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={cashAmount || ""}
												onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<QrCode className="w-3.5 h-3.5 text-purple-500" /> СБП QR / SberPay (Тег 1081)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={sbpAmount || ""}
												onChange={(e) => setSbpAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<Wallet className="w-3.5 h-3.5 text-indigo-500" /> Зачет аванса / депозита (Тег 1215)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={advanceOffsetAmount || ""}
												onChange={(e) => setAdvanceOffsetAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>
									</div>
								</div>

								{/* Electronic Delivery Contact */}
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
										Контакты для электронного чека (Тег 1008 — SMS / Email)
									</label>
									<input
										type="text"
										value={customerContact}
										onChange={(e) => setCustomerContact(e.target.value)}
										placeholder="+79991234567 или patient@example.com"
										className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
									/>
								</div>
							</div>

							{/* Right Column: Positions Review & DataMatrix Scanner Input */}
							<div className="lg:col-span-5 space-y-4">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
										Номенклатура ({currentItems.length})
									</label>
									{summary.overallTaxDeductionCategory === "2" && (
										<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
											Код 02 (Дорогостоящее)
										</span>
									)}
								</div>

								<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
									{currentItems.map((it, idx) => {
										const isMarked = Boolean(it.markingCode || it.name.toLowerCase().includes("анестетик") || it.name.toLowerCase().includes("имплант"));
										return (
											<div
												key={it.id || idx}
												className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
											>
												<div className="flex justify-between items-start text-xs font-bold text-slate-900 dark:text-slate-100">
													<span className="line-clamp-1">{idx + 1}. {it.name}</span>
													<span className="font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
														{(it.priceRub * it.quantity).toFixed(2)} ₽
													</span>
												</div>

												{isMarked && (
													<div className="pt-1">
														<div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
															<Tag className="w-3 h-3 text-emerald-500" />
															<span>Код маркировки DataMatrix:</span>
														</div>
														<input
															type="text"
															value={itemMarkingCodes[it.id] ?? it.markingCode ?? ""}
															onChange={(e) => handleMarkingCodeChange(it.id, e.target.value)}
															placeholder="Отсканируйте DataMatrix (01)0366... "
															className="w-full px-2.5 py-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
														/>
													</div>
												)}
											</div>
										);
									})}
								</div>

								{/* Parity & Totals Card */}
								<div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
									<div className="flex justify-between text-xs text-slate-400">
										<span>Итого по чеку:</span>
										<span className="font-bold text-white text-sm">{summary.totalRubFormatted} ₽</span>
									</div>
									<div className="flex justify-between text-xs text-slate-400">
										<span>Распределено:</span>
										<span className="font-bold text-emerald-400 text-sm">{summary.allocatedRub.toFixed(2)} ₽</span>
									</div>
									<div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
										<span>Баланс:</span>
										{summary.isFullyAllocated ? (
											<span className="flex items-center gap-1 text-emerald-400 font-bold">
												<CheckCircle2 className="w-4 h-4" /> Точно (0.00 ₽)
											</span>
										) : summary.isOverallocated ? (
											<span className="flex items-center gap-1 text-rose-400 font-bold">
												<AlertCircle className="w-4 h-4" /> Переплата (+{Math.abs(summary.remainingRub).toFixed(2)} ₽)
											</span>
										) : (
											<span className="flex items-center gap-1 text-amber-400 font-bold">
												<AlertTriangle className="w-4 h-4" /> Не хватает ({summary.remainingRub.toFixed(2)} ₽)
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="py-2">
							<FiscalReceiptPrintView
								clinicName={clinicName}
								clinicInn={clinicInn}
								cashierFullName={cashierFullName}
								customerContact={customerContact}
								patientName={patientName}
								items={currentItems}
								tenders={tenders}
								totalRub={summary.totalRub}
								totalRubFormatted={summary.totalRubFormatted}
							/>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						Федеральный закон № 54-ФЗ · Приказ ФНС № ЕД-7-20/662@
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleExecuteFiscalization}
							disabled={!summary.isFullyAllocated || isFiscalizing}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-600/25 transition-all"
						>
							{isFiscalizing ? (
								<>Печать чека на ККТ...</>
							) : (
								<>
									<Printer className="w-4 h-4" />
									Фискализировать и напечатать
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
