import React from "react";

export interface FdiPickerMobileViewProps {
	selectedTeeth: number[];
	toggleTooth: (tooth: number) => void;
}

const QUADRANTS = [
	{ id: "q1", title: "1-й квадрант Q1 (18–11) • Верхний правый", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
	{ id: "q2", title: "2-й квадрант Q2 (21–28) • Верхний левый", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
	{ id: "q4", title: "4-й квадрант Q4 (48–41) • Нижний правый", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
	{ id: "q3", title: "3-й квадрант Q3 (31–38) • Нижний левый", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
];

export function FdiPickerMobileView({
	selectedTeeth,
	toggleTooth,
}: FdiPickerMobileViewProps): React.JSX.Element {
	return (
		<div className="block md:hidden space-y-3">
			{QUADRANTS.map((quad) => (
				<div key={quad.id} className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
					<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
						{quad.title}
					</div>
					<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
						<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
							{quad.teeth.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => toggleTooth(t)}
									className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${
										selectedTeeth.includes(t) ? "is-selected" : ""
									}`}
									title={`Зуб ${t}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
