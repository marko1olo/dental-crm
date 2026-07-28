/**
 * ЗАМЕР для разведки экрана картотеки, часть 2: может ли поле быстрого создания
 * завести второго пациента с тем же ФИО, и есть ли такие пары в живой базе.
 *
 * Проверяется ровно тот предикат, что стоит на сервере:
 * apps/api/src/routes/patients.ts:119 — (одно имя И одна дата рождения) ИЛИ
 * (одно имя И один телефон). Имя нормализуется как в строке 92-94.
 *
 * ЗАПУСК (cwd apps/api — оттуда загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx ../../scratch/recon-patients-duplicates-proof.ts
 *
 * Только чтение. Ни одной записи в базу.
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../apps/api/src/db/client.js";

type PatientRow = {
	id: string;
	organizationId: string;
	fullName: string;
	phone: string | null;
	birthDate: string | null;
	status: string;
	createdAt: string;
};

function normalizeName(value: string | null | undefined): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function normalizePhone(value: string | null | undefined): string {
	const digits = (value ?? "").replace(/\D/g, "");
	return digits.length >= 5 ? digits : "";
}

async function main(): Promise<void> {
	const rows = await db.execute(sql`
		select id::text                as "id",
		       organization_id::text   as "organizationId",
		       full_name               as "fullName",
		       phone,
		       birth_date::text        as "birthDate",
		       status,
		       created_at::text        as "createdAt"
		  from patients
		 order by organization_id, created_at
	`);
	const patients = rows.rows as unknown as PatientRow[];
	console.log(`строк в patients: ${patients.length}`);

	const noBirthDate = patients.filter((p) => !(p.birthDate ?? "").trim()).length;
	const noPhone = patients.filter((p) => !normalizePhone(p.phone)).length;
	const neither = patients.filter(
		(p) => !(p.birthDate ?? "").trim() && !normalizePhone(p.phone),
	).length;
	console.log(`без даты рождения: ${noBirthDate}`);
	console.log(`без телефона (>=5 цифр): ${noPhone}`);
	console.log(`без обоих — сервер такого дубля НЕ поймает вовсе: ${neither}`);

	const byName = new Map<string, PatientRow[]>();
	for (const patient of patients) {
		const key = `${patient.organizationId}|${normalizeName(patient.fullName)}`;
		const bucket = byName.get(key);
		if (bucket) bucket.push(patient);
		else byName.set(key, [patient]);
	}
	const collisions = [...byName.values()].filter((bucket) => bucket.length > 1);
	console.log(`\nсовпадений по нормализованному ФИО внутри одной клиники: ${collisions.length}`);
	for (const bucket of collisions) {
		console.log(`\n  «${normalizeName(bucket[0]?.fullName)}» — ${bucket.length} карточки:`);
		for (const patient of bucket) {
			console.log(
				`    id=${patient.id} | как записано: «${patient.fullName}» | телефон=${patient.phone ?? "нет"} | др=${patient.birthDate ?? "нет"} | статус=${patient.status} | создан=${patient.createdAt}`,
			);
		}
		// Сработал бы серверный запрет, если бы вторую карточку заводили сейчас?
		const first = bucket[0];
		for (const patient of bucket.slice(1)) {
			const sameName = normalizeName(patient.fullName) === normalizeName(first?.fullName);
			const sameBirth =
				Boolean((patient.birthDate ?? "").trim()) &&
				(patient.birthDate ?? "") === (first?.birthDate ?? "");
			const samePhone =
				Boolean(normalizePhone(patient.phone)) &&
				normalizePhone(patient.phone) === normalizePhone(first?.phone);
			const blocked = (sameName && sameBirth) || (sameName && samePhone);
			console.log(
				`    -> запрет сервера ${blocked ? "СРАБОТАЛ БЫ (409)" : "НЕ СРАБОТАЛ БЫ — карточка создастся"} (имя=${sameName}, др=${sameBirth}, тел=${samePhone})`,
			);
		}
	}

	// Что уходит с экрана картотеки при быстром создании: только ФИО.
	// Поля телефона и даты рождения в PatientsView.tsx:206-224 скрыты
	// (style display:none) и заполняются лишь из окна разбора диктовки.
	console.log(
		"\nполе быстрого создания отправляет phone=null и birthDate=null, если окно разбора не применяли:",
	);
	console.log(
		"  предикат сервера при пустых др и телефоне: (имя И др) ИЛИ (имя И телефон) = (имя И false) ИЛИ (имя И false) = false",
	);
	console.log("  значит второй пациент с тем же ФИО создаётся без предупреждения");

	const requiredKinds = await db.execute(sql`
		select count(*)::int as n
		  from generated_documents
		 where kind in ('paid_medical_services_contract', 'informed_consent', 'completed_works_act')
	`);
	console.log(
		`\nдокументов трёх обязательных видов во всей базе: ${(requiredKinds.rows[0] as { n: number }).n}`,
	);

	await pool.end();
}

main().catch(async (error) => {
	console.error(error);
	await pool.end().catch(() => undefined);
	process.exitCode = 1;
});
