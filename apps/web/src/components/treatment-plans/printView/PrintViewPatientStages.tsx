import React from "react";
import { Clock } from "lucide-react";
import type { TreatmentPlanStage } from "../types";
import { isMicroConsumable } from "../treatmentPlanConsumables";

export interface PrintViewPatientStagesProps {
	readonly stages: readonly TreatmentPlanStage[];
}

export const PrintViewPatientStages: React.FC<PrintViewPatientStagesProps> = ({ stages }) => {
	return (
		<div className="space-y-4">
			{stages.map((stage) => {
				const cleanItems = stage.items.filter((it) => !isMicroConsumable(it));
				const microCount = stage.items.length - cleanItems.length;

				return (
					<div key={stage.stageNumber} className="patient-stage-card" data-testid={`patient-stage-block-${stage.stageNumber}`}>
						<div className="patient-stage-card-header">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="patient-stage-card-title">{stage.title}</span>
							</div>
							<div className="patient-stage-pill inline-flex items-center gap-2">
								<span className="inline-flex items-center gap-1">
									<Clock size={11} className="shrink-0" />
									<span>Срок: ~{stage.estimatedWeeks} нед.</span>
								</span>
								<span className="opacity-40">•</span>
								<span>Визитов: ~{stage.estimatedVisits}</span>
							</div>
						</div>

						<p className="text-xs text-slate-600 mb-2.5 italic">Цель этапа: {stage.clinicalGoal || stage.subtitle}</p>

						<table className="patient-proc-table">
							<thead>
								<tr>
									<th style={{ width: "45px" }}>Зуб</th>
									<th>Медицинская услуга / комплекс</th>
									<th>Материалы и технологии</th>
									<th style={{ width: "95px", textAlign: "right" }}>Стоимость</th>
								</tr>
							</thead>
							<tbody>
								{cleanItems.map((it, idx) => (
									<tr key={it.id || idx}>
										<td style={{ textAlign: "center" }}>
											{it.toothNumber ? (
												<span className="patient-proc-tooth-badge">{it.toothNumber}</span>
											) : (
												<span className="text-slate-400 text-xs">—</span>
											)}
										</td>
										<td className="font-semibold text-slate-900">{it.name}</td>
										<td className="text-xs text-slate-600">{it.materials || "Стандарт клиники"}</td>
										<td style={{ textAlign: "right", fontWeight: "bold" }}>{it.priceRub.toLocaleString("ru-RU")} ₽</td>
									</tr>
								))}

								{microCount > 0 && (
									<tr className="text-slate-400 italic text-[9pt] bg-slate-50/50">
										<td style={{ textAlign: "center" }}>•</td>
										<td colSpan={2}>Индивидуальный гигиенический и асептический комплект (салфетки, слюноотсос, валики, перчатки — включено)</td>
										<td style={{ textAlign: "right" }}>Включено</td>
									</tr>
								)}
							</tbody>
						</table>

						<div className="patient-stage-total-row">
							<span>Итого по Этапу {stage.stageNumber}:</span>
							<span className="font-mono text-base font-black text-teal-800">{stage.totalRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					</div>
				);
			})}
		</div>
	);
};
