import type { MedicalWasteLog } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import type { WasteSummaryStats } from "./MedicalWasteKpiGrid";
import { executeQuickShiftWaste } from "./wasteQuickShiftAction";

export function useMedicalWasteTabState() {
	const [logs, setLogs] = useState<MedicalWasteLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [classFilter, setClassFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isWasteJournalModalOpen, setIsWasteJournalModalOpen] = useState(false);
	const [isQuickShiftLoading, setIsQuickShiftLoading] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/medical-waste", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(data);
			}
		} catch (err) {
			console.error("Failed to load waste logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	const summaryStats: WasteSummaryStats = useMemo(() => {
		let totalKg = 0;
		let classAKg = 0;
		let classBKg = 0;
		let classGKg = 0;
		logs.forEach((l) => {
			const w = Number(l.weightKg) || 0;
			totalKg += w;
			if (l.wasteClass === "class_A") classAKg += w;
			if (l.wasteClass === "class_B") classBKg += w;
			if (l.wasteClass === "class_G") classGKg += w;
		});
		return {
			totalKg: totalKg.toFixed(2),
			classAKg: classAKg.toFixed(2),
			classBKg: classBKg.toFixed(2),
			classGKg: classGKg.toFixed(2),
			totalRecords: logs.length,
		};
	}, [logs]);

	const handleQuickShiftWaste = async () => {
		setIsQuickShiftLoading(true);
		await executeQuickShiftWaste(fetchLogs);
		setIsQuickShiftLoading(false);
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.wasteDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.disposalCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.responsibleStaffName?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchClass = classFilter === "all" || log.wasteClass === classFilter;
			return matchSearch && matchClass;
		});
	}, [logs, searchQuery, classFilter]);

	return {
		logs,
		loading,
		searchQuery,
		setSearchQuery,
		classFilter,
		setClassFilter,
		isModalOpen,
		setIsModalOpen,
		isWasteJournalModalOpen,
		setIsWasteJournalModalOpen,
		isQuickShiftLoading,
		handleQuickShiftWaste,
		fetchLogs,
		summaryStats,
		filteredLogs,
	};
}
