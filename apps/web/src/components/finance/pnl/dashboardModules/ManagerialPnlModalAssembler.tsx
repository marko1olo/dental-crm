import type React from "react";
import { lazy, Suspense, useState } from "react";
import { useManagerialPnl } from "../useManagerialPnl";
import { PnlHeader } from "./PnlHeader";
import { PnlSummaryCards } from "./PnlSummaryCards";
import { PnlRevenueSection } from "./PnlRevenueSection";
import { PnlDirectCostsSection } from "./PnlDirectCostsSection";
import { PnlIndirectCostsSection } from "./PnlIndirectCostsSection";
import { PnlMobileCards } from "./PnlMobileCards";
import { PnlActionFooter } from "./PnlActionFooter";
import { PnlModalContainer } from "./PnlModalContainer";

const QuickExpenseModal = lazy(() =>
	import("../../QuickExpenseModal").then((m) => ({
		default: m.QuickExpenseModal,
	})),
);

export interface ManagerialPnlDashboardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

export const ManagerialPnlModalAssembler: React.FC<ManagerialPnlDashboardModalProps> = ({
	isOpen,
	onClose,
}) => {
	const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState<boolean>(false);
	const { report, loading, periodPreset, setPeriodPreset, reload: loadPnl } =
		useManagerialPnl({ enabled: isOpen });

	return (
		<>
			<PnlModalContainer
				isOpen={isOpen}
				onClose={onClose}
				loading={loading}
				hasReport={Boolean(report)}
				header={
					<PnlHeader
						periodPreset={periodPreset}
						onSetPeriodPreset={setPeriodPreset}
						onRefresh={() => void loadPnl()}
						onClose={onClose}
						loading={loading}
						cashBoxCount={report?.cashBoxRevenue.length}
						expenseCount={report?.statutoryExpenses.length}
					/>
				}
				kpiCards={report ? <PnlSummaryCards report={report} /> : undefined}
				desktopContent={
					report ? (
						<>
							<PnlRevenueSection report={report} />
							<PnlDirectCostsSection report={report} />
							<PnlIndirectCostsSection report={report} />
						</>
					) : null
				}
				mobileContent={report ? <PnlMobileCards report={report} /> : null}
				footer={
					<PnlActionFooter
						report={report}
						onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
						periodLabel={periodPreset}
					/>
				}
			/>

			{isQuickExpenseOpen && (
				<Suspense fallback={null}>
					<QuickExpenseModal
						isOpen={isQuickExpenseOpen}
						onClose={() => setIsQuickExpenseOpen(false)}
						onSuccess={() => void loadPnl()}
					/>
				</Suspense>
			)}
		</>
	);
};
