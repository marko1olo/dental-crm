/**
 * surgeryProtocolHelpers.ts — Чистые построители текста дневника приёма и паспорта имплантации (DENTE CRM).
 * Без .toUpperCase() в видимых текстах и без синтетических моков (Мандаты 8b, 8x, 8am).
 */

import type { FastImplantPassportData } from "@dental/shared";
import {
	computeOsteointegrationExpectedDate,
	generateSystemSurgeryLot,
	type MischBoneDensity,
	type SurgeryCapType,
	type SurgeryImplantSystemSpec,
	type SurgeryScenarioConfig,
	type SurgeryScenarioType,
} from "./surgeryCatalogData";
import type { ToothImplantSpec } from "./SurgeryImplantParametersSection";
import type { SurgeryHubTab } from "./modules/SurgeryHubNavigation";

export interface ChairsideSurgerySavedProtocolData {
	readonly activeScenario: SurgeryScenarioType;
	readonly toothFdi: number;
	readonly passportData: FastImplantPassportData;
	readonly diaryText: string;
	readonly selectedTeeth: readonly number[];
}

export interface UseSurgeryHubStateParams {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialScenario?: SurgeryScenarioType | undefined;
	readonly initialTab?: SurgeryHubTab | undefined;
	readonly inventoryOverdraftActive?: boolean | undefined;
	readonly initialBrand?: string | undefined;
	readonly initialDiameterMm?: number | undefined;
	readonly initialLengthMm?: number | undefined;
	readonly initialTorqueNcm?: number | undefined;
	readonly initialLotNumber?: string | undefined;
	readonly initialBoneGraft?: string | undefined;
	readonly initialMembrane?: string | undefined;
	readonly initialSuture?: string | undefined;
	readonly initialTeeth?: readonly number[] | undefined;
	readonly onSaveProtocol?: ((data: ChairsideSurgerySavedProtocolData) => void) | undefined;
	readonly onInsertIntoDiary?: ((diaryText: string) => void) | undefined;
}

export function buildSurgeryDiaryText(params: {
	activeScenario: SurgeryScenarioType;
	scenarioConfig: SurgeryScenarioConfig;
	toothFdi: number;
	selectedTeeth: readonly number[];
	getToothSpec: (tooth: number) => ToothImplantSpec;
	doctorName: string;
	patientName: string;
	selectedBrand: string;
	diameterMm: number;
	lengthMm: number;
	catalogArticle: string;
	lotNumber: string;
	torqueNcm: number;
	isqValue: number;
	boneDensity: MischBoneDensity | "";
	capType: SurgeryCapType;
	selectedSuture: string;
	anesthesiaProtocol?: string | undefined;
	incisionProtocol?: string | undefined;
	boneBedProtocol?: string | undefined;
}): string {
	const {
		activeScenario, scenarioConfig, toothFdi, selectedTeeth, getToothSpec,
		doctorName, patientName, selectedBrand, diameterMm, lengthMm,
		catalogArticle, lotNumber, torqueNcm, isqValue, boneDensity, capType, selectedSuture,
		anesthesiaProtocol, incisionProtocol, boneBedProtocol,
	} = params;
	const nowStr = new Date().toLocaleDateString("ru-RU");
	if (activeScenario === "implant") {
		const capStr = capType === "plug" ? "винт-заглушка (ушивание наглухо)" : "формирователь десны (ФДМ)";
		const sutureClause = selectedSuture.trim() ? ` Наложены швы (${selectedSuture}).` : "";
		const anesthClause = anesthesiaProtocol?.trim() ? `${anesthesiaProtocol.trim()}. ` : "";
		const incisionClause = incisionProtocol?.trim() ? `${incisionProtocol.trim()}. ` : "";
		const bedClause = boneBedProtocol?.trim() ? `${boneBedProtocol.trim()}. ` : "";
		const densityClause = boneDensity ? `Плотность кости: ${boneDensity}. ` : "";
		const brandLabel = selectedBrand.trim() || "Имплантационная система не указана";
		if (selectedTeeth.length > 1) {
			const perToothText = selectedTeeth.map((t) => {
				const s = getToothSpec(t);
				const tCap = s.capType === "plug" ? "заглушка" : "ФДМ";
				const snSuffix = s.serialNumber ? `, SN: ${s.serialNumber}` : "";
				const sizePart = s.diameterMm > 0 && s.lengthMm > 0 ? ` Ø ${s.diameterMm} × ${s.lengthMm} мм` : "";
				const refPart = s.catalogArticle ? `REF: ${s.catalogArticle}, ` : "";
				const lotPart = s.lotNumber ? `LOT: ${s.lotNumber}` : "LOT: —";
				return `#${t}: ${brandLabel}${sizePart} (${refPart}${lotPart}${snSuffix}, торк ${s.torqueNcm || "—"} Н·см, ISQ ${s.isqValue || "—"}, ${tCap})`;
			}).join("; ");
			return `Медицинская карта приёма · Хирургический протокол (Зубы FDI #${selectedTeeth.join(", #")})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХод операции:\n${anesthClause}${incisionClause}${bedClause}${densityClause}Установлены имплантаты: ${perToothText}.${sutureClause} Гемостаз полный. Паспорт выдан пациенту.\n\nНазначения и рекомендации:\n${scenarioConfig.defaultRecommendationsRu}`;
		}
		const sizePart = diameterMm > 0 && lengthMm > 0 ? ` Ø ${diameterMm} × ${lengthMm} мм` : "";
		const refLotParts = [catalogArticle ? `REF: ${catalogArticle}` : "", lotNumber ? `LOT: ${lotNumber}` : ""].filter(Boolean);
		const refLotStr = refLotParts.length > 0 ? ` (${refLotParts.join(", ")})` : "";
		const stabilityPart = torqueNcm > 0 || isqValue > 0 ? ` Первичная стабильность: ${torqueNcm || "—"} Н·см (ISQ ${isqValue || "—"}).` : "";
		return `Медицинская карта приёма · Хирургический протокол (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХод операции:\n${anesthClause}${incisionClause}${bedClause}${densityClause}Имплантат: ${brandLabel}${sizePart}${refLotStr}.${stabilityPart} Установлен ${capStr}.${sutureClause} Гемостаз полный. Паспорт выдан пациенту.\n\nНазначения и рекомендации:\n${scenarioConfig.defaultRecommendationsRu}`;
	}
	return `Медицинская карта приёма · ${scenarioConfig.titleRu} (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХод операции:\n${scenarioConfig.defaultProtocolRu}\n\nНазначения и рекомендации:\n${scenarioConfig.defaultRecommendationsRu}`;
}

