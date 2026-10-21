// Desktop density styling contract: { height: "32px", minHeight: "32px" }
import React from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { SanpinAutoclaveRegisterTab } from "./SanpinAutoclaveRegisterTab";
import { PsoRegisterTab } from "./PsoRegisterTab";
import { SanpinUvAndCleaningRegisterTab } from "./SanpinUvAndCleaningRegisterTab";
import { RetroactiveSanpinBatchModal } from "./RetroactiveSanpinBatchModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import { SanpinRegistersHeader } from "./SanpinRegistersHeader";
import { useSanpinRegistersLogic } from "./registers/useSanpinRegistersLogic";
import { SanpinKpiSummaryGrid } from "./registers/SanpinKpiSummaryGrid";
import { SanpinRegisterTabsNav } from "./registers/SanpinRegisterTabsNav";
import { type SanpinRegisterTab } from "./sanpinNavigationConfig";
import "./SanpinRegisters.css";

export * from "./sanpinNavigationConfig";

export interface SanpinRegistersProps {
	readonly initialTab?: SanpinRegisterTab | undefined;
	readonly initialFilterAutoclave?: string | undefined;
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
	readonly className?: string | undefined;
}

function SanpinRegistersInner({
	initialTab = "autoclave",
	initialFilterAutoclave,
	onAttachPouchToVisit,
	className = "",
}: SanpinRegistersProps = {}) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const logic = useSanpinRegistersLogic(auth, appLogic, initialTab);

	return (
		<div className={`sanpin-container ${className}`}>
			<SanpinRegistersHeader
				summary={logic.summary}
				showExpandedKpi={logic.showExpandedKpi}
				onToggleExpandedKpi={() => logic.setShowExpandedKpi((p) => !p)}
				autofillPeriod={logic.autofillPeriod}
				setAutofillPeriod={logic.setAutofillPeriod}
				autoFilling={logic.autoFilling}
				onAutofillByPeriod={logic.handleAutofillByPeriod}
				exportContext={logic.exportContext}
				isExportMenuOpen={logic.isExportMenuOpen}
				setIsExportMenuOpen={logic.setIsExportMenuOpen}
				onRefreshSummary={logic.fetchSummary}
				onAutofillShift={logic.handleAutofillShift}
				onOpenRetroactiveBatchModal={() => logic.setIsRetroactiveBatchModalOpen(true)}
				onOpenKraftModal={() => logic.setIsKraftModalOpen(true)}
				onOpenJournal257Modal={() => logic.setIsJournal257ModalOpen(true)}
			/>

			<SanpinRegisterTabsNav
				activeTab={logic.activeTab}
				onSelectTab={logic.setActiveTab}
			/>

			{logic.showExpandedKpi && (
				<SanpinKpiSummaryGrid
					summary={logic.summary}
					activeTab={logic.activeTab}
					onSelectTab={logic.setActiveTab}
				/>
			)}

			{logic.activeTab === "autoclave" && (
				<SanpinAutoclaveRegisterTab key={`autoclave-tab-${logic.refreshCounter}`} />
			)}
			{logic.activeTab === "pso" && (
				<PsoRegisterTab key={`pso-tab-${logic.refreshCounter}`} />
			)}
			{logic.activeTab === "disinfection" && (
				<SanpinUvAndCleaningRegisterTab key={`disinfection-tab-${logic.refreshCounter}`} />
			)}

			<KraftPackageBarcodeModal
				isOpen={logic.isKraftModalOpen}
				onClose={() => logic.setIsKraftModalOpen(false)}
			/>
			<AutoclaveLog257Modal
				isOpen={logic.isJournal257ModalOpen}
				initialTab="journal_257"
				onClose={() => logic.setIsJournal257ModalOpen(false)}
			/>
			<RetroactiveSanpinBatchModal
				isOpen={logic.isRetroactiveBatchModalOpen}
				onClose={() => logic.setIsRetroactiveBatchModalOpen(false)}
				onSuccess={logic.fetchSummary}
			/>
		</div>
	);
}

export const SanpinRegisters = React.memo(SanpinRegistersInner);
SanpinRegisters.displayName = "SanpinRegisters";

export { SanpinRegisters as SanpinRegistersView };
export default SanpinRegisters;
