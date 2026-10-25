import type React from "react";
import {
	type CompositeMaterialBrand,
	type AdhesiveSystemBrand,
	COMPOSITE_MATERIALS_CATALOG,
	ADHESIVE_SYSTEMS_CATALOG,
} from "@dental/shared";

interface TherapyDetailsAccordionProps {
	showDetailsAccordion: boolean; isAnterior: boolean;
	selectedComposite: CompositeMaterialBrand; onSelectComposite: (c: CompositeMaterialBrand) => void;
	selectedAdhesive: AdhesiveSystemBrand; onSelectAdhesive: (a: AdhesiveSystemBrand) => void;
	shadeDentin: string; onChangeShadeDentin: (s: string) => void;
	shadeEnamel: string; onChangeShadeEnamel: (s: string) => void;
}

const COMPOSITES = ["filtek_ultimate", "estelite_asteria", "harmonize", "sdr_plus_flow", "beautifil_flow"] as const;
const ADHESIVES = ["optibond_fl", "single_bond_2", "clearfil_se_bond", "optibond_universal"] as const;

export const TherapyDetailsAccordion: React.FC<TherapyDetailsAccordionProps> = ({
	showDetailsAccordion, isAnterior, selectedComposite, onSelectComposite,
	selectedAdhesive, onSelectAdhesive, shadeDentin, onChangeShadeDentin, shadeEnamel, onChangeShadeEnamel,
}) => {
	if (!showDetailsAccordion) return null;

	return (
		<div className="mb-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3.5 animate-fadeIn">
			<div>
				<label className="mb-1 block text-xs font-medium text-[var(--ink)]">Композитный материал:</label>
				<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
					{COMPOSITES.map((matId) => {
						const info = COMPOSITE_MATERIALS_CATALOG[matId];
						const isSelected = selectedComposite === matId;
						return (
							<button
								key={matId}
								type="button"
								onClick={() => onSelectComposite(matId)}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition truncate cursor-pointer ${
									isSelected
										? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200"
										: "border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								title={info.indicationRu}
							>
								{info.tradeNameRu}
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<label className="mb-1 block text-xs font-medium text-[var(--ink)]">Адгезивная система:</label>
				<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
					{ADHESIVES.map((adhId) => {
						const info = ADHESIVE_SYSTEMS_CATALOG[adhId];
						const isSelected = selectedAdhesive === adhId;
						return (
							<button
								key={adhId}
								type="button"
								onClick={() => onSelectAdhesive(adhId)}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition truncate cursor-pointer ${
									isSelected
										? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200"
										: "border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								title={info.protocolSummaryRu}
							>
								{info.tradeNameRu}
							</button>
						);
					})}
				</div>
			</div>

			{isAnterior && (
				<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
					<div>
						<label className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Оттенок дентина:</label>
						<select
							value={shadeDentin}
							onChange={(e) => onChangeShadeDentin(e.target.value)}
							className="min-h-[44px] w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 text-xs text-[var(--ink)]"
						>
							<option value="A1B">A1 Body</option>
							<option value="A2B">A2 Body</option>
							<option value="A3B">A3 Body</option>
							<option value="A3.5B">A3.5 Body</option>
							<option value="OA2">OA2 Opaque</option>
							<option value="OA3">OA3 Opaque</option>
						</select>
					</div>
					<div>
						<label className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Оттенок эмали:</label>
						<select
							value={shadeEnamel}
							onChange={(e) => onChangeShadeEnamel(e.target.value)}
							className="min-h-[44px] w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 text-xs text-[var(--ink)]"
						>
							<option value="A1E">A1 Enamel</option>
							<option value="A2E">A2 Enamel</option>
							<option value="A3E">A3 Enamel</option>
							<option value="NE">NE (Natural Enamel)</option>
							<option value="WE">WE (White Enamel)</option>
						</select>
					</div>
				</div>
			)}
		</div>
	);
};
