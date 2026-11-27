/**
 * routes/integrations/prodoctorov/prodoctorovSlotsSync.ts
 * Layer 1: Расчет свободных слотов расписания врачей и генерация YML-прейскуранта 804н.
 */

import { and, eq, lt, ne, sql } from "drizzle-orm";
import { formatKopecksToRubles, rublesToKopecks } from "@dental/shared";
import { type TenantDb } from "../../../db/client.js";
import { isReservationMatchingChair } from "../../../db/appointmentsQueryModules/scheduleReservationLockHelpers.js";
import { withSavepoint } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	medflexDoctorMappings,
	organizations,
	prodoctorovSyncExports,
	scheduleTimeReservations,
	serviceCatalogItems,
	users,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import {
	ALLOWED_NOMENCLATURE_CATEGORIES,
	type AllowedNomenclatureCategory,
	DENTAL_SPECIALTIES_RU,
	type ProdoctorovSlotsResponse,
	type ProdoctorovSyncStatusUpdate,
	type SlotsQueryParams,
} from "./types.js";

const slotsSyncLogger = createApiLogger("prodoctorovSlotsSync");

function resolveValidTimeZone(rawTimeZone: string | null | undefined): string {
	const candidate = (rawTimeZone || "").trim() || "Europe/Samara";
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: candidate });
		return candidate;
	} catch {
		return "Europe/Samara";
	}
}

function zonedWallClockToUtcDate(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string,
): Date {
	const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
	const dtf = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const getOffsetMs = (ms: number): number => {
		const parts = dtf.formatToParts(new Date(ms));
		const map: Record<string, number> = {};
		for (const p of parts) {
			if (p.type !== "literal") {
				map[p.type] = Number.parseInt(p.value, 10);
			}
		}
		const h = map.hour === 24 ? 0 : (map.hour ?? 0);
		const wallMs = Date.UTC(
			map.year ?? year,
			(map.month ?? month) - 1,
			map.day ?? day,
			h,
			map.minute ?? minute,
			map.second ?? 0,
		);
		return wallMs - ms;
	};
	const offset1 = getOffsetMs(utcGuessMs);
	const offset2 = getOffsetMs(utcGuessMs - offset1);
	return new Date(utcGuessMs - offset2);
}

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

export async function syncProdoctorovExportStatus(
	tx: TenantDb,
	organizationId: string,
	update: ProdoctorovSyncStatusUpdate,
): Promise<void> {
	try {
		await withSavepoint(tx, async (spTx) => {
			const [existing] = await spTx
				.select({ id: prodoctorovSyncExports.id })
				.from(prodoctorovSyncExports)
				.where(eq(prodoctorovSyncExports.organizationId, organizationId))
				.limit(1);

			const now = new Date();
			if (existing) {
				await spTx
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
				await spTx.insert(prodoctorovSyncExports).values({
					organizationId,
					priceListSyncStatus: update.priceListSyncStatus ?? "synced",
					availableSlotsCount: update.availableSlotsCount ?? 0,
					medflexClubBadge: true,
					lastSyncedAt: now,
					createdAt: now,
				});
			}
		});
	} catch (err) {
		slotsSyncLogger.warn(
			{ err: safeLogError(err), organizationId },
			"[ProdoctorovSlotsSync] Failed to update export sync status",
		);
	}
}

