/**
 * routes/integrations/prodoctorov.ts — Интеграция с ПроДокторов / МедФлекс (MedFlex).
 *
 * Спецификация (BACKLOG.md Часть I-B, Фича 17 / Mandates 8b, 8e, 8n):
 * 1. GET  /api/integrations/prodoctorov/pricelist.xml — Генерация валидного XML/YML фида
 *    стоматологического прейскуранта клиники по номенклатуре 804н.
 * 2. GET  /api/integrations/prodoctorov/slots — Выдача свободных слотов расписания врачей
 *    с защитой от овербукинга.
 * 3. POST /api/integrations/prodoctorov/webhook — Прием бронирования от ПроДокторов/МедФлекс
 *    с созданием записи и пациента без обязательного ассистента (Мандат 8e/8n).
 *
 * Также зарегистрированы алиасы:
 * - GET  /api/integrations/medflex/pricelist.xml
 * - GET  /api/integrations/medflex/slots
 * - POST /api/integrations/medflex/webhook
 * - POST /api/integrations/medflex/webhook/booking
 */

import { and, eq, ilike, lt, ne, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	externalScheduleActionLogs,
	organizations,
	patients,
	prodoctorovSyncExports,
	scheduleTimeReservations,
	serviceCatalogItems,
	users,
} from "../../db/schema.js";
import { verifyWebhookSecret } from "../../security/webhookAuth.js";
import { wsBroker } from "../../services/websocketBroker.js";

// ─── СЛОВАРИ ДЛЯ YML-ФИДА ПРЕЙСКУРАНТА ─────────────────────────────────────

const DENTAL_CATEGORIES_YML: Record<string, { id: string; name: string }> = {
	consultation: { id: "consultation", name: "Консультации и первичный осмотр" },
	therapy: {
		id: "therapy",
		name: "Терапевтическая стоматология (лечение кариеса и пульпита)",
	},
	surgery: {
		id: "surgery",
		name: "Хирургическая стоматология и имплантация",
	},
	prosthetics: {
		id: "prosthetics",
		name: "Ортопедическая стоматология (протезирование, коронки)",
	},
	orthodontics: {
		id: "orthodontics",
		name: "Ортодонтия (брекеты, элайнеры)",
	},
	periodontology: {
		id: "periodontology",
		name: "Пародонтология (лечение десен)",
	},
	hygiene: {
		id: "hygiene",
		name: "Профессиональная гигиена и отбеливание",
	},
	imaging: {
		id: "imaging",
		name: "Рентгенодиагностика, КЛКТ и ОПТГ",
	},
	documents: {
		id: "documents",
		name: "Медицинская документация и справки",
	},
	other: { id: "other", name: "Прочие стоматологические услуги" },
};

const DENTAL_SPECIALTIES_RU: Record<string, string> = {
	universal: "Врач-стоматолог общей практики",
	therapist: "Стоматолог-терапевт",
	surgeon: "Стоматолог-хирург",
	orthopedist: "Стоматолог-ортопед",
	orthodontist: "Стоматолог-ортодонт",
	periodontist: "Стоматолог-пародонтолог",
	hygienist: "Стоматолог-гигиенист",
	pediatric: "Детский стоматолог",
};

function escapeXml(unsafe: string | null | undefined): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

