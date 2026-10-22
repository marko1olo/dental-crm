import React from "react";
import { Check, X } from "lucide-react";
import type { RetroactiveDayRecord } from "../retroactiveSanpinEngine.js";

export interface RetroactiveEditingRowProps {
	readonly day: RetroactiveDayRecord;
	readonly idx: number;
	readonly editFormData: Partial<RetroactiveDayRecord>;
	readonly setEditFormData: React.Dispatch<React.SetStateAction<Partial<RetroactiveDayRecord>>>;
	readonly onSaveEditing: (dayId: string) => void;
	readonly onCancelEditing: () => void;
}

export function RetroactiveEditingRow({
	day, idx, editFormData, setEditFormData, onSaveEditing, onCancelEditing,
}: RetroactiveEditingRowProps) {
	const upd = (field: keyof RetroactiveDayRecord, val: any) =>
		setEditFormData((prev) => ({ ...prev, [field]: val }));

	return (
		<tr style={{ background: "rgba(37, 99, 235, 0.06)" }}>
			<td style={{ textAlign: "center" }}>{idx + 1}</td>
			<td>
				<input type="date" value={editFormData.date || day.date} onChange={(e) => upd("date", e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }} />
			</td>
			<td>
				<input type="text" value={editFormData.cabinetsListRu ?? day.cabinetsListRu} onChange={(e) => upd("cabinetsListRu", e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }} />
			</td>
			<td>
				<div style={{ display: "flex", gap: "0.25rem" }}>
					<input type="number" value={editFormData.traysProcessedCount ?? day.traysProcessedCount} onChange={(e) => upd("traysProcessedCount", Number(e.target.value))} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "65px" }} title="Лотков" />
					<input type="number" value={editFormData.visitsCount ?? day.visitsCount} onChange={(e) => upd("visitsCount", Number(e.target.value))} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "65px" }} title="Приемов" />
				</div>
			</td>
			<td>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
					<label style={{ fontSize: "0.75rem" }}>
						Выборка: <input type="number" value={editFormData.psoSampleCount ?? day.psoSampleCount} onChange={(e) => upd("psoSampleCount", Number(e.target.value))} className="sanpin-input" style={{ minHeight: "32px", fontSize: "0.8rem", width: "50px", marginLeft: "4px" }} />
					</label>
					<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.72rem" }}>Азопирам отр.</span>
				</div>
			</td>
			<td>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
					<label style={{ fontSize: "0.75rem" }}>
						Циклов: <input type="number" value={editFormData.autoclaveCyclesCount ?? day.autoclaveCyclesCount} onChange={(e) => upd("autoclaveCyclesCount", Number(e.target.value))} className="sanpin-input" style={{ minHeight: "32px", fontSize: "0.8rem", width: "50px", marginLeft: "4px" }} />
					</label>
					<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>134°C / 5 точек ОК</span>
				</div>
			</td>
			<td>
				<input type="number" step="0.5" value={editFormData.recirculatorOperatingHours ?? day.recirculatorOperatingHours} onChange={(e) => upd("recirculatorOperatingHours", Number(e.target.value))} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "70px" }} />
			</td>
			<td>
				<input type="text" value={editFormData.cleaningTypeRu ?? day.cleaningTypeRu} onChange={(e) => upd("cleaningTypeRu", e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }} />
			</td>
			<td><span className="sanpin-tag sanpin-tag-success"><Check size={12} /> Норма</span></td>
			<td>
				<input type="text" value={editFormData.nurseFullName ?? day.nurseFullName} onChange={(e) => upd("nurseFullName", e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }} />
			</td>
			<td style={{ textAlign: "center" }}>
				<div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
					<button type="button" onClick={() => onSaveEditing(day.id)} className="sanpin-btn sanpin-btn-primary" style={{ minHeight: "32px", padding: "0.25rem 0.5rem" }} title="Сохранить"><Check size={14} /></button>
					<button type="button" onClick={onCancelEditing} className="sanpin-btn sanpin-btn-secondary" style={{ minHeight: "32px", padding: "0.25rem 0.5rem" }} title="Отмена"><X size={14} /></button>
				</div>
			</td>
		</tr>
	);
}
