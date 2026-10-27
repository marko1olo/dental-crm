import React from "react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface ReceiptPrintPaymentsProps {
	readonly receipt: FiscalReceipt54FzResult;
}

export const ReceiptPrintPayments: React.FC<ReceiptPrintPaymentsProps> = ({ receipt }) => {
	const { payments } = receipt;
	return (
		<div className="py-3 space-y-2 border-b border-dashed border-[var(--border,#cbd5e1)]">
			<div className="flex justify-between items-baseline font-black text-sm sm:text-base text-[var(--ink,#0f172a)] pt-1">
				<span>{receipt.operationType === "income_return" ? "ИТОГО К ВОЗВРАТУ:" : "ИТОГО К ОПЛАТЕ:"}</span>
				<span className="font-black text-[var(--ok-fg,#059669)] text-base sm:text-lg">
					={receipt.totalRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="pt-2 space-y-1.5 text-xs text-[var(--ink,#0f172a)]">
				{payments.cashRub > 0 && (
					<>
						<div className="flex justify-between">
							<span className="text-[var(--muted,#64748b)]">НАЛИЧНЫМИ:</span>
							<span className="font-bold">{payments.cashRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						{payments.receivedCashRub > payments.cashRub && (
							<>
								<div className="flex justify-between text-[var(--muted,#64748b)]">
									<span>ПОЛУЧЕНО НАЛИЧНЫМИ:</span>
									<span>{payments.receivedCashRub.toLocaleString("ru-RU")} ₽</span>
								</div>
								<div className="flex justify-between text-[var(--ok-fg,#059669)] font-bold">
									<span>СДАЧА:</span>
									<span>{payments.changeRub.toLocaleString("ru-RU")} ₽</span>
								</div>
							</>
						)}
					</>
				)}
				{payments.cardRub > 0 && (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">БЕЗНАЛИЧНЫМИ / КАРТА:</span>
						<span className="font-bold text-blue-700 dark:text-blue-300">{payments.cardRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.sbpRub > 0 && (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">СБП / ПЛАТИ QR:</span>
						<span className="font-bold text-[var(--teal,#0d9488)]">{payments.sbpRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.insuranceRub > 0 && (
					<div className="flex justify-between text-[var(--brand-primary,#0d9488)] bg-[var(--brand-primary-soft,#f0fdfa)] px-2 py-1 rounded-lg border border-[var(--brand-primary,#0d9488)]/20">
						<span>ДМС СТРАХОВАЯ {receipt.guaranteeLetterNumber ? `(ГП №${receipt.guaranteeLetterNumber})` : "(БЕЗНАЛ)"}:</span>
						<span className="font-bold text-[var(--brand-primary,#0d9488)]">{payments.insuranceRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.insuranceRub > 0 && payments.patientCoPayRub > 0 && (
					<div className="flex justify-between font-semibold text-[var(--ink,#0f172a)] pt-0.5">
						<span className="text-[var(--muted,#64748b)]">ДОПЛАТА ПАЦИЕНТА В КАССУ:</span>
						<span className="font-bold">{payments.patientCoPayRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.depositRub > 0 && (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">ПРЕДОПЛАТА / АВАНС:</span>
						<span className="font-bold text-amber-700 dark:text-amber-300">{payments.depositRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.familyWalletRub > 0 && (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">СЕМЕЙНЫЙ БАЛАНС:</span>
						<span className="font-bold text-purple-700 dark:text-purple-300">{payments.familyWalletRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{payments.certificateRub > 0 && (
					<div className="flex justify-between">
						<span className="text-[var(--muted,#64748b)]">СЕРТИФИКАТ:</span>
						<span className="font-bold text-amber-700 dark:text-amber-300">{payments.certificateRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				{receipt.hasMixedItems ? (
					<div className="pt-2 border-t border-dotted border-[var(--border,#cbd5e1)] text-[11px] space-y-1">
						<div className="flex justify-between text-[var(--muted,#64748b)]">
							<span>МЕДУСЛУГИ (БЕЗ НДС):</span>
							<span className="font-semibold text-[var(--ink,#0f172a)]">{((receipt.medicalTotalKopecks || receipt.vatNoneKopecks || 0) / 100).toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="flex justify-between text-[var(--muted,#64748b)]">
							<span>ТОВАРЫ РОЗНИЦЫ (НДС 20%):</span>
							<span className="font-semibold text-[var(--ink,#0f172a)]">{((receipt.retailTotalKopecks || 0) / 100).toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="flex justify-between font-bold text-[var(--ink,#0f172a)]">
							<span>В Т.Ч. СУММА НДС 20%:</span>
							<span className="font-mono">{((receipt.vat20Kopecks || 0) / 100).toFixed(2)} ₽</span>
						</div>
					</div>
				) : (
					receipt.vat20Rub !== undefined && receipt.vat20Rub > 0 && (
						<div className="flex justify-between text-xs font-bold pt-1 border-t border-dotted border-[var(--border,#cbd5e1)]">
							<span>В Т.Ч. СУММА НДС 20%:</span>
							<span className="font-mono">{receipt.vat20Rub.toFixed(2)} ₽</span>
						</div>
					)
				)}
			</div>
		</div>
	);
};
