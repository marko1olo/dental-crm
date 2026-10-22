import React from "react";
import { Check, FileText, Syringe } from "lucide-react";
import { STANDARD_ANESTHETICS } from "./types";
import type { ClinicalMaterialDeduction } from "../../visit/clinicalSoapPresets";

export interface ProtocolTreatmentAndAnesthesiaSectionProps {
	readonly treatmentProtocol: string;
	readonly deductedMaterials: ClinicalMaterialDeduction[];
	readonly onChangeTreatmentProtocol: (val: string) => void;
	readonly onApplyAnesthesia: (anes: (typeof STANDARD_ANESTHETICS)[number]) => void;
}

export const ProtocolTreatmentAndAnesthesiaSection: React.FC<ProtocolTreatmentAndAnesthesiaSectionProps> = ({
	treatmentProtocol,
	deductedMaterials,
	onChangeTreatmentProtocol,
	onApplyAnesthesia,
}) => {
	return (
		<>
			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<FileText className="w-3.5 h-3.5 text-teal-600" />
					<span>Протокол лечения и манипуляций (План и факт вмешательства):</span>
				</label>
				<textarea
					rows={4}
					value={treatmentProtocol}
					onChange={(e) => onChangeTreatmentProtocol(e.target.value)}
					className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y font-mono"
					placeholder="Препарирование, медикаментозная обработка, пломбировочный материал, полировка..."
				/>
			</div>

			<div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)]">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5">
						<Syringe className="w-4 h-4 text-teal-500" />
						<span className="text-xs font-bold text-[var(--ink)]">Анестезия и списание материалов:</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						{STANDARD_ANESTHETICS.map((anes) => (
							<button
								key={anes.key}
								type="button"
								onClick={() => onApplyAnesthesia(anes)}
								className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer transition-all min-h-[36px] inline-flex items-center gap-1"
							>
								{anes.key === "ultracain_ds_forte"
									? "✓ Норма: Артикаин 1:100 000"
									: anes.key === "ultracain_ds"
									? "Щадящий: Артикаин 1:200 000"
									: "Кардио: Мепивакаин"}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{deductedMaterials.map((mat, idx) => (
						<span key={idx} className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex items-center gap-1">
							<Check className="w-3 h-3 text-emerald-500" />
							<span>{mat.name}</span>
							<strong className="text-teal-600">({mat.quantity} {mat.unit})</strong>
						</span>
					))}
				</div>
			</div>
		</>
	);
};
