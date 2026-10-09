/**
 * routes/integrations/prodoctorov/prodoctorovSlotsSync.ts
 * Layer 1: Расчет свободных слотов расписания врачей и генерация YML-прейскуранта 804н.
 */

import { and, eq, lt, ne, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	prodoctorovSyncExports,
	scheduleTimeReservations,
	serviceCatalogItems,
	users,
} from "../../../db/schema.js";
import {
	ALLOWED_NOMENCLATURE_CATEGORIES,
	type AllowedNomenclatureCategory,
	DENTAL_SPECIALTIES_RU,
	type ProdoctorovSlotsResponse,
	type ProdoctorovSyncStatusUpdate,
	type SlotsQueryParams,
} from "./types.js";

/**
 * Фильтр внутренних технических позиций клиники (расходные материалы, технические этапы лаборатории,
 * залоги, документы, рентген). Агрегаторам ПроДокторов и МедФлекс отдаются только клинические услуги 804н.
 */
export function isInternalTechnicalPosition(item: {
	category?: string | null;
	code?: string | null;
	title?: string | null;
}): boolean {
	if (!item) return true;
	const cat = item.category || "";
	if (cat === "other" || cat === "documents" || cat === "imaging") {
		return true;
	}

	const code = (item.code || "").trim().toLowerCase();
	const title = (item.title || "").trim().toLowerCase();

	if (
		code.startsWith("tech_") ||
		code.startsWith("mat_") ||
		code.startsWith("int_") ||
		code.startsWith("lab_") ||
		title.includes("расходн") ||
		title.includes("технический этап") ||
		title.includes("лабораторный этап") ||
		title.includes("индивидуальная ложка") ||
		title.includes("восковое моделирование") ||
		title.includes("слепок") ||
		title.includes("ассистирование") ||
		title.includes("стерилизация") ||
		title.includes("залог") ||
		title.includes("внутренн")
	) {
		return true;
	}

	return false;
}

/**
 * Сопоставление номенклатурной позиции прейскуранта с разрешенной категорией YML.
 * Консультации сопоставляются с профилем врача-специалиста (терапия, ортопедия, хирургия, гигиена).
 */
export function resolveAllowedCategory(item: {
	category?: string | null;
	specialty?: string | null;
}): AllowedNomenclatureCategory | null {
	if (!item) return null;
	const cat = item.category;

	if (cat === "therapy") return "therapy";
	if (cat === "prosthetics") return "prosthetics";
	if (cat === "surgery") return "surgery";
	if (cat === "hygiene") return "hygiene";

	if (cat === "consultation") {
		if (item.specialty === "surgeon" || item.specialty === "implantologist") {
			return "surgery";
		}
		if (item.specialty === "orthopedist") {
			return "prosthetics";
		}
		if (item.specialty === "hygienist") {
			return "hygiene";
		}
		return "therapy";
	}

	if (cat === "periodontology") {
		return "therapy";
	}
	if (cat === "orthodontics") {
		return "prosthetics";
	}

	return null;
}

export function escapeXml(unsafe: string | null | undefined): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export async function resolveOrganizationId(
	request: FastifyRequest,
	bodyOrgId?: string | null,
): Promise<string> {
	if (bodyOrgId && typeof bodyOrgId === "string" && bodyOrgId.trim()) {
		return bodyOrgId.trim();
	}
	const query = request.query as Record<string, unknown> | undefined;
	if (
		typeof query?.organizationId === "string" &&
		query.organizationId.trim()
	) {
		return query.organizationId.trim();
	}
	const headerOrg = request.headers["x-organization-id"];
	if (typeof headerOrg === "string" && headerOrg.trim()) {
		return headerOrg.trim();
	}
	// Fallback к первой организации (для Solo Doctor / 1 кресло по Мандату 8n)
	try {
		const [firstOrg] = await db
			.select({ id: organizations.id })
			.from(organizations)
			.limit(1);
		if (firstOrg?.id) return firstOrg.id;
	} catch {
		// Ignore
	}
	return "00000000-0000-0000-0000-000000000001";
}

