/**
 * CashShiftWidget.tsx — Компонент управления кассовой сменой ККТ 54-ФЗ (Открытие/Закрытие, X/Z-отчеты, Офлайн-очередь, Сверка эквайринга).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	CheckCircle2,
	Clock,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Layers,
	Lock,
	Printer,
	QrCode,
	RefreshCw,
	ShieldCheck,
	Unlock,
	Wallet,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import type { QueuedFiscalReceiptItem } from "../../services/hardware/hardwareTypes";
import {
	type ClinicFiscalRequisites,
	type OfflineQueueFiscalItem,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
} from "@dental/shared";
import { OfflineFiscalBatchModal } from "./fiscal/OfflineFiscalBatchModal";
import { ShiftCloseZReportModal } from "./fiscal/ShiftCloseZReportModal";
import "./CashShiftWidget.css";

export interface CashShiftWidgetProps {
	readonly initialIsOpen?: boolean | undefined;
	readonly shiftNumber?: number | undefined;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly openedAt?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
	readonly queuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly onOpenShift?: () => void | Promise<void>;
	readonly onCloseShift?: () => void | Promise<void>;
	readonly onPrintXReport?: () => void | Promise<void>;
	readonly onPrintZReport?: () => void | Promise<void>;
}

function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const CashShiftWidget: React.FC<CashShiftWidgetProps> = ({
	initialIsOpen = true,
	shiftNumber = 42,
	cashierName = "Сидорова Анна Павловна",
	cashierInn = "770198765432",
	cashInDrawerRub = 24500,
	cardSumRub = 68000,
	sbpSumRub = 15400,
	advanceOffsetRub = 22000,
	openedAt = "08:00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	queuedReceipts: externalQueuedReceipts,
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onPrintZReport,
}) => {
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialIsOpen);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [isZReportModalOpen, setIsZReportModalOpen] = useState<boolean>(false);
	const [isOfflineBatchModalOpen, setIsOfflineBatchModalOpen] = useState<boolean>(false);
	const [queuedItems, setQueuedItems] = useState<QueuedFiscalReceiptItem[]>([]);

	// Subscribe to live hardware offline queue manager
	useEffect(() => {
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			setQueuedItems(items);
		});
		return () => {
			unsubscribe();
		};
	}, []);

	const pendingOfflineCount = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) {
			return externalQueuedReceipts.length;
		}
		return queuedItems.filter(
			(i) => i.status === "pending_print" || i.status === "hardware_offline",
		).length;
	}, [externalQueuedReceipts, queuedItems]);

	const pendingOfflineAmountRub = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) {
			return externalQueuedReceipts.reduce((sum, r) => {
				const tendersSum =
					(r.tenders.cashRub || 0) +
					(r.tenders.cardRub || 0) +
					(r.tenders.sbpRub || 0) +
					(r.tenders.advanceOffsetRub || 0);
				const itemsSum = r.items.reduce(
					(iSum, it) => iSum + (it.priceRub * (it.quantity ?? 1) - (it.discountRub ?? 0)),
					0,
				);
				return sum + (tendersSum > 0 ? tendersSum : itemsSum);
			}, 0);
		}
		return queuedItems
			.filter((i) => i.status === "pending_print" || i.status === "hardware_offline")
			.reduce((sum, i) => sum + (i.payload?.totalRub || 0), 0);
	}, [externalQueuedReceipts, queuedItems]);

	// Total turnover across all fiscal tenders
	const totalTurnoverRub = cashInDrawerRub + cardSumRub + sbpSumRub + advanceOffsetRub;

	// Acquiring fee calculation (standard 1.5% commission rate)
	const acquiringFeeRub = Math.round((cardSumRub + sbpSumRub) * 0.015 * 100) / 100;
	const netBankDepositRub = Math.max(0, cardSumRub + sbpSumRub - acquiringFeeRub);

	const handleToggleShift = async () => {
		setIsProcessing(true);
		try {
			if (isShiftOpen) {
				if (onCloseShift) await onCloseShift();
				setIsShiftOpen(false);
				showToast(
					`Смена №${shiftNumber} успешно закрыта (Z-отчет снят). Выручка: ${formatMoneyRu(totalTurnoverRub)}`,
					"success",
					4000,
				);
			} else {
				if (onOpenShift) await onOpenShift();
				setIsShiftOpen(true);
				showToast(`Смена №${shiftNumber + 1} открыта на ККТ`, "success", 3000);
			}
		} catch {
			showToast("Ошибка связи с фискальным регистратором", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleXReport = async () => {
		setIsProcessing(true);
		try {
			if (onPrintXReport) await onPrintXReport();
			showToast(
				`X-отчет (промежуточный) напечатан: ${formatMoneyRu(totalTurnoverRub)}`,
				"info",
				3000,
			);
		} catch {
			showToast("Не удалось распечатать X-отчет", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleOpenZReportModal = () => {
		if (!isShiftOpen) {
			showToast("Смена уже закрыта", "warning");
			return;
		}
		setIsZReportModalOpen(true);
	};

	const handlePrintAccountingStatement = () => {
		const html = generateFiscalPeriodStatementHtml({
			clinicRequisites: clinicRequisites
				? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
				: DEFAULT_CLINIC_FISCAL_REQUISITES,
			statementNumber: `СМЕНА-${shiftNumber}`,
			periodStart: new Date().toISOString().slice(0, 10),
			periodEnd: new Date().toISOString().slice(0, 10),
			periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
			shifts: [
				{
					shiftNumber,
					date: new Date().toISOString().slice(0, 10),
					cashierFullName: cashierName,
					receiptsCount: 12,
					cashIncomeRub: cashInDrawerRub,
					cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
					cardIncomeRub: cardSumRub,
					cardIncomeKopecks: Math.round(cardSumRub * 100),
					sbpIncomeRub: sbpSumRub,
					sbpIncomeKopecks: Math.round(sbpSumRub * 100),
					advanceOffsetIncomeRub: advanceOffsetRub,
					advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: totalTurnoverRub,
					shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
				},
			],
			bankStatementTotalRub: cardSumRub + sbpSumRub,
			bankAcquiringFeeRub: acquiringFeeRub,
			cashierFullName: cashierName,
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
			clinicRequisites: clinicRequisites
				? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
				: DEFAULT_CLINIC_FISCAL_REQUISITES,
			statementNumber: `СМЕНА-${shiftNumber}`,
			periodStart: new Date().toISOString().slice(0, 10),
			periodEnd: new Date().toISOString().slice(0, 10),
			periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
			shifts: [
				{
					shiftNumber,
					date: new Date().toISOString().slice(0, 10),
					cashierFullName: cashierName,
					receiptsCount: 12,
					cashIncomeRub: cashInDrawerRub,
					cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
					cardIncomeRub: cardSumRub,
					cardIncomeKopecks: Math.round(cardSumRub * 100),
					sbpIncomeRub: sbpSumRub,
					sbpIncomeKopecks: Math.round(sbpSumRub * 100),
					advanceOffsetIncomeRub: advanceOffsetRub,
					advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: totalTurnoverRub,
					shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
				},
			],
			bankStatementTotalRub: cardSumRub + sbpSumRub,
			bankAcquiringFeeRub: acquiringFeeRub,
			cashierFullName: cashierName,
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Fiscal_Shift_${shiftNumber}_1C_Export_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Ведомость смены успешно выгружена для 1С:Бухгалтерии (UTF-8 BOM)", "success");
	};

	return (
		<div className="cash-shift-container" data-testid="cash-shift-widget">
			{/* Верхний заголовок и статус смены */}
			<div className="cash-shift-header">
				<div className="flex items-center gap-3">
					<div
						className={`cash-shift-status-icon ${
							isShiftOpen ? "cash-shift-status-open" : "cash-shift-status-closed"
						}`}
					>
						{isShiftOpen ? (
							<Unlock className="text-emerald-500" size={24} />
						) : (
							<Lock className="text-rose-500" size={24} />
						)}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink,#0f172a)]">
								Кассовая смена №{shiftNumber}
							</h3>
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
									isShiftOpen
										? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
										: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
								}`}
							>
								{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
							</span>
							{pendingOfflineCount > 0 && (
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
									<Layers size={12} />
									Очередь: {pendingOfflineCount}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2 mt-0.5">
							<span>
								Кассир: <strong className="text-[var(--ink,#0f172a)]">{cashierName}</strong>
							</span>
							{isShiftOpen && (
								<>
									<span>·</span>
									<span className="flex items-center gap-1">
										<Clock size={12} /> Открыта с {openedAt}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{/* Кнопка Открыть/Закрыть смену */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleToggleShift}
						disabled={isProcessing}
						className={`cash-shift-btn min-h-[48px] px-5 text-sm font-bold shadow-md cursor-pointer ${
							isShiftOpen ? "cash-shift-btn-open" : "cash-shift-btn-closed"
						}`}
					>
						{isShiftOpen ? (
							<>
								<Lock size={16} />
								<span>Закрыть смену (Z-отчет)</span>
							</>
						) : (
							<>
								<Unlock size={16} />
								<span>Открыть смену</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* Аварийный баннер офлайн-очереди при обрыве связи с ККТ/ОФД */}
			{pendingOfflineCount > 0 && (
				<div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
					<div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
						<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
						<div>
							<span>В офлайн-очереди накопилось <strong>{pendingOfflineCount} неотправленных чеков</strong> на сумму <strong>{formatMoneyRu(pendingOfflineAmountRub)}</strong> (обрыв связи с ККТ/ОФД).</span>
							<div className="text-[11px] text-[var(--muted,#64748b)] font-normal">
								Все оплаты зафиксированы в программе без блокировки кассира. Пробейте очередь в 1 клик после восстановления связи.
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setIsOfflineBatchModalOpen(true)}
						className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
						data-testid="btn-flush-offline-queue-1click"
					>
						<Zap size={14} className="shrink-0" />
						<span>Пробить всю очередь в 1 клик</span>
					</button>
				</div>
			)}

			{/* Сетка финансовых показателей смены (54-ФЗ) */}
			<div className="cash-shift-grid">
				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<Banknote size={16} className="text-emerald-500" />
							Наличные в ящике
						</span>
						<span className="font-mono text-[10px]">Тег 1031</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
						{formatMoneyRu(cashInDrawerRub)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<CreditCard size={16} className="text-blue-500" />
							Эквайринг и Терминал
						</span>
						<span className="font-mono text-[10px]">Тег 1081</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
						{formatMoneyRu(cardSumRub)}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Комиссия эквайринга: ~{formatMoneyRu(Math.round(cardSumRub * 0.015 * 100) / 100)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<QrCode size={16} className="text-teal-500" />
							СБП / Плати QR
						</span>
						<span className="font-mono text-[10px]">НСПК</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
						{formatMoneyRu(sbpSumRub)}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Низкая комиссия: ~{formatMoneyRu(Math.round(sbpSumRub * 0.007 * 100) / 100)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-purple-500" />
							Общий оборот смены
						</span>
						<span className="font-mono text-[10px]">ОФД 54-ФЗ</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
						{formatMoneyRu(totalTurnoverRub)}
					</div>
					<div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
						Чистое зачисление на р/с: {formatMoneyRu(netBankDepositRub)}
					</div>
				</div>
			</div>

			{/* Быстрые фискальные действия и отчеты ККТ */}
			<div className="cash-shift-actions flex-wrap">
				<button
					type="button"
					onClick={() => setIsOfflineBatchModalOpen(true)}
					className="min-h-[48px] px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
					title="Очередь фискализации и сверка с эквайрингом"
					data-testid="btn-open-offline-fiscal-queue"
				>
					<Layers size={16} />
					<span>Очередь чеков и сверка {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ""}</span>
				</button>

				<button
					type="button"
					onClick={handleXReport}
					disabled={!isShiftOpen || isProcessing}
					className="cash-shift-actions-btn-primary min-h-[48px] text-xs sm:text-sm font-bold cursor-pointer"
					title="Распечатать промежуточный X-отчет без гашения"
				>
					<Printer size={16} />
					<span>Печать X-отчета (без гашения)</span>
				</button>

				<button
					type="button"
					onClick={handleOpenZReportModal}
					disabled={!isShiftOpen || isProcessing}
					className="min-h-[48px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
					title="Сформировать Z-отчет с гашением"
				>
					<FileSpreadsheet size={16} />
					<span>Сформировать Z-отчет 54-ФЗ</span>
				</button>

				<button
					type="button"
					onClick={handlePrintAccountingStatement}
					className="min-h-[48px] px-3.5 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
					title="Печать сводной бухгалтерской ведомости А4"
				>
					<FileText size={16} className="text-teal-600" />
					<span>Ведомость А4</span>
				</button>

				<button
					type="button"
					onClick={handleExport1cCsv}
					className="min-h-[48px] px-3.5 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
					title="Выгрузить данные смены в CSV (UTF-8 BOM) для 1С:Бухгалтерии"
				>
					<FileSpreadsheet size={16} className="text-blue-600" />
					<span>Экспорт в 1С</span>
				</button>
			</div>

			{/* Модальное окно закрытия смены Z-отчетом */}
			<ShiftCloseZReportModal
				isOpen={isZReportModalOpen}
				onClose={() => setIsZReportModalOpen(false)}
				shiftNumber={shiftNumber}
				cashierFullName={cashierName}
				cashierInn={cashierInn}
				clinicLegalName={clinicName}
				clinicInn={clinicInn}
				clinicAddress={clinicRequisites.address}
				kktRegNumber={clinicRequisites.kktRegNumber}
				kktSerialNumber={clinicRequisites.kktSerialNumber}
				fnSerial={clinicRequisites.fnSerialNumber}
				ofdName={clinicRequisites.ofdName}
				onConfirmCloseShift={async () => {
					if (onCloseShift) await onCloseShift();
					setIsShiftOpen(false);
					setIsZReportModalOpen(false);
					showToast(`Смена №${shiftNumber} закрыта на ККТ и Z-отчет отправлен в ОФД`, "success");
				}}
			/>

			{/* Модальное окно пакетной фискализации офлайн-очереди */}
			<OfflineFiscalBatchModal
				isOpen={isOfflineBatchModalOpen}
				onClose={() => setIsOfflineBatchModalOpen(false)}
				clinicName={clinicName}
				cashierFullName={cashierName}
				shiftNumber={shiftNumber}
				clinicRequisites={clinicRequisites}
				onBatchProcessed={() => {
					FiscalReceiptQueueManager.flushAllPending();
					showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
				}}
			/>
		</div>
	);
};

