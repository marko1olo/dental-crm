import { useEffect, useState } from "react";
import { generateUuidV7, type WarrantyItem } from "../../warrantyEngine.js";
import { DENTAL_MATERIALS_CATALOG, getWarrantyPreset, type StarQuickPreset, type WarrantyCategory } from "../../warrantyPresets.js";
import { mapCompletedStagesToWarrantyItems } from "../constants";
import type { CompletedTreatmentStage } from "../types";

export interface UseWarrantyItemsSelectionParams {
	isOpen: boolean;
	initialCategory: WarrantyCategory;
	initialTeeth?: string[];
	completedStages?: CompletedTreatmentStage[];
}

export function useWarrantyItemsSelection({ isOpen, initialCategory, initialTeeth = [], completedStages = [] }: UseWarrantyItemsSelectionParams) {
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth.length > 0 ? initialTeeth : ["1.6"]);
	const [activeCategory, setActiveCategory] = useState<WarrantyCategory>(initialCategory);
	const [currentWorkTitle, setCurrentWorkTitle] = useState("");
	const [currentMaterial, setCurrentMaterial] = useState("");
	const [currentManufacturer, setCurrentManufacturer] = useState("");
	const [currentCountry, setCurrentCountry] = useState("");
	const [currentShade, setCurrentShade] = useState("A2");
	const [currentLot, setCurrentLot] = useState("");
	const [currentServiceCode804n, setCurrentServiceCode804n] = useState(getWarrantyPreset(initialCategory).serviceCode804n);
	const [currentLabOrderNumber, setCurrentLabOrderNumber] = useState("");
	const [customWarrantyMonths, setCustomWarrantyMonths] = useState<number | undefined>(undefined);
	const [items, setItems] = useState<WarrantyItem[]>([]);

	useEffect(() => {
		if (!isOpen) return;
		const preset = getWarrantyPreset(initialCategory);
		setActiveCategory(initialCategory);
		setCurrentWorkTitle(preset.title);
		setCurrentServiceCode804n(preset.serviceCode804n);
		setCurrentLabOrderNumber("");
		const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === initialCategory);
		if (mat) {
			setCurrentMaterial(mat.name);
			setCurrentManufacturer(mat.manufacturer);
			setCurrentCountry(mat.country);
			setCurrentShade(mat.popularShades?.[0] ?? "A2");
		}
		if (completedStages.length > 0) {
			setItems(mapCompletedStagesToWarrantyItems(completedStages));
		} else {
			const teethList = initialTeeth.length > 0 ? initialTeeth : ["1.6"];
			setItems(teethList.map((tooth) => ({
				id: generateUuidV7(), toothNumber: tooth, category: initialCategory, clinicalWorkTitle: preset.title,
				materialName: mat?.name ?? preset.recommendedMaterials[0] ?? "Композит", manufacturer: mat?.manufacturer ?? preset.popularManufacturers[0] ?? "3M ESPE",
				country: mat?.country ?? "США", vitaShade: "A2", serviceCode804n: preset.serviceCode804n,
				baseWarrantyMonths: preset.baseWarrantyMonths, baseServiceLifeMonths: preset.baseServiceLifeMonths,
			})));
		}
	}, [isOpen, initialCategory, initialTeeth.join(","), completedStages.map((s) => `${s.toothNumber ?? ""}-${s.serviceTitle}`).join(",")]);

	const handleSelectCategory = (cat: WarrantyCategory) => {
		setActiveCategory(cat);
		const preset = getWarrantyPreset(cat);
		setCurrentWorkTitle(preset.title);
		setCurrentServiceCode804n(preset.serviceCode804n);
		const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === cat);
		setCurrentMaterial(mat?.name ?? preset.recommendedMaterials[0] ?? "");
		setCurrentManufacturer(mat?.manufacturer ?? preset.popularManufacturers[0] ?? "");
		setCurrentCountry(mat?.country ?? "Германия");
		setCurrentShade(mat?.popularShades?.[0] ?? "A2");
		setCustomWarrantyMonths(undefined);
	};

	const handleSelectMaterialMeta = (mat: (typeof DENTAL_MATERIALS_CATALOG)[0]) => {
		setCurrentMaterial(mat.name);
		setCurrentManufacturer(mat.manufacturer);
		setCurrentCountry(mat.country);
		if (mat.popularShades?.[0]) setCurrentShade(mat.popularShades[0]);
		setCustomWarrantyMonths(mat.warrantyMonthsDefault);
	};

	const toggleTooth = (tooth: string) => {
		const formatted = tooth.includes(".") ? tooth : `${tooth[0]}.${tooth[1]}`;
		setSelectedTeeth((prev) => (prev.includes(formatted) ? prev.filter((t) => t !== formatted) : [...prev, formatted]));
	};

	const handleAddItem = () => {
		const preset = getWarrantyPreset(activeCategory);
		const targetTeeth = selectedTeeth.length > 0 ? selectedTeeth : ["Общая конструкция / Челюсть"];
		setItems((prev) => [...prev, ...targetTeeth.map((tooth) => ({
			id: generateUuidV7(), toothNumber: tooth, category: activeCategory, clinicalWorkTitle: currentWorkTitle || preset.title,
			materialName: currentMaterial || preset.recommendedMaterials[0] || "Стоматологический материал", manufacturer: currentManufacturer || preset.popularManufacturers[0] || "Производитель",
			country: currentCountry || "Германия", vitaShade: currentShade || undefined, lotNumber: currentLot.trim() || undefined,
			serviceCode804n: currentServiceCode804n.trim() || preset.serviceCode804n, labOrderNumber: currentLabOrderNumber.trim() || undefined,
			baseWarrantyMonths: customWarrantyMonths ?? preset.baseWarrantyMonths, baseServiceLifeMonths: preset.baseServiceLifeMonths,
		}))]);
		setCurrentLot("");
		setCurrentLabOrderNumber("");
	};

	const handleRemoveItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
	const handleImportCompletedStages = () => completedStages.length && setItems(mapCompletedStagesToWarrantyItems(completedStages));
	const handleApplyStarQuickPreset = (qp: StarQuickPreset) => {
		setActiveCategory(qp.category);
		setCurrentWorkTitle(qp.title);
		setCurrentMaterial(qp.materialName);
		setCurrentManufacturer(qp.manufacturer);
		setCurrentCountry(qp.country);
		setCurrentServiceCode804n(qp.serviceCode804n);
		setCustomWarrantyMonths(qp.warrantyMonths);
	};

	return {
		selectedTeeth, setSelectedTeeth, toggleTooth, activeCategory, setActiveCategory,
		currentWorkTitle, setCurrentWorkTitle, currentMaterial, setCurrentMaterial,
		currentManufacturer, setCurrentManufacturer, currentCountry, setCurrentCountry,
		currentShade, setCurrentShade, currentLot, setCurrentLot,
		currentServiceCode804n, setCurrentServiceCode804n, currentLabOrderNumber, setCurrentLabOrderNumber,
		items, setItems, handleSelectCategory, handleSelectMaterialMeta,
		handleAddItem, handleRemoveItem, handleImportCompletedStages, handleApplyStarQuickPreset,
	};
}
