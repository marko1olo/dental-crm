import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type CreateSterilizerEquipmentDto,
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
} from "@dental/shared";
import {
	AlertCircle,
	AlertTriangle,
	Archive,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Edit3,
	FileBadge,
	Flame,
	Gauge,
	HelpCircle,
	Info,
	Layers,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Tag,
	Trash2,
	Wrench,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";

const LOCAL_STORAGE_KEY = "dente_sterilizer_equipments";

export interface SterilizerFleetManagerProps {
	onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void;
	compactMode?: boolean;
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
					localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
					if (onEquipmentsChange) onEquipmentsChange(data);
					return;
				}
			}

			// Fallback to local storage cache if server response is not available
			const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
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

		const autoSerial = `SN-${preset.brandModel.slice(0, 3).toUpperCase()}-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

		const payload: CreateSterilizerEquipmentDto = {
			name: preset.recommendedNameRu,
			brandModel: preset.brandModel,
			serialNumber: autoSerial,
			inventoryNumber: `ИНВ-${Math.floor(100 + Math.random() * 900)}`,
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
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
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
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
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
					localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
					if (onEquipmentsChange) onEquipmentsChange(updated);
					showToast(`Аппарат «${item.name}» восстановлен`, "success");
				}
			} catch (err) {
				showToast("Ошибка восстановления", "error");
			}
			return;
		}

		const reason = window.prompt(
			`Подтверждаете списание аппарата «${item.name}»? Укажите основание (Акт дефектации, износ, замена):`,
			"Акт технической экспертизы и дефектации № ",
		);
		if (reason === null) return;

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
				body: JSON.stringify({ action: "decommission", decommissionReason: reason }),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Аппарат «${item.name}» списан и выведен из эксплуатации`, "success");
				fetchEquipments();
			} else {
				const updated = equipments.map((e) =>
					e.id === item.id
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
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
				if (onEquipmentsChange) onEquipmentsChange(updated);
				showToast(`Аппарат «${item.name}» списан`, "success");
			}
		} catch (err) {
			showToast("Ошибка списания", "error");
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
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
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
			<div
				className="sanpin-fleet-toolbar"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.5rem",
					flexWrap: "wrap",
					padding: "0.5rem 0.75rem",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "8px",
				}}
			>
				{/* Search & Filter */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 auto" }}>
					<div style={{ position: "relative", minWidth: "200px", maxWidth: "340px", flex: "1 1 auto" }}>
						<Search size={14} style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted, #94a3b8)" }} />
						<input
							type="text"
							placeholder="Поиск по марке, названию, серийному №..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "1.9rem", height: "34px", fontSize: "0.8rem", width: "100%", borderRadius: "6px" }}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "32px",
								padding: "0.2rem 0.55rem",
								fontSize: "0.775rem",
								fontWeight: statusFilter === "all" ? 700 : 500,
								background: statusFilter === "all" ? "var(--teal)" : "transparent",
								color: statusFilter === "all" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "6px",
								cursor: "pointer",
							}}
						>
							Все ({stats.total})
						</button>

						<button
							type="button"
							onClick={() => setStatusFilter("active")}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "32px",
								padding: "0.2rem 0.55rem",
								fontSize: "0.775rem",
								fontWeight: statusFilter === "active" ? 700 : 500,
								background: statusFilter === "active" ? "var(--ok-fg)" : "transparent",
								color: statusFilter === "active" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "6px",
								cursor: "pointer",
							}}
						>
							🟢 В работе ({stats.active})
						</button>

						<button
							type="button"
							onClick={() => setStatusFilter("in_maintenance")}
							className="sanpin-btn touch-manipulation"
							style={{
								minHeight: "32px",
								padding: "0.2rem 0.55rem",
								fontSize: "0.775rem",
								fontWeight: statusFilter === "in_maintenance" ? 700 : 500,
								background: statusFilter === "in_maintenance" ? "var(--warn-fg)" : "transparent",
								color: statusFilter === "in_maintenance" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "6px",
								cursor: "pointer",
							}}
						>
							🟡 На ТО ({stats.inMaint})
						</button>

						{stats.decom > 0 && (
							<button
								type="button"
								onClick={() => setStatusFilter("decommissioned")}
								className="sanpin-btn touch-manipulation"
								style={{
									minHeight: "32px",
									padding: "0.2rem 0.55rem",
									fontSize: "0.775rem",
									fontWeight: statusFilter === "decommissioned" ? 700 : 500,
									background: statusFilter === "decommissioned" ? "var(--bad-fg)" : "transparent",
									color: statusFilter === "decommissioned" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "6px",
									cursor: "pointer",
								}}
							>
								🔴 Списанные ({stats.decom})
							</button>
						)}
					</div>
				</div>

				{/* Primary Action Button */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
					<button
						type="button"
						onClick={() => {
							setEditingItem(null);
							setIsModalOpen(true);
						}}
						className="sanpin-btn sanpin-btn-primary touch-manipulation"
						style={{
							minHeight: "34px",
							padding: "0.3rem 0.85rem",
							fontSize: "0.8rem",
							fontWeight: 700,
							background: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							borderRadius: "6px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.3rem",
						}}
						data-testid="add-sterilizer-btn"
					>
						<Plus size={15} />
						<span>Добавить аппарат в парк</span>
					</button>

					<button
						type="button"
						onClick={fetchEquipments}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "34px", width: "34px", padding: 0, borderRadius: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
						title="Обновить реестр оборудования"
					>
						<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					</button>
				</div>
			</div>

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
				<div
					className="sanpin-onboarding-card"
					style={{
						padding: "2.5rem 1.5rem",
						borderRadius: "12px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1.5px dashed var(--line, #cbd5e1)",
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "1.25rem",
					}}
					data-testid="sterilizer-fleet-onboarding"
				>
					<div
						style={{
							width: "60px",
							height: "60px",
							borderRadius: "16px",
							background: "rgba(13, 148, 136, 0.12)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--teal-600, #0d9488)",
						}}
					>
						<Flame size={32} />
					</div>

					<div style={{ maxWidth: "560px" }}>
						<h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
							Парк стерилизаторов клиники не настроен
						</h3>
						<p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
							Для регистрации циклов по Форме № 257/у, автоматической генерации DataMatrix-этикеток крафт-пакетов и прохождения проверок Роспотребнадзора зарегистрируйте автоклавы и сухожары клиники.
						</p>
					</div>

					{/* 1-Click Quick Preset Setup Buttons */}
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
						<span style={{ fontSize: "0.775rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
							Быстрое добавление популярного аппарата (1 клик):
						</span>
						<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.4rem", maxWidth: "650px" }}>
							{POPULAR_STERILIZER_BRAND_PRESETS.slice(0, 6).map((preset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => handleQuickAddPreset(preset)}
									className="sanpin-btn touch-manipulation"
									style={{
										minHeight: "36px",
										padding: "0.35rem 0.75rem",
										fontSize: "0.8rem",
										fontWeight: 600,
										background: "var(--paper, #ffffff)",
										color: "var(--ink, #0f172a)",
										border: "1px solid var(--line, #cbd5e1)",
										borderRadius: "6px",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: "0.35rem",
										boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
									}}
									title={`Добавить ${preset.brandModel} (${preset.chamberVolumeLiters} л)`}
								>
									<Sparkles size={13} color="var(--teal)" />
									<span>{preset.brandModel}</span>
									<span style={{ fontSize: "0.7rem", opacity: 0.75 }}>({preset.chamberVolumeLiters} л)</span>
								</button>
							))}
						</div>
					</div>

					<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
						<button
							type="button"
							onClick={() => {
								setEditingItem(null);
								setIsModalOpen(true);
							}}
							className="sanpin-btn sanpin-btn-primary touch-manipulation"
							style={{
								minHeight: "42px",
								padding: "0.5rem 1.5rem",
								fontSize: "0.875rem",
								fontWeight: 700,
								background: "var(--teal)",
								color: "var(--on-teal, #ffffff)",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.4rem",
							}}
						>
							<Plus size={16} />
							<span>Добавить аппарат вручную</span>
						</button>
					</div>
				</div>
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
					{filteredEquipments.map((item) => {
						const isVerificationExpired = Boolean(item.verificationExpiryDate && item.verificationExpiryDate < todayStr);
						const isVerificationDueSoon = Boolean(
							item.verificationExpiryDate && item.verificationExpiryDate >= todayStr && item.verificationExpiryDate <= in30Days,
						);

						return (
							<div
								key={item.id}
								className="sanpin-fleet-card"
								style={{
									background: "var(--paper-strong, #ffffff)",
									border: `1px solid ${
										item.status === "in_maintenance"
											? "rgba(217, 119, 6, 0.4)"
											: item.status === "decommissioned"
												? "rgba(220, 38, 38, 0.4)"
												: isVerificationExpired
													? "rgba(220, 38, 38, 0.4)"
													: "var(--line, #e2e8f0)"
									}`,
									borderRadius: "8px",
									padding: "0.85rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.6rem",
									boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
									opacity: item.status === "decommissioned" ? 0.75 : 1,
								}}
							>
								{/* Card Header */}
								<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
											<span
												className="sanpin-tag"
												style={{
													fontSize: "0.7rem",
													padding: "0.1rem 0.4rem",
													background: item.deviceType === "dry_heat" ? "rgba(234, 88, 12, 0.1)" : "rgba(13, 148, 136, 0.1)",
													color: item.deviceType === "dry_heat" ? "var(--warn-fg)" : "var(--teal)",
													fontWeight: 700,
												}}
											>
												{item.deviceType === "dry_heat" ? "Сухожар 180°C" : item.deviceClass === "autoclave_class_s" ? "B/S-Класс" : "B-Класс 134°C"}
											</span>

											<span
												className="sanpin-tag"
												style={{
													fontSize: "0.7rem",
													padding: "0.1rem 0.4rem",
													background: "rgba(0,0,0,0.05)",
													color: "var(--ink, #0f172a)",
													fontWeight: 600,
												}}
											>
												{item.chamberVolumeLiters} л
											</span>

											{item.status === "active" && (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
													<CheckCircle2 size={11} /> В работе
												</span>
											)}

											{item.status === "in_maintenance" && (
												<span className="sanpin-tag sanpin-tag-warning" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
													<Wrench size={11} /> На ТО
												</span>
											)}

											{item.status === "decommissioned" && (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
													<Archive size={11} /> Списан
												</span>
											)}
										</div>

										<h4
											style={{
												margin: 0,
												fontSize: "0.925rem",
												fontWeight: 700,
												color: "var(--ink, #0f172a)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
											title={item.name}
										>
											{item.name}
										</h4>
										<span style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)", display: "block" }}>
											{item.brandModel}
										</span>
									</div>

									{/* Quick Action Button: Edit */}
									<button
										type="button"
										onClick={() => {
											setEditingItem(item);
											setIsModalOpen(true);
										}}
										className="sanpin-btn-icon"
										style={{ minHeight: "30px", minWidth: "30px" }}
										title="Редактировать параметры аппарата"
									>
										<Edit3 size={14} />
									</button>
								</div>

								{/* Tech details grid */}
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.35rem 0.6rem",
										fontSize: "0.775rem",
										background: "var(--paper-soft, #f8fafc)",
										padding: "0.5rem",
										borderRadius: "6px",
									}}
								>
									<div>
										<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Серийный номер:</span>
										<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
											{item.serialNumber}
										</span>
									</div>

									<div>
										<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Инвентарный №:</span>
										<span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--ink, #0f172a)" }}>
											{item.inventoryNumber || "—"}
										</span>
									</div>

									<div style={{ gridColumn: "1 / -1" }}>
										<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Помещение:</span>
										<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
											{item.locationRoom || "ЦСО (Стерилизационная)"}
										</span>
									</div>

									<div>
										<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Поверка годна до:</span>
										{item.verificationExpiryDate ? (
											<span
												style={{
													fontWeight: 700,
													color: isVerificationExpired ? "var(--bad-fg)" : isVerificationDueSoon ? "var(--warn-fg)" : "var(--ok-fg)",
													display: "inline-flex",
													alignItems: "center",
													gap: "0.2rem",
												}}
											>
												{isVerificationExpired && <AlertTriangle size={11} />}
												{new Date(item.verificationExpiryDate).toLocaleDateString("ru-RU")}
											</span>
										) : (
											<span style={{ color: "var(--muted, #64748b)" }}>Не указана</span>
										)}
									</div>

									<div>
										<span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.7rem" }}>Следующее ТО:</span>
										<span style={{ fontWeight: 500, color: "var(--ink, #0f172a)" }}>
											{item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate).toLocaleDateString("ru-RU") : "По графику"}
										</span>
									</div>
								</div>

								{item.notes && (
									<div style={{ fontSize: "0.725rem", color: "var(--muted, #64748b)", fontStyle: "italic" }}>
										{item.notes}
									</div>
								)}

								{/* Bottom Action Buttons */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "0.35rem",
										marginTop: "auto",
										paddingTop: "0.4rem",
										borderTop: "1px solid var(--line, #e2e8f0)",
									}}
								>
									<div style={{ display: "flex", gap: "0.3rem" }}>
										{item.status !== "decommissioned" ? (
											<button
												type="button"
												onClick={() => handleToggleMaintenance(item)}
												className="sanpin-btn sanpin-btn-secondary touch-manipulation"
												style={{
													minHeight: "28px",
													height: "28px",
													padding: "0.1rem 0.5rem",
													fontSize: "0.725rem",
													fontWeight: 600,
													color: item.status === "in_maintenance" ? "#059669" : "#d97706",
												}}
												title={item.status === "in_maintenance" ? "Вернуть аппарат в строй" : "Отправить на техобслуживание (ТО)"}
											>
												{item.status === "in_maintenance" ? <CheckCircle2 size={12} /> : <Wrench size={12} />}
												<span>{item.status === "in_maintenance" ? "В строй" : "На ТО"}</span>
											</button>
										) : null}

										<button
											type="button"
											onClick={() => handleDecommission(item)}
											className="sanpin-btn sanpin-btn-secondary touch-manipulation"
											style={{
												minHeight: "28px",
												height: "28px",
												padding: "0.1rem 0.5rem",
												fontSize: "0.725rem",
												fontWeight: 600,
												color: item.status === "decommissioned" ? "#2563eb" : "#dc2626",
											}}
											title={item.status === "decommissioned" ? "Восстановить аппарат" : "Списать аппарат с баланса"}
										>
											{item.status === "decommissioned" ? <RotateCcw size={12} /> : <Archive size={12} />}
											<span>{item.status === "decommissioned" ? "Восстановить" : "Списать"}</span>
										</button>
									</div>

									<button
										type="button"
										onClick={() => handleDelete(item)}
										className="sanpin-btn-icon"
										style={{ minHeight: "28px", minWidth: "28px", color: "var(--muted, #94a3b8)" }}
										title="Удалить из реестра"
									>
										<Trash2 size={13} />
									</button>
								</div>
							</div>
						);
					})}
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
		</div>
	);
}
