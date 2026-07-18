import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

import { AuditBrowserContinuityPanel } from "./audit/AuditBrowserContinuityPanel";
import { AuditLocalBridgePanel } from "./audit/AuditLocalBridgePanel";
import { AuditDatabasePanel } from "./audit/AuditDatabasePanel";
import { AuditImportHistoryPanel } from "./audit/AuditImportHistoryPanel";
import { AuditEventLogPanel } from "./audit/AuditEventLogPanel";

export function SettingsAuditTab() {
	const {
		browserContinuityState,
		browserContinuityChecks,
		requestBrowserStoragePersistence,
		browserCanRequestPersistentStorage,
		localBridgeStatusState,
		localBridgeReadiness,
		localBridgeUsePlans,
		persistenceHealth,
		downloadPersistenceExport,
		isPersistenceExporting,
		auditEvents,
		dashboard,
	} = useAppLogicContext();

	return (
		<section
			className="settings-panel animate-fade-in settings-audit-tab"
			style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
		>
			<AuditBrowserContinuityPanel
				browserContinuityState={browserContinuityState}
				browserContinuityChecks={browserContinuityChecks}
				requestBrowserStoragePersistence={requestBrowserStoragePersistence}
				browserCanRequestPersistentStorage={browserCanRequestPersistentStorage}
			/>

			<AuditLocalBridgePanel
				localBridgeStatusState={localBridgeStatusState}
				localBridgeReadiness={localBridgeReadiness}
				localBridgeUsePlans={localBridgeUsePlans}
			/>

			<AuditDatabasePanel
				persistenceHealth={persistenceHealth}
				downloadPersistenceExport={downloadPersistenceExport}
				isPersistenceExporting={isPersistenceExporting}
			/>

			<AuditImportHistoryPanel dashboard={dashboard} />

			<AuditEventLogPanel auditEvents={auditEvents} />
		</section>
	);
}
