import type React from "react";
import { Sparkles } from "lucide-react";
import {
	type TherapyPresetId,
	type TherapyProtocolPreset,
	THERAPY_PROTOCOL_PRESETS,
} from "@dental/shared";

interface TherapyPresetSelectorProps {
	activePresetId: TherapyPresetId;
	onSelectPreset: (preset: TherapyProtocolPreset) => void;
}

export const TherapyPresetSelector: React.FC<TherapyPresetSelectorProps> = ({
	activePresetId,
	onSelectPreset,
}) => {
	return (
		<div className="mb-4">
			<div className="mb-2 text-xs font-medium text-[var(--ink-muted)]">
				Протоколы лечения у кресла:
			</div>
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
				{THERAPY_PROTOCOL_PRESETS.map((preset) => {
					const isCurrent = activePresetId === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset)}
							className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation ${
								isCurrent
									? "border-[var(--primary)] bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs ring-1 ring-[var(--primary)]"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`therapy-preset-btn-${preset.id}`}
						>
							<div className="flex items-center gap-1.5 font-bold text-xs">
								<Sparkles className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
								<span className="truncate">{preset.shortLabelRu}</span>
							</div>
							<div className="mt-0.5 text-[11px] text-[var(--ink-muted)] truncate">
								{preset.id === "caries_composite"
									? "Тотальное травление + Нанокомпозит"
									: preset.id === "failed_filling_replacement"
										? "Снятие пломбы + Наногибрид"
										: preset.id === "wedge_defect_erosion"
											? "Самопротравливание + Bulk-fill"
											: "Ключ + Анатомическая стратификация"}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
