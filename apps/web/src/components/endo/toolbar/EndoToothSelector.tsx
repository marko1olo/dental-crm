import React from "react";

interface EndoToothSelectorProps {
	readonly activeTooth: number;
	readonly onSwitchTooth: (tooth: number) => void;
}

export const EndoToothSelector: React.FC<EndoToothSelectorProps> = ({
	activeTooth,
	onSwitchTooth,
}) => (
	<div className="flex items-center gap-1 shrink-0 bg-[var(--paper,#ffffff)] dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 h-6 sm:h-7">
		<span className="text-[11px] font-black text-rose-600 dark:text-rose-400 shrink-0">Зуб:</span>
		<select
			value={activeTooth}
			onChange={(e) => onSwitchTooth(Number(e.target.value))}
			aria-label="Выбор зуба FDI"
			className="h-full text-xs font-black bg-transparent text-[var(--ink,#0f172a)] dark:text-white outline-none cursor-pointer pr-0.5"
		>
			<optgroup label="Верхняя челюсть (18-28)">
				{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
					<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
						#{t}
					</option>
				))}
			</optgroup>
			<optgroup label="Нижняя челюсть (48-38)">
				{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
					<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
						#{t}
					</option>
				))}
			</optgroup>
		</select>
	</div>
);
