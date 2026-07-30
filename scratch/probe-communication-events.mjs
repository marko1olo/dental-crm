/**
 * Read-only probe. Measures what actually lies in communication_events before the
 * patient card is switched onto it, plus the dead table it was reading.
 * No writes, no DDL.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL not found in .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
console.log("db =", (await client.query("select current_database() d")).rows[0].d);

const total = await client.query("select count(*)::int n from communication_events");
console.log("communication_events total =", total.rows[0].n);

const byChannel = await client.query(
	"select channel, direction, status, count(*)::int n from communication_events group by 1,2,3 order by n desc",
);
console.log("by channel/direction/status:");
for (const r of byChannel.rows) console.log("  ", r.channel, r.direction, r.status, "->", r.n);

const dead = await client.query("select count(*)::int n from patient_communication_timelines");
console.log("patient_communication_timelines total =", dead.rows[0].n);

const orgs = await client.query(
	"select organization_id, count(*)::int n from communication_events group by 1 order by n desc",
);
console.log("by organization:");
for (const r of orgs.rows) console.log("  ", r.organization_id, "->", r.n);

const topPatients = await client.query(
	`select ce.organization_id, ce.patient_id, p.full_name, count(*)::int n
	   from communication_events ce
	   left join patients p on p.id = ce.patient_id
	  group by 1,2,3 order by n desc limit 5`,
);
console.log("top patients:");
for (const r of topPatients.rows)
	console.log("  ", r.organization_id, r.patient_id, r.full_name, "->", r.n);

const actors = await client.query(
	"select count(*)::int n from communication_events where actor_user_id is not null",
);
console.log("events with actor_user_id =", actors.rows[0].n);

await client.end();
