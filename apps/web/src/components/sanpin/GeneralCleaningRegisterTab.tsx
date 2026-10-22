import React from "react";
import { GeneralCleaningModal } from "./disinfection/GeneralCleaningModal";
import { GeneralCleaningControlBar } from "./GeneralCleaningControlBar";
import { GeneralCleaningLogTable } from "./GeneralCleaningLogTable";
import { GeneralCleaningSchedule } from "./GeneralCleaningSchedule";
import { useGeneralCleaningRegisterState } from "./useGeneralCleaningRegisterState";

export function GeneralCleaningRegisterTab() {
	const state = useGeneralCleaningRegisterState();

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>Журнал генеральных уборок</h2>
				<p title="Санитарно-эпидемиологические требования по профилактике инфекционных болезней">
					График и журнал проведения генеральных уборок и заключительной дезинфекции
				</p>
			</div>

			<GeneralCleaningControlBar
				searchQuery={state.searchQuery}
				setSearchQuery={state.setSearchQuery}
				typeFilter={state.typeFilter}
				setTypeFilter={state.setTypeFilter}
				viewMode={state.viewMode}
				setViewMode={state.setViewMode}
				onOpenDisinfectionModal={() => state.setIsDisinfectionModalOpen(true)}
				onQuickRecordNormCleaning={state.handleQuickRecordNormCleaning}
				onAutopilotMonth={state.handleAutopilotMonth}
				isAutopilotLoading={state.isAutopilotLoading}
				submitting={state.submitting}
				logs={state.logs}
				filteredLogs={state.filteredLogs}
			/>

			{state.viewMode === "schedule" ? (
				<GeneralCleaningSchedule logs={state.logs} onScheduleUpdated={state.fetchLogs} />
			) : (
				<GeneralCleaningLogTable
					logs={state.filteredLogs}
					loading={state.loading}
					onVerify={state.handleVerify}
				/>
			)}

			<GeneralCleaningModal
				isOpen={state.isDisinfectionModalOpen}
				onClose={() => state.setIsDisinfectionModalOpen(false)}
				onSuccess={state.fetchLogs}
			/>
		</div>
	);
}

export * from "./GeneralCleaningLogTable";
export * from "./generalCleaningPrintHelpers";
export * from "./useGeneralCleaningRegisterState";
