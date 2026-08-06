// READ-ONLY. Set difference between live PostgreSQL tables and Drizzle pgTable
// declarations, both directions.
import { readFileSync } from "node:fs";

const D = "C:/Clinic_MVP/dental-crm/.agents/archon/recon/R1-tab-depth-audit/";

const live = new Set();
{
	const txt = readFileSync(D + "db-rowcounts.txt", "utf8").split(/\r?\n/);
	let sec = "";
	for (const l of txt) {
		if (l.startsWith("--- NON-EMPTY")) {
			sec = "n";
			continue;
		}
		if (l.startsWith("--- EMPTY")) {
			sec = "e";
			continue;
		}
		if (sec === "n" && l.includes("\t")) live.add(l.split("\t")[0]);
		else if (sec === "e" && l.trim()) live.add(l.trim());
	}
}
const declared = new Map();
for (const l of readFileSync(D + "writer-census.txt", "utf8").split(/\r?\n/)) {
	if (!l.includes("\t") || l.startsWith("sql_name")) continue;
	const p = l.split("\t");
	declared.set(p[0], { writers: Number(p[2]), readers: Number(p[3]) });
}
const inLiveNotCode = [...live].filter((t) => !declared.has(t)).sort();
const inCodeNotLive = [...declared.keys()].filter((t) => !live.has(t)).sort();
console.log(
	"LIVE TABLES: " + live.size + "   DRIZZLE-DECLARED: " + declared.size,
);
console.log(
	"\nIN DATABASE BUT NO DRIZZLE DECLARATION (" + inLiveNotCode.length + "):",
);
console.log(inLiveNotCode.join("\n"));
console.log(
	"\nDECLARED IN CODE BUT NOT IN THE DATABASE (" + inCodeNotLive.length + "):",
);
console.log(
	inCodeNotLive
		.map(
			(t) =>
				`${t}  (writers=${declared.get(t).writers}, readers=${declared.get(t).readers})`,
		)
		.join("\n"),
);
