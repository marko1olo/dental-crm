import React from "react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface ReceiptPrintFiscalFooterProps {
	readonly receipt: FiscalReceipt54FzResult;
	readonly fnsQrSvg: string | null;
}

export const ReceiptPrintFiscalFooter: React.FC<ReceiptPrintFiscalFooterProps> = ({ receipt, fnsQrSvg }) => {
	return (
		<>
			{/* Fiscal Requisites (54-FZ mandatory tags) */}
			<div className="py-3 space-y-1.5 text-xs text-[var(--muted,#64748b)] border-b border-dashed border-[var(--border,#cbd5e1)]">
				<div className="flex justify-between">
					<span>ФН:</span>
					<span className="font-bold text-[var(--ink,#0f172a)]">{receipt.fnSerial}</span>
				</div>
				<div className="flex justify-between">
					<span>ФД:</span>
					<span className="font-bold text-[var(--ink,#0f172a)]">{receipt.fiscalDocumentNumber}</span>
				</div>
				<div className="flex justify-between">
					<span>ФПД:</span>
					<span className="font-bold text-[var(--ink,#0f172a)]">{receipt.fiscalSign}</span>
				</div>
				<div className="flex justify-between">
					<span>Налоговый режим:</span>
					<span className="font-semibold text-[var(--ink,#0f172a)]">{receipt.taxationSystemName}</span>
				</div>
				<div className="flex justify-between">
					<span>СПРАВКА ДЛЯ ВЫЧЕТА (13%):</span>
					<span className="font-bold text-[var(--brand-primary,#0d9488)]">
						{receipt.taxDeductionCategory === "2"
							? "КОД 02 (Дорогостоящее)"
							: "КОД 01 (Стандартное)"}
					</span>
				</div>
			</div>

			{/* OFD QR and Verification Footer */}
			<div className="pt-3 text-center space-y-2">
				{receipt.isWarrantyZeroAct ? (
					<div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
						<span className="font-bold block">Гарантия 100% · Внутренний акт клиники</span>
						<span className="text-[11px] text-purple-700 dark:text-purple-300">
							Внутренний документ: чек на 0 ₽ не направляется в онлайн-кассу.
						</span>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] gap-2.5">
						{fnsQrSvg && (
							<div
								className="w-[130px] h-[130px] p-1.5 bg-white rounded-lg border border-[var(--border,#cbd5e1)] shadow-2xs flex items-center justify-center shrink-0"
								data-testid="fns-fiscal-qr-svg"
								dangerouslySetInnerHTML={{ __html: fnsQrSvg }}
							/>
						)}
						<div className="space-y-1">
							<div className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
								Проверка кассового чека ФНС / ОФД:
							</div>
							<a
								href={receipt.ofdUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-[var(--teal,#0d9488)] hover:underline break-all block font-semibold"
							>
								{receipt.ofdUrl}
							</a>
						</div>
					</div>
				)}

				<p className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider pt-1">
					СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ ДЕНТЕ!
				</p>
			</div>
		</>
	);
};
