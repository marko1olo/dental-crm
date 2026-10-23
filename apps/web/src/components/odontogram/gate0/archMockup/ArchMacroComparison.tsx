/**
 * DENTE Dental CRM — Macro Zoom Badge Size Comparison Panel
 * 5 sizes side-by-side on anatomical tooth 46 (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Tooth46Container } from "../Tooth46Container";
import { ArchToothBadge } from "./ArchToothBadge";
import { BADGE_SIZE_CONFIGS, type BadgeSizeId } from "./archMockupTypes";

export interface ArchMacroComparisonProps {
	readonly isDark: boolean;
	readonly onSelectSize?: (size: BadgeSizeId) => void;
	readonly activeSize?: string;
}

const MACRO_PRESETS: { size: BadgeSizeId; presetId: string; tooth: number }[] = [
	{ size: "s", presetId: "caries_class2_mo", tooth: 48 },
	{ size: "m", presetId: "crown_pfm", tooth: 47 },
	{ size: "l", presetId: "caries_class2_mod", tooth: 46 },
	{ size: "xl", presetId: "postCore", tooth: 45 },
	{ size: "xxl", presetId: "implant_crown", tooth: 44 },
];

export const ArchMacroComparison: React.FC<ArchMacroComparisonProps> = ({
	isDark,
	onSelectSize,
	activeSize,
}) => {
	return (
		<section
			data-testid="arch-macro-comparison"
			className="w-full max-w-5xl rounded-2xl border p-3 sm:p-5 flex flex-col items-center bg-black/[0.02] dark:bg-white/[0.02] border-current/10"
		>
			<div className="w-full flex items-center justify-between pb-3 border-b border-current/10">
				<div>
					<h3 className="text-xs sm:text-sm font-bold flex items-center gap-2">
						<span>🔬 Крупный план: Сравнение 5 размеров маркировочных кружков</span>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono">
							3-Second Squint Test
						</span>
					</h3>
					<p className="text-[11px] opacity-70">
						Оценка читаемости клинических кодов (MO, МК, MOD, СВШ, Ик) при разном диаметре кружка
					</p>
				</div>
			</div>

			<div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
				{MACRO_PRESETS.map(({ size, presetId, tooth }) => {
					const cfg = BADGE_SIZE_CONFIGS[size];
					const isSelected = activeSize === size;
					return (
						<div
							key={size}
							onClick={() => onSelectSize?.(size)}
							className={`flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer ${
								isSelected
									? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
									: "border-current/10 hover:border-current/20 hover:bg-black/[0.02]"
							}`}
						>
							<div className="text-center mb-1">
								<span className="text-xs font-black font-mono tracking-tight block">
									{cfg.label}
								</span>
								<span className="text-[10px] opacity-60 font-mono">
									Зуб {tooth}
								</span>
							</div>

							<div className="py-2">
								<Tooth46Container
									isDark={isDark}
									zoom={0.9}
									presetId={presetId}
									showBadge={false}
								/>
							</div>

							<div className="mt-2 flex flex-col items-center gap-1">
								<ArchToothBadge presetId={presetId} radius={cfg.radius} />
								<span className="text-[10px] font-mono opacity-70">
									Ø {cfg.pixelDiameter}px (R={cfg.radius})
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
};
