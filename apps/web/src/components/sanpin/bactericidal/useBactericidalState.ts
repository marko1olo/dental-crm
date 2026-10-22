import { useEffect, useMemo, useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { executePreShift30Min } from "../bactericidalShiftHelpers";
import { closeEveningShiftAction, openMorningShiftAction } from "./bactericidalShiftActions";
import { provisionEquipmentAction, replaceLampsAction } from "./bactericidalEquipmentActions";

export function useBactericidalState() {
	const [equipments, setEquipments] = useState<any[]>([]);
	const [logs, setLogs] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEquipId, setSelectedEquipId] = useState<string>("all");
	const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const fetchAll = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};
			const [equipRes, logRes] = await Promise.all([
				fetch("/api/registers/bactericidal/equipments", { headers }),
				fetch("/api/registers/bactericidal/logs", { headers }),
			]);
			if (equipRes.ok) setEquipments(await equipRes.json());
			if (logRes.ok) setLogs(await logRes.json());
		} catch (err) {
			console.error("Failed to load bactericidal data", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchAll(); }, []);

	const handleReplaceLamps = async (id: string) => {
		await replaceLampsAction(id, fetchAll);
	};

	const handleProvisionCanonicalEquipment = async (showNotice = true): Promise<any[]> => {
		if (submitting) return [];
		try {
			setSubmitting(true);
			return await provisionEquipmentAction(showNotice, fetchAll);
		} finally {
			setSubmitting(false);
		}
	};

	const handlePreShift30Min = async (equipmentId?: string) => {
		if (submitting) return;
		try {
			setSubmitting(true);
			let currentEquips = equipments;
			if (currentEquips.length === 0) {
				currentEquips = await handleProvisionCanonicalEquipment(false);
				if (currentEquips.length === 0) return;
			}
			const targetId = equipmentId || (currentEquips.length === 1 ? currentEquips[0].id : undefined);
			await executePreShift30Min(targetId, currentEquips, fetchAll);
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenMorningShift = async () => {
		if (submitting) return;
		try {
			setSubmitting(true);
			await openMorningShiftAction({
				equipments,
				onProvisionFallback: () => handleProvisionCanonicalEquipment(false),
				onRefresh: fetchAll,
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleCloseEveningShift = async () => {
		if (submitting) return;
		try {
			setSubmitting(true);
			await closeEveningShiftAction({
				equipments,
				onProvisionFallback: () => handleProvisionCanonicalEquipment(false),
				onRefresh: fetchAll,
			});
		} finally {
			setSubmitting(false);
		}
	};

	const filteredLogs = useMemo(() => {
		if (selectedEquipId === "all") return logs;
		return logs.filter((l) => l.equipmentId === selectedEquipId);
	}, [logs, selectedEquipId]);

	return {
		equipments, logs, loading, selectedEquipId, setSelectedEquipId,
		isEquipModalOpen, setIsEquipModalOpen, submitting,
		fetchAll, handleReplaceLamps, handleProvisionCanonicalEquipment,
		handlePreShift30Min, handleOpenMorningShift, handleCloseEveningShift, filteredLogs,
	};
}
