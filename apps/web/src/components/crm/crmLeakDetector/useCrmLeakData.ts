import { useCallback, useEffect, useState } from "react";
import type { CrmLeakFunnelMetrics, CrmLeakLeadItem } from "@dental/shared";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	fetchLeakDetectorLeads,
	fetchLeakFunnelMetrics,
	syncLeakDetector,
} from "../../../lib/crmLeakDetectorApi";
import { showToast } from "../../GlobalToast";

export function useCrmLeakData(isOpen: boolean) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	const [leads, setLeads] = useState<CrmLeakLeadItem[]>([]);
	const [metrics, setMetrics] = useState<CrmLeakFunnelMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);

	const [minDays, setMinDays] = useState<number>(210);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [onlyUncompletedPlans, setOnlyUncompletedPlans] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");

	const loadData = useCallback(async () => {
		if (!auth?.denteClinicalReadHeaders) return;
		try {
			setLoading(true);
			const headers = auth.denteClinicalReadHeaders();
			const [leadsRes, metricsRes] = await Promise.all([
				fetchLeakDetectorLeads(headers, {
					minDays,
					status: statusFilter,
					hasUncompletedPlan: onlyUncompletedPlans ? true : undefined,
				}),
				fetchLeakFunnelMetrics(headers),
			]);
			setLeads(leadsRes.data || []);
			setMetrics(metricsRes.data || null);
		} catch (err: any) {
			showToast(`Ошибка детектора оттока: ${err.message}`, "error");
		} finally {
			setLoading(false);
		}
	}, [auth, minDays, statusFilter, onlyUncompletedPlans]);

	useEffect(() => {
		if (isOpen) {
			loadData();
		}
	}, [isOpen, loadData]);

	const handleSync = async () => {
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			setSyncing(true);
			const headers = auth.denteClinicalMutationHeaders();
			const res = await syncLeakDetector(headers);
			showToast(`Синхронизация завершена: ${res.message}`, "success");
			await loadData();
		} catch (err: any) {
			showToast(`Сбой синхронизации: ${err.message}`, "error");
		} finally {
			setSyncing(false);
		}
	};

	const filteredLeads = leads.filter((lead) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			lead.patientFullName.toLowerCase().includes(q) ||
			lead.phone.includes(q) ||
			Boolean(lead.lastDoctorName && lead.lastDoctorName.toLowerCase().includes(q))
		);
	});

	return {
		leads: filteredLeads,
		allLeadsCount: leads.length,
		metrics,
		loading,
		syncing,
		minDays,
		setMinDays,
		statusFilter,
		setStatusFilter,
		onlyUncompletedPlans,
		setOnlyUncompletedPlans,
		searchQuery,
		setSearchQuery,
		loadData,
		handleSync,
	};
}
