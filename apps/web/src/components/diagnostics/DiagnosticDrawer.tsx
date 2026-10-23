/**
 * DENTE CRM — Diagnostic Drawer & Dev HUD («Под капотом»)
 */

import React from "react";
if (typeof document !== "undefined") {
	import("./DiagnosticDrawer.css");
}
import type { DiagnosticDrawerProps } from "./diagnosticDrawer/diagnosticDrawerTypes";
import { useDiagnosticDrawerState } from "./diagnosticDrawer/useDiagnosticDrawerState";
import { DiagnosticTriggerButton } from "./diagnosticDrawer/DiagnosticTriggerButton";
import { DiagnosticDrawerHeader } from "./diagnosticDrawer/DiagnosticDrawerHeader";
import { DiagnosticDrawerTabs } from "./diagnosticDrawer/DiagnosticDrawerTabs";
import { DiagnosticDrawerToolbar } from "./diagnosticDrawer/DiagnosticDrawerToolbar";
import { DiagnosticDrawerLogsTab } from "./diagnosticDrawer/DiagnosticDrawerLogsTab";
import { DiagnosticDrawerNetworkTab } from "./diagnosticDrawer/DiagnosticDrawerNetworkTab";
import { DiagnosticDrawerOfflineTab } from "./diagnosticDrawer/DiagnosticDrawerOfflineTab";
import { DiagnosticDrawerSystemTab } from "./diagnosticDrawer/DiagnosticDrawerSystemTab";
import { DiagnosticDrawerImagingTab } from "./diagnosticDrawer/DiagnosticDrawerImagingTab";

export * from "./diagnosticDrawer/diagnosticDrawerTypes";

export const DiagnosticDrawer: React.FC<DiagnosticDrawerProps> = (props) => {
	const { showTriggerButton = false } = props;
	const state = useDiagnosticDrawerState(props);

	return (
		<>
			{showTriggerButton && !state.isOpen && (
				<DiagnosticTriggerButton errorCount={state.errorCount} onClick={() => state.setInternalIsOpen(true)} />
			)}

			{state.isOpen && (
				<div className="dente-diagnostic-backdrop" onClick={state.handleClose}>
					<div
						className="dente-diagnostic-drawer"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-label="Панель диагностики и логирования"
					>
						<DiagnosticDrawerHeader onClose={state.handleClose} />
						<DiagnosticDrawerTabs
							activeTab={state.activeTab}
							setActiveTab={state.setActiveTab}
							logsCount={state.logs.length}
							networkLogsCount={state.networkLogs.length}
							pendingMutationCount={state.offlineStore.pendingMutationCount}
						/>
						<DiagnosticDrawerToolbar
							activeTab={state.activeTab}
							searchQuery={state.searchQuery}
							setSearchQuery={state.setSearchQuery}
							logLevelFilter={state.logLevelFilter}
							setLogLevelFilter={state.setLogLevelFilter}
							selectedModule={state.selectedModule}
							setSelectedModule={state.setSelectedModule}
							availableModules={state.availableModules}
							onClearLogs={state.handleClearLogs}
							onExportReport={state.handleExportReport}
						/>

						<div className="dente-diagnostic-content" ref={state.logsContainerRef}>
							{state.activeTab === "logs" && (
								<DiagnosticDrawerLogsTab
									filteredLogs={state.filteredLogs}
									searchQuery={state.searchQuery}
									expandedLogIds={state.expandedLogIds}
									copiedCorrelationId={state.copiedCorrelationId}
									toggleExpandLog={state.toggleExpandLog}
									handleCopyCorrelationId={state.handleCopyCorrelationId}
								/>
							)}
							{state.activeTab === "network" && (
								<DiagnosticDrawerNetworkTab
									filteredNetworkLogs={state.filteredNetworkLogs}
									searchQuery={state.searchQuery}
									expandedLogIds={state.expandedLogIds}
									copiedCorrelationId={state.copiedCorrelationId}
									toggleExpandLog={state.toggleExpandLog}
									handleCopyCorrelationId={state.handleCopyCorrelationId}
								/>
							)}
							{state.activeTab === "offline" && (
								<DiagnosticDrawerOfflineTab offlineStore={state.offlineStore} />
							)}
							{state.activeTab === "system" && (
								<DiagnosticDrawerSystemTab
									userRole={props.userRole}
									organizationId={props.organizationId}
									onExportReport={state.handleExportReport}
								/>
							)}
							{state.activeTab === "imaging" && (
								<DiagnosticDrawerImagingTab />
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DiagnosticDrawer;
