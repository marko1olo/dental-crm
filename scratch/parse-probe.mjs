/**
 * Проверяет, разбирается ли TypeScript-файл тем же esbuild, которым tsx грузит тесты.
 *
 * Нужен, потому что три файла тестов никогда не выполнялись: они падали ещё на
 * разборе, а суммарный отчёт показывал это как обычное падение. Прямой вызов
 * esbuild через CLI у меня не отработал и давал ложное «BROKEN» даже на заведомо
 * целом файле, поэтому здесь используется программный API.
 */
import { readFileSync } from "node:fs";
import { transform } from "esbuild";

const file = process.argv[2];
try {
	await transform(readFileSync(file, "utf8"), { loader: "ts" });
	console.log("PARSES");
	process.exit(0);
} catch (error) {
	const first = error.errors?.[0];
	console.log(
		`BROKEN\t${first ? `${first.location?.line}:${first.location?.column} ${first.text}` : error.message}`,
	);
	process.exit(1);
}
