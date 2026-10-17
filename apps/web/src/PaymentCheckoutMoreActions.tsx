import { Coins, CreditCard, MoreVertical } from "lucide-react";
import React from "react";

export type PaymentCheckoutMoreActionsProps = {
	isMoreActionsOpen: boolean;
	isSaving: boolean;
	onToggleMoreActions: () => void;
	onCloseMoreActions: () => void;
	onSberPosClick: () => void;
	onOpenSplitModal: () => void;
	onManualCardTerminalSubmit: () => void;
};

export function PaymentCheckoutMoreActions({
	isMoreActionsOpen,
	isSaving,
	onToggleMoreActions,
	onCloseMoreActions,
	onSberPosClick,
	onOpenSplitModal,
	onManualCardTerminalSubmit,
}: PaymentCheckoutMoreActionsProps) {
	return (
		<div className="relative shrink-0 flex-shrink-0">
			<button
				className="secondary-button icon-button min-h-[44px] min-w-[44px] sm:min-h-9 sm:h-9 sm:min-w-9 sm:w-9 p-0 flex items-center justify-center rounded-lg shrink-0 flex-shrink-0"
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
						onClick={() => {
							onCloseMoreActions();
							onSberPosClick();
						}}
						className="ghost-button w-full justify-start text-left px-2.5 py-2 text-xs font-medium rounded-lg text-[var(--ink)] sm:hidden flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
						role="menuitem"
						disabled={isSaving}
						title={isSaving ? "Операция выполняется..." : "Сбер POS"}
					>
						<CreditCard size={15} className="shrink-0 text-[var(--teal)]" />
						<span>Сбер POS</span>
					</button>
					<button
						type="button"
						onClick={() => {
							onCloseMoreActions();
							onOpenSplitModal();
						}}
						className="ghost-button w-full justify-start text-left px-2.5 py-2 text-xs font-medium rounded-lg text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
						role="menuitem"
						disabled={isSaving}
						data-testid="payment-split-modal-button"
						title={isSaving ? "Операция выполняется..." : "Комбинированная оплата: Нал + Карта + Баланс (Сплит)"}
					>
						<Coins size={15} className="shrink-0 text-[var(--teal)]" />
						<span>Комбо (Сплит)</span>
					</button>
					<button
						type="button"
						onClick={() => {
							onCloseMoreActions();
							onManualCardTerminalSubmit();
						}}
						className="ghost-button w-full justify-start text-left px-2.5 py-2 text-xs font-semibold rounded-lg text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
						role="menuitem"
						disabled={isSaving}
						title={isSaving ? "Операция выполняется..." : "Зафиксировать оплату в CRM, если карта списана на терминале вручную"}
						data-testid="payment-manual-card-terminal-button"
					>
						<CreditCard size={15} className="shrink-0 text-[var(--teal)]" />
						<span>Карта подтверждена вручную</span>
					</button>
				</div>
			)}
		</div>
	);
}
