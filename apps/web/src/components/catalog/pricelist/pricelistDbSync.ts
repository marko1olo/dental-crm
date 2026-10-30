/**
 * DENTE Dental CRM — Service Catalog PostgreSQL & Fastify SSOT Sync Engine
 * Mandates 8b, 8e, 8n: Real Database Hydration with Safe Offline Fallbacks
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { requestBatchRepriceApi } from "./serviceBatchRepriceApi";
import type {
	DoctorSpecialty,
	PriceTierKind,
	ServiceCategory,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export function normalizeCategoryFromDb(raw: string | undefined | null): ServiceCategory {
	if (!raw) return "other";
	const cat = raw.toLowerCase().trim();
	if (cat === "prosthetics") return "orthopedics";
	if (cat === "periodontology") return "periodontics";
	if (cat === "imaging") return "radiology";
	if (
		[
			"therapy",
			"surgery",
			"orthopedics",
			"orthodontics",
			"pediatric",
			"radiology",
			"hygiene",
			"periodontics",
			"anesthesia",
			"consultation",
			"package",
		].includes(cat)
	) {
		return cat as ServiceCategory;
	}
	return "other";
}

export function normalizeSpecialtyFromDb(raw: string | undefined | null): DoctorSpecialty {
	if (!raw) return "general";
	const spec = raw.toLowerCase().trim();
	if (spec === "therapy") return "therapist";
	if (spec === "surgery") return "surgeon";
	if (spec === "orthopedics") return "orthopedist";
	if (spec === "orthodontics") return "orthodontist";
	if (spec === "diagnostic") return "radiologist";
	if (spec === "anesthesiology") return "anesthesiologist";
	if (spec === "universal") return "general";
	if (
		[
			"therapist",
			"surgeon",
			"orthopedist",
			"orthodontist",
			"pediatric",
			"hygienist",
			"radiologist",
			"anesthesiologist",
			"general",
		].includes(spec)
	) {
		return spec as DoctorSpecialty;
	}
	return "general";
}

export function mapCatalogRowsToPricelist(
	rows: readonly any[],
): ServicePricelistItem[] {
	return rows.map((r): ServicePricelistItem => {
		const basePriceRub = Number(r.basePriceRub ?? r.priceRub ?? 0);
		const statutoryCode = String(r.order804nCode || r.code || "").trim();
		const title = String(r.title || r.commercialTitle || "Услуга без названия").trim();
		const tierPrices: Partial<Record<PriceTierKind, number>> = {};
		if (r.tierPrices && typeof r.tierPrices === "object") {
			Object.assign(tierPrices, r.tierPrices);
		}

		return {
			id: String(r.id),
			statutoryCode,
			code804n: statutoryCode,
			statutoryTitle: title,
			statutoryTitle804n: title,
			commercialTitle: title,
			category: normalizeCategoryFromDb(r.category),
			specialty: normalizeSpecialtyFromDb(r.specialty),
			basePriceRub,
			basePriceKopecks: Math.round(basePriceRub * 100),
			materialCostRub:
				r.materialsCostRub !== undefined && r.materialsCostRub !== null
					? Number(r.materialsCostRub)
					: r.materialCostRub !== undefined && r.materialCostRub !== null
						? Number(r.materialCostRub)
						: 0,
			labCostRub: r.labCostRub ? Number(r.labCostRub) : 0,
			tierPrices: Object.keys(tierPrices).length > 0 ? tierPrices : undefined,
			vatRate: 0,
			vatExemptionArticle: "Без НДС",
			icd10Indications: Array.isArray(r.icd10Indications) ? r.icd10Indications : [],
			estimatedDurationMin: Number(r.durationMinutes ?? r.estimatedDurationMin ?? 30),
			isAnatomicalCanalScalable: Boolean(r.isAnatomicalCanalScalable),
			isClinicPackage: Boolean(r.isClinicPackage),
			isActive: r.active ?? r.isActive ?? true,
			isArchived: !(r.active ?? r.isActive ?? true),
			tags: Array.isArray(r.tags) ? r.tags : [],
		};
	});
}

/**
 * Загрузка актуального прейскуранта клиники из Fastify API (PostgreSQL SSOT).
 */
export async function fetchPricelistFromBackend(
	adminSecret?: string,
): Promise<readonly ServicePricelistItem[] | null> {
	try {
		const headers = denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		);
		const res = await fetch("/api/pricelists", { headers });
		if (!res.ok) {
			const fallbackRes = await fetch("/api/pricelist", { headers });
			if (!fallbackRes.ok) return null;
			const fbData = await fallbackRes.json();
			if (fbData?.success && Array.isArray(fbData.items)) {
				return mapCatalogRowsToPricelist(fbData.items);
			}
			return null;
		}
		const data = await res.json();
		if (data?.success && Array.isArray(data.items)) {
			return mapCatalogRowsToPricelist(data.items);
		}
	} catch (err) {
		console.warn("[pricelist-db-sync] Fetch /api/pricelists failed, using offline cache:", err);
	}
	return null;
}

/**
 * Быстрое сохранение измененной цены позиции в PostgreSQL.
 */
export async function syncInlinePriceToBackend(
	serviceId: string,
	newPriceRub: number,
	adminSecret?: string,
): Promise<boolean> {
	try {
		const headers = denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		);
		const res = await fetch(`/api/settings/catalog/${serviceId}`, {
			method: "PUT",
			headers,
			body: JSON.stringify({ basePriceRub: newPriceRub }),
		});
		if (res.ok) return true;
		if (res.status === 404) {
			const repriceRes = await requestBatchRepriceApi(
				{ fixedRubChange: 0, serviceIds: [serviceId] },
				adminSecret,
			);
			return repriceRes?.success ?? false;
		}
	} catch {
		// Offline fallback
	}
	return false;
}

/**
 * Создание или обновление услуги в базе данных клиники.
 */
export async function syncServiceItemToBackend(
	item: ServicePricelistItem,
	isNew: boolean,
	adminSecret?: string,
): Promise<boolean> {
	try {
		const headers = denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		);
		const url = isNew ? "/api/settings/catalog" : `/api/settings/catalog/${item.id}`;
		const method = isNew ? "POST" : "PUT";
		const body = {
			code: item.statutoryCode || item.code804n,
			title: item.commercialTitle,
			category: item.category,
			specialty: item.specialty,
			basePriceRub: item.basePriceRub,
			durationMinutes: item.estimatedDurationMin,
			materialsCostRub: item.materialCostRub ?? 0,
			taxDeductible: true,
			active: item.isActive,
		};
		const res = await fetch(url, {
			method,
			headers,
			body: JSON.stringify(body),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Мягкая архивация / деактивация услуги в PostgreSQL.
 */
export async function syncDeactivateServiceToBackend(
	serviceId: string,
	adminSecret?: string,
): Promise<boolean> {
	try {
		const headers = denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		);
		const res = await fetch(`/api/settings/catalog/${serviceId}`, {
			method: "DELETE",
			headers,
		});
		return res.ok;
	} catch {
		return false;
	}
}
