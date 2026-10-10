import type { Dashboard, Payment, PaymentMethod } from "@dental/shared";
import { CashDayTally } from "../../components/finance/CashDayTally";
import { FinancePlanningOverview } from "../../FinancePlanning";
import type { TreatmentPlanScenario } from "./types.js";

export interface FinanceSummaryCardsProps {
	activePaymentsCount: number;
	billingSummary: Dashboard["billingSummary"] | null;
	money: (value: number | null) => string;
	onGoToVisit: () => void;
	priorityLabels: Record<TreatmentPlanScenario["priority"], string>;
	scenarios: TreatmentPlanScenario[];
	strategyLabels: Record<TreatmentPlanScenario["strategy"], string>;
	onOpenTaxCertificateModal: () => void;
	dayPayments: Payment[];
	methodLabels: Record<PaymentMethod, string>;
}

export function FinanceSummaryCards({
	activePaymentsCount,
	billingSummary,
	money,
	onGoToVisit,
	priorityLabels,
	scenarios,
	strategyLabels,
	onOpenTaxCertificateModal,
	dayPayments,
	methodLabels,
}: FinanceSummaryCardsProps) {
	return (
		<>
			<FinancePlanningOverview
				activePaymentsCount={activePaymentsCount}
				billingSummary={billingSummary}
				money={money}
				onGoToVisit={onGoToVisit}
				priorityLabels={priorityLabels}
				scenarios={scenarios}
				strategyLabels={strategyLabels}
				onOpenTaxCertificateModal={onOpenTaxCertificateModal}
			/>

			<CashDayTally
				payments={dayPayments}
				methodLabels={methodLabels}
				money={money}
			/>
		</>
	);
}
