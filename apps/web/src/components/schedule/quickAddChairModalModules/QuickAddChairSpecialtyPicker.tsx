import { CHAIR_SPECIALTY_PRESETS } from "./chairPresets";

interface QuickAddChairSpecialtyPickerProps {
	selectedSpecialty: string;
	setSelectedSpecialty: (id: string) => void;
}

export function QuickAddChairSpecialtyPicker({
	selectedSpecialty,
	setSelectedSpecialty,
}: QuickAddChairSpecialtyPickerProps) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor="chair-specialty-presets"
				className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1"
			>
				Специализация установки
			</label>
			<div id="chair-specialty-presets" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{CHAIR_SPECIALTY_PRESETS.map((spec) => (
					<button
						key={spec.id}
						type="button"
						data-testid={`quick-add-chair-spec-${spec.id}`}
						onClick={() => setSelectedSpecialty(spec.id)}
						style={{ minHeight: "44px" }}
						className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
							selectedSpecialty === spec.id
								? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] shadow-xs"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)]"
						}`}
					>
						<span className="text-xs font-semibold text-[var(--ink,#0f172a)]">{spec.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
