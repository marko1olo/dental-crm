/**
 * apps/web/src/components/emr/record/tabs/RecordOdontogramTab.tsx
 *
 * Зубная формула, клинические индексы (КПУ, CPITN) и стоматологический статус DENTE CRM.
 * Мандаты 8e (Автономия врача), 8x/8ap (Чистый живой доменный язык).
 */

import React from "react";
import { Activity, Sparkles } from "lucide-react";
import type { MedicalRecordData } from "../../types/recordDataTypes";
import type { calculateDmftIndex, calculateCpitnIndex } from "../../clinicalDiaryMath";
import { dentalBiteTypeLabels } from "@dental/shared";
import { AnatomicalGate0FullArchView } from "../../../odontogram/AnatomicalGate0FullArchView";
import type { ToothData, ToothState } from "../../../odontogram/ToothChart";

export interface RecordOdontogramTabProps {
	formData: MedicalRecordData;
	dmft: ReturnType<typeof calculateDmftIndex>;
	cpitn: ReturnType<typeof calculateCpitnIndex>;
	onApplyNorm: () => void;
}

export type Form043OdontogramTabProps = RecordOdontogramTabProps;

export const RecordOdontogramTab: React.FC<RecordOdontogramTabProps> = React.memo(
	function RecordOdontogramTab({ formData, dmft, cpitn, onApplyNorm }) {
		const d = formData.dentalStatus;

		const teethData: ToothData[] = React.useMemo(() => {
			const codeMap: Record<string, ToothState> = {
				healthy: "Healthy",
				caries: "Caries",
				pulpitis: "Pulpitis",
				periodontitis: "Periodontitis",
				filled_satisfactory: "Filled",
				filled_defective: "Filled",
				crown: "Crown",
				artificial_crown: "Crown",
				extracted_absent: "Missing",
				missing: "Missing",
				implant: "Implant",
				root: "Radix",
				radix: "Radix",
			};
			return (d.odontogramTeeth || []).map((t) => ({
				toothNumber: t.toothNumber,
				state: (codeMap[t.statusCode] || "Healthy") as ToothState,
				surfaces: (t.surfaces || []).map((s) => {
					if (s === "occlusal") return "Occ";
					if (s === "vestibular") return "V";
					if (s === "lingual") return "L";
					if (s === "medial") return "M";
					if (s === "distal") return "D";
					return String(s);
				}),
			}));
		}, [d.odontogramTeeth]);

		return (
			<div>
				<div className="emr-studio-card emr043-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr-studio-card-title emr043-section-card-title flex items-center gap-2" style={{ margin: 0 }}>
							<Activity className="w-4 h-4 text-sky-600" />
							<span>3. Стоматологический статус, зубная формула FDI и клинические индексы</span>
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-043-status-norm"
							className="emr-studio-btn emr043-btn emr-studio-btn-secondary emr043-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
							title="Зафиксировать физиологическую норму слизистой оболочки и прикуса"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							<span>Норма статуса</span>
						</button>
					</div>

					<div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
						Зубная формула постоянного прикуса (FDI 11–48) · Wheeler 2.5D:
					</div>
					<div className="w-full bg-[var(--paper-strong,#f8fafc)] dark:bg-[var(--paper-subtle,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-2xl p-2 sm:p-4 my-2 overflow-x-auto flex justify-center">
						<AnatomicalGate0FullArchView
							teethData={teethData}
							zoom={0.44}
						/>
					</div>

					<div className="emr043-grid-3" style={{ marginTop: "16px" }}>
						<div className="emr-studio-card emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Индекс интенсивности КПУ(з):</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)" }}>КПУ = {dmft.totalDmft}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								К = {dmft.decayed}, П = {dmft.filled}, У = {dmft.missing}<br />
								Уровень: <strong>{dmft.intensityLevelLabel}</strong>
							</div>
						</div>

						<div className="emr-studio-card emr043-section-card" style={{ padding: "12px" }}>
							<div className="emr043-field-label">Пародонтальный статус (CPITN):</div>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>{cpitn.treatmentNeedLabel}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{cpitn.treatmentRecommendations}</div>
						</div>

						<div className="emr-studio-card emr043-section-card" style={{ padding: "12px" }}>
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

export const Form043OdontogramTab = RecordOdontogramTab;
