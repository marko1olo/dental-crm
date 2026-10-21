import React from "react";
import { FDI_Q1, FDI_Q2, FDI_Q3, FDI_Q4 } from "./constructionConstants";

export interface DrawerFdiToothPickerProps {
	selectedTeethList: number[];
	toggleTooth: (t: number) => void;
	setFormTeethInput: (val: string) => void;
}

export function DrawerFdiToothPicker({
	selectedTeethList, toggleTooth, setFormTeethInput,
}: DrawerFdiToothPickerProps): React.JSX.Element {
	const renderToothBtn = (t: number, q: string) => {
		const isSel = selectedTeethList.includes(t);
		return (
			<button
				key={t}
				type="button"
				onClick={() => toggleTooth(t)}
				data-testid={`form-tooth-btn-${t}`}
				title={`Зуб ${t} (${q})`}
				className={`min-w-[20px] sm:min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
					isSel
						? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
				}`}
			>
				{t}
			</button>
		);
	};

	return (
		<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-1.5" data-testid="drawer-fdi-tooth-picker">
			<div className="flex items-center justify-between text-[11px] font-bold text-[var(--ink)]">
				<span>Формула FDI (1 тап):</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setFormTeethInput("18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28")}
						className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] font-medium cursor-pointer"
					>
						В/Ч
					</button>
					<button
						type="button"
						onClick={() => setFormTeethInput("48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38")}
						className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] font-medium cursor-pointer"
					>
						Н/Ч
					</button>
					<button
						type="button"
						onClick={() => setFormTeethInput("")}
						className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:text-rose-600 font-medium cursor-pointer"
					>
						Сброс
					</button>
				</div>
			</div>

			<div className="overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="flex items-center gap-1 justify-center min-w-[340px]">
					<div className="flex items-center gap-0.5">{FDI_Q1.map((t) => renderToothBtn(t, "Q1"))}</div>
					<div className="w-px h-5 bg-teal-500/50 mx-0.5" />
					<div className="flex items-center gap-0.5">{FDI_Q2.map((t) => renderToothBtn(t, "Q2"))}</div>
				</div>

				<div className="flex items-center gap-1 justify-center min-w-[340px] mt-1">
					<div className="flex items-center gap-0.5">{FDI_Q4.map((t) => renderToothBtn(t, "Q4"))}</div>
					<div className="w-px h-5 bg-teal-500/50 mx-0.5" />
					<div className="flex items-center gap-0.5">{FDI_Q3.map((t) => renderToothBtn(t, "Q3"))}</div>
				</div>
			</div>
		</div>
	);
}
