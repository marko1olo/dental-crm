import React from "react";
import { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS } from "../implantConstants";

export interface ImplantToothPickerProps {
	readonly toothFdi: number;
	readonly onSelectTooth: (fdi: number) => void;
}

export const ImplantToothPicker: React.FC<ImplantToothPickerProps> = ({
	toothFdi,
	onSelectTooth,
}) => {
	return (
		<div className="implant-form-row">
			<label className="implant-label" htmlFor="select-tooth-fdi">
				Зуб по формуле FDI:
			</label>
			<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
				<div className="flex items-center gap-1 flex-wrap">
					{FREQUENT_IMPLANT_SITES.map((fdi) => {
						const isSelected = toothFdi === fdi;
						return (
							<button
								key={fdi}
								type="button"
								onClick={() => onSelectTooth(fdi)}
								className={`secondary-button min-h-[44px] px-3 font-mono font-bold text-xs ${
									isSelected ? "active bg-[var(--teal,#0d9488)] text-white" : ""
								}`}
								data-testid={`btn-quick-tooth-${fdi} btn-frequent-tooth-${fdi}`}
							>
								#{fdi}
							</button>
						);
					})}
				</div>

				<select
					id="select-tooth-fdi"
					value={toothFdi}
					onChange={(e) => onSelectTooth(Number(e.target.value))}
					className="implant-select min-h-[44px] flex-1 max-w-[200px]"
					data-testid="select-tooth-fdi select-implant-tooth"
				>
					{PERMANENT_TEETH_OPTIONS.map((tooth) => (
						<option key={tooth.fdi} value={tooth.fdi}>
							{tooth.label}
						</option>
					))}
				</select>

				<input
					type="number"
					value={toothFdi}
					onChange={(e) => onSelectTooth(Number(e.target.value))}
					min={11}
					max={48}
					className="implant-input w-16 min-h-[44px] text-center font-mono font-bold text-xs"
					data-testid="input-tooth-fdi"
					title="Прямой ввод номера зуба FDI"
				/>
			</div>
		</div>
	);
};
