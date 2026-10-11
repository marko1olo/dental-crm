import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
	AuditTrailEntry,
	AuditEventType,
	AuditSeverity,
	AuditStatus,
	AuditFilterCriteria,
	ClinicComplianceMetadata,
	AuditChainVerificationResult,
	AuditAnomalyReport,
	AuditMetrics,
} from './types';
import {
	DEFAULT_CLINIC_COMPLIANCE,
	createAuditEntry,
	verifyAuditChain,
	detectAuditAnomalies,
	filterAuditTrail,
	exportAuditTrailToRoskomnadzorJson,
	exportAuditTrailToCsv,
	generate152FzAuditActHtml,
} from '../auditTrailEngine';
import { mapRawToAuditEntryParams } from './auditUtils';
import { denteAdminSecretRequestHeaders } from '../../../lib/denteRequestHeaders';
import clientLogger from '../../../services/logging/clientLogger';

export interface UseAuditTrailHubModalControllerParams {
	readonly isOpen: boolean;
	readonly initialEntries?: readonly AuditTrailEntry[] | undefined;
	readonly clinicInfo?: ClinicComplianceMetadata | undefined;
}

export interface UseAuditTrailHubModalControllerResult {
	readonly entries: readonly AuditTrailEntry[];
	readonly isLoading: boolean;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly selectedEventType: AuditEventType | 'all';
	readonly setSelectedEventType: (t: AuditEventType | 'all') => void;
	readonly selectedSeverity: AuditSeverity | 'all';
	readonly setSelectedSeverity: (s: AuditSeverity | 'all') => void;
	readonly selectedStatus: AuditStatus | 'all';
	readonly setSelectedStatus: (st: AuditStatus | 'all') => void;
	readonly onlyAnomalies: boolean;
	readonly setOnlyAnomalies: (val: boolean) => void;
	readonly toggleOnlyAnomalies: () => void;
	readonly selectedEntry: AuditTrailEntry | null;
	readonly setSelectedEntry: (entry: AuditTrailEntry | null) => void;
	readonly toggleEntrySelection: (entry: AuditTrailEntry) => void;
	readonly copiedHash: string | null;
	readonly showActModal: boolean;
	readonly setShowActModal: (show: boolean) => void;
	readonly toastMsg: string | null;
	readonly verificationResult: AuditChainVerificationResult;
	readonly anomalies: readonly AuditAnomalyReport[];
	readonly filteredEntries: readonly AuditTrailEntry[];
	readonly metrics: AuditMetrics;
	readonly handleCopyHash: (hash: string) => void;
	readonly handleExportJson: () => void;
	readonly handleExportCsv: () => void;
	readonly handlePrintAct: () => void;
}

