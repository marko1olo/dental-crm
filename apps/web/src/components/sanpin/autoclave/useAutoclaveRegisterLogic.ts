import { useState, useEffect, useMemo } from "react";
import type { SterilizationLogRecord } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { DEFAULT_DOM_PAGE_SIZE, sliceDomList } from "../../../utils/domVirtualizationHelper";
import {
	type ClinicAutoclaveDevice,
	DEFAULT_CLINIC_DEVICES,
	loadSavedClinicAutoclaves,
	saveClinicAutoclaves,
} from "./autoclaveDeviceTypes";

export function useAutoclaveRegisterLogic() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);
	const [isWasteJournalOpen, setIsWasteJournalOpen] = useState(false);
	const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});
	const [viewSubMode, setViewSubMode] = useState<"journal" | "table">("journal");
	const [displayLimit, setDisplayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);
	const [isLoggingBatch, setIsLoggingBatch] = useState(false);
	const [kraftPrefill, setKraftPrefill] = useState<{ autoclaveId?: string | undefined; cycleNumber?: number | undefined; operatorName?: string | undefined }>({});

	const [clinicDevices, setClinicDevices] = useState<ClinicAutoclaveDevice[]>(() => {
		const saved = loadSavedClinicAutoclaves();
		return saved.length > 0 ? saved : DEFAULT_CLINIC_DEVICES;
	});

	const fetchLogs = async () => {
		try {
			setLoading(true);
			let res = await fetch("/api/sanpin/sterilization", { headers: getDenteAuthHeaders() }).catch(() => null);
			if (!res || !res.ok) res = await fetch("/api/registers/sterilization", { headers: getDenteAuthHeaders() }).catch(() => null);
			setLogs(res && res.ok ? await res.json() : []);
		} catch {
			setLogs([]);
		} finally {
			setLoading(false);
		}
	};

	const fetchDevices = async () => {
		try {
			const res = await fetch("/api/registers/sterilizers/equipments", { headers: getDenteAuthHeaders() }).catch(() => null);
			if (res && res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					const mapped: ClinicAutoclaveDevice[] = data.map((d: any) => ({
						id: d.id, brandModelRu: d.brandModel || d.name, serialNumber: d.serialNumber,
						inventoryNumber: d.inventoryNumber || "",
						deviceType: d.deviceClass === "dry_heat_air" ? "dry_heat_air" : "autoclave_class_b",
						chamberVolumeLiters: Number(d.chamberVolumeLiters) || 22,
						locationRu: d.locationRoom || "ЦСО",
						lastMaintenanceDate: d.lastMaintenanceDate || "",
						nextMaintenanceDate: d.nextMaintenanceDate || "",
						isOperational: d.status === "active",
					}));
					setClinicDevices(mapped);
					saveClinicAutoclaves(mapped);
				}
			}
		} catch {}
	};

	useEffect(() => {
		fetchLogs();
		fetchDevices();
	}, []);

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({ ...prev, [logId]: true }));
		showToast("Электронный штамп ответственного применен к записи стерилизации", "success");
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const q = searchQuery.toLowerCase();
			const matchSearch = !searchQuery || log.deviceName?.toLowerCase().includes(q) ||
				log.itemsDescription?.toLowerCase().includes(q) || log.barcode?.toLowerCase().includes(q) ||
				log.operatorName?.toLowerCase().includes(q);
			return matchSearch && (deviceFilter === "all" || log.autoclaveId === deviceFilter || log.deviceName === deviceFilter);
		});
	}, [logs, searchQuery, deviceFilter]);

	const logsSlice = useMemo(() => sliceDomList(filteredLogs, displayLimit, 0), [filteredLogs, displayLimit]);

	return {
		logs, setLogs, filteredLogs, logsSlice, loading,
		searchQuery, setSearchQuery, deviceFilter, setDeviceFilter,
		clinicDevices, fetchLogs, fetchDevices, stampedRows,
		handleStampVerification, viewSubMode, setViewSubMode,
		displayLimit, setDisplayLimit, isLoggingBatch, setIsLoggingBatch,
		isKraftModalOpen, setIsKraftModalOpen,
		isSterilizationLogModalOpen: isJournal257ModalOpen, setIsSterilizationLogModalOpen: setIsJournal257ModalOpen,
		isJournal257ModalOpen, setIsJournal257ModalOpen,
		isNewCycleModalOpen, setIsNewCycleModalOpen, isWasteJournalOpen, setIsWasteJournalOpen,
		isEquipmentModalOpen, setIsEquipmentModalOpen, kraftPrefill, setKraftPrefill,
	};
}
