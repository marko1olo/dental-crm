import { Clock, WifiOff } from "lucide-react";
import React from "react";

export const digitsOnly = (value: string, maxLength: number) =>
	value.replace(/[^\d]/g, "").slice(0, maxLength);

export type DigitsInputProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"onChange"
> & {
	maxLength: number;
	onChange: (value: string) => void;
};

export function DigitsInput({ maxLength, onChange, ...props }: DigitsInputProps) {
	return (
		<input
			inputMode="numeric"
			autoComplete="off"
			pattern="[0-9]*"
			{...props}
			onChange={(event) => onChange(digitsOnly(event.target.value, maxLength))}
		/>
	);
}

export interface FiscalDetailsProps {
	readonly fiscalCashierName: string;
	readonly fiscalDetailsOpen: boolean;
	readonly fiscalFd: string;
	readonly fiscalFn: string;
	readonly fiscalFpd: string;
	readonly fiscalReceiptIssuedAt: string;
	readonly fiscalReceiptNumber: string;
	readonly fiscalReceiptUrl: string;
	readonly fiscalReceiptUrlInvalid: boolean;
	readonly onFiscalCashierNameChange: (value: string) => void;
	readonly onFiscalFdChange: (value: string) => void;
	readonly onFiscalFnChange: (value: string) => void;
	readonly onFiscalFpdChange: (value: string) => void;
	readonly onFiscalReceiptIssuedAtChange: (value: string) => void;
	readonly onFiscalReceiptNumberChange: (value: string) => void;
	readonly onFiscalReceiptUrlChange: (value: string) => void;
	readonly paymentMissingId: string;
}

export function FiscalDetails({
	fiscalCashierName,
	fiscalDetailsOpen,
	fiscalFd,
	fiscalFn,
	fiscalFpd,
	fiscalReceiptIssuedAt,
	fiscalReceiptNumber,
	fiscalReceiptUrl,
	fiscalReceiptUrlInvalid,
	onFiscalCashierNameChange,
	onFiscalFdChange,
	onFiscalFnChange,
	onFiscalFpdChange,
	onFiscalReceiptIssuedAtChange,
	onFiscalReceiptNumberChange,
	onFiscalReceiptUrlChange,
	paymentMissingId,
}: FiscalDetailsProps) {
	return (
		<details
			className="payment-capture-detail-section"
			open={fiscalDetailsOpen}
		>
			<summary>Фискальный чек и кассир</summary>
			<div className="smart-details-content">
				<div className="payment-capture-detail-grid">
					<div className="smart-field">
						<input
							id="payment-fiscal-receipt-number"
							autoComplete="off"
							value={fiscalReceiptNumber}
							onChange={(event) =>
								onFiscalReceiptNumberChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-receipt-number">
							Номер чека (можно пусто, если есть ФД/ФПД)
						</label>
					</div>
					<div className="smart-field no-float">
						<input
							id="payment-fiscal-receipt-issued-at"
							type="datetime-local"
							value={fiscalReceiptIssuedAt}
							onChange={(event) =>
								onFiscalReceiptIssuedAtChange(event.target.value)
							}
						/>
						<label htmlFor="payment-fiscal-receipt-issued-at">Дата чека</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fn"
							maxLength={32}
							value={fiscalFn}
							onChange={onFiscalFnChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fn">
							ФН (номер фискального накопителя)
						</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fd"
							maxLength={32}
							value={fiscalFd}
							onChange={onFiscalFdChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fd">
							ФД (номер фискального документа)
						</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fpd"
							maxLength={32}
							value={fiscalFpd}
							onChange={onFiscalFpdChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fpd">ФПД (фискальный признак)</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-fiscal-receipt-url"
							type="url"
							autoComplete="url"
							aria-invalid={fiscalReceiptUrlInvalid || undefined}
							aria-describedby={
								fiscalReceiptUrlInvalid ? paymentMissingId : undefined
							}
							value={fiscalReceiptUrl}
							onChange={(event) => onFiscalReceiptUrlChange(event.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-receipt-url">
							Ссылка ОФД (https://...)
						</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-fiscal-cashier-name"
							autoComplete="off"
							value={fiscalCashierName}
							onChange={(event) =>
								onFiscalCashierNameChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-cashier-name">
							Кассир (ФИО администратора)
						</label>
					</div>
				</div>
			</div>
		</details>
	);
}

export interface PaymentFiscalCashierBarProps extends FiscalDetailsProps {
	readonly isOnline: boolean;
	readonly pendingCount: number;
	readonly isSyncing: boolean;
	readonly onSyncQueue: () => void;
}

export function PaymentFiscalCashierBar({
	isOnline,
	pendingCount,
	isSyncing,
	onSyncQueue,
	...fiscalProps
}: PaymentFiscalCashierBarProps) {
	return (
		<>
			{/* Информативный бейдж очереди офлайн-фискализации 54-ФЗ (Mandates 8e, 8n) */}
			{pendingCount > 0 && (
				<div
					className="offline-fiscal-queue-badge flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-bold mb-2 select-none"
					data-testid="offline-fiscal-queue-badge"
					role="status"
				>
					<div className="flex items-center gap-1.5">
						<Clock size={14} className="shrink-0 text-blue-600 dark:text-blue-400 animate-pulse" />
						<span>Оплата зафиксирована, чек в очереди фискализации ({pendingCount})</span>
					</div>
					{isOnline && (
						<button
							type="button"
							style={{ minHeight: "44px" }}
							onClick={onSyncQueue}
							disabled={isSyncing}
							className="min-h-[44px] sm:min-h-0 text-[11px] font-semibold underline hover:no-underline text-blue-700 dark:text-blue-200 cursor-pointer disabled:opacity-50 flex items-center"
						>
							{isSyncing ? "Синхронизация..." : "Отправить в ОФД"}
						</button>
					)}
				</div>
			)}

			{!isOnline && (
				<div
					className="offline-cash-mode-banner flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2 select-none"
					data-testid="offline-cash-mode-banner"
					role="status"
				>
					<WifiOff size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
					<span>Офлайн-режим кассы: чеки автоматически буферизуются в 54-ФЗ очередь</span>
				</div>
			)}

			{/* Раскрывающийся блок фискального чека и кассира */}
			<FiscalDetails {...fiscalProps} />
		</>
	);
}
