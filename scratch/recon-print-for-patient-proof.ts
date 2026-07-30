/**
 * Живая разведка печатных документов пациента. ТОЛЬКО ЧТЕНИЕ базы.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx ../../scratch/recon-print-for-patient-proof.ts
 *
 * Ничего не создаёт и не удаляет. Маршруты проверяются внутри процесса через
 * app.inject, потому что живой сервер на 4100 может быть устаревшим (tsx watch).
 * Секреты в вывод не попадают: печатается только факт их наличия.
 */

import Fastify from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "../apps/api/src/db/client.js";
import * as schema from "../apps/api/src/db/schema.js";
import { registerDocumentRoutes } from "../apps/api/src/routes/documents.js";
import { taxXmlSourceSnapshotForIssue } from "../apps/api/src/routes/documents.js";
import { getClinicSettingsFromDb } from "../apps/api/src/db/settingsQuery.js";
import { getDocumentById, getDocumentRenderContextFromDb } from "../apps/api/src/db/documentQuery.js";
import { getPatientByIdFromDb } from "../apps/api/src/db/patientsQuery.js";
import { authTokenSecret } from "../apps/api/src/security/authSecret.js";
import { clinicalAdminSecret } from "../apps/api/src/security/authSecret.js";
import { signToken } from "../apps/api/src/utils/cryptoHelper.js";
import { documentKindMetadata, documentKindSchema } from "@dental/shared";

function head(title: string): void {
	console.log(`\n===== ${title} =====`);
}

