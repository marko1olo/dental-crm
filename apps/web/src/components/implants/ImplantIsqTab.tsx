import React from "react";
import { DentalImplant } from "../icons/DentalIcons";
import type { MischDensity } from "./implantQuickPresets";
import { ImplantIsqControls } from "./isq/ImplantIsqControls";
import { ImplantIsqInterpretation } from "./isq/ImplantIsqInterpretation";

export interface ImplantIsqTabProps {
	readonly torqueNcm: number;
	readonly isqValue: number;
	readonly setIsqValue: (val: number) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (val: boolean) => void;
	readonly boneDensity: MischDensity;
}

export const ImplantIsqTab: React.FC<ImplantIsqTabProps> = ({
	torqueNcm,
	isqValue,
	setIsqValue,
	isIsqEnabled,
	setIsIsqEnabled,
	boneDensity,
}) => {
	return (
		<div className="space-y-4" data-testid="tab-content-isq">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-3 bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] rounded-xl shrink-0">
						<DentalImplant size={24} />
					</div>
					<div className="min-w-0">
						<div className="text-sm font-black text-[var(--ink)] truncate">
							{isIsqEnabled ? "RFA магнитно-резонансная стабилометрия" : "Механический контроль торка ключом"}
						</div>
						<div className="text-xs text-[var(--muted)] truncate">
							Первичная стабильность: {torqueNcm} Н·см · {torqueNcm >= 35 ? "Высокая (оптимум 35 Н·см)" : "Стандартная"}
							{isIsqEnabled ? ` · ISQ День 0: ${isqValue} (${isqValue >= 70 ? "Высокая" : isqValue >= 60 ? "Стандартная" : "Низкая"})` : ""}
						</div>
					</div>
				</div>
				<div className="text-right shrink-0">
					<div className="text-xl font-black font-mono text-[var(--teal,#0d9488)]">
						{torqueNcm} Н·см
					</div>
					{isIsqEnabled && (
						<div className="text-xs font-bold text-[var(--muted)]">
							{isqValue} ISQ
						</div>
					)}
				</div>
			</div>

			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<ImplantIsqControls
					isqValue={isqValue}
					setIsqValue={setIsqValue}
					isIsqEnabled={isIsqEnabled}
					setIsIsqEnabled={setIsIsqEnabled}
				/>
				<ImplantIsqInterpretation
					isqValue={isqValue}
					torqueNcm={torqueNcm}
					boneDensity={boneDensity}
				/>
			</div>
		</div>
	);
};
