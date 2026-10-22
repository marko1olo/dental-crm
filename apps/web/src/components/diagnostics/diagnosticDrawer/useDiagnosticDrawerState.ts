import { useState, useEffect, useMemo, useRef } from "react";
import type { ClientLogEntry, NetworkLogEntry } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { useOfflineStore } from "../../../store/offlineStore.js";
import type { TabKind, DiagnosticDrawerProps } from "./diagnosticDrawerTypes";
import { useDiagnosticFilterLogs } from "./useDiagnosticFilterLogs";

export function useDiagnosticDrawerState({
	organizationId,
	userId,
	userRole,
	isOpen: externalIsOpen,
	onClose: externalOnClose,
}: DiagnosticDrawerProps) {
	const [internalIsOpen, setInternalIsOpen] = useState(false);
	const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

	const handleClose = () => {
		if (externalOnClose) externalOnClose();
		else setInternalIsOpen(false);
	};

	const [activeTab, setActiveTab] = useState<TabKind>("logs");
	const [logs, setLogs] = useState<readonly ClientLogEntry[]>(() => clientLogger.getLogs());
	const [networkLogs, setNetworkLogs] = useState<readonly NetworkLogEntry[]>(() => clientLogger.getNetworkLogs());
	const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
	const [copiedCorrelationId, setCopiedCorrelationId] = useState<string | null>(null);

	const offlineStore = useOfflineStore();
	const logsContainerRef = useRef<HTMLDivElement>(null);
	const errorCount = useMemo(() => logs.filter((l) => l.level === "ERROR").length, [logs]);

	useEffect(() => {
		const unsubLogs = clientLogger.subscribeLogs(() => setLogs(clientLogger.getLogs()));
		const unsubNet = clientLogger.subscribeNetwork(() => setNetworkLogs(clientLogger.getNetworkLogs()));
		return () => { unsubLogs(); unsubNet(); };
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "в" || e.key === "В")) {
				e.preventDefault();
				if (isOpen) handleClose();
				else setInternalIsOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	const filters = useDiagnosticFilterLogs({ logs, networkLogs });

	const toggleExpandLog = (id: string) => {
		setExpandedLogIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleCopyCorrelationId = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			setCopiedCorrelationId(id);
			setTimeout(() => setCopiedCorrelationId(null), 2000);
		} catch {}
	};

	const handleClearLogs = () => {
		clientLogger.clearLogs();
		setLogs([]);
		setNetworkLogs([]);
		setExpandedLogIds(new Set());
	};

	const handleExportReport = async () => {
		await clientLogger.downloadDiagnosticReport(
			{ organizationId: organizationId ?? null, userId: userId ?? null, userRole: userRole ?? null },
			{ pendingCount: offlineStore.pendingMutationCount, failedCount: offlineStore.metrics.failedCount, draftsCount: offlineStore.metrics.totalDrafts, clockSkewMs: 0 },
		);
	};

	return {
		isOpen,
		handleClose,
		setInternalIsOpen,
		activeTab,
		setActiveTab,
		logs,
		networkLogs,
		expandedLogIds,
		copiedCorrelationId,
		offlineStore,
		logsContainerRef,
		errorCount,
		toggleExpandLog,
		handleCopyCorrelationId,
		handleClearLogs,
		handleExportReport,
		...filters,
	};
}
