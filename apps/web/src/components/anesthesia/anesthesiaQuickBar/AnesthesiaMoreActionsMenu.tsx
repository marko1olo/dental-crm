import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DentalSyringe } from '../../icons/DentalIcons';
import type { AnestheticDrugId } from '../anesthesiaCatalog';

export interface AnesthesiaMoreActionsMenuProps {
	disabled: boolean;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
	onApplyCarpules: (count: number, bypassCheck?: boolean, overrideDrugId?: AnestheticDrugId) => void;
	onApplySeptanestInfiltration?: () => void;
	onNurseSeptanestDisposal?: () => void;
	onNursePacketDisposal?: () => void;
}

export function AnesthesiaMoreActionsMenu({
	disabled,
	onSelectDrug,
	onApplyCarpules,
	onApplySeptanestInfiltration,
}: AnesthesiaMoreActionsMenuProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	return (
		<div className="relative">
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsMoreMenuOpen((prev) => !prev)}
				className="secondary-button inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:h-9 sm:w-9 sm:min-w-[36px] rounded-lg bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
				title="Дополнительные клинические пресеты"
				aria-label="Дополнительные пресеты"
				aria-expanded={isMoreMenuOpen}
			>
				<MoreHorizontal size={18} />
			</button>
			{isMoreMenuOpen && (
				<div className="absolute left-0 bottom-full mb-1.5 w-72 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl p-1.5 z-30 flex flex-col gap-1">
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setIsMoreMenuOpen(false);
							onSelectDrug('articaine_1_100k');
							onApplyCarpules(1.0, false, 'articaine_1_100k');
						}}
						className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-surface)] transition-colors cursor-pointer"
						data-testid="anesthesia-dose-1carp-articaine-100k"
					>
						<DentalSyringe size={14} className="text-emerald-500 shrink-0" />
						<span>1 карп. Артикаин 1:100k (1.7 мл)</span>
					</button>
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setIsMoreMenuOpen(false);
							onApplySeptanestInfiltration?.();
						}}
						className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-surface)] transition-colors cursor-pointer"
						data-testid="anesthesia-preset-infiltration-septanest"
					>
						<DentalSyringe size={14} className="text-cyan-500 shrink-0" />
						<span>Инфильтрация 1.7 мл (Септанест)</span>
					</button>
				</div>
			)}
		</div>
	);
}
