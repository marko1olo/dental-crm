import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ (A16.07.054)
 */
export const IMPLANT_PLACEMENT_TECH_MAP: ProcedureTechMap = {
	id: "tm-implant",
	code: "A16.07.054",
	title: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
	specialty: "Хирургия / Имплантология",
	description: "Установка дентального имплантата: титановый винт SLA, заглушка, шовный материал PTFE 4-0, артикаин 2 карпулы",
	items: [
		{
			id: "imp-fixture",
			materialName: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("14500.00"),
			mandatory: true,
			lotTrackingRequired: true,
			description: "Подлежит серийному учету (МДЛП)",
		},
		{
			id: "imp-cover-screw",
			materialName: "Винт-заглушка / формирователь десны титановый стерильный",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("1500.00"),
			mandatory: true,
		},
		{
			id: "imp-suture",
			materialName: "Шовный материал монофиламентный PTFE / Vicryl 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("340.00"),
			mandatory: true,
		},
		{
			id: "imp-anesthesia",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("220.00"),
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "imp-blade",
			materialName: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("85.00"),
			mandatory: true,
		},
		{
			id: "imp-ppe-set",
			materialName: "Стерильный операционный набор СИЗ хирурга и ассистента",
			category: "ppe",
			unit: "компл.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("950.00"),
			mandatory: true,
		},
	],
};
