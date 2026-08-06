/**
 * Живое доказательство подписания документа УКЭП: POST /api/documents/:id/sign-ukep
 * ЧЕРЕЗ ШТАТНЫЙ регистратор registerDocumentRoutes, против реальной PostgreSQL.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает).
 * Статический разбор здесь бессилен: файл documents/signUkep.ts объявлял маршрут
 * и выглядел рабочим, а адрес отвечал 404 — потому что его register никто не
 * вызывал. Отличить «маршрут объявлен» от «маршрут обслуживается» можно только
 * прогоном.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ dev-сервер на 4100. Живой dev-API бывает устаревшим и на этом
 * самом адресе отвечает не 404, а 400 через общий предохранитель запроса — то
 * есть по его ответу нельзя понять, зарегистрирован маршрут или нет. Здесь
 * поднимается свой экземпляр Fastify в процессе и опрашивается app.inject.
 *
 * КОНТРОЛЬ ПРОВОДКИ, А НЕ МОДУЛЯ. Маршрут подключается ровно так, как это делает
 * сервер: await registerDocumentRoutes(app). Подключить signUkep напрямую было бы
 * доказательством того, что модуль исправен, а сломана была именно проводка.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/documentUkepSignProof.ts
 *
 * Прогон создаёт СВОИ организацию, пациента, сотрудника и документ и удаляет их
 * целиком в finally. Секрет подписи токена берётся штатным authTokenSecret() и в
 * вывод не попадает.
 */

import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { db, pool } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * Название клиники прогона. По нему же идёт уборка следов прерванного запуска:
 * сверка на точное равенство, без LIKE и без маски, чтобы клиника с похожим
 * названием не попала под удаление.
 */
const PROOF_ORGANIZATION_NAME = "Проверка подписи УКЭП — клиника прогона";

/** Крипто-подпись прогона. Не настоящая PKCS#7: маршрут её не разбирает, он её хранит. */
const PROOF_SIGNATURE = "cHJvb2Ytc2lnbmF0dXJlLXVrZXAtMQ==";
const SECOND_SIGNATURE = "cHJvb2Ytc2lnbmF0dXJlLXVrZXAtMg==";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

/** Удаление следов прошлого прерванного прогона — до посева, а не после. */
async function removeProofTraces(): Promise<void> {
	const stale = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.name, PROOF_ORGANIZATION_NAME));
	for (const organization of stale) {
		await db
			.delete(generatedDocuments)
			.where(eq(generatedDocuments.organizationId, organization.id));
		await db
			.delete(patients)
			.where(eq(patients.organizationId, organization.id));
		await db.delete(users).where(eq(users.organizationId, organization.id));
		await db.delete(organizations).where(eq(organizations.id, organization.id));
	}
}

