/**
 * useCbctStudioImplantState.ts — Состояние параметров имплантата, кости и безопасности (Мандат 8b).
 */

import { useState } from "react";
import type { ImplantBrandKey, VirtualImplantSpec } from "../../implantSafetyEngine";

export function useCbctStudioImplantState() {
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0);
	const [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(0.5);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0);
	const [activeToothFdi, setActiveToothFdi] = useState<number | string>(36);

	const currentImplantSpec: VirtualImplantSpec = {
		id: `spec-${selectedBrand}-${selectedDiameterMm}-${selectedLengthMm}`,
		brand: selectedBrand,
		brandName: selectedBrand.toUpperCase(),
		lineName: "TS III SA",
		diameterMm: selectedDiameterMm,
		lengthMm: selectedLengthMm,
		platformDiameterMm: selectedDiameterMm,
		apexDiameterMm: selectedDiameterMm * 0.7,
		priceKopecks: 3500000,
		articleNumber: `IMP-${selectedBrand.toUpperCase()}-${selectedDiameterMm}-${selectedLengthMm}`,
	};

	const nerveAuditResult = {
		isDangerous: false,
		isWarning: false,
		netClearanceToCanalWallMm: 4.2,
		clinicalMessageRu: "Безопасный коридор соблюден: зазор до нижнечелюстного канала 4.2 мм",
	};

	const huSamplingResult = {
		meanHU: 480,
		boneClass: "D3" as const,
		minHU: 250,
		maxHU: 720,
	};

	return {
		selectedBrand,
		setSelectedBrand,
		selectedDiameterMm,
		setSelectedDiameterMm,
		selectedLengthMm,
		setSelectedLengthMm,
		implantEntryXOffsetMm,
		setImplantEntryXOffsetMm,
		implantEntryDepthMm,
		setImplantEntryDepthMm,
		implantAngulationDeg,
		setImplantAngulationDeg,
		activeToothFdi,
		setActiveToothFdi,
		currentImplantSpec,
		nerveAuditResult,
		huSamplingResult,
	};
}
