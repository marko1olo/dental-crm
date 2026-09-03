/**
 * treatmentPlanMaterialEngine.ts — Клинико-складской движок списания материалов и калькуляции себестоимости DENTE CRM.
 *
 * Выполняет:
 * 1. Нормирование расхода стоматологических ТМЦ по Номенклатуре Минздрава РФ № 804н.
 * 2. Расчет себестоимости расходных материалов по этапам плана лечения с точностью до копейки.
 * 3. Сопоставление с реальным складским остатком клиники (InventoryItem), выявление дефицита.
 * 4. Формирование Акта выполненных работ и Накладной на списание ТМЦ (Форма М-11 / Торг-16).
 * 5. Расчет валовой маржинальности и доходности клинических этапов.
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	CompletedWorksActAndWriteOffData,
	PlanStageMaterialRequirement,
	ProcedureMaterialNorm,
	StageMaterialCostSummary,
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "./types";

export interface InventoryItemLookup {
	readonly id: string;
	readonly name: string;
	readonly stockQuantity: number;
	readonly criticalThreshold?: number;
	readonly unitCostRub: string | number;
	readonly sku?: string;
	readonly barcode?: string;
	readonly lotNumber?: string;
	readonly expirationDate?: string;
}

/**
 * Эталонные нормы расхода стоматологических материалов по Номенклатуре Приказа Минздрава РФ № 804н.
 */
