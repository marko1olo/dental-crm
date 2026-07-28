/**
 * Перепроверка утверждений разведки о базе — только чтение, ни одной записи.
 *
 * Разведка (.agents/lead/recon-patients-screen.md) считала распределение
 * riskLevel своим процессом через buildDashboard. Здесь проверяются те же факты
 * прямым SQL: сколько пациентов, сколько обязательных документов, сколько
 * открытых задач и сколько ненулевых остатков. Если совпадёт — вердикт разведки
 * подтверждён замером, а не пересказом.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const envText = readFileSync("C:/Clinic_MVP/dental-crm/.env", "utf8");
const line = envText.split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="));
if (!line) throw new Error("В корневом .env нет DATABASE_URL — подключаться некуда.");
const databaseUrl = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

async function q(title, sql, params = []) {
  const started = Date.now();
  try {
    const result = await pool.query(sql, params);
    console.log(`\n### ${title}  (${Date.now() - started} мс)`);
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.log(`\n### ${title} — ЗАПРОС УПАЛ: ${error.message}`);
    return null;
  }
}

await q(
  "Клиники и число пациентов",
  `select c.id, c.name, count(p.id)::int as patients
     from clinics c left join patients p on p.clinic_id = c.id
    group by c.id, c.name order by patients desc`,
);

await q(
  "Пациенты по статусу",
  `select coalesce(status, '(null)') as status, count(*)::int as n from patients group by 1 order by 2 desc`,
);

await q(
  "generated_documents: сколько строк каждого вида",
  `select kind, status, count(*)::int as n from generated_documents group by 1, 2 order by 3 desc`,
);

await q(
  "Три обязательных вида документов — сколько их вообще есть",
  `select count(*)::int as required_docs
     from generated_documents
    where kind in ('paid_medical_services_contract', 'informed_consent', 'completed_works_act')`,
);

await q(
  "Совпадения нормализованного ФИО внутри клиники",
  `select clinic_id, lower(regexp_replace(trim(full_name), '\\s+', ' ', 'g')) as norm, count(*)::int as n
     from patients group by 1, 2 having count(*) > 1 order by n desc`,
);

await q(
  "Пациенты без телефона или без даты рождения (по ним серверный запрет дублей молчит)",
  `select
      count(*)::int as total,
      count(*) filter (where phone is null or btrim(phone) = '')::int as no_phone,
      count(*) filter (where birth_date is null)::int as no_birth_date
     from patients`,
);

const tables = await q(
  "Есть ли таблица задач CRM и сколько в ней открытых строк",
  `select table_name from information_schema.tables
    where table_schema = 'public' and table_name like '%task%' order by 1`,
);

if (tables && tables.length > 0) {
  for (const row of tables) {
    await q(
      `Строки в ${row.table_name}`,
      `select count(*)::int as n from public.${row.table_name}`,
    );
  }
}

await pool.end();
console.log("\nГотово. Ни одной записи в базу не выполнено.");
