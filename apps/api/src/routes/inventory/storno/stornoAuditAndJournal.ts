/**
 * stornoAuditAndJournal.ts — Журнал сторно и аудит мягкого овердрафта (Мандаты 8e, 8n, 8x).
 * Фиксация дефицита ТМЦ при приеме пациента без блокировки лечения и резолв материалов услуг.
 */

import { and, eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DEFAULT_804N_CONSUMABLE_LINKS } from "@dental/shared";
import { db } from "../../../db/client.js";
import {
	inventoryTransactions,
	procedureMaterialRules,
} from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	inventoryOverdraftAlertBodySchema,
	toValidUuid,
} from "../types.js";

export interface StornoMaterialTarget {
	inventoryItemId?: string | undefined;
	name?: string | undefined;
	quantity: number;
	serviceTitle?: string | undefined;
}

/**
 * Формирует запись журнала сторно на понятном русском языке без канцелярита (Мандат 8x).
 */
export function buildStornoJournalNote(params: {
	customNote?: string | null | undefined;
	reason?: string | null | undefined;
	serviceTitle?: string | null | undefined;
	quantity: number;
	unitName?: string | null | undefined;
}): string {
	if (params.customNote?.trim()) return params.customNote.trim();
	if (params.reason?.trim()) return params.reason.trim();

	const title = params.serviceTitle || "услуга";
	const unit = params.unitName || "ед.";
	return `Возврат материалов на склад при отмене услуги «${title}» (+${params.quantity} ${unit})`;
}

/**
 * Формирует запись журнала мягкого овердрафта (дефицит ТМЦ у кресла).
 */
export function buildOverdraftJournalNote(params: {
	itemName?: string | null | undefined;
	cabinetId?: string | null | undefined;
	chairId?: string | null | undefined;
	message?: string | null | undefined;
}): string {
	const parts: string[] = ["[Дефицит/Овердрафт]"];
	if (params.itemName) parts.push(`Материал: ${params.itemName}.`);
	if (params.cabinetId) parts.push(`Кабинет: ${params.cabinetId}.`);
	if (params.chairId) parts.push(`Кресло: ${params.chairId}.`);
	if (params.message) parts.push(params.message);
	return parts.join(" ").trim();
}

/**
 * Резолвит состав расходных материалов по услуге (БД rules -> 804н техкарты -> клинический fallback).
 */
