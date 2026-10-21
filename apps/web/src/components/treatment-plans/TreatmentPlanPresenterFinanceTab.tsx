/**
 * TreatmentPlanPresenterFinanceTab.tsx — вкладка финансового калькулятора
 * (рассрочка 0% без переплат и налоговый вычет 13% НДФЛ).
 */

import React from "react";
import type { TreatmentPlanTier } from "./types";
import { PresenterInstallment0PercentCard } from "./presenterFinance/PresenterInstallment0PercentCard";
import { PresenterNdfl13Card } from "./presenterFinance/PresenterNdfl13Card";

export interface TreatmentPlanPresenterFinanceTabProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly setInstallmentMonths: (months: 3 | 6 | 12 | 24) => void;
}

export const TreatmentPlanPresenterFinanceTab: React.FC<
	TreatmentPlanPresenterFinanceTabProps
> = ({ selectedTier, installmentMonths, setInstallmentMonths }) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="finance-view">
			<PresenterInstallment0PercentCard
				selectedTier={selectedTier}
				installmentMonths={installmentMonths}
				setInstallmentMonths={setInstallmentMonths}
			/>

			<PresenterNdfl13Card selectedTier={selectedTier} />
		</div>
	);
};

export default TreatmentPlanPresenterFinanceTab;
