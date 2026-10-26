/**
 * forms/medicalCard/AnamnesisOralStatusSection.tsx
 * Oral mucosa, periodontium and occlusion assessment (Mandate 8b <= 120 lines, Mandate 8x)
 */

import React from "react";
import { type DentalBiteType, dentalBiteTypeLabels, type OralMucosaStatus } from "@dental/shared";
import { BLEEDING_PBI_OPTIONS, GINGIVAL_PAPILLAE_OPTIONS, ORAL_MUCOSA_COLORS, ORAL_MUCOSA_MOISTURE } from "./anamnesisConstants";
import type { DentalMedicalCardAnamnesisTabProps } from "./medicalCardAnamnesisTypes";

export const AnamnesisOralStatusSection: React.FC<DentalMedicalCardAnamnesisTabProps> = ({
	biteType,
	setBiteType,
	biteDescription,
	setBiteDescription,
	oralMucosa,
	setOralMucosa,
	effectiveDisabled,
}) => {
	return (
		<>
			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Прикус и Окклюзия
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Вид прикуса
					<select value={biteType} onChange={(e) => setBiteType(e.target.value as DentalBiteType)} disabled={effectiveDisabled}>
						{Object.entries(dentalBiteTypeLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
					</select>
				</label>
				<label>
					Описание смыкания и окклюзии
					<input type="text" value={biteDescription} onChange={(e) => setBiteDescription(e.target.value)} placeholder="Смыкание моляров по I классу, перекрытие на 1/3..." disabled={effectiveDisabled} />
				</label>
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Состояние слизистой оболочки рта (СОПР) и Пародонта
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Цвет слизистой оболочки
					<select value={oralMucosa.color} onChange={(e) => setOralMucosa((prev) => ({ ...prev, color: e.target.value as OralMucosaStatus["color"] }))} disabled={effectiveDisabled}>
						{ORAL_MUCOSA_COLORS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
					</select>
				</label>
				<label>
					Увлажненность слизистой
					<select value={oralMucosa.moisture} onChange={(e) => setOralMucosa((prev) => ({ ...prev, moisture: e.target.value as OralMucosaStatus["moisture"] }))} disabled={effectiveDisabled}>
						{ORAL_MUCOSA_MOISTURE.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
					</select>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Десневые сосочки и десневой край
					<select value={oralMucosa.gingivalPapillae} onChange={(e) => setOralMucosa((prev) => ({ ...prev, gingivalPapillae: e.target.value as OralMucosaStatus["gingivalPapillae"] }))} disabled={effectiveDisabled}>
						{GINGIVAL_PAPILLAE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
					</select>
				</label>
				<label>
					Кровоточивость десен (индекс PBI)
					<select value={oralMucosa.bleedingPBI} onChange={(e) => setOralMucosa((prev) => ({ ...prev, bleedingPBI: e.target.value as OralMucosaStatus["bleedingPBI"] }))} disabled={effectiveDisabled}>
						{BLEEDING_PBI_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
					</select>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Состояние языка
					<input type="text" value={oralMucosa.tongueStatus} onChange={(e) => setOralMucosa((prev) => ({ ...prev, tongueStatus: e.target.value }))} disabled={effectiveDisabled} />
				</label>
				<label>
					Патологические элементы (афты, язвы, эрозии)
					<input type="text" value={oralMucosa.pathologicalElements ?? ""} onChange={(e) => setOralMucosa((prev) => ({ ...prev, pathologicalElements: e.target.value || null }))} placeholder="Отсутствуют / Афты на слизистой щеки..." disabled={effectiveDisabled} />
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Регионарные лимфатические узлы
					<input type="text" value={oralMucosa.regionalLymphNodes} onChange={(e) => setOralMucosa((prev) => ({ ...prev, regionalLymphNodes: e.target.value }))} disabled={effectiveDisabled} />
				</label>
				<label>
					Функция височно-нижнечелюстного сустава (ВНЧС)
					<input type="text" value={oralMucosa.tmjFunction} onChange={(e) => setOralMucosa((prev) => ({ ...prev, tmjFunction: e.target.value }))} disabled={effectiveDisabled} />
				</label>
			</div>
		</>
	);
};
