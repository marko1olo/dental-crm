/**
 * writeOffValidation.ts — Схемы валидации и нормализация запросов списания ТМЦ (Мандат 8b, <= 110L).
 * Обеспечивает Soft Negative Stock (Мандат 8n) и автономию врача (Мандат 8e).
 */

import { z } from "zod";
import type { DbExecutor } from "../../../services/treatmentConsumables/types.js";

export type DatabaseTransaction = DbExecutor;

export interface QuickWriteoffStandardKitBody {
	cabinetId?: string;
	visitId?: string;
	notes?: string;
}

export interface QuickWriteoffCarpulesBody {
	carpulesCount?: number;
	count?: number;
	drugName?: string;
	drugId?: string;
	patientId?: string;
	visitId?: string;
	notes?: string;
}

export interface QuickWriteoffShiftBundleBody {
	bundleType?: "therapy" | "orthopedics" | "surgery";
	visitId?: string;
	notes?: string;
}

export interface QuickWriteoffVisitBundleBody {
	visitType?: "therapy" | "surgery" | "implant" | "sinus_gbr" | "orthopedics_prep" | "orthopedics_impression" | "orthopedics_temporary" | "orthopedics_cementation" | "hygiene";
	visitId?: string;
	notes?: string;
	toothNumber?: string | number;
}

export interface QuickWriteoffOrthopedicBody {
	protocolId?: string;
	visitId?: string;
	toothNumber?: string | number;
	notes?: string;
}

export interface QuickWriteoffSurgeryBody {
	protocolId?: string;
	category?: "extraction" | "implant" | "sinus_gbr" | "perio_surgery" | string;
	operationTitle?: string;
	toothNumber?: string | number;
	visitId?: string;
	notes?: string;
	materials?: Array<{ name: string; unit?: string; quantity?: number; isWarehouseCritical?: boolean }>;
}

export interface QuickWriteoffPackageBody {
	packageId?: string;
	quantityMultiplier?: number;
	cabinetId?: string;
	visitId?: string;
	notes?: string;
	allowOverdraft?: boolean;
	allowSoftOverdraft?: boolean;
}

/**
 * Нормализация тела запроса списания по визиту с Soft Negative Stock (allowSoftOverdraft = true по дефолту).
 */
export function normalizeVisitDeductionBody(rawBody: unknown): unknown {
	if (!rawBody || typeof rawBody !== "object") return rawBody;
	const b = rawBody as Record<string, any>;
	const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
	const rawItems = b.items ?? b.materials;
	let items: any[] | undefined = undefined;

	if (Array.isArray(rawItems)) {
		items = rawItems
			.filter((it) => it && (it.inventoryItemId || it.inventory_item_id || it.id))
			.map((it) => ({
				inventoryItemId: String(it.inventoryItemId ?? it.inventory_item_id ?? it.id).trim(),
				quantity: Number(it.quantity),
				reason: it.reason ?? it.notes ?? b.notes,
			}));
	}

	let services: any[] | undefined = undefined;
	if (Array.isArray(b.services)) {
		services = b.services
			.filter(Boolean)
			.map((srv: any) => {
				if (typeof srv === "string") return { serviceId: srv.trim(), quantity: 1 };
				const sid = String(srv.serviceId ?? srv.code804n ?? srv.serviceCode ?? srv.code ?? srv.id ?? srv.titleRu ?? srv.name ?? "").trim();
				const qty = Number(srv.quantity ?? 1);
				return { serviceId: sid, quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 };
			})
			.filter((srv) => srv.serviceId.length > 0);
	}

	return {
		...b,
		visitId: rawVisitId,
		...(services !== undefined ? { services } : {}),
		items,
		// Мандат 8n: Soft Negative Stock включен по умолчанию для всех клинических списаний
		allowOverdraft: b.allowOverdraft ?? b.allowSoftOverdraft ?? b.clamp_at_zero ?? true,
	};
}
