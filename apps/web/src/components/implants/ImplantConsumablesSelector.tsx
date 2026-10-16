import React from "react";
import { BoneGraft } from "../icons/DentalIcons";
import type { ImplantConsumablesStock } from "./implantQuickPresets";

export interface ImplantConsumablesSelectorProps {
	readonly isGbrPerformed: boolean;
	readonly stockConsumables: ImplantConsumablesStock;
	readonly selectedGraftId?: string | undefined;
	readonly onSelectGraftId?: ((id: string) => void) | undefined;
	readonly selectedMembraneId?: string | undefined;
	readonly onSelectMembraneId?: ((id: string) => void) | undefined;
	readonly selectedSutureId?: string | undefined;
	readonly onSelectSutureId?: ((id: string) => void) | undefined;
}


/**
 * Секция расходных материалов направленной костной регенерации (НКР) / костной пластики.
 * Автоматически рассчитывает себестоимость и списывает материалы со склада при подтверждении протокола.
 */
export const ImplantConsumablesSelector: React.FC<ImplantConsumablesSelectorProps> = ({
	isGbrPerformed,
	stockConsumables,
	selectedGraftId,
	onSelectGraftId,
	selectedMembraneId,
	onSelectMembraneId,
	selectedSutureId,
	onSelectSutureId,
}) => {
	if (!isGbrPerformed) return null;

	return (
		<div
			className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--brand-primary,#0ea5e9)] flex flex-col gap-2.5"
			data-testid="gbr-consumables-block"
		>
			<div className="text-xs font-black uppercase text-[var(--brand-primary,#0ea5e9)] tracking-wider flex items-center gap-1.5">
				<BoneGraft size={16} />
				<span>Хирургические расходники НКР (автосписание со склада):</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				{/* Костный графт */}
				<div className="flex flex-col gap-1">
					<label htmlFor="select-graft-material" className="text-[11px] font-bold text-[var(--ink)]">
						Костный графт (Geistlich):
					</label>
					<select
						id="select-graft-material"
						value={selectedGraftId ?? stockConsumables.grafts[0]?.id ?? ""}
						onChange={(e) => onSelectGraftId?.(e.target.value)}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] cursor-pointer"
						data-testid="select-graft-material"
					>
						{stockConsumables.grafts.map((g) => (
							<option key={g.id} value={g.id}>
								{g.name} ({g.unitCostRub} ₽)
							</option>
						))}
					</select>
				</div>

				{/* Коллагеновая мембрана */}
				<div className="flex flex-col gap-1">
					<label htmlFor="select-membrane-material" className="text-[11px] font-bold text-[var(--ink)]">
						Барьерная мембрана:
					</label>
					<select
						id="select-membrane-material"
						value={selectedMembraneId ?? stockConsumables.membranes[0]?.id ?? ""}
						onChange={(e) => onSelectMembraneId?.(e.target.value)}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] cursor-pointer"
						data-testid="select-membrane-material"
					>
						{stockConsumables.membranes.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name} ({m.unitCostRub} ₽)
							</option>
						))}
					</select>
				</div>

				{/* Шовный материал */}
				<div className="flex flex-col gap-1">
					<label htmlFor="select-suture-material" className="text-[11px] font-bold text-[var(--ink)]">
						Шовный материал:
					</label>
					<select
						id="select-suture-material"
						value={selectedSutureId ?? stockConsumables.sutures[0]?.id ?? ""}
						onChange={(e) => onSelectSutureId?.(e.target.value)}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] cursor-pointer"
						data-testid="select-suture-material"
					>
						{stockConsumables.sutures.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name} ({s.unitCostRub} ₽)
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
