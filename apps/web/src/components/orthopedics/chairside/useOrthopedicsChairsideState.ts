import { useState, useEffect } from "react";
import type { OrthopedicsChairsidePanelProps } from "./orthopedicsChairsideTypes.js";
import { calculateDueDateStr } from "./orthopedicsChairsideTypes.js";

export function useOrthopedicsChairsideState({
	patientId, activeToothFdi, selectedTeeth = [], recentToothXrayUrl, initialLabOrder,
}: OrthopedicsChairsidePanelProps) {
	const [activeTeethInput, setActiveTeethInput] = useState<string>(
		initialLabOrder?.toothFdi ? String(initialLabOrder.toothFdi) : selectedTeeth.length > 0 ? selectedTeeth.join(", ") : activeToothFdi ? String(activeToothFdi) : "16",
	);
	const [activeXrayUrl, setActiveXrayUrl] = useState<string | null>(recentToothXrayUrl ?? null);
	const [jawScope, setJawScope] = useState<"upper" | "lower" | "both" | "none">(() => {
		const t = Number(String(initialLabOrder?.toothFdi || activeToothFdi || "16").replace(/\D/g, "").slice(0, 2));
		if ((t >= 11 && t <= 28) || (t >= 51 && t <= 65)) return "upper";
		if ((t >= 31 && t <= 48) || (t >= 71 && t <= 85)) return "lower";
		return "upper";
	});
	const [selectedMaterial, setSelectedMaterial] = useState<string>(initialLabOrder?.material || "ZrO2 Multi-Layer");
	const [selectedShade, setSelectedShade] = useState<string>(initialLabOrder?.colorVita || "A2");
	const [selectedStumpShade, setSelectedStumpShade] = useState<string>(initialLabOrder?.stumpShade || "ND2");
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach" | "stump">("classical");
	const [activeZtlPresetId, setActiveZtlPresetId] = useState<string>("zirconia_ml_katana");
	const [preparationMargin, setPreparationMargin] = useState<string>("chamfer");
	const [selectedStageId, setSelectedStageId] = useState<string>("impression_scan");
	const [fixationType, setFixationType] = useState<"cement" | "screw" | "clasp">("cement");
	const [hasAntagonists, setHasAntagonists] = useState<boolean>(true);
	const [grossPriceRub, setGrossPriceRub] = useState<number>(24000);
	const [ztlCostRub, setZtlCostRub] = useState<number>(7500);
	const [materialsCostRub, setMaterialsCostRub] = useState<number>(1200);
	const [netMarginRub, setNetMarginRub] = useState<number>(15300);
	const [marginPercent, setMarginPercent] = useState<number>(64);
	const [dueDate, setDueDate] = useState<string>(() => calculateDueDateStr(5));
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>("Клиническое решение врача");
	const [isWarrantyRework, setIsWarrantyRework] = useState<boolean>(false);
	const [warrantyLiabilityType, setWarrantyLiabilityType] = useState<"clinic" | "lab_defect">("clinic");
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

	return {
		activeTeethInput, setActiveTeethInput, activeXrayUrl, setActiveXrayUrl, jawScope, setJawScope,
		selectedMaterial, setSelectedMaterial, selectedShade, setSelectedShade, selectedStumpShade, setSelectedStumpShade,
		shadeSystem, setShadeSystem, activeZtlPresetId, setActiveZtlPresetId, preparationMargin, setPreparationMargin,
		selectedStageId, setSelectedStageId, fixationType, setFixationType, hasAntagonists, setHasAntagonists,
		grossPriceRub, setGrossPriceRub, ztlCostRub, setZtlCostRub, materialsCostRub, setMaterialsCostRub,
		netMarginRub, setNetMarginRub, marginPercent, setMarginPercent, dueDate, setDueDate,
		overrideActive, setOverrideActive, overrideReason, setOverrideReason, isWarrantyRework, setIsWarrantyRework,
		warrantyLiabilityType, setWarrantyLiabilityType, isLabOrderSending, setIsLabOrderSending,
		labOrderSentNumber, setLabOrderSentNumber, activeOrderId, setActiveOrderId, isPassportModalOpen, setIsPassportModalOpen,
		isReadyInClinicModalOpen, setIsReadyInClinicModalOpen, fittingConfirmed, setFittingConfirmed,
		appliedProtocolId, setAppliedProtocolId,
	};
}