export async function resolveServiceStornoMaterials(
	srv: {
		serviceId?: string | null | undefined;
		code804n?: string | null | undefined;
		serviceCode?: string | null | undefined;
		title?: string | null | undefined;
		quantity?: number | null | undefined;
	},
	organizationId: string,
	tx: any,
): Promise<StornoMaterialTarget[]> {
	const materials: StornoMaterialTarget[] = [];
	const srvQty = srv.quantity ?? 1;
	const srvCode = (srv.code804n || srv.serviceCode || "").trim().toUpperCase();
	const srvTitle = srv.title || srvCode || "Стоматологическая услуга";

	// 1. Поиск в БД (procedureMaterialRules)
	let dbRules: Array<{
		inventoryItemId: string | null;
		materialItemId: string | null;
		quantityToDeduct: string | null;
		requiredQty: string | null;
		materialName: string | null;
	}> = [];

	if (srv.serviceId || srvCode) {
		const conditions = [eq(procedureMaterialRules.organizationId, organizationId)];
		if (srv.serviceId && srvCode) {
			conditions.push(
				or(
					eq(procedureMaterialRules.serviceId, srv.serviceId),
					eq(procedureMaterialRules.serviceCode, srvCode),
				)!,
			);
		} else if (srv.serviceId) {
			conditions.push(eq(procedureMaterialRules.serviceId, srv.serviceId));
		} else {
			conditions.push(eq(procedureMaterialRules.serviceCode, srvCode));
		}
		dbRules = await tx
			.select({
				inventoryItemId: procedureMaterialRules.inventoryItemId,
				materialItemId: procedureMaterialRules.materialItemId,
				quantityToDeduct: procedureMaterialRules.quantityToDeduct,
				requiredQty: procedureMaterialRules.requiredQty,
				materialName: procedureMaterialRules.materialName,
			})
			.from(procedureMaterialRules)
			.where(and(...conditions));
	}

	if (dbRules.length > 0) {
		for (const r of dbRules) {
			const itemId = r.inventoryItemId || r.materialItemId;
			const unitQty = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
			materials.push({
				inventoryItemId: itemId ?? undefined,
				name: r.materialName ?? undefined,
				quantity: Number((unitQty * srvQty).toFixed(4)),
				serviceTitle: srvTitle,
			});
		}
		return materials;
	}

	// 2. Статутные техкарты 804н (DEFAULT_804N_CONSUMABLE_LINKS)
	const matchedLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter(
		(l) =>
			l.service804nCode.toUpperCase() === srvCode ||
			srvCode.startsWith(l.service804nCode.toUpperCase()),
	);

	if (matchedLinks.length > 0) {
		for (const link of matchedLinks) {
			materials.push({
				name: link.itemName,
				quantity: Number((link.quantityPerService * srvQty).toFixed(4)),
				serviceTitle: srvTitle,
			});
		}
		return materials;
	}

	// 3. Fallback по ключевым клиническим словам
	const normName = srvTitle.toLowerCase();
	if (
		normName.includes("анестез") ||
		srvCode.includes("004") ||
		srvCode.includes("012")
	) {
		materials.push(
			{
				name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
			{
				name: "Игла карпульная стоматологическая 30G",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
		);
	} else if (
		normName.includes("кариес") ||
		normName.includes("пломб") ||
		srvCode.includes("002")
	) {
		materials.push(
			{
				name: "Композит светоотверждаемый Filtek / Estelite",
				quantity: Number((0.4 * srvQty).toFixed(2)),
				serviceTitle: srvTitle,
			},
			{
				name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
			{
				name: "Полировочная головка Enhance",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
		);
	} else if (normName.includes("гигиен") || srvCode.includes("051")) {
		materials.push(
			{
				name: "Порошок для Air-Flow",
				quantity: 25 * srvQty,
				serviceTitle: srvTitle,
			},
			{
				name: "Паста полировочная Cleanic",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
		);
	} else if (
		normName.includes("удален") ||
		normName.includes("экстракц") ||
		srvCode.includes("001")
	) {
		materials.push(
			{
				name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
			{
				name: "Игла карпульная стоматологическая",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
			{
				name: "Гемостатическая губка Альвостаз",
				quantity: 1 * srvQty,
				serviceTitle: srvTitle,
			},
		);
	} else if (
		normName.includes("визиограф") ||
		normName.includes("снимок") ||
		srvCode.includes("003")
	) {
		materials.push({
			name: "Чехол защитный для датчика визиографа",
			quantity: 1 * srvQty,
			serviceTitle: srvTitle,
		});
	} else {
		materials.push({
			name: "Стандартный набор расходников приёма",
			quantity: 1 * srvQty,
			serviceTitle: srvTitle,
		});
	}

	return materials;
}

/**
 * Обработчик асинхронного оповещения об овердрафте (Мандат 8n).
 * Прием врача не прерывается, дефицит мягко фиксируется в бэк-офисе.
 */
export async function handleOverdraftAlertRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = inventoryOverdraftAlertBodySchema.safeParse(rawBody ?? {});
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный формат оповещения об овердрафте",
			details: parsed.error.errors,
		});
	}

	const data = parsed.data;
	const safeVisitId = toValidUuid(data.visitId);
	const identity = getRequestIdentity(request);
	const userContext = request.user;
	const effectiveUserId = toValidUuid(identity.userId ?? userContext?.id ?? null);

	try {
		let recordedCount = 0;
		if (data.items && data.items.length > 0) {
			const txRecords = data.items.map((it) => {
				const rawItemId = it.itemId || it.inventoryItemId;
				const validItemId = toValidUuid(rawItemId);
				const deficit = it.deficitQty ?? it.quantity ?? 1;
				return {
					organizationId,
					itemId: validItemId,
					inventoryItemId: validItemId,
					visitId: safeVisitId,
					transactionType: "emergency_overdraft",
					quantityChanged: `-${deficit}`,
					qty: `-${deficit}`,
					isOverdraft: true,
					notes: buildOverdraftJournalNote({
						itemName: it.itemName,
						cabinetId: data.cabinetId,
						chairId: data.chairId,
						message: data.message,
					}),
					userId: effectiveUserId,
				};
			});

			await db.transaction(async (tx) => {
				await tx.insert(inventoryTransactions).values(txRecords);
			});
			recordedCount = txRecords.length;
		}

		return reply.status(200).send({
			success: true,
			status: "recorded",
			recordedCount,
			isOverdraft: true,
			message: `Зафиксирован мягкий овердрафт: ${recordedCount} поз. (клинический прием не прерывается)`,
		});
	} catch (error) {
		request.log.error(error, "Failed to record inventory overdraft alert");
		return reply.status(500).send({
			error: "OverdraftAlertFailed",
			message: "Ошибка фиксации овердрафта в журнале склада",
		});
	}
}
