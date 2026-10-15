import React from "react";
import { UserCheck } from "lucide-react";
import type { TreatmentPlanDoctorOption, TreatmentPlanStage } from "./types";

export interface TreatmentPlanStageDoctorSelectorProps {
	readonly stage: TreatmentPlanStage;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignStageDoctor?: ((stage: TreatmentPlanStage, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
}

export const TreatmentPlanStageDoctorSelector: React.FC<TreatmentPlanStageDoctorSelectorProps> = ({
	stage,
	doctors,
	onAssignStageDoctor,
}) => {
	return (
		<div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
			{stage.doctorName ? (
				<span
					className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 whitespace-nowrap shadow-2xs"
					data-testid={`stage-${stage.stageNumber}-doctor-badge`}
					title={`Врач этапа: ${stage.doctorName}${stage.doctorSpecialty ? ` (${stage.doctorSpecialty})` : ""}`}
				>
					<UserCheck size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span>{stage.doctorName}</span>
					{stage.doctorSpecialty && <span className="text-[10px] opacity-75 hidden sm:inline">· {stage.doctorSpecialty}</span>}
					{onAssignStageDoctor && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); onAssignStageDoctor(stage, null, null, null); }}
							className="ml-0.5 text-[10px] text-indigo-400 hover:text-rose-600 cursor-pointer p-0.5"
							title="Снять назначение врача с этапа"
							data-testid={`clear-stage-doctor-btn-${stage.stageNumber}`}
						>
							×
						</button>
					)}
				</span>
			) : onAssignStageDoctor && doctors && doctors.length > 0 ? (
				<select
					value=""
					onChange={(e) => {
						const docId = e.target.value;
						if (!docId) return;
						const found = doctors.find((d) => d.id === docId);
						onAssignStageDoctor(stage, docId, found?.fullName || "Врач-стоматолог", found?.specialty || (found?.role === "doctor" ? "Стоматолог" : found?.role) || null);
					}}
					className="h-6 text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-full px-2 py-0 cursor-pointer focus:outline-hidden transition-colors"
					title="Назначить специалиста на все процедуры этапа"
					data-testid={`assign-stage-doctor-select-${stage.stageNumber}`}
				>
					<option value="">+ Врач этапа</option>
					{doctors.map((doc) => (
						<option key={doc.id} value={doc.id}>
							{doc.fullName} {doc.specialty ? `(${doc.specialty})` : ""}
						</option>
					))}
				</select>
			) : null}
		</div>
	);
};
