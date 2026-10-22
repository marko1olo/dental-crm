import {
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
} from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import {
	decommissionSterilizerItem,
	deleteSterilizerItem,
	recommissionSterilizerItem,
} from "./sterilizerDecommissionActions.js";
import {
	quickAddSterilizerPreset,
	toggleSterilizerMaintenance,
} from "./sterilizerFleetActions.js";

let inMemoryFleetEquipments: SterilizerEquipment[] = [];

export function useSterilizerFleetState(onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void) {
	const [equipments, setEquipments] = useState<SterilizerEquipment[]>(() => inMemoryFleetEquipments);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | SterilizerEquipmentStatus>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<SterilizerEquipment | null>(null);
	const [decommissionTarget, setDecommissionTarget] = useState<SterilizerEquipment | null>(null);
	const [decommissionReason, setDecommissionReason] = useState("");
	const [decommissionSubmitting, setDecommissionSubmitting] = useState(false);

	const updateEquipments = (newEquipments: SterilizerEquipment[]) => {
		setEquipments(newEquipments);
		inMemoryFleetEquipments = newEquipments;
		onEquipmentsChange?.(newEquipments);
	};

	const fetchEquipments = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/registers/sterilizers/equipments", { headers: getDenteAuthHeaders() }).catch(() => null);
			if (res && res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					updateEquipments(data);
					return;
				}
			}
			updateEquipments(inMemoryFleetEquipments.length > 0 ? inMemoryFleetEquipments : []);
		} catch (err) {
			updateEquipments(inMemoryFleetEquipments);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchEquipments(); }, []);

	const filteredEquipments = useMemo(() => {
		return equipments.filter((item) => {
			if (statusFilter !== "all" && item.status !== statusFilter) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return item.name.toLowerCase().includes(q) || item.brandModel.toLowerCase().includes(q) ||
				item.serialNumber.toLowerCase().includes(q) || (item.inventoryNumber && item.inventoryNumber.toLowerCase().includes(q)) ||
				(item.locationRoom && item.locationRoom.toLowerCase().includes(q)) || (item.notes && item.notes.toLowerCase().includes(q));
		});
	}, [equipments, statusFilter, searchQuery]);

	const stats = useMemo(() => {
		const total = equipments.length;
		const active = equipments.filter((e) => e.status === "active").length;
		const inMaint = equipments.filter((e) => e.status === "in_maintenance").length;
		const decom = equipments.filter((e) => e.status === "decommissioned").length;
		const todayStr = new Date().toISOString().slice(0, 10);
		const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const expiredVerification = equipments.filter((e) => e.status === "active" && e.verificationExpiryDate && e.verificationExpiryDate < todayStr).length;
		const dueSoonVerification = equipments.filter((e) => e.status === "active" && e.verificationExpiryDate && e.verificationExpiryDate >= todayStr && e.verificationExpiryDate <= in30Days).length;
		return { total, active, inMaint, decom, expiredVerification, dueSoonVerification };
	}, [equipments]);

	return {
		equipments, loading, searchQuery, setSearchQuery, statusFilter, setStatusFilter, isModalOpen, setIsModalOpen,
		editingItem, setEditingItem, decommissionTarget, setDecommissionTarget, decommissionReason, setDecommissionReason,
		decommissionSubmitting, filteredEquipments, stats, fetchEquipments,
		handleQuickAddPreset: (p: PopularSterilizerBrandPreset) => quickAddSterilizerPreset(p, equipments, fetchEquipments, (item) => updateEquipments([...equipments, item])),
		handleToggleMaintenance: (item: SterilizerEquipment) => toggleSterilizerMaintenance(item, fetchEquipments, (status) => updateEquipments(equipments.map((e) => (e.id === item.id ? { ...e, status } : e)))),
		handleDecommission: (item: SterilizerEquipment) => {
			if (item.status === "decommissioned") {
				recommissionSterilizerItem(item, fetchEquipments, () => updateEquipments(equipments.map((e) => (e.id === item.id ? { ...e, status: "active", isCommissioned: true } : e))));
			} else {
				setDecommissionTarget(item);
				setDecommissionReason(`Акт технической экспертизы и дефектации № ${item.inventoryNumber || ""}`.trim());
			}
		},
		handleConfirmDecommission: async () => {
			if (!decommissionTarget) return;
			setDecommissionSubmitting(true);
			try {
				await decommissionSterilizerItem(decommissionTarget, decommissionReason, fetchEquipments, (reason) => updateEquipments(equipments.map((e) => e.id === decommissionTarget.id ? { ...e, status: "decommissioned", isCommissioned: false, decommissioningDate: new Date().toISOString().slice(0, 10), notes: `${e.notes ? `${e.notes} | ` : ""}Списан: ${reason}` } : e)));
			} finally {
				setDecommissionSubmitting(false);
				setDecommissionTarget(null);
			}
		},
		handleDelete: (item: SterilizerEquipment) => deleteSterilizerItem(item, fetchEquipments, () => updateEquipments(equipments.filter((e) => e.id !== item.id))),
	};
}
