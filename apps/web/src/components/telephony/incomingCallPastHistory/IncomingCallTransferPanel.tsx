import { ChevronDown, PhoneForwarded } from "lucide-react";
import React from "react";
import { DEFAULT_TRANSFER_EXTENSIONS } from "./pastHistoryTypes";

export interface IncomingCallTransferPanelProps {
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSelectTransferType: (t: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
}

export function IncomingCallTransferPanel({
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSelectTransferType,
	onStartTransfer,
}: IncomingCallTransferPanelProps) {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
			<button
				type="button"
				onClick={onToggleTransferPanel}
				className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between cursor-pointer"
			>
				<div className="flex items-center gap-2">
					<PhoneForwarded size={15} className="text-[var(--teal)]" />
					<span>{showTransferPanel ? "Скрыть перевод" : "Перевод на врача"}</span>
				</div>
				<ChevronDown size={16} className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`} />
			</button>

			{showTransferPanel && (
				<div className="space-y-2 pt-1 animate-fade-in">
					<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-lg p-1 border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => onSelectTransferType("blind")}
							className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
								transferType === "blind" ? "bg-[var(--teal)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Прямой перевод
						</button>
						<button
							type="button"
							onClick={() => onSelectTransferType("attended")}
							className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
								transferType === "attended" ? "bg-[var(--teal)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							С консультацией
						</button>
					</div>

					<div className="grid grid-cols-4 gap-1.5">
						{DEFAULT_TRANSFER_EXTENSIONS.map((item) => (
							<button
								key={item.ext}
								type="button"
								onClick={() => onStartTransfer(item.ext, transferType)}
								className="min-h-[44px] px-1 py-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--teal-surface)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs"
							>
								<span className="font-mono text-[var(--teal)]">{item.ext}</span>
								<span className="text-[9px] font-normal text-[var(--muted,#64748b)] truncate w-full">{item.label.split(" ")[1]}</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
