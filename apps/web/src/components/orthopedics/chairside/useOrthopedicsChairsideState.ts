import { useState, useEffect } from "react";
import type { ShadeSystemKey } from "../../lab/shades/dentalLabShadePickerTypes";
import type { OrthopedicsChairsidePanelProps } from "./orthopedicsChairsideTypes";
import { calculateDueDateStr } from "./orthopedicsChairsideTypes";
import { calculateOrthopedicEconomics } from "../orthopedicCatalogData";

export type OrthopedicsChairsideState = ReturnType<typeof useOrthopedicsChairsideState>;

export function useOrthopedicsChairsideState({
	patientId, activeToothFdi, selectedTeeth = [], recentToothXrayUrl, initialLabOrder,
}: OrthopedicsChairsidePanelProps) {
	const [activeTeethInput, setActiveTeethInput] = useState<string>(
		initialLabOrder?.toothFdi ? String(initialLabOrder.toothFdi) : selectedTeeth.length > 0 ? selectedTeeth.join(", ") : activeToothFdi ? String(activeToothFdi) : "",
	);
	const [activeXrayUrl, setActiveXrayUrl] = useState<string | null>(recentToothXrayUrl ?? null);
	const [jawScope, setJawScope] = useState<"upper" | "lower" | "both" | "none">(() => {
		const raw = String(initialLabOrder?.toothFdi || activeToothFdi || "").replace(/\D/g, "").slice(0, 2);
		const t = raw ? Number(raw) : 0;
		if ((t >= 11 && t <= 28) || (t >= 51 && t <= 65)) return "upper";
		if ((t >= 31 && t <= 48) || (t >= 71 && t <= 85)) return "lower";
		return "upper";
	});
	const [selectedMaterial, setSelectedMaterial] = useState<string>(initialLabOrder?.material || "ZrO2 Multi-Layer");
	const [selectedShade, setSelectedShade] = useState<string>(initialLabOrder?.colorVita || "A2");
	const [selectedStumpShade, setSelectedStumpShade] = useState<string>(initialLabOrder?.stumpShade || "ND2");
	const [shadeSystem, setShadeSystem] = useState<ShadeSystemKey>("classical");
	const [activeZtlPresetId, setActiveZtlPresetId] = useState<string>("zirconia");
	const [preparationMargin, setPreparationMargin] = useState<string>("chamfer");
	const [selectedStageId, setSelectedStageId] = useState<string>("impression_scan");
	const [fixationType, setFixationType] = useState<"cement" | "screw" | "clasp">("cement");
	const [cementBrand, setCementBrand] = useState<string>("relyx_u200");
	const [hasAntagonists, setHasAntagonists] = useState<boolean>(true);
	const [articulatorType, setArticulatorType] = useState<"bio_art" | "kavo_protar" | "average_anatomical">("bio_art");
	const [hasFacebow, setHasFacebow] = useState<boolean>(false);

	const initialEcon = calculateOrthopedicEconomics("zirconia", 1);
	const [grossPriceRub, setGrossPriceRub] = useState<number>(initialEcon.grossPriceRub);
	const [ztlCostRub, setZtlCostRub] = useState<number>(initialEcon.ztlCostRub);
	const [materialsCostRub, setMaterialsCostRub] = useState<number>(initialEcon.materialsCostRub);
	const [netMarginRub, setNetMarginRub] = useState<number>(initialEcon.netMarginRub);
	const [marginPercent, setMarginPercent] = useState<number>(initialEcon.marginPercent);
	const [dueDate, setDueDate] = useState<string>(() => calculateDueDateStr(5));
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>("Клиническое решение врача");
	const [isWarrantyRework, setIsWarrantyRework] = useState<boolean>(false);
	const [warrantyLiabilityType, setWarrantyLiabilityType] = useState<"clinic_warranty" | "lab_defect">("clinic_warranty");
	const [isLabOrderSending, setIsLabOrderSending] = useState<boolean>(false);
	const [labOrderSentNumber, setLabOrderSentNumber] = useState<string | null>(null);
	const [activeOrderId, setActiveOrderId] = useState<string | null>(initialLabOrder?.id ?? null);
	const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState<boolean>(false);
	const [fittingConfirmed, setFittingConfirmed] = useState<boolean>(false);
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);

	useEffect(() => {
		if (initialLabOrder?.toothFdi) setActiveTeethInput(String(initialLabOrder.toothFdi));
		else if (selectedTeeth && selectedTeeth.length > 0) setActiveTeethInput(selectedTeeth.join(", "));
		else if (activeToothFdi) setActiveTeethInput(String(activeToothFdi));
	}, [activeToothFdi, selectedTeeth, initialLabOrder?.toothFdi]);

	useEffect(() => {
		const teethCount = Math.max(1, activeTeethInput.split(/[\s,;-]+/).map((p) => p.trim()).filter(Boolean).length);
		const econ = calculateOrthopedicEconomics(activeZtlPresetId, teethCount);
		setGrossPriceRub(econ.grossPriceRub);
		setZtlCostRub(econ.ztlCostRub);
		setMaterialsCostRub(econ.materialsCostRub);
		setNetMarginRub(econ.netMarginRub);
		setMarginPercent(econ.marginPercent);
	}, [activeZtlPresetId, activeTeethInput]);

	return {
		activeTeethInput, setActiveTeethInput, activeXrayUrl, setActiveXrayUrl, jawScope, setJawScope,
		selectedMaterial, setSelectedMaterial, selectedShade, setSelectedShade, selectedStumpShade, setSelectedStumpShade,
		shadeSystem, setShadeSystem, activeZtlPresetId, setActiveZtlPresetId, preparationMargin, setPreparationMargin,
		selectedStageId, setSelectedStageId, fixationType, setFixationType, cementBrand, setCementBrand, hasAntagonists, setHasAntagonists,
		articulatorType, setArticulatorType, hasFacebow, setHasFacebow,
		grossPriceRub, setGrossPriceRub, ztlCostRub, setZtlCostRub, materialsCostRub, setMaterialsCostRub,
		netMarginRub, setNetMarginRub, marginPercent, setMarginPercent, dueDate, setDueDate,
		overrideActive, setOverrideActive, overrideReason, setOverrideReason, isWarrantyRework, setIsWarrantyRework,
		warrantyLiabilityType, setWarrantyLiabilityType, isLabOrderSending, setIsLabOrderSending,
		labOrderSentNumber, setLabOrderSentNumber, activeOrderId, setActiveOrderId, isPassportModalOpen, setIsPassportModalOpen,
		isReadyInClinicModalOpen, setIsReadyInClinicModalOpen, fittingConfirmed, setFittingConfirmed,
		appliedProtocolId, setAppliedProtocolId,
	};
}
