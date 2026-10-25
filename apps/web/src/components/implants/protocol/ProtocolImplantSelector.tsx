/**
 * ProtocolImplantSelector.tsx — Компонент выбора зуба FDI и параметров имплантата (Мандаты 8b, 8am).
 * Anti-Hollow-Card: фон var(--paper-card,var(--paper)), 1px граница var(--line), кнопки 36px.
 */
import React from "react";
import { ImplantToothPicker } from "./ImplantToothPicker";
import { ImplantBrandAndSizeSelector } from "./ImplantBrandAndSizeSelector";

export interface ProtocolImplantSelectorProps {
	readonly toothFdi: number;
	readonly onSelectTooth: (fdi: number) => void;
	readonly selectedBrand: string;
	readonly onSelectBrand: (brand: string) => void;
	readonly diameterMm: number;
	readonly setDiameterMm: (dia: number) => void;
	readonly lengthMm: number;
	readonly setLengthMm: (len: number) => void;
}

export const ProtocolImplantSelector: React.FC<ProtocolImplantSelectorProps> = ({
	toothFdi,
	onSelectTooth,
	selectedBrand,
	onSelectBrand,
	diameterMm,
	setDiameterMm,
	lengthMm,
	setLengthMm,
}) => {
	return (
		<div className="protocol-implant-selector space-y-3.5" data-testid="protocol-implant-selector">
			<ImplantToothPicker toothFdi={toothFdi} onSelectTooth={onSelectTooth} />
			<ImplantBrandAndSizeSelector
				selectedBrand={selectedBrand}
				onSelectBrand={onSelectBrand}
				diameterMm={diameterMm}
				setDiameterMm={setDiameterMm}
				lengthMm={lengthMm}
				setLengthMm={setLengthMm}
			/>
		</div>
	);
};

export default ProtocolImplantSelector;
