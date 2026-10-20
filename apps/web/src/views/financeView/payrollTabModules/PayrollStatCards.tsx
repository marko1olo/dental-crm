import React from "react";
import { TrendingUp, FlaskConical, Package, Calculator, Award, Wallet } from "lucide-react";
import type { DoctorPayrollResult } from "@dental/shared/payroll";

export interface PayrollStatCardsProps {
	readonly result: DoctorPayrollResult;
}

export function PayrollStatCards({ result }: PayrollStatCardsProps): React.JSX.Element {
	const fmt = (kop: number) => (kop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";

	const cards = [
		{
			title: "Фактическая выручка",
			subtitle: "По закрытым чекам",
			amount: fmt(result.totalGrossRevenueKop),
			icon: TrendingUp,
			colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
		},
		{
			title: "Вычет лаборатории (ЗТЛ)",
			subtitle: "Заказ-наряды коронок",
			amount: `-${fmt(result.totalLabDeductionsKop)}`,
			icon: FlaskConical,
			colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
		},
		{
			title: "Вычет материалов",
			subtitle: "Прямые клинические",
			amount: `-${fmt(result.totalMaterialDeductionsKop)}`,
			icon: Package,
			colorClass: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
		},
		{
			title: "Чистая база (Net Base)",
			subtitle: "Выручка − ЗТЛ − Материалы",
			amount: fmt(result.totalNetBaseKop),
			icon: Calculator,
			colorClass: "text-teal-600 dark:text-teal-400 bg-teal-500/10",
		},
		{
			title: `Начислено (${result.baseCommissionPercent}%)`,
			subtitle: result.kpiTierBadgeRu || "Сдельная часть",
			amount: fmt(result.grossPayoutBeforeTaxKop),
			icon: Award,
			colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
		},
		{
			title: "На руки (к выплате)",
			subtitle: result.taxRegime === "self_employed" ? "НПД 6% оплачивается соло" : "После НДФЛ 13%",
			amount: fmt(result.netPayoutToDoctorKop),
			icon: Wallet,
			colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold",
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
			{cards.map((c) => {
				const Icon = c.icon;
				return (
					<div
						key={c.title}
						className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs flex flex-col justify-between"
					>
						<div className="flex items-center justify-between gap-1 mb-2">
							<span className="text-[11px] font-medium text-[var(--muted)] leading-tight">{c.title}</span>
							<div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${c.colorClass}`}>
								<Icon className="w-3.5 h-3.5" />
							</div>
						</div>
						<div>
							<div className="text-sm sm:text-base font-extrabold font-mono text-[var(--ink)] tracking-tight">
								{c.amount}
							</div>
							<div className="text-[10px] text-[var(--muted)] truncate mt-0.5">{c.subtitle}</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