export const ORDER_804N_MATERIAL_NORMS_MAP: Record<string, readonly ProcedureMaterialNorm[]> = {
	// A06.07.004: КЛКТ 3D диагностика
	"A06.07.004": [
		{
			id: "norm-ct-protective-cover",
			materialName: "Одноразовый чехол для позиционера томографа",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 35,
			mandatory: true,
			hideInPatientPresentation: true,
		},
		{
			id: "norm-ct-antiseptic-wipe",
			materialName: "Дезинфицирующая салфетка спиртовая Саникон",
			category: "Дезинфекция",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
			hideInPatientPresentation: true,
		},
	],

	// A16.07.051: Профессиональная гигиена полости рта (Air-Flow + УЗ)
	"A16.07.051": [
		{
			id: "norm-hyg-powder",
			materialName: "Порошок для Air-Flow глициновый (EMS Plus / Clinpro)",
			category: "Гигиена",
			quantityPerProcedure: 25,
			unitOfMeasure: "г",
			defaultUnitCostRub: 18, // 18 ₽ / грамм = 450 ₽
			mandatory: true,
		},
		{
			id: "norm-hyg-prophy-paste",
			materialName: "Полировочная паста Cleanic / Detartrine",
			category: "Гигиена",
			quantityPerProcedure: 3,
			unitOfMeasure: "г",
			defaultUnitCostRub: 40,
			mandatory: true,
		},
		{
			id: "norm-hyg-brush",
			materialName: "Щетка полировочная циркулярная нейлоновая",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 65,
			mandatory: true,
		},
		{
			id: "norm-hyg-varnish",
			materialName: "Фторлак защитный Clinpro White Varnish",
			category: "Профилактика",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 320,
			mandatory: true,
		},
		{
			id: "norm-hyg-optoragate",
			materialName: "Роторасширитель мягкий OptraGate (Ivoclar)",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 210,
			mandatory: true,
		},
	],

	// A16.07.002.001: Лечение кариеса фотополимером
	"A16.07.002.001": [
		{
			id: "norm-caries-composite",
			materialName: "Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)",
			category: "Терапия",
			quantityPerProcedure: 0.4,
			unitOfMeasure: "г",
			defaultUnitCostRub: 1250, // 500 ₽ за порцию
			mandatory: true,
		},
		{
			id: "norm-caries-adhesive",
			materialName: "Самопротравливающий адгезив 7-го поколения (Single Bond / Tokuyama EE)",
			category: "Терапия",
			quantityPerProcedure: 0.1,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 1800, // 180 ₽
			mandatory: true,
		},
		{
			id: "norm-caries-etching",
			materialName: "Гель травильный 37% ортофосфорная кислота",
			category: "Терапия",
			quantityPerProcedure: 0.2,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 150,
			mandatory: true,
		},
		{
			id: "norm-caries-matrix",
			materialName: "Секционная контурная матрица + деревянный клин Tor VM",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 85,
			mandatory: true,
		},
		{
			id: "norm-caries-anesthesia",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Убистезин / Септонест)",
			category: "Анестезия",
			quantityPerProcedure: 1,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-caries-needle",
			materialName: "Игла карпульная 30G евростандарт",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 25,
			mandatory: true,
		},
		{
			id: "norm-caries-cofferdam",
			materialName: "Платок латексный коффердама Sanctuary Dental Dam",
			category: "Изоляция",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 110,
			mandatory: true,
		},
	],

	// ==========================================
	// ЭНДОДОНТИЯ 804Н (ОБРАБОТКА И ОБТУРАЦИЯ 1..4 КАНАЛОВ)
	// ==========================================

	// A16.07.030.001: Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)
	"A16.07.030.001": [
		{
			id: "norm-prep1-files",
			materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-prep1-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 15,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
		{
			id: "norm-prep1-edta",
			materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)",
			category: "Эндодонтия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 90,
			mandatory: true,
		},
		{
			id: "norm-prep1-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 3,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
		{
			id: "norm-prep1-anesthesia",
			materialName: "Анестетик артикаиновый 4% форте 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 1,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.030.002: Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)
	"A16.07.030.002": [
		{
			id: "norm-prep2-files",
			materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-prep2-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 20,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
		{
			id: "norm-prep2-edta",
			materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 90,
			mandatory: true,
		},
		{
			id: "norm-prep2-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 6,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
		{
			id: "norm-prep2-anesthesia",
			materialName: "Анестетик артикаиновый 4% форте 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 1,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.030.003: Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)
	"A16.07.030.003": [
		{
			id: "norm-prep3-files",
			materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-prep3-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 25,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
		{
			id: "norm-prep3-edta",
			materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)",
			category: "Эндодонтия",
			quantityPerProcedure: 1.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 90,
			mandatory: true,
		},
		{
			id: "norm-prep3-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 9,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
		{
			id: "norm-prep3-anesthesia",
			materialName: "Анестетик артикаиновый 4% форте 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 2,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.030.004: Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)
	"A16.07.030.004": [
		{
			id: "norm-prep4-files",
			materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper",
			category: "Эндодонтия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-prep4-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 30,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
		{
			id: "norm-prep4-edta",
			materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)",
			category: "Эндодонтия",
			quantityPerProcedure: 2.0,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 90,
			mandatory: true,
		},
		{
			id: "norm-prep4-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 12,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
		{
			id: "norm-prep4-anesthesia",
			materialName: "Анестетик артикаиновый 4% форте 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 2,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.008.001: Пломбирование корневого канала зуба (1 канал) / Пульпотомия временного зуба
	"A16.07.008.001": [
		{
			id: "norm-obt1-gutta",
			materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 60,
			mandatory: true,
		},
		{
			id: "norm-obt1-sealer",
			materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)",
			category: "Эндодонтия",
			quantityPerProcedure: 0.1,
			unitOfMeasure: "г",
			defaultUnitCostRub: 1400,
			mandatory: true,
		},
		{
			id: "norm-obt1-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
		{
			id: "norm-pulpotomy-biodentine",
			materialName: "Биоактивный заменитель дентина Septodont Biodentine / ProRoot MTA",
			category: "Детская терапия",
			quantityPerProcedure: 1,
			unitOfMeasure: "порц.",
			defaultUnitCostRub: 1450,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.008.002: Пломбирование корневых каналов зуба (2 канала) / Эндодонтическое лечение пульпита
	"A16.07.008.002": [
		{
			id: "norm-endo-files",
			materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-endo-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 25,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
		{
			id: "norm-endo-edta",
			materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 90,
			mandatory: true,
		},
		{
			id: "norm-endo-gutta",
			materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06",
			category: "Эндодонтия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 60,
			mandatory: true,
		},
		{
			id: "norm-endo-sealer",
			materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)",
			category: "Эндодонтия",
			quantityPerProcedure: 0.2,
			unitOfMeasure: "г",
			defaultUnitCostRub: 1400,
			mandatory: true,
		},
		{
			id: "norm-endo-anesthesia",
			materialName: "Анестетик артикаиновый 4% форте 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 2,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-endo-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 6,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
	],

	// A16.07.008.003: Пломбирование корневых каналов зуба (3 канала)
	"A16.07.008.003": [
		{
			id: "norm-obt3-gutta",
			materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06",
			category: "Эндодонтия",
			quantityPerProcedure: 3,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 60,
			mandatory: true,
		},
		{
			id: "norm-obt3-sealer",
			materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)",
			category: "Эндодонтия",
			quantityPerProcedure: 0.3,
			unitOfMeasure: "г",
			defaultUnitCostRub: 1400,
			mandatory: true,
		},
		{
			id: "norm-obt3-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 6,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
	],

	// A16.07.008.004: Пломбирование корневых каналов зуба (4 канала)
	"A16.07.008.004": [
		{
			id: "norm-obt4-gutta",
			materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06",
			category: "Эндодонтия",
			quantityPerProcedure: 4,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 60,
			mandatory: true,
		},
		{
			id: "norm-obt4-sealer",
			materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)",
			category: "Эндодонтия",
			quantityPerProcedure: 0.4,
			unitOfMeasure: "г",
			defaultUnitCostRub: 1400,
			mandatory: true,
		},
		{
			id: "norm-obt4-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 8,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
	],

	// A16.07.091: Временное пломбирование лекарственным препаратом корневого канала (Ca(OH)2)
	"A16.07.091": [
		{
			id: "norm-caoh2-paste",
			materialName: "Лечебная гидроокись кальция UltraCal XS с радиопаком",
			category: "Эндодонтия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 380,
			mandatory: true,
		},
		{
			id: "norm-caoh2-temp-fill",
			materialName: "Временный пломбировочный материал безэвгенольный Cavit / Дентин-паста",
			category: "Терапия",
			quantityPerProcedure: 0.3,
			unitOfMeasure: "г",
			defaultUnitCostRub: 80,
			mandatory: true,
		},
		{
			id: "norm-caoh2-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные",
			category: "Эндодонтия",
			quantityPerProcedure: 3,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
		},
	],

	// A16.07.082: Распломбирование корневого канала зуба
	"A16.07.082": [
		{
			id: "norm-unseal-solvent",
			materialName: "Органический растворитель гуттаперчи D-Solv / Эндосольв",
			category: "Эндодонтия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 220,
			mandatory: true,
		},
		{
			id: "norm-unseal-files",
			materialName: "Машинные ретритмент-файлы для распломбирования ProTaper D1-D3",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 920,
			mandatory: true,
		},
		{
			id: "norm-unseal-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "Дезинфекция",
			quantityPerProcedure: 15,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 6,
			mandatory: true,
		},
	],

	// A16.07.009.001: Лечение периодонтита
	"A16.07.009.001": [
		{
			id: "norm-perio-calcium",
			materialName: "Лечебная гидроокись кальция UltraCal XS с радиопаком",
			category: "Эндодонтия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 380,
			mandatory: true,
		},
		{
			id: "norm-perio-chlorhexidine",
			materialName: "Хлоргексидина биглюконат 2% для финишной антисептики",
			category: "Дезинфекция",
			quantityPerProcedure: 15,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 8,
			mandatory: true,
		},
		{
			id: "norm-perio-files",
			materialName: "Файлы ротационные Ni-Ti Reciproc Blue",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 890,
			mandatory: true,
		},
		{
			id: "norm-perio-gutta-sealer",
			materialName: "Гуттаперча термопластическая + биокерамика CeraSeal",
			category: "Эндодонтия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 550,
			mandatory: true,
		},
	],

	// A16.07.001.001: Атравматичное удаление зуба
	"A16.07.001.001": [
		{
			id: "norm-ext-sponge",
			materialName: "Гемостатическая коллагеновая губка Alveostim / Parasorb Cone",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 310,
			mandatory: true,
		},
		{
			id: "norm-ext-suture",
			materialName: "Шовный материал нерассасывающийся PTFE / Пролен 4-0 с колющей иглой",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 290,
			mandatory: true,
		},
		{
			id: "norm-ext-anesthesia",
			materialName: "Анестетик артикаиновый 4% 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 2,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-ext-drape",
			materialName: "Стерильный комплект хирургического покрытия пациента",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 350,
			mandatory: true,
		},
	],

	// A16.07.001.002: Сложное хирургическое удаление ретенированного зуба
	"A16.07.001.002": [
		{
			id: "norm-cplx-ext-blade",
			materialName: "Микрохирургическое лезвие Swann-Morton № 15C стерильное",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 85,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-bur",
			materialName: "Твердосплавный трепанационный бор Lindemann Lind-01",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 420,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-sponge",
			materialName: "Коллагеновый конус с ионами серебра Parasorb Cone",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 480,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-suture",
			materialName: "Шовный материал полигликолид PGA 4-0 рассасывающийся",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 340,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-anesthesia",
			materialName: "Анестетик артикаиновый 4% 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 3,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],

	// A16.07.041: Костная пластика / синус-лифтинг
	"A16.07.041": [
		{
			id: "norm-graft-bone",
			materialName: "Ксеногенный натуральный костный графт Geistlich Bio-Oss (гранулы 0.5cc)",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "упак.",
			defaultUnitCostRub: 8900,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-graft-membrane",
			materialName: "Резорбируемая двухслойная коллагеновая мембрана Geistlich Bio-Gide 25x25мм",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 11500,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-graft-pins",
			materialName: "Титановые пины для фиксации мембраны Frios / Meisinger",
			category: "Хирургия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 650,
			mandatory: true,
		},
		{
			id: "norm-graft-suture",
			materialName: "Шовный материал монофиламентный PTFE Seralene 5-0",
			category: "Хирургия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 420,
			mandatory: true,
		},
	],

	// A16.07.054: Хирургический 3D-шаблон
	"A16.07.054": [
		{
			id: "norm-guide-photopolymer",
			materialName: "Биосовместимый полимер для 3D-печати Formlabs Dental SG / NextDent",
			category: "Лаборатория",
			quantityPerProcedure: 30,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 65, // 1950 ₽
			mandatory: true,
		},
		{
			id: "norm-guide-sleeves",
			materialName: "Титановые направляющие втулки (Sleeves) для навигационной хирургии",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 750,
			mandatory: true,
		},
	],

	// A16.07.054.001: Дентальная имплантация + формирователь десны
	"A16.07.054.001": [
		{
			id: "norm-implant-fixture",
			materialName: "Дентальный титановый имплантат с микрошероховатой поверхностью (SLA/SLActive)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 11800,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-implant-abutment",
			materialName: "Титановый формирователь десны (Healing Abutment)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 2200,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-implant-drapes",
			materialName: "Стерильное операционное белье хирургического протокола",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 550,
			mandatory: true,
		},
		{
			id: "norm-implant-saline",
			materialName: "Стерильный физиологический раствор NaCl 0.9% 500мл для физиодиспенсера",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 180,
			mandatory: true,
		},
		{
			id: "norm-implant-suture",
			materialName: "Шовный материал полиамидный монофиламент Dafilon 5-0",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 310,
			mandatory: true,
		},
	],

	// A16.07.004.001: Коронка из диоксида циркония
	"A16.07.004.001": [
		{
			id: "norm-crown-silicone",
			materialName: "Слепочная масса А-силикон прецизионная (Honigum / Express XT)",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "порц.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-crown-retraction-cord",
			materialName: "Ретракционная нить вязаная с пропиткой UltraPak #00",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 120,
			mandatory: true,
		},
		{
			id: "norm-crown-temp-cement",
			materialName: "Цемент временный безэвгенольный Temp-Bond NE",
			category: "Ортопедия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "г",
			defaultUnitCostRub: 160,
			mandatory: true,
		},
		{
			id: "norm-crown-perm-cement",
			materialName: "Самоадгезивный композитный цемент двойного отверждения RelyX U200 / Maxcem",
			category: "Ортопедия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "г",
			defaultUnitCostRub: 520,
			mandatory: true,
		},
	],

	// A16.07.006: Протезирование на имплантате (абатмент + коронка)
	"A16.07.006": [
		{
			id: "norm-impcrown-scanbody",
			materialName: "Скан-боди / трансфер оттискной для открытой ложки",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 950,
			mandatory: true,
		},
		{
			id: "norm-impcrown-screw",
			materialName: "Клинический титановый винт фиксации абатмента (Torque 30 Ncm)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 1400,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-impcrown-teflon",
			materialName: "Лента тефлоновая стерильная для шахты винта",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 45,
			mandatory: true,
		},
		{
			id: "norm-impcrown-composite",
			materialName: "Текучий композит светоотверждаемый для герметизации шахты",
			category: "Терапия",
			quantityPerProcedure: 0.2,
			unitOfMeasure: "г",
			defaultUnitCostRub: 220,
			mandatory: true,
		},
	],

	// A16.07.003: Вкладка керамическая Inlay/Onlay
	"A16.07.003": [
		{
			id: "norm-inlay-adhesive-system",
			materialName: "Адгезивная система Variolink Esthetic DC / Panavia V5",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 1200,
			mandatory: true,
		},
		{
			id: "norm-inlay-silane",
			materialName: "Силан праймер для керамики Monobond Plus",
			category: "Ортопедия",
			quantityPerProcedure: 0.1,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 450,
			mandatory: true,
		},
		{
			id: "norm-inlay-rubberdam",
			materialName: "Коффердам сверхэластичный плотный",
			category: "Изоляция",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 120,
			mandatory: true,
		},
	],
};

/**
 * Сопоставление требуемого материала со складской позицией (InventoryItem).
 */
export function matchMaterialToInventoryItem(
	materialName: string,
	inventoryItems?: readonly InventoryItemLookup[],
): InventoryItemLookup | undefined {
	if (!inventoryItems || inventoryItems.length === 0) return undefined;

	const search = materialName.toLowerCase().trim();
	const words = search.split(/s+/).filter((w) => w.length > 3);

	// 1. Прямое совпадение
	const exact = inventoryItems.find(
		(it) => it.name.toLowerCase().trim() === search,
	);
	if (exact) return exact;

	// 2. Вхождение ключевых слов
	return inventoryItems.find((it) => {
		const n = it.name.toLowerCase();
		return words.some((w) => n.includes(w));
	});
}

/**
 * Расчет потребности и себестоимости материалов для этапа комплексного плана лечения.
 */
export function calculateStageMaterialRequirements(
	stage: TreatmentPlanStage,
	inventoryItems?: readonly InventoryItemLookup[],
): StageMaterialCostSummary {
	const resultItems: PlanStageMaterialRequirement[] = [];

	// First pass: aggregate total required quantity per material across the whole stage
	const stageTotalRequiredByMaterial = new Map<string, number>();
	for (const proc of stage.items) {
		const code = proc.code804n;
		const norms = ORDER_804N_MATERIAL_NORMS_MAP[code] ?? [];
		const qty = Math.max(1, proc.quantity || 1);
		for (const norm of norms) {
			const reqQty = Number((norm.quantityPerProcedure * qty).toFixed(2));
			const current = stageTotalRequiredByMaterial.get(norm.materialName) ?? 0;
			stageTotalRequiredByMaterial.set(norm.materialName, current + reqQty);
		}
	}

	for (const proc of stage.items) {
		const code = proc.code804n;
		const norms = ORDER_804N_MATERIAL_NORMS_MAP[code] ?? [];
		const qty = Math.max(1, proc.quantity || 1);

		for (const norm of norms) {
			const reqQty = Number((norm.quantityPerProcedure * qty).toFixed(2));
			const matchedInv = matchMaterialToInventoryItem(
				norm.materialName,
				inventoryItems,
			);

			const unitCostRub = matchedInv
				? Number(matchedInv.unitCostRub) || norm.defaultUnitCostRub
				: norm.defaultUnitCostRub;

			const unitCostKopecks = parseKopecks(unitCostRub);
			const totalCostKopecks = (
				Number.isInteger(reqQty) && reqQty >= 0
					? multiplyKopecks(unitCostKopecks, reqQty)
					: Math.round(unitCostKopecks * reqQty)
			) as Kopecks;
			const totalCostRub = Math.round(totalCostKopecks / 100);

			const inStockQuantity = matchedInv ? matchedInv.stockQuantity : undefined;
			const totalRequiredForStage =
				stageTotalRequiredByMaterial.get(norm.materialName) ?? reqQty;
			const isDeficit =
				inStockQuantity !== undefined && inStockQuantity < totalRequiredForStage;
			const deficitQuantity = isDeficit
				? Number((totalRequiredForStage - inStockQuantity).toFixed(2))
				: 0;

			const item: PlanStageMaterialRequirement = {
				id: `${stage.stageNumber}-${proc.id}-${norm.id}`,
				materialName: norm.materialName,
				order804nCode: code,
				procedureName: proc.name,
				quantityRequired: reqQty,
				unitOfMeasure: norm.unitOfMeasure,
				unitCostRub,
				unitCostKopecks,
				totalCostRub,
				totalCostKopecks,
				isDeficit,
				deficitQuantity,
				hideInPatientPresentation: Boolean(
					norm.hideInPatientPresentation ||
					/салфетк|ватн.*валик|чехол для позиционер/i.test(norm.materialName),
				),
				...(typeof proc.toothNumber === "number" ? { toothNumber: proc.toothNumber } : {}),
				...(matchedInv?.id ? { inventoryItemId: matchedInv.id } : {}),
				...(typeof inStockQuantity === "number" ? { inStockQuantity } : {}),
			};
			resultItems.push(item);
		}
	}

	const totalMaterialsCostKopecks = sumKopecks(
		resultItems.map((i) => i.totalCostKopecks),
	);
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);

	const serviceRevenueKopecks = stage.totalKopecks;
	const serviceRevenueRub = stage.totalRub;

	const grossMarginKopecks = Math.max(
		0,
		serviceRevenueKopecks - totalMaterialsCostKopecks,
	) as Kopecks;
	const grossMarginRub = Math.round(grossMarginKopecks / 100);

	const marginPercent =
		serviceRevenueKopecks > 0
			? Math.round((grossMarginKopecks / serviceRevenueKopecks) * 100)
			: 0;

	const deficitCount = resultItems.filter((i) => i.isDeficit).length;

	return {
		stageNumber: stage.stageNumber,
		stageTitle: stage.title,
		items: resultItems,
		totalMaterialsCostKopecks,
		totalMaterialsCostRub,
		serviceRevenueKopecks,
		serviceRevenueRub,
		grossMarginKopecks,
		grossMarginRub,
		marginPercent,
		hasDeficit: deficitCount > 0,
		deficitCount,
	};
}

/**
 * Расчет суммарной потребности и себестоимости материалов по всему комплексному плану.
 */
export function calculatePlanTotalMaterialCost(
	stages: readonly TreatmentPlanStage[],
	inventoryItems?: readonly InventoryItemLookup[],
): {
	summaries: readonly StageMaterialCostSummary[];
	totalMaterialsCostKopecks: Kopecks;
	totalMaterialsCostRub: number;
	totalServiceRevenueKopecks: Kopecks;
	totalServiceRevenueRub: number;
	totalGrossMarginKopecks: Kopecks;
	totalGrossMarginRub: number;
	overallMarginPercent: number;
	totalDeficitItemsCount: number;
} {
	const summaries = stages.map((s) =>
		calculateStageMaterialRequirements(s, inventoryItems),
	);

	const totalMaterialsCostKopecks = sumKopecks(
		summaries.map((s) => s.totalMaterialsCostKopecks),
	);
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);

	const totalServiceRevenueKopecks = sumKopecks(
		summaries.map((s) => s.serviceRevenueKopecks),
	);
	const totalServiceRevenueRub = Math.round(totalServiceRevenueKopecks / 100);

	const totalGrossMarginKopecks = Math.max(
		0,
		totalServiceRevenueKopecks - totalMaterialsCostKopecks,
	) as Kopecks;
	const totalGrossMarginRub = Math.round(totalGrossMarginKopecks / 100);

	const overallMarginPercent =
		totalServiceRevenueKopecks > 0
			? Math.round((totalGrossMarginKopecks / totalServiceRevenueKopecks) * 100)
			: 0;

	const totalDeficitItemsCount = summaries.reduce(
		(acc, s) => acc + s.deficitCount,
		0,
	);

	return {
		summaries,
		totalMaterialsCostKopecks,
		totalMaterialsCostRub,
		totalServiceRevenueKopecks,
		totalServiceRevenueRub,
		totalGrossMarginKopecks,
		totalGrossMarginRub,
		overallMarginPercent,
		totalDeficitItemsCount,
	};
}

/**
 * Формирование Акта выполненных работ и Складской накладной на списание ТМЦ.
 */
export function generateCompletedWorksActAndWriteOff(params: {
	readonly stage: TreatmentPlanStage;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly customActNumber?: string | undefined;
}): CompletedWorksActAndWriteOffData {
	const {
		stage,
		contractNumber,
		patientId,
		patientName,
		doctorFullName,
		clinicName,
		inventoryItems,
		customActNumber,
	} = params;

	const summary = calculateStageMaterialRequirements(stage, inventoryItems);
	const now = new Date();
	const actDate = now.toLocaleDateString("ru-RU");
	const actNumber =
		customActNumber ||
		`ACT-${now.getFullYear()}-${stage.stageNumber}-${patientId.slice(0, 5).toUpperCase()}`;

	return {
		actNumber,
		actDate,
		contractNumber,
		patientId,
		patientName,
		doctorFullName,
		clinicName,
		stageNumber: stage.stageNumber,
		stageTitle: stage.title,
		completedProcedures: stage.items,
		writtenOffMaterials: summary.items,
		totalServiceRub: stage.totalRub,
		totalServiceKopecks: stage.totalKopecks,
		totalMaterialCostRub: summary.totalMaterialsCostRub,
		totalMaterialCostKopecks: summary.totalMaterialsCostKopecks,
		marginRub: summary.grossMarginRub,
		marginPercent: summary.marginPercent,
		status: "draft",
		createdAtIso: now.toISOString(),
	};
}
