import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import crypto from "node:crypto";
import { payments, organizations } from "../../db/schema.js";
import {
	type Kopecks,
	PAID_PAYMENT_STATUS,
	rublesFromKopecks,
	toKopecks,
} from "../../money/patientDebt.js";
import { requireOrganizationId } from "../../security/identity.js";

const ndflQuerySchema = z.object({
	patientId: z.string().uuid(),
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
});

export async function register(app: FastifyInstance) {
	app.get("/api/documents/ndfl-calculator", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;
		const query = ndflQuerySchema.parse(request.query);
		const start = new Date(query.startDate);
		const end = new Date(query.endDate);

		const patient = await getPatientByIdFromDb(organizationId, query.patientId);

		if (!patient) {
			return reply.status(404).send({ error: "Patient not found" });
		}

		// balanceRub is negative if there is a debt.
		const debtRub = patient.balanceRub < 0 ? Math.abs(patient.balanceRub) : 0;

		if (debtRub > 0) {
			return {
				isBlocked: true,
				debtRub,
				code1TotalRub: 0,
				code2TotalRub: 0,
			};
		}

		const taxSums = await db
			.select({
				taxDeductionCode: payments.taxDeductionCode,
				totalAmountRub: sql<string>`sum(${payments.amountRub})`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.patientId, query.patientId),
					eq(payments.status, PAID_PAYMENT_STATUS),
					gte(payments.paidAt, start),
					lte(payments.paidAt, end),
				),
			)
			.groupBy(payments.taxDeductionCode);

		let code1Kopecks: Kopecks = 0;
		let code2Kopecks: Kopecks = 0;

		for (const row of taxSums) {
			const kopecks = toKopecks(row.totalAmountRub, "сумма платежа");
			if (row.taxDeductionCode === "1") {
				code1Kopecks += kopecks;
			} else if (row.taxDeductionCode === "2") {
				code2Kopecks += kopecks;
			}
		}

		return {
			isBlocked: false,
			debtRub: 0,
			code1TotalRub: rublesFromKopecks(code1Kopecks),
			code2TotalRub: rublesFromKopecks(code2Kopecks),
		};
	});

	app.get("/api/documents/ndfl-xml", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;
		const query = ndflQuerySchema.parse(request.query);
		const start = new Date(query.startDate);
		const end = new Date(query.endDate);

		const patient = await getPatientByIdFromDb(organizationId, query.patientId);

		if (!patient) {
			return reply.status(404).send({ error: "Patient not found" });
		}

		// balanceRub is negative if there is a debt.
		const debtRub = patient.balanceRub < 0 ? Math.abs(patient.balanceRub) : 0;

		if (debtRub > 0) {
			return reply.status(403).send({ error: "У пациента есть долг, справка не может быть сформирована" });
		}

		const taxSums = await db
			.select({
				taxDeductionCode: payments.taxDeductionCode,
				totalAmountRub: sql<string>`sum(${payments.amountRub})`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.patientId, query.patientId),
					eq(payments.status, PAID_PAYMENT_STATUS),
					gte(payments.paidAt, start),
					lte(payments.paidAt, end),
				),
			)
			.groupBy(payments.taxDeductionCode);

		let code1Kopecks: Kopecks = 0;
		let code2Kopecks: Kopecks = 0;

		for (const row of taxSums) {
			const kopecks = toKopecks(row.totalAmountRub, "сумма платежа");
			if (row.taxDeductionCode === "1") {
				code1Kopecks += kopecks;
			} else if (row.taxDeductionCode === "2") {
				code2Kopecks += kopecks;
			}
		}

		const org = await db.query.organizations.findFirst({
			where: eq(organizations.id, organizationId)
		});

		const year = start.getFullYear();
		const dateString = new Date().toISOString().substring(0, 10).replace(/-/g, "");
		const patientInn = patient.administrativeProfile?.taxpayerInn || "000000000000";
		const orgInn = org?.inn || "0000000000";
		const orgKpp = org?.kpp || "";
		
		const parts = patient.fullName.split(" ").filter(Boolean);
		const lastName = parts[0] || "";
		const firstName = parts[1] || "";
		const middleName = parts.slice(2).join(" ");

		/*
		 * КОДИРОВКА: заголовок объявлял windows-1251, но Node.js отправлял
		 * UTF-8 строку — ФНС-валидатор отклонял файл как невалидный XML.
		 * Переключились на UTF-8 (ФНС принимает с версии 5.01).
		 *
		 * СУММЫ: rublesFromKopecks возвращает number (например 1500.5).
		 * ФНС требует строку с ровно 2 знаками ("1500.50"). Добавлен toFixed(2).
		 *
		 * НУЛЕВЫЕ СТРОКИ: если платежей по одному коду нет — тег опускается.
		 * Пустой <СумОплУслуг СуммОпл="0.00"> противоречит XSD ФНС.
		 */
		const sum1Str =
			code1Kopecks > 0 ? rublesFromKopecks(code1Kopecks).toFixed(2) : null;
		const sum2Str =
			code2Kopecks > 0 ? rublesFromKopecks(code2Kopecks).toFixed(2) : null;

		const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="UT_SVOPLMEDUSL_${patientInn}_${orgInn}_${dateString}_${crypto.randomUUID()}" ВерсФорм="5.01" ВерсПрог="Dente">
	<Документ КНД="1151156" ДатаДок="${new Date().toISOString().substring(0, 10)}" ОтчетГод="${year}">
		<СвМедОрг НаимМедОрг="${(org?.name || "").replace(/"/g, '&quot;')}" ИННМедОрг="${orgInn}" КПП="${orgKpp}"/>
		<СвНалПлат>
			<ФИО Фамилия="${lastName.replace(/"/g, '&quot;')}" Имя="${firstName.replace(/"/g, '&quot;')}" ${middleName ? `Отчество="${middleName.replace(/"/g, '&quot;')}"` : ""}/>
			${patientInn !== "000000000000" ? `<ИННФЛ>${patientInn}</ИННФЛ>` : ""}
		</СвНалПлат>
		${sum1Str !== null ? `<СумОплУслуг СуммОпл="${sum1Str}" КодВидУслуг="1"/>` : ""}
		${sum2Str !== null ? `<СумОплУслуг СуммОпл="${sum2Str}" КодВидУслуг="2"/>` : ""}
	</Документ>
</Файл>`;

		reply.header("Content-Type", "application/xml; charset=UTF-8");
		reply.header("Content-Disposition", `attachment; filename="ndfl_${query.patientId}_${year}.xml"`);
		return reply.send(xmlStr);
	});
}
