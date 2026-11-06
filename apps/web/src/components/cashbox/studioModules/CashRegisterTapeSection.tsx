/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterTapeSection.tsx
 *
 * Dedicated Cash Register Tape View Section for CashRegisterStudioModal.
 * Displays monospace formatted 54-FZ thermal paper receipt logs.
 */

import React from "react";
import { Check, Copy } from "lucide-react";

export interface CashRegisterTapeSectionProps {
	readonly tapeText: string;
	readonly isCopied: boolean;
	readonly onCopyTape: () => void;
}

export const CashRegisterTapeSection: React.FC<CashRegisterTapeSectionProps> = ({
	tapeText,
	isCopied,
	onCopyTape,
}) => {
	return (
		<div className="space-y-2.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
					Контрольная лента операций
				</span>
				<button
					type="button"
					onClick={onCopyTape}
					className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 min-h-[36px] cursor-pointer transition-colors"
				>
					{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
					<span>{isCopied ? "Скопировано" : "Копировать"}</span>
				</button>
			</div>
			<pre className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-xs text-[var(--ink)] overflow-x-auto max-h-64 whitespace-pre leading-relaxed">
				{tapeText}
			</pre>
		</div>
	);
};
