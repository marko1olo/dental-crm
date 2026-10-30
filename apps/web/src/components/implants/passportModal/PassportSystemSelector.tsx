/**
 * PassportSystemSelector.tsx — Селектор зуба FDI, бренда системы, диаметра платформы и длины имплантата.
 * Реализует закон Хика (Hick's Law) через эргономичный тулбар и тач-таргеты (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS } from "../implantConstants";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
} from "../implantQuickPresets";

export interface PassportSystemSelectorProps {
	readonly toothFdi: number;
	readonly onToothSelect: (fdi: number) => void;
	readonly selectedBrand: string;
	readonly onBrandSelect: (brand: string) => void;
	readonly diameterMm: number;
	readonly onDiameterSelect: (dia: number) => void;
	readonly lengthMm: number;
	readonly onLengthSelect: (len: number) => void;
}

export const PassportSystemSelector: React.FC<PassportSystemSelectorProps> = ({
	toothFdi,
	onToothSelect,
	selectedBrand,
	onBrandSelect,
	diameterMm,
	onDiameterSelect,
	lengthMm,
	onLengthSelect,
}) => {
	return (
		<div className="protocol-implant-selector space-y-3.5" data-testid="protocol-implant-selector">
			{/* Селектор зуба FDI */}
			<div className="implant-form-row">
				<label className="implant-label" htmlFor="select-tooth-fdi">Зуб по формуле FDI:</label>
				<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
					<div className="flex items-center gap-1 flex-wrap">
						{FREQUENT_IMPLANT_SITES.map((fdi) => {
							const isSelected = toothFdi === fdi;
							return (
								<button
									key={fdi}
									type="button"
									onClick={() => onToothSelect(fdi)}
									className={`secondary-button min-h-[40px] px-3 font-mono font-bold text-xs ${
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
						onChange={(e) => onToothSelect(Number(e.target.value))}
						className="implant-select min-h-[40px] flex-1 min-w-[200px]"
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
						onChange={(e) => onToothSelect(Number(e.target.value))}
						min={11}
						max={48}
						className="implant-input w-16 min-h-[40px] text-center font-mono font-bold text-xs"
						data-testid="input-tooth-fdi"
						title="Прямой ввод номера зуба FDI"
					/>
				</div>
			</div>

			{/* Тулбар брендов и типоразмеры */}
			<div className="space-y-3">
				<div className="implant-form-row">
					<label className="implant-label">Бренд системы:</label>
					<div className="implant-brand-toolbar flex items-center gap-1.5 flex-wrap flex-1" role="toolbar" data-testid="implant-brand-toolbar">
						{FAST_IMPLANT_SYSTEM_PRESETS.map((preset) => {
							const isSelected = selectedBrand === preset.brand;
							return (
								<button
									key={preset.brand}
									type="button"
									onClick={() => onBrandSelect(preset.brand)}
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
							onChange={(e) => onDiameterSelect(Number(e.target.value))}
							className="implant-select min-h-[40px] flex-1"
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
							onChange={(e) => onLengthSelect(Number(e.target.value))}
							className="implant-select min-h-[40px] flex-1"
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
		</div>
	);
};

export default PassportSystemSelector;
