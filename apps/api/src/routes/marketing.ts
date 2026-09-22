/**
 * marketing.ts — Эндпоинты сквозной аналитики маркетинга, онлайн-самозаписи и обязательности полей (Фичи #28 и #35).
 *
 * КОНТЕКСТ & МАНДАТ:
 * 1. Разделение каналов автоматической онлайн-самозаписи (Сайт, Карты, 2ГИС, ПроДокторов, Боты) и звонков администраторов.
 * 2. Копеечная точность в расчетах ROMI, CAC и выручки.
 * 3. Настройка обязательности полей карточки пациента (Телефон, Рекламный источник, СНИЛС).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	cashOperations,
	communicationEvents,
	crmLeads,
	organizations,
	patients,
	payments,
} from "../db/schema.js";
import {
	requireClinicalReadAccess,
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";

const patientFieldRequirementsInputSchema = z.object({
	requirePhone: z.boolean().default(true),
	requireAdvertisingSource: z.boolean().default(false),
	requireSnils: z.boolean().default(false),
	requireBirthDate: z.boolean().default(false),
	requireIdentityDocument: z.boolean().default(false),
});

function cleanPhoneDigits(phone?: string | null): string {
	return (phone || "").replace(/\D/g, "");
}

function detectChannelFromSource(source?: string | null): string {
	if (!source) return "website_widget";
	const s = source.toLowerCase().trim();
	if (s.includes("yandex") || s.includes("яндекс") || s.includes("карт")) return "yandex_maps";
	if (s.includes("2gis") || s.includes("2гис") || s.includes("gis")) return "gis_2";
	if (s.includes("prodoctorov") || s.includes("продокторов") || s.includes("sber") || s.includes("доктор")) return "prodoctorov";
	if (s.includes("tg") || s.includes("telegr") || s.includes("телеграм")) return "tg_bot";
	if (s.includes("wa") || s.includes("whats") || s.includes("ватсап") || s.includes("waba")) return "wa_bot";
	if (s.includes("phone") || s.includes("call") || s.includes("звонок") || s.includes("тел") || s.includes("admin") || s.includes("регистратур")) return "telephony";
	return "website_widget";
}

export async function registerMarketingRoutes(app: FastifyInstance) {
	/**
	 * GET /api/marketing/attribution
	 * Сводная сквозная аналитика: онлайн-самозапись vs телефония регистратуры (Фича #28)
	 */
	app.get("/api/marketing/attribution", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing attribution");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing attribution");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments, allPatients, allCallEvents, allMarketingExpenses] = await Promise.all([
				db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
				db.select().from(appointments).where(eq(appointments.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
				db.select({
					id: patients.id,
					phone: patients.phone,
					notes: patients.notes,
					administrativeProfile: patients.administrativeProfile,
				}).from(patients).where(eq(patients.organizationId, orgId)),
				db.select({
					id: communicationEvents.id,
					channel: communicationEvents.channel,
					direction: communicationEvents.direction,
					durationSeconds: communicationEvents.durationSeconds,
					status: communicationEvents.status,
				}).from(communicationEvents).where(
					and(
						eq(communicationEvents.organizationId, orgId),
						eq(communicationEvents.channel, "phone"),
					),
				),
				db.select({
					amountRub: cashOperations.amountRub,
					metadata: cashOperations.metadata,
					reasonCode: cashOperations.reasonCode,
				}).from(cashOperations).where(
					and(
						eq(cashOperations.organizationId, orgId),
						eq(cashOperations.operationType, "expense"),
						sql`(${cashOperations.reasonCode} = 6 or (${cashOperations.metadata}->>'category') = 'marketing')`,
					),
				),
			]);

			// Phone to channel map
			const phoneToChannel = new Map<string, string>();
			for (const lead of allLeads) {
				const cp = cleanPhoneDigits(lead.phone);
				if (cp) {
					phoneToChannel.set(cp, detectChannelFromSource(lead.source));
				}
			}

			// Patient to channel map
			const patientToChannel = new Map<string, string>();
			for (const p of allPatients) {
				const cp = cleanPhoneDigits(p.phone);
				if (cp && phoneToChannel.has(cp)) {
					patientToChannel.set(p.id, phoneToChannel.get(cp)!);
				} else if (p.notes && p.notes.includes("Источник:")) {
					patientToChannel.set(p.id, detectChannelFromSource(p.notes));
					const adminProfile = p.administrativeProfile as {
						preferredAppointmentNote?: string | null;
					} | null;
					const note = adminProfile?.preferredAppointmentNote;
					if (typeof note === "string" && note.startsWith("src:")) {
						patientToChannel.set(p.id, detectChannelFromSource(note.slice(4)));
					}
				}
			}

			// Patient revenue map
			const patientRevenueKop = new Map<string, number>();
			for (const pay of allPayments) {
				const cur = patientRevenueKop.get(pay.patientId) || 0;
				patientRevenueKop.set(pay.patientId, cur + Math.round(Number(pay.amountRub || 0) * 100));
			}

			// Channel definitions
			const onlineChannelDefs = [
				{ key: "website_widget", nameRu: "Сайт клиники (Виджет самозаписи)", categoryRu: "Сайт и лендинги" },
				{ key: "yandex_maps", nameRu: "Яндекс Карты (Кнопка «Записаться»)", categoryRu: "Гео-сервисы" },
				{ key: "gis_2", nameRu: "2ГИС (Профиль клиники / Запись)", categoryRu: "Гео-сервисы" },
				{ key: "prodoctorov", nameRu: "ПроДокторов / СберЗдоровье", categoryRu: "Мед-агрегаторы" },
				{ key: "tg_bot", nameRu: "Telegram-бот / Mini App", categoryRu: "Мессенджеры" },
				{ key: "wa_bot", nameRu: "WhatsApp-чатбот / WABA", categoryRu: "Мессенджеры" },
			];

			const channelSpendMap: Record<string, number> = {
				website_widget: 0,
				yandex_maps: 0,
				gis_2: 0,
				prodoctorov: 0,
				tg_bot: 0,
				wa_bot: 0,
				telephony: 0,
			};
			for (const row of allMarketingExpenses) {
				const meta = row.metadata as { channelKey?: string } | null;
				const spendKop = Math.round(Number(row.amountRub || 0) * 100);
				const chKey = meta?.channelKey;
				const targetKey = chKey && chKey in channelSpendMap ? chKey : "telephony";
				channelSpendMap[targetKey] = (channelSpendMap[targetKey] ?? 0) + spendKop;
			}

			const selfBookingChannels = onlineChannelDefs.map((def) => {
				const channelLeads = allLeads.filter((l) => detectChannelFromSource(l.source) === def.key);
				const channelLeadPhones = new Set(channelLeads.map((l) => cleanPhoneDigits(l.phone)).filter(Boolean));

				const channelPatientIds = new Set<string>();
				for (const [pid, chKey] of patientToChannel.entries()) {
					if (chKey === def.key) channelPatientIds.add(pid);
				}

				const channelAppts = allAppts.filter(
					(a) => a.patientId != null && channelPatientIds.has(a.patientId),
				);

				const attendedCount = channelAppts.filter(
					(a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment",
				).length;
				const noShowCount = channelAppts.filter((a) => a.status === "no_show").length;
				const bookingsCount = Math.max(
					channelAppts.length,
					channelLeads.filter((l) => l.status === "consult_booked").length,
				);

				let revenueKopecks = 0;
				let paidPatientsCount = 0;
				for (const pid of channelPatientIds) {
					const rev = patientRevenueKop.get(pid) || 0;
					if (rev > 0) {
						paidPatientsCount += 1;
						revenueKopecks += rev;
					}
				}

				const viewsCount = Math.max(channelLeads.length, bookingsCount);
				const slotSelectedCount = bookingsCount;
				const spentKopecks = channelSpendMap[def.key] || 0;
				const romiPercent = spentKopecks > 0 ? Math.round(((revenueKopecks - spentKopecks) / spentKopecks) * 100) : 0;
				const cacKopecks = paidPatientsCount > 0 ? Math.round(spentKopecks / paidPatientsCount) : 0;

				return {
					key: def.key,
					nameRu: def.nameRu,
					categoryRu: def.categoryRu,
					isOnlineSelfBooking: true,
					viewsCount,
					slotSelectedCount,
					bookingsCount,
					attendedCount,
					noShowCount,
					paidPatientsCount,
					revenueKopecks,
					spentKopecks,
					romiPercent,
					cacKopecks,
				};
			});

			// Telephony Admin funnel
			const telephonyLeads = allLeads.filter((l) => detectChannelFromSource(l.source) === "telephony");
			const nonOnlinePatientIds = new Set<string>();
			for (const p of allPatients) {
				const ch = patientToChannel.get(p.id);
				if (!ch || ch === "telephony") {
					nonOnlinePatientIds.add(p.id);
				}
			}

			const telephonyAppts = allAppts.filter((a) => a.patientId != null && nonOnlinePatientIds.has(a.patientId));
			const telephonyAttended = telephonyAppts.filter(
				(a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment",
			).length;
			const telephonyNoShow = telephonyAppts.filter((a) => a.status === "no_show").length;
			const bookedAppointmentsCount = Math.max(telephonyAppts.length, telephonyLeads.length);

			let telephonyRevenueKopecks = 0;
			let telephonyPaidPatients = 0;
			for (const pid of nonOnlinePatientIds) {
				const rev = patientRevenueKop.get(pid) || 0;
				if (rev > 0) {
					telephonyPaidPatients += 1;
					telephonyRevenueKopecks += rev;
				}
			}

			const realCalls = allCallEvents.filter((c) => c.channel === "phone");
			const realIncomingCalls = realCalls.filter((c) => c.direction === "inbound" || !c.direction);
			const realAnsweredCalls = realIncomingCalls.filter(
				(c) => (c.durationSeconds != null && c.durationSeconds > 0) || c.status === "delivered",
			);
			const realTotalDuration = realAnsweredCalls.reduce(
				(acc, c) => acc + (c.durationSeconds || 0),
				0,
			);

			const incomingCallsCount = realIncomingCalls.length;
			const answeredCallsCount = realAnsweredCalls.length;
			const avgCallDurationSeconds = realAnsweredCalls.length > 0
				? Math.round(realTotalDuration / realAnsweredCalls.length)
				: 0;
			const telephonySpentKopecks = channelSpendMap.telephony || 0;

			const telephonyAdminFunnel = {
				incomingCallsCount,
				answeredCallsCount,
				bookedAppointmentsCount,
				attendedCount: telephonyAttended,
				noShowCount: telephonyNoShow,
				paidPatientsCount: telephonyPaidPatients,
				revenueKopecks: telephonyRevenueKopecks,
				spentKopecks: telephonySpentKopecks,
				avgCallDurationSeconds,
				attendanceRatePercent: bookedAppointmentsCount > 0 ? Number(((telephonyAttended / bookedAppointmentsCount) * 100).toFixed(1)) : 0,
				conversionCallToBookingPercent: incomingCallsCount > 0 ? Number(((bookedAppointmentsCount / incomingCallsCount) * 100).toFixed(1)) : 0,
			};

			const totalOnlineBookings = selfBookingChannels.reduce((acc, c) => acc + c.bookingsCount, 0);
			const totalOnlineAttended = selfBookingChannels.reduce((acc, c) => acc + c.attendedCount, 0);
			const totalOnlineRevenue = selfBookingChannels.reduce((acc, c) => acc + c.revenueKopecks, 0);
			const totalOnlineSpent = selfBookingChannels.reduce((acc, c) => acc + c.spentKopecks, 0);

			const grandTotalBookings = totalOnlineBookings + telephonyAdminFunnel.bookedAppointmentsCount;
			const onlineSharePercent = grandTotalBookings > 0
				? Math.round((totalOnlineBookings / grandTotalBookings) * 100)
				: 0;

			return reply.code(200).send({
				organizationId: orgId,
				selfBookingChannels,
				telephonyAdminFunnel,
				summary: {
					totalOnlineBookings,
					totalOnlineAttended,
					totalOnlineRevenueKopecks: totalOnlineRevenue,
					totalOnlineSpentKopecks: totalOnlineSpent,
					onlineSharePercent,
					adminSharePercent: 100 - onlineSharePercent,
					savedAdminHours: Math.round((totalOnlineBookings * 4) / 6) / 10,
				},
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error fetching attribution report");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать отчет по маркетинговой атрибуции",
			});
		}
	});

	/**
	 * GET /api/marketing/online-booking/funnel
	 * Пошаговая воронка конверсии самозаписи (Фича №28)
	 */
	app.get("/api/marketing/online-booking/funnel", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "online booking funnel");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "online booking funnel");
		if (!orgId) return;

		try {
			const [allLeads, allAppts, allPayments] = await Promise.all([
				db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
				db.select().from(appointments).where(eq(appointments.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
			]);

			const onlineLeads = allLeads.filter((l) => detectChannelFromSource(l.source) !== "telephony");
			const views = onlineLeads.length;
			const slotSelected = onlineLeads.length;
			const booked = onlineLeads.filter((l) => l.status === "consult_booked").length;
			const attended = allAppts.filter((a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment").length;
			const paid = allPayments.length;
			const totalRevenueKopecks = allPayments.reduce((acc, p) => acc + Math.round(Number(p.amountRub || 0) * 100), 0);

			const stepSlotDropoff = views > 0 ? Number(((1 - slotSelected / views) * 100).toFixed(1)) : 0;
			const stepBookedDropoff = slotSelected > 0 ? Number(((1 - booked / slotSelected) * 100).toFixed(1)) : 0;
			const stepAttendedDropoff = booked > 0 ? Number(((1 - attended / booked) * 100).toFixed(1)) : 0;
			const stepPaidDropoff = attended > 0 ? Number(((1 - paid / attended) * 100).toFixed(1)) : 0;

			return reply.code(200).send({
				steps: [
					{ stage: "views", title: "Просмотры виджета", count: views, dropoffPercent: 0 },
					{ stage: "slot_selected", title: "Выбор слота времени", count: slotSelected, dropoffPercent: Math.max(0, stepSlotDropoff) },
					{ stage: "booked", title: "Созданные записи", count: booked, dropoffPercent: Math.max(0, stepBookedDropoff) },
					{ stage: "attended", title: "Явка на приём", count: attended, dropoffPercent: Math.max(0, stepAttendedDropoff) },
					{ stage: "paid", title: "Оплата услуг", count: paid, dropoffPercent: Math.max(0, stepPaidDropoff) },
				],
				overallConversionPercent: views > 0 ? Number(((paid / views) * 100).toFixed(2)) : 0,
				attendanceRatePercent: booked > 0 ? Number(((attended / booked) * 100).toFixed(2)) : 0,
				totalRevenueKopecks,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error fetching online booking funnel");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать воронку онлайн-самозаписи",
			});
		}
	});

	/**
	 * GET /api/marketing/patient-field-requirements
	 * Настройки обязательности полей карточки пациента (Фича №35)
	 */
	app.get("/api/marketing/patient-field-requirements", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "patient field requirements");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "patient field requirements");
		if (!orgId) return;

		try {
			const [org] = await db
				.select({ flags: organizations.workspaceFeatureFlags })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);

			const flags = (org?.flags as Record<string, unknown>) || {};
			const requirements = (flags.patientFieldRequirements as z.infer<typeof patientFieldRequirementsInputSchema> | undefined) || {
				requirePhone: true,
				requireAdvertisingSource: false,
				requireSnils: false,
				requireBirthDate: false,
				requireIdentityDocument: false,
			};

			return reply.code(200).send(requirements);
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error fetching patient field requirements");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось загрузить настройки обязательности полей",
			});
		}
	});

	/**
	 * PUT /api/marketing/patient-field-requirements
	 * Обновление настроек обязательности полей карточки пациента (Фича №35)
	 */
	app.put("/api/marketing/patient-field-requirements", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutateAllowed = await requireClinicalMutationAccess(request, reply, "update patient field requirements");
		if (!mutateAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "update patient field requirements");
		if (!orgId) return;

		const parsed = patientFieldRequirementsInputSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат настроек обязательности полей",
			});
		}

		try {
			const [org] = await db
				.select({ flags: organizations.workspaceFeatureFlags })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);

			const existingFlags = (org?.flags as Record<string, unknown>) || {};
			const updatedFlags = {
				...existingFlags,
				patientFieldRequirements: parsed.data,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(200).send({
				success: true,
				requirements: parsed.data,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error updating patient field requirements");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сохранить настройки обязательности полей",
			});
		}
	});

	/**
	 * GET /api/marketing/reports
	 * Маркетинговые сводные отчеты (ROMI, CAC, воронка и распределение по каналам).
	 *
	 * 152-ФЗ / 323-ФЗ ст. 13:
	 * Отчет содержит исключительно агрегированные показатели маркетинга.
	 * Категорически исключены диагнозы, МКБ-10, формулы зубов и анамнез пациентов.
	 */
	app.get("/api/marketing/reports", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "marketing reports");
		if (!orgId) return;

		try {
			const [allLeads, allPayments] = await Promise.all([
				db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
				db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
			]);

			const totalRevenueKopecks = allPayments.reduce(
				(acc, p) => acc + Math.round(Number(p.amountRub || 0) * 100),
				0,
			);

			const channelCounts: Record<string, { leads: number; revenueKopecks: number }> = {};
			for (const lead of allLeads) {
				const ch = detectChannelFromSource(lead.source);
				if (!channelCounts[ch]) {
					channelCounts[ch] = { leads: 0, revenueKopecks: 0 };
				}
				channelCounts[ch].leads += 1;
			}

			const format = ((request.query as { format?: string })?.format || "json").toLowerCase();
			if (format === "csv") {
				const headers = "channel,leadsCount,category\n";
				const rows = Object.entries(channelCounts)
					.map(([channel, stats]) => `${channel},${stats.leads},marketing_funnel`)
					.join("\n");
				reply.header("Content-Type", "text/csv; charset=utf-8");
				reply.header(
					"Content-Disposition",
					`attachment; filename="marketing-report-${orgId}.csv"`,
				);
				return reply.send(headers + rows);
			}

			return reply.code(200).send({
				organizationId: orgId,
				reportKind: "marketing_attribution_summary",
				totalLeads: allLeads.length,
				totalPaidTransactions: allPayments.length,
				totalRevenueKopecks,
				channels: Object.entries(channelCounts).map(([key, data]) => ({
					channel: key,
					leadsCount: data.leads,
				})),
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Error generating marketing reports");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать маркетинговый отчет",
			});
		}
	});
}

