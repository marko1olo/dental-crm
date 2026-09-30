import React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Printer,
	Receipt,
	X,
} from "lucide-react";
import { formatMoneyRu } from "./fiscalModalRefundLogic";
import type { FiscalModalTab } from "./fiscalModalTypes";

export interface FiscalHeaderAndTabsProps {
	readonly activeTab: FiscalModalTab;
	readonly setActiveTab: (tab: FiscalModalTab) => void;
	readonly patientName: string;
	readonly patientDebtRub: number;
	readonly patientDepositRub: number;
	readonly totalSumRub: number;
	readonly refundTotalRub: number;
	readonly onClose: () => void;
	readonly interruptedFiscalState: {
		isInterrupted: boolean;
		reason: string;
		amountRub: number;
		lastReceiptNumber?: string;
	} | null;
	readonly setInterruptedFiscalState: (state: null) => void;
	readonly handleManualCardTerminalConfirm: () => void;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalizationWithoutBalanceImpact: () => void;
	readonly isFiscalizing: boolean;
}

export const FiscalHeaderAndTabs: React.FC<FiscalHeaderAndTabsProps> = ({
	activeTab,
	setActiveTab,
	patientName,
	patientDebtRub,
	patientDepositRub,
	totalSumRub,
	refundTotalRub,
	onClose,
	interruptedFiscalState,
	setInterruptedFiscalState,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
}) => {
	return (
		<>
			{/* Top Modal Header */}
			<div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0">
				<div className="flex items-center gap-3 min-w-0 max-w-full flex-1">
					<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
						<Receipt size={18} />
					</div>
					<div className="min-w-0 max-w-full flex-1">
						<div className="flex items-center gap-2.5 flex-wrap">
							<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)] whitespace-normal break-normal tracking-tight">
								{activeTab === "refund"
									? "Возврат прихода / Отказ от услуг"
									: activeTab === "correction"
										? "Чек коррекции"
										: activeTab === "certificate"
											? "Справка для налогового вычета"
											: activeTab === "act"
												? "Акт сдачи-приемки выполненных услуг"
												: activeTab === "oneC"
													? "1С:Предприятие 8.3 / Экспорт в CommerceML 2.09"
													: "Кассовый чек 54-ФЗ · Фискализация 54-ФЗ & Прием платежей"}
							</h3>
							<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-bold shrink-0">
								ФФД 1.2
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] break-words mt-0.5">
							Пациент:{" "}
							<strong className="text-[var(--ink,#0f172a)] font-semibold">
								{patientName}
							</strong>{" "}
							· Итого:{" "}
							<strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
								{formatMoneyRu(activeTab === "refund" ? refundTotalRub : totalSumRub)}
							</strong>
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-8 sm:w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center justify-center cursor-pointer transition-colors border border-transparent hover:border-[var(--border,#cbd5e1)] shrink-0"
					aria-label="Закрыть модальное окно"
				>
					<X size={18} />
				</button>
			</div>

			{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt on tendered amount) */}
			{(patientDebtRub > 0 || patientDepositRub < 0) && (
				<div
					data-testid="debt-autonomy-banner"
					className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2 shrink-0"
				>
					<AlertTriangle size={14} className="shrink-0 text-amber-600" />
					<span>
						Задолженность пациента: {(patientDebtRub > 0 ? patientDebtRub : Math.abs(patientDepositRub)).toLocaleString("ru-RU")} ₽. Долг не блокирует фискализацию чека на фактически вносимую сумму.
					</span>
				</div>
			)}

			{/* Acquiring & Fiscalization Emergency Fault-Tolerance Banner (Mandates 8e, 8n) */}
			{interruptedFiscalState?.isInterrupted && (
				<div
					className="px-4 py-3 bg-amber-500/15 dark:bg-amber-950/60 border-b border-amber-500/40 text-xs space-y-2 shrink-0"
					data-testid="fiscal-interrupted-banner"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<div>
								<h4 className="font-bold text-amber-900 dark:text-amber-200 m-0">
									Внимание: сбой связи с фискальным регистратором ККТ / эквайрингом
								</h4>
								<p className="text-[11px] text-amber-800 dark:text-amber-300 m-0 leading-tight">
									{interruptedFiscalState.reason}. Если терминал уже списал средства с карты или требуется повторить фискализацию без изменения баланса пациента, выберите действие:
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setInterruptedFiscalState(null)}
							className="text-amber-700 dark:text-amber-300 hover:text-amber-900 text-xs font-bold cursor-pointer"
						>
							Скрыть
						</button>
					</div>
					<div className="flex items-center gap-2 flex-wrap pt-1">
						<button
							type="button"
							onClick={handleManualCardTerminalConfirm}
							disabled={isSubmittingManualCard}
							title={isSubmittingManualCard ? "Фиксация..." : "Зафиксировать оплату в CRM без повторного списания с карты"}
							className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
							data-testid="btn-fiscal-manual-card-confirm"
						>
							<CheckCircle2 size={14} />
							<span>Оплата картой подтверждена на терминале вручную</span>
						</button>
						<button
							type="button"
							onClick={handleRetryFiscalizationWithoutBalanceImpact}
							disabled={isFiscalizing}
							title={isFiscalizing ? "Отправка на ККТ..." : "Повторно отправить чек на фискализацию в ККТ без изменения баланса пациента"}
							className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
							data-testid="btn-fiscal-retry-direct"
						>
							<Printer size={14} className={isFiscalizing ? "animate-spin" : ""} />
							<span>Повторить фискализацию чека</span>
						</button>
					</div>
				</div>
			)}

			{/* Multi-Tab Selector Subheader Strip (Compact 32px height) */}
			<div className="px-4 sm:px-6 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--border,#cbd5e1)] shrink-0 overflow-x-auto">
				<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs min-w-max">
					<button
						type="button"
						onClick={() => setActiveTab("payment")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "payment"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Оплата
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("act")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "act"
								? "bg-emerald-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Акт выполненных услуг
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("oneC")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "oneC"
								? "bg-amber-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-1c-export"
					>
						1С:Экспорт XML
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("certificate")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "certificate"
								? "bg-indigo-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Справка для ФНС
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("refund")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "refund"
								? "bg-rose-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Возврат услуг
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("correction")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "correction"
								? "bg-amber-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Коррекция
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("preview")}
						className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
							activeTab === "preview"
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Чек
					</button>
				</div>
			</div>
		</>
	);
};
