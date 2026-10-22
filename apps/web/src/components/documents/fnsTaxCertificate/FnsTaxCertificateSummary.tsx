import React from "react";

interface FnsTaxCertificateSummaryProps {
	code01Rub: number;
	eligibleCode01Rub: number;
	code02Rub: number;
	estimatedRefund13Rub: number;
}

export const FnsTaxCertificateSummary: React.FC<FnsTaxCertificateSummaryProps> = ({
	code01Rub,
	eligibleCode01Rub,
	code02Rub,
	estimatedRefund13Rub,
}) => (
	<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
		<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
			<span className="text-[11px] text-[var(--muted)] block">
				Код 1 (Обычное лечение):
			</span>
			<strong className="text-[15px] text-[var(--ink)]">
				{code01Rub.toLocaleString("ru-RU")} ₽
			</strong>
			<span className="text-[11px] text-[var(--muted)] block mt-1">
				К вычету: {eligibleCode01Rub.toLocaleString("ru-RU")} ₽
			</span>
		</div>

		<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
			<span className="text-[11px] text-[var(--muted)] block">
				Код 2 (Дорогостоящее):
			</span>
			<strong className="text-[15px] text-[var(--teal)]">
				{code02Rub.toLocaleString("ru-RU")} ₽
			</strong>
			<span className="text-[11px] text-[var(--muted)] block mt-1">
				Без лимита (ПП РФ № 458)
			</span>
		</div>

		<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
			<span className="text-[11px] text-[var(--muted)] block">
				Расчетный возврат 13%:
			</span>
			<strong className="text-[15px] text-emerald-600 dark:text-emerald-400">
				{estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
			</strong>
			<span className="text-[11px] text-[var(--muted)] block mt-1">
				Сумма вычета: {(eligibleCode01Rub + code02Rub).toLocaleString("ru-RU")} ₽
			</span>
		</div>
	</div>
);
