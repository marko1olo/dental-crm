import React from "react";
import { ArrowDownRight, ArrowUpRight, FileCheck, History, Plus } from "lucide-react";
import { VirtualizedTimeline } from "../../../common/VirtualizedTimeline";
import type { DepositOperationRecord } from "./types";

export interface DepositOperationsHistoryPanelProps {
	readonly operationsLog: DepositOperationRecord[];
	readonly patientId?: string | null | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
}

export const DepositOperationsHistoryPanel: React.FC<DepositOperationsHistoryPanelProps> = ({
	operationsLog,
	patientId,
	onOpenTaxCertificate,
	onNewAppointment,
}) => {
	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--glass-border)] shadow-xs flex flex-col gap-3" data-testid="deposit-transactions-history-panel">
			<div className="flex items-center justify-between pb-2 border-b border-[var(--glass-border)]">
				<div className="flex items-center gap-2">
					<History className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<h3 className="text-sm font-black m-0 text-[var(--ink)]">Хронология операций по депозиту</h3>
				</div>
				<div className="flex items-center gap-2">
					{onOpenTaxCertificate && (
						<button type="button" onClick={onOpenTaxCertificate} data-testid="btn-finance-tax-certificate" className="min-h-[34px] h-8 px-3 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-teal-500/20 transition-all" title="Оформить справку об оплате медицинских услуг (13% НДФЛ)">
							<FileCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="hidden sm:inline">Справка для вычета (13%)</span><span className="sm:hidden">Вычет</span>
						</button>
					)}
					{onNewAppointment && (
						<button type="button" onClick={() => onNewAppointment(patientId || undefined)} className="min-h-[34px] h-8 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-all shadow-2xs">
							<Plus className="w-3.5 h-3.5 shrink-0" /><span>Новый визит</span>
						</button>
					)}
				</div>
			</div>

			<VirtualizedTimeline<DepositOperationRecord>
				items={operationsLog}
				estimateHeight={64}
				overscan={2}
				threshold={8}
				getItemKey={(op) => op.id}
				dataTestId="deposit-records-virtualized-scroller"
				renderItem={(op) => {
					const isTopup = op.type === "deposit" || op.type === "family_share";
					return (
						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)] flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap text-xs transition-colors mb-2" data-testid={`deposit-record-${op.id}`}>
							<div className="flex items-center gap-3 min-w-0">
								<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isTopup ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
									{isTopup ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-bold text-[var(--ink)]">{op.typeLabelRu}</span>
										<span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--paper)] text-[var(--muted)] border border-[var(--glass-border)]">{op.methodLabelRu}</span>
									</div>
									<p className="text-[11px] text-[var(--muted)] m-0 truncate mt-0.5">{op.note}</p>
								</div>
							</div>
							<div className="flex items-center gap-3 shrink-0 text-right">
								<div>
									<span className={`text-sm font-black block font-mono ${isTopup ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
										{isTopup ? "+" : "-"}{op.amountRub.toLocaleString("ru-RU")} ₽
									</span>
									<span className="text-[10px] text-[var(--muted)] block">{op.date} • {op.time}</span>
								</div>
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
									Проведено
								</span>
							</div>
						</div>
					);
				}}
			/>
		</div>
	);
};
