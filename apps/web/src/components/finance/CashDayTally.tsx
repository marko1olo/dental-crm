import type { Dashboard } from "@dental/shared";
import {
	AlertTriangle,
	Banknote,
	Check,
	CheckCheck,
	CheckCircle2,
	Coins,
	Copy,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Globe,
	Landmark,
	Layers,
	Printer,
	QrCode,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Undo2,
	Wallet,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { countLabel } from "../../lib/russianPlural";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { localDayKey, summarizeCashDay } from "./cashDaySummary";
import {
	generateShiftCloseZReport54Fz,
	type ShiftCloseZReport54FzResult,
} from "./order804nFiscalEngine";
import { OfflineFiscalBatchModal } from "./fiscal/OfflineFiscalBatchModal";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import {
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

type Payment = Dashboard["payments"][number];
type PaymentMethod = Payment["method"];

interface CashDayTallyProps {
	/** Все платежи клиники. undefined — журнал ещё не прочитан. */
	payments: readonly Payment[] | undefined;
	/** Подписи способов оплаты — те же, что в истории оплат на этом экране. */
	methodLabels: Record<string, string>;
	/** Общий money() экрана: «1 500,50 ₽». Своё форматирование денег запрещено. */
	money: (value: number | null) => string;
	cashierFullName?: string | undefined;
	clinicName?: string | undefined;
	clinicInn?: string | undefined;
}

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
	cash: Banknote,
	card: CreditCard,
	bank_transfer: Landmark,
	online: Globe,
	insurance: ShieldCheck,
	family_wallet: Wallet,
	other: Coins,
};

function paymentsCountLabel(count: number): string {
	return countLabel(count, "оплата", "оплаты", "оплат");
}

export function CashDayTally({
	payments,
	methodLabels,
	money,
	cashierFullName = "Сидорова Анна Павловна",
	clinicName = "ООО «ДЕНТЕ КЛИНИКА»",
	clinicInn = "7701234567",
}: CashDayTallyProps) {
	const [countedCashInput, setCountedCashInput] = useState("");
	const [isZReportOpen, setIsZReportOpen] = useState(false);
	const [zReportData, setZReportData] = useState<ShiftCloseZReport54FzResult | null>(null);
	const [isCopiedZReport, setIsCopiedZReport] = useState(false);
	const [isPrintingZReport, setIsPrintingZReport] = useState(false);
	const [isOfflineBatchOpen, setIsOfflineBatchOpen] = useState(false);
	const [pendingQueueCount, setPendingQueueCount] = useState(0);

	useEffect(() => {
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			const count = items.filter(
				(i) => i.status === "pending_print" || i.status === "hardware_offline",
			).length;
			setPendingQueueCount(count);
		});
		return () => {
			unsubscribe();
		};
	}, []);

	const dayKey = localDayKey(new Date()) ?? "";
	const summary = useMemo(
		() => summarizeCashDay(payments, dayKey),
		[payments, dayKey],
	);

	const isLoaded = payments !== undefined;
	const hasAnything =
		summary.receivedCount > 0 ||
		summary.familyWalletRub > 0 ||
		summary.refundedCount > 0;

	const countedCash = normalizeRubAmountInput(countedCashInput);
	const countedCashInvalid =
		Boolean(countedCashInput.trim()) && countedCash === null;

	const differenceRub =
		countedCash === null
			? null
			: (Math.round(countedCash * 100) - Math.round(summary.cashRub * 100)) / 100;

	const handleOpenZReport = () => {
		const report = generateShiftCloseZReport54Fz({
			cashierFullName,
			clinicLegalName: clinicName,
			clinicInn,
			summary,
		});
		setZReportData(report);
		setIsZReportOpen(true);
	};

	const handlePrintAccountingStatement = () => {
		const html = generateFiscalPeriodStatementHtml({
			clinicRequisites: {
				...DEFAULT_CLINIC_FISCAL_REQUISITES,
				name: clinicName,
				inn: clinicInn,
			},
			statementNumber: `СМЕНА-ДЕНЬ-${dayKey}`,
			periodStart: dayKey || new Date().toISOString().slice(0, 10),
			periodEnd: dayKey || new Date().toISOString().slice(0, 10),
			periodLabelRu: `Дневной кассовый отчет за ${new Date().toLocaleDateString("ru-RU")}`,
			shifts: [
				{
					shiftNumber: 42,
					date: dayKey || new Date().toISOString().slice(0, 10),
					cashierFullName,
					receiptsCount: summary.receivedCount,
					cashIncomeRub: summary.cashRub,
					cashIncomeKopecks: Math.round(summary.cashRub * 100),
					cardIncomeRub: summary.cardRub,
					cardIncomeKopecks: Math.round(summary.cardRub * 100),
					sbpIncomeRub: summary.sbpRub,
					sbpIncomeKopecks: Math.round(summary.sbpRub * 100),
					advanceOffsetIncomeRub: summary.familyWalletRub,
					advanceOffsetIncomeKopecks: Math.round(summary.familyWalletRub * 100),
					returnsTotalRub: summary.refundedRub,
					returnsTotalKopecks: Math.round(summary.refundedRub * 100),
					shiftRevenueTotalRub: summary.receivedRub - summary.refundedRub,
					shiftRevenueTotalKopecks: Math.round((summary.receivedRub - summary.refundedRub) * 100),
				},
			],
			bankStatementTotalRub: summary.cardRub + summary.sbpRub,
			bankAcquiringFeeRub: Math.round((summary.cardRub * 0.015 + summary.sbpRub * 0.007) * 100) / 100,
			cashierFullName,
		});

		const w = window.open("", "_blank");
		if (w) {
			w.document.write(html);
			w.document.close();
			w.focus();
			setTimeout(() => w.print(), 250);
		}
	};

	const handleExport1cCsv = () => {
		const csv = exportFiscalPeriodStatementToCsv({
			clinicRequisites: {
				...DEFAULT_CLINIC_FISCAL_REQUISITES,
				name: clinicName,
				inn: clinicInn,
			},
			statementNumber: `СМЕНА-ДЕНЬ-${dayKey}`,
			periodStart: dayKey || new Date().toISOString().slice(0, 10),
			periodEnd: dayKey || new Date().toISOString().slice(0, 10),
			periodLabelRu: `Дневной кассовый отчет за ${new Date().toLocaleDateString("ru-RU")}`,
			shifts: [
				{
					shiftNumber: 42,
					date: dayKey || new Date().toISOString().slice(0, 10),
					cashierFullName,
					receiptsCount: summary.receivedCount,
					cashIncomeRub: summary.cashRub,
					cashIncomeKopecks: Math.round(summary.cashRub * 100),
					cardIncomeRub: summary.cardRub,
					cardIncomeKopecks: Math.round(summary.cardRub * 100),
					sbpIncomeRub: summary.sbpRub,
					sbpIncomeKopecks: Math.round(summary.sbpRub * 100),
					advanceOffsetIncomeRub: summary.familyWalletRub,
					advanceOffsetIncomeKopecks: Math.round(summary.familyWalletRub * 100),
					returnsTotalRub: summary.refundedRub,
					returnsTotalKopecks: Math.round(summary.refundedRub * 100),
					shiftRevenueTotalRub: summary.receivedRub - summary.refundedRub,
					shiftRevenueTotalKopecks: Math.round((summary.receivedRub - summary.refundedRub) * 100),
				},
			],
			bankStatementTotalRub: summary.cardRub + summary.sbpRub,
			bankAcquiringFeeRub: Math.round((summary.cardRub * 0.015 + summary.sbpRub * 0.007) * 100) / 100,
			cashierFullName,
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Cash_Day_1C_Export_${dayKey || new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Дневная ведомость выгружена в CSV для 1С:Бухгалтерии (UTF-8 BOM)", "success");
	};

	const handleCopyZReportText = async () => {
		if (!zReportData) return;
		const text = `
========================================
    ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z-ОТЧЕТ)
           ФФД 1.2 / 54-ФЗ
========================================
${zReportData.clinicLegalName}
ИНН: ${zReportData.clinicInn} КПП: ${zReportData.clinicKpp || "770101001"}
Адрес: ${zReportData.clinicAddress}
----------------------------------------
СМЕНА: №${zReportData.shiftNumber}
ДОКУМЕНТ: №${zReportData.fiscalDocumentNumber}
ДАТА/ВРЕМЯ: ${zReportData.closeDateRu}
КАССИР: ${zReportData.cashierFullName}
----------------------------------------
ИТОГИ СМЕНЫ:
ЧЕКОВ ПРИХОДА: ${zReportData.incomeCount}
СУММА ПРИХОДА: ${zReportData.incomeTotalRub.toLocaleString("ru-RU")} ₽
  - Наличными (Тег 1031): ${zReportData.incomeCashRub.toLocaleString("ru-RU")} ₽
  - Картой/Безнал (Тег 1081): ${zReportData.incomeCardRub.toLocaleString("ru-RU")} ₽
  - СБП QR (Тег 1081): ${zReportData.incomeSbpRub.toLocaleString("ru-RU")} ₽
  - Зачет аванса/семья (Тег 1215): ${zReportData.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽

ЧЕКОВ ВОЗВРАТА: ${zReportData.incomeReturnCount}
СУММА ВОЗВРАТОВ: ${zReportData.incomeReturnTotalRub.toLocaleString("ru-RU")} ₽

ИТОГОВАЯ ВЫРУЧКА ЗА СМЕНУ: ${zReportData.totalRevenueRub.toLocaleString("ru-RU")} ₽
НАЛИЧНЫХ В ЯЩИКЕ: ${zReportData.cashInDrawerCalculatedRub.toLocaleString("ru-RU")} ₽
----------------------------------------
НЕПЕРЕДАННЫХ ФД В ОФД: 0
РЕСУРС ФН: ${zReportData.fnResourceDaysRemaining} дней
РН ККТ: ${zReportData.kktRegNumber}
ЗН ККТ: ${zReportData.kktSerialNumber}
ФН: ${zReportData.fnSerial}
ФПД: ${zReportData.fiscalSign}
ОФД: ${zReportData.ofdName}
========================================
`;
		await navigator.clipboard.writeText(text.trim());
		setIsCopiedZReport(true);
		setTimeout(() => setIsCopiedZReport(false), 2000);
	};

	const handlePrintZReport = () => {
		setIsPrintingZReport(true);
		setTimeout(() => {
			window.print();
			setIsPrintingZReport(false);
		}, 300);
	};

	// Card vs SBP calculation
	const cardSummary = summary.byMethod.find((m) => m.method === "card");
	const sbpSummary = summary.byMethod.find((m) => m.method === "online");
	const cardRub = cardSummary?.amountRub || 0;
	const cardCount = cardSummary?.count || 0;
	const sbpRub = sbpSummary?.amountRub || 0;
	const sbpCount = sbpSummary?.count || 0;

	const headline = !isLoaded
		? "Касса за сегодня: считаем…"
		: hasAnything
			? `Касса за сегодня: пришло ${money(summary.receivedRub)}, из них наличными ${money(summary.cashRub)}`
			: "Касса за сегодня: оплат пока не записано";

	return (
		<details
			className="payment-capture-detail-section"
			data-testid="cash-day-tally"
		>
			<summary>{headline}</summary>
			<div className="smart-details-content space-y-4">
				{!isLoaded ? (
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
						Загружаем оплаты клиники за сегодня. Итог появится, как только
						журнал платежей прочитается.
					</p>
				) : !hasAnything ? (
					<p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
						За сегодня оплат ещё не записано. Здесь появятся все оплаты клиники
						— и наличные, и карта, и переводы, — как только их примут в форме
						«Принять оплату» выше.
					</p>
				) : (
					<>
						{/* Сверка по каналам эквайринга, СБП и наличных */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
							{/* Наличные в ящике */}
							<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<span className="font-bold flex items-center gap-1">
										<Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
										<span>Наличные (Касса)</span>
									</span>
									<span className="font-mono">{summary.byMethod.find((m) => m.method === "cash")?.count || 0} оплат</span>
								</div>
								<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
									{money(summary.cashRub)}
								</div>
								<div className="text-xs">
									{differenceRub === null ? (
										<span className="text-[var(--muted,#64748b)]">Ожидает пересчета ящика</span>
									) : differenceRub === 0 ? (
										<span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
											<CheckCircle2 size={13} />
											<span>Сходится копейка в копейку</span>
										</span>
									) : differenceRub > 0 ? (
										<span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
											<AlertTriangle size={13} />
											<span>Излишек: +{money(differenceRub)}</span>
										</span>
									) : (
										<span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
											<AlertTriangle size={13} />
											<span>Недостача: −{money(-differenceRub)}</span>
										</span>
									)}
								</div>
							</div>

							{/* POS Эквайринг (Карты Сбербанк/МИР) */}
							<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<span className="font-bold flex items-center gap-1">
										<CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
										<span>POS Эквайринг</span>
									</span>
									<span className="font-mono">{cardCount} оплат</span>
								</div>
								<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
									{money(cardRub)}
								</div>
								<div className="text-xs text-[var(--muted,#64748b)]">
									Сверка терминала (Pilot-NT/Arcus2)
								</div>
							</div>

							{/* СБП QR (Плати QR / НСПК) */}
							<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<span className="font-bold flex items-center gap-1">
										<QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
										<span>СБП QR / Онлайн</span>
									</span>
									<span className="font-mono">{sbpCount} оплат</span>
								</div>
								<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
									{money(sbpRub)}
								</div>
								<div className="text-xs text-[var(--muted,#64748b)]">
									Реестр НСПК / СберPay QR
								</div>
							</div>

							{/* Зачет аванса / Семейный счет */}
							<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<span className="font-bold flex items-center gap-1">
										<Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
										<span>Семейный баланс</span>
									</span>
									<span className="font-mono">Тег 1215</span>
								</div>
								<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
									{money(summary.familyWalletRub)}
								</div>
								<div className="text-xs text-[var(--muted,#64748b)]">
									Зачет аванса без повторного НДС
								</div>
							</div>
						</div>

						{/* Список строк оплат */}
						<div
							className="finance-list"
							style={{ border: "none", padding: 0, background: "transparent" }}
						>
							{(summary?.byMethod ?? []).map((row) => {
								const RowIcon = METHOD_ICONS[row.method] ?? Coins;
								return (
									<article className="finance-row" key={row.method}>
										<RowIcon aria-hidden="true" />
										<div>
											<h3>{methodLabels[row.method] ?? row.method}</h3>
											<p>{paymentsCountLabel(row.count)}</p>
										</div>
										<strong>{money(row.amountRub)}</strong>
									</article>
								);
							})}
							{summary.advanceRub > 0 ? (
								<article className="finance-row" key="advance">
									<Wallet aria-hidden="true" />
									<div>
										<h3>Из них аванс на семейный счёт</h3>
										<p>
											деньги получены, но выручкой станут при оплате лечения
										</p>
									</div>
									<strong>{money(summary.advanceRub)}</strong>
								</article>
							) : null}
							{summary.familyWalletRub > 0 ? (
								<article className="finance-row" key="family-wallet">
									<Wallet aria-hidden="true" />
									<div>
										<h3>Оплачено с семейных счетов</h3>
										<p>
											в приход не входит: эти деньги клиника получила раньше,
											когда счёт пополняли
										</p>
									</div>
									<strong>{money(summary.familyWalletRub)}</strong>
								</article>
							) : null}
							{summary.refundedRub > 0 ? (
								<article className="finance-row" key="refunded">
									<Undo2 aria-hidden="true" />
									<div>
										<h3>Возвращено пациентам</h3>
										<p>
											{paymentsCountLabel(summary.refundedCount)}; в приход за
											день не входят — эти деньги вернули
										</p>
									</div>
									<strong>−{money(summary.refundedRub)}</strong>
								</article>
							) : null}
						</div>

						{/* Калькулятор пересчета ящика и купюрный расклад */}
						<div className="space-y-3 pt-2">
							<div className="flex items-center gap-3 flex-wrap">
								<div className="smart-field" style={{ maxWidth: "280px" }}>
									<input
										id="cash-day-counted"
										inputMode="decimal"
										autoComplete="off"
										value={countedCashInput}
										onChange={(event) => setCountedCashInput(event.target.value)}
										placeholder=" "
										aria-invalid={countedCashInvalid || undefined}
										aria-describedby="cash-day-counted-result"
									/>
									<label htmlFor="cash-day-counted">
										Пересчитайте наличные в ящике (₽)
									</label>
								</div>

								<button
									type="button"
									onClick={() => setIsOfflineBatchOpen(true)}
									className="min-h-[44px] px-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
									title="Очередь фискализации и сверка с эквайрингом"
								>
									<Layers size={15} />
									<span>Очередь 54-ФЗ {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ""}</span>
								</button>

								<button
									type="button"
									onClick={handlePrintAccountingStatement}
									className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
									title="Печать бухгалтерской ведомости А4"
								>
									<FileText size={15} className="text-teal-600 dark:text-teal-400" />
									<span>Ведомость А4</span>
								</button>

								<button
									type="button"
									onClick={handleExport1cCsv}
									className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
									title="Экспорт в 1С:Бухгалтерию (CSV UTF-8 BOM)"
								>
									<FileSpreadsheet size={15} className="text-blue-600 dark:text-blue-400" />
									<span>1С (CSV)</span>
								</button>

								<button
									type="button"
									onClick={handleOpenZReport}
									className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ml-auto whitespace-nowrap"
								>
									<FileText size={16} />
									<span>Сформировать Z-отчет 54-ФЗ</span>
								</button>
							</div>

							<p
								id="cash-day-counted-result"
								style={{ margin: "6px 0 0" }}
								className="text-xs sm:text-sm font-medium"
								role="status"
							>
								{countedCashInvalid
									? "Впишите сумму цифрами, копейки после запятой: 12 000,50"
									: differenceRub === null
										? `По записям в ящике должно быть ${money(summary.cashRub)}.`
										: differenceRub === 0
											? `Сходится: ${money(summary.cashRub)}.`
											: differenceRub > 0
												? `В ящике на ${money(differenceRub)} больше, чем по записям. Скорее всего, оплату приняли, но не записали в программу.`
												: `В ящике на ${money(-differenceRub)} меньше, чем по записям. Проверьте сдачу и возвраты: возврат по оплате, принятой в другой день, в сегодняшний итог не попадает — программа не хранит время возврата.`}
							</p>
						</div>

						<p
							style={{
								margin: "10px 0 0",
								color: "var(--muted)",
								fontSize: "13px",
							}}
						>
							Считаются оплаты, записанные в программу за сегодня по всей
							клинике. Сверка с эквайрингом Сбербанка и реестром СБП НСПК
							позволяет выявить расхождения до закрытия смены и печати фискального Z-отчета.
						</p>
					</>
				)}
			</div>

			{/* Модальное окно Z-отчета закрытия смены 54-ФЗ */}
			{isZReportOpen && zReportData && (
				<div
					className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="z-report-modal-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) setIsZReportOpen(false);
					}}
				>
					<div
						className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper)] text-[var(--ink,#0f172a)] overflow-hidden"
					>
						{/* Заголовок модалки */}
						<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
							<div className="flex items-center gap-2">
								<FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
								<div>
									<h3 id="z-report-modal-title" className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
										Отчет о закрытии смены (Z-отчет 54-ФЗ)
									</h3>
									<span className="text-xs text-[var(--muted,#64748b)]">
										ФФД 1.2 • Смена №{zReportData.shiftNumber} • ФД №{zReportData.fiscalDocumentNumber}
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsZReportOpen(false)}
								className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* Тело Z-отчета (моноширинный фискальный чек) */}
						<div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[var(--paper-soft,#f8fafc)]">
							<div className="p-4 rounded-xl bg-[var(--paper)] dark:bg-[var(--paper-strong)] border border-[var(--line,#cbd5e1)] font-mono text-xs text-[var(--ink,#0f172a)] space-y-2.5 shadow-xs">
								<div className="text-center pb-2 border-b border-dashed border-[var(--line,#cbd5e1)]">
									<h4 className="text-sm font-bold m-0">{zReportData.clinicLegalName}</h4>
									<p className="m-0 text-[11px] text-[var(--muted,#64748b)]">{zReportData.clinicAddress}</p>
									<p className="m-0 text-[11px] text-[var(--muted,#64748b)]">ИНН {zReportData.clinicInn} КПП {zReportData.clinicKpp}</p>
								</div>

								<div className="text-center font-bold text-sm tracking-wide">
									ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ
								</div>

								<div className="space-y-1 text-xs border-b border-dashed border-[var(--line,#cbd5e1)] pb-2">
									<div className="flex justify-between">
										<span>СМЕНА:</span>
										<strong className="font-bold">№ {zReportData.shiftNumber}</strong>
									</div>
									<div className="flex justify-between">
										<span>ДАТА/ВРЕМЯ:</span>
										<span>{zReportData.closeDateRu}</span>
									</div>
									<div className="flex justify-between">
										<span>КАССИР:</span>
										<span>{zReportData.cashierFullName}</span>
									</div>
									<div className="flex justify-between">
										<span>ИНН КАССИРА:</span>
										<span>{zReportData.cashierInn}</span>
									</div>
								</div>

								{/* Итоги смены */}
								<div className="space-y-1.5 border-b border-dashed border-[var(--line,#cbd5e1)] pb-2.5">
									<div className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										1. ПРИХОД (ЧЕКОВ: {zReportData.incomeCount})
									</div>
									<div className="flex justify-between pl-2">
										<span>- Наличными (Тег 1031):</span>
										<span className="font-bold">{zReportData.incomeCashRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between pl-2">
										<span>- Эквайринг/Безнал (Тег 1081):</span>
										<span className="font-bold">{zReportData.incomeCardRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between pl-2">
										<span>- СБП QR (Тег 1081):</span>
										<span className="font-bold">{zReportData.incomeSbpRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between pl-2">
										<span>- Зачет аванса/Семья (Тег 1215):</span>
										<span className="font-bold">{zReportData.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between font-bold pt-1 border-t border-dotted border-[var(--line,#e2e8f0)]">
										<span>ВСЕГО ПРИХОД:</span>
										<span className="text-teal-700 dark:text-teal-300">{zReportData.incomeTotalRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</div>

								{/* Возвраты */}
								<div className="space-y-1.5 border-b border-dashed border-[var(--line,#cbd5e1)] pb-2.5">
									<div className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										2. ВОЗВРАТ ПРИХОДА (ЧЕКОВ: {zReportData.incomeReturnCount})
									</div>
									<div className="flex justify-between pl-2">
										<span>- Возврат на карту:</span>
										<span>{zReportData.incomeReturnCardRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between font-bold pt-1 border-t border-dotted border-[var(--line,#e2e8f0)]">
										<span>ВСЕГО ВОЗВРАТОВ:</span>
										<span className="text-rose-700 dark:text-rose-300">−{zReportData.incomeReturnTotalRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</div>

								{/* Итоговая выручка */}
								<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex justify-between items-center text-sm font-bold">
									<span>ИТОГОВАЯ ВЫРУЧКА:</span>
									<span className="text-base text-teal-700 dark:text-teal-300">{zReportData.totalRevenueRub.toLocaleString("ru-RU")} ₽</span>
								</div>

								{/* Служебные реквизиты ККТ */}
								<div className="space-y-1 text-[11px] text-[var(--muted,#64748b)] pt-1">
									<div className="flex justify-between">
										<span>НЕПЕРЕДАННЫХ ФД В ОФД:</span>
										<span className="font-bold text-emerald-600">0</span>
									</div>
									<div className="flex justify-between">
										<span>РЕСУРС КЛЮЧЕЙ ФН:</span>
										<span>{zReportData.fnResourceDaysRemaining} дней</span>
									</div>
									<div className="flex justify-between">
										<span>РН ККТ:</span>
										<span>{zReportData.kktRegNumber}</span>
									</div>
									<div className="flex justify-between">
										<span>ЗН ККТ:</span>
										<span>{zReportData.kktSerialNumber}</span>
									</div>
									<div className="flex justify-between">
										<span>ФН:</span>
										<span>{zReportData.fnSerial}</span>
									</div>
									<div className="flex justify-between">
										<span>ФД:</span>
										<span>{zReportData.fiscalDocumentNumber}</span>
									</div>
									<div className="flex justify-between">
										<span>ФПД:</span>
										<span className="font-bold text-[var(--ink,#0f172a)]">{zReportData.fiscalSign}</span>
									</div>
									<div className="flex justify-between">
										<span>ОФД:</span>
										<span>{zReportData.ofdName}</span>
									</div>
								</div>
							</div>
						</div>

						{/* Футер с кнопками печати и копирования */}
						<div className="sticky bottom-0 z-10 p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-2 bg-[var(--paper-soft,#f8fafc)] shadow-lg">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleCopyZReportText}
									className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
								>
									{isCopiedZReport ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
									<span>{isCopiedZReport ? "Скопировано!" : "Скопировать текст"}</span>
								</button>
								<button
									type="button"
									onClick={handlePrintZReport}
									disabled={isPrintingZReport}
									className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
								>
									<Printer size={16} />
									<span>{isPrintingZReport ? "Печать..." : "Печать Z-отчета на ККТ"}</span>
								</button>
							</div>

							<button
								type="button"
								onClick={() => setIsZReportOpen(false)}
								className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] cursor-pointer whitespace-nowrap"
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Модальное окно пакетной фискализации офлайн-очереди */}
			<OfflineFiscalBatchModal
				isOpen={isOfflineBatchOpen}
				onClose={() => setIsOfflineBatchOpen(false)}
				clinicName={clinicName}
				cashierFullName={cashierFullName}
				clinicRequisites={{
					name: clinicName,
					inn: clinicInn,
				}}
				onBatchProcessed={() => {
					FiscalReceiptQueueManager.flushAllPending();
					showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
				}}
			/>
		</details>
	);
}

