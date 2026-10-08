/**
 * @file priceList.ts
 * @description Layer 1: Dental service catalog fixtures and catalog item map.
 */
import { inMemoryDomainState } from "./domainState.js";
import type { DomainState } from "../types/domainState.js";


import type { ServiceCatalogItem } from "@dental/shared";
import { organizationId } from "./fixtureIds.js";

export const serviceCatalogMap = new Map<string, ServiceCatalogItem>();

/**
 * Услуга по идентификатору. Обращения к прайсу шли то через индекс, то линейным
 * поиском по массиву — из-за этого одна и та же услуга в разных местах могла
 * находиться и не находиться. Здесь единая точка: индекс, а при промахе —
 * поиск по массиву с достройкой индекса.
 */
export function getServiceCatalogItem(
	serviceId: string,
	state: DomainState = inMemoryDomainState,
): ServiceCatalogItem | undefined {
	/*
	 * ПАМЯТЬ ПОИСКА — ТОЛЬКО ДЛЯ ОБЩЕГО СРЕЗА.
	 *
	 * `serviceCatalogMap` общий на процесс. Для среза конкретной клиники он
	 * непригоден: услуга с тем же идентификатором из ДРУГОЙ клиники осталась бы в
	 * памяти и вернулась сюда — это межарендная утечка в чистом виде. Поэтому по
	 * срезу базы ищем в его собственном списке и ничего не запоминаем.
	 */
	if (state !== inMemoryDomainState) {
		return state.serviceCatalog.find(
			(catalogItem) => catalogItem.id === serviceId,
		);
	}
	const indexed = serviceCatalogMap.get(serviceId);
	if (indexed !== undefined) return indexed;
	const found = serviceCatalog.find(
		(catalogItem) => catalogItem.id === serviceId,
	);
	if (found) serviceCatalogMap.set(serviceId, found);
	return found;
}

export const serviceCatalog: ServiceCatalogItem[] = [
	{
		id: "svc-consult-primary",
		organizationId,
		code: "A01.07.001",
		title: "Первичная консультация стоматолога",
		aliases: [],
		category: "consultation",
		specialty: "universal",
		basePriceRub: 1200,
		durationMinutes: 30,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-therapy-caries",
		organizationId,
		code: "A16.07.002",
		title: "Лечение кариеса с восстановлением",
		aliases: [],
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6800,
		durationMinutes: 60,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-therapy-cofferdam",
		organizationId,
		code: "A16.07.093",
		title: "Изоляция коффердамом",
		aliases: [],
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 1500,
		durationMinutes: 10,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-hygiene-pro",
		organizationId,
		code: "A16.07.051",
		title: "Профессиональная гигиена",
		aliases: [],
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 4500,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-imaging-opg",
		organizationId,
		code: "A06.07.004",
		title: "ОПТГ",
		aliases: [],
		category: "imaging",
		specialty: "radiologist",
		basePriceRub: 1800,
		durationMinutes: 15,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-surgery-extraction",
		organizationId,
		code: "A16.07.001",
		title: "Удаление зуба",
		aliases: [],
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 5200,
		durationMinutes: 45,
		taxDeductible: true,
		active: true,
	},
	{
		id: "svc-prosthetics-crown",
		organizationId,
		code: "A16.07.006",
		title: "Коронка керамическая",
		aliases: [],
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 26000,
		durationMinutes: 75,
		taxDeductible: true,
		active: true,
	},
];
