/**
 * Живая проверка: врач видит настоящий снимок, а не рисунок.
 *
 * previewUrl и viewerUrl для любого исследования равнялись адресу preview.svg,
 * который рисует бирюзовый градиент с контуром челюсти. Настоящий файл лежит в
 * storagePath и в ссылку не попадал. Разбор ИИ при этом читает файл с диска:
 * снимок видела модель, но не врач.
 *
 * Скрипт кладёт настоящий PNG на диск, привязывает его к исследованию, читает
 * дашборд и убеждается, что ссылка ведёт на файл и отдаёт те же байты. Всё
 * созданное удаляет.
 */
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

async function req(path, init = {}, attempts = 14) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2500));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());
const H = {
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

/** Однопиксельный PNG: настоящий файл, который браузер обязан показать. */
const PNG_BYTES = Buffer.from(
	"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000002000154a24f5d0000000049454e44ae426082",
	"hex",
);

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const folder = mkdtempSync(join(tmpdir(), "dente-imaging-"));
const filePath = join(folder, "проверка-снимка.png");
writeFileSync(filePath, PNG_BYTES);

let studyId = null;
let previousPath = null;

try {
	const row = await client.query(
		`select id, storage_path from imaging_studies order by captured_at desc limit 1`,
	);
	studyId = row.rows[0]?.id ?? null;
	previousPath = row.rows[0]?.storage_path ?? null;
	check("в базе есть исследование для проверки", Boolean(studyId), String(studyId));
	if (!studyId) throw new Error("нет исследований");

	await client.query(`update imaging_studies set storage_path = $1 where id = $2`, [filePath, studyId]);

	const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const study = (dash.imagingStudies ?? []).find((item) => item.id === studyId);
	check("исследование пришло в выдачу", Boolean(study), study?.title);
	check(
		"ссылка ведёт на файл, а не на рисунок",
		typeof study?.previewUrl === "string" && study.previewUrl.endsWith("/file"),
		String(study?.previewUrl),
	);
	check(
		"просмотрщик тоже ведёт на файл",
		typeof study?.viewerUrl === "string" && study.viewerUrl.endsWith("/file"),
		String(study?.viewerUrl),
	);

	const fileResponse = await req(`/api/imaging/studies/${studyId}/file`, { headers: H });
	check("файл отдаётся", fileResponse.status === 200, `код ${fileResponse.status}`);
	check(
		"тип содержимого — изображение, а не svg",
		(fileResponse.headers.get("content-type") ?? "").startsWith("image/png"),
		fileResponse.headers.get("content-type") ?? "",
	);
	const received = Buffer.from(await fileResponse.arrayBuffer());
	check(
		"отданы те же байты, что лежат на диске",
		received.equals(PNG_BYTES),
		`получено ${received.length} байт из ${PNG_BYTES.length}`,
	);

	// DICOM браузер не покажет: для него должна остаться заглушка.
	await client.query(`update imaging_studies set storage_path = $1 where id = $2`, [
		join(folder, "series.dcm"),
		studyId,
	]);
	const dashDicom = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const dicomStudy = (dashDicom.imagingStudies ?? []).find((item) => item.id === studyId);
	check(
		"для DICOM ссылка остаётся на заглушку",
		typeof dicomStudy?.previewUrl === "string" && dicomStudy.previewUrl.endsWith("preview.svg"),
		String(dicomStudy?.previewUrl),
	);
	const dicomFile = await req(`/api/imaging/studies/${studyId}/file`, { headers: H });
	check(
		"попытка взять DICOM файлом даёт объяснимый отказ",
		dicomFile.status === 415,
		`код ${dicomFile.status}`,
	);

	// Исследование без файла.
	await client.query(`update imaging_studies set storage_path = null where id = $1`, [studyId]);
	const emptyFile = await req(`/api/imaging/studies/${studyId}/file`, { headers: H });
	check("без файла отвечаем 404, а не пустотой", emptyFile.status === 404, `код ${emptyFile.status}`);
} finally {
	if (studyId) {
		await client
			.query(`update imaging_studies set storage_path = $1 where id = $2`, [previousPath, studyId])
			.catch(() => {});
	}
	try {
		unlinkSync(filePath);
	} catch {
		/* файл мог быть уже удалён */
	}
	await client.end().catch(() => {});
	console.log("\nисходный путь исследования возвращён");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
