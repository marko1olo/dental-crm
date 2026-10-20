import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { eq } from "drizzle-orm";
import { db } from "../../client.js";
import type { ServiceCatalogRow } from "../../pricelistQuery.js";
import * as schema from "../../schema.js";
import { selectByOrganization } from "../sliceExtractors.js";
import type { DomainStateHydrationReport } from "../types.js";
import type { RawHydrationSlices } from "./hydrationPipelineTypes.js";

/**
 * Исполнитель параллельных и ступенчатых запросов срезов БД с поддержкой RLS и демо-сидирования (Layer 2/3).
 */
export async function executeHydrationQueries(
	organizationId: string,
	report: DomainStateHydrationReport,
): Promise<RawHydrationSlices> {
	let organizationRows = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);

	if (organizationRows.length === 0 && organizationId === DEMO_SHOWCASE_ORG_ID) {
		const { ensureDemoShowcaseTenant } = await import(
			"../../../services/demo/deepDemoSeeder.js"
		);
		await ensureDemoShowcaseTenant();
		organizationRows = await db
			.select()
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
	}

	const clinicRows = await selectByOrganization<
		typeof schema.clinics.$inferSelect
	>(schema.clinics, organizationId, "clinics", report);
	const userRows = await selectByOrganization<typeof schema.users.$inferSelect>(
		schema.users,
		organizationId,
		"users",
		report,
	);
	const chairRows = await selectByOrganization<
		typeof schema.chairs.$inferSelect
	>(schema.chairs, organizationId, "chairs", report);
	const patientRows = await selectByOrganization<
		typeof schema.patients.$inferSelect
	>(schema.patients, organizationId, "patients", report);
	const appointmentRows = await selectByOrganization<
		typeof schema.appointments.$inferSelect
	>(schema.appointments, organizationId, "appointments", report);
	const visitRows = await selectByOrganization<
		typeof schema.visits.$inferSelect
	>(schema.visits, organizationId, "visits", report);
	const treatmentItemRows = await selectByOrganization<
		typeof schema.treatmentItems.$inferSelect
	>(schema.treatmentItems, organizationId, "treatmentItems", report);
	const paymentRows = await selectByOrganization<
		typeof schema.payments.$inferSelect
	>(schema.payments, organizationId, "payments", report);
	const documentRows = await selectByOrganization<
		typeof schema.generatedDocuments.$inferSelect
	>(schema.generatedDocuments, organizationId, "documents", report);
	let taskRows = await selectByOrganization<
		typeof schema.communicationTasks.$inferSelect
	>(schema.communicationTasks, organizationId, "communicationTasks", report);
	let eventRows = await selectByOrganization<
		typeof schema.communicationEvents.$inferSelect
	>(schema.communicationEvents, organizationId, "communicationEvents", report);

	if (
		organizationId === DEMO_SHOWCASE_ORG_ID &&
		taskRows.length === 0 &&
		patientRows.length > 0
	) {
		try {
			const now = new Date();
			const dueSoon = new Date(now.getTime() + 90 * 60_000);
			const dueLater = new Date(now.getTime() + 180 * 60_000);
			const clinicId = clinicRows[0]?.id ?? null;
			const p0 = patientRows[0]!;
			const p1 = patientRows[1] ?? p0;
			const p2 = patientRows[2] ?? p0;
			const p3 = patientRows[3] ?? p0;

			await db.insert(schema.communicationTasks).values([
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p1.id,
					appointmentId: appointmentRows[1]?.id ?? null,
					assignedRole: "administrator",
					channel: "whatsapp",
					intent: "appointment_confirmation",
					status: "queued",
					priority: "high",
					dueAt: dueSoon,
					title: `Подтверждение приёма — ${p1.fullName}`,
					body: "Эндодонтия зуба 36 под микроскопом (Д-р Соколов А. В.). Уточнить готовность к приёму и напомнить о 15-минутном запасе времени.",
				},
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p0.id,
					appointmentId: appointmentRows[0]?.id ?? null,
					assignedRole: "administrator",
					channel: "telegram",
					intent: "post_visit_instruction",
					status: "queued",
					priority: "normal",
					dueAt: dueLater,
					title: `Памятка после лечения — ${p0.fullName}`,
					body: "Отправить рекомендации после реставрации глубокого кариеса зуба 16 и согласовать дату контрольного осмотра.",
				},
				{
					organizationId,
					clinicId,
					botConfigId: "default",
					patientId: p2.id,
					appointmentId: appointmentRows[2]?.id ?? null,
					assignedRole: "administrator",
					channel: "whatsapp",
					intent: "recall",
					status: "scheduled",
					priority: "normal",
					dueAt: dueLater,
					title: `Плановый контроль ортодонта — ${p2.fullName}`,
					body: "Напомнить о выдаче следующего комплекта элайнеров Spark (этап 8/24) у ортодонта Д-ра Морозовой Е. И.",
				},
			]);

			if (eventRows.length === 0) {
				await db.insert(schema.communicationEvents).values([
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p2.id,
						channel: "telegram",
						direction: "outbound",
						status: "delivered",
						message: `Напоминание о приёме в 14:00 к ортодонту Д-ру Морозовой Е. И. доставлено (${p2.fullName}).`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p2.id,
						channel: "telegram",
						direction: "inbound",
						status: "delivered",
						message: `Ответ пациента (${p2.fullName}): «Спасибо, приём подтверждаю, буду вовремя».`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p3.id,
						channel: "whatsapp",
						direction: "outbound",
						status: "delivered",
						message: `Отправлена памятка перед хирургической консультацией и КЛКТ (${p3.fullName}).`,
					},
					{
						organizationId,
						clinicId,
						botConfigId: "default",
						patientId: p0.id,
						channel: "sms",
						direction: "outbound",
						status: "sent",
						message: `Сервисное уведомление о завершении приёма и гарантийном талоне отправлено (${p0.fullName}).`,
					},
				]);
			}

			taskRows = await selectByOrganization<
				typeof schema.communicationTasks.$inferSelect
			>(schema.communicationTasks, organizationId, "communicationTasks", report);
			eventRows = await selectByOrganization<
				typeof schema.communicationEvents.$inferSelect
			>(schema.communicationEvents, organizationId, "communicationEvents", report);
		} catch (seedErr) {
			console.warn("[DashboardHydration] Demo communications seed skipped:", seedErr);
		}
	}
	const imagingRows = await selectByOrganization<
		typeof schema.imagingStudies.$inferSelect
	>(schema.imagingStudies, organizationId, "imagingStudies", report);
	const serviceRows = await selectByOrganization<ServiceCatalogRow>(
		schema.serviceCatalogItems,
		organizationId,
		"serviceCatalog",
		report,
	);
	const ruleRows = await selectByOrganization<
		typeof schema.clinicalRules.$inferSelect
	>(schema.clinicalRules, organizationId, "clinicalRules", report);
	const protocolRows = await selectByOrganization<
		typeof schema.protocolTemplates.$inferSelect
	>(schema.protocolTemplates, organizationId, "protocolTemplates", report);
	let labOrderRows = await selectByOrganization<
		typeof schema.labOrders.$inferSelect
	>(schema.labOrders, organizationId, "labOrders", report);

	if (
		organizationId === DEMO_SHOWCASE_ORG_ID &&
		labOrderRows.length === 0 &&
		patientRows.length > 0
	) {
		try {
			const now = new Date();
			const doc0 = userRows[0];
			const p0 = patientRows[0]!;
			const p1 = patientRows[1] ?? p0;
			const p2 = patientRows[2] ?? p0;
			const p3 = patientRows[3] ?? p0;

			await db.insert(schema.labOrders).values([
				{
					organizationId,
					patientId: p0.id,
					doctorId: doc0?.id ?? null,
					doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
					secureToken: `SEC-DEMO-${organizationId.slice(0, 8)}-101`,
					toothFdi: "16",
					material: "Керамика IPS e.max Press (Ivoclar)",
					colorVita: "A2",
					status: "received",
					dueDate: new Date(now.getTime() + 2 * 86400_000),
					priceRub: 28000,
					clinicalNotes:
						"Цельнокерамическая коронка e.MAX на зуб 16. Работа доставлена из ЗТЛ в клинику, готова к примерке и фиксации.",
					sentAt: new Date(now.getTime() - 4 * 86400_000),
				},
				{
					organizationId,
					patientId: p1.id,
					doctorId: doc0?.id ?? null,
					doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
					secureToken: `SEC-DEMO-${organizationId.slice(0, 8)}-102`,
					toothFdi: "21",
					material: "Диоксид циркония ZrO2 Katana ML",
					colorVita: "A1",
					status: "in_progress",
					dueDate: new Date(now.getTime() + 4 * 86400_000),
					priceRub: 32000,
					clinicalNotes:
						"Анатомическая коронка ZrO2 на зуб 21. Этап CAD/CAM фрезеровки и синтеризации.",
					sentAt: new Date(now.getTime() - 2 * 86400_000),
				},
				{
					organizationId,
					patientId: p2.id,
					doctorId: doc0?.id ?? null,
					doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
					secureToken: `SEC-DEMO-${organizationId.slice(0, 8)}-103`,
					toothFdi: "46",
					material: "Диоксид циркония Prettau Anterior",
					colorVita: "A3",
					status: "sent",
					dueDate: new Date(now.getTime() + 5 * 86400_000),
					priceRub: 24000,
					clinicalNotes:
						"Цифровой слепок STL отправлен в лабораторию. Моделировка анатомического каркаса.",
					sentAt: new Date(now.getTime() - 86400_000),
				},
				{
					organizationId,
					patientId: p3.id,
					doctorId: doc0?.id ?? null,
					doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
					secureToken: `SEC-DEMO-${organizationId.slice(0, 8)}-104`,
					toothFdi: "36",
					material: "Металлокерамика Co-Cr Noritake",
					colorVita: "A2",
					status: "completed",
					isLockedInstalled: true,
					installedAt: new Date(now.getTime() - 86400_000),
					completedAt: new Date(now.getTime() - 86400_000),
					dueDate: new Date(now.getTime() - 2 * 86400_000),
					priceRub: 18500,
					clinicalNotes:
						"Коронка 36 сдана и зафиксирована в полости рта пациента.",
					sentAt: new Date(now.getTime() - 6 * 86400_000),
				},
			]);

			labOrderRows = await selectByOrganization<
				typeof schema.labOrders.$inferSelect
			>(schema.labOrders, organizationId, "labOrders", report);
		} catch (seedErr) {
			console.warn("[DashboardHydration] Demo labOrders seed skipped:", seedErr);
		}
	}

	return {
		organization: organizationRows[0],
		clinic: clinicRows[0],
		clinicRows,
		userRows,
		chairRows,
		patientRows,
		appointmentRows,
		visitRows,
		treatmentItemRows,
		paymentRows,
		documentRows,
		taskRows,
		eventRows,
		imagingRows,
		serviceRows,
		ruleRows,
		protocolRows,
		labOrderRows,
	};
}
