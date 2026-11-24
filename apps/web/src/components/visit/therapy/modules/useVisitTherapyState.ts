import { useState, useEffect, useCallback, useMemo } from "react";
import {
	type TherapyPresetId, type TherapyProtocolPreset, type CompositeMaterialBrand,
	type AdhesiveSystemBrand, type BlackCavityClass, detectBlackClass,
	calculateRestorationWarrantyMonths, resolve804nServicesForRestoration, generateTherapySoapProtocol,
	resolveBlackRestorationService, generateUuidV7, kopecksToRubles,
} from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";
import { clientLogger } from "../../../../services/logging/clientLogger";

export interface UseVisitTherapyStateParams {
	activeTooth?: number | null | undefined;
	activeSurfaces?: readonly string[] | undefined;
	onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	onApplyProtocolText?: ((text: string) => void) | undefined;
	onAddToInvoice?: ((services: readonly { code: string; nameRu: string; priceKopecks?: number; [key: string]: unknown }[]) => void) | undefined;
}

export function useVisitTherapyState({
	activeTooth = 16, activeSurfaces, onSelectSurfaces, onApplyProtocolText, onAddToInvoice,
}: UseVisitTherapyStateParams) {
	const isToothSelected = Boolean(activeTooth && activeTooth >= 11 && activeTooth <= 85);
	const effectiveTooth = isToothSelected ? (activeTooth as number) : 16;
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
			const fallbackSurface = isAnterior ? "I" : "O";
			const sanitized = next.length > 0 ? next : [fallbackSurface];
			onSelectSurfaces?.(sanitized);
			return sanitized;
		});
	}, [isAnterior, onSelectSurfaces]);

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
	const therapyServices = useMemo(() => resolve804nServicesForRestoration({ toothNumber: effectiveTooth, surfaces: selectedSurfaces, isAestheticFrontal: activePresetId === "frontal_aesthetic_restoration" || isAnterior, hasOldRestorationRemoval: activePresetId === "failed_filling_replacement", includeFluoridation }), [effectiveTooth, selectedSurfaces, activePresetId, isAnterior, includeFluoridation]);
	const services804n = therapyServices;
	const soapResult = useMemo(() => generateTherapySoapProtocol({ toothNumber: effectiveTooth, surfaces: selectedSurfaces, presetId: activePresetId, compositeBrand: selectedComposite, adhesiveBrand: selectedAdhesive, shadeDentin: activePresetId === "frontal_aesthetic_restoration" ? shadeDentin : undefined, shadeEnamel: activePresetId === "frontal_aesthetic_restoration" ? shadeEnamel : undefined, isBruxismRisk, includeFluoridation }), [effectiveTooth, selectedSurfaces, activePresetId, selectedComposite, selectedAdhesive, shadeDentin, shadeEnamel, isBruxismRisk, includeFluoridation]);

	const handleInsertToClinicalDiary = useCallback(() => {
		if (!isToothSelected && (activeTooth === null || activeTooth === 0)) {
			showToast("Выберите зуб на зубной формуле перед фиксацией протокола", "warning", 3000);
			return;
		}
		const text = soapResult.fullProtocolText;
		onApplyProtocolText?.(text);
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev, objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${text}` : text,
			}));
		} catch (err) {
			clientLogger.error("Ошибка при обновлении visitNoteForm", err, { module: "useVisitTherapyState" });
		}
		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: { diagnosisIcd10: soapResult.diagnosisIcd10, treatmentDescription: soapResult.treatmentDescription, statusLocalis: soapResult.statusLocalis, anamnesis: soapResult.anamnesisMorbi, complaints: soapResult.subjectiveComplaints, recommendations: soapResult.recommendations },
					finding: { toothNumber: effectiveTooth, state: "Filled", surfaces: [...selectedSurfaces] },
					mode: "smart_append", immediate: true,
				},
			}));
		} catch (err) {
			clientLogger.error("Ошибка при отправке события dente-apply-soap-protocol", err, { module: "useVisitTherapyState" });
		}
		showToast(`Протокол лечения зуба ${effectiveTooth} внесен в дневник приёма`, "success", 3000);
	}, [isToothSelected, activeTooth, soapResult, effectiveTooth, selectedSurfaces, onApplyProtocolText]);

	const handleAddServicesToInvoice = useCallback(() => {
		if (!isToothSelected && (activeTooth === null || activeTooth === 0)) {
			showToast("Выберите зуб на зубной формуле для добавления услуг в смету", "warning", 3000);
			return;
		}

		const blackServiceResolution = resolveBlackRestorationService(selectedSurfaces);

		const invoiceServices = therapyServices.map((s) => {
			const isRestoration = s.code.startsWith("A16.07.002");
			const priceKopecks = isRestoration
				? blackServiceResolution.priceKopecks
				: s.code === "A16.07.031"
					? 150_000
					: s.code === "A16.07.025"
						? 80_000
						: 200_000;
			const priceRub = kopecksToRubles(priceKopecks);
			const idempotencyKey = generateUuidV7();

			return {
				code: s.code,
				code804n: s.code,
				name: s.nameRu,
				nameRu: s.nameRu,
				toothNumber: effectiveTooth,
				toothCode: String(effectiveTooth),
				quantity: 1,
				priceKopecks,
				priceRub,
				idempotencyKey,
			};
		});

		onAddToInvoice?.(invoiceServices);
		try {
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					idempotencyKey: generateUuidV7(),
					toothNumber: effectiveTooth,
					toothCode: String(effectiveTooth),
					services: invoiceServices,
				},
			}));
		} catch (err) {
			console.error("[useVisitTherapyState] Ошибка при отправке события dente-add-services-to-invoice:", err);
		}
		const codesList = therapyServices.map((s) => s.code).join(", ");
		showToast(`Услуги (${codesList}) добавлены в смету зуба ${effectiveTooth}`, "success", 3500);
	}, [isToothSelected, activeTooth, therapyServices, effectiveTooth, selectedSurfaces, onAddToInvoice]);

	return {
		effectiveTooth, isToothSelected, isAnterior, activePresetId, selectedSurfaces, selectedComposite, setSelectedComposite,
		selectedAdhesive, setSelectedAdhesive, shadeDentin, setShadeDentin, shadeEnamel, setShadeEnamel,
		showDetailsAccordion, setShowDetailsAccordion, blackClass, warranty, therapyServices, services804n, soapResult,
		toggleSurface, handleApplySurfacePreset, handleSelectPreset, handleInsertToClinicalDiary, handleAddServicesToInvoice,
	};
}
