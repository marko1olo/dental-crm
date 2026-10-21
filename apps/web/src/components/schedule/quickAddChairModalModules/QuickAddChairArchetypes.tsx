import { Check } from "lucide-react";
import { CHAIR_ARCHETYPE_PRESETS } from "./chairPresets";
import type { ChairArchetypePreset } from "./types";

interface QuickAddChairArchetypesProps {
	selectedArchetypeId: string | null;
	selectedSpecialty: string;
	onSelectArchetype: (preset: ChairArchetypePreset) => void;
}

export function QuickAddChairArchetypes({
	selectedArchetypeId,
	selectedSpecialty,
	onSelectArchetype,
}: QuickAddChairArchetypesProps) {
	return (
		<div className="space-y-1.5">
			<span
				id="quick-add-chair-archetypes-label"
				className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
			>
				Типовые кресла
			</span>
			<div
				className="grid grid-cols-2 sm:grid-cols-3 gap-2"
				role="radiogroup"
				aria-labelledby="quick-add-chair-archetypes-label"
			>
				{CHAIR_ARCHETYPE_PRESETS.map((arch) => {
					const isSelected =
						selectedArchetypeId === arch.id ||
						selectedSpecialty === arch.specialty;
					return (
						<button
							key={arch.id}
							type="button"
							data-testid={`quick-add-chair-archetype-${arch.id}`}
							onClick={() => onSelectArchetype(arch)}
							className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
								isSelected
									? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] shadow-xs"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							role="radio"
							aria-checked={isSelected}
						>
							<div className="flex items-center justify-between w-full">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
									{arch.label}
								</span>
								<div className="flex items-center gap-1">
									<div
										className="w-2.5 h-2.5 rounded-full"
										style={{ backgroundColor: arch.colorHex }}
									/>
									{isSelected && (
										<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									)}
								</div>
							</div>
							<span className="text-[10px] text-[var(--muted,#64748b)] mt-1">
								{arch.description}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
