/**
 * API VERIFIED для пакета U5: настоящие HTTP-запросы к работающему серверу
 * 127.0.0.1:4100 (он запущен через `tsx watch`, поэтому подхватывает правки),
 * затем чтение строк из PostgreSQL 127.0.0.1:5432.
 *
 * Данные создаются в СОБСТВЕННОЙ организации и удаляются целиком. Чужие строки
 * не читаются и не меняются. Секреты не печатаются.
 *
 * Запуск: node --import tsx .agents/archon/packets/U5-diary-lock-ceremony/live-api-proof.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../../../../apps/api/src/db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	procedureMaterialRules,
	serviceCatalogItems,
	treatmentItems,
	users,
	visitDiaries,
	visits,
} from "../../../../apps/api/src/db/schema.js";
import { authTokenSecret } from "../../../../apps/api/src/security/authSecret.js";
import { signToken } from "../../../../apps/api/src/utils/cryptoHelper.js";

const BASE = process.env.DENTE_U5_API_BASE ?? "http://127.0.0.1:4100";
const PKCS7 = "MIIB-live-u5-signature";

let organizationId = "";

function candidateSecrets(): string[] {
	const secrets = [authTokenSecret()];
	// Сервер мог сгенерировать dev-секрет в своём каталоге .data (иной cwd).
	for (const dir of ["apps/api/.data", ".data"]) {
		try {
			const value = readFileSync(
				path.resolve(process.cwd(), dir, "dev-auth-secret"),
				"utf8",
			).trim();
			if (value && !secrets.includes(value)) secrets.push(value);
		} catch {
			// каталога нет — вариант просто не рассматривается
		}
	}
	return secrets;
}

async function seed(label: string, doctorId: string, patientId: string) {
	const [service] = await db
		.insert(serviceCatalogItems)
		.values({
			organizationId,
			code: `U5LIVE-${label}`,
			title: `Услуга ${label}`,
			basePriceRub: 4500,
			priceRub: 4500,
		})
		.returning({ id: serviceCatalogItems.id });
	const [item] = await db
		.insert(inventoryItems)
		.values({
			organizationId,
			name: `Материал ${label}`,
			stockQuantity: "10",
			currentQty: "10",
			unitCostRub: "123.45",
		})
		.returning({ id: inventoryItems.id });
	await db.insert(procedureMaterialRules).values({
		organizationId,
		serviceId: service.id,
		inventoryItemId: item.id,
		quantityToDeduct: "2",
	});
	const [visit] = await db
		.insert(visits)
		.values({ organizationId, patientId, status: "draft" })
		.returning({ id: visits.id });
	const [treatment] = await db
		.insert(treatmentItems)
		.values({
			organizationId,
			patientId,
			visitId: visit.id,
			serviceId: service.id,
			title: `Услуга ${label}`,
			quantity: "2",
			priceRub: 4500,
			unitPriceRub: 4500,
			status: "approved",
		})
		.returning({ id: treatmentItems.id });
	void doctorId;
	return {
		visitId: visit.id,
		inventoryItemId: item.id,
		treatmentItemId: treatment.id,
	};
}

async function measure(scenario: {
	visitId: string;
	inventoryItemId: string;
	treatmentItemId: string;
}) {
	const [diary] = await db
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.visitId, scenario.visitId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);
	const [item] = await db
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.id, scenario.inventoryItemId));
	const movements = await db
		.select()
		.from(inventoryTransactions)
		.where(eq(inventoryTransactions.visitId, scenario.visitId));
	const audits = diary
		? await db
				.select()
				.from(clinicalAuditLogs)
				.where(eq(clinicalAuditLogs.entityId, diary.id))
		: [];
	const [treatment] = await db
		.select()
		.from(treatmentItems)
		.where(eq(treatmentItems.id, scenario.treatmentItemId));
	return {
		diaryId: diary?.id ?? null,
		locked: diary?.isLocked ?? false,
		hash: diary?.diaryHash ? `${diary.diaryHash.slice(0, 12)}...` : null,
		signature: diary?.cryptoSignaturePkcs7 ?? null,
		stock: item ? Number(item.stockQuantity) : null,
		movements: movements.length,
		movementQty: movements.reduce((s, r) => s + Number(r.quantityChanged), 0),
		movementType: movements[0]?.transactionType ?? null,
		audits: audits.length,
		auditAction: audits[0]?.action ?? null,
		treatmentStatus: treatment?.status ?? null,
	};
}

async function post(url: string, token: string, body: unknown) {
	const response = await fetch(`${BASE}${url}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-staff-token": token,
		},
		body: JSON.stringify(body),
	});
	return { status: response.status, body: await response.text() };
}

async function cleanup() {
	if (!organizationId) return;
	await db
		.delete(inventoryTransactions)
		.where(eq(inventoryTransactions.organizationId, organizationId));
	await db
		.delete(clinicalAuditLogs)
		.where(eq(clinicalAuditLogs.organizationId, organizationId));
	await db
		.delete(doctorCommissions)
		.where(eq(doctorCommissions.organizationId, organizationId));
	await db
		.delete(visitDiaries)
		.where(eq(visitDiaries.organizationId, organizationId));
	await db
		.delete(procedureMaterialRules)
		.where(eq(procedureMaterialRules.organizationId, organizationId));
	await db
		.delete(treatmentItems)
		.where(eq(treatmentItems.organizationId, organizationId));
	await db.delete(visits).where(eq(visits.organizationId, organizationId));
	await db
		.delete(serviceCatalogItems)
		.where(eq(serviceCatalogItems.organizationId, organizationId));
	await db
		.delete(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));
	await db.delete(patients).where(eq(patients.organizationId, organizationId));
	await db.delete(users).where(eq(users.organizationId, organizationId));
	await db.delete(organizations).where(eq(organizations.id, organizationId));
}

async function main() {
	const health = await fetch(`${BASE}/api/health`);
	console.log(`GET /api/health -> ${health.status} ${await health.text()}`);

	const [organization] = await db
		.insert(organizations)
		.values({ name: "U5 live proof clinic" })
		.returning({ id: organizations.id });
	organizationId = organization.id;
	const [doctor] = await db
		.insert(users)
		.values({ organizationId, fullName: "Врач U5 live", role: "doctor" })
		.returning({ id: users.id });
	const [patient] = await db
		.insert(patients)
		.values({ organizationId, fullName: "Пациент U5 live" })
		.returning({ id: patients.id });

	// Подбираем секрет, которым сервер действительно проверяет токены. Значение
	// секрета не печатается — только индекс подошедшего варианта.
	let token = "";
	const probeVisit = await seed("probe", doctor.id, patient.id);
	for (const [index, secret] of candidateSecrets().entries()) {
		const candidate = signToken(
			{ organizationId, userId: doctor.id, role: "doctor" },
			secret,
		);
		const attempt = await post("/api/diaries", candidate, {
			visitId: probeVisit.visitId,
			patientId: patient.id,
			anamnesis: "проба связи",
		});
		if (attempt.status === 200) {
			token = candidate;
			console.log(`token accepted (secret candidate #${index})`);
			break;
		}
		console.log(`secret candidate #${index} rejected: ${attempt.status} ${attempt.body}`);
	}
	if (!token) {
		throw new Error("сервер не принял ни один вариант токена сотрудника");
	}

	const viaPost = await seed("post", doctor.id, patient.id);
	const viaLock = await seed("lock", doctor.id, patient.id);

	for (const scenario of [viaPost, viaLock]) {
		const draft = await post("/api/diaries", token, {
			visitId: scenario.visitId,
			patientId: patient.id,
			anamnesis: "Жалобы на боль при накусывании.",
			statusLocalis: "Зуб 36: глубокая полость.",
			treatmentDescription: "Обработка, пломба.",
		});
		console.log(`POST /api/diaries (черновик) -> ${draft.status} ${draft.body}`);
	}

	const signViaPost = await post("/api/diaries", token, {
		visitId: viaPost.visitId,
		patientId: patient.id,
		status: "signed",
		pkcs7Signature: PKCS7,
	});
	console.log(
		`POST /api/diaries (status signed) -> ${signViaPost.status} ${signViaPost.body}`,
	);

	const [lockDiary] = await db
		.select({ id: visitDiaries.id })
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.visitId, viaLock.visitId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);
	const signViaLock = await post(`/api/diaries/${lockDiary.id}/lock`, token, {
		pkcs7Signature: PKCS7,
	});
	console.log(
		`POST /api/diaries/:id/lock -> ${signViaLock.status} ${signViaLock.body}`,
	);

	const postOutcome = await measure(viaPost);
	const lockOutcome = await measure(viaLock);
	console.log("DB after POST signing :", JSON.stringify(postOutcome));
	console.log("DB after /lock signing:", JSON.stringify(lockOutcome));

	const comparable = (o: typeof postOutcome) => ({
		locked: o.locked,
		signature: o.signature,
		stock: o.stock,
		movements: o.movements,
		movementQty: o.movementQty,
		movementType: o.movementType,
		audits: o.audits,
		auditAction: o.auditAction,
		treatmentStatus: o.treatmentStatus,
	});
	const equal =
		JSON.stringify(comparable(postOutcome)) ===
		JSON.stringify(comparable(lockOutcome));
	console.log(`CEREMONY EQUAL ACROSS BOTH ROUTES: ${equal}`);

	const retry = await post("/api/diaries", token, {
		visitId: viaPost.visitId,
		patientId: patient.id,
		status: "signed",
	});
	console.log(`POST повторная подпись -> ${retry.status} ${retry.body}`);
	const retryLock = await post(`/api/diaries/${lockDiary.id}/lock`, token, {});
	console.log(`/lock повторная подпись -> ${retryLock.status} ${retryLock.body}`);
	console.log(
		"stock unchanged after retries:",
		JSON.stringify({
			post: (await measure(viaPost)).stock,
			lock: (await measure(viaLock)).stock,
		}),
	);

	if (!equal) process.exitCode = 1;
}

main()
	.catch((err) => {
		console.error("LIVE PROOF FAILED:", err.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await cleanup();
		await pool.end();
	});
