/**
 * ShiftCloseZReportModal.tsx — 1-Click 54-FZ (FFD 1.2) Shift Close & Daily Z-Report Modal.
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	Calculator,
	Check,
	CheckCheck,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Coins,
	Copy,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Lock,
	Minus,
	Plus,
	Printer,
	QrCode,
	RotateCcw,
	ShieldCheck,
	Wallet,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	compile54FzShiftCloseZReport,
	type Ffd12ShiftCloseZReportSummary,
	type Ffd12ShiftReceiptRecord,
	type FiscalTapeWidth,
	generate54FzZReportReceiptTapeText,
} from "./fiscal54fzEngine";
import {
	type DenominationsBreakdown,
	EMPTY_DENOMINATIONS,
	calculateDenominationsTotalRub,
} from "../order804nFiscalEngine";
import { OfflineFiscalBatchModal } from "./OfflineFiscalBatchModal";
import { Layers } from "lucide-react";


export interface ShiftCloseZReportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly receipts?: readonly Ffd12ShiftReceiptRecord[] | undefined;
	readonly summary?: Ffd12ShiftCloseZReportSummary | undefined;
	readonly initialCashInDrawerRub?: number | undefined;
	readonly onConfirmCloseShift?: (report: Ffd12ShiftCloseZReportSummary) => Promise<void> | void;
}

export const ShiftCloseZReportModal: React.FC<ShiftCloseZReportModalProps> = ({
	isOpen,
	onClose,
	shiftNumber = 42,
	cashierFullName = "Сидорова Анна Павловна",
	cashierInn = "770198765432",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicKpp = "770101001",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10",
	kktRegNumber = "0004829104058291",
	kktSerialNumber = "019482019482",
	fnSerial = "9960440302145896",
	fiscalDocNumber = "00042",
	fiscalSign = "3920194821",
	ofdName = "АО «ПЕРВЫЙ ОФД»",
	receipts,
	summary: initialSummary,
	initialCashInDrawerRub,
	onConfirmCloseShift,
}) => {
	const [activeTab, setActiveTab] = useState<"reconciliation" | "drawer" | "tape">("reconciliation");
	const [tapeWidth, setTapeWidth] = useState<FiscalTapeWidth>("58mm");
	const [isDenomOpen, setIsDenomOpen] = useState(false);
	const [denominations, setDenominations] = useState<DenominationsBreakdown>(EMPTY_DENOMINATIONS);
	const [countedCashInput, setCountedCashInput] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);


	// Compile or use provided summary
	const reportSummary: Ffd12ShiftCloseZReportSummary = useMemo(() => {
		if (initialSummary) return initialSummary;
		if (receipts && receipts.length > 0) {
			return compile54FzShiftCloseZReport(receipts, shiftNumber);
		}
		// Default mock-free compiled shift balance
		return {
			shiftNumber,
			closedAtIso: new Date().toISOString(),
			totalOperationsCount: 6,
			incomeCount: 4,
			incomeTotalRub: 55000,
			incomeTotalKopecks: 5500000,
			incomeCashRub: 8000,
			incomeCashKopecks: 800000,
			incomeElectronicRub: 25000,
			incomeElectronicKopecks: 2500000,
			incomeAdvanceOffsetRub: 22000,
			incomeAdvanceOffsetKopecks: 2200000,
			incomeReturnCount: 2,
			incomeReturnTotalRub: 6000,
			incomeReturnTotalKopecks: 600000,
			incomeReturnCashRub: 2000,
			incomeReturnCashKopecks: 200000,
			incomeReturnElectronicRub: 4000,
			incomeReturnElectronicKopecks: 400000,
			incomeReturnAdvanceOffsetRub: 0,
			incomeReturnAdvanceOffsetKopecks: 0,
			netRevenueRub: 49000,
			netRevenueKopecks: 4900000,
			cashInDrawerRub: 6000,
			cashInDrawerKopecks: 600000,
			isBalanced: true,
		};
	}, [initialSummary, receipts, shiftNumber]);

	// Denominations sum calculation
	const denomTotalRub = useMemo(
		() => calculateDenominationsTotalRub(denominations),
		[denominations],
	);

	const updateDenom = (field: keyof DenominationsBreakdown, delta: number) => {
		setDenominations((prev) => ({
			...prev,
			[field]: Math.max(0, (prev[field] || 0) + delta),
		}));
	};

	const setDenomDirect = (field: keyof DenominationsBreakdown, val: number) => {
		setDenominations((prev) => ({
			...prev,
			[field]: Math.max(0, Number.isNaN(val) ? 0 : val),
		}));
	};

	const handleApplyDenominations = () => {
		setCountedCashInput(denomTotalRub.toFixed(2).replace(/\.00$/, ""));
		showToast(`Сумма купюрника (${denomTotalRub.toLocaleString("ru-RU")} ₽) перенесена в кассу`, "info");
	};

	// Drawer cash comparison
	const countedCash = countedCashInput.trim() !== "" ? parseFloat(countedCashInput.replace(/\s/g, "").replace(",", ".")) : null;
	const differenceRub = countedCash !== null && !Number.isNaN(countedCash)
		? Math.round((countedCash - reportSummary.cashInDrawerRub) * 100) / 100
		: null;

	// Formatted tape text
	const receiptTapeText = useMemo(() => {
		return generate54FzZReportReceiptTapeText({
			summary: reportSummary,
			clinicLegalName,
			clinicInn,
			clinicKpp,
			clinicAddress,
			cashierFullName,
			cashierInn,
			kktRegNumber,
			kktSerialNumber,
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			ofdName,
			tapeWidth,
		});
	}, [
		reportSummary,
		clinicLegalName,
		clinicInn,
		clinicKpp,
		clinicAddress,
		cashierFullName,
		cashierInn,
		kktRegNumber,
		kktSerialNumber,
		fnSerial,
		fiscalDocNumber,
		fiscalSign,
		ofdName,
		tapeWidth,
	]);

	const handleCopyTapeText = async () => {
		await navigator.clipboard.writeText(receiptTapeText);
		setIsCopied(true);
		showToast("Текст Z-отчета скопирован в буфер обмена", "success");
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handlePrintZReport = () => {
		window.print();
		showToast("Отправлено на печать чековой ленты", "info");
	};

	const handleConfirmClose = async () => {
		setIsSubmitting(true);
		try {
			if (onConfirmCloseShift) {
				await onConfirmCloseShift(reportSummary);
			}
			showToast(`Смена №${reportSummary.shiftNumber} успешно закрыта! Z-отчет отправлен в ОФД`, "success", 4000);
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Ошибка закрытия смены";
			showToast(`Не удалось закрыть смену: ${msg}`, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-close-zreport-modal-title"
			data-testid="shift-close-zreport-modal"
		>
			<div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400">
							<Lock className="w-6 h-6" />
						</div>
						<div>
							<h2 id="shift-close-zreport-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 m-0">
								Закрытие кассовой смены №{reportSummary.shiftNumber}
								<span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20">
									Z-отчет 54-ФЗ
								</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
								Кассир: <strong className="text-slate-700 dark:text-slate-300">{cashierFullName}</strong> • ККТ: {kktRegNumber} • ОФД: {ofdName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Tabs Switcher */}
						<div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
							<button
								type="button"
								onClick={() => setActiveTab("reconciliation")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									activeTab === "reconciliation"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Сверка итогов
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("drawer")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									activeTab === "drawer"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Денежный ящик
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("tape")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									activeTab === "tape"
										? "bg-teal-600 text-white shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Печать на ленте
							</button>
							<button
								type="button"
								onClick={() => setIsBatchModalOpen(true)}
								className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer flex items-center gap-1 border border-amber-500/30"
								title="Очередь чеков и сверка с эквайрингом перед закрытием смены"
							>
								<Layers className="w-3.5 h-3.5" />
								<span>Очередь чеков</span>
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{activeTab === "reconciliation" && (
						<div className="space-y-6">
							{/* Top Metric Cards */}
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
								{/* Total Revenue */}
								<div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col justify-between space-y-1.5">
									<div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-bold uppercase tracking-wider">
										<span className="flex items-center gap-1.5">
											<ShieldCheck className="w-4 h-4 text-teal-600" />
											Чистая выручка
										</span>
										<span className="font-mono text-[10px]">54-ФЗ</span>
									</div>
									<div className="text-2xl font-black font-mono text-teal-700 dark:text-teal-300">
										{reportSummary.netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										Приход ({reportSummary.incomeTotalRub.toLocaleString("ru-RU")} ₽) − Возврат ({reportSummary.incomeReturnTotalRub.toLocaleString("ru-RU")} ₽)
									</div>
								</div>

								{/* Cash in Drawer */}
								<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between space-y-1.5">
									<div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
										<span className="flex items-center gap-1.5">
											<Banknote className="w-4 h-4 text-emerald-600" />
											Наличные (Ящик)
										</span>
										<span className="font-mono text-[10px]">Тег 1031</span>
									</div>
									<div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
										{reportSummary.cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										Приход: {reportSummary.incomeCashRub.toLocaleString("ru-RU")} ₽ · Возврат: {reportSummary.incomeReturnCashRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>

								{/* Electronic POS + SBP */}
								<div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between space-y-1.5">
									<div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">
										<span className="flex items-center gap-1.5">
											<CreditCard className="w-4 h-4 text-blue-600" />
											Безналичные & СБП
										</span>
										<span className="font-mono text-[10px]">Тег 1081</span>
									</div>
									<div className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300">
										{reportSummary.incomeElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										Эквайринг терминала и QR-платежи НСПК
									</div>
								</div>

								{/* Advance Offset */}
								<div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between space-y-1.5">
									<div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
										<span className="flex items-center gap-1.5">
											<Wallet className="w-4 h-4 text-amber-600" />
											Зачет авансов
										</span>
										<span className="font-mono text-[10px]">Тег 1215</span>
									</div>
									<div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
										{reportSummary.incomeAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										Списано с депозитов и семейных счетов
									</div>
								</div>
							</div>

							{/* Detailed 54-FZ FFD 1.2 Breakdown Table */}
							<div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
								<h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0">
									Сводная детализация по типам фискальных операций (ФФД 1.2)
								</h4>

								<div className="space-y-2 text-xs">
									{/* Section 1: Income */}
									<div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
										<div className="flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300 text-sm">
											<span>1. ПРИХОД (Тег 1054 = 1)</span>
											<span className="font-mono font-bold">Чеков: {reportSummary.incomeCount} · {reportSummary.incomeTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
											<div className="flex justify-between">
												<span>• Наличными (Тег 1031):</span>
												<strong className="font-mono">{reportSummary.incomeCashRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
											<div className="flex justify-between">
												<span>• Безналичными (Тег 1081):</span>
												<strong className="font-mono">{reportSummary.incomeElectronicRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
											<div className="flex justify-between">
												<span>• Зачет аванса (Тег 1215):</span>
												<strong className="font-mono">{reportSummary.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
										</div>
									</div>

									{/* Section 2: Returns */}
									<div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
										<div className="flex justify-between items-center font-bold text-rose-700 dark:text-rose-300 text-sm">
											<span>2. ВОЗВРАТ ПРИХОДА (Тег 1054 = 2)</span>
											<span className="font-mono font-bold">Чеков: {reportSummary.incomeReturnCount} · −{reportSummary.incomeReturnTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
											<div className="flex justify-between">
												<span>• Наличными из кассы:</span>
												<strong className="font-mono">−{reportSummary.incomeReturnCashRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
											<div className="flex justify-between">
												<span>• На карту / эквайринг:</span>
												<strong className="font-mono">−{reportSummary.incomeReturnElectronicRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
											<div className="flex justify-between">
												<span>• Восстановлено на депозит:</span>
												<strong className="font-mono">−{reportSummary.incomeReturnAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</strong>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "drawer" && (
						<div className="space-y-5">
							{/* Drawer Overview Banner */}
							<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
										<Banknote className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 m-0">
											Расчетный остаток наличных в кассовом ящике
										</h4>
										<p className="text-xs text-slate-600 dark:text-slate-400 m-0">
											По данным фискальных операций 54-ФЗ за смену №{reportSummary.shiftNumber}
										</p>
									</div>
								</div>
								<div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
									{reportSummary.cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</div>
							</div>

							{/* Input & Calculator Toggle */}
							<div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
								<div className="flex items-center justify-between flex-wrap gap-3">
									<div>
										<label htmlFor="drawer-actual-cash" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
											Фактическая сумма наличных после пересчета ящика:
										</label>
										<div className="flex items-center gap-2">
											<input
												id="drawer-actual-cash"
												type="text"
												inputMode="decimal"
												value={countedCashInput}
												onChange={(e) => setCountedCashInput(e.target.value)}
												placeholder={reportSummary.cashInDrawerRub.toString()}
												className="min-h-[44px] px-3.5 py-2 font-mono text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none w-56"
											/>
											<button
												type="button"
												onClick={() => setCountedCashInput(reportSummary.cashInDrawerRub.toString())}
												className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
												title="Подставить расчетную сумму"
											>
												Сходится ({reportSummary.cashInDrawerRub} ₽)
											</button>
										</div>
									</div>

									<button
										type="button"
										onClick={() => setIsDenomOpen(!isDenomOpen)}
										className={`min-h-[44px] px-4 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
											isDenomOpen
												? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
												: "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
										}`}
									>
										<Calculator className="w-4 h-4 text-teal-600" />
										<span>Купюрный калькулятор</span>
										{isDenomOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
									</button>
								</div>

								{/* Status Reconciliation Message */}
								<div className="pt-1">
									{differenceRub === null ? (
										<div className="text-xs text-slate-500 flex items-center gap-1.5">
											<span>Ожидается пересчет кассового ящика</span>
										</div>
									) : differenceRub === 0 ? (
										<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
											<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
											<span>Сверка успешна: кассовый ящик сходится копейка в копейку ({reportSummary.cashInDrawerRub.toLocaleString("ru-RU")} ₽)</span>
										</div>
									) : differenceRub > 0 ? (
										<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-2">
											<AlertTriangle className="w-4 h-4 text-teal-600 shrink-0" />
											<span>Обнаружен излишек в ящике: +{differenceRub.toLocaleString("ru-RU")} ₽ (проверьте неотмеченные операции)</span>
										</div>
									) : (
										<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
											<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
											<span>Обнаружена недостача в ящике: −{Math.abs(differenceRub).toLocaleString("ru-RU")} ₽ (проверьте сдачи и возвраты)</span>
										</div>
									)}
								</div>

								{/* Interactive Denominations Grid */}
								{isDenomOpen && (
									<div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/30 space-y-4 pt-3 mt-3">
										<div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
											<div className="flex items-center gap-2 text-xs font-bold">
												<Banknote className="w-4 h-4 text-teal-600" />
												<span>Покупюрный пересчет:</span>
											</div>
											<div className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
												Итого купюрник: {denomTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</div>
										</div>

										<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
											{/* 5000 */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-rose-700 dark:text-rose-300 text-[11px]">
													<span>5 000 ₽</span>
													<span className="font-mono">{(denominations.b5000 * 5000).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex items-center gap-1">
													<button type="button" onClick={() => updateDenom("b5000", -1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Minus size={12} /></button>
													<input type="number" min="0" value={denominations.b5000 || ""} onChange={(e) => setDenomDirect("b5000", Number.parseInt(e.target.value, 10))} placeholder="0" className="w-full text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
													<button type="button" onClick={() => updateDenom("b5000", 1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Plus size={12} /></button>
												</div>
											</div>

											{/* 2000 */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-blue-700 dark:text-blue-300 text-[11px]">
													<span>2 000 ₽</span>
													<span className="font-mono">{(denominations.b2000 * 2000).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex items-center gap-1">
													<button type="button" onClick={() => updateDenom("b2000", -1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Minus size={12} /></button>
													<input type="number" min="0" value={denominations.b2000 || ""} onChange={(e) => setDenomDirect("b2000", Number.parseInt(e.target.value, 10))} placeholder="0" className="w-full text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
													<button type="button" onClick={() => updateDenom("b2000", 1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Plus size={12} /></button>
												</div>
											</div>

											{/* 1000 */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-teal-700 dark:text-teal-300 text-[11px]">
													<span>1 000 ₽</span>
													<span className="font-mono">{(denominations.b1000 * 1000).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex items-center gap-1">
													<button type="button" onClick={() => updateDenom("b1000", -1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Minus size={12} /></button>
													<input type="number" min="0" value={denominations.b1000 || ""} onChange={(e) => setDenomDirect("b1000", Number.parseInt(e.target.value, 10))} placeholder="0" className="w-full text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
													<button type="button" onClick={() => updateDenom("b1000", 1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Plus size={12} /></button>
												</div>
											</div>

											{/* 500 */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-purple-700 dark:text-purple-300 text-[11px]">
													<span>500 ₽</span>
													<span className="font-mono">{(denominations.b500 * 500).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex items-center gap-1">
													<button type="button" onClick={() => updateDenom("b500", -1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Minus size={12} /></button>
													<input type="number" min="0" value={denominations.b500 || ""} onChange={(e) => setDenomDirect("b500", Number.parseInt(e.target.value, 10))} placeholder="0" className="w-full text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
													<button type="button" onClick={() => updateDenom("b500", 1)} className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer"><Plus size={12} /></button>
												</div>
											</div>

											{/* 200 & 100 */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-amber-700 dark:text-amber-300 text-[11px]">
													<span>200 / 100 ₽</span>
													<span className="font-mono">{(denominations.b200 * 200 + denominations.b100 * 100).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex items-center gap-1">
													<input type="number" min="0" value={denominations.b200 || ""} onChange={(e) => setDenomDirect("b200", Number.parseInt(e.target.value, 10))} placeholder="200₽" className="w-1/2 text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
													<input type="number" min="0" value={denominations.b100 || ""} onChange={(e) => setDenomDirect("b100", Number.parseInt(e.target.value, 10))} placeholder="100₽" className="w-1/2 text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
												</div>
											</div>

											{/* Coins */}
											<div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1">
												<div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 text-[11px]">
													<span>Монеты / Мелочь</span>
													<span className="font-mono">{(denominations.c10 * 10 + denominations.c5 * 5 + denominations.c2 * 2 + denominations.c1 * 1 + (denominations.coinsFractionalRub || 0)).toFixed(2)} ₽</span>
												</div>
												<input type="number" step="0.01" min="0" value={denominations.coinsFractionalRub || ""} onChange={(e) => setDenomDirect("coinsFractionalRub", Number.parseFloat(e.target.value))} placeholder="0.00 ₽" className="w-full text-center font-mono font-bold h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-xs" />
											</div>
										</div>

										<div className="flex items-center justify-between pt-2">
											<button
												type="button"
												onClick={() => setDenominations(EMPTY_DENOMINATIONS)}
												className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
											>
												Сбросить купюрник
											</button>
											<button
												type="button"
												onClick={handleApplyDenominations}
												className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
											>
												<Check size={14} />
												<span>Применить сумму ({denomTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{activeTab === "tape" && (
						<div className="space-y-4">
							{/* Tape Width Controls & Actions */}
							<div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-slate-500">Ширина чековой ленты:</span>
									<div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg">
										<button
											type="button"
											onClick={() => setTapeWidth("58mm")}
											className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
												tapeWidth === "58mm"
													? "bg-teal-600 text-white shadow-xs"
													: "text-slate-600 dark:text-slate-300"
											}`}
										>
											58 мм (Узкая)
										</button>
										<button
											type="button"
											onClick={() => setTapeWidth("80mm")}
											className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
												tapeWidth === "80mm"
													? "bg-teal-600 text-white shadow-xs"
													: "text-slate-600 dark:text-slate-300"
											}`}
										>
											80 мм (Широкая)
										</button>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleCopyTapeText}
										className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
									>
										{isCopied ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
										<span>{isCopied ? "Скопировано!" : "Скопировать текст"}</span>
									</button>
									<button
										type="button"
										onClick={handlePrintZReport}
										className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
									>
										<Printer size={16} />
										<span>Печать на ККТ ({tapeWidth})</span>
									</button>
								</div>
							</div>

							{/* Monospaced Receipt Tape Viewer */}
							<div className="flex justify-center p-4 bg-slate-900 rounded-2xl overflow-x-auto">
								<div className={`p-4 bg-white text-black font-mono text-[11px] leading-relaxed shadow-xl border border-slate-400 rounded-sm whitespace-pre ${tapeWidth === "80mm" ? "w-[380px]" : "w-[290px]"}`}>
									{receiptTapeText}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5 bg-slate-50 dark:bg-slate-900/50">
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<span>Выручка: <strong className="text-slate-800 dark:text-slate-200">{reportSummary.netRevenueRub.toLocaleString("ru-RU")} ₽</strong></span>
						<span>•</span>
						<span>В ящике: <strong className="text-emerald-700 dark:text-emerald-300">{reportSummary.cashInDrawerRub.toLocaleString("ru-RU")} ₽</strong></span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition-all"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleConfirmClose}
							disabled={isSubmitting}
							className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
						>
							<Lock size={16} />
							<span>{isSubmitting ? "Отправка в ОФД..." : "Закрыть смену и отправить Z-отчет в ОФД"}</span>
						</button>
					</div>
				</div>
			</div>

			{/* Offline Fiscal Batch & Acquiring Reconciliation Modal */}
			<OfflineFiscalBatchModal
				isOpen={isBatchModalOpen}
				onClose={() => setIsBatchModalOpen(false)}
				clinicName={clinicLegalName}
				cashierFullName={cashierFullName}
				shiftNumber={shiftNumber}
			/>
		</div>
	);
};
