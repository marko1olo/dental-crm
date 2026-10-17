/**
 * chairsideBomMaterials.ts
 * Clinical heuristic Bill-Of-Materials (BOM) resolution for chairside services.
 */

import { getDefaultBomLinksForService804n } from "@dental/shared";

export interface ServiceBomMaterial {
	name: string;
	quantity: number;
	unit: string;
	isOverdraft?: boolean;
}

export function getServiceBomMaterials(
	code804n?: string,
	title?: string,
	quantity = 1,
): ServiceBomMaterial[] {
	const qty = Math.max(1, quantity);
	const lowTitle = (title || "").toLowerCase();

	if (code804n) {
		try {
			const links = getDefaultBomLinksForService804n(code804n);
			if (links && links.length > 0) {
				return links.map((l) => ({
					name: l.itemName,
					quantity: Number((l.quantityPerService * qty).toFixed(2)),
					unit: l.unit === "шприц_гр" ? "г" : l.unit === "dose" ? "доза" : l.unit || "ед.",
				}));
			}
		} catch {
			// fallback to heuristics
		}
	}

	if (lowTitle.includes("кариес") || lowTitle.includes("пломб") || lowTitle.includes("композит") || lowTitle.includes("реставрац") || code804n?.startsWith("A16.07.002")) {
		return [
			{ name: "Светоотверждаемый нанокомпозит (Filtek / Estelite)", quantity: Number((0.4 * qty).toFixed(1)), unit: "г" },
			{ name: "Адгезивная система самопротравливающая (7 пок.)", quantity: 1 * qty, unit: "доза" },
			{ name: "Полировочные головки и диски (Sof-Lex / Enhance)", quantity: 1 * qty, unit: "шт." },
		];
	}

	if (lowTitle.includes("анестези") || lowTitle.includes("ультракаин") || lowTitle.includes("артикаин") || lowTitle.includes("септонест") || code804n?.startsWith("A11.07.012") || code804n?.startsWith("B01.003.004")) {
		return [
			{ name: "Анестетик артикаиновый 4% с эпинефрином 1:100000", quantity: 1 * qty, unit: "карп." },
			{ name: "Игла карпульная стоматологическая 30G", quantity: 1 * qty, unit: "шт." },
		];
	}

	if (lowTitle.includes("гигиен") || lowTitle.includes("airflow") || lowTitle.includes("air-flow") || lowTitle.includes("чистк") || code804n?.startsWith("A16.07.051")) {
		return [
			{ name: "Порошок Air-Flow профилактический", quantity: 25 * qty, unit: "г" },
			{ name: "Паста полировочная абразивная", quantity: 2 * qty, unit: "г" },
		];
	}

	if (lowTitle.includes("эндо") || lowTitle.includes("канал") || lowTitle.includes("пульпит") || lowTitle.includes("периодонтит") || code804n?.startsWith("A16.07.030")) {
		return [
			{ name: "Гипохлорит натрия 3% для ирригации", quantity: 10 * qty, unit: "мл" },
			{ name: "Гуттаперчевые штифты конусные", quantity: 3 * qty, unit: "шт." },
			{ name: "Силер эндодонтический (AH Plus)", quantity: Number((0.2 * qty).toFixed(1)), unit: "г" },
		];
	}

	if (lowTitle.includes("удалени") || lowTitle.includes("экстракци") || lowTitle.includes("хирург") || code804n?.startsWith("A16.07.001")) {
		return [
			{ name: "Гемостатическая губка стерильная", quantity: 1 * qty, unit: "шт." },
			{ name: "Шовный материал с атравматической иглой", quantity: 1 * qty, unit: "шт." },
		];
	}

	return [{ name: "Смотровой набор одноразовый стоматологический", quantity: 1 * qty, unit: "компл." }];
}