async function main(): Promise<void> {
	await removeProofTraces();

	const app: FastifyInstance = Fastify({ logger: false });
	await registerDocumentRoutes(app);
	await app.ready();

	let organizationId = "";
	try {
		const [organization] = await db
			.insert(organizations)
			.values({ name: PROOF_ORGANIZATION_NAME })
			.returning({ id: organizations.id });
		if (!organization)
			throw new Error("Посев не состоялся: клиника прогона не создана");
		organizationId = organization.id;

		const [patient] = await db
			.insert(patients)
			.values({ organizationId, fullName: "Пациент Прогона Подписи" })
			.returning({ id: patients.id });
		const [staff] = await db
			.insert(users)
			.values({
				organizationId,
				fullName: "Главный врач прогона",
				role: "owner",
			})
			.returning({ id: users.id });
		if (!patient || !staff)
			throw new Error("Посев не состоялся: пациент или сотрудник не создан");

		/*
		 * Документ ВЫДАН и с проверенным архивом — именно такой подписывают УКЭП:
		 * кнопка на экране берёт печатную копию через /pdf, а она отдаётся только
		 * для выданного документа с отметкой о подписании.
		 */
		const [document] = await db
			.insert(generatedDocuments)
			.values({
				organizationId,
				patientId: patient.id,
				kind: "medical_intervention_refusal",
				status: "issued",
				title: "Отказ от медицинского вмешательства (прогон подписи)",
				issuedAt: new Date(),
				issuedSnapshotSha256: "0".repeat(64),
				issuedSnapshotCreatedAt: new Date(),
				issuedByUserId: staff.id,
			})
			.returning({ id: generatedDocuments.id });
		if (!document)
			throw new Error("Посев не состоялся: документ прогона не создан");

		const url = `/api/documents/${document.id}/sign-ukep`;
		const token = signToken(
			{ organizationId, userId: staff.id, role: "owner" },
			authTokenSecret(),
		);
		const headers = {
			"x-dente-staff-token": token,
			"content-type": "application/json",
		};

		// ЗАМЕР 1. Маршрут вообще обслуживается? До регистрации здесь было 404
		// с телом Fastify «Route POST:/api/documents/<…>/sign-ukep not found».
		const anonymous = await app.inject({
			method: "POST",
			url,
			payload: { pkcs7Signature: PROOF_SIGNATURE },
		});
		check(
			"без токена сотрудника маршрут отвечает отказом доступа, а не 404",
			anonymous.statusCode,
			401,
		);
		console.log(
			`  без токена: HTTP ${anonymous.statusCode} ${anonymous.body.slice(0, 120)}`,
		);

		// ЗАМЕР 2. Пустая подпись отклоняется до похода в базу.
		const empty = await app.inject({
			method: "POST",
			url,
			headers,
			payload: {},
		});
		check("подписание без подписи отклонено", empty.statusCode, 400);

		// ЗАМЕР 3. Подписание выданного документа.
		const signed = await app.inject({
			method: "POST",
			url,
			headers,
			payload: { pkcs7Signature: PROOF_SIGNATURE },
		});
		check("документ подписан УКЭП", signed.statusCode, 200);
		console.log(`  подписание: HTTP ${signed.statusCode} ${signed.body}`);

		// ЗАМЕР 4. Подпись действительно легла в колонку — независимым SQL.
		const stored = await db.execute(sql`
			select crypto_signature_pkcs7 as signature
			  from generated_documents
			 where id = ${document.id}
		`);
		const storedSignature =
			(stored.rows[0] as { signature: string | null } | undefined)?.signature ??
			null;
		check(
			"крипто-подпись сохранена в документе",
			storedSignature,
			PROOF_SIGNATURE,
		);

		// ЗАМЕР 5. Повторное подписание запрещено: иначе подпись главного врача
		// молча затирается чужой, а кто заверял архивный PDF — не установить.
		const again = await app.inject({
			method: "POST",
			url,
			headers,
			payload: { pkcs7Signature: SECOND_SIGNATURE },
		});
		check("повторное подписание отклонено", again.statusCode, 409);
		console.log(`  повтор: HTTP ${again.statusCode} ${again.body}`);

		const afterRetry = await db.execute(sql`
			select crypto_signature_pkcs7 as signature
			  from generated_documents
			 where id = ${document.id}
		`);
		const signatureAfterRetry =
			(afterRetry.rows[0] as { signature: string | null } | undefined)
				?.signature ?? null;
		check(
			"первая подпись не затёрта повторной попыткой",
			signatureAfterRetry,
			PROOF_SIGNATURE,
		);

		// ЗАМЕР 6. Чужая клиника не подпишет документ этой клиники.
		const [otherOrganization] = await db
			.insert(organizations)
			.values({ name: PROOF_ORGANIZATION_NAME })
			.returning({ id: organizations.id });
		if (otherOrganization) {
			const [otherStaff] = await db
				.insert(users)
				.values({
					organizationId: otherOrganization.id,
					fullName: "Врач чужой клиники",
					role: "owner",
				})
				.returning({ id: users.id });
			if (otherStaff) {
				const foreignToken = signToken(
					{
						organizationId: otherOrganization.id,
						userId: otherStaff.id,
						role: "owner",
					},
					authTokenSecret(),
				);
				const foreign = await app.inject({
					method: "POST",
					url: `/api/documents/${document.id}/sign-ukep`,
					headers: {
						"x-dente-staff-token": foreignToken,
						"content-type": "application/json",
					},
					payload: { pkcs7Signature: "cHJvb2Ytc2lnbmF0dXJlLWZvcmVpZ24=" },
				});
				check(
					"документ чужой клиники не найден для подписания",
					foreign.statusCode,
					404,
				);
			}
		}
	} finally {
		await removeProofTraces();
		await app.close();
		await pool.end();
	}

	console.log(
		failures === 0
			? "\nИТОГ: все замеры сошлись"
			: `\nИТОГ: провалов ${failures}`,
	);
	process.exitCode = failures === 0 ? 0 : 1;
}

await main();
