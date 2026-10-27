import React from "react";
import type { ToothSurface, BlackCavityClass, FdiToothRecord } from "../emrProtocolEngine";
import { blackCavityClassLabels } from "../emrProtocolEngine";
import { ALL_TOOTH_SURFACES } from "../protocolGeneratorPresets";

export interface EmrProtocolToothSurfacesProps {
	readonly targetTooth: string;
	readonly onTargetToothChange: (tooth: string) => void;
	readonly selectedSurfaces: readonly ToothSurface[];
	readonly onToggleSurface: (surface: ToothSurface) => void;
	readonly blackCavityClass: BlackCavityClass;
	readonly isCaries: boolean;
	readonly odontogramTeeth?: readonly FdiToothRecord[] | null | undefined;
	readonly onSelectOdontogramTooth?: ((tooth: FdiToothRecord) => void) | undefined;
}

export const EmrProtocolToothSurfaces: React.FC<EmrProtocolToothSurfacesProps> = React.memo(
	function EmrProtocolToothSurfaces({
		targetTooth,
		onTargetToothChange,
		selectedSurfaces,
		onToggleSurface,
		blackCavityClass,
		isCaries,
		odontogramTeeth,
		onSelectOdontogramTooth,
	}) {
		const nonHealthyTeeth = (odontogramTeeth || []).filter(
			(t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent",
		);

		return (
			<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						2. Зуб FDI и локализация
					</label>
					{isCaries && (
						<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
							{blackCavityClassLabels[blackCavityClass].split(" ")[0]} {blackCavityClassLabels[blackCavityClass].split(" ")[1]}
						</span>
					)}
				</div>

				<div className="space-y-1.5">
					<div className="text-xs text-[var(--muted,#64748b)] font-medium">
						Номер зуба по международной системе FDI (11–48 / 51–85):
					</div>
					<div className="flex items-center gap-2">
						<input
							type="number"
							value={targetTooth}
							min={11}
							max={85}
							onChange={(e) => onTargetToothChange(e.target.value)}
							className="w-24 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
							placeholder="16"
						/>
						{nonHealthyTeeth.length > 0 && (
							<div className="flex-1 overflow-x-auto flex items-center gap-1.5 py-1">
								{nonHealthyTeeth.map((t) => (
									<button
										key={t.toothNumber}
										type="button"
										onClick={() => {
											onTargetToothChange(String(t.toothNumber));
											if (onSelectOdontogramTooth) onSelectOdontogramTooth(t);
										}}
										className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
											targetTooth === String(t.toothNumber)
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))]"
												: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
										}`}
									>
										№ {t.toothNumber}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="space-y-1.5 pt-1">
					<div className="text-xs text-[var(--muted,#64748b)] font-medium">
						Поражённые анатомические поверхности:
					</div>
					<div className="grid grid-cols-5 gap-1.5">
						{ALL_TOOTH_SURFACES.map((surf) => {
							const active = selectedSurfaces.includes(surf.id);
							return (
								<button
									key={surf.id}
									type="button"
									onClick={() => onToggleSurface(surf.id)}
									title={surf.label}
									className={`flex flex-col items-center justify-center p-2 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
										active
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-sm"
											: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
									}`}
								>
									<span className="text-sm">{surf.short}</span>
									<span className="text-[9px] font-normal opacity-80 truncate max-w-full">
										{surf.id.slice(0, 3)}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		);
	},
);
