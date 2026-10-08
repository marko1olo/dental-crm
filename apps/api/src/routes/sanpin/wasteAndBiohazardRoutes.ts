import crypto from "node:crypto";
import {
	SanPiNRegulatoryEngine,
	createEmergencyBiohazardLogDtoSchema,
	createMedicalWasteLogDtoSchema,
} from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	emergencyBiohazardLogs,
	medicalWasteLogs,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinWasteAndBiohazardRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 5. ЖУРНАЛ МЕДИЦИНСКИХ ОТХОДОВ А, Б, В, Г (СанПиН 2.1.3684-21)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/medical-waste", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: medicalWasteLogs.id,
				organizationId: medicalWasteLogs.organizationId,
				operationType: medicalWasteLogs.operationType,
				logDate: medicalWasteLogs.logDate,
				wasteClass: medicalWasteLogs.wasteClass,
				wasteDescription: medicalWasteLogs.wasteDescription,
				packageType: medicalWasteLogs.packageType,
				packageCount: medicalWasteLogs.packageCount,
				weightKg: medicalWasteLogs.weightKg,
				volumeLiters: medicalWasteLogs.volumeLiters,
				disinfectionMethod: medicalWasteLogs.disinfectionMethod,
				disinfectantUsed: medicalWasteLogs.disinfectantUsed,
				disposalCompany: medicalWasteLogs.disposalCompany,
				contractNumber: medicalWasteLogs.contractNumber,
				transferActNumber: medicalWasteLogs.transferActNumber,
				responsibleStaffId: medicalWasteLogs.responsibleStaffId,
				responsibleStaffName: users.fullName,
				notes: medicalWasteLogs.notes,
				createdAt: medicalWasteLogs.createdAt,
			})
			.from(medicalWasteLogs)
			.leftJoin(users, eq(users.id, medicalWasteLogs.responsibleStaffId))
			.where(eq(medicalWasteLogs.organizationId, organizationId))
			.orderBy(desc(medicalWasteLogs.logDate));

		return logs.map((l) => ({
			...l,
			weightKg: Number(l.weightKg),
			volumeLiters: l.volumeLiters ? Number(l.volumeLiters) : null,
		}));
	});

	app.post("/api/registers/medical-waste", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste create",
		);
		if (!organizationId) return;

		const parsed = createMedicalWasteLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры учета отходов.",
			});
		}
		const data = parsed.data;

		const [log] = await db
			.insert(medicalWasteLogs)
			.values({
				organizationId,
				operationType: data.operationType,
				logDate: new Date(data.logDate),
				wasteClass: data.wasteClass,
				wasteDescription: data.wasteDescription,
				packageType: data.packageType,
				packageCount: data.packageCount,
				weightKg: String(data.weightKg),
				volumeLiters: data.volumeLiters ? String(data.volumeLiters) : null,
				disinfectionMethod: data.disinfectionMethod,
				disinfectantUsed: data.disinfectantUsed ?? null,
				disposalCompany: data.disposalCompany ?? null,
				contractNumber: data.contractNumber ?? null,
				transferActNumber: data.transferActNumber ?? null,
				responsibleStaffId: data.responsibleStaffId ?? null,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_WASTE_LOG_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	app.post("/api/registers/medical-waste/quick-shift-bundle", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste quick-shift create",
		);
		if (!organizationId) return;

		const now = new Date();

		// Нормативные записи по СанПиН 2.1.3684-21 для стоматологической смены:
		// 1) Белый пакет (Класс А, безопасные: упаковка материалов, картон, бумага, чистые бахилы), 1 шт., брутто 3.25 кг, нетто 3.20 кг
		// 2) Желтый пакет (Класс Б, мягкие отходы: перчатки, маски, салфетки, валики, слюноотсосы), 1 шт., брутто 2.55 кг, нетто 2.50 кг
		// 3) Желтый непрокалываемый контейнер (Класс Б, острые отходы: карпулы, иглы, скальпели), 1 шт., брутто 0.95 кг, нетто 0.80 кг
		const newLogs = await db
			.insert(medicalWasteLogs)
			.values([
				{
					organizationId,
					operationType: "accumulation",
					logDate: now,
					wasteClass: "class_A",
					wasteDescription: "Эпидемиологически безопасные отходы смены (упаковка стоматологических материалов, картон, бумага, чистые бахилы)",
					packageType: "white_bag",
					packageCount: 1,
					weightKg: "3.200",
					volumeLiters: "40.00",
					disinfectionMethod: "none_centralized",
					disinfectantUsed: null,
					responsibleStaffId: req.user?.id ?? null,
					notes: "1-клик фиксация отходов смены Класса А (СанПиН 2.1.3684-21: брутто 3.25 кг, тара 0.05 кг, нетто 3.20 кг)",
				},
				{
					organizationId,
					operationType: "accumulation",
					logDate: now,
					wasteClass: "class_B",
					wasteDescription: "Мягкие эпидемиологически опасные отходы смены (перчатки, маски, салфетки, валики, слюноотсосы)",
					packageType: "yellow_bag",
					packageCount: 1,
					weightKg: "2.500",
					volumeLiters: "30.00",
					disinfectionMethod: "chemical_soaking",
					disinfectantUsed: "Бриллиант Классик 2% (экспозиция 60 мин)",
					responsibleStaffId: req.user?.id ?? null,
					notes: "1-клик фиксация отходов смены (СанПиН 2.1.3684-21: брутто 2.55 кг, тара 0.05 кг, нетто 2.50 кг)",
				},
				{
					organizationId,
					operationType: "accumulation",
					logDate: now,
					wasteClass: "class_B",
					wasteDescription: "Острые эпидемиологически опасные отходы смены (пустые карпулы анестетиков, инъекционные иглы, скальпели)",
					packageType: "yellow_sharps_container",
					packageCount: 1,
					weightKg: "0.800",
					volumeLiters: "2.00",
					disinfectionMethod: "steam_autoclave",
					disinfectantUsed: "Аппаратное автоклавирование 134°C (5 мин, 2.15 бар)",
					responsibleStaffId: req.user?.id ?? null,
					notes: "1-клик фиксация острых отходов смены в желтом непрокалываемом контейнере (СанПиН 2.1.3684-21: брутто 0.95 кг, тара 0.15 кг, нетто 0.80 кг)",
				},
			])
			.returning();

		for (const log of newLogs) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "SANPIN_WASTE_LOG_ADDED",
				payload: log,
			});
		}

		return reply.code(201).send({
			message: "Отходы смены (Класс А и Класс Б) успешно зафиксированы по СанПиН 2.1.3684-21",
			records: newLogs,
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. ЖУРНАЛ АВАРИЙНЫХ СИТУАЦИЙ («АНТИ-ВИЧ»)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/emergency-biohazard", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"biohazard read",
		);
		if (!organizationId) return;

		const logs = await db
			.select()
			.from(emergencyBiohazardLogs)
			.where(eq(emergencyBiohazardLogs.organizationId, organizationId))
			.orderBy(desc(emergencyBiohazardLogs.incidentDateTime));

		return logs;
	});

	app.post("/api/registers/emergency-biohazard", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"biohazard create",
		);
		if (!organizationId) return;

		const parsed = createEmergencyBiohazardLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры аварийной ситуации.",
			});
		}
		const data = parsed.data;

		const protocolEval = SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
			antiHivKitUsed: data.antiHivKitUsed,
			bloodSampled: data.bloodSampledForTesting,
			arvRecommended: data.arvProphylaxisRecommended,
			arvStartedWithin72h: data.arvProphylaxisStartedWithin72h,
			chiefPhysicianNotified: data.chiefPhysicianNotified,
		});

		const year = new Date().getFullYear();
		const actNumber =
			data.actSanPiNNumber ||
			`АКТ-ВБИ-${year}-${crypto.randomInt(100, 999)}`;

		const [log] = await db
			.insert(emergencyBiohazardLogs)
			.values({
				organizationId,
				incidentDateTime: new Date(data.incidentDateTime),
				victimStaffId: data.victimStaffId ?? null,
				victimFullName: data.victimFullName,
				victimRole: data.victimRole,
				patientId: data.patientId ?? null,
				patientFullName: data.patientFullName ?? null,
				patientCardNumber: data.patientCardNumber ?? null,
				patientInfectiousStatus: data.patientInfectiousStatus ?? null,
				injuryType: data.injuryType,
				circumstances: data.circumstances,
				firstAidMeasures: data.firstAidMeasures,
				antiHivKitUsed: data.antiHivKitUsed,
				bloodSampledForTesting: data.bloodSampledForTesting,
				arvProphylaxisRecommended: data.arvProphylaxisRecommended,
				arvProphylaxisStartedWithin72h: data.arvProphylaxisStartedWithin72h,
				arvDrugsPrescribed: data.arvDrugsPrescribed ?? null,
				chiefPhysicianNotified: data.chiefPhysicianNotified,
				actSanPiNNumber: actNumber,
				responsibleDoctorId: data.responsibleDoctorId ?? null,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_BIOHAZARD_LOG_ADDED",
			payload: { log, protocolEval },
		});

		return reply.code(201).send({
			success: true,
			log,
			protocolEval,
		});
	});
}
