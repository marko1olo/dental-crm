/**
 * DENTE CRM — Interactive Panoramic FDI Tooth Ribbon & Navigation Module
 * Standards: FDI World Dental Federation Two-Digit System, ISO 3950, DICOM PS 3.3
 * Mandates: 8e (Doctor Autonomy), 8k (Clinical Density 28–32px, 0-clutter)
 */

import React, { useMemo, useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import type { DentalArchCurve } from "../dentalCurveEngine";

export interface CbctPanoramicFdiRibbonProps {
	readonly activeToothFdi?: string | number | undefined;
	readonly onSelectTooth: (toothFdi: number | string) => void;
	readonly onClose?: (() => void) | undefined;
	readonly archCurve?: DentalArchCurve | undefined;
	readonly className?: string | undefined;
}

// FDI Teeth Definition per Quadrants
const MAXILLARY_TEETH_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const MAXILLARY_TEETH_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const MANDIBULAR_TEETH_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const MANDIBULAR_TEETH_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const CbctPanoramicFdiRibbon: React.FC<CbctPanoramicFdiRibbonProps> = ({
	activeToothFdi,
	onSelectTooth,
	onClose,
	archCurve,
	className = "",
}) => {
	// Auto-select jaw based on archCurve or fallback to mandible (dominant in implantology)
	const [activeJaw, setActiveJaw] = useState<"mandible" | "maxilla">(() => {
		return archCurve?.jawType === "maxilla" ? "maxilla" : "mandible";
	});

	const activeFdiStr = useMemo(() => {
		if (activeToothFdi === undefined || activeToothFdi === null) return null;
		return String(activeToothFdi);
	}, [activeToothFdi]);

	// Auto-detect if active tooth belongs to maxilla or mandible to sync tab if needed
	const activeToothNum = activeFdiStr ? Number.parseInt(activeFdiStr, 10) : null;
	const isCurrentToothMaxillary =
		activeToothNum !== null &&
		((activeToothNum >= 11 && activeToothNum <= 18) || (activeToothNum >= 21 && activeToothNum <= 28));
	const isCurrentToothMandibular =
		activeToothNum !== null &&
		((activeToothNum >= 31 && activeToothNum <= 38) || (activeToothNum >= 41 && activeToothNum <= 48));

	// Effective jaw view
	const effectiveJaw =
		isCurrentToothMaxillary ? "maxilla" : isCurrentToothMandibular ? "mandible" : activeJaw;

	const rightTeeth = effectiveJaw === "maxilla" ? MAXILLARY_TEETH_RIGHT : MANDIBULAR_TEETH_RIGHT;
	const leftTeeth = effectiveJaw === "maxilla" ? MAXILLARY_TEETH_LEFT : MANDIBULAR_TEETH_LEFT;

	return (
		<div
			className={`flex items-center justify-between gap-1.5 px-2 py-1 bg-zinc-950/95 border-b border-purple-500/40 backdrop-blur-md select-none z-20 text-xs shadow-md ${className}`}
			data-testid="cbct-panoramic-fdi-ribbon"
			role="toolbar"
			aria-label="Навигационная лента зубов FDI"
		>
			{/* Left: Jaw Selector Tabs [Н/Ч | В/Ч] */}
			<div className="flex items-center gap-1 shrink-0">
				<span className="text-[10px] font-bold text-zinc-400 mr-1 hidden sm:inline-block">
					FDI:
				</span>
				<div className="inline-flex rounded-md p-0.5 bg-zinc-900 border border-zinc-800">
					<button
						type="button"
						onClick={() => setActiveJaw("mandible")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
							effectiveJaw === "mandible"
								? "bg-purple-950/70 text-purple-200 border border-purple-500/50 shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-fdi-tab-mandible"
						title="Нижняя челюсть (48..38)"
					>
						Н/Ч
					</button>
					<button
						type="button"
						onClick={() => setActiveJaw("maxilla")}
						className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
							effectiveJaw === "maxilla"
								? "bg-purple-950/70 text-purple-200 border border-purple-500/50 shadow-xs"
								: "text-zinc-400 hover:text-zinc-200"
						}`}
						data-testid="cbct-fdi-tab-maxilla"
						title="Верхняя челюсть (18..28)"
					>
						В/Ч
					</button>
				</div>
			</div>

			{/* Center: Anatomical FDI Teeth Buttons Ribbon (Scrollable on small screens) */}
			<div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-0.5">
				{/* Right Quadrant (Patient's Right / Image Left): 48..41 or 18..11 */}
				<div className="flex items-center gap-0.5 shrink-0">
					{rightTeeth.map((tooth) => {
						const isSelected = activeFdiStr === String(tooth);
						return (
							<button
								key={tooth}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectTooth(tooth);
								}}
								className={`min-w-[26px] h-7 px-1 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-all cursor-pointer relative ${
									isSelected
										? "bg-purple-950/90 text-purple-200 border border-purple-500/80 shadow-md ring-1 ring-purple-400/50 scale-105 z-10"
										: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-purple-400/60"
								}`}
								title={`Сфокусировать срез и 3D-прицел на зубе #${tooth}`}
								aria-label={`Зуб FDI ${tooth}`}
								aria-pressed={isSelected}
								data-testid={`cbct-fdi-tooth-btn-${tooth}`}
							>
								{tooth}
							</button>
						);
					})}
				</div>

				{/* Anatomical Midline Separator */}
				<div className="w-px h-5 bg-purple-400/60 mx-1 shrink-0" role="separator" title="Медиальная линия" />

				{/* Left Quadrant (Patient's Left / Image Right): 31..38 or 21..28 */}
				<div className="flex items-center gap-0.5 shrink-0">
					{leftTeeth.map((tooth) => {
						const isSelected = activeFdiStr === String(tooth);
						return (
							<button
								key={tooth}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectTooth(tooth);
								}}
								className={`min-w-[26px] h-7 px-1 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-all cursor-pointer relative ${
									isSelected
										? "bg-purple-950/90 text-purple-200 border border-purple-500/80 shadow-md ring-1 ring-purple-400/50 scale-105 z-10"
										: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-purple-400/60"
								}`}
								title={`Сфокусировать срез и 3D-прицел на зубе #${tooth}`}
								aria-label={`Зуб FDI ${tooth}`}
								aria-pressed={isSelected}
								data-testid={`cbct-fdi-tooth-btn-${tooth}`}
							>
								{tooth}
							</button>
						);
					})}
				</div>
			</div>

			{/* Right: Active Tooth Badge & 1-Click Close Button */}
			<div className="flex items-center gap-1.5 shrink-0">
				{activeFdiStr && (
					<span
						className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-600/70 text-purple-200 font-mono text-[10px] font-bold"
						data-testid="cbct-fdi-active-badge"
					>
						#{activeFdiStr}
					</span>
				)}
				{onClose && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClose();
						}}
						className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
						title="Скрыть зубную формулу FDI"
						aria-label="Закрыть ленту зубов"
						data-testid="cbct-fdi-close-btn"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
		</div>
	);
};

export default CbctPanoramicFdiRibbon;
