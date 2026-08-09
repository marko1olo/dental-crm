import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Медицинский анамнез и согласия обязаны начинаться пустыми.
 *
 * В начальном состоянии хранилища документов лежали готовые ответы за
 * пациента, которого никто не опрашивал:
 *  - «Аллергии и нежелательные реакции со слов пациента не отмечены.»
 *  - «Постоянные препараты со слов пациента не принимает.»
 *  - «Хронические заболевания со слов пациента отрицает.»
 *  - «Антикоагулянты … не принимает.», «Инфекционные риски … не заявлены.»
 *  - в журнале анестезии — препарат «Артикаин 4%», вазоконстриктор «1:100000»,
 *    доза «1.7» мл и реакция «Без особенностей», выставленная до инъекции;
 *  - в согласии на фото и видео заранее отмечены три категории материалов;
 *  - «не разрешаю сообщать медицинские сведения третьим лицам» — за пациента
 *    решено, кому клиника вправе отвечать.
 *
 * Врач мог ни разу не открыть анкету: документ уходил на подпись заполненным.
 * Подписанная анкета — доказательство, что пациента опросили, и при настоящей
 * аллергии заранее вписанное отрицание опаснее пустого поля.
 *
 * Формулировки не выброшены: их вставляет кнопка «Со слов пациента — нет» в
 * components/documents/AnamnesisField.tsx, то есть врач, а не хранилище.
 *
 * Проверка читает исходник хранилища: значение по умолчанию задаётся там, и
 * статически поймать его надёжнее, чем поднимая браузер.
 */
const here = dirname(fileURLToPath(import.meta.url));
const documentStore = readFileSync(
	join(here, "..", "store", "documentStore.ts"),
	"utf8",
);

/** Начальное значение поля в объекте хранилища. */
function initialValueOf(field: string): string | null {
	const match = new RegExp(
		`^\\s+${field}\\s*:\\s*(".*?"|'.*?'|\\[.*?\\]|[^,\\n]+),`,
		"m",
	).exec(documentStore);
	if (!match) return null;
	const val = match[1];
	return val ? val.trim() : null;
}

/**
 * Поля, которые обязаны быть пустыми, и почему заполнять их за врача нельзя.
 *
 * Юридический шаблон сюда не входит намеренно: риски, альтернативы, порядок
 * отзыва согласия и рекомендации после приёма одинаковы для всех пациентов и
 * ничего о конкретном человеке не утверждают.
 */
const mustStartEmpty: Array<[field: string, why: string]> = [
	["intakeAllergyStatus", "аллергоанамнез"],
	["intakeCurrentMedications", "постоянные препараты"],
	["intakeChronicConditions", "хронические заболевания"],
	["intakeAnticoagulants", "антикоагулянты"],
	["intakeInfectiousRiskNotes", "инфекционные риски"],
	["anesthesiaMethod", "метод анестезии"],
	["anesthesiaAnesthetic", "препарат анестезии"],
	["anesthesiaVasoconstrictor", "вазоконстриктор"],
	["anesthesiaAllergyStatus", "аллергия на анестетики"],
	["anesthesiaDoseTime", "время введения"],
	["anesthesiaDoseMl", "доза в миллилитрах"],
	["anesthesiaReaction", "реакция на введение"],
	["informedConsentIntervention", "название вмешательства в согласии"],
	["informedConsentTrustedContact", "кому разрешено сообщать сведения"],
	["procedureConsentProcedureName", "название процедуры в согласии"],
	["procedureConsentPatientRiskFactors", "персональные факторы риска"],
];

describe("анамнез и согласия начинаются пустыми", () => {
	for (const [field, why] of mustStartEmpty) {
		it(`${why} не заполнен за пациента`, () => {
			const value = initialValueOf(field);
			assert.notEqual(
				value,
				null,
				`поле ${field} не найдено в хранилище — проверку надо обновить`,
			);
			assert.equal(
				value,
				'""',
				`${why}: значение по умолчанию должно быть пустым, а не ${value}`,
			);
		});
	}

	it("ни одна категория материалов в согласии на фото и видео не отмечена заранее", () => {
		assert.equal(initialValueOf("photoVideoMaterials"), "[]");
	});

	it("кнопка быстрой вставки существует и вписывает текст сама", () => {
		const field = readFileSync(
			join(here, "..", "components", "documents", "AnamnesisField.tsx"),
			"utf8",
		);
		assert.match(
			field,
			/denialText/,
			"поле анамнеза потеряло текст отрицательного ответа",
		);
		assert.match(
			field,
			/Со слов пациента — нет/,
			"поле анамнеза потеряло подпись кнопки по умолчанию",
		);
	});
});
