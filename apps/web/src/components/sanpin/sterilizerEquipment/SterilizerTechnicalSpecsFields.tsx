import type { SterilizerDeviceClass, SterilizationDeviceType } from "@dental/shared";
import React from "react";
import type { SterilizerFormData } from "./types.js";

export interface SterilizerTechnicalSpecsFieldsProps {
	readonly formData: SterilizerFormData;
	readonly onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" };
const inputStyle: React.CSSProperties = { width: "100%", height: "38px", fontSize: "0.85rem" };

export function SterilizerTechnicalSpecsFields({ formData, onFieldChange }: SterilizerTechnicalSpecsFieldsProps) {
	return (
		<>
			<div>
				<label htmlFor="sterilizer-devicetype-select" style={labelStyle}>Тип стерилизации</label>
				<select
					id="sterilizer-devicetype-select" value={formData.deviceType}
					onChange={(e) => onFieldChange("deviceType", e.target.value as SterilizationDeviceType)}
					className="sanpin-select" style={inputStyle}
				>
					<option value="autoclave_steam">Паровой автоклав (водяной пар под давлением)</option>
					<option value="dry_heat">Воздушный сухожаровой шкаф (горячий воздух)</option>
					<option value="plasma">Плазменный стерилизатор (низкотемпературный)</option>
					<option value="gas_eo">Газовый стерилизатор (этиленоксидный)</option>
				</select>
			</div>

			<div>
				<label htmlFor="sterilizer-deviceclass-select" style={labelStyle}>Класс аппарата (стандарт EN 13060)</label>
				<select
					id="sterilizer-deviceclass-select" value={formData.deviceClass}
					onChange={(e) => onFieldChange("deviceClass", e.target.value as SterilizerDeviceClass)}
					className="sanpin-select" style={inputStyle}
				>
					<option value="autoclave_class_b">Класс B (фракционированный вакуум / полые изделия)</option>
					<option value="autoclave_class_s">Класс S (стоматологические наконечники)</option>
					<option value="autoclave_class_n">Класс N (неупакованные сплошные изделия)</option>
					<option value="dry_heat_air">Воздушный сухожар (180°C / 60 мин)</option>
					<option value="plasma">Плазменный класс</option>
				</select>
			</div>

			<div>
				<label htmlFor="sterilizer-chamber-input" style={labelStyle}>
					Объем камеры (литров) <span style={{ color: "#ef4444" }}>*</span>
				</label>
				<input
					id="sterilizer-chamber-input" type="number" step="0.5" min="0.5" max="500"
					value={formData.chamberVolumeLiters} onChange={(e) => onFieldChange("chamberVolumeLiters", Number(e.target.value))}
					required className="sanpin-input" style={inputStyle}
				/>
			</div>

			<div>
				<label htmlFor="sterilizer-room-input" style={labelStyle}>
					Кабинет / Помещение размещения <span style={{ color: "#ef4444" }}>*</span>
				</label>
				<input
					id="sterilizer-room-input" type="text" value={formData.locationRoom}
					onChange={(e) => onFieldChange("locationRoom", e.target.value)}
					placeholder="ЦСО (Стерилизационная)" required className="sanpin-input" style={inputStyle}
				/>
			</div>

			<div>
				<label htmlFor="sterilizer-commissioning-input" style={labelStyle}>Дата ввода в эксплуатацию</label>
				<input
					id="sterilizer-commissioning-input" type="date" value={formData.commissioningDate}
					onChange={(e) => onFieldChange("commissioningDate", e.target.value)}
					className="sanpin-input" style={inputStyle}
				/>
			</div>
		</>
	);
}