export function useAuditTrailHubModalController({
	isOpen,
	initialEntries,
	clinicInfo = DEFAULT_CLINIC_COMPLIANCE,
}: UseAuditTrailHubModalControllerParams): UseAuditTrailHubModalControllerResult {
	const [entries, setEntries] = useState<readonly AuditTrailEntry[]>(() => {
		return initialEntries ?? [];
	});
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		if (!isOpen) return;
		if (initialEntries && initialEntries.length > 0) {
			setEntries(initialEntries);
			return;
		}

		let isMounted = true;
		setIsLoading(true);

		async function fetchLiveAudit() {
			try {
				const headers = denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' });
				const [logsRes, medRes] = await Promise.allSettled([
					fetch('/api/audit/logs?limit=50', { headers }),
					fetch('/api/audit/medical-access?limit=50', { headers }),
				]);

				const rawEvents: Array<Record<string, unknown>> = [];
				if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
					const data = (await logsRes.value.json()) as { logs?: Array<Record<string, unknown>> };
					if (Array.isArray(data.logs)) rawEvents.push(...data.logs);
				}
				if (medRes.status === 'fulfilled' && medRes.value.ok) {
					const data = (await medRes.value.json()) as { logs?: Array<Record<string, unknown>> };
					if (Array.isArray(data.logs)) rawEvents.push(...data.logs);
				}

				// Also include offline buffer from clientLogger
				const offlineBuffer = clientLogger.getOfflineStaffAuditBuffer();
				rawEvents.push(...(offlineBuffer as unknown as Array<Record<string, unknown>>));

				// Sort chronologically (oldest first for blockchain chain building)
				rawEvents.sort((a, b) => {
					const ta = new Date(String(a.createdAt || a.clientTimestamp || a.timestamp || 0)).getTime();
					const tb = new Date(String(b.createdAt || b.clientTimestamp || b.timestamp || 0)).getTime();
					return ta - tb;
				});

				// Build cryptographic SHA-256 chain
				let lastEntry: AuditTrailEntry | null = null;
				const chained: AuditTrailEntry[] = [];
				for (const raw of rawEvents) {
					const params = mapRawToAuditEntryParams(raw);
					const entry = createAuditEntry(params, lastEntry);
					chained.push(entry);
					lastEntry = entry;
				}

				if (isMounted) {
					setEntries(chained.reverse()); // Newest first for display
				}
			} catch (err) {
				console.warn('[AuditTrailHubModal] Ошибка загрузки журнала аудита:', err);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		}

		void fetchLiveAudit();

		return () => {
			isMounted = false;
		};
	}, [isOpen, initialEntries]);

	const [searchQuery, setSearchQuery] = useState<string>('');
	const [selectedEventType, setSelectedEventType] = useState<AuditEventType | 'all'>('all');
	const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'all'>('all');
	const [selectedStatus, setSelectedStatus] = useState<AuditStatus | 'all'>('all');
	const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);

	const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
	const [copiedHash, setCopiedHash] = useState<string | null>(null);
	const [showActModal, setShowActModal] = useState<boolean>(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	// Верификация цепочки (проверяется в хронологическом порядке 1..N)
	const verificationResult = useMemo(() => {
		const chronological = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
		return verifyAuditChain(chronological);
	}, [entries]);

	// Детектор аномалий (проверяется в хронологическом порядке 1..N)
	const anomalies = useMemo(() => {
		const chronological = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
		return detectAuditAnomalies(chronological);
	}, [entries]);

	// Фильтрация записей
	const filterCriteria: AuditFilterCriteria = useMemo(
		() => ({
			searchQuery,
			eventType: selectedEventType,
			severity: selectedSeverity,
			status: selectedStatus,
			onlyAnomalies,
		}),
		[searchQuery, selectedEventType, selectedSeverity, selectedStatus, onlyAnomalies],
	);

	const filteredEntries = useMemo(
		() => filterAuditTrail(entries, filterCriteria),
		[entries, filterCriteria],
	);

	// Метрики
	const metrics: AuditMetrics = useMemo(() => {
		let viewCards = 0;
		let bills = 0;
		let consents = 0;
		for (const e of entries) {
			if (e.eventType === 'view_patient_card') viewCards++;
			if (e.eventType === 'modify_bill' || e.eventType === 'delete_bill') bills++;
			if (e.eventType === 'sign_consent_pep' || e.eventType === 'sign_consent_ukep') consents++;
		}
		return {
			total: entries.length,
			viewCards,
			bills,
			consents,
			anomaliesCount: anomalies.length,
		};
	}, [entries, anomalies]);

	const showToast = useCallback((msg: string): void => {
		setToastMsg(msg);
		setTimeout(() => setToastMsg(null), 3000);
	}, []);

	const handleCopyHash = useCallback((hash: string): void => {
		navigator.clipboard.writeText(hash);
		setCopiedHash(hash);
		showToast('Хэш SHA-256 скопирован в буфер!');
		setTimeout(() => setCopiedHash(null), 2000);
	}, [showToast]);

	const handleExportJson = useCallback((): void => {
		const jsonString = exportAuditTrailToRoskomnadzorJson(entries, clinicInfo);
		const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit_trail_152fz_rkn_${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showToast('Выгрузка JSON (Роскомнадзор / ФСТЭК) скачана');
	}, [entries, clinicInfo, showToast]);

	const handleExportCsv = useCallback((): void => {
		const csvString = exportAuditTrailToCsv(entries);
		const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit_trail_152fz_${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast('Выгрузка CSV (Excel) скачана');
	}, [entries, showToast]);

	const handlePrintAct = useCallback((): void => {
		const html = generate152FzAuditActHtml(entries, clinicInfo);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	}, [entries, clinicInfo]);

	const toggleOnlyAnomalies = useCallback((): void => {
		setOnlyAnomalies((prev) => !prev);
	}, []);

	const toggleEntrySelection = useCallback((entry: AuditTrailEntry): void => {
		setSelectedEntry((prev) => (prev?.id === entry.id ? null : entry));
	}, []);

	return {
		entries,
		isLoading,
		searchQuery,
		setSearchQuery,
		selectedEventType,
		setSelectedEventType,
		selectedSeverity,
		setSelectedSeverity,
		selectedStatus,
		setSelectedStatus,
		onlyAnomalies,
		setOnlyAnomalies,
		toggleOnlyAnomalies,
		selectedEntry,
		setSelectedEntry,
		toggleEntrySelection,
		copiedHash,
		showActModal,
		setShowActModal,
		toastMsg,
		verificationResult,
		anomalies,
		filteredEntries,
		metrics,
		handleCopyHash,
		handleExportJson,
		handleExportCsv,
		handlePrintAct,
	};
}
