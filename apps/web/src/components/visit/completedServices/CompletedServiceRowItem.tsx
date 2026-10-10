import React from "react";
import { Check } from "lucide-react";
import { money } from "../../../AppHelpers";
import {
	PRICE_UNKNOWN_TEXT,
	planLineQuantity,
	planLineTotalRub,
} from "../completedServicesPlan";
import { serviceTitleOf, toothSuffixOf } from "./serviceChecklistHelpers";
import type {
	CompletedServiceRowItemProps,
	PreliminaryTreatmentPlanSectionProps,
} from "./types";

export const CompletedServiceRowItem: React.FC<CompletedServiceRowItemProps> = ({
	item,
	marked,
	onToggle,
}) => {
	const totalRub = planLineTotalRub(item);
	const quantity = planLineQuantity(item);

	return (
		<label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200 min-h-[44px] py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
			<input
				type="checkbox"
				checked={marked}
				onChange={() => onToggle(item)}
				className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[var(--teal,var(--brand-primary))] focus:ring-[var(--teal,var(--brand-primary))]"
			/>
			<span className="flex-1">
				{serviceTitleOf(item)}
				{toothSuffixOf(item)}
				{quantity !== null && quantity > 1 ? `, ${quantity} шт.` : ""}
			</span>
			{totalRub === null ? (
				<em className="whitespace-nowrap text-amber-700 dark:text-amber-400 not-italic">
					{PRICE_UNKNOWN_TEXT}
				</em>
			) : (
				<strong className="tabular-nums whitespace-nowrap">
					{money(totalRub)}
				</strong>
			)}
		</label>
	);
};

export const PreliminaryTreatmentPlanSection: React.FC<
	PreliminaryTreatmentPlanSectionProps
> = ({ planItems, isMarked, onTogglePlanItem }) => {
	if ((planItems ?? []).length === 0) {
		return null;
	}

	return (
		<div className="mb-3">
			<div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
				<Check className="w-3.5 h-3.5 text-teal-600" />
				Позиции из плана лечения пациента:
			</div>
			<div className="flex flex-col gap-1.5">
				{/* biome-ignore lint/suspicious/noExplicitAny: generic service item from plan */}
				{(planItems ?? []).map((item: any, index: number) => (
					<CompletedServiceRowItem
						key={
							item?.id ??
							`${item?.serviceId ?? "услуга"}-${item?.toothCode ?? "без-зуба"}-${index}`
						}
						item={item}
						index={index}
						marked={isMarked(item)}
						onToggle={onTogglePlanItem}
					/>
				))}
			</div>
		</div>
	);
};
