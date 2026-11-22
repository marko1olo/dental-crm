/**
 * apps/web/src/components/emr/record/tabs/RecordOdontogramTab.tsx
 *
 * Зубная формула, клинические индексы (КПУ, CPITN) и стоматологический статус DENTE CRM.
 * Автономия врача, Чистый живой доменный язык.
 */

import React from "react";
import { Activity, Sparkles } from "lucide-react";
import type { MedicalRecordData } from "../../types/recordDataTypes";
import type { calculateDmftIndex, calculateCpitnIndex } from "../../clinicalDiaryMath";
import { dentalBiteTypeLabels } from "@dental/shared";
import { WheelerToothArch } from "../../../odontogram/WheelerToothArch";
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

		const hasPediatricTeeth = React.useMemo(() => {
			return (d.odontogramTeeth || []).some(
				(t) => t.toothNumber >= 51 && t.toothNumber <= 85,
			);
		}, [d.odontogramTeeth]);

		const [dentitionMode, setDentitionMode] = React.useState<
			"adult" | "pediatric" | "mixed"
		>(hasPediatricTeeth ? "pediatric" : "adult");

		React.useEffect(() => {
			if (hasPediatricTeeth && dentitionMode === "adult") {
				setDentitionMode("pediatric");
			}
		}, [hasPediatricTeeth, dentitionMode]);

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
				root: "Root",
				radix: "Root",
			};
			return (d.odontogramTeeth || []).map((t) => ({
				toothNumber: t.toothNumber,
				state: (codeMap[t.statusCode] || "Healthy") as ToothState,
				surfaces: (t.surfaces || []).map((s) => {
					const str = String(s);
					if (str === "occlusal") return "Occ";
					if (str === "vestibular") return "V";
					if (str === "oral" || str === "lingual") return "L";
					if (str === "mesial" || str === "medial") return "M";
					if (str === "distal") return "D";
					return str;
				}),
			}));
		}, [d.odontogramTeeth]);

		return (
			<div>
				<div className="emr-studio-card emr-studio-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr-studio-card-title emr-studio-section-card-title flex items-center gap-2" style={{ margin: 0 }}>
							<Activity className="w-4 h-4 text-sky-600" />
							<span>3. Стоматологический статус, зубная формула FDI и клинические индексы</span>
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-emr-status-norm"
							className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 10px", height: "30px" }}
							title="Зафиксировать физиологическую норму слизистой оболочки и прикуса"
						>
							<Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
							<span>Норма статуса</span>
						</button>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
						<div style={{ fontWeight: 700, fontSize: "13px" }}>
							{dentitionMode === "pediatric"
								? "Зубная формула молочного прикуса (FDI 51–85) · Wheeler 2.5D:"
								: dentitionMode === "mixed"
									? "Зубная формула сменного прикуса (FDI 11–85) · Wheeler 2.5D:"
									: "Зубная формула постоянного прикуса (FDI 11–48) · Wheeler 2.5D:"}
						</div>
						<div
							role="group"
							aria-label="Переключение прикуса"
							className="inline-flex p-1 bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft)] rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] gap-1 text-xs font-medium self-start sm:self-auto"
						>
							<button
								type="button"
								onClick={() => setDentitionMode("adult")}
								className={`px-2.5 py-1 rounded-lg transition-colors ${
									dentitionMode === "adult"
										? "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper)] text-[var(--ink,#0f172a)] dark:text-[var(--ink)] shadow-2xs font-semibold"
										: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Постоянный (11–48)
							</button>
							<button
								type="button"
								onClick={() => setDentitionMode("pediatric")}
								className={`px-2.5 py-1 rounded-lg transition-colors ${
									dentitionMode === "pediatric"
										? "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper)] text-[var(--ink,#0f172a)] dark:text-[var(--ink)] shadow-2xs font-semibold"
										: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Молочный (51–85)
							</button>
							<button
								type="button"
								onClick={() => setDentitionMode("mixed")}
								className={`px-2.5 py-1 rounded-lg transition-colors ${
									dentitionMode === "mixed"
										? "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper)] text-[var(--ink,#0f172a)] dark:text-[var(--ink)] shadow-2xs font-semibold"
										: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								Сменный
							</button>
						</div>
					</div>
					<div className="w-full bg-[var(--paper-strong,#f8fafc)] dark:bg-[var(--paper-subtle,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-2xl p-2 sm:p-4 my-2 overflow-x-auto flex justify-center">
						<WheelerToothArch
							teethData={teethData}
							zoom={0.44}
							mode="interactive"
							dentitionMode={dentitionMode}
							isPediatric={dentitionMode === "pediatric"}
							isMixed={dentitionMode === "mixed"}
						/>
					</div>

					<div className="emr-studio-grid-3" style={{ marginTop: "16px" }}>
						<div className="emr-studio-card emr-studio-section-card" style={{ padding: "12px" }}>
							<div className="emr-studio-field-label">Индекс интенсивности КПУ(з):</div>
							<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)" }}>КПУ = {dmft.totalDmft}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								К = {dmft.decayed}, П = {dmft.filled}, У = {dmft.missing}<br />
								Уровень: <strong>{dmft.intensityLevelLabel}</strong>
							</div>
						</div>

						<div className="emr-studio-card emr-studio-section-card" style={{ padding: "12px" }}>
							<div className="emr-studio-field-label">Пародонтальный статус (CPITN):</div>
							<div style={{ fontSize: "14px", fontWeight: 700 }}>{cpitn.treatmentNeedLabel}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{cpitn.treatmentRecommendations}</div>
						</div>

						<div className="emr-studio-card emr-studio-section-card" style={{ padding: "12px" }}>
							<div className="emr-studio-field-label">Индекс гигиены и прикус:</div>
							<div style={{ fontSize: "13px", fontWeight: 600 }}>{d.hygieneIndexOhiS.ratingText}</div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Прикус: {dentalBiteTypeLabels[d.biteType] || d.biteDescription}
							</div>
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr-studio-field-label">Состояние СОПР, лимфоузлов и ВНЧС:</div>
						<div className="emr-studio-field-value">
							Слизистая: {d.oralMucosaStatus.color === "pale_pink_normal" ? "бледно-розовая, умеренно влажная" : "гиперемирована"}. Язык: {d.oralMucosaStatus.tongueStatus}. Лимфоузлы: {d.oralMucosaStatus.regionalLymphNodes}. ВНЧС: {d.oralMucosaStatus.tmjFunction}.
						</div>
					</div>

					<div style={{ marginTop: "14px" }}>
						<div className="emr-studio-field-label">Рентгенологическое обследование:</div>
						<div className="emr-studio-field-value">
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
