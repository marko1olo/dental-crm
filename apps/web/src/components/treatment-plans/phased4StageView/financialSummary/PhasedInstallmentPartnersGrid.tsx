import React from "react";

export interface PhasedInstallmentPartnersGridProps {
	readonly installmentMonthlyRub: number;
	readonly grandTotalRub: number;
}

export const PhasedInstallmentPartnersGrid: React.FC<PhasedInstallmentPartnersGridProps> = ({
	installmentMonthlyRub,
	grandTotalRub,
}) => {
	const stageSplit30 = Math.round(grandTotalRub * 0.3);
	const stageSplit40 = Math.round(grandTotalRub * 0.4);
	const stageSplitFinal30 = Math.max(0, grandTotalRub - stageSplit30 - stageSplit40);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="font-bold text-[var(--ink)]">Т-Банк Рассрочка 0%</div>
				<div className="text-[var(--teal)] font-extrabold text-sm mt-0.5 tabular-nums">
					{installmentMonthlyRub.toLocaleString("ru-RU")} ₽ / мес
				</div>
				<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
					Решение по СМС за 2 минуты без визита в банк
				</div>
			</div>
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="font-bold text-[var(--ink)]">Сбер Покупай 0%</div>
				<div className="text-[var(--teal)] font-extrabold text-sm mt-0.5 tabular-nums">
					{installmentMonthlyRub.toLocaleString("ru-RU")} ₽ / мес
				</div>
				<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
					Одобрение в СберБанк Онлайн в 1 клик
				</div>
			</div>
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="font-bold text-[var(--ink)]">
					Внутренняя рассрочка клиники (30/40/30)
				</div>
				<div className="text-[var(--ink)] font-extrabold text-xs mt-1 tabular-nums">
					Аванс 30%: {stageSplit30.toLocaleString("ru-RU")} ₽ · Хирургия 40%:{" "}
					{stageSplit40.toLocaleString("ru-RU")} ₽ · Финал 30%:{" "}
					{stageSplitFinal30.toLocaleString("ru-RU")} ₽
				</div>
				<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
					Прямой договор с клиникой без участия банка
				</div>
			</div>
		</div>
	);
};
