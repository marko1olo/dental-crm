import type React from 'react';
import type {
	AuditTrailEntry,
	AuditEventType,
	AuditEventCategory,
	AuditSeverity,
	AuditStatus,
	AuditFilterCriteria,
	ClinicComplianceMetadata,
	AuditChainVerificationResult,
	AuditAnomalyReport,
} from '../auditTrailEngine';

export interface AuditTrailHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicInfo?: ClinicComplianceMetadata | undefined;
	readonly initialEntries?: readonly AuditTrailEntry[] | undefined;
}

export interface AuditFilterState {
	searchQuery: string;
	selectedEventType: AuditEventType | 'all';
	selectedSeverity: AuditSeverity | 'all';
	selectedStatus: AuditStatus | 'all';
	onlyAnomalies: boolean;
}

export interface AuditMetrics {
	total: number;
	viewCards: number;
	bills: number;
	consents: number;
	anomaliesCount: number;
}

export type AuditVerificationResult = AuditChainVerificationResult;
export type AuditAnomalyAlert = AuditAnomalyReport;

export type {
	AuditTrailEntry,
	AuditEventType,
	AuditEventCategory,
	AuditSeverity,
	AuditStatus,
	AuditFilterCriteria,
	ClinicComplianceMetadata,
	AuditChainVerificationResult,
	AuditAnomalyReport,
};
