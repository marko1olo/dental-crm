/**
 * ScannerImageControls.tsx
 *
 * Image enhancement filter toggles (auto-contrast, binarization, grayscale)
 * and document capture telemetry strip.
 */

import React from "react";
import { Info } from "lucide-react";
import type { DocumentFilterMode } from "../documentScannerEngine";

export interface ScannerImageControlsProps {
	readonly filterMode: DocumentFilterMode;
	readonly onFilterChange: (mode: DocumentFilterMode) => void;
	readonly ocrSummary?: string | null;
}

const FILTER_OPTIONS: readonly { readonly id: DocumentFilterMode; readonly label: string }[] = [
	{ id: "auto_contrast", label: "Контраст" },
	{ id: "high_contrast_bw", label: "Ч/Б текст" },
	{ id: "grayscale", label: "Оттенки серого" },
	{ id: "original", label: "Оригинал" },
];

export const ScannerImageControls: React.FC<ScannerImageControlsProps> = ({
	filterMode,
	onFilterChange,
	ocrSummary,
}) => {
	return (
		<div className="flex flex-col border-t border-[var(--line)]">
			{ocrSummary && (
				<div className="flex items-center gap-2 bg-[var(--teal-surface)] px-4 py-2 text-xs text-[var(--teal-dark)] font-medium border-b border-[var(--line)]">
					<Info size={14} className="text-[var(--teal-dark)] shrink-0" />
					<span>{ocrSummary}</span>
				</div>
			)}
			<div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--paper-soft)]">
				<span className="text-xs text-[var(--muted)] font-medium mr-1">Фильтр:</span>
				{FILTER_OPTIONS.map((f) => (
					<button
						key={f.id}
						type="button"
						onClick={() => onFilterChange(f.id)}
						className={`min-h-[44px] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
							filterMode === f.id
								? "bg-[var(--line-strong)] text-[var(--ink)] border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						{f.label}
					</button>
				))}
			</div>
		</div>
	);
};
export default ScannerImageControls;
