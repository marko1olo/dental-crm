// Desktop density styling contract: { height: "32px", minHeight: "32px" }
/**
 * apps/web/src/components/sanpin/SanpinRegisters.tsx
 *
 * Мастер-контейнер журналов стерилизации и дезинфекции (Мандаты 8b, 8e, 8n, 8x).
 * Каноническая 3-компонентная SSOT архитектура:
 * 1. Журнал автоклавирования (AutoclaveSterilizationJournalView.tsx)
 * 2. Очистка, дезинфекция и уборка (SanpinCleaningAndDisinfectionView.tsx)
 * 3. Паспорт оборудования стерилизационной (SterilizerFleetManager.tsx)
 * 4. Модалка запуска цикла автоклава в 1 клик (SterilizationBatchCycleModal.tsx)
 */

import React, { useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { AutoclaveSterilizationJournalView } from "./AutoclaveSterilizationJournalView";
import { SanpinCleaningAndDisinfectionView } from "./SanpinCleaningAndDisinfectionView";
import { SterilizerFleetManager } from "./SterilizerFleetManager";
import { SterilizationBatchCycleModal } from "./SterilizationBatchCycleModal";
import { RetroactiveSanpinBatchModal } from "./RetroactiveSanpinBatchModal";
import { SanpinRegistersHeader } from "./SanpinRegistersHeader";
import { useSanpinRegistersLogic } from "./registers/useSanpinRegistersLogic";
import { SanpinKpiSummaryGrid } from "./registers/SanpinKpiSummaryGrid";
import { SanpinRegisterTabsNav } from "./registers/SanpinRegisterTabsNav";
import { type SanpinRegisterTab } from "./sanpinNavigationConfig";
import { SANPIN_REGISTERS_TOAST_MESSAGES } from "./sanpinToastMessages";

export * from "./sanpinNavigationConfig";
export * from "./sanpinToastMessages";
export * from "./AutoclaveSterilizationJournalView";
export * from "./SanpinCleaningAndDisinfectionView";
export * from "./SterilizationBatchCycleModal";

export interface SanpinRegistersProps {
	readonly initialTab?: SanpinRegisterTab | undefined;
	readonly initialFilterAutoclave?: string | undefined;
	readonly className?: string | undefined;
}

function SanpinRegistersInner({
	initialTab = "autoclave",
	initialFilterAutoclave,
	className = "",
}: SanpinRegistersProps = {}) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const logic = useSanpinRegistersLogic(auth, appLogic, initialTab);
	const [isDirectCycleModalOpen, setIsDirectCycleModalOpen] = useState(false);

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
				onOpenKraftModal={() => setIsDirectCycleModalOpen(true)}
				onOpenSterilizationLogModal={() => setIsDirectCycleModalOpen(true)}
				onOpenJournal257Modal={() => setIsDirectCycleModalOpen(true)}
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

			{(logic.activeTab === "autoclave" || logic.activeTab === "kraft") && (
				<AutoclaveSterilizationJournalView
					key={`autoclave-view-${logic.refreshCounter}`}
					initialFilterAutoclave={initialFilterAutoclave}
				/>
			)}

			{(logic.activeTab === "pso" || logic.activeTab === "cleaning") && (
				<SanpinCleaningAndDisinfectionView
					key={`cleaning-view-${logic.refreshCounter}`}
					initialSubTab={logic.activeTab === "cleaning" ? "cleaning" : "pso"}
				/>
			)}

			{(logic.activeTab === "disinfection" ||
				logic.activeTab === "uv_cleaning" ||
				logic.activeTab === "bactericidal" ||
				logic.activeTab === "cabinet_readiness") && (
				<SanpinCleaningAndDisinfectionView
					key={`disinfection-view-${logic.refreshCounter}`}
					initialSubTab={logic.activeTab === "bactericidal" ? "bactericidal" : "cleaning"}
				/>
			)}

			{(logic.activeTab === "sterilizers" || logic.activeTab === "fleet") && (
				<SterilizerFleetManager key={`fleet-view-${logic.refreshCounter}`} />
			)}

			<SterilizationBatchCycleModal
				isOpen={isDirectCycleModalOpen}
				onClose={() => setIsDirectCycleModalOpen(false)}
				onSuccess={logic.fetchSummary}
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
