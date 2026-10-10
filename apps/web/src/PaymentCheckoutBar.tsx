import { Coins, CreditCard, MoreVertical } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { normalizeRubAmountInput } from "./rubAmountInput";

export type PaymentCheckoutBarProps = {
	amount: string;
	remainingDebt?: number | undefined;
	paymentReadyToSubmit: boolean;
	paymentMissingId: string;
	isSaving: boolean;
	isZeroAmount: boolean;
	isMoreActionsOpen: boolean;
	onToggleMoreActions: () => void;
	onCloseMoreActions: () => void;
	onPrimarySubmit: () => void;
	onSberPosClick: () => void;
	onOpenSplitModal: () => void;
	onManualCardTerminalSubmit: () => void;
};

export function PaymentCheckoutBar({
	amount,
	remainingDebt,
	paymentReadyToSubmit,
	paymentMissingId,
	isSaving,
	isZeroAmount,
	isMoreActionsOpen,
	onToggleMoreActions,
	onCloseMoreActions,
	onPrimarySubmit,
	onSberPosClick,
	onOpenSplitModal,
	onManualCardTerminalSubmit,
}: PaymentCheckoutBarProps) {
	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			id="payment-checkout-bar"
			className="payment-checkout-bar col-span-full fixed bottom-0 right-0 z-50 bg-[var(--paper-strong,var(--paper))]/95 dark:bg-[var(--paper-strong)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-2xl px-2 sm:px-3 py-2 sm:py-2.5 flex flex-row items-center justify-between gap-1.5 sm:gap-2 max-w-full min-w-0 box-border left-0 md:left-[var(--sidebar-width,200px)] pb-[max(8px,env(safe-area-inset-bottom))] overflow-hidden"
			style={{ position: "fixed", bottom: 0, right: 0, zIndex: 9999 }}
			data-testid="payment-checkout-bar"
		>
			<div
				className="payment-total-due-banner flex items-center justify-between gap-1 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-none mb-0 max-sm:bg-transparent max-sm:border-none max-sm:p-0 shrink sm:shrink-0 min-w-0 sm:min-w-[150px] md:min-w-[170px]"
				data-testid="payment-total-due-banner"
			>
				<span className="text-xs sm:text-xs font-bold text-[var(--muted)] max-sm:text-xs max-sm:leading-none whitespace-nowrap pr-1 sm:pr-1.5 shrink-0">
					<span className="hidden sm:inline">Итого к списанию:</span>
					<span className="sm:hidden">Итого:</span>
				</span>
				<span className="text-sm sm:text-base font-black font-mono text-[var(--ink)] max-sm:text-sm max-sm:leading-tight whitespace-nowrap text-right flex-1 min-w-0">
					{amount && normalizeRubAmountInput(amount) !== null
						? `${(normalizeRubAmountInput(amount) ?? 0).toLocaleString("ru-RU")} ₽`
						: remainingDebt && remainingDebt > 0
							? `${remainingDebt.toLocaleString("ru-RU")} ₽`
							: "0 ₽"}
				</span>
			</div>

			<div className="payment-actions flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-1 min-w-0 justify-end">
				<button
					className="primary-button min-h-[52px] sm:min-h-9 sm:h-9 flex-1 sm:flex-initial font-bold text-xs sm:text-sm min-w-0 px-3 sm:px-3 whitespace-nowrap shrink-0"
					type="button"
					onClick={onPrimarySubmit}
					aria-busy={isSaving || undefined}
					aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}
					disabled={isSaving}
					title={isSaving ? "Идет сохранение платежа в базе данных..." : undefined}
					data-testid="payment-submit-button"
					id="cashier-tender-action-btn"
					data-tour="cashier-pay"
				>
					<CreditCard aria-hidden="true" size={16} className="shrink-0" />{" "}
					<span className="truncate">
						{isSaving ? "Записываю..." : "Принять оплату"}
					</span>
				</button>
				<button
					style={{ minHeight: "44px" }}
					className="secondary-button min-h-[44px] sm:min-h-9 sm:h-9 flex-1 font-semibold text-xs max-sm:!hidden min-w-0 px-2 sm:px-2.5 lg:px-3 overflow-hidden shrink disabled:opacity-40 disabled:cursor-not-allowed"
					type="button"
					onClick={onSberPosClick}
					aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}
					disabled={isSaving}
					title={isSaving ? "Идет сохранение платежа, терминал занят..." : "Оплата картой (Сбербанк POS / QR)"}
					data-testid="payment-sberpos-button"
				>
					<CreditCard aria-hidden="true" size={15} className="shrink-0" />{" "}
					<span className="hidden sm:inline truncate whitespace-nowrap">
						<span className="2xl:inline hidden">Оплата картой (Сбербанк POS / QR)</span>
						<span className="2xl:hidden xl:inline hidden">Картой (POS/QR)</span>
						<span className="xl:hidden">Картой</span>
					</span>
				</button>
				<button
					style={{ minHeight: "44px" }}
					className="secondary-button min-h-[44px] sm:min-h-9 sm:h-9 flex-1 font-semibold text-xs max-sm:!hidden flex items-center gap-1 sm:gap-1.5 min-w-0 px-2 sm:px-2.5 lg:px-3 whitespace-nowrap shrink disabled:opacity-40 disabled:cursor-not-allowed"
					type="button"
					onClick={onOpenSplitModal}
					aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}
					disabled={isSaving}
					title={isSaving ? "Операция выполняется..." : "Комбинированная оплата: Нал + Карта + Баланс (Сплит)"}
					data-testid="payment-split-modal-button"
				>
					<Coins aria-hidden="true" size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />{" "}
					<span className="hidden sm:inline whitespace-nowrap">
						<span className="hidden xl:inline">Комбо </span>Сплит
					</span>
				</button>
				<div className="relative shrink-0 flex-shrink-0">
					<button
						style={{ minHeight: "44px" }}
						className="secondary-button min-h-[44px] min-w-[44px] sm:min-h-9 sm:h-9 sm:min-w-9 sm:w-9 p-0 flex items-center justify-center rounded-lg shrink-0 flex-shrink-0"
						type="button"
						onClick={onToggleMoreActions}
						aria-expanded={isMoreActionsOpen}
						aria-label="Дополнительные способы оплаты"
						disabled={isSaving}
						title={isSaving ? "Операция выполняется..." : "Дополнительные способы оплаты"}
					>
						<MoreVertical size={16} className="shrink-0 text-[var(--muted)]" />
					</button>
					{isMoreActionsOpen && (
						<div
							className="absolute right-0 bottom-full mb-1 w-56 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-1 text-left"
							role="menu"
						>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								onClick={() => {
									onCloseMoreActions();
									onSberPosClick();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] sm:hidden flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
								role="menuitem"
								disabled={isSaving}
								title={isSaving ? "Операция выполняется..." : "Сбер POS"}
							>
								<CreditCard size={15} className="shrink-0 text-[var(--teal)]" />
								<span>Сбер POS</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								onClick={() => {
									onCloseMoreActions();
									onOpenSplitModal();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
								role="menuitem"
								disabled={isSaving}
								data-testid="payment-split-modal-button"
								title={isSaving ? "Операция выполняется..." : "Комбинированная оплата: Нал + Карта + Баланс (Сплит)"}
							>
								<Coins size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
								<span>Комбо (Сплит)</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								onClick={() => {
									onCloseMoreActions();
									onManualCardTerminalSubmit();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-bold rounded-lg hover:bg-[var(--line)] text-blue-700 dark:text-blue-300 flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
								role="menuitem"
								disabled={isSaving}
								title={isSaving ? "Операция выполняется..." : "Зафиксировать оплату в CRM, если карта списана на терминале вручную"}
								data-testid="payment-manual-card-terminal-button"
							>
								<CreditCard size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
								<span>Карта подтверждена вручную</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
