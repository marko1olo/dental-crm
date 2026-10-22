import { useState, useMemo } from "react";
import type { ClientLogEntry, LogLevel, NetworkLogEntry } from "@dental/shared";
import { safeFormatJson } from "./safeFormatJson";

interface UseDiagnosticFilterLogsProps {
	logs: readonly ClientLogEntry[];
	networkLogs: readonly NetworkLogEntry[];
}

export function useDiagnosticFilterLogs({ logs, networkLogs }: UseDiagnosticFilterLogsProps) {
	const [logLevelFilter, setLogLevelFilter] = useState<"ALL" | LogLevel>("ALL");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedModule, setSelectedModule] = useState<string>("ALL");

	const availableModules = useMemo(() => {
		const set = new Set<string>();
		for (const log of logs) { if (log.module) set.add(log.module); }
		return Array.from(set).sort();
	}, [logs]);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			if (logLevelFilter !== "ALL" && log.level !== logLevelFilter) return false;
			if (selectedModule !== "ALL" && log.module !== selectedModule) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const mMsg = log.message.toLowerCase().includes(q);
				const mMod = log.module.toLowerCase().includes(q);
				const mCorr = log.correlationId?.toLowerCase().includes(q);
				const mData = log.data ? safeFormatJson(log.data).toLowerCase().includes(q) : false;
				if (!mMsg && !mMod && !mCorr && !mData) return false;
			}
			return true;
		});
	}, [logs, logLevelFilter, selectedModule, searchQuery]);

	const filteredNetworkLogs = useMemo(() => {
		if (!searchQuery.trim()) return networkLogs;
		const q = searchQuery.toLowerCase();
		return networkLogs.filter((net) =>
			net.url.toLowerCase().includes(q) ||
			net.method.toLowerCase().includes(q) ||
			net.correlationId.toLowerCase().includes(q) ||
			String(net.statusCode).includes(q),
		);
	}, [networkLogs, searchQuery]);

	return {
		logLevelFilter,
		setLogLevelFilter,
		searchQuery,
		setSearchQuery,
		selectedModule,
		setSelectedModule,
		availableModules,
		filteredLogs,
		filteredNetworkLogs,
	};
}
