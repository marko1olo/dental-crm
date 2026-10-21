import { ShieldAlert, Syringe } from "lucide-react";
import { AnesthesiaAllergyPassiveBadges } from "./AnesthesiaAllergyPassiveBadges";
import { PRIMARY_TECHNIQUES } from "./anesthesiaTechniqueOptions";
import type { InjectionTechniqueId } from "./types";

export interface AnesthesiaHeaderRowProps {
	readonly disabled?: boolean | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly patientWeightKg: number;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isCardioRisk: boolean;
	readonly techniqueId: InjectionTechniqueId;
	readonly onSelectTechnique: (id: InjectionTechniqueId) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
}

export function AnesthesiaHeaderRow({
	disabled,
	targetToothNumberFdi,
	patientWeightKg,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isCardioRisk,
	techniqueId,
	onSelectTechnique,
	onOpenEmergencyProtocol,
}: AnesthesiaHeaderRowProps) {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line)]">
			<div className="flex items-center gap-2 flex-wrap min-w-0">
				<span className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)] shrink-0">
					<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
					<span>Местная анестезия</span>
				</span>
				{targetToothNumberFdi && (
					<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
						Зуб {targetToothNumberFdi}
					</span>
				)}
				<span
					className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
					title="Стандартный взрослый вес для расчёта безопасной дозировки"
				>
					{`МДД по массе тела ${patientWeightKg} кг`}
				</span>
				<AnesthesiaAllergyPassiveBadges
					hasLidocaineAllergy={hasLidocaineAllergy}
					hasArticaineAllergy={hasArticaineAllergy}
					hasSulfiteAllergy={hasSulfiteAllergy}
					hasBronchialAsthma={hasBronchialAsthma}
					isCardioRisk={isCardioRisk}
				/>
			</div>

			<fieldset
				className="flex items-center gap-1 text-[11px] shrink-0 border-0 p-0 m-0"
				aria-label="Метод анестезии"
			>
				<span className="font-semibold text-[var(--muted)] mr-0.5">Метод:</span>
				{PRIMARY_TECHNIQUES.map((tech) => {
					const isSelected = techniqueId === tech.id;
					return (
						<button
							key={tech.id}
							type="button"
							disabled={disabled}
							onClick={() => onSelectTechnique(tech.id)}
							className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
								isSelected
									? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title={tech.titleRu}
						>
							{tech.labelRu}
						</button>
					);
				})}
				{onOpenEmergencyProtocol && (
					<button
						type="button"
						disabled={disabled}
						onClick={onOpenEmergencyProtocol}
						className="ml-1 px-2.5 py-1 min-h-[48px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
						title="Экстренная укладка «Антишок» и протокол неотложной помощи"
						data-testid="btn-anesthesia-quick-emergency"
					>
						<ShieldAlert size={13} className="shrink-0" />
						<span>Аптечка</span>
					</button>
				)}
			</fieldset>
		</div>
	);
}
