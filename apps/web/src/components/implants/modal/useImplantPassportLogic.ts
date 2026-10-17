import { useState, useEffect } from "react";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	getBoneDensityByToothFdi,
	type FastImplantPassportData,
	type MischDensity,
	type ImplantCapType,
	type ImplantWarehouseStockItem,
	type ImplantConsumablesStock,
	DEFAULT_CANONICAL_IMPLANT_STOCK,
	DEFAULT_CANONICAL_CONSUMABLES,
} from "../implantQuickPresets";
import { buildAssembledPassportData } from "./assemblePassportData";

export interface UseImplantPassportLogicParams {
	readonly isOpen: boolean;
	readonly initialTooth: number;
	readonly initialTab?: "protocol" | "isq" | "diary" | "passport";
	readonly inventoryOverdraftActive?: boolean;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly onSavePassport?: (data: FastImplantPassportData) => void;
	readonly onInsertIntoDiary?: (diaryText: string) => void;
	readonly onClose: () => void;
}

export function useImplantPassportLogic(params: {
	isOpen: boolean;
	initialTooth: number;
	initialTab?: "protocol" | "isq" | "diary" | "passport";
	inventoryOverdraftActive?: boolean;
	patientName: string;
	patientId: string;
	doctorName: string;
	doctorId: string;
	onSavePassport?: (data: FastImplantPassportData) => void;
	onInsertIntoDiary?: (diaryText: string) => void;
	onClose: () => void;
}) {
	const [toothFdi, setToothFdi] = useState<number>(params.initialTooth);
	const [selectedBrand, setSelectedBrand] = useState<string>("Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35);
	const [boneDensity, setBoneDensity] = useState<MischDensity>(() => getBoneDensityByToothFdi(params.initialTooth));
	const [isqValue, setIsqValue] = useState<number>(72);
	const [capType, setCapType] = useState<ImplantCapType>("fdm");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [lotNumber, setLotNumber] = useState<string>("24C1208");
	const [serialNumber, setSerialNumber] = useState<string>("SN-884210");
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isOverdraftDismissed, setIsOverdraftDismissed] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<"protocol" | "isq" | "diary" | "passport">(params.initialTab || "protocol");
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(false);
	const [isIsqEnabled, setIsIsqEnabled] = useState<boolean>(false);

	const [stockItems, setStockItems] = useState<readonly ImplantWarehouseStockItem[]>(DEFAULT_CANONICAL_IMPLANT_STOCK);
	const [stockConsumables, setStockConsumables] = useState<ImplantConsumablesStock>(DEFAULT_CANONICAL_CONSUMABLES);
	const [selectedStockItemId, setSelectedStockItemId] = useState<string>("inv-oss-4010");
	const [expirationDate, setExpirationDate] = useState<string>("2028-11-30");
	const [selectedGraftId, setSelectedGraftId] = useState<string>("inv-bio-oss-05");
	const [selectedMembraneId, setSelectedMembraneId] = useState<string>("inv-bio-gide-1622");
	const [selectedSutureId, setSelectedSutureId] = useState<string>("inv-vicryl-40");
	const [operationPriceRub, setOperationPriceRub] = useState<number>(45000);
	const [implantCostRub, setImplantCostRub] = useState<number>(12500);

	useEffect(() => {
		let isCancelled = false;
		async function fetchStock() {
			try {
				const res = await fetch("/api/clinical/implants/stock");
				if (!res.ok) return;
				const data = await res.json();
				if (!isCancelled && data.success && Array.isArray(data.implants) && data.implants.length > 0) {
					setStockItems(data.implants);
				}
			} catch { /* offline fallback */ }
		}
		if (params.isOpen) fetchStock();
		return () => { isCancelled = true; };
	}, [params.isOpen]);

	const selectedSystem = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === selectedBrand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const activeGraft = stockConsumables.grafts.find((g) => g.id === selectedGraftId) ?? stockConsumables.grafts[0];
	const activeMembrane = stockConsumables.membranes.find((m) => m.id === selectedMembraneId) ?? stockConsumables.membranes[0];
	const activeSuture = stockConsumables.sutures.find((s) => s.id === selectedSutureId) ?? stockConsumables.sutures[0];

	const consumablesCostRub = isGbrPerformed ? Number(activeGraft?.unitCostRub || 0) + Number(activeMembrane?.unitCostRub || 0) + Number(activeSuture?.unitCostRub || 0) : 0;
	const doctorGrossMarginRub = Math.max(0, operationPriceRub - (implantCostRub + consumablesCostRub));
	const isImmediateLoadingFeasible = torqueNcm >= 35 && torqueNcm <= 55 && (isIsqEnabled ? isqValue : 72) >= 70;

	const assembledData = buildAssembledPassportData({
		toothFdi, brand: selectedSystem.brand, model: selectedSystem.model, catalogArticle,
		diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity,
		isqDay0: isIsqEnabled ? isqValue : 72, capType, patientName: params.patientName,
		patientId: params.patientId, doctorName: params.doctorName, doctorId: params.doctorId,
		isWarehouseOverdraft: Boolean(params.inventoryOverdraftActive), inventoryItemId: selectedStockItemId,
		expirationDate, operationPriceRub, implantCostRub, consumablesCostRub, doctorGrossMarginRub,
		isImmediateLoadingFeasible, boneGraftMaterial: isGbrPerformed ? activeGraft?.name : undefined,
		membraneUsed: isGbrPerformed ? activeMembrane?.name : undefined,
		sutureMaterial: isGbrPerformed ? activeSuture?.name : undefined,
	});

	return {
		toothFdi, setToothFdi, selectedBrand, setSelectedBrand, diameterMm, setDiameterMm, lengthMm, setLengthMm,
		torqueNcm, setTorqueNcm, boneDensity, setBoneDensity, isqValue, setIsqValue, capType, setCapType,
		catalogArticle, setCatalogArticle, lotNumber, setLotNumber, serialNumber, setSerialNumber,
		scannedBarcode, setScannedBarcode, isOverdraftDismissed, setIsOverdraftDismissed, activeTab, setActiveTab,
		isGbrPerformed, setIsGbrPerformed, isIsqEnabled, setIsIsqEnabled, stockItems, stockConsumables,
		selectedStockItemId, setSelectedStockItemId, expirationDate, setExpirationDate, selectedGraftId, setSelectedGraftId,
		selectedMembraneId, setSelectedMembraneId, selectedSutureId, setSelectedSutureId, operationPriceRub, setOperationPriceRub,
		implantCostRub, consumablesCostRub, doctorGrossMarginRub, selectedSystem, activeGraft, activeMembrane, activeSuture,
		assembledData, isImmediateLoadingFeasible,
	};
}
