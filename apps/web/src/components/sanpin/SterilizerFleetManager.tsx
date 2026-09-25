import {
	type CreateSterilizerEquipmentDto,
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
} from "@dental/shared";
import { ShieldAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizerFleetToolbar } from "./SterilizerFleetToolbar";
import { SterilizerFleetOnboarding } from "./SterilizerFleetOnboarding";
import { SterilizerFleetCard } from "./SterilizerFleetCard";
import { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";

// Re-export subcomponents for modular usage and zero-downtime contracts
export { SterilizerFleetToolbar } from "./SterilizerFleetToolbar";
export { SterilizerFleetOnboarding } from "./SterilizerFleetOnboarding";
export { SterilizerFleetCard } from "./SterilizerFleetCard";
export { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";

const LOCAL_STORAGE_KEY = "dente_sterilizer_equipments";

export interface SterilizerFleetManagerProps {
	readonly onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void;
	readonly compactMode?: boolean;
}

export function SterilizerFleetManager({
	onEquipmentsChange,
	compactMode = false,
}: SterilizerFleetManagerProps) {
	const [equipments, setEquipments] = useState<SterilizerEquipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | SterilizerEquipmentStatus>("all");

	// Modals
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<SterilizerEquipment | null>(null);
	const [decommissionTarget, setDecommissionTarget] = useState<SterilizerEquipment | null>(null);
	const [decommissionReason, setDecommissionReason] = useState("");
	const [decommissionSubmitting, setDecommissionSubmitting] = useState(false);

	// Load from server with local cache fallback
	const fetchEquipments = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			const res = await fetch("/api/registers/sterilizers/equipments", { headers }).catch(() => null);
			if (res && res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					setEquipments(data);
					safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
					if (onEquipmentsChange) onEquipmentsChange(data);
					return;
				}
			}

			// Fallback to local storage cache if server response is not available
			const cached = safeLocalStorageGetItem(LOCAL_STORAGE_KEY);
			if (cached) {
				try {
					const parsed = JSON.parse(cached);
					if (Array.isArray(parsed)) {
						setEquipments(parsed);
						if (onEquipmentsChange) onEquipmentsChange(parsed);
						return;
					}
				} catch (e) {
					console.error("Failed to parse cached sterilizer equipments", e);
				}
			}

			// Clean zero state (no fake items)
			setEquipments([]);
			if (onEquipmentsChange) onEquipmentsChange([]);
		} catch (err) {
			console.error("Failed to load sterilizer equipments", err);
			setEquipments([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchEquipments();
	}, []);

	// Quick Add from Preset
	const handleQuickAddPreset = async (preset: PopularSterilizerBrandPreset) => {
		const today = new Date();
		const todayStr = today.toISOString().slice(0, 10);
		const nextYear = new Date(today);
		nextYear.setFullYear(nextYear.getFullYear() + 1);
		const nextYearStr = nextYear.toISOString().slice(0, 10);

		const next6Months = new Date(today);
		next6Months.setMonth(next6Months.getMonth() + 6);
		const next6MonthsStr = next6Months.toISOString().slice(0, 10);

		const nextSeq = equipments.length + 1;
		const autoSerial = `SN-${preset.brandModel.slice(0, 3).toUpperCase()}-${today.getFullYear()}-${nextSeq.toString().padStart(4, "0")}`;

		const payload: CreateSterilizerEquipmentDto = {
			name: preset.recommendedNameRu,
			brandModel: preset.brandModel,
			serialNumber: autoSerial,
			inventoryNumber: `ИНВ-${nextSeq.toString().padStart(3, "0")}`,
			deviceType: preset.deviceType,
			deviceClass: preset.deviceClass,
			chamberVolumeLiters: preset.chamberVolumeLiters,
			locationRoom: "ЦСО (Стерилизационная)",
			verificationExpiryDate: nextYearStr,
			lastMaintenanceDate: todayStr,
			nextMaintenanceDate: next6MonthsStr,
			commissioningDate: todayStr,
			status: "active",
			notes: `Установлен по заводской конфигурации ${preset.manufacturerRu}`,
		};

		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			const res = await fetch("/api/registers/sterilizers/equipments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Аппарат «${preset.brandModel}» (${preset.chamberVolumeLiters} л) успешно добавлен в парк клиники!`, "success");
				fetchEquipments();
			} else {
				// Local fallback creation
				const newLocalItem: SterilizerEquipment = {
					id: `local-ster-${Date.now()}`,
					organizationId: "00000000-0000-0000-0000-000000000001",
					name: payload.name || preset.brandModel,
					brandModel: payload.brandModel || preset.brandModel,
					serialNumber: payload.serialNumber || `SN-${Date.now()}`,
					deviceType: (payload.deviceType as any) || "autoclave_steam",
					deviceClass: (payload.deviceClass as any) || "autoclave_class_b",
					chamberVolumeLiters: payload.chamberVolumeLiters || preset.chamberVolumeLiters || 22,
					locationRoom: payload.locationRoom || "ЦСО (Стерилизационная)",
					status: (payload.status as any) || "active",
					inventoryNumber: payload.inventoryNumber || null,
					verificationExpiryDate: payload.verificationExpiryDate || null,
					lastMaintenanceDate: payload.lastMaintenanceDate || null,
					nextMaintenanceDate: payload.nextMaintenanceDate || null,
					commissioningDate: payload.commissioningDate || null,
					decommissioningDate: null,
					isCommissioned: true,
					notes: payload.notes || null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				const updated = [...equipments, newLocalItem];
				setEquipments(updated);
				safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
				if (onEquipmentsChange) onEquipmentsChange(updated);
				showToast(`Аппарат «${preset.brandModel}» добавлен в парк клиники!`, "success");
			}
		} catch (err) {
			console.error("Quick add preset error", err);
			showToast("Ошибка добавления аппарата", "error");
		}
	};

	// Toggle maintenance / active
	const handleToggleMaintenance = async (item: SterilizerEquipment) => {
		const newAction = item.status === "in_maintenance" ? "return_to_service" : "put_in_maintenance";
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: newAction }),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(
					newAction === "return_to_service"
						? `Аппарат «${item.name}» возвращен в эксплуатацию`
						: `Аппарат «${item.name}» переведен на техобслуживание (ТО)`,
					"success",
				);
				fetchEquipments();
			} else {
				// Local toggle
				const updatedStatus: SterilizerEquipmentStatus = item.status === "in_maintenance" ? "active" : "in_maintenance";
				const updated = equipments.map((e) => (e.id === item.id ? { ...e, status: updatedStatus } : e));
				setEquipments(updated);
				safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
				if (onEquipmentsChange) onEquipmentsChange(updated);
				showToast(`Статус аппарата «${item.name}» обновлен`, "success");
			}
		} catch (err) {
			showToast("Ошибка обновления статуса", "error");
		}
	};

	// Decommission item
	const handleDecommission = async (item: SterilizerEquipment) => {
		if (item.status === "decommissioned") {
			// Recommission
			try {
				const clinicToken = readDenteClinicToken();
				const staffToken = readDenteStaffToken();
				const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
						...(staffToken ? { "X-Staff-Token": staffToken } : {}),
					},
					body: JSON.stringify({ action: "recommission" }),
				}).catch(() => null);

				if (res && res.ok) {
					showToast(`Аппарат «${item.name}» восстановлен в эксплуатации`, "success");
					fetchEquipments();
				} else {
					const updated = equipments.map((e) => (e.id === item.id ? { ...e, status: "active" as const, isCommissioned: true } : e));
					setEquipments(updated);
					safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
					if (onEquipmentsChange) onEquipmentsChange(updated);
					showToast(`Аппарат «${item.name}» восстановлен`, "success");
				}
			} catch (err) {
				showToast("Ошибка восстановления", "error");
			}
			return;
		}

		setDecommissionTarget(item);
		setDecommissionReason(`Акт технической экспертизы и дефектации № ${item.inventoryNumber || ""}`.trim());
	};

	const handleConfirmDecommission = async () => {
		if (!decommissionTarget) return;
		const reason = decommissionReason.trim() || "Акт технической экспертизы и дефектации № б/н";

		try {
			setDecommissionSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${decommissionTarget.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: "decommission", decommissionReason: reason }),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Аппарат «${decommissionTarget.name}» списан и выведен из эксплуатации`, "success");
				fetchEquipments();
			} else {
				const updated = equipments.map((e) =>
					e.id === decommissionTarget.id
						? {
								...e,
								status: "decommissioned" as const,
								isCommissioned: false,
								decommissioningDate: new Date().toISOString().slice(0, 10),
								notes: `${e.notes ? `${e.notes} | ` : ""}Списан: ${reason}`,
							}
						: e,
				);
				setEquipments(updated);
				safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
				if (onEquipmentsChange) onEquipmentsChange(updated);
				showToast(`Аппарат «${decommissionTarget.name}» списан`, "success");
			}
		} catch (err) {
			showToast("Ошибка списания", "error");
		} finally {
			setDecommissionSubmitting(false);
			setDecommissionTarget(null);
		}
	};

	// Delete item from register
	const handleDelete = async (item: SterilizerEquipment) => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${item.id}`, {
				method: "DELETE",
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Аппарат «${item.name}» удален из реестра`, "success");
				fetchEquipments();
			} else {
				const updated = equipments.filter((e) => e.id !== item.id);
				setEquipments(updated);
				safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
				if (onEquipmentsChange) onEquipmentsChange(updated);
				showToast(`Аппарат «${item.name}» удален`, "success");
			}
		} catch (err) {
			showToast("Ошибка удаления", "error");
		}
	};

	// Filtered items
	const filteredEquipments = useMemo(() => {
		return equipments.filter((item) => {
			const matchStatus = statusFilter === "all" || item.status === statusFilter;
			if (!matchStatus) return false;

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				item.name.toLowerCase().includes(q) ||
				item.brandModel.toLowerCase().includes(q) ||
				item.serialNumber.toLowerCase().includes(q) ||
				(item.inventoryNumber && item.inventoryNumber.toLowerCase().includes(q)) ||
				(item.locationRoom && item.locationRoom.toLowerCase().includes(q)) ||
				(item.notes && item.notes.toLowerCase().includes(q))
			);
		});
	}, [equipments, statusFilter, searchQuery]);

	// Stats
	const stats = useMemo(() => {
		const total = equipments.length;
		const active = equipments.filter((e) => e.status === "active").length;
		const inMaint = equipments.filter((e) => e.status === "in_maintenance").length;
		const decom = equipments.filter((e) => e.status === "decommissioned").length;

		const todayStr = new Date().toISOString().slice(0, 10);
		const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		const expiredVerification = equipments.filter(
			(e) => e.status === "active" && e.verificationExpiryDate && e.verificationExpiryDate < todayStr,
		).length;

		const dueSoonVerification = equipments.filter(
			(e) =>
				e.status === "active" &&
				e.verificationExpiryDate &&
				e.verificationExpiryDate >= todayStr &&
				e.verificationExpiryDate <= in30Days,
		).length;

		return { total, active, inMaint, decom, expiredVerification, dueSoonVerification };
	}, [equipments]);

	const todayStr = new Date().toISOString().slice(0, 10);
	const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	return (
		<div className="sanpin-fleet-container" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
			{/* Top Control Bar */}
			<SterilizerFleetToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				statusFilter={statusFilter}
				setStatusFilter={setStatusFilter}
				stats={stats}
				onAddNew={() => {
					setEditingItem(null);
					setIsModalOpen(true);
				}}
				onRefresh={fetchEquipments}
				loading={loading}
			/>

			{/* Warnings Banner if any verifications are expired or due soon */}
			{stats.expiredVerification > 0 && (
				<div
					style={{
						padding: "0.5rem 0.75rem",
						borderRadius: "6px",
						background: "rgba(220, 38, 38, 0.08)",
						border: "1px solid rgba(220, 38, 38, 0.3)",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						fontSize: "0.8rem",
						color: "#dc2626",
						fontWeight: 600,
					}}
				>
					<ShieldAlert size={16} />
					<span>
						Внимание СанПиН: У {stats.expiredVerification} аппарата(ов) истек срок метрологической поверки / калибровки! Эксплуатация без поверки запрещена п. 3624 СанПиН 3.3686-21.
					</span>
				</div>
			)}

			{/* CLEAN ONBOARDING ZERO STATE (When clinic has 0 sterilizers) */}
			{!loading && equipments.length === 0 && (
				<SterilizerFleetOnboarding
					onQuickAddPreset={handleQuickAddPreset}
					onAddNew={() => {
						setEditingItem(null);
						setIsModalOpen(true);
					}}
				/>
			)}

			{/* Equipment Cards Grid */}
			{!loading && equipments.length > 0 && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "0.75rem",
					}}
				>
					{filteredEquipments.map((item) => (
						<SterilizerFleetCard
							key={item.id}
							item={item}
							onEdit={(it) => {
								setEditingItem(it);
								setIsModalOpen(true);
							}}
							onToggleMaintenance={handleToggleMaintenance}
							onDecommission={handleDecommission}
							onDelete={handleDelete}
							todayStr={todayStr}
							in30Days={in30Days}
						/>
					))}
				</div>
			)}

			{/* Modal for Add / Edit */}
			<SterilizerEquipmentModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setEditingItem(null);
				}}
				onSuccess={fetchEquipments}
				editingEquipment={editingItem}
			/>

			{/* Inline confirmation modal for Decommission (eliminates window.prompt) */}
			<SterilizerDecommissionModal
				target={decommissionTarget}
				reason={decommissionReason}
				setReason={setDecommissionReason}
				submitting={decommissionSubmitting}
				onConfirm={() => void handleConfirmDecommission()}
				onCancel={() => setDecommissionTarget(null)}
			/>
		</div>
	);
}
