import React, { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { DentalSyringe } from '../../icons/DentalIcons';
import type { AnestheticDrugId } from '../anesthesiaCatalog';

export interface AnesthesiaMoreActionsMenuProps {
	disabled: boolean;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
	onApplyCarpules: (count: number, bypassCheck?: boolean, overrideDrugId?: AnestheticDrugId) => void;
	onApplySeptanestInfiltration?: () => void;
	onNurseSeptanestDisposal: () => void;
	onNursePacketDisposal: () => void;
}

export function AnesthesiaMoreActionsMenu({
	disabled,
	onSelectDrug,
	onApplyCarpules,
	onApplySeptanestInfiltration,
	onNurseSeptanestDisposal,
	onNursePacketDisposal,
}: AnesthesiaMoreActionsMenuProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	return (
		<div className="relative">
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsMoreMenuOpen((prev) => !prev)}
				className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
				title="Дополнительные пресеты и списания"
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
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setIsMoreMenuOpen(false);
							onNurseSeptanestDisposal();
						}}
						className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
						data-testid="nurse-quick-septanest-disposal"
					>
						<Trash2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Списать препарат</span>
					</button>
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setIsMoreMenuOpen(false);
							onNursePacketDisposal();
						}}
						className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
						data-testid="nurse-quick-packet-disposal"
					>
						<Trash2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Пакет: 1 карп. + игла 30G</span>
					</button>
				</div>
			)}
		</div>
	);
}
