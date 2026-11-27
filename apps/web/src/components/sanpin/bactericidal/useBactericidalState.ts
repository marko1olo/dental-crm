import { useEffect, useMemo, useState } from "react";
import type { BactericidalEquipment, BactericidalLogEntry } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { executePreShift30Min } from "../bactericidalShiftHelpers";
import { closeEveningShiftAction, openMorningShiftAction } from "./bactericidalShiftActions";
import { provisionEquipmentAction, replaceLampsAction } from "./bactericidalEquipmentActions";

export type BactericidalLogItem = BactericidalLogEntry & {
	readonly serialNumber?: string | null;
};

export function useBactericidalState() {
	const [equipments, setEquipments] = useState<BactericidalEquipment[]>([]);
	const [logs, setLogs] = useState<BactericidalLogItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEquipId, setSelectedEquipId] = useState<string>("all");
	const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const fetchAll = async () => {
		try {
			setLoading(true);
			const headers = denteClinicalReadHeaders();
			const [equipRes, logRes] = await Promise.all([
				fetch("/api/registers/bactericidal/equipments", { headers }),
				fetch("/api/registers/bactericidal/logs", { headers }),
			]);
			if (equipRes.ok) {
				const equipData = (await equipRes.json()) as BactericidalEquipment[];
				setEquipments(Array.isArray(equipData) ? equipData : []);
			} else {
				clientLogger.warn("Failed to load bactericidal equipments", { status: equipRes.status });
			}
			if (logRes.ok) {
				const logData = (await logRes.json()) as BactericidalLogItem[];
				setLogs(Array.isArray(logData) ? logData : []);
			} else {
				clientLogger.warn("Failed to load bactericidal logs", { status: logRes.status });
			}
		} catch (err) {
			clientLogger.error("Failed to load bactericidal data", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchAll(); }, []);

	const handleReplaceLamps = async (id: string) => {
		await replaceLampsAction(id, fetchAll);
	};

	const handleProvisionCanonicalEquipment = async (showNotice = true): Promise<BactericidalEquipment[]> => {
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
			const targetId = equipmentId || (currentEquips.length === 1 ? currentEquips[0]?.id : undefined);
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
