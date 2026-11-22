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
	type AuditClinicSettings,
	type BrowserContinuityCheck,
	type BrowserContinuityInfo,
	type PersistenceHealthInfo,
	type PersistenceIntegrityReport,
	type StatusValueHolder,
} from "./auditModules/AuditPersistencePanel";

// Lazy-loaded security audit modal for low-spec hardware (4GB RAM, 5400 RPM HDD)
const AuditTrailHubModal = lazy(() =>
	import("../security/AuditTrailHubModal").then((m) => ({ default: m.AuditTrailHubModal })),
);

export interface SettingsAuditTabProps {
	readonly browserCanRequestPersistentStorage?: boolean | undefined;
	readonly browserContinuity?: BrowserContinuityInfo;
	readonly browserContinuityChecks?: readonly BrowserContinuityCheck[] | undefined;
	readonly browserContinuityState?: string | undefined;
	readonly browserContinuityValue?: StatusValueHolder;
	readonly clinicSettings?: AuditClinicSettings;
	readonly dashboard?:
		| {
				readonly importBatches?: readonly ImportBatch[] | undefined;
				readonly auditEvents?: readonly AuditEvent[] | undefined;
				readonly [key: string]: unknown;
		  }
		| null
		| undefined;
	readonly downloadPersistenceExport?: (() => void | Promise<void>) | undefined;
	readonly formatDateTime?: ((date: string | number | Date) => string) | undefined;
	readonly formatTime?: ((date: string | number | Date) => string) | undefined;
	readonly hideVaultPanel?: boolean | undefined;
	readonly isPersistenceExporting?: boolean | undefined;
	readonly loadLocalBridgeUsePlans?: ((options?: { readonly silent?: boolean | undefined }) => Promise<unknown> | void) | undefined;
	readonly loadPersistenceHealth?: ((options?: { readonly silent?: boolean | undefined }) => Promise<unknown> | void) | undefined;
	readonly localBridgeReadiness?: LocalBridgeReadinessResponse | null | undefined;
	readonly localBridgeStatusLabels?: Record<string, string> | undefined;
	readonly localBridgeStatusState?: string | undefined;
	readonly localBridgeStatusValue?: StatusValueHolder;
	readonly localBridgeUsePathLabels?: Record<string, string> | undefined;
	readonly localBridgeUsePlans?: LocalBridgeUsePlansResponse | null | undefined;
	readonly organizationId?: string | undefined;
	readonly persistenceHealth?: PersistenceHealthInfo;
	readonly persistenceIntegrity?: PersistenceIntegrityReport | null | undefined;
	readonly refreshBrowserContinuity?: ((options?: { readonly silent?: boolean | undefined }) => Promise<unknown> | void) | undefined;
	readonly requestBrowserStoragePersistence?: (() => Promise<unknown> | void) | undefined;
	readonly settingsTab?: string | undefined;
	readonly [key: string]: unknown;
}

export function SettingsAuditTab(props: SettingsAuditTabProps) {
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