async function resolveOrganizationId(
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
async function syncProdoctorovExportStatus(
	tx: any,
	organizationId: string,
	update: {
		priceListSyncStatus?: string;
		availableSlotsCount?: number;
	},
) {
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
				.where(eq(prodoctorovSyncExports.id, existing.id));
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

// ─── СХЕМЫ ВАЛИДАЦИИ ────────────────────────────────────────────────────────

const slotsQuerySchema = z.object({
	organizationId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
	startDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	durationMinutes: z.coerce.number().int().min(15).max(180).default(30),
});

const webhookPayloadSchema = z
	.object({
		event: z.string().optional().default("booking_created"),
		action: z.string().optional(),
		deliveryId: z.string().optional(),
		bookingId: z.string().optional(),
		organizationId: z.string().uuid().optional(),
		// Пациент (вложенный или плоский)
		patient: z
			.object({
				fullName: z.string().optional(),
				name: z.string().optional(),
				phone: z.string().optional(),
				birthDate: z.string().optional().nullable(),
				email: z.string().optional().nullable(),
				notes: z.string().optional().nullable(),
			})
			.optional(),
		patientName: z.string().optional(),
		patientPhone: z.string().optional(),
		patientBirthDate: z.string().optional().nullable(),
		patientEmail: z.string().optional().nullable(),
		// Прием (вложенный или плоский)
		appointment: z
			.object({
				doctorId: z.string().uuid().optional(),
				doctorUserId: z.string().uuid().optional(),
				chairId: z.string().uuid().optional(),
				startsAt: z.string().optional(),
				endsAt: z.string().optional(),
				durationMinutes: z.coerce.number().int().positive().optional(),
				reason: z.string().optional(),
				comment: z.string().optional(),
			})
			.optional(),
		doctorId: z.string().uuid().optional(),
		doctorUserId: z.string().uuid().optional(),
		chairId: z.string().uuid().optional(),
		startsAt: z.string().optional(),
		endsAt: z.string().optional(),
		durationMinutes: z.coerce.number().int().positive().optional(),
		reason: z.string().optional(),
		comment: z.string().optional(),
	})
	.passthrough();

// ─── РЕГИСТРАЦИЯ РОУТОВ ─────────────────────────────────────────────────────

export async function registerProdoctorovRoutes(app: FastifyInstance) {
	// ═════════════════════════════════════════════════════════════════════════
	// 1. GET /api/integrations/prodoctorov/pricelist.xml (И АЛИАС MEDFLEX)
	// ═════════════════════════════════════════════════════════════════════════
	const handlePricelistXml = async (
		req: FastifyRequest,
		reply: FastifyReply,
	) => {
		const organizationId = await resolveOrganizationId(req);

		return await withTenantCtx(organizationId, async (tx) => {
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

			// Категории
			const categoriesXml = Object.values(DENTAL_CATEGORIES_YML)
				.map(
					(c) => `      <category id="${c.id}">${escapeXml(c.name)}</category>`,
				)
				.join("\n");

			// Позиции прейскуранта
			const offersXml = catalogItems
				.map((item) => {
					const price = Number(
						item.priceRub || item.basePriceRub || 0,
					).toFixed(2);
					const categoryId = item.category || "other";
					const code804n = item.order804nCode || item.code;
					const specialtyRu =
						DENTAL_SPECIALTIES_RU[item.specialty] ||
						"Врач-стоматолог общей практики";

					return `      <offer id="${escapeXml(item.id)}" available="true">
        <name>${escapeXml(item.title)}</name>
        <price>${price}</price>
        <currencyId>RUR</currencyId>
        <categoryId>${escapeXml(categoryId)}</categoryId>
        <code>${escapeXml(item.code)}</code>
        <param name="Код 804н">${escapeXml(code804n)}</param>
        <param name="Специальность">${escapeXml(specialtyRu)}</param>
        <param name="Длительность (мин)">${item.durationMinutes || 30}</param>
        <param name="Налоговый вычет">${item.taxDeductible ? "Да" : "Нет"}</param>
      </offer>`;
				})
				.join("\n");

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

			return reply
				.header("Content-Type", "application/xml; charset=utf-8")
				.header("X-ProDoctorov-Feed", "dental-804n")
				.send(xml);
		});
	};

	app.get(
		"/api/integrations/prodoctorov/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXml,
	);
	app.get(
		"/api/integrations/medflex/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXml,
	);

	// ═════════════════════════════════════════════════════════════════════════
	// 2. GET /api/integrations/prodoctorov/slots (И АЛИАС MEDFLEX)
	// ═════════════════════════════════════════════════════════════════════════
	const handleSlots = async (req: FastifyRequest, reply: FastifyReply) => {
		const queryParsed = slotsQuerySchema.safeParse(req.query);
		if (!queryParsed.success) {
			return reply.status(400).send({
				error: "InvalidQueryParams",
				message: "Некорректные параметры запроса слотов расписания",
				issues: queryParsed.error.issues,
			});
		}

		const {
			doctorId,
			startDate: startDateStr,
			endDate: endDateStr,
			durationMinutes,
		} = queryParsed.data;

		const organizationId = await resolveOrganizationId(
			req,
			queryParsed.data.organizationId,
		);

		return await withTenantCtx(organizationId, async (tx) => {
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
			const doctorsWithSlots: Array<{
				doctorId: string;
				doctorName: string;
				specialties: string[];
				availableSlotsCount: number;
				slots: Array<{
					startsAt: string;
					endsAt: string;
					durationMinutes: number;
					chairId: string | null;
					chairName: string | null;
				}>;
			}> = [];
			let totalAvailableSlots = 0;

			for (const doctor of activeDoctors) {
				const doctorSlots: Array<{
					startsAt: string;
					endsAt: string;
					durationMinutes: number;
					chairId: string | null;
					chairName: string | null;
				}> = [];
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

			return reply.send({
				success: true,
				organizationId,
				startDate: startDateObj.toISOString().slice(0, 10),
				endDate: new Date(effectiveEndMs).toISOString().slice(0, 10),
				totalAvailableSlots,
				doctors: doctorsWithSlots,
			});
		});
	};

	app.get(
		"/api/integrations/prodoctorov/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlots,
	);
	app.get(
		"/api/integrations/medflex/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlots,
	);

	// ═════════════════════════════════════════════════════════════════════════
	// 3. POST /api/integrations/prodoctorov/webhook (И АЛИАСЫ MEDFLEX)
	// ═════════════════════════════════════════════════════════════════════════
	const handleWebhook = async (req: FastifyRequest, reply: FastifyReply) => {
		// Проверка подписи/секрета вебхука
		if (
			!verifyWebhookSecret(req, reply, {
				channel: "prodoctorov",
				secretEnvNames: [
					"PRODOCTOROV_WEBHOOK_SECRET",
					"MEDFLEX_WEBHOOK_SECRET",
					"DENTE_WEBHOOK_SECRET",
				],
				extraHeaderNames: [
					"x-prodoctorov-signature",
					"x-medflex-signature",
					"x-medflex-secret",
				],
			})
		) {
			return reply;
		}

		const parsedPayload = webhookPayloadSchema.safeParse(req.body);
		if (!parsedPayload.success) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Некорректный формат данных вебхука",
				issues: parsedPayload.error.issues,
			});
		}

		const payload = parsedPayload.data;
		const organizationId = await resolveOrganizationId(
			req,
			payload.organizationId,
		);

		const bookingId = payload.bookingId || payload.deliveryId || "";
		const patientFullName =
			payload.patient?.fullName ||
			payload.patient?.name ||
			payload.patientName ||
			"Пациент с ПроДокторов";
		const patientPhone = payload.patient?.phone || payload.patientPhone || null;
		const patientBirthDate =
			payload.patient?.birthDate || payload.patientBirthDate || null;
		const patientEmail =
			payload.patient?.email || payload.patientEmail || null;

		const doctorUserId =
			payload.appointment?.doctorId ||
			payload.appointment?.doctorUserId ||
			payload.doctorId ||
			payload.doctorUserId ||
			null;
		const chairId = payload.appointment?.chairId || payload.chairId || null;
		const rawStartsAt =
			payload.appointment?.startsAt || payload.startsAt || null;
		const rawEndsAt = payload.appointment?.endsAt || payload.endsAt || null;
		const durationMinutes =
			payload.appointment?.durationMinutes || payload.durationMinutes || 30;
		const reason =
			payload.appointment?.reason ||
			payload.reason ||
			"Запись через ПроДокторов / МедФлекс";
		const comment = payload.appointment?.comment || payload.comment || "";

		return await withTenantCtx(organizationId, async (tx) => {
			const isCancel =
				payload.event === "booking_cancelled" ||
				payload.event === "cancelled" ||
				payload.action === "cancel";

			// ─── СЦЕНАРИЙ ОТМЕНЫ БРОНИРОВАНИЯ ──────────────────────────────
			if (isCancel) {
				let targetAppointment: {
					id: string;
					startsAt: Date;
					endsAt: Date;
				} | null = null;

				if (bookingId) {
					const [found] = await tx
						.select({
							id: appointments.id,
							startsAt: appointments.startsAt,
							endsAt: appointments.endsAt,
						})
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								ilike(appointments.comment, `%${bookingId}%`),
							),
						)
						.limit(1);
					if (found) targetAppointment = found;
				}

				if (!targetAppointment && rawStartsAt) {
					const cancelStart = new Date(rawStartsAt);
					if (!Number.isNaN(cancelStart.getTime())) {
						const [found] = await tx
							.select({
								id: appointments.id,
								startsAt: appointments.startsAt,
								endsAt: appointments.endsAt,
							})
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, organizationId),
									eq(appointments.startsAt, cancelStart),
									ne(appointments.status, "cancelled"),
								),
							)
							.limit(1);
						if (found) targetAppointment = found;
					}
				}

				if (targetAppointment) {
					await tx
						.update(appointments)
						.set({
							status: "cancelled",
							comment: sql`concat(coalesce(${appointments.comment}, ''), ' [Отменено через ПроДокторов / МедФлекс]')`,
						})
						.where(eq(appointments.id, targetAppointment.id));

					await tx.insert(externalScheduleActionLogs).values({
						organizationId,
						externalProvider: "prodoctorov_medflex",
						actionType: "booking_cancelled",
						patientName: patientFullName,
						appointmentSlot: `${targetAppointment.startsAt.toISOString()} - ${targetAppointment.endsAt.toISOString()}`,
						status: "success",
					});

					wsBroker.broadcastToOrganization(organizationId, {
						type: "APPOINTMENT_CANCELLED",
						payload: {
							appointmentId: targetAppointment.id,
							channel: "prodoctorov_medflex",
						},
					});

					return reply.status(200).send({
						success: true,
						event: "booking_cancelled",
						appointmentId: targetAppointment.id,
						message: "Запись успешно отменена по запросу ПроДокторов / МедФлекс",
					});
				}

				return reply.status(200).send({
					success: true,
					event: "booking_cancelled",
					message: "Запись для отмены не найдена или уже была отменена ранее",
				});
			}

			// ─── СЦЕНАРИЙ СОЗДАНИЯ БРОНИРОВАНИЯ (BOOKING CREATED) ───────────

			// 1. Идемпотентность: проверка повторного вебхука
			if (bookingId) {
				const [existing] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							ilike(appointments.comment, `%${bookingId}%`),
						),
					)
					.limit(1);

				if (existing) {
					req.log.info(
						{ bookingId, organizationId },
						"ProDoctorov booking already processed (replay skipped)",
					);
					return reply.status(200).send({
						success: true,
						duplicate: true,
						appointmentId: existing.id,
						message:
							"Бронирование уже зарегистрировано ранее (идемпотентный ответ)",
					});
				}
			}

			// 2. Поиск или создание пациента
			let patientId: string | null = null;
			if (patientPhone) {
				const [foundPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							eq(patients.phone, patientPhone),
						),
					)
					.limit(1);
				if (foundPatient) {
					patientId = foundPatient.id;
				}
			}

			if (!patientId) {
				const [newPatient] = await tx
					.insert(patients)
					.values({
						organizationId,
						fullName: patientFullName,
						phone: patientPhone || null,
						birthDate: patientBirthDate || null,
						email: patientEmail || null,
						status: "active",
						notes: "Первичный пациент из агрегатора ПроДокторов / МедФлекс",
					})
					.returning({ id: patients.id });
				if (!newPatient) {
					throw new Error("Не удалось создать запись пациента в базе данных");
				}
				patientId = newPatient.id;
			}

			// 3. Определение врача (Мандат 8n: поддержка соло-врача)
			let resolvedDoctorId = doctorUserId;
			if (!resolvedDoctorId) {
				const [firstDoc] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.isActive, true),
							eq(users.role, "doctor"),
						),
					)
					.limit(1);
				if (firstDoc) {
					resolvedDoctorId = firstDoc.id;
				} else {
					const [anyUser] = await tx
						.select({ id: users.id })
						.from(users)
						.where(
							and(
								eq(users.organizationId, organizationId),
								eq(users.isActive, true),
							),
						)
						.limit(1);
					if (anyUser) {
						resolvedDoctorId = anyUser.id;
					} else {
						return reply.status(400).send({
							error: "DoctorNotFound",
							message:
								"В клинике не найден ни один активный врач для назначения записи.",
						});
					}
				}
			}

			// 4. Определение кресла (опционально)
			let resolvedChairId = chairId;
			if (!resolvedChairId) {
				const [firstChair] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, organizationId),
							eq(chairs.isActive, true),
						),
					)
					.limit(1);
				if (firstChair) {
					resolvedChairId = firstChair.id;
				}
			}

			// 5. Валидация временных меток
			if (!rawStartsAt) {
				return reply.status(400).send({
					error: "MissingStartsAt",
					message: "Не указано время начала приема (startsAt).",
				});
			}
			const candidateStarts = new Date(rawStartsAt);
			if (Number.isNaN(candidateStarts.getTime())) {
				return reply.status(400).send({
					error: "InvalidStartsAt",
					message: "Некорректный формат времени начала приема (startsAt).",
				});
			}

			const candidateEnds = rawEndsAt
				? new Date(rawEndsAt)
				: new Date(candidateStarts.getTime() + durationMinutes * 60 * 1000);

			if (
				Number.isNaN(candidateEnds.getTime()) ||
				candidateEnds <= candidateStarts
			) {
				return reply.status(400).send({
					error: "InvalidEndsAt",
					message: "Время окончания приема должно быть позже времени начала.",
				});
			}

			// 6. Защита от овербукинга: проверка пересечений у врача
			const [overlappingAppt] = await tx
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						eq(appointments.doctorUserId, resolvedDoctorId),
						ne(appointments.status, "cancelled"),
						ne(appointments.status, "no_show"),
						lt(appointments.startsAt, candidateEnds),
						sql`${appointments.endsAt} > ${candidateStarts}`,
					),
				)
				.limit(1);

			if (overlappingAppt) {
				return reply.status(409).send({
					error: "SlotAlreadyBooked",
					message:
						"Выбранное время у врача уже занято другой записью (защита от овербукинга).",
				});
			}

			// 7. Создание приема (Мандаты 8e & 8n: assistantUserId равен null)
			const fullComment = [
				bookingId ? `[ПроДокторов ID: ${bookingId}]` : "[ПроДокторов]",
				comment,
			]
				.filter(Boolean)
				.join(" ");

			const [createdAppointment] = await tx
				.insert(appointments)
				.values({
					organizationId,
					patientId,
					doctorUserId: resolvedDoctorId,
					assistantUserId: null, // МАНДАТ 8e/8n: без обязательного ассистента!
					chairId: resolvedChairId || null,
					status: "planned",
					startsAt: candidateStarts,
					endsAt: candidateEnds,
					reason: reason || "Запись через ПроДокторов / МедФлекс",
					comment: fullComment,
				})
				.returning();

			if (!createdAppointment) {
				throw new Error("Не удалось создать запись на приём в базе данных");
			}

			// 8. Фиксация в аудит-логе внешних интеграций
			await tx.insert(externalScheduleActionLogs).values({
				organizationId,
				externalProvider: "prodoctorov_medflex",
				actionType: "booking_created",
				patientName: patientFullName,
				appointmentSlot: `${candidateStarts.toISOString()} - ${candidateEnds.toISOString()}`,
				status: "success",
			});

			// 9. Оповещение через WebSocket в реальном времени
			try {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "APPOINTMENT_CREATED",
					payload: {
						appointmentId: createdAppointment.id,
						patientId,
						patientName: patientFullName,
						doctorUserId: resolvedDoctorId,
						startsAt: candidateStarts.toISOString(),
						endsAt: candidateEnds.toISOString(),
						channel: "prodoctorov_medflex",
					},
				});
			} catch (wsErr) {
				req.log.warn(
					{ wsErr },
					"Failed to broadcast ProDoctorov appointment via WS",
				);
			}

			return reply.status(201).send({
				success: true,
				appointmentId: createdAppointment.id,
				patientId,
				doctorUserId: resolvedDoctorId,
				startsAt: candidateStarts.toISOString(),
				endsAt: candidateEnds.toISOString(),
				message: "Запись на приём успешно создана через ПроДокторов / МедФлекс",
			});
		});
	};

	app.post(
		"/api/integrations/prodoctorov/webhook",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
	app.post(
		"/api/integrations/medflex/webhook",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
	app.post(
		"/api/integrations/medflex/webhook/booking",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
}
