import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type PopularSterilizerBrandPreset,
	type SterilizerDeviceClass,
	type SterilizationDeviceType,
} from "@dental/shared";
import { Gauge, Layers, Sparkles } from "lucide-react";
import React from "react";
import type { SterilizerFormData } from "./types";

export interface SterilizerPassportCardProps {
	formData: SterilizerFormData;
	onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
	selectedPresetId: string | null;
	onApplyPreset: (preset: PopularSterilizerBrandPreset) => void;
	isEditing: boolean;
}

export function SterilizerPassportCard({
	formData,
	onFieldChange,
	selectedPresetId,
	onApplyPreset,
	isEditing,
}: SterilizerPassportCardProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
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
						<span
							style={{
								fontSize: "0.8rem",
								fontWeight: 700,
								color: "var(--ink, #0f172a)",
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
							}}
						>
							<Sparkles size={14} color="#0d9488" /> Выберите популярную марку или введите вручную:
						</span>
						<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>Типовой профиль EN 13060</span>
					</div>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
						{POPULAR_STERILIZER_BRAND_PRESETS.map((p) => {
							const isSelected = selectedPresetId === p.id;
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => onApplyPreset(p)}
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
					<label
						htmlFor="sterilizer-name-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Наименование аппарата в клинике <span style={{ color: "#ef4444" }}>*</span>
					</label>
					<input
						id="sterilizer-name-input"
						type="text"
						value={formData.name}
						onChange={(e) => onFieldChange("name", e.target.value)}
						placeholder="Например: Автоклав Melag Vacuklav 23 B+ (№1)"
						required
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontWeight: 600 }}
					/>
				</div>

				{/* Brand & Model */}
				<div>
					<label
						htmlFor="sterilizer-brand-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Марка и модель аппарата <span style={{ color: "#ef4444" }}>*</span>
					</label>
					<input
						id="sterilizer-brand-input"
						type="text"
						value={formData.brandModel}
						onChange={(e) => onFieldChange("brandModel", e.target.value)}
						placeholder="Melag Vacuklav 23 B+"
						required
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Serial Number */}
				<div>
					<label
						htmlFor="sterilizer-serial-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Заводской серийный № (SN) <span style={{ color: "#ef4444" }}>*</span>
					</label>
					<input
						id="sterilizer-serial-input"
						type="text"
						value={formData.serialNumber}
						onChange={(e) => onFieldChange("serialNumber", e.target.value)}
						placeholder="MEL-2024-88412"
						required
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontFamily: "monospace" }}
					/>
				</div>

				{/* Inventory Number */}
				<div>
					<label
						htmlFor="sterilizer-inventory-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Инвентарный № клиники
					</label>
					<input
						id="sterilizer-inventory-input"
						type="text"
						value={formData.inventoryNumber}
						onChange={(e) => onFieldChange("inventoryNumber", e.target.value)}
						placeholder="ИНВ-00142"
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontFamily: "monospace" }}
					/>
				</div>

				{/* Device Type */}
				<div>
					<label
						htmlFor="sterilizer-devicetype-select"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Тип стерилизации
					</label>
					<select
						id="sterilizer-devicetype-select"
						value={formData.deviceType}
						onChange={(e) => onFieldChange("deviceType", e.target.value as SterilizationDeviceType)}
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
					<label
						htmlFor="sterilizer-deviceclass-select"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Класс аппарата (стандарт EN 13060)
					</label>
					<select
						id="sterilizer-deviceclass-select"
						value={formData.deviceClass}
						onChange={(e) => onFieldChange("deviceClass", e.target.value as SterilizerDeviceClass)}
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
					<label
						htmlFor="sterilizer-chamber-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Объем камеры (литров) <span style={{ color: "#ef4444" }}>*</span>
					</label>
					<input
						id="sterilizer-chamber-input"
						type="number"
						step="0.5"
						min="0.5"
						max="500"
						value={formData.chamberVolumeLiters}
						onChange={(e) => onFieldChange("chamberVolumeLiters", Number(e.target.value))}
						required
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Location Room */}
				<div>
					<label
						htmlFor="sterilizer-room-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Кабинет / Помещение размещения <span style={{ color: "#ef4444" }}>*</span>
					</label>
					<input
						id="sterilizer-room-input"
						type="text"
						value={formData.locationRoom}
						onChange={(e) => onFieldChange("locationRoom", e.target.value)}
						placeholder="ЦСО (Стерилизационная)"
						required
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Commissioning Date */}
				<div>
					<label
						htmlFor="sterilizer-commissioning-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Дата ввода в эксплуатацию
					</label>
					<input
						id="sterilizer-commissioning-input"
						type="date"
						value={formData.commissioningDate}
						onChange={(e) => onFieldChange("commissioningDate", e.target.value)}
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>
			</div>
		</div>
	);
}
