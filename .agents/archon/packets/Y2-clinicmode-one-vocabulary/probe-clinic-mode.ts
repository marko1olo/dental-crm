/**
 * probe-clinic-mode.ts — ЧТЕНИЕ БЕЗ ЗАПИСИ. Никаких UPDATE/INSERT/DDL.
 *
 * Отвечает на четыре вопроса, на которые пакет Y2 обязан ответить измерением, а
 * не рассуждением:
 *   1. что реально лежит в organizations.clinic_mode сейчас;
 *   2. каково умолчание колонки и есть ли на ней ограничение;
 *   3. по каким данным можно отличить одну клинику от другой (сколько у неё
 *      филиалов, кресел, врачей, сотрудников) — от этого зависит правило
 *      миграции;
 *   4. что правило миграции выдаст на каждой существующей строке.
 *
 * Запуск: node --import tsx .agents/archon/packets/Y2-clinicmode-one-vocabulary/probe-clinic-mode.ts
 */
import pg from "pg";
import { loadAdditionalServerEnv } from "../../../../apps/api/src/env/loadServerEnv.js";

loadAdditionalServerEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error("DATABASE_URL не задан — читать нечего.");
	process.exit(2);
}

const pool = new pg.Pool({ connectionString });

async function main() {
	const distribution = await pool.query<{
		clinic_mode: string;
		organizations: string;
	}>(
		"SELECT clinic_mode, count(*)::text AS organizations FROM organizations GROUP BY clinic_mode ORDER BY clinic_mode",
	);
	console.log("=== 1. РАСПРЕДЕЛЕНИЕ clinic_mode СЕЙЧАС ===");
	for (const row of distribution.rows)
		console.log(`  ${row.clinic_mode} -> ${row.organizations} орг.`);

	const column = await pool.query<{
		column_default: string | null;
		is_nullable: string;
		data_type: string;
	}>(
		`SELECT column_default, is_nullable, data_type
		   FROM information_schema.columns
		  WHERE table_name = 'organizations' AND column_name = 'clinic_mode'`,
	);
	console.log("=== 2. КОЛОНКА ===");
	console.log(JSON.stringify(column.rows[0] ?? null));

	const constraints = await pool.query<{ conname: string; definition: string }>(
		`SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
		   FROM pg_constraint c
		   JOIN pg_class t ON t.oid = c.conrelid
		  WHERE t.relname = 'organizations' AND c.contype = 'c'
		  ORDER BY c.conname`,
	);
	console.log("=== 2b. CHECK-ОГРАНИЧЕНИЯ НА organizations ===");
	if (constraints.rows.length === 0) console.log("  (нет ни одного)");
	for (const row of constraints.rows)
		console.log(`  ${row.conname}: ${row.definition}`);

	const shape = await pool.query<{
		id: string;
		name: string;
		clinic_mode: string;
		clinics: string;
		chairs: string;
		clinic_chairs: string;
		doctors: string;
		staff: string;
	}>(
		`SELECT o.id::text,
		        o.name,
		        o.clinic_mode,
		        (SELECT count(*) FROM clinics c WHERE c.organization_id = o.id)::text AS clinics,
		        (SELECT count(*) FROM chairs ch WHERE ch.organization_id = o.id)::text AS chairs,
		        (SELECT count(*) FROM clinic_chairs cc WHERE cc.organization_id = o.id)::text AS clinic_chairs,
		        (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'doctor' AND u.is_active)::text AS doctors,
		        (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.is_active)::text AS staff
		   FROM organizations o
		  ORDER BY o.created_at`,
	);
	console.log("=== 3. ЧЕМ КЛИНИКИ ОТЛИЧАЮТСЯ ДРУГ ОТ ДРУГА ===");
	for (const row of shape.rows) {
		console.log(
			`  ${row.id} «${row.name}» mode=${row.clinic_mode} филиалов=${row.clinics} кресел=${row.chairs} (clinic_chairs=${row.clinic_chairs}) врачей=${row.doctors} сотрудников=${row.staff}`,
		);
	}

	/*
	 * 4. Ровно то же выражение, что стоит в миграции. Считается здесь SELECT-ом,
	 * чтобы результат миграции был известен ДО её применения.
	 */
	const preview = await pool.query<{
		id: string;
		name: string;
		clinic_mode: string;
		new_mode: string;
	}>(
		`WITH shape AS (
		   SELECT o.id,
		          o.name,
		          o.clinic_mode,
		          (SELECT count(*) FROM clinics c WHERE c.organization_id = o.id) AS clinic_count,
		          (SELECT count(*) FROM chairs ch WHERE ch.organization_id = o.id AND ch.is_active) AS chair_count,
		          (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.is_active AND u.role = 'doctor') AS doctor_count
		     FROM organizations o
		 )
		 SELECT id::text,
		        name,
		        clinic_mode,
		        CASE
		          WHEN clinic_mode IN ('solo_doctor','one_chair','small_clinic','network_clinic') THEN clinic_mode
		          WHEN clinic_count > 1 THEN 'network_clinic'
		          WHEN chair_count > 1 OR doctor_count > 1 THEN 'small_clinic'
		          ELSE 'one_chair'
		        END AS new_mode
		   FROM shape
		  ORDER BY name`,
	);
	console.log("=== 4. ЧТО ВЫДАСТ ПРАВИЛО МИГРАЦИИ ===");
	for (const row of preview.rows) {
		console.log(`  «${row.name}»: ${row.clinic_mode} -> ${row.new_mode}`);
	}

	const outside = await pool.query<{ outside: string }>(
		`SELECT count(*)::text AS outside
		   FROM organizations
		  WHERE clinic_mode NOT IN ('solo_doctor','one_chair','small_clinic','network_clinic')`,
	);
	console.log("=== 5. СТРОК ВНЕ ПЕРЕЧИСЛЕНИЯ ===");
	console.log(`  ${outside.rows[0]?.outside ?? "?"}`);
}

main()
	.then(() => pool.end())
	.catch(async (error) => {
		console.error(
			"ОШИБКА:",
			error instanceof Error ? error.message : String(error),
		);
		await pool.end();
		process.exit(1);
	});
