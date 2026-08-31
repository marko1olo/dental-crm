/**
 * ============================================================================
 * CLINIC AUTOCLAVE & STERILIZER EQUIPMENT CRUD MODAL (СанПиН 3.3686-21)
 * Управление парком оборудования ЦСО клиники: автоклавы класса B/S/N, сухожаровые шкафы.
 * Сохранение инвентарных номеров, объемов камер и сроков метрологической поверки.
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import {
	ShieldCheck,
	Plus,
	Trash2,
	Edit2,
	Check,
	X,
	Calendar,
	Gauge,
	Layers,
	FileBadge,
	Sparkles,
	AlertTriangle,
	Wrench,
	Archive,
	RotateCcw,
	CheckCircle2,
} from "lucide-react";
import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type PopularSterilizerBrandPreset,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
	type SterilizerDeviceClass,
	type SterilizationDeviceType,
	type CreateSterilizerEquipmentDto,
	type UpdateSterilizerEquipmentDto,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export interface ClinicAutoclaveDevice {
	id: string;
	brandModelRu: string;
	serialNumber: string;
	inventoryNumber?: string;
	deviceType: "autoclave_class_b" | "autoclave_class_s" | "autoclave_class_n" | "dry_heat_air";
	chamberVolumeLiters: number;
	locationRu: string;
	lastMaintenanceDate: string;
	nextMaintenanceDate: string;
	isOperational: boolean;
	notes?: string;
}

export const DEFAULT_CLINIC_DEVICES: ClinicAutoclaveDevice[] = [
	{
		id: "AUTO-01",
		brandModelRu: "Melag Vacuklav 23 B+ (Германия)",
		serialNumber: "MEL-2024-9812",
		inventoryNumber: "ИНВ-ЦСО-001",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 22,
		locationRu: "Центральное стерилизационное отделение (ЦСО)",
		lastMaintenanceDate: "2026-06-01",
		nextMaintenanceDate: "2026-12-01",
		isOperational: true,
		notes: "Класс B с фракционированным вакуумом",
	},
	{
		id: "AUTO-02",
		brandModelRu: "W&H Lina 17 (Австрия)",
		serialNumber: "WH-2023-4410",
		inventoryNumber: "ИНВ-ЦСО-002",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 17,
		locationRu: "ЦСО (Стерилизационная)",
		lastMaintenanceDate: "2026-05-15",
		nextMaintenanceDate: "2026-11-15",
		isOperational: true,
		notes: "Автоклав класса B для наконечников и инструментов",
	},
	{
		id: "AUTO-03",
		brandModelRu: "ГП-40 СПУ (Сухожаровой шкаф)",
		serialNumber: "GP-2024-089",
		inventoryNumber: "ИНВ-ЦСО-003",
		deviceType: "dry_heat_air",
		chamberVolumeLiters: 40,
		locationRu: "Стерилизационная",
		lastMaintenanceDate: "2026-07-01",
		nextMaintenanceDate: "2027-01-01",
		isOperational: true,
		notes: "Сухожаровой стерилизатор 180°C",
	},
];

const STORAGE_KEY = "dente_clinic_autoclaves_v1";

export function loadSavedClinicAutoclaves(): ClinicAutoclaveDevice[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw !== null) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		}
	} catch (e) {
		console.warn("Failed to parse saved clinic autoclaves", e);
	}
	return [];
}

export function saveClinicAutoclaves(devices: ClinicAutoclaveDevice[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
	} catch (e) {
		console.warn("Failed to persist clinic autoclaves", e);
	}
}

export interface AutoclaveEquipmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onDevicesUpdated?: (devices: ClinicAutoclaveDevice[]) => void;
}

export function AutoclaveEquipmentModal({
	isOpen,
	onClose,
	onDevicesUpdated,
}: AutoclaveEquipmentModalProps) {
	const [devices, setDevices] = useState<ClinicAutoclaveDevice[]>([]);
	const [serverEquipments, setServerEquipments] = useState<SterilizerEquipment[]>([]);
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	// Form fields
	const [brandModelRu, setBrandModelRu] = useState<string>("");
	const [serialNumber, setSerialNumber] = useState<string>("");
	const [inventoryNumber, setInventoryNumber] = useState<string>("");
	const [deviceType, setDeviceType] = useState<ClinicAutoclaveDevice["deviceType"]>("autoclave_class_b");
	const [chamberVolumeLiters, setChamberVolumeLiters] = useState<number>(22);
	const [locationRu, setLocationRu] = useState<string>("ЦСО");
	const [lastMaintenanceDate, setLastMaintenanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>(
		new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
	);
	const [notes, setNotes] = useState<string>("");

	const loadEquipments = async () => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/sterilizers/equipments", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			}).catch(() => null);

			if (res && res.ok) {
				const data: SterilizerEquipment[] = await res.json();
				if (Array.isArray(data)) {
					setServerEquipments(data);
					const mapped: ClinicAutoclaveDevice[] = data.map((d) => ({
						id: d.id,
						brandModelRu: d.brandModel,
						serialNumber: d.serialNumber,
						inventoryNumber: d.inventoryNumber || "",
						deviceType: (d.deviceClass === "dry_heat_air" ? "dry_heat_air" : d.deviceClass === "autoclave_class_s" ? "autoclave_class_s" : d.deviceClass === "autoclave_class_n" ? "autoclave_class_n" : "autoclave_class_b") as ClinicAutoclaveDevice["deviceType"],
						chamberVolumeLiters: Number(d.chamberVolumeLiters) || 22,
						locationRu: d.locationRoom || "ЦСО",
						lastMaintenanceDate: d.lastMaintenanceDate || "",
						nextMaintenanceDate: d.nextMaintenanceDate || d.verificationExpiryDate || "",
						isOperational: d.status === "active",
						notes: d.notes || "",
					}));
					setDevices(mapped);
					saveClinicAutoclaves(mapped);
					onDevicesUpdated?.(mapped);
					return;
				}
			}
		} catch (e) {
			console.error("Failed to load server sterilizers", e);
		}

		// Fallback to local storage
		const loaded = loadSavedClinicAutoclaves();
		setDevices(loaded);
		onDevicesUpdated?.(loaded);
	};

	useEffect(() => {
		if (isOpen) {
			loadEquipments();
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const handleApplyPreset = (preset: PopularSterilizerBrandPreset) => {
		setSelectedPresetId(preset.id);
		setBrandModelRu(preset.brandModel);
		setChamberVolumeLiters(preset.chamberVolumeLiters);
		setDeviceType(preset.deviceClass === "dry_heat_air" ? "dry_heat_air" : preset.deviceClass === "autoclave_class_s" ? "autoclave_class_s" : preset.deviceClass === "autoclave_class_n" ? "autoclave_class_n" : "autoclave_class_b");
	};

	const handleStartAdd = () => {
		setIsEditing(true);
		setEditId(null);
		const defaultPreset = POPULAR_STERILIZER_BRAND_PRESETS[0]!;
		setSelectedPresetId(defaultPreset.id);
		setBrandModelRu(defaultPreset.brandModel);
		setSerialNumber("");
		setInventoryNumber(`ИНВ-ЦСО-${String(devices.length + 1).padStart(3, "0")}`);
		setDeviceType("autoclave_class_b");
		setChamberVolumeLiters(defaultPreset.chamberVolumeLiters);
		setLocationRu("Центральное стерилизационное отделение (ЦСО)");
		setLastMaintenanceDate(new Date().toISOString().slice(0, 10));
		setNextMaintenanceDate(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));
		setNotes("");
	};

	const handleStartEdit = (dev: ClinicAutoclaveDevice) => {
		setIsEditing(true);
		setEditId(dev.id);
		setSelectedPresetId(null);
		setBrandModelRu(dev.brandModelRu);
		setSerialNumber(dev.serialNumber);
		setInventoryNumber(dev.inventoryNumber || "");
		setDeviceType(dev.deviceType);
		setChamberVolumeLiters(dev.chamberVolumeLiters);
		setLocationRu(dev.locationRu);
		setLastMaintenanceDate(dev.lastMaintenanceDate);
		setNextMaintenanceDate(dev.nextMaintenanceDate);
		setNotes(dev.notes || "");
	};

	const handleSaveDevice = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!brandModelRu.trim() || !serialNumber.trim()) {
			showToast("Заполните марку/модель и заводской номер", "error");
			return;
		}

		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			const mappedDeviceType: SterilizationDeviceType = deviceType === "dry_heat_air" ? "dry_heat" : "autoclave_steam";
			const mappedDeviceClass: SterilizerDeviceClass = deviceType === "dry_heat_air" ? "dry_heat_air" : deviceType === "autoclave_class_s" ? "autoclave_class_s" : deviceType === "autoclave_class_n" ? "autoclave_class_n" : "autoclave_class_b";

			if (editId && !editId.startsWith("AUTO-") && !editId.startsWith("local-")) {
				// Server update
				const updateDto: UpdateSterilizerEquipmentDto = {
					name: brandModelRu.trim(),
					brandModel: brandModelRu.trim(),
					serialNumber: serialNumber.trim(),
					inventoryNumber: inventoryNumber.trim() || null,
					deviceType: mappedDeviceType,
					deviceClass: mappedDeviceClass,
					chamberVolumeLiters: Number(chamberVolumeLiters) || 22,
					locationRoom: locationRu.trim(),
					lastMaintenanceDate: lastMaintenanceDate || null,
					nextMaintenanceDate: nextMaintenanceDate || null,
					notes: notes.trim() || null,
				};

				await fetch(`/api/registers/sterilizers/equipments/${editId}`, {
					method: "PUT",
					headers,
					body: JSON.stringify(updateDto),
				}).catch(() => null);
			} else if (!editId) {
				// Server create
				const createDto: CreateSterilizerEquipmentDto = {
					name: brandModelRu.trim(),
					brandModel: brandModelRu.trim(),
					serialNumber: serialNumber.trim(),
					inventoryNumber: inventoryNumber.trim() || null,
					deviceType: mappedDeviceType,
					deviceClass: mappedDeviceClass,
					chamberVolumeLiters: Number(chamberVolumeLiters) || 22,
					locationRoom: locationRu.trim(),
					lastMaintenanceDate: lastMaintenanceDate || null,
					nextMaintenanceDate: nextMaintenanceDate || null,
					verificationExpiryDate: nextMaintenanceDate || null,
					commissioningDate: lastMaintenanceDate || null,
					status: "active",
					notes: notes.trim() || null,
				};

				await fetch("/api/registers/sterilizers/equipments", {
					method: "POST",
					headers,
					body: JSON.stringify(createDto),
				}).catch(() => null);
			}
		} catch (err) {
			console.error("Failed to sync sterilizer to server", err);
		}

		let updated: ClinicAutoclaveDevice[];
		if (editId) {
			updated = devices.map((d) =>
				d.id === editId
					? {
							...d,
							brandModelRu: brandModelRu.trim(),
							serialNumber: serialNumber.trim(),
							inventoryNumber: inventoryNumber.trim(),
							deviceType,
							chamberVolumeLiters: Number(chamberVolumeLiters) || 22,
							locationRu: locationRu.trim(),
							lastMaintenanceDate,
							nextMaintenanceDate,
							notes: notes.trim(),
						}
					: d,
			);
			showToast("Данные автоклава успешно обновлены", "success");
		} else {
			const newDev: ClinicAutoclaveDevice = {
				id: `AUTO-${String(devices.length + 1).padStart(2, "0")}`,
				brandModelRu: brandModelRu.trim(),
				serialNumber: serialNumber.trim(),
				inventoryNumber: inventoryNumber.trim(),
				deviceType,
				chamberVolumeLiters: Number(chamberVolumeLiters) || 22,
				locationRu: locationRu.trim(),
				lastMaintenanceDate,
				nextMaintenanceDate,
				isOperational: true,
				notes: notes.trim(),
			};
			updated = [...devices, newDev];
			showToast("Новый автоклав успешно зарегистрирован в реестре клиники", "success");
		}

		setDevices(updated);
		saveClinicAutoclaves(updated);
		onDevicesUpdated?.(updated);
		setIsEditing(false);
	};

	const handleDeleteDevice = async (id: string) => {
		const target = devices.find((d) => d.id === id);
		if (!target) return;

		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			if (!id.startsWith("AUTO-") && !id.startsWith("local-")) {
				await fetch(`/api/registers/sterilizers/equipments/${id}`, {
					method: "DELETE",
					headers: {
						...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
						...(staffToken ? { "X-Staff-Token": staffToken } : {}),
					},
				}).catch(() => null);
			}
		} catch (err) {
			console.error("Failed to delete server sterilizer", err);
		}

		const updated = devices.filter((d) => d.id !== id);
		setDevices(updated);
		saveClinicAutoclaves(updated);
		onDevicesUpdated?.(updated);
		showToast(`Автоклав «${target.brandModelRu}» удален из списка оборудования`, "info");
	};

	return (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true" data-testid="autoclave-equipment-modal">
			<div className="sanpin-modal" style={{ maxWidth: "780px" }}>
				<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem" }}>
					<h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
						<ShieldCheck size={22} color="var(--brand-primary, #2563eb)" />
						<span>Парк стерилизаторов клиники (СанПиН 3.3686-21)</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							minWidth: "44px",
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
					>
						<X size={20} />
					</button>
				</div>

				<div className="sanpin-modal-body" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "75vh", overflowY: "auto" }}>
					{!isEditing ? (
						<>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
								<div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
									Зарегистрировано аппаратов: <strong>{devices.length}</strong>
								</div>
								<button
									type="button"
									onClick={handleStartAdd}
									className="sanpin-btn sanpin-btn-primary"
									style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
									data-testid="add-autoclave-btn"
								>
									<Plus size={16} /> Добавить аппарат
								</button>
							</div>

							{devices.length === 0 ? (
								<div style={{ padding: "2rem 1rem", textAlign: "center", background: "var(--paper-soft, #f8fafc)", borderRadius: "12px", border: "1px dashed var(--line, #cbd5e1)" }}>
									<ShieldCheck size={42} color="var(--brand-primary, #2563eb)" style={{ margin: "0 auto 0.5rem" }} />
									<p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>В клинике не зарегистрировано автоклавов</p>
									<p style={{ margin: "0 0 1rem", fontSize: "0.825rem", color: "var(--muted)", maxWidth: "460px", marginLeft: "auto", marginRight: "auto" }}>
										Зарегистрируйте автоклав или сухожаровой шкаф клиники для автоматического ведения журнала контроля работы стерилизаторов (Форма № 257/у) и печати этикеток крафт-пакетов.
									</p>
									<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
										<button
											type="button"
											onClick={handleStartAdd}
											className="sanpin-btn sanpin-btn-primary"
											style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
											data-testid="add-first-autoclave-dialog-btn"
										>
											<Plus size={16} /> + Зарегистрировать автоклав клиники
										</button>
										<div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
											Быстрое добавление популярного аппарата (1 клик):
										</div>
										<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", maxWidth: "600px" }}>
											{POPULAR_STERILIZER_BRAND_PRESETS.slice(0, 6).map((preset) => (
												<button
													key={preset.id}
													type="button"
													onClick={() => {
														setIsEditing(true);
														setEditId(null);
														handleApplyPreset(preset);
														setSerialNumber("");
														setInventoryNumber(`ИНВ-ЦСО-${String(devices.length + 1).padStart(3, "0")}`);
														setLocationRu("Центральное стерилизационное отделение (ЦСО)");
														setLastMaintenanceDate(new Date().toISOString().slice(0, 10));
														setNextMaintenanceDate(new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));
														setNotes(preset.descriptionRu);
													}}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
													title={`Заполнить форму моделью: ${preset.brandModel}`}
												>
													<Sparkles size={12} color="var(--brand-primary)" />
													<span>{preset.brandModel}</span>
													<span style={{ opacity: 0.75, fontSize: "0.7rem" }}>({preset.chamberVolumeLiters} л)</span>
												</button>
											))}
										</div>
									</div>
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
									{devices.map((dev) => (
										<div
											key={dev.id}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "0.75rem",
												padding: "0.75rem 1rem",
												background: "var(--paper-soft, #f8fafc)",
												border: "1px solid var(--line, #e2e8f0)",
												borderRadius: "8px",
											}}
										>
											<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1, minWidth: 0 }}>
												<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
													<strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>{dev.brandModelRu}</strong>
													<span style={{ fontSize: "0.75rem", fontFamily: "monospace", padding: "0.1rem 0.4rem", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", borderRadius: "4px", fontWeight: 700 }}>
														{dev.id}
													</span>
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Зав. №{dev.serialNumber}
													</span>
												</div>
												<div style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
													<span>Объем: <strong>{dev.chamberVolumeLiters} л</strong></span>
													<span>Поверка до: <strong style={{ color: "#059669" }}>{dev.nextMaintenanceDate}</strong></span>
													<span>{dev.locationRu}</span>
												</div>
											</div>

											<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
												<button
													type="button"
													onClick={() => handleStartEdit(dev)}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "32px", height: "32px", width: "32px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
													title="Редактировать параметры автоклава"
												>
													<Edit2 size={14} />
												</button>
												<button
													type="button"
													onClick={() => handleDeleteDevice(dev.id)}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "32px", height: "32px", width: "32px", padding: 0, color: "#ef4444", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
													title="Удалить аппарат"
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					) : (
						<form onSubmit={handleSaveDevice} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem" }}>
								<strong style={{ fontSize: "0.95rem" }}>
									{editId ? "Редактирование параметров автоклава" : "Регистрация нового автоклава в ЦСО"}
								</strong>
								<button
									type="button"
									onClick={() => setIsEditing(false)}
									style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", textDecoration: "underline" }}
								>
									Назад к списку
								</button>
							</div>

							{/* Presets Chips Bar */}
							{!editId && (
								<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", padding: "0.5rem", background: "var(--paper-soft, #f8fafc)", borderRadius: "6px", border: "1px solid var(--line, #e2e8f0)" }}>
									<span style={{ fontSize: "0.75rem", fontWeight: 700, width: "100%", color: "var(--ink, #0f172a)" }}>
										Популярные марки (1 клик):
									</span>
									{POPULAR_STERILIZER_BRAND_PRESETS.map((p) => {
										const isSel = selectedPresetId === p.id;
										return (
											<button
												key={p.id}
												type="button"
												onClick={() => handleApplyPreset(p)}
												className="sanpin-btn touch-manipulation"
												style={{
													fontSize: "0.75rem",
													padding: "0.2rem 0.55rem",
													borderRadius: "4px",
													background: isSel ? "var(--teal-600, #0d9488)" : "var(--paper, #ffffff)",
													color: isSel ? "#ffffff" : "var(--ink, #0f172a)",
													border: `1px solid ${isSel ? "var(--teal-600, #0d9488)" : "var(--line, #cbd5e1)"}`,
													fontWeight: isSel ? 700 : 500,
												}}
											>
												{p.brandModel} ({p.chamberVolumeLiters} л)
											</button>
										);
									})}
								</div>
							)}

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Марка и модель автоклава / сухожара *</label>
								<input
									type="text"
									required
									value={brandModelRu}
									onChange={(e) => {
										setBrandModelRu(e.target.value);
										setSelectedPresetId(null);
									}}
									className="sanpin-input"
									style={{ minHeight: "40px" }}
									placeholder="например: Melag Vacuklav 23 B+ (Германия)"
								/>
							</div>

							<div className="sanpin-form-row">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Заводской (серийный) номер *</label>
									<input
										type="text"
										required
										value={serialNumber}
										onChange={(e) => setSerialNumber(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "40px" }}
										placeholder="MEL-2024-9812"
									/>
								</div>
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Инвентарный номер клиники</label>
									<input
										type="text"
										value={inventoryNumber}
										onChange={(e) => setInventoryNumber(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "40px" }}
										placeholder="ИНВ-ЦСО-001"
									/>
								</div>
							</div>

							<div className="sanpin-form-row">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Тип аппарата (СанПиН 3.3686-21)</label>
									<select
										value={deviceType}
										onChange={(e) => setDeviceType(e.target.value as any)}
										className="sanpin-select"
										style={{ minHeight: "40px" }}
									>
										<option value="autoclave_class_b">Паровой автоклав (Класс B — фракц. вакуум)</option>
										<option value="autoclave_class_s">Паровой автоклав (Класс S)</option>
										<option value="autoclave_class_n">Паровой автоклав (Класс N — гравитационный)</option>
										<option value="dry_heat_air">Сухожаровой воздушный стерилизатор (180°C)</option>
									</select>
								</div>
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Объем камеры (литров)</label>
									<input
										type="number"
										min={0.5}
										max={500}
										step={0.5}
										value={chamberVolumeLiters}
										onChange={(e) => setChamberVolumeLiters(Number(e.target.value))}
										className="sanpin-input"
										style={{ minHeight: "40px" }}
									/>
								</div>
							</div>

							<div className="sanpin-form-row">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Дата последнего ТО / поверки</label>
									<input
										type="date"
										value={lastMaintenanceDate}
										onChange={(e) => setLastMaintenanceDate(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "40px" }}
									/>
								</div>
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Плановая дата следующего ТО</label>
									<input
										type="date"
										value={nextMaintenanceDate}
										onChange={(e) => setNextMaintenanceDate(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "40px" }}
									/>
								</div>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Местоположение / Кабинет</label>
								<input
									type="text"
									value={locationRu}
									onChange={(e) => setLocationRu(e.target.value)}
									className="sanpin-input"
									style={{ minHeight: "40px" }}
									placeholder="Центральное стерилизационное отделение (ЦСО)"
								/>
							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.5rem" }}>
								<button
									type="button"
									onClick={() => setIsEditing(false)}
									className="sanpin-btn sanpin-btn-secondary"
									style={{ minHeight: "44px", padding: "0.5rem 1.25rem" }}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="sanpin-btn sanpin-btn-primary"
									style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontWeight: 700 }}
								>
									{editId ? "Сохранить изменения" : "Зарегистрировать автоклав"}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
