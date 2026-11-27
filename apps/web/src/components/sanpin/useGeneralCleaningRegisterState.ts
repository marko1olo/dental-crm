import type { GeneralCleaningLog } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
import {
	executeAutopilotMonthCleaning,
	executeQuickRecordNormCleaning,
	verifyCleaningLogRecord,
} from "./generalCleaningQuickActions.js";

export function useGeneralCleaningRegisterState() {
	const [logs, setLogs] = useState<GeneralCleaningLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isDisinfectionModalOpen, setIsDisinfectionModalOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"table" | "schedule">("table");
	const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/registers/cleaning", {
				headers: denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(data);
			} else {
				clientLogger.warn("Failed to load cleaning logs", { status: res.status });
			}
		} catch (err) {
			clientLogger.error("Failed to load cleaning logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.disinfectantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchType = typeFilter === "all" || log.cleaningType === typeFilter;
			return matchSearch && matchType;
		});
	}, [logs, searchQuery, typeFilter]);

	return {
		logs,
		loading,
		searchQuery,
		setSearchQuery,
		typeFilter,
		setTypeFilter,
		isDisinfectionModalOpen,
		setIsDisinfectionModalOpen,
		viewMode,
		setViewMode,
		isAutopilotLoading,
		submitting,
		filteredLogs,
		fetchLogs,
		handleAutopilotMonth: () => executeAutopilotMonthCleaning(fetchLogs, setIsAutopilotLoading),
		handleQuickRecordNormCleaning: () => executeQuickRecordNormCleaning(fetchLogs, setSubmitting),
		handleVerify: (id: string) => verifyCleaningLogRecord(id, fetchLogs),
	};
}
