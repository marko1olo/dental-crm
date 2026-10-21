import React, { useState } from "react";
import { showToast } from "../../GlobalToast";

export const MobilePatientToothQuadrantSelector: React.FC = () => {
	const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);

	const teethList =
		activeQuadrant === 1
			? [18, 17, 16, 15, 14, 13, 12, 11]
			: activeQuadrant === 2
				? [21, 22, 23, 24, 25, 26, 27, 28]
				: activeQuadrant === 3
					? [31, 32, 33, 34, 35, 36, 37, 38]
					: [48, 47, 46, 45, 44, 43, 42, 41];

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold text-[var(--muted)] m-0">Зубная формула (Квадранты)</h3>
				<span className="text-[11px] text-[var(--muted)]">Взрослая (FDI)</span>
			</div>

			<div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				{([1, 2, 3, 4] as const).map((q) => (
					<button
						key={q}
						type="button"
						onClick={() => setActiveQuadrant(q)}
						className={`min-h-[36px] py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							activeQuadrant === q ? "bg-[var(--teal)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Q{q} {q === 1 ? "18-11" : q === 2 ? "21-28" : q === 3 ? "31-38" : "48-41"}
					</button>
				))}
			</div>

			<div className="grid grid-cols-4 gap-2 pt-1">
				{teethList.map((tooth) => (
					<button
						key={tooth}
						type="button"
						onClick={() => showToast(`Выбран зуб ${tooth}`, "info")}
						className="min-h-[46px] h-12 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-xs font-bold text-[var(--ink)]"
					>
						<span className="text-sm font-black text-teal-600 dark:text-teal-400">{tooth}</span>
						<span className="text-[10px] text-[var(--muted)] font-normal">Норма</span>
					</button>
				))}
			</div>
		</div>
	);
};
MobilePatientToothQuadrantSelector.displayName = "MobilePatientToothQuadrantSelector";
