import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("аудит монтирования плашки сохранения в кодовой базе", () => {
	test("экран монтирует плашку в оба места и не держит своей копии правила", () => {
		const rawSource =
			readFileSync(join(here, "..", "..", "..", "PatientsView.tsx"), "utf8") +
			"\n" +
			readFileSync(join(here, "..", "PatientDetailsPanel.tsx"), "utf8");
		const source = stripComments(rawSource);
		const mounts = source.match(/<PatientCardSavePill/g) ?? [];
		assert.equal(mounts.length, 2, `найдено ${mounts.length}`);
		const guarded = source.match(/hasSelectedPatient=\{Boolean\(selectedPatient\)\}/g) ?? [];
		assert.equal(guarded.length, 2, "обе плашки обязаны получать факт выбранного пациента");
		assert.ok(!source.includes("status-pill"));

		for (const word of ["Сохранено", "Не сохранено", "Заполнено", "save-pill"]) {
			assert.ok(!source.includes(word), `в разметку экрана вернулось слово «${word}»`);
		}
	});
});
