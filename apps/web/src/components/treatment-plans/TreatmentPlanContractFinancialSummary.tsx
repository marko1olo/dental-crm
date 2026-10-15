import React from "react";
import { Layers, Percent } from "lucide-react";
import { type Kopecks, kopecksToWordsRu } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanTier } from "./types";
import { TreatmentPlanContractInstallmentsAndTax } from "./TreatmentPlanContractInstallmentsAndTax";

export interface TreatmentPlanContractFinancialSummaryProps {
	readonly tier: TreatmentPlanTier;
	readonly activeStages: readonly TreatmentPlanStage[];
	readonly grossTotalRub: number;
	readonly discountPercent: number;
	readonly discountTotalRub: number;
	readonly bonusPointsDeductedRub: number;
	readonly finalTotalKopecks: Kopecks;
	readonly finalTotalRub: number;
	readonly installmentMonths: number;
	readonly planAgeDays?: number | undefined;
}

export const TreatmentPlanContractFinancialSummary: React.FC<TreatmentPlanContractFinancialSummaryProps> = (props) => {
	const { tier, activeStages, grossTotalRub, discountPercent, discountTotalRub, bonusPointsDeductedRub, finalTotalKopecks, finalTotalRub, installmentMonths, planAgeDays } = props;

	return (
		<div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h3 className="font-black text-slate-900 uppercase tracking-wide text-xs flex items-center gap-1.5 m-0">
					<Percent size={14} className="text-[var(--teal-dark,var(--teal))]" />
					<span>3. Стоимость лечения, порядок оплаты и финансовые программы</span>
				</h3>
				<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Вариант: {tier.title}</span>
			</div>

			{/* 3-Column Grand Totals Card */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
				<div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
					<span className="text-slate-500 block text-[10.5px]">Общая стоимость без скидок:</span>
					<div className="text-base font-mono font-bold text-slate-800">{grossTotalRub.toLocaleString("ru-RU")} ₽</div>
					<div className="text-[9.5px] text-slate-400">Сумма всех услуг без учета льгот</div>
				</div>

				<div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
					<span className="text-slate-500 block text-[10.5px]">Скидка {discountPercent > 0 ? `(${discountPercent}%)` : ""} + Баллы:</span>
					<div className="text-base font-mono font-bold text-emerald-700">-{(discountTotalRub + bonusPointsDeductedRub).toLocaleString("ru-RU")} ₽</div>
					<div className="text-[9.5px] text-slate-400">{bonusPointsDeductedRub > 0 ? `В т.ч. списано бонусов: ${bonusPointsDeductedRub} ₽` : "Персональная скидка пациента"}</div>
				</div>

				<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 shadow-2xs space-y-1">
					<span className="text-teal-900 font-bold block text-[10.5px]">Итого к оплате пациентом:</span>
					<div className="text-lg font-mono font-black text-teal-800">{finalTotalRub.toLocaleString("ru-RU")} ₽</div>
					<div className="text-[9.5px] text-teal-700/80">Окончательная фиксированная сумма сметы</div>
				</div>
			</div>

			{/* Amount in words banner */}
			<div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-800">
				<strong>Сумма сметы прописью:</strong> <em>{kopecksToWordsRu(finalTotalKopecks)}</em>.{" "}
				<span className="text-[9.5px] text-slate-500">НДС не облагается в соответствии с пп. 2 п. 2 ст. 149 НК РФ (медицинские услуги).</span>
			</div>

			{/* Stages Breakdown Cards */}
			<div className="pt-1">
				<div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
					<Layers size={12} className="text-slate-400" />
					<span>Разбивка сметы по клиническим этапам:</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{activeStages.map((stg) => {
						const pct = finalTotalRub > 0 ? Math.round((stg.totalRub / finalTotalRub) * 100) : 0;
						return (
							<div key={stg.stageNumber} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
								<div>
									<div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-800">
										<span className="truncate">{stg.title.split(":")[0]?.trim() || `Этап ${stg.stageNumber}`}</span>
										<span className="text-slate-400 font-normal shrink-0">{pct}%</span>
									</div>
									<div className="text-[9.5px] text-slate-500 mt-0.5 line-clamp-1">{stg.clinicalGoal || stg.subtitle}</div>
								</div>
								<div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-100">
									<span className="text-[9px] text-slate-400">~{stg.estimatedWeeks} нед.</span>
									<span className="font-mono font-bold text-xs text-slate-900">{stg.totalRub.toLocaleString("ru-RU")} ₽</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<TreatmentPlanContractInstallmentsAndTax tier={tier} finalTotalKopecks={finalTotalKopecks} finalTotalRub={finalTotalRub} installmentMonths={installmentMonths} planAgeDays={planAgeDays} />
		</div>
	);
};
