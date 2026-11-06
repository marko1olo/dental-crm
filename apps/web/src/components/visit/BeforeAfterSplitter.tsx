/**
 * BeforeAfterSplitter.tsx — Фасад над каноническим BeforeAfterSplitSlider (SSOT).
 * Мандат 8aq: Ликвидация дубликатов слайдера До/После.
 */

import React from "react";
import { BeforeAfterSplitSlider, type BeforeAfterSplitSliderProps } from "../photography/BeforeAfterSplitSlider";
import type { BeforeAfterSplitterProps } from "./beforeAfterTypes";

export * from "./beforeAfterTypes";

export const BeforeAfterSplitter: React.FC<BeforeAfterSplitterProps> = ({
	beforeUrl,
	afterUrl,
	beforeLabel = "ДО",
	afterLabel = "ПОСЛЕ",
	photos = [],
	onClose,
	compact = false,
	className = "",
}) => {
	return (
		<div className={`p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-md ${compact ? "w-full" : "w-full max-w-4xl mx-auto"} ${className}`}>
			<BeforeAfterSplitSlider
				beforeUrl={beforeUrl}
				afterUrl={afterUrl}
				beforeLabel={beforeLabel}
				afterLabel={afterLabel}
				compact={compact}
				onClose={onClose}
				photos={photos.map((p) => ({ id: p.id, url: p.url, label: p.label, date: p.date }))}
			/>
		</div>
	);
};

export default BeforeAfterSplitter;
