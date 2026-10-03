import React from "react";
import { Layers } from "lucide-react";
import { PROJECTION_TYPES, type ProjectionAngleType } from "./directRvgTypes";

export interface DirectRvgProjectionSelectorProps {
	projectionType: ProjectionAngleType;
	onSelectProjectionType: (projId: ProjectionAngleType, typicalExposureSec: number) => void;
	voltageKv?: number;
	onChangeVoltageKv?: (val: number) => void;
	currentMa?: number;
	onChangeCurrentMa?: (val: number) => void;
	exposureSec: number;
	onChangeExposureSec: (val: number) => void;
}


export const DirectRvgProjectionSelector: React.FC<DirectRvgProjectionSelectorProps> = ({
	projectionType,
	onSelectProjectionType,
	voltageKv,
	onChangeVoltageKv,
	currentMa,
	onChangeCurrentMa,
	exposureSec,
	onChangeExposureSec,
}) => {
	return (
		<div className="rvg-dock-section">
			<div className="rvg-section-header">
				<span className="rvg-section-header-title">
					<Layers className="w-3.5 h-3.5" />
					Угол проекции и экспозиция
				</span>
			</div>

			<div className="rvg-projection-chips" data-testid="rvg-projection-chips">
				{PROJECTION_TYPES.map((proj) => {
					const isActive = projectionType === proj.id;
					return (
						<button
							key={proj.id}
							type="button"
							onClick={() => onSelectProjectionType(proj.id, proj.typicalExposureSec)}
							className={`rvg-projection-btn ${isActive ? "active" : ""}`}
							data-testid={`rvg-projection-${proj.id}`}
						>
							<div className="flex flex-col min-w-0 flex-1 text-left">
								<span className="text-xs font-bold text-slate-100 truncate">
									{proj.label}
								</span>
								<span className="text-[11px] text-slate-400 font-normal truncate">
									{proj.description}
								</span>
							</div>
							<span className="text-[11px] font-mono text-teal-400 shrink-0 ml-2">
								{proj.typicalExposureSec} с
							</span>
						</button>
					);
				})}
			</div>

			{/* Clinical Exposure Adjustment (without physics kV/mA clutter per clinical mandate) */}
			<div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
				<div>
					<span className="text-[11px] text-slate-400 block">Экспозиция визиографа</span>
					<span className="text-[10px] text-slate-500">Автоматическая калибровка датчика</span>
				</div>
				<select
					value={exposureSec}
					onChange={(e) => onChangeExposureSec(Number(e.target.value))}
					className="h-8 px-2.5 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700 outline-none font-mono cursor-pointer"
					data-testid="rvg-exposure-select"
				>
					<option value={0.06}>0.06 с (быстрая)</option>
					<option value={0.08}>0.08 с (стандарт)</option>
					<option value={0.10}>0.10 с (усиленная)</option>
					<option value={0.12}>0.12 с (моляры)</option>
				</select>
			</div>
		</div>
	);
};
