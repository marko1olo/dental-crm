import React from "react";
import { Sparkles } from "lucide-react";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES } from "./radiologyMath";

export interface HotFolderFdiSelectorProps {
	selectedTeeth: string[];
	onToggleTooth: (tooth: string) => void;
	onSelectAllTeeth: () => void;
	onSelectUpperArch: () => void;
	onSelectLowerArch: () => void;
	onSelectFrontal: () => void;
	onSelectRightMolar: () => void;
	onSelectLeftMolar: () => void;
}

export const HotFolderFdiSelector: React.FC<HotFolderFdiSelectorProps> = ({
	selectedTeeth,
	onToggleTooth,
	onSelectAllTeeth,
	onSelectUpperArch,
	onSelectLowerArch,
	onSelectFrontal,
	onSelectRightMolar,
	onSelectLeftMolar,
}) => {
	return (
		<div className="space-y-2">
			<h3 className="hfi-section-title">
				<Sparkles className="w-4 h-4 text-teal-400" />
				<span>Зубная формула FDI (11–48)</span>
			</h3>

			<div className="hfi-fdi-box">
				<div className="hfi-fdi-quick-presets">
					<button
						type="button"
						onClick={onSelectAllTeeth}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-all-btn"
					>
						Все (ОПТГ)
					</button>
					<button
						type="button"
						onClick={onSelectUpperArch}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-upper-btn"
					>
						Верхняя (18-28)
					</button>
					<button
						type="button"
						onClick={onSelectLowerArch}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-lower-btn"
					>
						Нижняя (48-38)
					</button>
					<button
						type="button"
						onClick={onSelectFrontal}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-frontal-btn"
					>
						Фронтальный
					</button>
					<button
						type="button"
						onClick={onSelectRightMolar}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-right-molar-btn"
					>
						Прав. жеват.
					</button>
					<button
						type="button"
						onClick={onSelectLeftMolar}
						className="hfi-fdi-quick-chip"
						data-testid="hfi-fdi-left-molar-btn"
					>
						Лев. жеват.
					</button>
				</div>

				{/* 4-Quadrant FDI Grid */}
				<div className="hfi-fdi-grid-container" data-testid="hfi-fdi-grid">
					{/* Upper Arch (Q1: 18..11 | Q2: 21..28) */}
					<div className="hfi-fdi-arch-row">
						{ADULT_FDI_TEETH.quadrant1.map((tooth) => {
							const isSelected = selectedTeeth.includes(tooth);
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
									data-testid={`hfi-tooth-btn-${tooth}`}
									title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
								>
									{tooth}
								</button>
							);
						})}
						<div className="w-1.5 h-6 bg-slate-700/80 mx-0.5 rounded-full" />
						{ADULT_FDI_TEETH.quadrant2.map((tooth) => {
							const isSelected = selectedTeeth.includes(tooth);
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
									data-testid={`hfi-tooth-btn-${tooth}`}
									title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
								>
									{tooth}
								</button>
							);
						})}
					</div>

					<div className="hfi-fdi-divider" />

					{/* Lower Arch (Q4: 48..41 | Q3: 31..38) */}
					<div className="hfi-fdi-arch-row">
						{ADULT_FDI_TEETH.quadrant4.map((tooth) => {
							const isSelected = selectedTeeth.includes(tooth);
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
									data-testid={`hfi-tooth-btn-${tooth}`}
									title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
								>
									{tooth}
								</button>
							);
						})}
						<div className="w-1.5 h-6 bg-slate-700/80 mx-0.5 rounded-full" />
						{ADULT_FDI_TEETH.quadrant3.map((tooth) => {
							const isSelected = selectedTeeth.includes(tooth);
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
									data-testid={`hfi-tooth-btn-${tooth}`}
									title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
								>
									{tooth}
								</button>
							);
						})}
					</div>
				</div>

				<p className="hfi-selected-teeth-summary">
					Выбрано: <strong className="text-teal-300">{selectedTeeth.join(", ")}</strong>
					{selectedTeeth.length === 1 && selectedTeeth[0] && FDI_TOOTH_NAMES[selectedTeeth[0]] && (
						<span className="block text-[10px] text-gray-400 mt-0.5">
							{FDI_TOOTH_NAMES[selectedTeeth[0]]}
						</span>
					)}
				</p>
			</div>
		</div>
	);
};