// biome-ignore lint/suspicious/noExplicitAny: generic drizzle transaction
export async function syncProdoctorovExportStatus(
	tx: any,
	organizationId: string,
	update: ProdoctorovSyncStatusUpdate,
): Promise<void> {
	try {
		const [existing] = await tx
			.select({ id: prodoctorovSyncExports.id })
			.from(prodoctorovSyncExports)
			.where(eq(prodoctorovSyncExports.organizationId, organizationId))
			.limit(1);

		const now = new Date();
		if (existing) {
			await tx
				.update(prodoctorovSyncExports)
				.set({
					...update,
					lastSyncedAt: now,
				})
				.where(
					and(
						eq(prodoctorovSyncExports.id, existing.id),
						eq(prodoctorovSyncExports.organizationId, organizationId),
					),
				);
		} else {
			await tx.insert(prodoctorovSyncExports).values({
				organizationId,
				priceListSyncStatus: update.priceListSyncStatus ?? "synced",
				availableSlotsCount: update.availableSlotsCount ?? 0,
				medflexClubBadge: true,
				lastSyncedAt: now,
				createdAt: now,
			});
		}
	} catch {
		// Не блокирует основной поток ответа
	}
}

// biome-ignore lint/suspicious/noExplicitAny: generic drizzle transaction
export async function generatePricelistXml(
	tx: any,
	organizationId: string,
): Promise<string> {
	const [org] = await tx
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	const [clinic] = await tx
		.select()
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	const catalogItems = await tx
		.select()
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.organizationId, organizationId),
				eq(serviceCatalogItems.isActive, true),
			),
		);

	const clinicName = clinic?.name || org?.name || "Стоматологическая клиника";
	const companyName = org?.name || clinic?.name || "ООО Стоматология";
	const clinicUrl = org?.website || "https://dente-clinic.ru";
	const clinicPhone = clinic?.phone || "";

	const now = new Date();
	const dateStr = now
		.toISOString()
		.replace(/T/, " ")
		.replace(/\..+/, "")
		.slice(0, 16);

	// Категории: строго разрешенные номенклатурные категории 804н
	const categoriesXml = Object.values(ALLOWED_NOMENCLATURE_CATEGORIES)
		.map(
			(c) => `      <category id="${c.id}">${escapeXml(c.name)}</category>`,
		)
		.join("\n");

	// Позиции прейскуранта: фильтрация внутренних технических позиций и копеечно-точные цены (Мандаты 8b, 8e, 8n)
	const offersXmlLines: string[] = [];
	for (const item of catalogItems) {
		// Отсекаем внутренние расходники, технические этапы лаборатории и документы
		if (isInternalTechnicalPosition(item)) continue;

		const targetCategory = resolveAllowedCategory(item);
		if (!targetCategory) continue;

		const priceNum = Number(item.priceRub ?? item.basePriceRub ?? 0);
		const priceKopecks = Math.round(priceNum * 100);
		// Исключаем бесплатные/нулевые внутренние технические заглушки
		if (priceKopecks <= 0) continue;

		// Целочисленные рубли (например "1500") либо рубли с 2 знаками ("1500.50")
		const formattedPrice =
			priceKopecks % 100 === 0
				? (priceKopecks / 100).toString()
				: (priceKopecks / 100).toFixed(2);

		const code804n = item.order804nCode || item.code;
		const specialtyRu =
			DENTAL_SPECIALTIES_RU[item.specialty] ||
			"Врач-стоматолог общей практики";

		offersXmlLines.push(`      <offer id="${escapeXml(item.id)}" available="true">
        <name>${escapeXml(item.title)}</name>
        <price>${formattedPrice}</price>
        <currencyId>RUR</currencyId>
        <categoryId>${targetCategory}</categoryId>
        <code>${escapeXml(item.code)}</code>
        <param name="Код услуги">${escapeXml(code804n)}</param>
        <param name="Специальность">${escapeXml(specialtyRu)}</param>
        <param name="Длительность (мин)">${item.durationMinutes || 30}</param>
        <param name="Налоговый вычет">${item.taxDeductible ? "Да" : "Нет"}</param>
      </offer>`);
	}

	const offersXml = offersXmlLines.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${dateStr}">
  <shop>
    <name>${escapeXml(clinicName)}</name>
    <company>${escapeXml(companyName)}</company>
    <url>${escapeXml(clinicUrl)}</url>
    <phone>${escapeXml(clinicPhone)}</phone>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`;

	await syncProdoctorovExportStatus(tx, organizationId, {
		priceListSyncStatus: "synced",
	});

	return xml;
}

// biome-ignore lint/suspicious/noExplicitAny: generic drizzle transaction
export async function calculateAvailableSlots(
	tx: any,
	organizationId: string,
	query: SlotsQueryParams,
): Promise<ProdoctorovSlotsResponse> {
	const {
		doctorId,
		startDate: startDateStr,
		endDate: endDateStr,
		durationMinutes,
	} = query;

	// 1. Поиск врачей
	const doctorConditions = [
		eq(users.organizationId, organizationId),
		eq(users.isActive, true),
	];
	if (doctorId) {
		doctorConditions.push(eq(users.id, doctorId));
	}

	let activeDoctors = await tx
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
			specialties: users.specialties,
			workingHours: users.workingHours,
		})
		.from(users)
		.where(and(...doctorConditions));

	// Если врач не найден по строгой роли 'doctor', в соло-клинике берем активных сотрудников (Мандат 8n)
	if (activeDoctors.length === 0 && !doctorId) {
		activeDoctors = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
				specialties: users.specialties,
				workingHours: users.workingHours,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(users.isActive, true),
				),
			)
			.limit(5);
	}

	// 2. Поиск активных кресел
	const activeChairs = await tx
		.select({
			id: chairs.id,
			name: chairs.name,
		})
		.from(chairs)
		.where(
			and(
				eq(chairs.organizationId, organizationId),
				eq(chairs.isActive, true),
			),
		);

	// 3. Расчет диапазона дат (до 30 дней вперед)
	const now = new Date();
	const startDateObj = startDateStr
		? new Date(`${startDateStr}T00:00:00.000Z`)
		: new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");

	const endDateObj = endDateStr
		? new Date(`${endDateStr}T23:59:59.999Z`)
		: new Date(startDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);

	const maxEndMs = startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000;
	const effectiveEndMs = Math.min(endDateObj.getTime(), maxEndMs);

	// 4. Загрузка занятых приемов в диапазоне
	const existingAppts = await tx
		.select({
			id: appointments.id,
			doctorUserId: appointments.doctorUserId,
			chairId: appointments.chairId,
			startsAt: appointments.startsAt,
			endsAt: appointments.endsAt,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				ne(appointments.status, "cancelled"),
				ne(appointments.status, "no_show"),
				lt(appointments.startsAt, new Date(effectiveEndMs)),
				sql`${appointments.endsAt} > ${startDateObj}`,
			),
		);

	// 5. Загрузка технологических блокировок (scheduleTimeReservations)
	const reservations = await tx
		.select()
		.from(scheduleTimeReservations)
		.where(
			and(
				eq(scheduleTimeReservations.organizationId, organizationId),
				eq(scheduleTimeReservations.bookingLocked, true),
			),
		);

	// 6. Генерация слотов
	const doctorsWithSlots: ProdoctorovSlotsResponse["doctors"] = [];
	let totalAvailableSlots = 0;

	for (const doctor of activeDoctors) {
		const doctorSlots: ProdoctorovSlotsResponse["doctors"][0]["slots"] = [];
		const curDate = new Date(startDateObj);
		curDate.setUTCHours(0, 0, 0, 0);

		while (curDate.getTime() <= effectiveEndMs) {
			// ISO weekday: 1 = Mon, 7 = Sun
			const dayOfWeek = curDate.getUTCDay() === 0 ? 7 : curDate.getUTCDay();

			let enabled = true;
			let startMin = 9 * 60; // 09:00
			let endMin = 20 * 60; // 20:00

			// Если у врача заданы персональные workingHours
			if (Array.isArray(doctor.workingHours)) {
				// biome-ignore lint/suspicious/noExplicitAny: generic parsed json
				const dayConf = (doctor.workingHours as any[]).find(
					(d) => d && typeof d === "object" && d.weekday === dayOfWeek,
				);
				if (dayConf) {
					enabled = Boolean(dayConf.enabled);
					if (dayConf.start && typeof dayConf.start === "string") {
						const [h, m] = dayConf.start.split(":").map(Number);
						if (!Number.isNaN(h) && !Number.isNaN(m))
							startMin = h * 60 + m;
					}
					if (dayConf.end && typeof dayConf.end === "string") {
						const [h, m] = dayConf.end.split(":").map(Number);
						if (!Number.isNaN(h) && !Number.isNaN(m)) endMin = h * 60 + m;
					}
				}
			} else {
				// По умолчанию для клиники: Сб 10-18, Вс 10-16
				if (dayOfWeek === 6) {
					startMin = 10 * 60;
					endMin = 18 * 60;
				} else if (dayOfWeek === 7) {
					startMin = 10 * 60;
					endMin = 16 * 60;
				}
			}

			if (enabled && endMin > startMin) {
				for (
					let slotMin = startMin;
					slotMin + durationMinutes <= endMin;
					slotMin += durationMinutes
				) {
					const slotStart = new Date(curDate);
					slotStart.setUTCHours(
						Math.floor(slotMin / 60),
						slotMin % 60,
						0,
						0,
					);
					const slotEnd = new Date(
						slotStart.getTime() + durationMinutes * 60 * 1000,
					);

					// Слот должен быть строго в будущем (+15 минут запас)
					if (slotStart.getTime() <= Date.now() + 15 * 60 * 1000) {
						continue;
					}

					// Проверка занятости врача
					const docBusy = existingAppts.some(
						(a) =>
							a.doctorUserId === doctor.id &&
							a.startsAt < slotEnd &&
							a.endsAt > slotStart,
					);
					if (docBusy) continue;

					// Проверка технологической блокировки
					const resBusy = reservations.some((r) => {
						const rStart = Date.parse(r.startTime);
						const rEnd = Date.parse(r.endTime);
						if (Number.isFinite(rStart) && Number.isFinite(rEnd)) {
							return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
						}
						return false;
					});
					if (resBusy) continue;

					// Проверка доступности хотя бы одного кресла
					let availableChairId: string | null = null;
					let availableChairName: string | null = null;

					if (activeChairs.length > 0) {
						const foundChair = activeChairs.find((ch) => {
							const chairBusy = existingAppts.some(
								(a) =>
									a.chairId === ch.id &&
									a.startsAt < slotEnd &&
									a.endsAt > slotStart,
							);
							return !chairBusy;
						});
						if (!foundChair) {
							// Все кресла заняты в этот слот
							continue;
						}
						availableChairId = foundChair.id;
						availableChairName = foundChair.name;
					}

					doctorSlots.push({
						startsAt: slotStart.toISOString(),
						endsAt: slotEnd.toISOString(),
						durationMinutes,
						chairId: availableChairId,
						chairName: availableChairName,
					});
				}
			}

			curDate.setUTCDate(curDate.getUTCDate() + 1);
		}

		totalAvailableSlots += doctorSlots.length;
		doctorsWithSlots.push({
			doctorId: doctor.id,
			doctorName: doctor.fullName,
			specialties: Array.isArray(doctor.specialties)
				? (doctor.specialties as string[])
				: [],
			availableSlotsCount: doctorSlots.length,
			slots: doctorSlots,
		});
	}

	// Обновляем статистику в БД
	await syncProdoctorovExportStatus(tx, organizationId, {
		availableSlotsCount: totalAvailableSlots,
	});

	return {
		success: true,
		organizationId,
		startDate: startDateObj.toISOString().slice(0, 10),
		endDate: new Date(effectiveEndMs).toISOString().slice(0, 10),
		totalAvailableSlots,
		doctors: doctorsWithSlots,
	};
}
