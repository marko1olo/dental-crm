import type React from "react";
import { Award, ChevronDown, ChevronUp } from "lucide-react";

export interface CashboxQuickCardProps {
	readonly summaryAmount: number;
	readonly patientName: string | null;
	readonly hasPatient: boolean;
	readonly showManualForm: boolean;
	readonly onOpenLoyaltyModal: () => void;
	readonly onOpenPaymentModal: () => void;
	readonly onToggleManualForm: () => void;
}

export const CashboxQuickCard: React.FC<CashboxQuickCardProps> = ({
	summaryAmount,
	patientName,
	showManualForm,
	onOpenLoyaltyModal,
	onOpenPaymentModal,
	onToggleManualForm,
}) => {
	return (
		<div className="payment-quick-card mb-4 p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						Быстрый расчёт пациента
					</div>
					<div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--ink)] my-0.5">
						{summaryAmount.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-xs text-[var(--muted)] truncate">
						{patientName ? (
							<>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></>
						) : (
							"Пациент не выбран — выберите карточку в картотеке"
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0 flex-nowrap">
					<button
						type="button"
						onClick={onOpenLoyaltyModal}
						className="min-h-[36px] h-9 px-3 sm:px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
						data-testid="btn-open-cashbox-loyalty-modal"
						title="Списание бонусов и сертификаты пациента"
					>
						<Award size={16} className="text-[var(--teal)]" />
						<span className="hidden md:inline">Бонусы и сертификаты</span>
						<span className="md:hidden">Бонусы</span>
					</button>
					<button
						type="button"
						onClick={onOpenPaymentModal}
						className="primary-button min-h-[36px] h-9 px-4 sm:px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center flex items-center gap-2 cursor-pointer active:scale-[0.99] transition-all shadow-xs"
						data-testid="btn-open-cashbox-payment-modal"
						title="Принять оплату от пациента"
					>
						<span className="sr-only">Принять оплату</span>
						<span>Принять оплату и выбить чек</span>
					</button>
					<button
						type="button"
						onClick={onToggleManualForm}
						className="min-h-[36px] h-9 w-9 px-0 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
						title="Показать / скрыть ручные параметры"
					>
						{showManualForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</button>
				</div>
			</div>
		</div>
	);
};