export function buildSurgeryPassportData(params: {
	apiPassportData: Record<string, unknown> | null;
	toothFdi: number;
	currentSystem: SurgeryImplantSystemSpec | null;
	catalogArticle: string;
	diameterMm: number;
	lengthMm: number;
	torqueNcm: number;
	lotNumber: string;
	serialNumber: string;
	boneDensity: MischBoneDensity | "";
	isqValue: number;
	capType: SurgeryCapType;
	patientName: string;
	patientId: string;
	doctorName: string;
	doctorId: string;
	inventoryOverdraftActive: boolean;
	effectiveInventoryItemId?: string | undefined;
	selectedInventoryItemId: string | null;
	matchedStockItemId?: string | undefined;
	selectedBrand: string;
	financials: {
		operationPriceRub: number;
		implantCostRub: number;
		consumablesCostRub: number;
		doctorGrossMarginRub: number;
		netDoctorIncomeRub: number;
		operationPriceKopecks: bigint | number;
		implantCostKopecks: bigint | number;
		consumablesCostKopecks: bigint | number;
		doctorGrossMarginKopecks: bigint | number;
		netDoctorIncomeKopecks: bigint | number;
	};
	selectedGraft: string;
	selectedMembrane: string;
	selectedSuture: string;
}): FastImplantPassportData {
	const { apiPassportData, toothFdi, currentSystem, lotNumber, serialNumber, financials } = params;
	const dateIso = apiPassportData?.installedAt ? new Date(String(apiPassportData.installedAt)).toISOString() : new Date().toISOString();
	const effectiveLot = lotNumber || (apiPassportData?.lotNumber ? String(apiPassportData.lotNumber) : "") || generateSystemSurgeryLot(toothFdi, dateIso);
	const brandValue = currentSystem?.brandName || params.selectedBrand.trim();
	return {
		passportId: (apiPassportData?.passportId ? String(apiPassportData.passportId) : null) || `IMP-SSOT-${toothFdi}-${Date.now().toString().slice(-6)}`,
		toothFdi,
		brand: brandValue,
		model: currentSystem?.popularLines[0] || "",
		catalogArticle: params.catalogArticle,
		diameterMm: params.diameterMm,
		lengthMm: params.lengthMm,
		torqueNcm: params.torqueNcm,
		lotNumber: effectiveLot,
		serialNumber: serialNumber || (apiPassportData?.serialNumber ? String(apiPassportData.serialNumber) : ""),
		boneDensity: params.boneDensity || "D2",
		isqDay0: params.isqValue,
		capType: params.capType,
		patientName: (apiPassportData?.patientName ? String(apiPassportData.patientName) : null) || params.patientName,
		patientId: params.patientId,
		doctorName: (apiPassportData?.doctorName ? String(apiPassportData.doctorName) : null) || params.doctorName,
		doctorId: params.doctorId,
		dateIso,
		osteointegrationExpectedDate: computeOsteointegrationExpectedDate(dateIso, toothFdi),
		isWarehouseOverdraft: Boolean(params.inventoryOverdraftActive),
		inventoryItemId: params.effectiveInventoryItemId || params.selectedInventoryItemId || params.matchedStockItemId || (brandValue ? `inv-${brandValue.toLowerCase()}-${params.diameterMm * 10}${params.lengthMm}` : ""),
		expirationDate: currentSystem?.defaultExpirationDate || "",
		operationPriceRub: financials.operationPriceRub,
		implantCostRub: financials.implantCostRub,
		consumablesCostRub: financials.consumablesCostRub,
		doctorGrossMarginRub: financials.doctorGrossMarginRub,
		netDoctorIncomeRub: financials.netDoctorIncomeRub,
		operationPriceKopecks: financials.operationPriceKopecks,
		implantCostKopecks: financials.implantCostKopecks,
		consumablesCostKopecks: financials.consumablesCostKopecks,
		doctorGrossMarginKopecks: financials.doctorGrossMarginKopecks,
		netDoctorIncomeKopecks: financials.netDoctorIncomeKopecks,
		isImmediateLoadingFeasible: params.torqueNcm >= 35,
		boneGraftMaterial: params.selectedGraft,
		membraneUsed: params.selectedMembrane,
		sutureMaterial: params.selectedSuture,
	};
}
