/**
 * CashShiftWidget.tsx — Компонент управления кассовой сменой ККТ 54-ФЗ (Открытие/Закрытие, X/Z-отчеты, Офлайн-очередь, Сверка эквайринга).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Layers,
	Lock,
	MinusCircle,
	MoreHorizontal,
	PlusCircle,
	Printer,
	QrCode,
	ShieldCheck,
	Unlock,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import type { QueuedFiscalReceiptItem } from "../../services/hardware/hardwareTypes";
import {
	type ClinicFiscalRequisites,
	type OfflineQueueFiscalItem,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
} from "@dental/shared";
import { OfflineFiscalBatchModal } from "./fiscal/OfflineFiscalBatchModal";
import { ShiftCloseZReportModal } from "./fiscal/ShiftCloseZReportModal";
import { CashRegisterModal } from "./CashRegisterModal";
import { CashFlowModal } from "./CashFlowModal";
import { CashShiftCompactBar } from "./CashShiftCompactBar";
import { printAccountingStatement, exportShift1cCsv } from "./cashShiftReports";
import "./CashShiftWidget.css";

export { CashFlowModal } from "./CashFlowModal";
export { CashShiftCompactBar } from "./CashShiftCompactBar";
export { printAccountingStatement, exportShift1cCsv } from "./cashShiftReports";

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
	readonly onCashIn?: (amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>;
	readonly onCashOut?: (amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>;
	readonly initialCashFlowModalOpen?: boolean | undefined;
	readonly initialCashFlowMode?: "cash_in" | "cash_out" | undefined;
	readonly compact?: boolean | undefined;
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
	initialIsOpen = false,
	shiftNumber = 1,
	cashierName = "Дежурный администратор",
	cashierInn = "",
	cashInDrawerRub = 0,
	cardSumRub = 0,
	sbpSumRub = 0,
	advanceOffsetRub = 0,
	openedAt = "08:00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	queuedReceipts: externalQueuedReceipts,
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onPrintZReport,
	onCashIn,
	onCashOut,
	initialCashFlowModalOpen = false,
	initialCashFlowMode = "cash_in",
	compact = false,
}) => {
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialIsOpen);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [isZReportModalOpen, setIsZReportModalOpen] = useState<boolean>(false);
	const [isOfflineBatchModalOpen, setIsOfflineBatchModalOpen] = useState<boolean>(false);
	const [queuedItems, setQueuedItems] = useState<QueuedFiscalReceiptItem[]>([]);
	const [isReportsMenuOpen, setIsReportsMenuOpen] = useState<boolean>(false);
	const [isBottomActionsMenuOpen, setIsBottomActionsMenuOpen] = useState<boolean>(false);
	const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState<boolean>(false);

	// StomX Cash Flow State (Wave 118: 54-FZ Tag 1054 cash in/out presets)
	const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState<boolean>(initialCashFlowModalOpen);
	const [cashFlowMode, setCashFlowMode] = useState<"cash_in" | "cash_out">(initialCashFlowMode);

	const handleOpenCashInModal = () => {
		setCashFlowMode("cash_in");
		setIsCashFlowModalOpen(true);
	};

	const handleOpenCashOutModal = () => {
		setCashFlowMode("cash_out");
		setIsCashFlowModalOpen(true);
	};

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

	// Acquiring fee calculation (standard 1.5% commission rate in integer kopecks without float drift — Mandate 8b)
	const cashlessKopecks = Math.round((cardSumRub + sbpSumRub) * 100);
	const acquiringFeeKopecks = Math.round((cashlessKopecks * 15) / 1000);
	const netBankDepositKopecks = Math.max(0, cashlessKopecks - acquiringFeeKopecks);
	const acquiringFeeRub = acquiringFeeKopecks / 100;
	const netBankDepositRub = netBankDepositKopecks / 100;

	const handleToggleShift = async () => {
		if (isProcessing) return;
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
		if (isProcessing) return;
		if (!isShiftOpen) {
			showToast("Смена закрыта. Для снятия промежуточного отчета откройте смену", "info", 4000);
			return;
		}
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
		printAccountingStatement({
			shiftNumber,
			cashierName,
			cashInDrawerRub,
			cardSumRub,
			sbpSumRub,
			advanceOffsetRub,
			totalTurnoverRub,
			acquiringFeeRub,
			clinicRequisites,
		});
	};

	const handleExport1cCsv = () => {
		exportShift1cCsv({
			shiftNumber,
			cashierName,
			cashInDrawerRub,
			cardSumRub,
			sbpSumRub,
			advanceOffsetRub,
			totalTurnoverRub,
			acquiringFeeRub,
			clinicRequisites,
		});
	};

	if (compact) {
		return (
			<>
				<CashShiftCompactBar
					isShiftOpen={isShiftOpen}
					shiftNumber={shiftNumber}
					cashierName={cashierName}
					totalTurnoverRub={totalTurnoverRub}
					pendingOfflineCount={pendingOfflineCount}
					isProcessing={isProcessing}
					isReportsMenuOpen={isReportsMenuOpen}
					setIsReportsMenuOpen={setIsReportsMenuOpen}
					onOpenCashInModal={handleOpenCashInModal}
					onOpenCashOutModal={handleOpenCashOutModal}
					onToggleShift={isShiftOpen ? handleOpenZReportModal : handleToggleShift}
					onOpenOfflineBatchModal={() => setIsOfflineBatchModalOpen(true)}
					onPrintXReport={handleXReport}
					onPrintAccountingStatement={handlePrintAccountingStatement}
					onExport1cCsv={handleExport1cCsv}
					onOpenCashRegisterModal={() => setIsCashRegisterModalOpen(true)}
					formatMoneyRu={formatMoneyRu}
				/>

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

				{/* Модальное окно кассовых операций (Внесение/Изъятие StomX) */}
				<CashFlowModal
					isOpen={isCashFlowModalOpen}
					onClose={() => setIsCashFlowModalOpen(false)}
					initialMode={cashFlowMode}
					cashInDrawerRub={cashInDrawerRub}
					onCashIn={onCashIn}
					onCashOut={onCashOut}
				/>

				{/* Модальное окно АРМ кассового аппарата 54-ФЗ */}
				<CashRegisterModal
					isOpen={isCashRegisterModalOpen}
					onClose={() => setIsCashRegisterModalOpen(false)}
					isShiftOpen={isShiftOpen}
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
					cashInDrawerRub={cashInDrawerRub}
					cardSumRub={cardSumRub}
					sbpSumRub={sbpSumRub}
					advanceOffsetRub={advanceOffsetRub}
					onOpenShift={async () => {
						if (onOpenShift) await onOpenShift();
						setIsShiftOpen(true);
					}}
					onCloseShift={async () => {
						if (onCloseShift) await onCloseShift();
						setIsShiftOpen(false);
					}}
					onPrintXReport={handleXReport}
				/>
			</>
		);
	}

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
							<Unlock className="text-[var(--ok,#10b981)]" size={24} />
						) : (
							<Lock className="text-[var(--danger,#ef4444)]" size={24} />
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
										? "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]"
										: "bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] border border-[var(--danger,rgba(239,68,68,0.2))]"
								}`}
							>
								{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
							</span>
							{pendingOfflineCount > 0 && (
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning-fg,#b45309)] dark:text-[var(--warning,#fbbf24)] border border-[var(--warning,rgba(245,158,11,0.3))] animate-pulse flex items-center gap-1">
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
										Открыта с {openedAt}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{/* Кнопка Открыть/Закрыть смену (Единая точка действия по Закону Хика) */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={isShiftOpen ? handleOpenZReportModal : handleToggleShift}
						aria-busy={isProcessing}
						className={`cash-shift-btn min-h-[48px] px-5 text-sm font-bold shadow-md cursor-pointer ${
							isShiftOpen ? "cash-shift-btn-open" : "cash-shift-btn-closed"
						}`}
						data-testid="cash-shift-toggle-btn"
					>
						{isShiftOpen ? (
							<>
								<Lock size={16} />
								<span>Сформировать Z-отчет и закрыть смену</span>
							</>
						) : (
							<>
								<Unlock size={16} />
								<span>{shiftNumber === 1 && totalTurnoverRub === 0 ? "+ Открыть первую смену" : "Открыть смену"}</span>
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
								Все оплаты зафиксированы в программе. Пробейте очередь после восстановления связи.
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
						<span>Фискализировать всю очередь</span>
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
						<span className="text-[10px] font-bold">Касса</span>
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
						<span className="text-[10px] font-bold">Терминал</span>
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
						<span className="text-[10px] font-bold">СБП</span>
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
						<span className="text-[10px] font-bold">Итого</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
						{formatMoneyRu(totalTurnoverRub)}
					</div>
					<div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
						Чистое зачисление на р/с: {formatMoneyRu(netBankDepositRub)}
					</div>
				</div>
			</div>

			{/* Быстрые фискальные действия и отчеты ККТ (Мандат 8d п. 3: не более 1-2 кнопок прямого действия) */}
			<div className="cash-shift-actions flex-wrap items-center">
				<button
					type="button"
					onClick={handleOpenCashInModal}
					data-testid="btn-open-cash-in-modal"
					className="min-h-[44px] px-4 rounded-xl border border-[var(--ok-fg,rgba(16,185,129,0.3))] bg-[var(--ok-bg,rgba(16,185,129,0.1))] hover:opacity-90 text-[var(--ok-fg,#059669)] dark:text-[var(--ok-fg,#34d399)] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
					title="Внесение наличных (разменная монета, прочий приход)"
				>
					<PlusCircle size={16} className="text-[var(--ok-fg,#10b981)]" />
					<span>Внесение ДС</span>
				</button>

				<button
					type="button"
					onClick={handleOpenCashOutModal}
					data-testid="btn-open-cash-out-modal"
					className="min-h-[44px] px-4 rounded-xl border border-[var(--danger,rgba(239,68,68,0.3))] bg-[var(--danger-soft,rgba(239,68,68,0.1))] hover:opacity-90 text-[var(--danger,#dc2626)] dark:text-[var(--danger,#f87171)] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
					title="Изъятие наличных (инкассация, хоз. расходы, возврат)"
				>
					<MinusCircle size={16} className="text-[var(--danger,#ef4444)]" />
					<span>Изъятие / Инкассация</span>
				</button>

				{/* Вторичные действия и отчеты ККТ (Меню ... по Мандату 8d п. 3) */}
				<div className="relative inline-block">
					<button
						type="button"
						onClick={() => setIsBottomActionsMenuOpen((prev) => !prev)}
						data-testid="btn-shift-bottom-actions-menu"
						className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--glass-hover)] transition-all cursor-pointer text-[var(--ink)]"
						title="Дополнительные отчеты и фискальные действия (X-отчет, Ведомость А4, 1С, Очередь чеков)"
					>
						<MoreHorizontal size={16} />
						<span>Отчеты и действия</span>
					</button>

					<div
						className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 z-30 min-w-[230px] bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 flex flex-col gap-1 ${
							isBottomActionsMenuOpen ? "block" : "hidden"
						}`}
					>
						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handleXReport();
							}}
							aria-busy={isProcessing}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)] transition-colors"
							title="Распечатать промежуточный X-отчет без гашения"
							data-testid="btn-print-x-report"
						>
							<Printer size={15} className="shrink-0 text-[var(--muted)]" />
							<span>Печать X-отчета (без гашения)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handlePrintAccountingStatement();
							}}
							data-testid="btn-print-accounting-statement"
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)] transition-colors"
							title="Печать сводной бухгалтерской ведомости А4"
						>
							<FileText size={15} className="shrink-0 text-[var(--teal)]" />
							<span>Ведомость А4</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handleExport1cCsv();
							}}
							data-testid="btn-export-1c-csv"
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)] transition-colors"
							title="Выгрузить данные смены в CSV (UTF-8 BOM) для 1С:Бухгалтерии"
						>
							<FileSpreadsheet size={15} className="shrink-0 text-[var(--brand)]" />
							<span>Экспорт в 1С</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								setIsOfflineBatchModalOpen(true);
							}}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)] transition-colors"
							title="Очередь фискализации и сверка с эквайрингом"
							data-testid="btn-open-offline-fiscal-queue"
						>
							<Layers size={15} className="shrink-0 text-[var(--warning-fg)]" />
							<span>Очередь чеков и сверка {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ""}</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								setIsCashRegisterModalOpen(true);
							}}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)] transition-colors"
							title="Открыть АРМ кассового аппарата (сверка наличности, X/Z-лента)"
							data-testid="btn-open-cash-register-arm"
						>
							<Zap size={15} className="shrink-0 text-[var(--warning-fg)]" />
							<span>АРМ кассы (Сверка / Лента)</span>
						</button>
					</div>
				</div>

				{pendingOfflineCount > 0 && (
					<button
						type="button"
						onClick={() => setIsOfflineBatchModalOpen(true)}
						className="min-h-[44px] px-3 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer animate-pulse hover:bg-amber-500/25 transition-all"
						title="Внимание: в офлайн-очереди есть неотправленные чеки"
					>
						<Layers size={14} />
						<span>Очередь: {pendingOfflineCount}</span>
					</button>
				)}
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

			{/* Модальное окно кассовых операций (Внесение/Изъятие StomX) */}
			<CashFlowModal
				isOpen={isCashFlowModalOpen}
				onClose={() => setIsCashFlowModalOpen(false)}
				initialMode={cashFlowMode}
				cashInDrawerRub={cashInDrawerRub}
				onCashIn={onCashIn}
				onCashOut={onCashOut}
			/>

			{/* Модальное окно АРМ кассового аппарата 54-ФЗ */}
			<CashRegisterModal
				isOpen={isCashRegisterModalOpen}
				onClose={() => setIsCashRegisterModalOpen(false)}
				isShiftOpen={isShiftOpen}
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
				cashInDrawerRub={cashInDrawerRub}
				cardSumRub={cardSumRub}
				sbpSumRub={sbpSumRub}
				advanceOffsetRub={advanceOffsetRub}
				onOpenShift={async () => {
					if (onOpenShift) await onOpenShift();
					setIsShiftOpen(true);
				}}
				onCloseShift={async () => {
					if (onCloseShift) await onCloseShift();
					setIsShiftOpen(false);
				}}
				onPrintXReport={handleXReport}
			/>
		</div>
	);
};
