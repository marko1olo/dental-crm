/**
 * ВРЕМЕННЫЙ инструмент разведки изоляции клиник. НЕ КОММИТИТСЯ и удаляется
 * сразу после снятия показаний. Имя без `.test.ts` — `npm test` собирает только
 * `src/**\/*.test.ts`, поэтому чужой прогон он не задевает.
 *
 * Маршруты поднимаются СВОИМ экземпляром Fastify и опрашиваются через
 * app.inject: живой сервер на 4100 идёт под tsx watch и может отставать от
 * дерева, поэтому его ответ ничего не доказывает.
 *
 * Оба токена подписываются штатным authTokenSecret(), то есть организация
 * определяется тем же путём, что и у настоящего браузера. Заголовок
 * x-organization-id не используется вовсе.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import Fastify from "fastify";
import { db, pool } from "../db/client.js";
import {
	appointmentWaitlists,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { registerLabRoutes } from "../routes/lab.js";
import registerToothHistoryRoutes from "../routes/toothHistory.js";
import { registerWaitlistRoutes } from "../routes/waitlist.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_A = "dce70000-0000-4000-8000-0000000c7a01";
const ORG_B = "dce70000-0000-4000-8000-0000000c7b01";
const PATIENT_A = "dce70000-0000-4000-8000-0000000c7a11";
const PATIENT_B = "dce70000-0000-4000-8000-0000000c7b11";
const DOCTOR_A = "dce70000-0000-4000-8000-0000000c7a21";
const DOCTOR_B = "dce70000-0000-4000-8000-0000000c7b21";

/** Строки-маркеры: всплыли в ответе клиники А — значит утекли. */
const FOREIGN_DOCTOR_NAME = "Иванова Ольга Петровна (ВРАЧ КЛИНИКИ Б)";
const FOREIGN_PATIENT_NAME = "Секретный Пациент Клиники Б";

let leaks = 0;

function report(label: string, leaked: boolean, detail: string): void {
	if (leaked) leaks += 1;
	console.log(`${leaked ? "УТЕЧКА" : "чисто "} | ${label}\n         ${detail}`);
}

async function cleanup(): Promise<void> {
	const ids = [ORG_A, ORG_B];
	const idList = sql.join(
		ids.map((i) => sql`${i}::uuid`),
		sql`, `,
	);
	const catalog = await db.execute<{ table_name: string }>(sql`
		SELECT c.table_name FROM information_schema.columns c
		JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name
		WHERE c.table_schema='public' AND c.column_name='organization_id'
		  AND c.table_name <> 'organizations' AND t.table_type='BASE TABLE'`);
	let remaining = catalog.rows.map((r) => r.table_name);
	for (let pass = 0; pass < 8 && remaining.length > 0; pass += 1) {
		const blocked: string[] = [];
		for (const table of remaining) {
			try {
				await db.execute(
					sql`DELETE FROM ${sql.identifier(table)} WHERE organization_id IN (${idList})`,
				);
			} catch {
				blocked.push(table);
			}
		}
		if (blocked.length === remaining.length) break;
		remaining = blocked;
	}
	await db.delete(organizations).where(inArray(organizations.id, ids));
}

async function seed(): Promise<void> {
	await db.insert(organizations).values([
		{ id: ORG_A, name: "Разведка изоляции — клиника А" },
		{ id: ORG_B, name: "Разведка изоляции — клиника Б" },
	]);
	await db.insert(users).values([
		{
			id: DOCTOR_A,
			organizationId: ORG_A,
			fullName: "Свой Врач Клиники А",
			role: "doctor",
		},
		{
			id: DOCTOR_B,
			organizationId: ORG_B,
			fullName: FOREIGN_DOCTOR_NAME,
			role: "doctor",
		},
	]);
	await db.insert(patients).values([
		{
			id: PATIENT_A,
			organizationId: ORG_A,
			fullName: "Свой Пациент Клиники А",
			phone: "+79990000001",
		},
		{
			id: PATIENT_B,
			organizationId: ORG_B,
			fullName: FOREIGN_PATIENT_NAME,
			phone: "+79990001122",
		},
	]);
}

