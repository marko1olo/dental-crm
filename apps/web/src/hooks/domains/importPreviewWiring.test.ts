import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * ПРЕДПРОСМОТР ИМПОРТА: КНОПКА БЫЛА ОТВЯЗАНА ОТ ЭКРАНА.
 *
 * Голый хук `previewImport` (useMigrationQueries.ts:114) возвращает Response и
 * НИЧЕГО не пишет в хранилище. Кнопка «Проверить» звала его напрямую как onClick,
 * поэтому ответ выбрасывался, `importPreview` оставалась null навсегда, а ветка
 * рендера `typedImportPreview ? …` (SettingsImportsTab.tsx:6254) не показывалась
 * НИКОГДА — вместе с кнопкой коммита, которая живёт внутри неё.
 *
 * Тест держит две вещи, которые ломаются молча и порознь.
 */

const webSrc = path.resolve(import.meta.dirname, "..", "..");
const appLogicSource = readFileSync(
	path.join(webSrc, "useAppLogic.tsx"),
	"utf8",
);

describe("предпросмотр импорта: раскладка ответа intake", () => {
	/*
	 * ПОВЕДЕНИЕ. Копия раскладки из обёртки useAppLogic.tsx. Проверяется главное
	 * свойство: `preview` берётся из ответа intake, а не отдельным запросом, и
	 * доезжает до сеттера. Тест провалится, если раскладку заменят на присвоение
	 * null — тот самый дефект, который и был.
	 */
	function spreadIntake(
		intake: { preview?: unknown } | null,
		setImportIntake: (v: unknown) => void,
		setImportPreview: (v: unknown) => void,
	) {
		setImportIntake(intake);
		setImportPreview(intake?.preview ?? null);
	}

	it("preview из ответа intake доезжает до setImportPreview", () => {
		const seenIntake: unknown[] = [];
		const seenPreview: unknown[] = [];
		const preview = {
			totalRows: 12,
			readyRows: 9,
			warningRows: 2,
			blockedRows: 1,
			rows: [],
		};

		spreadIntake({ preview }, (v) => seenIntake.push(v), (v) =>
			seenPreview.push(v),
		);

		// Ветка рендера проверяет truthy — поэтому важно именно НЕ null.
		assert.notEqual(
			seenPreview[0],
			null,
			"importPreview осталась null: экран предпросмотра недостижим, кнопка коммита не отрисуется",
		);
		assert.deepEqual(seenPreview[0], preview);
		assert.deepEqual(seenIntake[0], { preview });
	});

	it("intake без preview гасит экран, а не роняет его", () => {
		const seenPreview: unknown[] = [];
		spreadIntake({}, () => {}, (v) => seenPreview.push(v));
		assert.equal(seenPreview[0], null);
	});
});

describe("предпросмотр импорта: обёртка не затирается спредом", () => {
	/*
	 * ПРИВЯЗКА. Обёртки возвращаются из useAppLogic ПОСЛЕ `...migrationQueries`.
	 * Порядок ключей в объектном литерале решает всё: окажись они выше спреда —
	 * голый хук их перезапишет, кнопка снова начнёт выбрасывать ответ, и ни
	 * typecheck, ни тест поведения выше этого не заметят. Поэтому порядок
	 * проверяется по индексам в исходнике.
	 */
	const spreadAt = appLogicSource.indexOf("...migrationQueries,");
	const previewOverrideAt = appLogicSource.indexOf(
		"\n\t\tpreviewImport,\n\t\tcommitImport,",
	);

	it("обёртки объявлены и стоят ниже ...migrationQueries", () => {
		assert.notEqual(spreadAt, -1, "спред ...migrationQueries не найден");
		assert.notEqual(
			previewOverrideAt,
			-1,
			"переопределений previewImport/commitImport нет: кнопка снова висит на голом хуке",
		);
		assert.ok(
			previewOverrideAt > spreadAt,
			"переопределение выше спреда: голый хук перезапишет обёртку, ответ снова будет выброшен",
		);
	});

	it("обёртка пишет оба состояния и разбирает тело после проверки ответа", () => {
		assert.match(
			appLogicSource,
			/setImportPreview\(intake\?\.preview \?\? null\)/,
			"обёртка не кладёт intake.preview в хранилище",
		);
		assert.match(
			appLogicSource,
			/const previewImport = useCallback/,
			"обёртка previewImport не объявлена в useAppLogic",
		);
	});

	it("коммит не уходит в базу без показанного предпросмотра", () => {
		// Медицинские данные: запись разрешена только после предпросмотра.
		assert.match(
			appLogicSource,
			/if \(!rawText \|\| !importPreview\) \{/,
			"проверка наличия предпросмотра перед коммитом снята: импорт снова пишется слепо",
		);
	});
});
