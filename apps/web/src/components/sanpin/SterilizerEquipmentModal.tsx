import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type CreateSterilizerEquipmentDto,
	type PopularSterilizerBrandPreset,
	type SterilizerDeviceClass,
	type SterilizerEquipment,
	type SterilizerEquipmentStatus,
	type SterilizationDeviceType,
	type UpdateSterilizerEquipmentDto,
} from "@dental/shared";
import {
	AlertTriangle,
	Archive,
	Calendar,
	CheckCircle2,
	Clock,
	Flame,
	Gauge,
	HelpCircle,
	Info,
	Layers,
	Plus,
	RotateCcw,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	Wrench,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export interface SterilizerEquipmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	editingEquipment?: SterilizerEquipment | null;
}

export function SterilizerEquipmentModal({
	isOpen,
	onClose,
	onSuccess,
	editingEquipment = null,
}: SterilizerEquipmentModalProps) {
	const isEditing = Boolean(editingEquipment);

	// Form state
	const [name, setName] = useState("");
	const [brandModel, setBrandModel] = useState("");
	const [serialNumber, setSerialNumber] = useState("");
	const [inventoryNumber, setInventoryNumber] = useState("");
	const [deviceType, setDeviceType] = useState<SterilizationDeviceType>("autoclave_steam");
	const [deviceClass, setDeviceClass] = useState<SterilizerDeviceClass>("autoclave_class_b");
	const [chamberVolumeLiters, setChamberVolumeLiters] = useState<number>(22);
	const [locationRoom, setLocationRoom] = useState("ЦСО (Стерилизационная)");
	const [verificationExpiryDate, setVerificationExpiryDate] = useState("");
	const [lastMaintenanceDate, setLastMaintenanceDate] = useState("");
	const [nextMaintenanceDate, setNextMaintenanceDate] = useState("");
	const [commissioningDate, setCommissioningDate] = useState("");
	const [status, setStatus] = useState<SterilizerEquipmentStatus>("active");
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Selected preset id for highlighting
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	// Initialize form on open / edit change
	useEffect(() => {
		if (editingEquipment) {
			setName(editingEquipment.name);
			setBrandModel(editingEquipment.brandModel);
			setSerialNumber(editingEquipment.serialNumber);
			setInventoryNumber(editingEquipment.inventoryNumber || "");
			setDeviceType(editingEquipment.deviceType);
			setDeviceClass(editingEquipment.deviceClass);
			setChamberVolumeLiters(Number(editingEquipment.chamberVolumeLiters) || 22);
			setLocationRoom(editingEquipment.locationRoom || "ЦСО (Стерилизационная)");
			setVerificationExpiryDate(editingEquipment.verificationExpiryDate || "");
			setLastMaintenanceDate(editingEquipment.lastMaintenanceDate || "");
			setNextMaintenanceDate(editingEquipment.nextMaintenanceDate || "");
			setCommissioningDate(editingEquipment.commissioningDate || "");
			setStatus(editingEquipment.status || "active");
			setNotes(editingEquipment.notes || "");
			setSelectedPresetId(null);
		} else {
			// Defaults for new equipment
			const today = new Date();
			const todayStr = today.toISOString().slice(0, 10);
			const nextYear = new Date(today);
			nextYear.setFullYear(nextYear.getFullYear() + 1);
			const nextYearStr = nextYear.toISOString().slice(0, 10);

			const next6Months = new Date(today);
			next6Months.setMonth(next6Months.getMonth() + 6);
			const next6MonthsStr = next6Months.toISOString().slice(0, 10);

			// Default preset: Melag Vacuklav 23B+
			const defaultPreset = POPULAR_STERILIZER_BRAND_PRESETS[0]!;
			setName(defaultPreset.recommendedNameRu);
			setBrandModel(defaultPreset.brandModel);
			setSerialNumber("");
			setInventoryNumber("");
			setDeviceType(defaultPreset.deviceType);
			setDeviceClass(defaultPreset.deviceClass);
			setChamberVolumeLiters(defaultPreset.chamberVolumeLiters);
			setLocationRoom("ЦСО (Стерилизационная)");
			setVerificationExpiryDate(nextYearStr);
			setLastMaintenanceDate(todayStr);
			setNextMaintenanceDate(next6MonthsStr);
			setCommissioningDate(todayStr);
			setStatus("active");
			setNotes("");
			setSelectedPresetId(defaultPreset.id);
		}
	}, [editingEquipment, isOpen]);

	if (!isOpen) return null;

	const handleApplyPreset = (preset: PopularSterilizerBrandPreset) => {
		setSelectedPresetId(preset.id);
		setBrandModel(preset.brandModel);
		setName(preset.recommendedNameRu);
		setDeviceType(preset.deviceType);
		setDeviceClass(preset.deviceClass);
		setChamberVolumeLiters(preset.chamberVolumeLiters);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			showToast("Укажите наименование аппарата в клинике", "warning");
			return;
		}
		if (!brandModel.trim()) {
			showToast("Укажите марку/модель аппарата", "warning");
			return;
		}
		if (!serialNumber.trim()) {
			showToast("Укажите заводской серийный номер аппарата", "warning");
			return;
		}
		if (chamberVolumeLiters <= 0) {
			showToast("Объем камеры должен быть больше 0 литров", "warning");
			return;
		}

		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			if (isEditing && editingEquipment) {
				const updatePayload: UpdateSterilizerEquipmentDto = {
					name: name.trim(),
					brandModel: brandModel.trim(),
					serialNumber: serialNumber.trim(),
					inventoryNumber: inventoryNumber.trim() || null,
					deviceType,
					deviceClass,
					chamberVolumeLiters: Number(chamberVolumeLiters),
					locationRoom: locationRoom.trim(),
					verificationExpiryDate: verificationExpiryDate || null,
					lastMaintenanceDate: lastMaintenanceDate || null,
					nextMaintenanceDate: nextMaintenanceDate || null,
					commissioningDate: commissioningDate || null,
					status,
					notes: notes.trim() || null,
				};

				const res = await fetch(`/api/registers/sterilizers/equipments/${editingEquipment.id}`, {
					method: "PUT",
					headers,
					body: JSON.stringify(updatePayload),
				});

				if (res.ok) {
					showToast(`Данные аппарата «${name}» успешно обновлены`, "success");
					if (onSuccess) onSuccess();
					onClose();
				} else {
					const err = await res.json().catch(() => ({}));
					showToast(err.message || "Ошибка обновления аппарата", "error");
				}
			} else {
				const createPayload: CreateSterilizerEquipmentDto = {
					name: name.trim(),
					brandModel: brandModel.trim(),
					serialNumber: serialNumber.trim(),
					inventoryNumber: inventoryNumber.trim() || null,
					deviceType,
					deviceClass,
					chamberVolumeLiters: Number(chamberVolumeLiters),
					locationRoom: locationRoom.trim(),
					verificationExpiryDate: verificationExpiryDate || null,
					lastMaintenanceDate: lastMaintenanceDate || null,
					nextMaintenanceDate: nextMaintenanceDate || null,
					commissioningDate: commissioningDate || null,
					status,
					notes: notes.trim() || null,
				};

				const res = await fetch("/api/registers/sterilizers/equipments", {
					method: "POST",
					headers,
					body: JSON.stringify(createPayload),
				});

				if (res.ok) {
					showToast(`Аппарат «${name}» успешно поставлен на баланс и учет СанПиН`, "success");
					if (onSuccess) onSuccess();
					onClose();
				} else {
					const err = await res.json().catch(() => ({}));
					showToast(err.message || "Ошибка добавления аппарата", "error");
				}
			}
		} catch (err) {
			console.error("Sterilizer equipment submit error", err);
			showToast("Сетевая ошибка сохранения", "error");
		} finally {
			setSubmitting(false);
		}
	};

	// Quick action: Put in maintenance
	const handleQuickMaintenance = async () => {
		if (!editingEquipment) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${editingEquipment.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: "put_in_maintenance", notes: notes || "Выведен на плановое ТО" }),
			});
			if (res.ok) {
				showToast(`Аппарат переведен в статус «На техобслуживании (ТО)»`, "success");
				if (onSuccess) onSuccess();
				onClose();
			} else {
				showToast("Ошибка изменения статуса", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	// Quick action: Return to service
	const handleQuickReturnToService = async () => {
		if (!editingEquipment) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${editingEquipment.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: "return_to_service" }),
			});
			if (res.ok) {
				showToast(`Аппарат успешно возвращен в строй и допущен к стерилизации`, "success");
				if (onSuccess) onSuccess();
				onClose();
			} else {
				showToast("Ошибка возврата в строй", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	// Quick action: Decommission
	const handleQuickDecommission = async () => {
		if (!editingEquipment) return;
		const reason = window.prompt("Укажите основание списания / вывода из эксплуатации (Акт тех. состояния, износ, замена):", "Акт технической экспертизы и дефектации № ");
		if (reason === null) return;

		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/sterilizers/equipments/${editingEquipment.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: "decommission", decommissionReason: reason }),
			});
			if (res.ok) {
				showToast(`Аппарат списан и выведен из реестра действующих стерилизаторов`, "success");
				if (onSuccess) onSuccess();
				onClose();
			} else {
				showToast("Ошибка списания аппарата", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal" style={{ maxWidth: "780px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
				{/* Header */}
				<div className="sanpin-modal-header" style={{ flexShrink: 0 }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								background: "rgba(13, 148, 136, 0.12)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--teal-600, #0d9488)",
							}}
						>
							<Flame size={20} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								{isEditing ? `Редактирование стерилизатора: ${editingEquipment?.name}` : "Постановка на учет стерилизатора / автоклава"}
							</h3>
							<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Паспорт оборудования, метрологическая поверка и график ТО (СанПиН 3.3686-21)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-btn-icon"
						style={{ minHeight: "36px", minWidth: "36px" }}
						title="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
					{/* Brand Presets Selection Bar (Available during new apparatus creation) */}
					{!isEditing && (
						<div
							style={{
								background: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								padding: "0.75rem",
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
									<Sparkles size={14} color="#0d9488" /> Выберите популярную марку или введите вручную:
								</span>
								<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>1-клик автозаполнение</span>
							</div>

							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
								{POPULAR_STERILIZER_BRAND_PRESETS.map((p) => {
									const isSelected = selectedPresetId === p.id;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => handleApplyPreset(p)}
											className="sanpin-btn touch-manipulation"
											style={{
												minHeight: "34px",
												padding: "0.25rem 0.6rem",
												fontSize: "0.775rem",
												fontWeight: isSelected ? 700 : 500,
												background: isSelected ? "var(--teal-600, #0d9488)" : "var(--paper, #ffffff)",
												color: isSelected ? "#ffffff" : "var(--ink, #0f172a)",
												border: `1px solid ${isSelected ? "var(--teal-600, #0d9488)" : "var(--line, #cbd5e1)"}`,
												borderRadius: "6px",
												cursor: "pointer",
												display: "inline-flex",
												alignItems: "center",
												gap: "0.3rem",
											}}
											title={`${p.descriptionRu} (${p.manufacturerRu})`}
										>
											<span>{p.brandModel}</span>
											<span
												style={{
													fontSize: "0.675rem",
													opacity: 0.85,
													background: isSelected ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)",
													padding: "0.05rem 0.3rem",
													borderRadius: "3px",
												}}
											>
												{p.chamberVolumeLiters} л
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Equipment Form Grid */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
						{/* Name */}
						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Наименование аппарата в клинике <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Например: Автоклав Melag Vacuklav 23 B+ (№1)"
								required
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontWeight: 600 }}
							/>
						</div>

						{/* Brand & Model */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Марка и модель аппарата <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								type="text"
								value={brandModel}
								onChange={(e) => {
									setBrandModel(e.target.value);
									setSelectedPresetId(null);
								}}
								placeholder="Melag Vacuklav 23 B+"
								required
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Serial Number */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Заводской серийный № (SN) <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								type="text"
								value={serialNumber}
								onChange={(e) => setSerialNumber(e.target.value)}
								placeholder="MEL-2024-88412"
								required
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontFamily: "monospace" }}
							/>
						</div>

						{/* Inventory Number */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Инвентарный № клиники
							</label>
							<input
								type="text"
								value={inventoryNumber}
								onChange={(e) => setInventoryNumber(e.target.value)}
								placeholder="ИНВ-00142"
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontFamily: "monospace" }}
							/>
						</div>

						{/* Device Type */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Тип стерилизации
							</label>
							<select
								value={deviceType}
								onChange={(e) => setDeviceType(e.target.value as SterilizationDeviceType)}
								className="sanpin-select"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							>
								<option value="autoclave_steam">Паровой автоклав (водяной пар под давлением)</option>
								<option value="dry_heat">Воздушный сухожаровой шкаф (горячий воздух)</option>
								<option value="plasma">Плазменный стерилизатор (низкотемпературный)</option>
								<option value="gas_eo">Газовый стерилизатор (этиленоксидный)</option>
							</select>
						</div>

						{/* Device Class */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Класс аппарата (EN 13060 / СанПиН)
							</label>
							<select
								value={deviceClass}
								onChange={(e) => setDeviceClass(e.target.value as SterilizerDeviceClass)}
								className="sanpin-select"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							>
								<option value="autoclave_class_b">Класс B (фракционированный вакуум / полые изделия)</option>
								<option value="autoclave_class_s">Класс S (стоматологические наконечники)</option>
								<option value="autoclave_class_n">Класс N (неупакованные сплошные изделия)</option>
								<option value="dry_heat_air">Воздушный сухожар (180°C / 60 мин)</option>
								<option value="plasma">Плазменный класс</option>
							</select>
						</div>

						{/* Chamber Volume */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Объем камеры (литров) <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								type="number"
								step="0.5"
								min="0.5"
								max="500"
								value={chamberVolumeLiters}
								onChange={(e) => setChamberVolumeLiters(Number(e.target.value))}
								required
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Location Room */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Кабинет / Помещение размещения <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								type="text"
								value={locationRoom}
								onChange={(e) => setLocationRoom(e.target.value)}
								placeholder="ЦСО (Стерилизационная)"
								required
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Status */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Текущий рабочий статус
							</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as SterilizerEquipmentStatus)}
								className="sanpin-select"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontWeight: 600 }}
							>
								<option value="active">🟢 В работе (допущен к стерилизации)</option>
								<option value="in_maintenance">🟡 На техобслуживании / Ремонте (ТО)</option>
								<option value="decommissioned">🔴 Списан / Выведен из эксплуатации</option>
							</select>
						</div>

						{/* Verification Expiry Date */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Дата очередной поверки / калибровки
							</label>
							<input
								type="date"
								value={verificationExpiryDate}
								onChange={(e) => setVerificationExpiryDate(e.target.value)}
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Next Maintenance Date */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Дата следующего планового ТО
							</label>
							<input
								type="date"
								value={nextMaintenanceDate}
								onChange={(e) => setNextMaintenanceDate(e.target.value)}
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Commissioning Date */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Дата ввода в эксплуатацию
							</label>
							<input
								type="date"
								value={commissioningDate}
								onChange={(e) => setCommissioningDate(e.target.value)}
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Last Maintenance Date */}
						<div>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Дата последнего проведенного ТО
							</label>
							<input
								type="date"
								value={lastMaintenanceDate}
								onChange={(e) => setLastMaintenanceDate(e.target.value)}
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>

						{/* Notes / Service org */}
						<div style={{ gridColumn: "1 / -1" }}>
							<label style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}>
								Примечания, ответственная сервисная организация, номер договора ТО
							</label>
							<input
								type="text"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="ООО «МедСервисТехника», договор №ТО-2026/04 от 12.01.2026..."
								className="sanpin-input"
								style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
							/>
						</div>
					</div>

					{/* Editing Quick Actions Bar */}
					{isEditing && editingEquipment && (
						<div
							style={{
								marginTop: "0.5rem",
								padding: "0.75rem",
								borderRadius: "8px",
								background: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
							}}
						>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
								Быстрые действия технического статуса:
							</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
								{status === "active" && (
									<button
										type="button"
										onClick={handleQuickMaintenance}
										disabled={submitting}
										className="sanpin-btn sanpin-btn-secondary touch-manipulation"
										style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#d97706" }}
									>
										<Wrench size={14} /> Вывести на техобслуживание (ТО)
									</button>
								)}

								{status === "in_maintenance" && (
									<button
										type="button"
										onClick={handleQuickReturnToService}
										disabled={submitting}
										className="sanpin-btn sanpin-btn-secondary touch-manipulation"
										style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#059669" }}
									>
										<CheckCircle2 size={14} /> Вернуть в строй (ТО завершено)
									</button>
								)}

								{status !== "decommissioned" && (
									<button
										type="button"
										onClick={handleQuickDecommission}
										disabled={submitting}
										className="sanpin-btn sanpin-btn-secondary touch-manipulation"
										style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#dc2626" }}
									>
										<Archive size={14} /> Списать с баланса клиники
									</button>
								)}

								{status === "decommissioned" && (
									<button
										type="button"
										onClick={handleQuickReturnToService}
										disabled={submitting}
										className="sanpin-btn sanpin-btn-secondary touch-manipulation"
										style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#2563eb" }}
									>
										<RotateCcw size={14} /> Восстановить аппарат в строй
									</button>
								)}
							</div>
						</div>
					)}

					{/* Modal Footer */}
					<div
						style={{
							marginTop: "auto",
							paddingTop: "0.75rem",
							borderTop: "1px solid var(--line, #e2e8f0)",
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: "0.5rem",
						}}
					>
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation"
							style={{ minHeight: "40px", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
						>
							Отмена
						</button>

						<button
							type="submit"
							disabled={submitting}
							className="sanpin-btn sanpin-btn-primary touch-manipulation"
							style={{
								minHeight: "40px",
								padding: "0.4rem 1.25rem",
								fontSize: "0.85rem",
								fontWeight: 700,
								background: "var(--teal-600, #0d9488)",
								color: "#ffffff",
								border: "none",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
							}}
						>
							<Save size={15} />
							<span>{isEditing ? "Сохранить изменения" : "Поставить аппарат на учет"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