async function main(): Promise<void> {
	head("1. Организации и юридический профиль клиники");
	const orgs = await db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations);
	console.log(`организаций в базе: ${orgs.length}`);
	const requiredProfileFields = [
		"legalName",
		"inn",
		"address",
		"phone",
		"medicalLicenseNumber",
		"medicalLicenseIssuedAt",
		"medicalLicenseIssuer",
	] as const;
	for (const org of orgs) {
		const settings = await getClinicSettingsFromDb(org.id);
		const profile = settings.profile as Record<string, unknown> | undefined;
		const missing = requiredProfileFields.filter((field) => {
			const value = profile?.[field];
			return !(typeof value === "string" ? value.trim() : value);
		});
		console.log(
			`  ${org.name} [${org.id}] legalName=${JSON.stringify(profile?.legalName ?? null)} inn=${JSON.stringify(
				profile?.inn ?? null,
			)} license=${JSON.stringify(profile?.medicalLicenseNumber ?? null)} НЕ ЗАПОЛНЕНО: ${missing.length ? missing.join(", ") : "нет"}`,
		);
	}

	head("2. Какие виды документов реально созданы");
	const kinds = documentKindSchema.options;
	const rows = await db
		.select({
			kind: schema.generatedDocuments.kind,
			status: schema.generatedDocuments.status,
			count: sql<number>`count(*)::int`,
		})
		.from(schema.generatedDocuments)
		.groupBy(schema.generatedDocuments.kind, schema.generatedDocuments.status);
	const byKind = new Map<string, { draft: number; issued: number; voided: number }>();
	for (const row of rows) {
		const entry = byKind.get(row.kind) ?? { draft: 0, issued: 0, voided: 0 };
		entry[row.status as "draft" | "issued" | "voided"] = Number(row.count);
		byKind.set(row.kind, entry);
	}
	console.log(`видов в перечне: ${kinds.length}; видов встречается в базе: ${byKind.size}`);
	for (const kind of kinds) {
		const entry = byKind.get(kind);
		console.log(
			`  ${entry ? "есть " : "НЕТ  "} ${kind} — ${entry ? `черновик ${entry.draft}, выдан ${entry.issued}, аннулирован ${entry.voided}` : "ни одного документа"} (${documentKindMetadata[kind].title})`,
		);
	}

	head("3. Налоговая справка: замороженный профиль клиники против настоящего");
	const taxDocs = await db
		.select()
		.from(schema.generatedDocuments)
		.where(eq(schema.generatedDocuments.kind, "tax_deduction_certificate"));
	console.log(`справок КНД в базе: ${taxDocs.length}`);
	for (const doc of taxDocs) {
		const frozen = (doc.taxXmlSourceSnapshot as { clinicProfile?: Record<string, unknown> } | null)?.clinicProfile;
		const settings = await getClinicSettingsFromDb(doc.organizationId);
		console.log(
			`  ${doc.id} status=${doc.status} замороженный legalName=${JSON.stringify(frozen?.legalName ?? null)} inn=${JSON.stringify(
				frozen?.inn ?? null,
			)} | настоящий legalName=${JSON.stringify(settings.profile?.legalName ?? null)} inn=${JSON.stringify(settings.profile?.inn ?? null)}`,
		);
	}
	// Прямая проверка сборщика снимка ТЕМ ЖЕ вызовом, что стоит в issue.ts:
	// пятый аргумент (профиль клиники) не передаётся.
	const anyDoc = taxDocs[0] ?? (await db.select().from(schema.generatedDocuments).limit(1))[0];
	if (anyDoc) {
		const patient = await getPatientByIdFromDb(anyDoc.organizationId, anyDoc.patientId);
		if (patient) {
			const fabricated = taxXmlSourceSnapshotForIssue(
				{ ...(anyDoc as never), kind: "tax_deduction_certificate" } as never,
				patient,
				{
					createdAt: new Date().toISOString(),
					taxYear: 2025,
					taxPayerInn: null,
					paymentIds: [],
					fiscalReceiptKeys: [],
					payments: [],
				} as never,
				new Date().toISOString(),
			);
			const realSettings = await getClinicSettingsFromDb(anyDoc.organizationId);
			console.log(
				`  ВЫЗОВ КАК В issue.ts → снимок клиники: legalName=${JSON.stringify(
					fabricated?.clinicProfile.legalName ?? null,
				)} inn=${JSON.stringify(fabricated?.clinicProfile.inn ?? null)} kpp=${JSON.stringify(
					fabricated?.clinicProfile.kpp ?? null,
				)} ogrn=${JSON.stringify(fabricated?.clinicProfile.ogrn ?? null)} license=${JSON.stringify(
					fabricated?.clinicProfile.medicalLicenseNumber ?? null,
				)}`,
			);
			console.log(
				`  настоящий профиль этой клиники: legalName=${JSON.stringify(realSettings.profile?.legalName ?? null)} inn=${JSON.stringify(
					realSettings.profile?.inn ?? null,
				)} kpp=${JSON.stringify(realSettings.profile?.kpp ?? null)} ogrn=${JSON.stringify(realSettings.profile?.ogrn ?? null)}`,
			);
		}
	}

	head("4. Строки плана лечения: привязка к визиту, услуга и цена");
	const planRows = await db.execute<{
		total: number;
		without_visit: number;
		without_service: number;
		zero_price: number;
		cancelled: number;
	}>(sql`
		SELECT count(*)::int AS total,
		       count(*) FILTER (WHERE visit_id IS NULL)::int AS without_visit,
		       count(*) FILTER (WHERE service_id IS NULL)::int AS without_service,
		       count(*) FILTER (WHERE unit_price_rub = 0)::int AS zero_price,
		       count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
		FROM treatment_items
	`);
	console.log(`  строки плана: ${JSON.stringify(planRows.rows[0])}`);
	const orphanService = await db.execute<{ orphan: number }>(sql`
		SELECT count(*)::int AS orphan
		FROM treatment_items ti
		WHERE ti.service_id IS NOT NULL
		  AND NOT EXISTS (SELECT 1 FROM services s WHERE s.id = ti.service_id)
	`);
	console.log(`  строк, чья услуга отсутствует в прайсе: ${orphanService.rows[0]?.orphan}`);

	head("5. Оплаты: статусы, фискальные чеки, налоговые коды");
	const payRows = await db.execute<{
		status: string;
		count: number;
		no_receipt: number;
		no_receipt_date: number;
		no_tax_code: number;
		no_payer: number;
	}>(sql`
		SELECT status,
		       count(*)::int AS count,
		       count(*) FILTER (WHERE fiscal_receipt_number IS NULL OR btrim(fiscal_receipt_number) = '')::int AS no_receipt,
		       count(*) FILTER (WHERE fiscal_receipt_issued_at IS NULL OR btrim(fiscal_receipt_issued_at) = '')::int AS no_receipt_date,
		       count(*) FILTER (WHERE tax_deduction_code IS NULL OR tax_deduction_code NOT IN ('1','2'))::int AS no_tax_code,
		       count(*) FILTER (WHERE payer_full_name IS NULL OR btrim(payer_full_name) = '')::int AS no_payer
		FROM payments
		GROUP BY status
		ORDER BY count DESC
	`);
	for (const row of payRows.rows) console.log(`  ${JSON.stringify(row)}`);

	head("6. Возвраты: меняется ли статус оплаты после выданного возврата");
	const refunds = await db
		.select({ id: schema.generatedDocuments.id, status: schema.generatedDocuments.status, payload: schema.generatedDocuments.payloadJson })
		.from(schema.generatedDocuments)
		.where(eq(schema.generatedDocuments.kind, "payment_refund_correction_request"));
	console.log(`  документов возврата: ${refunds.length}, из них выдано: ${refunds.filter((r) => r.status === "issued").length}`);
	for (const refund of refunds.filter((r) => r.status === "issued")) {
		const payload = refund.payload ? (JSON.parse(refund.payload) as { paymentRefundCorrection?: { amountRub?: number; selectedPaymentIds?: string[] } }) : null;
		const ids = payload?.paymentRefundCorrection?.selectedPaymentIds ?? [];
		for (const paymentId of ids) {
			const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));
			console.log(
				`    возврат ${refund.id} на ${payload?.paymentRefundCorrection?.amountRub} руб. → оплата ${paymentId} status=${payment?.status ?? "НЕ НАЙДЕНА"} amountRub=${payment?.amountRub}`,
			);
		}
	}

	head("7. Маршруты печати внутри процесса (app.inject)");
	const app = Fastify({ logger: false });
	await registerDocumentRoutes(app);
	await app.ready();
	const secret = authTokenSecret();
	const adminSecret = clinicalAdminSecret();
	console.log(`  секрет админа клиники задан: ${adminSecret ? "да" : "нет"}`);
	const sampleDocs = await db
		.select({
			id: schema.generatedDocuments.id,
			organizationId: schema.generatedDocuments.organizationId,
			kind: schema.generatedDocuments.kind,
			status: schema.generatedDocuments.status,
		})
		.from(schema.generatedDocuments)
		.limit(200);
	const interesting = ["treatment_plan", "paid_medical_services_contract", "payment_receipt", "tax_deduction_certificate", "completed_works_act"];
	const picked = [
		...interesting.map((kind) => sampleDocs.find((doc) => doc.kind === kind)).filter(Boolean),
		...sampleDocs.slice(0, 2),
	].filter((doc, index, all) => doc && all.findIndex((other) => other?.id === doc.id) === index) as typeof sampleDocs;

	for (const doc of picked) {
		const clinicToken = signToken({ organizationId: doc.organizationId }, secret);
		const authHeaders: Record<string, string> = { "x-dente-clinic-token": clinicToken };
		if (adminSecret) authHeaders["x-dente-admin-secret"] = adminSecret;

		const noHeaders = await app.inject({ method: "GET", url: `/api/documents/${doc.id}/html` });
		const withHeaders = await app.inject({ method: "GET", url: `/api/documents/${doc.id}/html`, headers: authHeaders });
		const facts = await app.inject({ method: "GET", url: `/api/documents/${doc.id}/audit-facts`, headers: authHeaders });
		const pdf = await app.inject({ method: "GET", url: `/api/documents/${doc.id}/pdf`, headers: authHeaders });
		let factsSummary = "";
		if (facts.statusCode === 200) {
			const parsed = facts.json() as { canExportPdf: boolean; canPreviewHtml: boolean; blockers: string[]; warnings: string[] };
			factsSummary = `canPreviewHtml=${parsed.canPreviewHtml} canExportPdf=${parsed.canExportPdf} blockers=${JSON.stringify(parsed.blockers)}`;
		} else {
			factsSummary = `паспорт ${facts.statusCode}: ${facts.body.slice(0, 160)}`;
		}
		console.log(`\n  ${doc.kind} ${doc.status} ${doc.id}`);
		console.log(`    /html без заголовков: ${noHeaders.statusCode} ${noHeaders.body.slice(0, 140)}`);
		console.log(`    /html с заголовками:  ${withHeaders.statusCode} ${withHeaders.statusCode === 200 ? `${withHeaders.body.length} байт HTML` : withHeaders.body.slice(0, 240)}`);
		console.log(`    /pdf с заголовками:   ${pdf.statusCode} ${pdf.statusCode === 200 ? `${pdf.body.length} байт` : pdf.body.slice(0, 200)}`);
		console.log(`    паспорт выдачи:       ${factsSummary}`);
		if (withHeaders.statusCode === 200) {
			const html = withHeaders.body;
			const suspicious = [
				["профиль клиники не заполнен", /Профиль клиники не заполнен/i],
				["не указана/не указан", /не указан[аоы]?/i],
				["мохибаке cp1251", /[РС][^\s\wА-Яа-яЁё]{0,0}[”ѕєƒјµЅ‚«»]/],
				["ООО Ромашка/пример", /Ромашка|ООО Стоматология DENTE|Пример/i],
				["латиница в заголовках", /<h[12]>[^<]*[A-Za-z]{4,}/],
			] as const;
			const hits = suspicious.filter(([, pattern]) => pattern.test(html)).map(([label]) => label);
			console.log(`    в HTML найдено: ${hits.length ? hits.join(", ") : "ничего из подозрительного списка"}`);
			const rubles = [...html.matchAll(/([\d \s]+(?:,\d\d)?) руб\./g)].map((match) => match[1]?.trim()).slice(0, 12);
			console.log(`    суммы в документе: ${JSON.stringify(rubles)}`);
		}
	}

	head("8. Плавающая точка в проверках сумм (выражения взяты из кода дословно)");
	// guards.ts: plannedFactsTotalMismatchReason / paidFactsTotalMismatchReason
	const planned = [300.01, 300.05, 300.07].reduce((total, value) => total + value, 0);
	const plannedReverse = [300.07, 300.05, 300.01].reduce((total, value) => total + value, 0);
	console.log(`  сумма трёх оплат в двух порядках: ${planned} и ${plannedReverse}; равны через !==: ${!(planned !== plannedReverse)}`);
	// installmentScheduleMismatchReason: Math.max(0, total - prepaid) !== remaining
	const total = 10000.1;
	const prepaid = 3333.33;
	console.log(`  остаток рассрочки ${total} - ${prepaid} = ${total - prepaid} (клиент показал бы 6666.77; сравнение !== отвергнет документ)`);
	// useAppLogic: Number(amount.replace(/[^\d]/g, ""))
	for (const typed of ["1 500,50", "12 345,67", "1500.50", "1500"]) {
		console.log(`  введено «${typed}» → в документ уйдёт ${Number(typed.replace(/[^\d]/g, ""))} руб.`);
	}

	await app.close();
}

main()
	.catch((error) => {
		console.error("ПРОВАЛ разведки:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
