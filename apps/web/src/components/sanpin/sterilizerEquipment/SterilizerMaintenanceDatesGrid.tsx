import type { SterilizerEquipmentStatus } from "@dental/shared";
import React from "react";
import type { SterilizerFormData } from "./types.js";

export interface SterilizerMaintenanceDatesGridProps {
	readonly formData: SterilizerFormData;
	readonly onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
}

export function SterilizerMaintenanceDatesGrid({
	formData,
	onFieldChange,
}: SterilizerMaintenanceDatesGridProps) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
			<div>
				<label
					htmlFor="sterilizer-status-select"
					style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
				>
					Текущий рабочий статус
				</label>
				<select
					id="sterilizer-status-select"
					value={formData.status}
					onChange={(e) => onFieldChange("status", e.target.value as SterilizerEquipmentStatus)}
					className="sanpin-select"
					style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontWeight: 600 }}
				>
					<option value="active">В работе (допущен к стерилизации)</option>
					<option value="in_maintenance">На техобслуживании / Ремонте (ТО)</option>
					<option value="decommissioned">Списан / Выведен из эксплуатации</option>
				</select>
			</div>

			<div>
				<label
					htmlFor="sterilizer-verification-input"
					style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
				>
					Дата очередной поверки датчиков (ФЗ № 102-ФЗ)
				</label>
				<input
					id="sterilizer-verification-input"
					type="date"
					value={formData.verificationExpiryDate}
					onChange={(e) => onFieldChange("verificationExpiryDate", e.target.value)}
					className="sanpin-input"
					style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
				/>
			</div>

			<div>
				<label
					htmlFor="sterilizer-nextmaint-input"
					style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
				>
					Дата следующего планового ТО
				</label>
				<input
					id="sterilizer-nextmaint-input"
					type="date"
					value={formData.nextMaintenanceDate}
					onChange={(e) => onFieldChange("nextMaintenanceDate", e.target.value)}
					className="sanpin-input"
					style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
				/>
			</div>

			<div>
				<label
					htmlFor="sterilizer-lastmaint-input"
					style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
				>
					Дата последнего проведенного ТО
				</label>
				<input
					id="sterilizer-lastmaint-input"
					type="date"
					value={formData.lastMaintenanceDate}
					onChange={(e) => onFieldChange("lastMaintenanceDate", e.target.value)}
					className="sanpin-input"
					style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
				/>
			</div>

			<div style={{ gridColumn: "1 / -1" }}>
				<label
					htmlFor="sterilizer-notes-input"
					style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
				>
					Сервисная организация, номер договора ТО и примечания
				</label>
				<input
					id="sterilizer-notes-input"
					type="text"
					value={formData.notes}
					onChange={(e) => onFieldChange("notes", e.target.value)}
					placeholder="ООО «МедСервисТехника», договор №ТО-2026/04 от 12.01.2026..."
					className="sanpin-input"
					style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
				/>
			</div>
		</div>
	);
}
