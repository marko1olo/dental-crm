/**
 * useImplantModalHandlers.ts — Обработчики действий модалки паспорта имплантата (Мандаты 8e, 8n).
 */

import { showToast } from "../../GlobalToast";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	getAnatomicalImplantDefaults,
	type ImplantWarehouseStockItem,
} from "../implantQuickPresets";
import { generateImplantDiaryText } from "./implantDiaryGenerator";
import { saveImplantInstallation } from "./implantInstallationApi";

export function useImplantModalHandlers(
	logic: any,
	patientId: string,
	onSavePassport?: (data: any) => void,
	onInsertIntoDiary?: (diaryText: string) => void,
	onClose?: () => void,
) {
	const handleToothSelect = (tooth: number) => {
		logic.setToothFdi(tooth);
		const defaults = getAnatomicalImplantDefaults(tooth);
		logic.setBoneDensity(defaults.boneDensity);
		logic.setDiameterMm(defaults.diameterMm);
		logic.setLengthMm(defaults.lengthMm);
		logic.setTorqueNcm(defaults.torqueNcm);
		logic.setCapType(defaults.capType);
	};

	const handleBrandSelect = (brand: string) => {
		logic.setSelectedBrand(brand);
		const found = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === brand);
		if (found) {
			logic.setCatalogArticle(brand === "Osstem" ? "TS3S4010S" : brand === "Dentium" ? "FX4010" : brand === "Straumann" ? "021.2310" : brand === "Ankylos" ? "A-B110-CX" : brand === "Astra Tech" ? "EV-42110" : brand === "Nobel Biocare" ? "NP-35115" : `${brand.slice(0, 3).toUpperCase()}-4010`);
		}
	};

	const handleSelectStockItem = (item: ImplantWarehouseStockItem) => {
		logic.setSelectedStockItemId(item.id);
		if (item.lotNumber) logic.setLotNumber(item.lotNumber);
		if (item.sku) logic.setCatalogArticle(item.sku);
		if (item.expirationDate) logic.setExpirationDate(item.expirationDate);
	};

	const handleApplyStandardProtocol = () => {
		handleToothSelect(logic.toothFdi);
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		showToast("Применен экспресс-протокол: торк 35 Н·см, ФДМ, шов Викрил 4-0", "success");
	};

	const handleApplyImmediateProtocol = () => {
		logic.setCapType("fdm");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(45);
		logic.setDiameterMm(4.5);
		logic.setLengthMm(11.5);
		showToast("Применен протокол одномоментной имплантации: немедленная нагрузка (45 Н·см)", "success");
	};

	const handleApplyTwoStageProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(false);
		logic.setTorqueNcm(35);
		showToast("Применен двухэтапный протокол: винт-заглушка с ушиванием раны наглухо (35 Н·см)", "success");
	};

	const handleApplyGbrProtocol = () => {
		logic.setCapType("plug");
		logic.setIsGbrPerformed(true);
		logic.setTorqueNcm(35);
		showToast("Применен протокол с костной пластикой НКР: Bio-Oss + Bio-Gide", "success");
	};

	const handleApplyBarcode = (customBarcode?: string) => {
		const raw = (customBarcode !== undefined ? customBarcode : logic.scannedBarcode || "").trim();
		if (!raw) return;
		logic.setCatalogArticle(raw);
		showToast("Идентификатор изделия зафиксирован", "success");
	};

	const generateDiaryText = () => generateImplantDiaryText(logic);

	const handleSaveAndInsertDiary = async () => {
		onSavePassport?.(logic.assembledData);
		const diary = generateDiaryText();
		onInsertIntoDiary?.(diary);
		await saveImplantInstallation(logic, patientId, onClose);
	};

	return {
		handleToothSelect, handleBrandSelect, handleSelectStockItem,
		handleApplyStandardProtocol, handleApplyImmediateProtocol,
		handleApplyTwoStageProtocol, handleApplyGbrProtocol,
		handleApplyBarcode, generateDiaryText, handleSaveAndInsertDiary,
	};
}
