import React from "react";
import { Layers } from "lucide-react";
import type { StatutoryAnestheticDrug, LocalAnesthesiaType } from "../emrProtocolEngine";
import { statutoryAnestheticDrugLabels } from "../emrProtocolEngine";
import type { EmrEndoStage } from "./types";
import { EmrProtocolEndoSection } from "./EmrProtocolEndoSection";

export interface EmrProtocolInterventionDetailsProps {
	readonly isEndo: boolean;
	readonly selectedCanals: number;
	readonly onChangeCanals: (canals: number) => void;
	readonly selectedEndoStage: EmrEndoStage;
	readonly onChangeEndoStage: (stage: EmrEndoStage) => void;
	readonly selectedAnesthesiaDrug: StatutoryAnestheticDrug;
	readonly onChangeAnesthesiaDrug: (drug: StatutoryAnestheticDrug) => void;
	readonly selectedAnesthesiaTechnique: LocalAnesthesiaType;
	readonly onChangeAnesthesiaTechnique: (tech: LocalAnesthesiaType) => void;
	readonly selectedAnesthesiaDoseMl: number;
	readonly onChangeAnesthesiaDoseMl: (dose: number) => void;
	readonly doctorNameInput: string;
	readonly onChangeDoctorName: (name: string) => void;
	readonly doctorSpecialtyInput: string;
	readonly onChangeDoctorSpecialty: (spec: string) => void;
	readonly nonHealthyTeethCount?: number;
	readonly onBatchSynthesize?: () => void;
}

export const EmrProtocolInterventionDetails: React.FC<EmrProtocolInterventionDetailsProps> = React.memo(
	function EmrProtocolInterventionDetails(props) {
		const {
			isEndo, selectedCanals, onChangeCanals, selectedEndoStage, onChangeEndoStage,
			selectedAnesthesiaDrug, onChangeAnesthesiaDrug, selectedAnesthesiaTechnique,
			onChangeAnesthesiaTechnique, selectedAnesthesiaDoseMl, onChangeAnesthesiaDoseMl,
			doctorNameInput, onChangeDoctorName, doctorSpecialtyInput, onChangeDoctorSpecialty,
			nonHealthyTeethCount = 0, onBatchSynthesize,
		} = props;

		return (
			<div className="space-y-3">
				{isEndo && (
					<EmrProtocolEndoSection
						selectedCanals={selectedCanals} onChangeCanals={onChangeCanals}
						selectedEndoStage={selectedEndoStage} onChangeEndoStage={onChangeEndoStage}
					/>
				)}

				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
						3. Местная анестезия и протокол врача
					</label>
					<select
						value={selectedAnesthesiaDrug}
						onChange={(e) => onChangeAnesthesiaDrug(e.target.value as StatutoryAnestheticDrug)}
						className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium cursor-pointer"
					>
						{(Object.entries(statutoryAnestheticDrugLabels) as [StatutoryAnestheticDrug, { name: string; activeSubstance: string }][]).map(([k, it]) => (
							<option key={k} value={k}>{it.name} ({it.activeSubstance})</option>
						))}
					</select>
					<div className="grid grid-cols-2 gap-2">
						<select
							value={selectedAnesthesiaTechnique}
							onChange={(e) => onChangeAnesthesiaTechnique(e.target.value as LocalAnesthesiaType)}
							className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-medium cursor-pointer"
						>
							<option value="infiltration">Инфильтрационная</option>
							<option value="mandibular">Мандибулярная</option>
							<option value="torus">Торусальная</option>
							<option value="tuberal">Туберальная</option>
							<option value="intraligamentary">Интралигаментарная</option>
							<option value="application">Аппликационная</option>
						</select>
						<select
							value={selectedAnesthesiaDoseMl}
							onChange={(e) => onChangeAnesthesiaDoseMl(parseFloat(e.target.value) || 1.7)}
							className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold cursor-pointer"
						>
							<option value={1.7}>1.7 мл (1 карпула)</option>
							<option value={3.4}>3.4 мл (2 карпулы)</option>
							<option value={0.8}>0.8 мл (0.5 карпулы)</option>
						</select>
					</div>
					<div className="grid grid-cols-2 gap-2 pt-0.5">
						<input
							type="text" value={doctorNameInput} onChange={(e) => onChangeDoctorName(e.target.value)}
							placeholder="ФИО врача"
							className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
						/>
						<input
							type="text" value={doctorSpecialtyInput} onChange={(e) => onChangeDoctorSpecialty(e.target.value)}
							placeholder="Специальность"
							className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
						/>
					</div>
				</div>

				{nonHealthyTeethCount > 1 && onBatchSynthesize && (
					<button
						type="button" onClick={onBatchSynthesize}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] text-xs font-bold hover:opacity-90 transition-colors cursor-pointer"
					>
						<Layers className="w-4 h-4" />
						<span>Синтезировать дневники по всей формуле ({nonHealthyTeethCount} зубов)</span>
					</button>
				)}
			</div>
		);
	},
);
