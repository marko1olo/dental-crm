import React, { useState } from "react";
import { Sparkles, User, Baby } from "lucide-react";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES } from "./radiologyMath";

export const CHILD_FDI_TEETH = {
	quadrant5: ["55", "54", "53", "52", "51"],
	quadrant6: ["61", "62", "63", "64", "65"],
	quadrant8: ["85", "84", "83", "82", "81"],
	quadrant7: ["71", "72", "73", "74", "75"],
};

export interface DirectRvgFdiSelectorProps {
	selectedTeeth: string[];
	onToothToggle: (tooth: string, multiSelect?: boolean) => void;
	primaryTooth: string;
	primaryToothName: string;
	projectionType?: string;
	onSelectTeeth?: (teeth: string[]) => void;
	patientCategory?: "adult" | "child";
	onChangePatientCategory?: (category: "adult" | "child") => void;
}

export const DirectRvgFdiSelector: React.FC<DirectRvgFdiSelectorProps> = ({
	selectedTeeth,
	onToothToggle,
	primaryTooth,
	primaryToothName,
	projectionType,
	patientCategory: propCategory,
	onChangePatientCategory,
}) => {
	const [localCategory, setLocalCategory] = useState<"adult" | "child">("adult");
	const activeCategory = propCategory ?? localCategory;

	const handleCategoryChange = (cat: "adult" | "child") => {
		setLocalCategory(cat);
		onChangePatientCategory?.(cat);
	};

	const isMulti = selectedTeeth.length > 1;
	const isBitewing = projectionType === "bitewing";

	return (
		<div className="rvg-dock-section">
			{/* Section Header */}
			<div className="rvg-section-header">
				<span className="rvg-section-header-title">
					<Sparkles className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
					Зубная формула ({activeCategory === "adult" ? "FDI 11–48" : "FDI 51–85"})
				</span>
				<span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
					{selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—"}
				</span>
			</div>

			{/* Adult / Child Segmented Control */}
			<div className="rvg-category-presets mb-1.5" data-testid="rvg-fdi-patient-category-presets">
				<button
					type="button"
					onClick={() => handleCategoryChange("adult")}
					className={`rvg-category-btn ${activeCategory === "adult" ? "active" : ""}`}
					title="Постоянный прикус взрослого пациента (FDI 11–48)"
					data-testid="rvg-category-adult"
				>
					<User className="w-3.5 h-3.5" />
					<span>Взрослый (11–48)</span>
				</button>
				<button
					type="button"
					onClick={() => handleCategoryChange("child")}
					className={`rvg-category-btn ${activeCategory === "child" ? "active" : ""}`}
					title="Сменный и молочный прикус ребенка (FDI 51–85)"
					data-testid="rvg-category-child"
				>
					<Baby className="w-3.5 h-3.5" />
					<span>Детский (51–85)</span>
				</button>
			</div>

			{/* Tooth Formula Matrix */}
			<div className="rvg-fdi-selector-panel" data-testid="rvg-fdi-selector-panel">
				{activeCategory === "adult" ? (
					<>
						{/* Upper Jaw: Quadrant 1 (18-11) | Quadrant 2 (21-28) */}
						<div className="rvg-fdi-jaw-row">
							<div className="rvg-fdi-quadrant">
								{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
										className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
										title={FDI_TOOTH_NAMES[tooth] || `Зуб ${tooth}`}
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
										title={FDI_TOOTH_NAMES[tooth] || `Зуб ${tooth}`}
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
										title={FDI_TOOTH_NAMES[tooth] || `Зуб ${tooth}`}
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
										title={FDI_TOOTH_NAMES[tooth] || `Зуб ${tooth}`}
										data-testid={`rvg-tooth-${tooth}`}
									>
										{tooth}
									</button>
								))}
							</div>
						</div>
					</>
				) : (
					<>
						{/* Child Upper Jaw: Quadrant 5 | Quadrant 6 */}
						<div className="rvg-fdi-jaw-row">
							<div className="rvg-fdi-quadrant">
								{CHILD_FDI_TEETH.quadrant5.map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
										className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
										title={`Молочный зуб ${tooth}`}
										data-testid={`rvg-tooth-${tooth}`}
									>
										{tooth}
									</button>
								))}
							</div>
							<div className="rvg-fdi-quadrant">
								{CHILD_FDI_TEETH.quadrant6.map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
										className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
										title={`Молочный зуб ${tooth}`}
										data-testid={`rvg-tooth-${tooth}`}
									>
										{tooth}
									</button>
								))}
							</div>
						</div>

						{/* Child Lower Jaw: Quadrant 8 | Quadrant 7 */}
						<div className="rvg-fdi-jaw-row">
							<div className="rvg-fdi-quadrant">
								{CHILD_FDI_TEETH.quadrant8.map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
										className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
										title={`Молочный зуб ${tooth}`}
										data-testid={`rvg-tooth-${tooth}`}
									>
										{tooth}
									</button>
								))}
							</div>
							<div className="rvg-fdi-quadrant">
								{CHILD_FDI_TEETH.quadrant7.map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={(e) => onToothToggle(tooth, e.shiftKey || e.ctrlKey || e.metaKey)}
										className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
										title={`Молочный зуб ${tooth}`}
										data-testid={`rvg-tooth-${tooth}`}
									>
										{tooth}
									</button>
								))}
							</div>
						</div>
					</>
				)}

				{/* Selected Tooth Description */}
				<div className="rvg-selected-tooth-badge min-w-0">
					<span className="truncate">
						{isBitewing
							? `Интерпроксимальный (Bite-wing): зубы ${selectedTeeth.join(", ")}`
							: isMulti
								? `Выбрано зубов: ${selectedTeeth.join(", ")}`
								: primaryToothName}
					</span>
					<span className="text-[11px] font-mono shrink-0 ml-1.5 opacity-80">
						FDI #{primaryTooth}
					</span>
				</div>
			</div>
		</div>
	);
};

export default DirectRvgFdiSelector;
