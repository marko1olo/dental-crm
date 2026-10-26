/**
 * CbctSidebarToothSelector.tsx — Селектор зубов формулы FDI для мгновенного фокуса (Мандаты 8e, 8b).
 */

import React from "react";

const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export interface CbctSidebarToothSelectorProps {
	readonly onSelectTooth: (fdi: number) => void;
	readonly activeToothFdi?: string | number | undefined;
}

export const CbctSidebarToothSelector: React.FC<CbctSidebarToothSelectorProps> = ({
	onSelectTooth,
	activeToothFdi,
}) => {
	const activeNum = activeToothFdi ? Number(activeToothFdi) : null;

	const renderToothBtn = (fdi: number) => {
		const isSelected = activeNum === fdi;
		return (
			<button
				key={fdi}
				type="button"
				onClick={() => onSelectTooth(fdi)}
				className={`w-5 h-6 text-[10px] font-medium rounded flex items-center justify-center transition-colors ${
					isSelected
						? "bg-[var(--primary)] text-white font-bold"
						: "bg-[var(--paper-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)]"
				}`}
				title={`Зуб ${fdi} (фокус в 1 клик)`}
			>
				{fdi}
			</button>
		);
	};

	return (
		<div className="flex flex-col gap-1.5 p-2 bg-[var(--paper)] rounded-lg border border-[var(--line)]">
			<div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium">
				<span>Верхняя челюсть</span>
				<span>18 - 28</span>
			</div>
			<div className="grid grid-cols-8 gap-0.5">
				{UPPER_JAW_TEETH.map(renderToothBtn)}
			</div>

			<div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium mt-1">
				<span>Нижняя челюсть</span>
				<span>48 - 38</span>
			</div>
			<div className="grid grid-cols-8 gap-0.5">
				{LOWER_JAW_TEETH.map(renderToothBtn)}
			</div>
		</div>
	);
};
