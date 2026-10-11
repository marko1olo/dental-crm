import React from 'react';
import { createPortal } from 'react-dom';
import type { AuditTrailHubModalProps } from './auditTrailHubModalModules/types';
import { useAuditTrailHubModalController } from './auditTrailHubModalModules/useAuditTrailHubModalController';
import { AuditTrailHeader } from './auditTrailHubModalModules/AuditTrailHeader';
import { AuditTrailIntegrityBanner } from './auditTrailHubModalModules/AuditTrailIntegrityBanner';
import { AuditTrailMetricsGrid } from './auditTrailHubModalModules/AuditTrailMetricsGrid';
import { AuditTrailAnomaliesBox } from './auditTrailHubModalModules/AuditTrailAnomaliesBox';
import { AuditTrailFilterToolbar } from './auditTrailHubModalModules/AuditTrailFilterToolbar';
import { AuditTrailLogTable } from './auditTrailHubModalModules/AuditTrailLogTable';
import { AuditTrailExportBar } from './auditTrailHubModalModules/AuditTrailExportBar';
import { AuditTrailActModal } from './auditTrailHubModalModules/AuditTrailActModal';
import './auditTrail.css';

export type { AuditTrailHubModalProps };

export function AuditTrailHubModal(props: AuditTrailHubModalProps): React.JSX.Element | null {
	const { isOpen, onClose, clinicInfo } = props;
	const controller = useAuditTrailHubModalController(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="audit-modal-overlay">
			<div className="audit-modal-container">
				<AuditTrailHeader onClose={onClose} />

				<AuditTrailIntegrityBanner
					verificationResult={controller.verificationResult}
					copiedHash={controller.copiedHash}
					onCopyHash={controller.handleCopyHash}
				/>

				<div className="audit-modal-body">
					<AuditTrailMetricsGrid metrics={controller.metrics} />

					<AuditTrailAnomaliesBox
						anomalies={controller.anomalies}
						onlyAnomalies={controller.onlyAnomalies}
						onToggleOnlyAnomalies={controller.toggleOnlyAnomalies}
					/>

					<AuditTrailFilterToolbar
						searchQuery={controller.searchQuery}
						onSearchQueryChange={controller.setSearchQuery}
						selectedEventType={controller.selectedEventType}
						onEventTypeChange={controller.setSelectedEventType}
						selectedSeverity={controller.selectedSeverity}
						onSeverityChange={controller.setSelectedSeverity}
						selectedStatus={controller.selectedStatus}
						onStatusChange={controller.setSelectedStatus}
						onlyAnomalies={controller.onlyAnomalies}
						onToggleOnlyAnomalies={controller.toggleOnlyAnomalies}
						anomaliesCount={controller.metrics.anomaliesCount}
					/>

					<AuditTrailLogTable
						entries={controller.filteredEntries}
						selectedEntry={controller.selectedEntry}
						onSelectEntry={controller.setSelectedEntry}
						onCopyHash={controller.handleCopyHash}
					/>
				</div>

				<AuditTrailExportBar
					onExportCsv={controller.handleExportCsv}
					onExportJson={controller.handleExportJson}
					onOpenActModal={() => controller.setShowActModal(true)}
					onClose={onClose}
					toastMsg={controller.toastMsg}
				/>
			</div>

			<AuditTrailActModal
				isOpen={controller.showActModal}
				onClose={() => controller.setShowActModal(false)}
				entries={controller.entries}
				clinicInfo={clinicInfo}
				onPrintAct={controller.handlePrintAct}
			/>
		</div>
	);

	if (typeof document !== 'undefined') {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
}
