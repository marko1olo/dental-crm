import React from "react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface ReceiptPrintHeaderProps {
	readonly receipt: FiscalReceipt54FzResult;
	readonly receiptTitle: string;
}

export const ReceiptPrintHeader: React.FC<ReceiptPrintHeaderProps> = ({ receipt, receiptTitle }) => {
	return (
		<>
			{/* Clinic Header */}
			<div className="text-center space-y-1 pb-3 border-b border-dashed border-[var(--border,#cbd5e1)]">
				<h3 className="font-black text-sm uppercase tracking-wider text-[var(--ink,#0f172a)]">
					{receipt.clinicLegalName}
				</h3>
				<p className="text-xs text-[var(--muted,#64748b)]">
					{receipt.clinicInn ? `ИНН: ${receipt.clinicInn} · ` : ""}Режим: {receipt.taxationSystemName}
				</p>
				<p className="text-xs text-[var(--muted,#64748b)]">{receipt.clinicAddress}</p>
			</div>

			{/* Document Info */}
			<div className="py-3 space-y-1.5 border-b border-dashed border-[var(--border,#cbd5e1)] text-xs">
				<div className="flex justify-between items-center gap-2">
					<span className="font-bold text-[var(--ink,#0f172a)]">{receiptTitle}</span>
					<span className="font-bold text-[var(--teal,#0d9488)]">№ {receipt.receiptNumber}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-[var(--muted,#64748b)]">ДАТА / ВРЕМЯ:</span>
					<span className="font-semibold">{receipt.receiptDateRu}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-[var(--muted,#64748b)]">СМЕНА: №{receipt.shiftNumber}</span>
					<span className="font-semibold">КАССИР: {receipt.cashierFullName}</span>
				</div>
				{receipt.buyerInn ? (
					<>
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">ПОКУПАТЕЛЬ:</span>
							<span className="font-semibold truncate max-w-[200px]" title={receipt.buyerName || receipt.patientName}>
								{receipt.buyerName || receipt.patientName}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">ИНН ПОКУПАТЕЛЯ:</span>
							<span className="font-semibold font-mono">{receipt.buyerInn}</span>
						</div>
					</>
				) : (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">ПАЦИЕНТ:</span>
						<span className="font-semibold truncate max-w-[200px]" title={receipt.patientName}>
							{receipt.patientName}
						</span>
					</div>
				)}
				<div className="flex justify-between">
					<span className="text-[var(--muted,#64748b)]">КОНТАКТ:</span>
					<span className="font-semibold">{receipt.customerContact}</span>
				</div>
				{receipt.originalReceiptNumber && (
					<div className="pt-1.5 border-t border-[var(--border,#cbd5e1)] space-y-1">
						<div className="flex justify-between font-semibold text-rose-700 dark:text-rose-300">
							<span>ИСХОДНЫЙ ЧЕК:</span>
							<span>{receipt.originalReceiptNumber}</span>
						</div>
						{receipt.refundReason && (
							<div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
								Причина возврата: {receipt.refundReason}
							</div>
						)}
					</div>
				)}
				{receipt.isCorrection && (
					<div className="pt-1.5 border-t border-[var(--border,#cbd5e1)] text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-1">
						<div className="flex justify-between font-bold">
							<span>ТИП КОРРЕКЦИИ:</span>
							<span>{receipt.correctionTypeName || "Самостоятельно"}</span>
						</div>
						{receipt.correctionDocNumber && (
							<div className="flex justify-between text-xs">
								<span>ДОКУМЕНТ-ОСНОВАНИЕ:</span>
								<span>№ {receipt.correctionDocNumber} от {receipt.correctionDocDate || "—"}</span>
							</div>
						)}
						{receipt.correctionReason && (
							<div className="text-xs text-amber-800 dark:text-amber-300">
								Основание: {receipt.correctionReason}
							</div>
						)}
					</div>
				)}
			</div>
		</>
	);
};
