import React from "react";
import { Check, Printer, Share2 } from "lucide-react";

export interface PrintViewToolbarProps {
	readonly effectivePlanNumber: string;
	readonly isDraft: boolean;
	readonly isSigned: boolean;
	readonly isCopied: boolean;
	readonly onCopyEstimate: () => void;
	readonly onPrint: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const PrintViewToolbar: React.FC<PrintViewToolbarProps> = ({
	effectivePlanNumber,
	isDraft,
	isSigned,
	isCopied,
	onCopyEstimate,
	onPrint,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
			<div className="flex items-center gap-2">
				<span className="text-sm font-bold text-slate-800">
					Смета плана лечения А4 ({effectivePlanNumber})
				</span>
				{isDraft && !isSigned && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
						Черновик (печать разрешена)
					</span>
				)}
				{isSigned && (
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
						Подписан пациентом
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onCopyEstimate}
					className="secondary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer transition-colors flex items-center gap-1.5 touch-manipulation shadow-2xs"
					title="Скопировать смету для отправки пациенту в WhatsApp или Telegram"
					data-testid="print-view-copy-btn"
				>
					{isCopied ? (
						<>
							<Check size={14} className="text-emerald-600" />
							<span className="text-emerald-600 font-bold">Скопировано</span>
						</>
					) : (
						<>
							<Share2 size={14} className="text-slate-600" />
							<span>Смета в мессенджер</span>
						</>
					)}
				</button>

				<button
					type="button"
					onClick={onPrint}
					className="primary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-xs touch-manipulation active:scale-[0.98]"
					data-testid="print-view-trigger-btn"
				>
					<Printer size={14} />
					<span>Распечатать смету (А4)</span>
				</button>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				)}
			</div>
		</div>
	);
};
