/**
 * apps/web/src/components/settings/SettingsAuditTab.tsx
 *
 * Operational Audit & Security Journal Tab for clinic settings.
 *
 * Decomposed into auditModules/ and audit/:
 * - AuditPersistencePanel.tsx (data persistence, browser continuity, bridges, backup state, import history)
 * - AuditLogEventsTable.tsx (152-FZ cryptographic security contours & audit events table)
 * - AuditLogFilterBar.tsx (employee, operation, category filters & audit utilities)
 * - StaffActionJournalSection.tsx (staff action audit journal with diffs)
 *
 * Mandate 8b: File line count strictly <= 500 lines (facade <= 250 lines).
 */

import type {
	AuditEvent,
	ImportBatch,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
} from "@dental/shared";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { StaffActionJournalSection } from "./audit/StaffActionJournalSection";
import { SecurityAudit152FzPanel } from "./auditModules/AuditLogEventsTable";
import {
	AuditPersistencePanel,
	type BrowserContinuityCheck,
	type PersistenceIntegrityReport,
} from "./auditModules/AuditPersistencePanel";

// Lazy-loaded security audit modal for low-spec hardware (4GB RAM, 5400 RPM HDD)
const AuditTrailHubModal = lazy(() =>
	import("../security/AuditTrailHubModal").then((m) => ({ default: m.AuditTrailHubModal })),
);

export function SettingsAuditTab(props: Record<string, any>) {
	const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

	const {
		browserCanRequestPersistentStorage,
		browserContinuity,
		browserContinuityChecks,
		browserContinuityState,
		browserContinuityValue,
		clinicSettings,
		dashboard,
		downloadPersistenceExport,
		formatDateTime,
		formatTime,
		hideVaultPanel,
		isPersistenceExporting,
		loadLocalBridgeUsePlans,
		loadPersistenceHealth,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeStatusState,
		localBridgeStatusValue,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		organizationId,
		persistenceHealth,
		persistenceIntegrity,
		refreshBrowserContinuity,
		requestBrowserStoragePersistence,
		settingsTab,
	} = props;

	useEffect(() => {
		if (settingsTab !== "audit" && settingsTab !== "backup") return;
		if (!persistenceHealth && typeof loadPersistenceHealth === "function") {
			void loadPersistenceHealth({ silent: true });
		}
		if (!localBridgeReadiness && typeof loadLocalBridgeUsePlans === "function") {
			void loadLocalBridgeUsePlans({ silent: true });
		}
		if (!browserContinuity && typeof refreshBrowserContinuity === "function") {
			void refreshBrowserContinuity({ silent: true });
		}
	}, [
		settingsTab,
		persistenceHealth,
		loadPersistenceHealth,
		localBridgeReadiness,
		loadLocalBridgeUsePlans,
		browserContinuity,
		refreshBrowserContinuity,
	]);

	if (settingsTab !== "audit" && settingsTab !== "backup") {
		return null;
	}

	const typedBrowserContinuityChecks: BrowserContinuityCheck[] = Array.isArray(
		browserContinuityChecks,
	)
		? (browserContinuityChecks as BrowserContinuityCheck[])
		: [];
	const typedPersistenceIntegrity =
		(persistenceIntegrity as PersistenceIntegrityReport | null) ?? null;
	const typedLocalBridgeReadiness =
		(localBridgeReadiness as LocalBridgeReadinessResponse | null) ?? null;
	const typedLocalBridgeUsePlans =
		(localBridgeUsePlans as LocalBridgeUsePlansResponse | null) ?? null;
	const typedImportBatches: ImportBatch[] = Array.isArray(dashboard?.importBatches)
		? (dashboard.importBatches as ImportBatch[])
		: [];
	const typedAuditEvents: AuditEvent[] = Array.isArray(dashboard?.auditEvents)
		? (dashboard.auditEvents as AuditEvent[])
		: [];

	return (
		<section className="ops-grid" aria-label="Журнал операций">
			<AuditPersistencePanel
				browserCanRequestPersistentStorage={browserCanRequestPersistentStorage}
				browserContinuity={browserContinuity}
				browserContinuityChecks={typedBrowserContinuityChecks}
				browserContinuityState={browserContinuityState}
				browserContinuityValue={browserContinuityValue}
				clinicSettings={clinicSettings}
				downloadPersistenceExport={downloadPersistenceExport}
				formatDateTime={formatDateTime}
				formatTime={formatTime}
				hideVaultPanel={hideVaultPanel}
				isPersistenceExporting={isPersistenceExporting}
				loadLocalBridgeUsePlans={loadLocalBridgeUsePlans}
				loadPersistenceHealth={loadPersistenceHealth}
				localBridgeReadiness={typedLocalBridgeReadiness}
				localBridgeStatusLabels={localBridgeStatusLabels}
				localBridgeStatusState={localBridgeStatusState}
				localBridgeStatusValue={localBridgeStatusValue}
				localBridgeUsePathLabels={localBridgeUsePathLabels}
				localBridgeUsePlans={typedLocalBridgeUsePlans}
				organizationId={organizationId}
				persistenceHealth={persistenceHealth}
				persistenceIntegrity={typedPersistenceIntegrity}
				refreshBrowserContinuity={refreshBrowserContinuity}
				requestBrowserStoragePersistence={requestBrowserStoragePersistence}
				importBatches={typedImportBatches}
			/>

			<SecurityAudit152FzPanel
				auditEvents={typedAuditEvents}
				formatDateTime={formatDateTime}
				onOpenAuditTrailModal={() => setIsAuditTrailOpen(true)}
			/>

			<StaffActionJournalSection />

			{isAuditTrailOpen && (
				<Suspense fallback={null}>
					<AuditTrailHubModal
						isOpen={isAuditTrailOpen}
						onClose={() => setIsAuditTrailOpen(false)}
					/>
				</Suspense>
			)}
		</section>
	);
}
