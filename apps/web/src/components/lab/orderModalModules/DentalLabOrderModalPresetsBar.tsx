import React from "react";
import { Bookmark } from "lucide-react";
import { MODAL_EXPRESS_LAB_PRESETS, type ExpressLabPreset } from "../dentalLabModalPresets";

export interface DentalLabOrderModalPresetsBarProps {
	readonly onSelectPreset: (preset: ExpressLabPreset) => void;
	readonly activePresetId?: string | null | undefined;
	readonly selectedMaterial?: string | undefined;
	readonly selectedConstruction?: string | undefined;
}

/**
 * Быстрые шаблоны наряд-заказов ЗТЛ — нейтральные капсулы пресетов без визуального шума (Мандаты 8b, 8e: <= 120 строк).
 */
export function DentalLabOrderModalPresetsBar({
	onSelectPreset,
	activePresetId,
	selectedMaterial,
	selectedConstruction,
}: DentalLabOrderModalPresetsBarProps) {
	const defaultActiveId = React.useMemo(() => {
		if (activePresetId) return activePresetId;
		if (selectedMaterial && selectedConstruction) {
			const match = MODAL_EXPRESS_LAB_PRESETS.find(
				(p) => p.materialId === selectedMaterial && p.constructionType === selectedConstruction,
			);
			return match ? match.id : null;
		}
		return null;
	}, [activePresetId, selectedMaterial, selectedConstruction]);

	const [clickedId, setClickedId] = React.useState<string | null>(null);
	const activeId = clickedId ?? defaultActiveId;

	return (
		<div className="flex flex-col gap-2 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] w-full">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Bookmark size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Быстрые шаблоны ортопедии:</span>
				</span>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					18 готовых конфигураций
				</span>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				{MODAL_EXPRESS_LAB_PRESETS.map((preset) => {
					const isSelected = activeId === preset.id;

					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => {
								setClickedId(preset.id);
								onSelectPreset(preset);
							}}
							aria-pressed={isSelected}
							className={`dente-btn-pill min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 py-1 rounded-full border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
								isSelected
									? "is-active border-[var(--teal,#0d9488)] bg-teal-500/10 text-teal-800 dark:text-teal-200 font-semibold ring-1 ring-[var(--teal,#0d9488)]"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:border-[var(--line-strong)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`lab-preset-btn-${preset.id}`}
						>
							{isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />}
							<span>{preset.badge || preset.title}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
