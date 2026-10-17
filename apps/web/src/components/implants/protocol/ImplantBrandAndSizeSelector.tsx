import React from "react";
import { FAST_IMPLANT_SYSTEM_PRESETS, STANDARD_DIAMETERS, STANDARD_LENGTHS } from "../presets/implantPresetConstants";

export interface ImplantBrandAndSizeSelectorProps {
	readonly selectedBrand: string;
	readonly onSelectBrand: (brand: string) => void;
	readonly diameterMm: number;
	readonly setDiameterMm: (dia: number) => void;
	readonly lengthMm: number;
	readonly setLengthMm: (len: number) => void;
}

export const ImplantBrandAndSizeSelector: React.FC<ImplantBrandAndSizeSelectorProps> = ({
	selectedBrand,
	onSelectBrand,
	diameterMm,
	setDiameterMm,
	lengthMm,
	setLengthMm,
}) => {
	return (
		<div className="space-y-3">
			<div className="implant-form-row">
				<label className="implant-label">Бренд системы:</label>
				<div
					className="implant-brand-toolbar flex items-center gap-1.5 flex-wrap flex-1"
					role="toolbar"
					data-testid="implant-brand-toolbar"
				>
					{FAST_IMPLANT_SYSTEM_PRESETS.slice(0, 6).map((preset) => {
						const isSelected = selectedBrand === preset.brand;
						return (
							<button
								key={preset.brand}
								type="button"
								onClick={() => onSelectBrand(preset.brand)}
								className={`implant-system-pill secondary-button min-h-[36px] px-3 text-xs font-semibold ${
									isSelected ? "active bg-[var(--teal,#0d9488)] text-white" : ""
								}`}
								data-testid={`btn-system-${preset.brand}`}
							>
								{preset.brand}
							</button>
						);
					})}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="implant-form-row">
					<label className="implant-label" htmlFor="select-diameter">Диаметр платформы:</label>
					<select
						id="select-diameter"
						value={diameterMm}
						onChange={(e) => setDiameterMm(Number(e.target.value))}
						className="implant-select min-h-[44px] flex-1"
						data-testid="select-diameter"
					>
						{STANDARD_DIAMETERS.map((dia) => (
							<option key={dia} value={dia}>
								Ø {dia.toFixed(1)} мм
							</option>
						))}
					</select>
				</div>

				<div className="implant-form-row">
					<label className="implant-label" htmlFor="select-length">Длина имплантата:</label>
					<select
						id="select-length"
						value={lengthMm}
						onChange={(e) => setLengthMm(Number(e.target.value))}
						className="implant-select min-h-[44px] flex-1"
						data-testid="select-length"
					>
						{STANDARD_LENGTHS.map((len) => (
							<option key={len} value={len}>
								{len.toFixed(1)} мм
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};
