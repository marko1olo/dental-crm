import React from "react";
import { Sparkles } from "lucide-react";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES } from "./radiologyMath";

export interface DirectRvgFdiSelectorProps {
	selectedTeeth: string[];
	onToothToggle: (tooth: string, multiSelect?: boolean) => void;
	primaryTooth: string;
	primaryToothName: string;
	projectionType?: string;
	onSelectTeeth?: (teeth: string[]) => void;
}

export const DirectRvgFdiSelector: React.FC<DirectRvgFdiSelectorProps> = ({
	selectedTeeth,
	onToothToggle,
	primaryTooth,
	primaryToothName,
	projectionType,
	onSelectTeeth,
}) => {
	const handleSelectBitewingRight = () => {
		const teeth = ["17", "16", "15", "14", "47", "46", "45", "44"];
		if (onSelectTeeth) onSelectTeeth(teeth);
		else teeth.forEach((t) => onToothToggle(t, true));
	};

	const handleSelectBitewingLeft = () => {
		const teeth = ["24", "25", "26", "27", "34", "35", "36", "37"];
		if (onSelectTeeth) onSelectTeeth(teeth);
		else teeth.forEach((t) => onToothToggle(t, true));
	};

	const handleSelectOcclusalUpper = () => {
		const teeth = [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
		];
		if (onSelectTeeth) onSelectTeeth(teeth);
		else teeth.forEach((t) => onToothToggle(t, true));
	};

	const handleSelectOcclusalLower = () => {
		const teeth = [
			...ADULT_FDI_TEETH.quadrant4,
			...ADULT_FDI_TEETH.quadrant3,
		];
		if (onSelectTeeth) onSelectTeeth(teeth);
		else teeth.forEach((t) => onToothToggle(t, true));
	};

	const handleSelectFrontal = () => {
		const teeth = ["13", "12", "11", "21", "22", "23", "43", "42", "41", "31", "32", "33"];
		if (onSelectTeeth) onSelectTeeth(teeth);
		else teeth.forEach((t) => onToothToggle(t, true));
	};

	const isMulti = selectedTeeth.length > 1;
	const isBitewing = projectionType === "bitewing" || (
		selectedTeeth.some((t) => ["14", "15", "16", "17", "24", "25", "26", "27"].includes(t)) &&
		selectedTeeth.some((t) => ["44", "45", "46", "47", "34", "35", "36", "37"].includes(t))
	);

	return (
		<div className="rvg-dock-section">
			<div className="rvg-section-header">
				<span className="rvg-section-header-title">
					<Sparkles className="w-3.5 h-3.5" />
					Зубная формула (FDI 11–48)
				</span>
				<span className="font-mono text-teal-400 font-bold">
					{selectedTeeth.join(", ")}
				</span>
			</div>

			{/* 1-Click Quick Preset Chips: Bitewing, Occlusal, Frontal */}
			<div className="flex items-center gap-1 flex-wrap mb-2" data-testid="rvg-fdi-quick-presets">
				<button
					type="button"
					onClick={handleSelectBitewingRight}
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-teal-300 border border-slate-700 hover:bg-slate-700 transition-colors"
					title="Интерпроксимальный прикусный снимок моляров и премоляров справа"
					data-testid="rvg-fdi-preset-bitewing-r"
				>
					Bite-wing R (15-17/45-47)
				</button>
				<button
					type="button"
					onClick={handleSelectBitewingLeft}
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-teal-300 border border-slate-700 hover:bg-slate-700 transition-colors"
					title="Интерпроксимальный прикусный снимок моляров и премоляров слева"
					data-testid="rvg-fdi-preset-bitewing-l"
				>
					Bite-wing L (25-27/35-37)
				</button>
				<button
					type="button"
					onClick={handleSelectOcclusalUpper}
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
					title="Окклюзионный снимок свода верхней челюсти"
					data-testid="rvg-fdi-preset-occlusal-upper"
				>
					Окклюзия ВЧ
				</button>
				<button
					type="button"
					onClick={handleSelectOcclusalLower}
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
					title="Окклюзионный снимок дна полости рта и нижней челюсти"
					data-testid="rvg-fdi-preset-occlusal-lower"
				>
					Окклюзия НЧ
				</button>
				<button
					type="button"
					onClick={handleSelectFrontal}
					className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
					title="Фронтальная группа резцов и клыков"
					data-testid="rvg-fdi-preset-frontal"
				>
					Фронт
				</button>
			</div>

			<div className="rvg-fdi-selector-panel" data-testid="rvg-fdi-selector-panel">
				{/* Upper Jaw: Quadrant 1 (18-11) | Quadrant 2 (21-28) */}
				<div className="rvg-fdi-jaw-row">
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant2.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
				</div>

				{/* Lower Jaw: Quadrant 4 (48-41) | Quadrant 3 (31-38) */}
				<div className="rvg-fdi-jaw-row">
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant4.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
					<div className="rvg-fdi-quadrant">
						{ADULT_FDI_TEETH.quadrant3.map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
								className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
								title={FDI_TOOTH_NAMES[tooth]}
								data-testid={`rvg-tooth-${tooth}`}
							>
								{tooth}
							</button>
						))}
					</div>
				</div>

				{/* Selected Tooth Description */}
				<div className="rvg-selected-tooth-badge min-w-0">
					<span className="truncate">
						{isBitewing
							? `Интерпроксимальный (Bite-wing): зубы ${selectedTeeth.join(", ")}`
							: isMulti
								? `Группа зубов: ${selectedTeeth.join(", ")} (${selectedTeeth.length} поз.)`
								: primaryToothName}
					</span>
					<span className="font-mono text-[11px] opacity-80 shrink-0">
						{isMulti ? `FDI #${selectedTeeth.length} шт` : `FDI #${primaryTooth}`}
					</span>
				</div>
			</div>
		</div>
	);
};
