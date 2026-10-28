// Desktop density styling contract: { height: "32px", minHeight: "32px" }
/**
 * apps/web/src/components/sanpin/SanpinRegisters.tsx
 *
 * Мастер-контейнер журналов стерилизации и дезинфекции (Мандаты 8b, 8e, 8n, 8x).
 * Консолидированная 4-вкладочная архитектура:
 * 1. Журнал автоклавирования (AutoclaveJournalTab.tsx)
 * 2. Контроль очистки инструментов (CleaningControlTab.tsx)
 * 3. Учет ламп и уборок (UvAndCleaningTab.tsx)
 * 4. Оборудование стерилизационной (SterilizerFleetManager.tsx)
 *
 * Клинические тосты:
 * - Журналы стерилизации в норме
 * - Журналы за неделю заполнены
 * - Смена заполнена: автоклавы и контроль очистки инструментов в норме
 */

import React from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { AutoclaveJournalTab } from "./AutoclaveJournalTab";
import { CleaningControlTab } from "./CleaningControlTab";
import { UvAndCleaningTab } from "./UvAndCleaningTab";
import { SterilizerFleetManager } from "./SterilizerFleetManager";
import { RetroactiveSanpinBatchModal } from "./RetroactiveSanpinBatchModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveSterilizationLogModal } from "./autoclaveLog/AutoclaveSterilizationLogModal";
import { SanpinRegistersHeader } from "./SanpinRegistersHeader";
import { useSanpinRegistersLogic } from "./registers/useSanpinRegistersLogic";
import { SanpinKpiSummaryGrid } from "./registers/SanpinKpiSummaryGrid";
import { SanpinRegisterTabsNav } from "./registers/SanpinRegisterTabsNav";
import { type SanpinRegisterTab } from "./sanpinNavigationConfig";
import { SANPIN_REGISTERS_TOAST_MESSAGES } from "./sanpinToastMessages";

export * from "./sanpinNavigationConfig";
export * from "./sanpinToastMessages";

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
				onOpenSterilizationLogModal={() => logic.setIsJournal257ModalOpen(true)}
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

			{(logic.activeTab === "autoclave" || logic.activeTab === "kraft") && (
				<AutoclaveJournalTab
					key={`autoclave-tab-${logic.refreshCounter}`}
					initialFilterAutoclave={initialFilterAutoclave}
				/>
			)}

			{(logic.activeTab === "pso" || logic.activeTab === "cleaning") && (
				<CleaningControlTab key={`cleaning-tab-${logic.refreshCounter}`} />
			)}

			{(logic.activeTab === "disinfection" ||
				logic.activeTab === "uv_cleaning" ||
				logic.activeTab === "bactericidal" ||
				logic.activeTab === "cabinet_readiness") && (
				<UvAndCleaningTab key={`disinfection-tab-${logic.refreshCounter}`} />
			)}

			{(logic.activeTab === "sterilizers" || logic.activeTab === "fleet") && (
				<SterilizerFleetManager key={`fleet-tab-${logic.refreshCounter}`} />
			)}

			<KraftPackageBarcodeModal
				isOpen={logic.isKraftModalOpen}
				onClose={() => logic.setIsKraftModalOpen(false)}
			/>
			<AutoclaveSterilizationLogModal
				isOpen={logic.isJournal257ModalOpen}
				initialTab="sterilization_log"
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
