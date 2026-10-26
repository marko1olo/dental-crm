import React from "react";
import { Activity, Sparkles } from "lucide-react";
import type { MedicalCardForm043uData } from "../../emr043Types";
import type { calculateDmftIndex, calculateCpitnIndex } from "../../emr043Math";
import { toothStatusCodeShortMap, dentalBiteTypeLabels } from "@dental/shared";

export interface Form043OdontogramTabProps {
	formData: MedicalCardForm043uData;
	dmft: ReturnType<typeof calculateDmftIndex>;
	cpitn: ReturnType<typeof calculateCpitnIndex>;
	onApplyNorm: () => void;
}

const renderTeethCells = (teeth: MedicalCardForm043uData["dentalStatus"]["odontogramTeeth"]) => {
	return teeth.map((t) => {
		const isPath = t.statusCode !== "healthy" && t.statusCode !== "filled_satisfactory";
		const isFilled = t.statusCode === "filled_satisfactory";
		const shortCode = (t.statusCode && t.statusCode in toothStatusCodeShortMap
			? toothStatusCodeShortMap[t.statusCode as keyof typeof toothStatusCodeShortMap]
			: null) || "Norm";
		return (
			<div key={t.toothNumber} className={`emr043-tooth-cell ${isPath ? "pathology" : isFilled ? "filled" : ""}`}>
				<div style={{ fontWeight: "bold" }}>{t.toothNumber}</div>
				<div style={{ fontSize: "10px", marginTop: "2px" }}>{shortCode}</div>
			</div>
		);
	});
};

export const Form043OdontogramTab: React.FC<Form043OdontogramTabProps> = React.memo(
	function Form043OdontogramTab({ formData, dmft, cpitn, onApplyNorm }) {
		const d = formData.dentalStatus;
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Activity className="w-4 h-4 text-sky-600" />
							3. Стоматологический статус, зубная формула FDI и клинические индексы
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-043-status-norm"
							className="emr043-btn emr043-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
							title="Зафиксировать физиологическую норму слизистой оболочки и прикуса"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							<span>Норма статуса</span>
						</button>
					</div>

					<div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>Зубная формула постоянного прикуса (FDI 11–48):</div>
					<div className="emr043-formula-matrix">{renderTeethCells(d.odontogramTeeth.slice(0, 16))}</div>
					<div className="emr043-formula-matrix">{renderTeethCells(d.odontogramTeeth.slice(16, 32))}</div>

					<div className="emr043-grid-3" style={{ marginTop: "16px" }}>
						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Индекс интенсивности КПУ(з):</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)" }}>КПУ = {dmft.totalDmft}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								К = {dmft.decayed}, П = {dmft.filled}, У = {dmft.missing}<br />
								Уровень: <strong>{dmft.intensityLevelLabel}</strong>
							</div>
						</div>

						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Пародонтальный статус (CPITN):</div>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>{cpitn.treatmentNeedLabel}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{cpitn.treatmentRecommendations}</div>
						</div>

						<div className="emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Индекс гигиены и прикус:</div>
							<div style={{ fontSize: "13px", fontWeight: 600 }}>{d.hygieneIndexOhiS.ratingText}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Прикус: {dentalBiteTypeLabels[d.biteType] || d.biteDescription}
							</div>
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr043-field-label">Состояние СОПР, лимфоузлов и ВНЧС:</div>
						<div className="emr043-field-value">
							Слизистая: {d.oralMucosaStatus.color === "pale_pink_normal" ? "бледно-розовая, умеренно влажная" : "гиперемирована"}. Язык: {d.oralMucosaStatus.tongueStatus}. Лимфоузлы: {d.oralMucosaStatus.regionalLymphNodes}. ВНЧС: {d.oralMucosaStatus.tmjFunction}.
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr043-field-label">Рентгенологическое обследование:</div>
						<div className="emr043-field-value">
							{d.xrayFindingsDescription}
							{d.xrayRadiationDoseMsv ? ` (Лучевая нагрузка: ${d.xrayRadiationDoseMsv} мЗв)` : ""}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const RecordOdontogramTab = Form043OdontogramTab;
