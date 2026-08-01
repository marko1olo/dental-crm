import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { sterilizationLogs, users, visitDiaries } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const scanSchema = z.object({
	barcode: z.string().min(1),
	autoclaveId: z.string().min(1),
	operatorId: z.string().uuid().optional(),
	status: z.enum(["passed", "failed"]),
});


/**
 * Тот же 8-сегментный SHA-256, что computeDiaryHash в routes/diary.ts.
 * Лоток входит в отпечаток 043/у: смена barcode без пересчёта оставляет
 * diary_hash от старой упаковки, а ЭЦП/печать заверяют уже другую.
 */
function computeDiaryHashForTrayLink(row: {
	visitId: string;
	patientId: string | null;
	anamnesis: string | null;
	statusLocalis: string | null;
	treatmentDescription: string | null;
	diagnosisIcd10: string | null;
	diagnosisTooth: string | null;
	complications: string | null;
	comorbidities: string | null;
	instrumentTrayBarcode: string | null;
}): string {
	const raw = [
		row.visitId,
		row.patientId ?? "",
		row.anamnesis ?? "",
		row.statusLocalis ?? "",
		row.treatmentDescription ?? "",
		row.diagnosisIcd10 ?? "",
		row.diagnosisTooth ?? "",
		row.complications ?? "",
		row.comorbidities ?? "",
		row.instrumentTrayBarcode ?? "",
	].join("|");
	return crypto.createHash("sha256").update(raw).digest("hex");
}
export async function registerSterilizationRoutes(app: FastifyInstance) {
	app.get("/api/sterilization/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization logs read",
		);
		if (!organizationId) return;

		const logs = await db
			.select()
			.from(sterilizationLogs)
			.where(eq(sterilizationLogs.organizationId, organizationId))
			.orderBy(desc(sterilizationLogs.timestamp));
		return logs;
	});

	app.post("/api/sterilization/scan", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization scan",
		);
		if (!organizationId) return;
		const scanParsed = scanSchema.safeParse(req.body);
		if (!scanParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные стерилизации: barcode, autoclaveId и status.",
			});
		}
		const data = scanParsed.data;

		if (data.operatorId) {
			const [operator] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.id, data.operatorId),
						eq(users.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!operator) {
			return reply.code(400).send({
				error: "OperatorNotFound",
				message:
					"Оператор стерилизации не найден в этой клинике. Выберите сотрудника из списка персонала клиники.",
			});
		}
		}

		const [log] = await db
			.insert(sterilizationLogs)
			.values({
				organizationId,
				barcode: data.barcode,
				autoclaveId: data.autoclaveId,
				operatorId: data.operatorId,
				status: data.status,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "STERILIZATION_LOG_ADDED",
			payload: log,
		});
		return log;
	});

	app.post("/api/sterilization/link", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization link",
		);
		if (!organizationId) return;
		const linkParsed = z
			.object({ visitId: z.string().uuid(), barcode: z.string() })
			.safeParse(req.body);
		if (!linkParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте привязку стерилизации: visitId и barcode.",
			});
		}
		const { visitId, barcode } = linkParsed.data;

		// Verify that the barcode passed sterilization within the same tenant.
		const [log] = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					eq(sterilizationLogs.barcode, barcode),
				),
			)
			.orderBy(desc(sterilizationLogs.timestamp))
			.limit(1);
		if (!log || log.status !== "passed") {
			/*
			 * БЫЛО: только error латиницей без message. Клиент doLock читает
			 * payload.message; без него строил общий fallback. 404 ниже тоже
			 * был голым VisitDiaryNotFound — requestFailureCause(404) слал
			 * врача «программа обновлена не полностью» вместо «сохраните
			 * черновик дневника».
			 */
			return reply.code(400).send({
				error: "Invalid or failed sterilization barcode",
				message:
					"Лоток не подтверждён журналом стерилизации: такого штрихкода нет в этой клинике или последний цикл не пройден. Проверьте штрихкод на упаковке или отсканируйте другой лоток.",
			});
		}

		/*
		 * БЫЛО: UPDATE instrument_tray_barcode по visitId+org без чтения is_locked
		 * и без пересчёта diary_hash. Подписанный 043/у можно было «переклеить»
		 * на другой лоток — PKCS#7 и печать оставались от старого содержимого.
		 * Черновик после link тоже нёс hash без нового barcode до следующего
		 * save/lock — CryptoPro подписывал устаревший отпечаток.
		 *
		 * СТАЛО: SELECT → отказ если locked → UPDATE barcode + diary_hash
		 * той же 8-сегментной формулой, что routes/diary.ts.
		 */
		const [existingDiary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existingDiary) {
			return reply.code(404).send({
				error: "VisitDiaryNotFound",
				message:
					"Дневник этого приёма ещё не сохранён, привязать лоток не к чему. Нажмите «Сохранить черновик», дождиесь отметки времени и повторите подписание.",
			});
		}
		if (existingDiary.isLocked) {
			return reply.code(409).send({
				error: "DiaryLocked",
				message:
					"Дневник приёма уж подписан — сменить инструментальный лоток в 043/у нельзя. Если упаковка указана неверно, правку вносит администратор через ревизию дневника.",
			});
		}

		const nextHash = computeDiaryHashForTrayLink({
			visitId: existingDiary.visitId,
			patientId: existingDiary.patientId,
			anamnesis: existingDiary.anamnesis,
			statusLocalis: existingDiary.statusLocalis,
			treatmentDescription: existingDiary.treatmentDescription,
			diagnosisIcd10: existingDiary.diagnosisIcd10,
			diagnosisTooth: existingDiary.diagnosisTooth,
			complications: existingDiary.complications,
			comorbidities: existingDiary.comorbidities,
			instrumentTrayBarcode: barcode,
		});

		const [diary] = await db
			.update(visitDiaries)
			.set({
				instrumentTrayBarcode: barcode,
				diaryHash: nextHash,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(visitDiaries.id, existingDiary.id),
					eq(visitDiaries.organizationId, organizationId),
					// Повторная защита от TOCTOU: между SELECT и UPDATE кто-то /lock.
					eq(visitDiaries.isLocked, false),
				),
			)
			.returning();
		if (!diary) {
			return reply.code(409).send({
				error: "DiaryLocked",
				message:
					"Дневник приёма уже подписан — сменить инструментальный лоток в 043/у нельзя. Если упаковка указана неверно, правку вносит администратор через ревизию дневника.",
			});
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "VISIT_DIARY_UPDATED",
			payload: diary,
		});
		return diary;
	});
}
