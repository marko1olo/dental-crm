/**
 * Order804nFiscalReceiptPrint.tsx — Печатная форма и визуализация фискального кассового чека 54-ФЗ (ФФД 1.2),
 * включая чеки возврата прихода и чеки коррекции.
 */

import React from "react";
import type { FiscalReceipt54FzResult } from "./order804nFiscalEngine";

export interface Order804nFiscalReceiptPrintProps {
	readonly receipt: FiscalReceipt54FzResult;
	readonly className?: string | undefined;
}

export const Order804nFiscalReceiptPrint: React.FC<Order804nFiscalReceiptPrintProps> = ({
	receipt,
	className = "",
}) => {
	const receiptTitle = receipt.isCorrection
		? receipt.operationType === "income_return"
			? "КАССОВЫЙ ЧЕК КОРРЕКЦИИ / ВОЗВРАТ ПРИХОДА"
			: "КАССОВЫЙ ЧЕК КОРРЕКЦИИ / ПРИХОД"
		: receipt.operationType === "income_return"
			? "КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА"
			: "КАССОВЫЙ ЧЕК / ПРИХОД";

	return (
		<div
			className={`fiscal-receipt-print font-mono text-xs leading-normal bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] p-6 rounded-2xl border border-[var(--border,#cbd5e1)] shadow-sm max-w-md mx-auto select-text ${className}`.trim()}
			data-testid="order804n-fiscal-receipt-view"
		>
			{/* Clinic Header */}
			<div className="text-center space-y-1 pb-3 border-b border-dashed border-[var(--border,#cbd5e1)]">
				<h3 className="font-black text-sm uppercase tracking-wider text-[var(--ink,#0f172a)]">
					{receipt.clinicLegalName}
				</h3>
				<p className="text-xs text-[var(--muted,#64748b)]">
					ИНН: {receipt.clinicInn} · СНО: {receipt.taxationSystemName}
				</p>
				<p className="text-xs text-[var(--muted,#64748b)]">
					{receipt.clinicAddress}
				</p>
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
				<div className="flex justify-between">
					<span className="text-[var(--muted,#64748b)]">ПАЦИЕНТ:</span>
					<span className="font-semibold truncate max-w-[200px]">{receipt.patientName}</span>
				</div>
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
							<span>ТИП КОРРЕКЦИИ (Тег 1173):</span>
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

			{/* Itemized Services (Order 804n) */}
			<div className="py-3 space-y-2.5 border-b border-dashed border-[var(--border,#cbd5e1)]">
				<div className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
					Предмет расчета (Номенклатура 804н):
				</div>

				<div className="space-y-2.5">
					{receipt.items.map((it, idx) => (
						<div key={it.id || idx} className="space-y-1 pb-2 border-b border-dotted border-[var(--border,#cbd5e1)] last:border-0 last:pb-0">
							<div className="flex items-start justify-between gap-2">
								<div className="font-bold text-xs text-[var(--ink,#0f172a)] leading-snug">
									{idx + 1}. {it.name}
								</div>
								{it.isMarkedItem && (
									<span className="shrink-0 px-2 py-0.5 rounded-md bg-[var(--ink,#0f172a)] text-[var(--paper,#ffffff)] text-xs font-mono font-bold" title="Маркированный товар Честный ЗНАК / МДЛП (Тег 1162 / 2000)">
										[М]
									</span>
								)}
							</div>
							{it.stageCategoryTitle && (
								<div className="text-xs text-[var(--muted,#64748b)]">
									Этап: {it.stageCategoryTitle}
								</div>
							)}
							<div className="flex justify-between text-xs text-[var(--ink,#0f172a)]">
								<span className="text-[var(--muted,#64748b)]">
									{it.quantity} шт. × {it.unitPriceRub.toLocaleString("ru-RU")} ₽
									{it.discountRub > 0 ? ` (- скидка ${it.discountRub} ₽)` : ""}
								</span>
								<span className="font-bold">
									={it.amountRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="flex justify-between text-xs text-[var(--muted,#64748b)]">
								<span>НДС: БЕЗ НДС (ст. 149 НК)</span>
								<span className="font-semibold text-[var(--brand-primary,#0d9488)]">ВЫЧЕТ: КОД 0{it.taxDeductionCategory}</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Total and Split Payments Breakdown */}
			<div className="py-3 space-y-2 border-b border-dashed border-[var(--border,#cbd5e1)]">
				<div className="flex justify-between items-baseline font-black text-sm sm:text-base text-[var(--ink,#0f172a)] pt-1">
					<span>{receipt.operationType === "income_return" ? "ИТОГО К ВОЗВРАТУ:" : "ИТОГО К ОПЛАТЕ:"}</span>
					<span className="font-black text-[var(--ok-fg,#059669)] text-base sm:text-lg">
						={receipt.totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div className="pt-2 space-y-1.5 text-xs text-[var(--ink,#0f172a)]">
					{receipt.payments.cashRub > 0 && (
						<>
							<div className="flex justify-between">
								<span className="text-[var(--muted,#64748b)]">НАЛИЧНЫМИ (Тег 1031):</span>
								<span className="font-bold">{receipt.payments.cashRub.toLocaleString("ru-RU")} ₽</span>
							</div>
							{receipt.payments.receivedCashRub > receipt.payments.cashRub && (
								<>
									<div className="flex justify-between text-[var(--muted,#64748b)]">
										<span>ПОЛУЧЕНО НАЛИЧНЫМИ:</span>
										<span>{receipt.payments.receivedCashRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between text-[var(--ok-fg,#059669)] font-bold">
										<span>СДАЧА:</span>
										<span>{receipt.payments.changeRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</>
							)}
						</>
					)}
					{receipt.payments.cardRub > 0 && (
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">БЕЗНАЛИЧНЫМИ / КАРТА (Тег 1081):</span>
							<span className="font-bold text-blue-700 dark:text-blue-300">{receipt.payments.cardRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.sbpRub > 0 && (
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">СБП / ПЛАТИ QR (Тег 1081):</span>
							<span className="font-bold text-[var(--teal,#0d9488)]">{receipt.payments.sbpRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.insuranceRub > 0 && (
						<div className="flex justify-between text-[var(--brand-primary,#0d9488)] bg-[var(--brand-primary-soft,#f0fdfa)] px-2 py-1 rounded-lg border border-[var(--brand-primary,#0d9488)]/20">
							<span>ДМС СТРАХОВАЯ {receipt.guaranteeLetterNumber ? `(ГП №${receipt.guaranteeLetterNumber})` : "(БЕЗНАЛ)"}:</span>
							<span className="font-bold text-[var(--brand-primary,#0d9488)]">{receipt.payments.insuranceRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.insuranceRub > 0 && receipt.payments.patientCoPayRub > 0 && (
						<div className="flex justify-between font-semibold text-[var(--ink,#0f172a)] pt-0.5">
							<span className="text-[var(--muted,#64748b)]">ДОПЛАТА ПАЦИЕНТА В КАССУ:</span>
							<span className="font-bold">{receipt.payments.patientCoPayRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.depositRub > 0 && (
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">ПРЕДОПЛАТА / АВАНС (Тег 1215):</span>
							<span className="font-bold text-amber-700 dark:text-amber-300">{receipt.payments.depositRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.familyWalletRub > 0 && (
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">СЕМЕЙНЫЙ БАЛАНС (Тег 1215):</span>
							<span className="font-bold text-purple-700 dark:text-purple-300">{receipt.payments.familyWalletRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.certificateRub > 0 && (
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">СЕРТИФИКАТ (Тег 1215):</span>
							<span className="font-bold text-amber-700 dark:text-amber-300">{receipt.payments.certificateRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
				</div>
			</div>

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
					<span>СНО:</span>
					<span className="font-semibold text-[var(--ink,#0f172a)]">{receipt.taxationSystemName}</span>
				</div>
				<div className="flex justify-between">
					<span>СПРАВКА ДЛЯ ФНС (КНД 1151156):</span>
					<span className="font-bold text-[var(--brand-primary,#0d9488)]">
						{receipt.taxDeductionCategory === "2"
							? "КОД 02 (Дорогостоящее)"
							: "КОД 01 (Стандартное)"}
					</span>
				</div>
			</div>

			{/* OFD QR and Verification Footer */}
			<div className="pt-3 text-center space-y-2">
				<div className="flex items-center justify-center p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
					<div className="space-y-1">
						<div className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Проверка чека в ФНС / ОФД:
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

				<p className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider pt-1">
					СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ ДЕНТЕ!
				</p>
			</div>
		</div>
	);
};