export async function generatePricelistXml(
	tx: TenantDb,
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

	// Позиции прейскуранта: строго целые копейки из priceKopecks / basePriceKopecks (Мандат 8bm)
	const offersXmlLines: string[] = [];
	for (const item of catalogItems) {
		if (isInternalTechnicalPosition(item)) continue;

		const targetCategory = resolveAllowedCategory(item);
		if (!targetCategory) continue;

		const kopecksFromDb =
			item.priceKopecks > 0n
				? item.priceKopecks
				: item.basePriceKopecks > 0n
					? item.basePriceKopecks
					: BigInt(rublesToKopecks(Number(item.priceRub ?? item.basePriceRub ?? 0)));
		if (kopecksFromDb <= 0n) continue;

		const formattedPrice = formatKopecksToRubles(kopecksFromDb);

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

export async function calculateAvailableSlots(
	tx: TenantDb,
	organizationId: string,
	query: SlotsQueryParams,
): Promise<ProdoctorovSlotsResponse> {
	const {
		doctorId,
		startDate: startDateStr,
		endDate: endDateStr,
		durationMinutes,
	} = query;

	const [clinic] = await tx
		.select({ timezone: clinics.timezone })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);
	const clinicTimeZone = resolveValidTimeZone(clinic?.timezone);

	// 0. Загрузка маппингов внешних ID врачей МедФлекс / ПроДокторов
	const mappings = await tx
		.select()
		.from(medflexDoctorMappings)
		.where(eq(medflexDoctorMappings.organizationId, organizationId));

	const mappingByStaffId = new Map<string, string>();
	const staffIdByExternalId = new Map<string, string>();
	for (const m of mappings) {
		if (m.isSyncEnabled) {
			mappingByStaffId.set(m.staffId, m.externalDoctorId);
			staffIdByExternalId.set(m.externalDoctorId, m.staffId);
		}
	}

	const resolvedDoctorId = doctorId
		? (staffIdByExternalId.get(doctorId) ?? doctorId)
		: undefined;

	// 1. Поиск врачей строго по роли "doctor" (без утечки администраторов/медсестер в публичные слоты)
	const doctorConditions = [
		eq(users.organizationId, organizationId),
		eq(users.isActive, true),
		eq(users.role, "doctor"),
	];
	if (resolvedDoctorId) {
		doctorConditions.push(eq(users.id, resolvedDoctorId));
	}

	const activeDoctors = await tx
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
			specialties: users.specialties,
			workingHours: users.workingHours,
		})
		.from(users)
		.where(and(...doctorConditions));

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

	// 3. Расчет диапазона локальных дат клиники (до 30 дней вперед)
	const now = new Date();
	const todayClinicStr = new Intl.DateTimeFormat("en-CA", {
		timeZone: clinicTimeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);

	const effectiveStartStr = startDateStr ?? todayClinicStr;
	const startParts = effectiveStartStr.split("-").map(Number);
	const startUtcCalendar = new Date(
		Date.UTC(startParts[0] ?? 2026, (startParts[1] ?? 1) - 1, startParts[2] ?? 1),
	);

	const requestedEndCalendar = endDateStr
		? (() => {
				const p = endDateStr.split("-").map(Number);
				return new Date(Date.UTC(p[0] ?? 2026, (p[1] ?? 1) - 1, p[2] ?? 1));
			})()
		: new Date(startUtcCalendar.getTime() + 14 * 24 * 60 * 60 * 1000);

	const maxEndCalendarMs = startUtcCalendar.getTime() + 30 * 24 * 60 * 60 * 1000;
	const effectiveEndCalendarMs = Math.min(requestedEndCalendar.getTime(), maxEndCalendarMs);
	const effectiveEndCalendar = new Date(effectiveEndCalendarMs);

	const rangeStartInstant = zonedWallClockToUtcDate(
		startUtcCalendar.getUTCFullYear(),
		startUtcCalendar.getUTCMonth() + 1,
		startUtcCalendar.getUTCDate(),
		0,
		0,
		clinicTimeZone,
	);
	const rangeEndInstant = zonedWallClockToUtcDate(
		effectiveEndCalendar.getUTCFullYear(),
		effectiveEndCalendar.getUTCMonth() + 1,
		effectiveEndCalendar.getUTCDate(),
		23,
		59,
		clinicTimeZone,
	);

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
				lt(appointments.startsAt, rangeEndInstant),
				sql`${appointments.endsAt} > ${rangeStartInstant}`,
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

	// 6. Генерация слотов в часовом поясе клиники
	const doctorsWithSlots: ProdoctorovSlotsResponse["doctors"] = [];
	let totalAvailableSlots = 0;

	for (const doctor of activeDoctors) {
		const doctorSlots: ProdoctorovSlotsResponse["doctors"][0]["slots"] = [];
		const curDay = new Date(startUtcCalendar);

		while (curDay.getTime() <= effectiveEndCalendarMs) {
			const year = curDay.getUTCFullYear();
			const month = curDay.getUTCMonth() + 1;
			const day = curDay.getUTCDate();
			// ISO weekday: 1 = Mon, 7 = Sun
			const dayOfWeek = curDay.getUTCDay() === 0 ? 7 : curDay.getUTCDay();

			let enabled = true;
			let startMin = 9 * 60; // 09:00 local clinic time
			let endMin = 20 * 60; // 20:00 local clinic time

			if (Array.isArray(doctor.workingHours)) {
				interface DoctorWorkingHourDay {
					weekday?: number;
					enabled?: boolean;
					start?: string;
					end?: string;
				}
				const hoursList = doctor.workingHours as DoctorWorkingHourDay[];
				const dayConf = hoursList.find(
					(d) => d && typeof d === "object" && d.weekday === dayOfWeek,
				);
				if (dayConf) {
					enabled = Boolean(dayConf.enabled);
					if (dayConf.start && typeof dayConf.start === "string") {
						const parts = dayConf.start.split(":").map(Number);
						const h = parts[0];
						const m = parts[1];
						if (h !== undefined && m !== undefined && !Number.isNaN(h) && !Number.isNaN(m)) {
							startMin = h * 60 + m;
						}
					}
					if (dayConf.end && typeof dayConf.end === "string") {
						const parts = dayConf.end.split(":").map(Number);
						const h = parts[0];
						const m = parts[1];
						if (h !== undefined && m !== undefined && !Number.isNaN(h) && !Number.isNaN(m)) {
							endMin = h * 60 + m;
						}
					}
				}
			} else {
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
					const slotStart = zonedWallClockToUtcDate(
						year,
						month,
						day,
						Math.floor(slotMin / 60),
						slotMin % 60,
						clinicTimeZone,
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

					// Проверка доступности хотя бы одного кресла с учетом занятости и технологических резерваций
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
							if (chairBusy) return false;

							const chairReserved = reservations.some((r) => {
								const matchesChair =
									isReservationMatchingChair(r.chairName, ch.name) ||
									(r as { chairId?: string }).chairId === ch.id;

								if (!matchesChair) return false;

								const rStart = Date.parse(r.startTime);
								const rEnd = Date.parse(r.endTime);
								if (Number.isFinite(rStart) && Number.isFinite(rEnd)) {
									return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
								}
								return false;
							});

							return !chairReserved;
						});

						if (!foundChair) {
							continue;
						}
						availableChairId = foundChair.id;
						availableChairName = foundChair.name;
					} else {
						const generalResBusy = reservations.some((r) => {
							if (!isReservationMatchingChair(r.chairName, null)) return false;
							const rStart = Date.parse(r.startTime);
							const rEnd = Date.parse(r.endTime);
							if (Number.isFinite(rStart) && Number.isFinite(rEnd)) {
								return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
							}
							return false;
						});
						if (generalResBusy) continue;
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

			curDay.setUTCDate(curDay.getUTCDate() + 1);
		}

		totalAvailableSlots += doctorSlots.length;
		doctorsWithSlots.push({
			doctorId: doctor.id,
			externalDoctorId: mappingByStaffId.get(doctor.id) ?? null,
			doctorName: doctor.fullName,
			specialties: Array.isArray(doctor.specialties)
				? (doctor.specialties as string[])
				: [],
			availableSlotsCount: doctorSlots.length,
			slots: doctorSlots,
		});
	}

	await syncProdoctorovExportStatus(tx, organizationId, {
		availableSlotsCount: totalAvailableSlots,
	});

	return {
		success: true,
		organizationId,
		startDate: effectiveStartStr,
		endDate: effectiveEndCalendar.toISOString().slice(0, 10),
		totalAvailableSlots,
		doctors: doctorsWithSlots,
	};
}
