import React from "react";
import type { ImplantCapType, ImplantConsumablesStock } from "../presets/implantPresetTypes";
import { ImplantConsumablesSelector } from "../ImplantConsumablesSelector";

export interface ImplantCapAndGbrSelectorProps {
	readonly capType: ImplantCapType;
	readonly setCapType: (c: ImplantCapType) => void;
	readonly isGbrPerformed: boolean;
	readonly setIsGbrPerformed: (g: boolean) => void;
	readonly stockConsumables?: ImplantConsumablesStock | undefined;
	readonly selectedGraftId?: string | undefined;
	readonly onSelectGraftId?: ((id: string) => void) | undefined;
	readonly selectedMembraneId?: string | undefined;
	readonly onSelectMembraneId?: ((id: string) => void) | undefined;
	readonly selectedSutureId?: string | undefined;
	readonly onSelectSutureId?: ((id: string) => void) | undefined;
}

export const ImplantCapAndGbrSelector: React.FC<ImplantCapAndGbrSelectorProps> = ({
	capType,
	setCapType,
	isGbrPerformed,
	setIsGbrPerformed,
	stockConsumables,
	selectedGraftId,
	onSelectGraftId,
	selectedMembraneId,
	onSelectMembraneId,
	selectedSutureId,
	onSelectSutureId,
}) => {
	return (
		<div className="space-y-3">
			<div className="implant-form-row">
				<label className="implant-label">Тип ушивания / колпачка:</label>
				<div className="flex items-center gap-2 flex-1">
					<button
						type="button"
						onClick={() => setCapType("fdm")}
						className={`secondary-button flex-1 min-h-[48px] px-3 text-xs font-bold ${
							capType === "fdm" ? "active bg-[var(--teal,#0d9488)] text-white" : ""
						}`}
						data-testid="btn-cap-type-fdm"
					>
						ФДМ (формирователь десны)
					</button>
					<button
						type="button"
						onClick={() => setCapType("plug")}
						className={`secondary-button flex-1 min-h-[48px] px-3 text-xs font-bold ${
							capType === "plug" ? "active bg-[var(--teal,#0d9488)] text-white" : ""
						}`}
						data-testid="btn-cap-type-plug"
					>
						Винт-заглушка (ушивание наглухо)
					</button>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={isGbrPerformed}
						onChange={(e) => setIsGbrPerformed(e.target.checked)}
						className="rounded"
						data-testid="cb-gbr-performed"
					/>
					<span>Костная пластика (НКР / аугментация костным графтом и мембраной)</span>
				</label>

				{isGbrPerformed && stockConsumables && (
					<ImplantConsumablesSelector
						stockConsumables={stockConsumables}
						isGbrPerformed={isGbrPerformed}
						selectedGraftId={selectedGraftId}
						onSelectGraftId={onSelectGraftId || (() => {})}
						selectedMembraneId={selectedMembraneId}
						onSelectMembraneId={onSelectMembraneId || (() => {})}
						selectedSutureId={selectedSutureId}
						onSelectSutureId={onSelectSutureId || (() => {})}
					/>
				)}
			</div>
		</div>
	);
};
