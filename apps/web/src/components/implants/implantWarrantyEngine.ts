/**
 * implantWarrantyEngine.ts — Хирургические быстрые шаблоны, SOAP-протоколы и гарантийный паспорт имплантата (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

import type { CanonicalImplantSystemId } from "@dental/shared";
import type { ImplantStageType, MischBoneDensity } from "./implantBrandTypes";
import { CANONICAL_IMPLANT_SYSTEMS, getMischBoneDensityByToothFdi } from "./implantCatalogData";

export interface ImplantSurgeryQuickTemplate {
	readonly id: string;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly stage: ImplantStageType;
	readonly defaultTorqueNcm: number;
	readonly defaultIsq: number;
	readonly isImmediateLoading: boolean;
	readonly boneGraftRequired: boolean;
	readonly membraneRequired: boolean;
}

export const SURGICAL_QUICK_TEMPLATES: readonly ImplantSurgeryQuickTemplate[] = [
	{
		id: "immediate_extraction",
		labelRu: "1. Немедленная имплантация (в лунку удаленного)",
		descriptionRu: "Одномоментная установка в лунку удаленного зуба с формирователем десны или временной коронкой.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 40,
		defaultIsq: 75,
		isImmediateLoading: true,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "classic_two_stage",
		labelRu: "2. Классическая двухэтапная",
		descriptionRu: "Погружная установка имплантата с винтом-заглушкой и ушиванием слизистой наглухо.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 70,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
	{
		id: "closed_sinus_lift",
		labelRu: "3. Имплантация с закрытым синус-лифтингом",
		descriptionRu: "Мягкое транскрестальное поднятие дна гайморовой пазухи остеотомами с подсадкой костного графта.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 68,
		isImmediateLoading: false,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "healing_abutment_placement",
		labelRu: "4. Установка формирователя десны",
		descriptionRu: "Второй хирургический этап: раскрытие имплантата, удаление винта-заглушки и фиксация ФДМ.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 15,
		defaultIsq: 76,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
];

export interface ImplantWarrantyPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly systemId: CanonicalImplantSystemId;
	readonly brandName: string;
	readonly lineName: string;
	readonly catalogArticle: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly insertionTorqueNcm: number;
	readonly isqValue: number;
	readonly boneDensity: MischBoneDensity;
	readonly stage: ImplantStageType;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorName: string;
	readonly doctorId: string;
	readonly surgeryDateIso: string;
	readonly expectedOsteointegrationDateIso: string;
	readonly implantCostKopecks: bigint;
	readonly patientPriceKopecks: bigint;
	readonly verificationQrPayload: string;
}

export function generateWarrantyPassportRecord(params: {
	toothFdi: number;
	systemId: CanonicalImplantSystemId;
	passportId?: string | undefined;
	diameterMm?: number | undefined;
	lengthMm?: number | undefined;
	torqueNcm?: number | undefined;
	isq?: number | undefined;
	stage?: ImplantStageType | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
	doctorName?: string | undefined;
	doctorId?: string | undefined;
	lotNumber?: string | undefined;
	serialNumber?: string | undefined;
	surgeryDateIso?: string | undefined;
}): ImplantWarrantyPassportData {
	const sys = CANONICAL_IMPLANT_SYSTEMS[params.systemId] || CANONICAL_IMPLANT_SYSTEMS.osstem;
	const diameterMm = params.diameterMm ?? sys.defaultDiameterMm;
	const lengthMm = params.lengthMm ?? sys.defaultLengthMm;
	const torqueNcm = params.torqueNcm ?? sys.defaultTorqueNcm;
	const isqValue = params.isq ?? 72;
	const stage = params.stage ?? "one_stage_healing_abutment";
	const toothFdi = params.toothFdi || 46;
	const boneDensity = getMischBoneDensityByToothFdi(toothFdi);
	const now = new Date();
	const surgeryDateIso = params.surgeryDateIso ?? now.toISOString().slice(0, 10);

	const isUpper = toothFdi >= 11 && toothFdi <= 28;
	const osteoMonths = isUpper ? 5 : 3;
	const expectedDate = new Date(now.getTime() + osteoMonths * 30 * 24 * 60 * 60 * 1000);
	const expectedDateIso = expectedDate.toISOString().slice(0, 10);

	const dateDigits = surgeryDateIso.replace(/\D/g, "");
	const lotNumber =
		params.lotNumber?.trim() ||
		`LOT-${sys.id.toUpperCase().slice(0, 3)}-${dateDigits || "20260101"}`;
	const serialNumber =
		params.serialNumber?.trim() ||
		`SN-${toothFdi}-${params.patientId ? params.patientId.slice(0, 6).toUpperCase() : dateDigits || "000000"}`;
	const passportId =
		params.passportId?.trim() ||
		(params.patientId
			? `PASS-IMP-${toothFdi}-${params.patientId.slice(0, 8).toUpperCase()}`
			: `PASS-IMP-${toothFdi}-${dateDigits || "20260101"}`);
	const article = `${sys.defaultArticlePrefix}-${Math.round(diameterMm * 10)}${Math.round(lengthMm * 10)}`;

	const verificationQrPayload = JSON.stringify({
		passportId,
		toothFdi,
		brand: sys.brandName,
		article,
		lot: lotNumber,
		sn: serialNumber,
		date: surgeryDateIso,
		osteoDate: expectedDateIso,
		warranty: "Lifetime Manufacturer Osseointegration Guarantee",
		verificationUrl: `https://dente-clinic.ru/portal/warranty?cert=${encodeURIComponent(passportId)}`,
	});

	return {
		passportId,
		toothFdi,
		systemId: sys.id,
		brandName: sys.brandName,
		lineName: sys.lineName,
		catalogArticle: article,
		diameterMm,
		lengthMm,
		insertionTorqueNcm: torqueNcm,
		isqValue,
		boneDensity,
		stage,
		lotNumber,
		serialNumber,
		patientName: params.patientName?.trim() || "Пациент не выбран",
		patientId: params.patientId || "",
		doctorName: params.doctorName?.trim() || "Врач-хирург",
		doctorId: params.doctorId || "",
		surgeryDateIso,
		expectedOsteointegrationDateIso: expectedDateIso,
		implantCostKopecks: sys.implantCostKopecks,
		patientPriceKopecks: sys.patientPriceKopecks,
		verificationQrPayload,
	};
}

export function buildSoapSurgeryDiaryText(params: {
	toothFdi: number;
	boneDensity: MischBoneDensity;
	brandName: string;
	lineName: string;
	diameterMm: number;
	lengthMm: number;
	torqueNcm: number;
	isqValue: number;
	screwdriverAliasRu: string;
	stage: ImplantStageType;
	isGbrPerformed: boolean;
}): string {
	const stageText = params.stage === "one_stage_healing_abutment" ? "установка формирователя десны (ФДМ)" : "винт-заглушка с ушиванием наглухо";
	const gbrText = params.isGbrPerformed ? "Проведена костная пластика (GBR) с фиксацией коллагеновой мембраны." : "Без аугментации.";
	return `ДНЕВНИК ХИРУРГИЧЕСКОГО ПРИЁМА: ОПЕРАЦИЯ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ
Локализация: зуб ${params.toothFdi} (Плотность костной ткани по Misch: ${params.boneDensity}).
Протокол вмешательства: инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.
Разрез по гребню, отслаивание слизисто-надкостничного лоскута.
Формирование костного ложа под обильным стерильным охлаждением 0.9% NaCl.
Установлен имплантат: ${params.brandName} ${params.lineName} Ø ${params.diameterMm} мм × ${params.lengthMm} мм.
Первичная торсионная стабильность: ${params.torqueNcm} Н·см. Коэффициент ISQ: ${params.isqValue}.
Отвертка: ${params.screwdriverAliasRu}.
Этап: ${stageText}. ${gbrText}
Ушивание раны узловыми швами. Гемостаз полный. Пациенту выдан гарантийный паспорт имплантата.`;
}
