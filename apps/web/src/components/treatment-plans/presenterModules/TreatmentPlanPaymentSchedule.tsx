/**
 * TreatmentPlanPaymentSchedule.tsx — Прозрачный график платежей и рассрочки
 * (Wave 19 / Chairside Cashflow Protection & Installments).
 */

import React, { useMemo } from "react";
import {
	parseKopecks,
	calculateStaged304030Schedule,
	calculatePlanTaxDeductionBreakdown,
} from "@dental/shared";
import type { TreatmentPlanTier } from "./treatmentPlanPresenterTypes.js";
import { Installment0PercentCard } from "./paymentSchedule/Installment0PercentCard.js";
import { StagedPayment304030Section } from "./paymentSchedule/StagedPayment304030Section.js";
import { TaxDeduction13Banner } from "./paymentSchedule/TaxDeduction13Banner.js";

export interface TreatmentPlanPaymentScheduleProps {
	readonly tier: TreatmentPlanTier;
	readonly selectedMonths: 3 | 6 | 12 | 24;
	readonly onSelectMonths: (months: 3 | 6 | 12 | 24) => void;
	readonly isPrepaymentEnabled?: boolean;
}

export const TreatmentPlanPaymentSchedule: React.FC<TreatmentPlanPaymentScheduleProps> = ({
	tier,
	selectedMonths,
	onSelectMonths,
	isPrepaymentEnabled = true,
}) => {
	const totalKopecks = parseKopecks(tier.totalRub);

	const schedule304030 = useMemo(() => {
		return calculateStaged304030Schedule(totalKopecks);
	}, [totalKopecks]);

	const taxBreakdown = useMemo(() => {
		const planItemsForTax = tier.stages.flatMap((s) =>
			s.items.map((it) => ({
				id: it.id,
				name: it.name,
				serviceName: it.name,
				code804n: it.code804n,
				priceRub: it.unitPriceRub || it.priceRub,
				quantity: it.quantity || 1,
			})),
		);
		return calculatePlanTaxDeductionBreakdown(planItemsForTax);
	}, [tier.stages]);

	return (
		<div
			className="treatment-payment-schedule-container flex flex-col gap-4"
			data-testid="treatment-plan-payment-schedule"
		>
			<Installment0PercentCard
				totalRub={tier.totalRub}
				selectedMonths={selectedMonths}
				onSelectMonths={onSelectMonths}
			/>

			{isPrepaymentEnabled && (
				<StagedPayment304030Section schedule304030={schedule304030} />
			)}

			<TaxDeduction13Banner deductionRub={taxBreakdown.grandTotalRefund13Rub} />
		</div>
	);
};
