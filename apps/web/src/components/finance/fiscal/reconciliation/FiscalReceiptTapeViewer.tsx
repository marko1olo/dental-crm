/**
 * FiscalReceiptTapeViewer.tsx — Monospaced Receipt Tape Viewer and Print Control.
 * Mandate 8am: Exactly 1 Primary CTA (print action is secondary here to keep modal footer CTA dominant).
 */

import React from "react";
import { CheckCheck, Copy, Printer } from "lucide-react";
import type { FiscalReceiptTapeViewerProps } from "./types";

export const FiscalReceiptTapeViewer: React.FC<FiscalReceiptTapeViewerProps> = ({
	receiptTapeText,
	tapeWidth,
	onTapeWidthChange,
	onCopy,
	onPrint,
	isCopied,
	printButtonLabel,
}) => {
	return (
		<div className="space-y-4">
			{/* Tape Width Controls & Actions */}
			<div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--muted)]">Ширина ленты:</span>
					<div className="flex bg-[var(--paper)] border border-[var(--line)] p-0.5 rounded-lg">
						<button
							type="button"
							onClick={() => onTapeWidthChange("58mm")}
							className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[36px] sm:min-h-[32px] ${
								tapeWidth === "58mm"
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							58 мм (Узкая)
						</button>
						<button
							type="button"
							onClick={() => onTapeWidthChange("80mm")}
							className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[36px] sm:min-h-[32px] ${
								tapeWidth === "80mm"
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							80 мм (Широкая)
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCopy}
						className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
					>
						{isCopied ? <CheckCheck size={16} className="text-emerald-600 shrink-0" /> : <Copy size={16} className="shrink-0" />}
						<span>{isCopied ? "Скопировано!" : "Скопировать текст"}</span>
					</button>
					<button
						type="button"
						onClick={onPrint}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] hover:bg-[var(--teal)]/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
					>
						<Printer size={16} className="shrink-0" />
						<span>{printButtonLabel || `Печать на кассе (${tapeWidth})`}</span>
					</button>
				</div>
			</div>

			{/* Monospaced Receipt Tape Container */}
			<div className="flex justify-center p-4 bg-[var(--paper-soft)] rounded-2xl overflow-x-auto">
				<div
					className={`p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono text-[11px] leading-relaxed shadow-xl border border-[var(--line)] rounded-sm whitespace-pre ${
						tapeWidth === "80mm" ? "w-[380px]" : "w-[290px]"
					}`}
				>
					{receiptTapeText}
				</div>
			</div>
		</div>
	);
};
