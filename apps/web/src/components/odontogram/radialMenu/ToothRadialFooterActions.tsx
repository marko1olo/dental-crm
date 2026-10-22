import { Camera, Coins } from "lucide-react";
import type React from "react";
import { DentalHandpiece, EndoFileCanal } from "../../icons/DentalIcons";

export interface ToothRadialFooterActionsProps {
	readonly toothScanThumbnail?: { id: string; url: string; title: string } | null | undefined;
	readonly onOpenRvg?: (() => void) | undefined;
	readonly onOpenTherapy?: (() => void) | undefined;
	readonly onAddToInvoice?: (() => void) | undefined;
	readonly onOpenEndo?: (() => void) | undefined;
	readonly onClose: () => void;
}

export const ToothRadialFooterActions: React.FC<ToothRadialFooterActionsProps> = ({
	toothScanThumbnail,
	onOpenRvg,
	onOpenTherapy,
	onAddToInvoice,
	onOpenEndo,
	onClose,
}) => {
	return (
		<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line-subtle)]">
			<button
				type="button"
				onClick={() => { onOpenRvg?.(); onClose(); }}
				className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
				title={toothScanThumbnail ? "Посмотреть снимок RVG" : "Захват снимка визиографа (RVG)"}
			>
				{toothScanThumbnail ? (
					<span className="flex items-center gap-1.5 font-bold">
						<span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
						<span>Снимок RVG</span>
					</span>
				) : (
					<span className="flex items-center gap-1.5 font-semibold">
						<Camera size={13} className="shrink-0" />
						<span>Снимок RVG</span>
					</span>
				)}
			</button>
			{onOpenTherapy && (
				<button
					type="button"
					onClick={() => { onOpenTherapy(); onClose(); }}
					className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
				>
					<DentalHandpiece size={13} />
					<span>Терапия</span>
				</button>
			)}
			{onAddToInvoice && (
				<button
					type="button"
					onClick={() => { onAddToInvoice(); onClose(); }}
					className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
				>
					<Coins size={13} />
					<span>В смету</span>
				</button>
			)}
			{onOpenEndo && !onAddToInvoice && (
				<button
					type="button"
					onClick={() => { onOpenEndo(); onClose(); }}
					className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
				>
					<EndoFileCanal size={13} />
					<span>Каналы</span>
				</button>
			)}
		</div>
	);
};
