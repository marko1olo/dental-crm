import React from "react";
import { QrCode } from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderSbpPanelProps {
	readonly sbpAmount: number;
}

export const TenderSbpPanel: React.FC<TenderSbpPanelProps> = ({ sbpAmount }) => {
	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 space-y-3" data-testid="panel-sbp-focused">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
						<QrCode size={20} />
					</div>
					<div>
						<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">Система быстрых платежей (СБП QR)</span>
						<span className="text-xs text-[var(--muted,#64748b)]">Динамический QR сформирован</span>
					</div>
				</div>
				<div className="text-center sm:text-right w-full sm:w-auto p-2 sm:p-0 rounded-xl bg-teal-500/5 sm:bg-transparent">
					<span className="text-xs text-[var(--muted,#64748b)] block font-semibold">К оплате:</span>
					<span className="text-2xl sm:text-lg font-black font-mono text-teal-700 dark:text-teal-300">
						{formatMoneyRu(sbpAmount)}
					</span>
				</div>
			</div>
			<p className="text-xs text-[var(--muted,#64748b)] m-0">
				Пациент сканирует QR камерой или через приложение любого банка РФ. Зачисление мгновенно без комиссии для пациента.
			</p>

			<div className="sm:hidden pt-1">
				<button
					type="button"
					className="w-full min-h-[52px] h-[52px] rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
					data-testid="btn-mobile-pay-sbp-qr"
				>
					<QrCode size={18} />
					<span>Оплатить СБП (QR-код {formatMoneyRu(sbpAmount)})</span>
				</button>
			</div>
		</div>
	);
};
