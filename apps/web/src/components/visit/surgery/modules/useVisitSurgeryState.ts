import { useState } from "react";
import { showToast } from "../../../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	buildStandardImplantationProtocolText,
	buildStandardExtractionProtocolText,
	type SurgicalOperationNorm,
	type StandardImplantationParams,
	type SurgicalServiceItem,
} from "../../../surgery/surgeryProtocols";
import { useSurgerySyncDiary } from "./useSurgerySyncDiary";
import {
	executeApplyToVisitDiary,
	executePrintProtocol,
	executePrintIds,
	executeQuickDeduct,
} from "./visitSurgeryActions";

export interface UseVisitSurgeryStateParams {
	readonly activeTooth?: number | null | undefined;
	readonly onSelectActiveTooth?: ((tooth: number) => void) | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onApplyToDiary?: ((protocolText: string) => void) | undefined;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

export function useVisitSurgeryState(params: UseVisitSurgeryStateParams) {
	const { activeTooth = 46, onSelectActiveTooth, patientName = "Пациент", doctorName = "Хирург-имплантолог", onApplyToDiary } = params;
	const [selectedTooth, setSelectedTooth] = useState<number>(activeTooth ?? 46);
	const [selectedNormId, setSelectedNormId] = useState<string>("surgery_implant_standard");
	const [protocolText, setProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [isSterileGloveMode, setIsSterileGloveMode] = useState<boolean>(true);
	const [isImplantModalOpen, setIsImplantModalOpen] = useState<boolean>(false);
	const [hasWarehouseDelay, setHasWarehouseDelay] = useState<boolean>(false);
	const [isMaterialsDeducted, setIsMaterialsDeducted] = useState<boolean>(false);

	const [implantBrand, setImplantBrand] = useState<string>("Dentium");
	const [implantDiameter, setImplantDiameter] = useState<number>(4.0);
	const [implantLength, setImplantLength] = useState<number>(10.0);
	const [implantTorque, setImplantTorque] = useState<number>(35);
	const [implantIsq, setImplantIsq] = useState<number>(72);
	const [implantCap, setImplantCap] = useState<"fdm" | "plug">("fdm");
	const [implantSuture, setImplantSuture] = useState<string>("Prolene 4-0");

	const effectiveTooth = activeTooth ?? selectedTooth;
	useSurgerySyncDiary(protocolText);

	const handleToothSelect = (t: number) => { setSelectedTooth(t); onSelectActiveTooth?.(t); };
	const currentNorm = SURGICAL_OPERATION_NORMS.find((n) => n.id === selectedNormId) ?? SURGICAL_OPERATION_NORMS[0]!;
	const overdraftStatus = evaluateWarehouseOverdraft(currentNorm.requiredMaterials, hasWarehouseDelay);

	const handleNormClick = (norm: SurgicalOperationNorm) => {
		setSelectedNormId(norm.id);
		if (norm.id === "surgery_implant_standard") {
			setProtocolText(buildStandardImplantationProtocolText({
				toothFdi: effectiveTooth, brand: implantBrand, diameterMm: implantDiameter,
				lengthMm: implantLength, torqueNcm: implantTorque, isq: implantIsq,
				capType: implantCap, sutureMaterial: implantSuture, postOpXray: true,
			}));
		} else if (norm.category === "extraction") {
			const complexity = norm.id === "surgery_extraction_complex" ? "complex" : norm.id === "surgery_extraction_atypical" ? "impacted_dystopic" : "simple";
			setProtocolText(buildStandardExtractionProtocolText({
				toothFdi: effectiveTooth, complexity, hemostasis: ["alvogyl", "hemostatic_sponge", "vicryl_suture", "tampon"], sutureMaterial: "Викрил 4-0", postOpXray: true,
			}));
		} else {
			setProtocolText(norm.standardProtocolTextRu);
		}
		if (norm.defaultToothFdi && !activeTooth) handleToothSelect(norm.defaultToothFdi);
		showToast(`Норма операции: «${norm.title}»`, "success");
	};

	const handleApplyStandardImplantationPreset = (overrides?: Partial<StandardImplantationParams>) => {
		setSelectedNormId("surgery_implant_standard");
		const brand = overrides?.brand ?? implantBrand;
		const dia = overrides?.diameterMm ?? implantDiameter;
		const len = overrides?.lengthMm ?? implantLength;
		const torque = overrides?.torqueNcm ?? implantTorque;
		const isq = overrides?.isq ?? implantIsq;
		const cap = overrides?.capType ?? implantCap;
		const suture = overrides?.sutureMaterial ?? implantSuture;
		if (overrides?.brand) setImplantBrand(overrides.brand);
		if (overrides?.diameterMm) setImplantDiameter(overrides.diameterMm);
		if (overrides?.lengthMm) setImplantLength(overrides.lengthMm);
		if (overrides?.torqueNcm) setImplantTorque(overrides.torqueNcm);
		if (overrides?.isq) setImplantIsq(overrides.isq);
		if (overrides?.capType) setImplantCap(overrides.capType);
		if (overrides?.sutureMaterial) setImplantSuture(overrides.sutureMaterial);

		setProtocolText(buildStandardImplantationProtocolText({
			toothFdi: effectiveTooth, brand, diameterMm: dia, lengthMm: len, torqueNcm: torque, isq, capType: cap, sutureMaterial: suture, postOpXray: true,
		}));
		showToast(`✓ Физиологическая норма: ${brand} Ø${dia}×${len} мм, 35 Н/см, ISQ ${isq}, ${cap === "fdm" ? "ФДМ" : "Заглушка"}, ${suture}`, "success");
	};

	const handleApplyToVisitDiary = () => executeApplyToVisitDiary(protocolText, onApplyToDiary);
	const handlePrintProtocol = () => executePrintProtocol({
		patientName, doctorName, currentNorm, effectiveTooth, protocolText,
		implantDetails: selectedNormId === "surgery_implant_standard" ? { implantBrand, diameterMm: implantDiameter, lengthMm: implantLength, torqueNcm: implantTorque, isq: implantIsq, capType: implantCap, sutureMaterial: implantSuture } : undefined,
	});
	const handlePrintSurgicalIds = () => executePrintIds(patientName, doctorName, currentNorm.title, effectiveTooth);
	const handleQuickDeductWarehouseMaterials = async () => {
		const ok = await executeQuickDeduct({ currentNorm, hasWarehouseDelay, effectiveTooth, implantBrand: currentNorm.category === "implant" ? implantBrand : undefined, implantSuture: currentNorm.category === "implant" ? implantSuture : undefined });
		if (ok) setIsMaterialsDeducted(true);
	};
	const handleCopy = () => { navigator.clipboard?.writeText(protocolText); showToast("Протокол операции скопирован", "success"); };

	return {
		selectedTooth, setSelectedTooth, effectiveTooth, selectedNormId, currentNorm, protocolText, setProtocolText,
		isSterileGloveMode, setIsSterileGloveMode, isImplantModalOpen, setIsImplantModalOpen, hasWarehouseDelay, setHasWarehouseDelay,
		isMaterialsDeducted, implantBrand, setImplantBrand, implantDiameter, setImplantDiameter, implantLength, setImplantLength,
		implantTorque, setImplantTorque, implantIsq, setImplantIsq, implantCap, setImplantCap, implantSuture, setImplantSuture,
		overdraftStatus, handleToothSelect, handleNormClick, handleApplyStandardImplantationPreset, handleApplyToVisitDiary,
		handlePrintProtocol, handlePrintSurgicalIds, handleQuickDeductWarehouseMaterials, handleCopy,
	};
}
