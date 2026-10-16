import React from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { PsoMobileCards } from "./PsoMobileCards";
import { usePsoRegisterLogic } from "./pso/usePsoRegisterLogic";
import { PsoQualityBanner } from "./pso/PsoQualityBanner";
import { PsoTableToolbar } from "./pso/PsoTableToolbar";
import { PsoTableBody } from "./pso/PsoTableBody";

export function PsoRegisterTab() {
	const appLogic = useOptionalAppLogicContext();
	const logic = usePsoRegisterLogic(appLogic);

	return (
		<div className="sanpin-tab-content" data-testid="pso-register-tab">
			{/* Primary 1-click CTA: pso-quick-mark-shift-btn inside PsoQualityBanner */}
			<PsoQualityBanner
				submitting={logic.submitting}
				onQuickMarkNorm={logic.handleQuickMarkBatchNorm}
				onPrintJournal={logic.handlePrintJournal}
			/>

			<div className="sanpin-table-wrapper w-full overflow-x-auto min-w-0" style={{ position: "relative", zIndex: 1, width: "100%" }}>
				<PsoTableToolbar
					searchQuery={logic.searchQuery}
					setSearchQuery={logic.setSearchQuery}
					testFilter={logic.testFilter}
					setTestFilter={logic.setTestFilter}
				/>

				<div className="sanpin-desktop-table-container">
					<PsoTableBody
						loading={logic.loading}
						logs={logic.logs}
						logsSlice={logic.logsSlice}
					/>
				</div>

				<div className="sanpin-mobile-cards-container">
					<PsoMobileCards
						logs={logic.logsSlice}
						loading={logic.loading}
						nurseName={logic.nurseName}
						stampedRows={logic.stampedRows}
						onStampVerification={logic.handleStampVerification}
						onQuickMarkNorm={logic.handleQuickMarkBatchNorm}
						isSubmitting={logic.submitting}
					/>
				</div>
			</div>
		</div>
	);
}

export default PsoRegisterTab;
