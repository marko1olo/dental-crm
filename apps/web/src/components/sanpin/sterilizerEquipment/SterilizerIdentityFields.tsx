import React from "react";
import type { SterilizerFormData } from "./types.js";

export interface SterilizerIdentityFieldsProps {
	readonly formData: SterilizerFormData;
	readonly onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
}

export function SterilizerIdentityFields({
	formData,
	onFieldChange,
}: SterilizerIdentityFieldsProps) {
	return (
		<>
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
		</>
	);
}
