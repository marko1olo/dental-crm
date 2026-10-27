import React from "react";
import { Check, Copy, Printer, QrCode } from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";
import { TreatmentPlanQrCode } from "../../treatment-plans/qr/TreatmentPlanQrCode";

export interface FamilyBillingSbpSectionProps {
	readonly billingResult: CombinedFamilyBillingResult;
	readonly isCopiedSbpLink: boolean;
	readonly onCopySbpUrl: () => void;
	readonly onPrintSbpQrReceipt: () => void;
}

export const FamilyBillingSbpSection: React.FC<FamilyBillingSbpSectionProps> = ({
	billingResult,
	isCopiedSbpLink,
	onCopySbpUrl,
	onPrintSbpQrReceipt,
}) => {
	return (
		<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-teal-500/30 space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<QrCode size={20} className="text-teal-600" />
					<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
						Динамический QR-код СБП на доплату ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
					</h4>
				</div>
				<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
					НСПК СБП (0.7% комиссия)
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
				<div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs">
					{billingResult.defaultSplit.sbpQr ? (
						<div className="p-2 bg-white rounded-lg">
							<TreatmentPlanQrCode value={billingResult.defaultSplit.sbpQr.nspkUrl} size={160} fgColor="#0f172a" title="QR-код оплаты через СБП" />
						</div>
					) : (
						<div className="w-40 h-40 flex items-center justify-center text-xs text-[var(--muted,#64748b)]">
							QR-код формируется...
						</div>
					)}
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] mt-2">
						Отсканируйте камерой смартфона
					</span>
				</div>

				<div className="space-y-3">
					<div className="space-y-1 text-xs">
						<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
							<span className="text-[var(--muted,#64748b)]">Сумма доплаты:</span>
							<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
								{billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</strong>
						</div>
						<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
							<span className="text-[var(--muted,#64748b)]">Назначение платежа:</span>
							<span className="font-medium text-right text-[11px] text-[var(--ink,#0f172a)] max-w-[200px] truncate">
								{billingResult.defaultSplit.sbpQr?.purpose}
							</span>
						</div>
						<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
							<span className="text-[var(--muted,#64748b)]">Контрольная сумма CRC16:</span>
							<span className="font-mono font-bold text-teal-600">{billingResult.defaultSplit.sbpQr?.crc16Hex}</span>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 pt-1">
						<button
							type="button"
							onClick={onCopySbpUrl}
							className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
						>
							{isCopiedSbpLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
							<span>{isCopiedSbpLink ? "Скопировано!" : "Копировать ссылку"}</span>
						</button>
						<button
							type="button"
							onClick={onPrintSbpQrReceipt}
							className="min-h-[44px] px-3.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
						>
							<Printer size={14} />
							<span>Печать QR-памятки</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