function headersForOrgA(): Record<string, string> {
	const secret = authTokenSecret();
	return {
		"x-dente-clinic-token": signToken({ organizationId: ORG_A }, secret),
		"x-dente-staff-token": signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "admin",
				fullName: "Админ Клиники А",
			},
			secret,
		),
		"content-type": "application/json",
	};
}

async function main(): Promise<void> {
	await cleanup();
	await seed();

	const app = Fastify({ logger: false });
	await registerWaitlistRoutes(app);
	await registerLabRoutes(app);
	await registerToothHistoryRoutes(app);
	await app.ready();

	const h = headersForOrgA();

	const control1 = await app.inject({
		method: "GET",
		url: `/api/odontogram/tooth-history/${PATIENT_B}/11`,
		headers: h,
	});
	report(
		"КОНТРОЛЬ GET /api/odontogram/tooth-history/<пациент Б>/11",
		control1.statusCode === 200,
		`статус ${control1.statusCode}, тело ${control1.body.slice(0, 120)}`,
	);

	const control2 = await app.inject({
		method: "POST",
		url: "/api/waitlist",
		headers: h,
		payload: { patientId: PATIENT_B, priorityLevel: "high" },
	});
	report(
		"КОНТРОЛЬ POST /api/waitlist с patientId клиники Б",
		control2.statusCode < 300,
		`статус ${control2.statusCode}, тело ${control2.body.slice(0, 160)}`,
	);

	const control3 = await app.inject({
		method: "POST",
		url: "/api/waitlist",
		headers: h,
		payload: {
			patientId: PATIENT_A,
			preferredDoctorId: DOCTOR_B,
			priorityLevel: "high",
		},
	});
	report(
		"КОНТРОЛЬ POST /api/waitlist с preferredDoctorId клиники Б",
		control3.statusCode < 300,
		`статус ${control3.statusCode}, тело ${control3.body.slice(0, 160)}`,
	);

	const created = await app.inject({
		method: "POST",
		url: "/api/waitlist",
		headers: h,
		payload: { patientId: PATIENT_A, priorityLevel: "medium" },
	});
	if (created.statusCode >= 300) {
		console.log(
			`посев своей записи не удался: ${created.statusCode} ${created.body.slice(0, 200)}`,
		);
	} else {
		const entryId = JSON.parse(created.body).id as string;
		const put = await app.inject({
			method: "PUT",
			url: `/api/waitlist/${entryId}`,
			headers: h,
			payload: { preferredDoctorId: DOCTOR_B },
		});
		console.log(
			`         PUT /api/waitlist/<своя запись> с чужим врачом -> статус ${put.statusCode}`,
		);

		const list = await app.inject({
			method: "GET",
			url: "/api/waitlist",
			headers: h,
		});
		const leakedName = list.body.includes(FOREIGN_DOCTOR_NAME);
		report(
			"GET /api/waitlist после PUT с preferredDoctorId клиники Б",
			leakedName,
			`статус ${list.statusCode}; ФИО врача клиники Б в ответе: ${leakedName ? "ДА" : "нет"}\n         тело: ${list.body.slice(0, 500)}`,
		);

		const [row] = await db
			.select({ doc: appointmentWaitlists.preferredDoctorId })
			.from(appointmentWaitlists)
			.where(
				and(
					eq(appointmentWaitlists.id, entryId),
					eq(appointmentWaitlists.organizationId, ORG_A),
				),
			);
		console.log(
			`         база: строка клиники А ссылается на preferred_doctor_id=${row?.doc} (врач Б = ${DOCTOR_B})`,
		);
	}

	const lab = await app.inject({
		method: "GET",
		url: `/api/clinical/lab-orders?patientId=${PATIENT_B}`,
		headers: h,
	});
	report(
		"GET /api/clinical/lab-orders?patientId=<пациент Б>",
		lab.body.includes(FOREIGN_PATIENT_NAME),
		`статус ${lab.statusCode}, тело ${lab.body.slice(0, 200)}`,
	);

	await app.close();
	console.log(`\nИТОГО подтверждённых утечек: ${leaks}`);
}

try {
	await main();
} finally {
	await cleanup();
	await pool.end();
}
