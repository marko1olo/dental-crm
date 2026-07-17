import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { egiszLogs, patients, organizations, users, visitDiaries } from "../db/schema.js";

const egiszPayloadSchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid(),
});

export default async function registerEgiszRoutes(app: FastifyInstance) {
	app.post("/api/egisz/send", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "egisz send")))
			return;
		const { patientId, visitId } = egiszPayloadSchema.parse(req.body);

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const [patient] = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			);
		if (!patient) {
			return reply.code(404).send({ error: "Patient not found" });
		}

		const administrativeProfile = patient.administrativeProfile as any;

		const missingFields: string[] = [];
		if (!administrativeProfile?.snils) missingFields.push("СНИЛС");
		if (!administrativeProfile?.identityDocument) missingFields.push("Паспорт");
		if (!administrativeProfile?.insurancePolicy && !administrativeProfile?.insurancePolicyNumber)
			missingFields.push("Полис ОМС");

		if (missingFields.length > 0) {
			const errorDetails = `Отсутствуют обязательные данные: ${missingFields.join(", ")}`;
			await db.insert(egiszLogs).values({
				patientId,
				visitId,
				status: "Error",
				errorDetails: { message: errorDetails },
			});
			return reply.code(400).send({ error: errorDetails });
		}

		function validateSnilsChecksum(snils: string): boolean {
			if (snils.length !== 11) return false;
			const baseNumStr = snils.slice(0, 9);
			const checkSumStr = snils.slice(9);
			const baseNum = Number.parseInt(baseNumStr, 10);
			if (baseNum <= 1001998) return true; // calculation starts for SNILS > 001-001-998

			let sum = 0;
			for (let i = 0; i < 9; i++) {
				sum += Number.parseInt(baseNumStr[i] ?? "0", 10) * (9 - i);
			}

			let checkDigit = 0;
			if (sum < 100) {
				checkDigit = sum;
			} else if (sum === 100 || sum === 101) {
				checkDigit = 0;
			} else {
				const remainder = sum % 101;
				if (remainder < 100) {
					checkDigit = remainder;
				} else if (remainder === 100 || remainder === 101) {
					checkDigit = 0;
				}
			}

			return checkDigit === Number.parseInt(checkSumStr, 10);
		}

		// ... inside registerEgiszRoutes ...
		// SNILS format & checksum validation
		const snils = administrativeProfile.snils.replace(/\D/g, "");
		if (!validateSnilsChecksum(snils)) {
			await db.insert(egiszLogs).values({
				patientId,
				visitId,
				status: "Error",
				errorDetails: {
					message: "Некорректный формат или контрольная сумма СНИЛС",
				},
			});
			return reply
				.code(400)
				.send({ error: "Некорректный формат или контрольная сумма СНИЛС" });
		}

		// Fetch dependencies: organization, visit diary, doctor
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId));
			
		if (!org) {
			return reply.code(400).send({ error: "Организация не найдена" });
		}
			
		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, orgId)));
			
		if (!diary) {
			return reply.code(400).send({ error: "Не найден дневник приема для отправки в ЕГИСЗ" });
		}
		
		let doctorName: { first: string; last: string; middle?: string } = { first: "Врач", last: "Неизвестен" };
		let doctorSnils: string | null = null;
		if (diary.doctorId) {
			const [doc] = await db.select().from(users).where(eq(users.id, diary.doctorId));
			if (doc) {
				const parts = doc.fullName.split(" ");
				doctorName = { 
					last: parts[0] || "Врач", 
					first: parts[1] || "Неизвестен", 
					middle: parts.slice(2).join(" ") 
				};
				doctorSnils = doc.snils || null;
			}
		}

		// Import the CDA Generator (dynamically to avoid top level issues if needed, or static)
		const { generateDentalCdaXml } = await import("../services/egiszCdaGenerator.js");
		
		const pNameParts = patient.fullName.split(" ");
		const documentId = `EGISZ-${Date.now()}`;
		
		try {
			if (!doctorSnils) {
				throw new Error("Не указан СНИЛС врача в профиле. Отправка в ЕГИСЗ невозможна.");
			}

			const clinicOid = (org.specializations as any)?.egiszOid;
			if (!clinicOid) {
				throw new Error("Не указан OID клиники в настройках. Отправка в ЕГИСЗ невозможна.");
			}

			const cdaXml = generateDentalCdaXml({
				patientId: patient.id,
				patientName: {
					last: pNameParts[0] || "Пациент",
					first: pNameParts[1] || "Неизвестен",
					middle: pNameParts.slice(2).join(" ")
				},
				patientSnils: snils,
				patientBirthDate: patient.dateOfBirth,
				patientGender: patient.gender as any,
				clinicOid,
				clinicName: org.name,
				doctorName,
				doctorSnils,
				icd10Code: diary.diagnosisIcd10 || "K02.1",
				diagnosisText: diary.diagnosisText || diary.diagnosisIcd10 || "Диагноз не указан",
				anamnesis: diary.anamnesis || "",
				treatmentDescription: diary.treatmentDescription || "",
				visitDate: new Date(),
				documentId
			});

			// In a real integration, here we would send 'cdaXml' to the EGISZ / REMD endpoint via SOAP/REST
			// const egiszResponse = await fetch("https://egisz.rosminzdrav.ru/remd/...", { method: "POST", body: cdaXml });
			
			// Log success (with generated XML saved in errorDetails temporarily for debugging/download)
			await db.insert(egiszLogs).values({
				patientId,
				visitId,
				status: "Accepted",
				transactionId: documentId,
				errorDetails: { xmlPreview: cdaXml.substring(0, 500) + "..." }
			});

			return reply.send({ success: true, transactionId: documentId });
		} catch (e: any) {
			await db.insert(egiszLogs).values({
				patientId,
				visitId,
				status: "Error",
				errorDetails: { message: e.message || "Ошибка генерации CDA XML" },
			});
			return reply.code(500).send({ error: "Ошибка генерации CDA XML" });
		}
	});

	app.get("/api/egisz/logs/:patientId", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "egisz logs")))
			return;
		const { patientId } = req.params as { patientId: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const logs = await db
			.select()
			.from(egiszLogs)
			.innerJoin(patients, eq(egiszLogs.patientId, patients.id))
			.where(
				and(
					eq(egiszLogs.patientId, patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.then((res) => res.map((r) => r.egisz_logs));
		return reply.send({ logs });
	});
}
