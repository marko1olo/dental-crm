import { Check, FileText, Layers } from "lucide-react";
import React from "react";

export interface MobileShowcaseBottomActionsProps {
	comparisonMode: "single" | "split";
	onToggleMode: () => void;
	attachedTo043: boolean;
	onToggleAttach: () => void;
}

export const MobileShowcaseBottomActions: React.FC<
	MobileShowcaseBottomActionsProps
> = ({ comparisonMode, onToggleMode, attachedTo043, onToggleAttach }) => {
	return (
		<div className="space-y-2.5 pt-2 border-t border-white/10">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleMode}
					className={`flex-1 min-h-[46px] rounded-xl px-3 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
						comparisonMode === "split"
							? "bg-teal-600 text-white shadow-md border border-teal-400"
							: "bg-white/10 text-slate-200 border border-white/15 hover:bg-white/15"
					}`}
					data-testid="btn-toggle-showcase-split"
				>
					<Layers size={16} />
					<span>
						{comparisonMode === "split"
							? "Одиночный вид"
							: "Сравнение 'До/После'"}
					</span>
				</button>
				<button
					type="button"
					onClick={onToggleAttach}
					className={`flex-1 min-h-[46px] rounded-xl px-3 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
						attachedTo043
							? "bg-emerald-600 text-white shadow-md border border-emerald-400"
							: "bg-white/10 text-slate-200 border border-white/15 hover:bg-white/15"
					}`}
					data-testid="btn-toggle-attach-protocol-043"
				>
					{attachedTo043 ? <Check size={16} /> : <FileText size={16} />}
					<span>
						{attachedTo043 ? "В медкарте приёма" : "+ В медкарту приёма"}
					</span>
				</button>
			</div>
		</div>
	);
};
