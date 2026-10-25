import { useState, useEffect, useCallback, useMemo } from "react";
import {
	type TherapyPresetId, type TherapyProtocolPreset, type CompositeMaterialBrand,
	type AdhesiveSystemBrand, type BlackCavityClass, detectBlackClass,
	calculateRestorationWarrantyMonths, resolve804nServicesForRestoration, generateTherapySoapProtocol,
} from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";

export interface UseVisitTherapyStateParams {
	activeTooth?: number | null | undefined;
	activeSurfaces?: readonly string[] | undefined;
	onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	onApplyProtocolText?: ((text: string) => void) | undefined;
	onAddToInvoice?: ((services: readonly { code: string; nameRu: string }[]) => void) | undefined;
}

export function useVisitTherapyState({
	activeTooth = 16, activeSurfaces, onSelectSurfaces, onApplyProtocolText, onAddToInvoice,
}: UseVisitTherapyStateParams) {
	const effectiveTooth = activeTooth && activeTooth >= 11 && activeTooth <= 85 ? activeTooth : 16;
	const isAnterior = (effectiveTooth % 10) >= 1 && (effectiveTooth % 10) <= 3;

	const [activePresetId, setActivePresetId] = useState<TherapyPresetId>(() => isAnterior ? "frontal_aesthetic_restoration" : "caries_composite");
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => (activeSurfaces && activeSurfaces.length > 0) ? [...activeSurfaces] : (isAnterior ? ["M", "I", "D"] : ["O"]));
	const [selectedComposite, setSelectedComposite] = useState<CompositeMaterialBrand>("filtek_ultimate");
	const [selectedAdhesive, setSelectedAdhesive] = useState<AdhesiveSystemBrand>("optibond_fl");
	const [shadeDentin, setShadeDentin] = useState<string>("A3B");
	const [shadeEnamel, setShadeEnamel] = useState<string>("A2E");
	const [isBruxismRisk] = useState<boolean>(false);
	const [includeFluoridation, setIncludeFluoridation] = useState<boolean>(false);
	const [showDetailsAccordion, setShowDetailsAccordion] = useState<boolean>(false);

	useEffect(() => {
		if (activeSurfaces && activeSurfaces.length > 0) {
			setSelectedSurfaces([...activeSurfaces]);
		} else {
			const anterior = (effectiveTooth % 10) >= 1 && (effectiveTooth % 10) <= 3;
			setSelectedSurfaces(anterior ? ["M", "I", "D"] : ["O"]);
			setActivePresetId(anterior ? "frontal_aesthetic_restoration" : "caries_composite");
			setSelectedComposite(anterior ? "estelite_asteria" : "filtek_ultimate");
		}
	}, [effectiveTooth, activeSurfaces]);

	const toggleSurface = useCallback((surf: string) => {
		setSelectedSurfaces((prev) => {
			const next = prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf];
			const sanitized = next.length > 0 ? next : ["O"];
			onSelectSurfaces?.(sanitized);
			return sanitized;
		});
	}, [onSelectSurfaces]);

	const handleApplySurfacePreset = useCallback((surfs: readonly string[]) => {
		setSelectedSurfaces([...surfs]);
		onSelectSurfaces?.([...surfs]);
	}, [onSelectSurfaces]);

	const handleSelectPreset = useCallback((preset: TherapyProtocolPreset) => {
		setActivePresetId(preset.id);
		setSelectedComposite(preset.compositeDefault);
		setSelectedAdhesive(preset.adhesiveDefault);
		if (preset.defaultSurfaces.length > 0) {
			setSelectedSurfaces([...preset.defaultSurfaces]);
			onSelectSurfaces?.([...preset.defaultSurfaces]);
		}
		if (preset.id === "wedge_defect_erosion") setIncludeFluoridation(true);
		showToast(`Выбран протокол: «${preset.shortLabelRu}»`, "info", 2000);
	}, [onSelectSurfaces]);

	const blackClass = useMemo<BlackCavityClass>(() => detectBlackClass(effectiveTooth, selectedSurfaces), [effectiveTooth, selectedSurfaces]);
	const warranty = useMemo(() => calculateRestorationWarrantyMonths({ toothNumber: effectiveTooth, surfacesCount: selectedSurfaces.length, compositeBrand: selectedComposite, isBruxismRisk }), [effectiveTooth, selectedSurfaces.length, selectedComposite, isBruxismRisk]);
	const services804n = useMemo(() => resolve804nServicesForRestoration({ toothNumber: effectiveTooth, surfaces: selectedSurfaces, isAestheticFrontal: activePresetId === "frontal_aesthetic_restoration" || isAnterior, hasOldRestorationRemoval: activePresetId === "failed_filling_replacement", includeFluoridation }), [effectiveTooth, selectedSurfaces, activePresetId, isAnterior, includeFluoridation]);
	const soapResult = useMemo(() => generateTherapySoapProtocol({ toothNumber: effectiveTooth, surfaces: selectedSurfaces, presetId: activePresetId, compositeBrand: selectedComposite, adhesiveBrand: selectedAdhesive, shadeDentin: activePresetId === "frontal_aesthetic_restoration" ? shadeDentin : undefined, shadeEnamel: activePresetId === "frontal_aesthetic_restoration" ? shadeEnamel : undefined, isBruxismRisk, includeFluoridation }), [effectiveTooth, selectedSurfaces, activePresetId, selectedComposite, selectedAdhesive, shadeDentin, shadeEnamel, isBruxismRisk, includeFluoridation]);

	const handleInsertToClinicalDiary = useCallback(() => {
		const text = soapResult.fullProtocolText043;
		onApplyProtocolText?.(text);
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev, objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${text}` : text,
			}));
		} catch { /* fallback */ }
		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: { diagnosisIcd10: soapResult.diagnosisIcd10, treatmentDescription: soapResult.treatmentDescription, statusLocalis: soapResult.statusLocalis, anamnesis: soapResult.anamnesisMorbi, complaints: soapResult.subjectiveComplaints, recommendations: soapResult.recommendations },
					finding: { toothNumber: effectiveTooth, state: "Filled", surfaces: [...selectedSurfaces] },
					mode: "smart_append", immediate: true,
				},
			}));
		} catch { /* fallback */ }
		showToast(`Протокол лечения зуба ${effectiveTooth} внесен в дневник приёма`, "success", 3000);
	}, [soapResult, effectiveTooth, selectedSurfaces, onApplyProtocolText]);

	const handleAddServicesToInvoice = useCallback(() => {
		onAddToInvoice?.(services804n);
		try {
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { toothNumber: effectiveTooth, services: services804n } }));
		} catch { /* fallback */ }
		const codesList = services804n.map((s) => s.code).join(", ");
		showToast(`Услуги (${codesList}) добавлены в смету зуба ${effectiveTooth}`, "success", 3500);
	}, [services804n, effectiveTooth, onAddToInvoice]);

	return {
		effectiveTooth, isAnterior, activePresetId, selectedSurfaces, selectedComposite, setSelectedComposite,
		selectedAdhesive, setSelectedAdhesive, shadeDentin, setShadeDentin, shadeEnamel, setShadeEnamel,
		showDetailsAccordion, setShowDetailsAccordion, blackClass, warranty, services804n, soapResult,
		toggleSurface, handleApplySurfacePreset, handleSelectPreset, handleInsertToClinicalDiary, handleAddServicesToInvoice,
	};
}
