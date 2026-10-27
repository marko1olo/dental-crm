import React from "react";

export interface PatientBillingDirectCustomPaymentProps {
	readonly initialServicesCount: number;
	readonly customServiceName: string;
	readonly onSetCustomServiceName: (name: string) => void;
	readonly customAmountRub: number;
	readonly onSetCustomAmountRub: (rub: number) => void;
}

export const PatientBillingDirectCustomPayment: React.FC<PatientBillingDirectCustomPaymentProps> = ({
	initialServicesCount,
	customServiceName,
	onSetCustomServiceName,
	customAmountRub,
	onSetCustomAmountRub,
}) => {
	if (initialServicesCount !== 0) return null;

	return (
		<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3 shadow-xs">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)]">
					Прямой прием оплаты (без привязки к акту)
				</span>
				<span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300">
					Чек
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Назначение платежа
					</label>
					<input
						type="text"
						value={customServiceName}
						onChange={(e) => onSetCustomServiceName(e.target.value)}
						placeholder="Аванс за стоматологические услуги / Консультация"
						className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink)] font-medium outline-none focus:border-teal-500"
					/>
				</div>
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Сумма к оплате (₽)
					</label>
					<input
						type="number"
						min={0}
						step={1}
						value={customAmountRub === 0 ? "" : customAmountRub}
						onChange={(e) => onSetCustomAmountRub(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0"
						className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-sm text-[var(--ink)] font-mono font-bold outline-none focus:border-teal-500"
					/>
				</div>
			</div>
		</div>
	);
};
