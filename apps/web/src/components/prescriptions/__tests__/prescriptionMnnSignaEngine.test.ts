/**
 * prescriptionMnnSignaEngine.test.ts — Тесты валидации МНН, латинской Signa,
 * дозировок препаратов (Приказ Минздрава РФ № 1094н) и стоматологических 1-клик пресетов.
 *
 * Инварианты:
 * 1. Приказ Минздрава РФ 1094н: формы № 107-1/у и № 148-1/у-88.
 * 2. Обязательная выписка по МНН (международным непатентованным наименованиям).
 * 3. Латинская пропись: Rp., D.t.d. N, Signa на русском/национальном языке без неопределенных фраз.
 * 4. Артикаин: расчет дозировки по весу и возрасту, запрет детям до 4 лет.
 * 5. 0 эмодзи в медицинских пресетах и формах.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateMedicationDosage,
	calculatePrescriptionExpiration,
	DENTAL_STATUTORY_MNN_CATALOG,
	formatPatientPrescriptionMemo,
	validateDentalMnn,
	validateLatinRxSigna,
	validatePrescriptionDosage,
} from "../generator/prescriptionEngine.js";
import {
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
	DENTAL_MEDICATIONS_CATALOG,
} from "../generator/prescriptionPresets.js";

describe("Приказ Минздрава 1094н: Валидация МНН стоматологических препаратов", () => {
	it("1.1 Каталог МНН содержит обязательные стоматологические препараты", () => {
		const mnnKeys = Object.keys(DENTAL_STATUTORY_MNN_CATALOG);
		assert.ok(mnnKeys.includes("amoxicillin"), "Должен содержать амоксициллин");
		assert.ok(mnnKeys.includes("amoxicillin_clavulanate"), "Должен содержать амоксициллин+клавуланат");
		assert.ok(mnnKeys.includes("ibuprofen"), "Должен содержать ибупрофен");
		assert.ok(mnnKeys.includes("chlorhexidine"), "Должен содержать хлоргексидин");
		assert.ok(mnnKeys.includes("articaine"), "Должен содержать артикаин");
		assert.ok(mnnKeys.includes("nimesulide"), "Должен содержать нимесулид");
		assert.ok(mnnKeys.includes("ketorolac"), "Должен содержать кеторолак");
		assert.ok(mnnKeys.includes("chloropyramine"), "Должен содержать хлоропирамин");
	});

	it("1.2 Корректно валидирует русские и латинские наименования МНН", () => {
		// Амоксициллин
		const resRu = validateDentalMnn("Амоксициллин");
		assert.strictEqual(resRu.isValid, true);
		assert.strictEqual(resRu.matchedMnn?.key, "amoxicillin");

		const resLat = validateDentalMnn("Amoxicillinum");
		assert.strictEqual(resLat.isValid, true);
		assert.strictEqual(resLat.matchedMnn?.key, "amoxicillin");

		// Артикаин
		const resArt = validateDentalMnn("Артикаин");
		assert.strictEqual(resArt.isValid, true);
		assert.strictEqual(resArt.matchedMnn?.key, "articaine");

		// Ибупрофен
		const resIbu = validateDentalMnn("Ибупрофен");
		assert.strictEqual(resIbu.isValid, true);
		assert.strictEqual(resIbu.matchedMnn?.key, "ibuprofen");

		// Хлоргексидин
		const resChx = validateDentalMnn("Хлоргексидин");
		assert.strictEqual(resChx.isValid, true);
		assert.strictEqual(resChx.matchedMnn?.key, "chlorhexidine");
	});

	it("1.3 Для торговых названий (Ультракаин, Нурофен, Аугментин) предлагает МНН", () => {
		const resAugmentin = validateDentalMnn("Аугментин");
		assert.strictEqual(resAugmentin.isValid, true);
		assert.strictEqual(resAugmentin.matchedMnn?.key, "amoxicillin_clavulanate");
		assert.strictEqual(resAugmentin.isTradeName, true);

		const resUltracain = validateDentalMnn("Ультракаин");
		assert.strictEqual(resUltracain.isValid, true);
		assert.strictEqual(resUltracain.matchedMnn?.key, "articaine");
		assert.strictEqual(resUltracain.isTradeName, true);

		const resNurofen = validateDentalMnn("Нурофен");
		assert.strictEqual(resNurofen.isValid, true);
		assert.strictEqual(resNurofen.matchedMnn?.key, "ibuprofen");
		assert.strictEqual(resNurofen.isTradeName, true);
	});

	it("1.4 Для неизвестных препаратов выставляет isValid=false и предупреждает о Приказе 1094н", () => {
		const resUnknown = validateDentalMnn("НеизвестныйЭкспериментальныйПрепарат");
		assert.strictEqual(resUnknown.isValid, false);
		assert.strictEqual(resUnknown.matchedMnn, undefined);
		assert.ok(
			resUnknown.warning?.includes("1094н"),
			"Предупреждение должно ссылаться на Приказ 1094н",
		);
	});
});

describe("Приказ Минздрава 1094н: Латинская пропись (Rp., D.t.d., Signa)", () => {
	it("2.1 Одобряет корректную латинскую пропись по стандартам 1094н", () => {
		const res = validateLatinRxSigna({
			latinName: "Rp.: Amoxicillini 0,5",
			dispenseFormula: "D.t.d. N. 20 in tabulettis",
			signaRu: "Принимать внутрь по 1 таблетке 3 раза в день после еды в течение 7 дней",
		});

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.errors.length, 0);
	});

	it("2.2 Требует обязательный префикс Rp.: в начале рецептурной строки", () => {
		const resNoRp = validateLatinRxSigna({
			latinName: "Amoxicillini 0,5",
			dispenseFormula: "D.t.d. N. 20 in tabulettis",
			signaRu: "По 1 таблетке 3 раза в день",
		});

		assert.strictEqual(resNoRp.isValid, false);
		assert.ok(
			resNoRp.errors.some((e) => e.includes("Rp.:")),
			"Должна быть ошибка об отсутствии префикса Rp.:",
		);
	});

	it("2.3 Требует указания указания на отпуск D.t.d.", () => {
		const resNoDtd = validateLatinRxSigna({
			latinName: "Rp.: Ibuprofeni 0,4",
			dispenseFormula: "N. 20",
			signaRu: "По 1 таблетке при болях",
		});

		assert.strictEqual(resNoDtd.isValid, false);
		assert.ok(
			resNoDtd.errors.some((e) => e.includes("D.t.d.")),
			"Должна быть ошибка об отсутствии D.t.d.",
		);
	});

	it("2.4 Категорически запрещает неопределенные формулировки способа применения (1094н)", () => {
		const vagueSignas = [
			"По назначению врача",
			"Употреблять по указанию",
			"По схеме",
			"Известно",
			"Внутрь как обычно",
		];

		for (const vague of vagueSignas) {
			const res = validateLatinRxSigna({
				latinName: "Rp.: Amoxicillini 0,5",
				dispenseFormula: "D.t.d. N. 20 in tabulettis",
				signaRu: vague,
			});

			assert.strictEqual(
				res.isValid,
				false,
				`Должна быть отклонена расплывчатая инструкция: '${vague}'`,
			);
			assert.ok(
				res.errors.some((e) => e.includes("1094н") || e.includes("неопределенные")),
				"Ошибка должна указывать на нарушение Приказа 1094н",
			);
		}
	});
});

describe("Дозировки и расчет анестетиков (Артикаин) по возрасту и весу", () => {
	it("3.1 Рассчитывает дозировку артикаина для взрослого (7 мг/кг, макс 7 карпул)", () => {
		const calc = calculateMedicationDosage("articaine", 70, 35);
		assert.strictEqual(calc.isContraindicated, false);
		assert.strictEqual(calc.singleDoseMg, 68); // 1 карпула 1.7 мл 4% = 68 мг
		assert.strictEqual(calc.maxDailyDoseMg, 490); // 70 кг * 7 мг/кг = 490 мг
		assert.strictEqual(calc.maxCarpules, 7);
	});

	it("3.2 Запрещает артикаин детям младше 4 лет (абсолютное противопоказание)", () => {
		const calc = calculateMedicationDosage("articaine", 14, 3);
		assert.strictEqual(calc.isContraindicated, true);
		assert.strictEqual(calc.maxCarpules, 0);
		assert.ok(
			calc.contraindicationReason?.includes("до 4 лет"),
			"Должна быть причина: противопоказан детям до 4 лет",
		);

		// Валидатор рецепта также должен выдать ошибку
		const valRes = validatePrescriptionDosage({
			medicationKey: "articaine",
			patientAgeYears: 3,
			patientWeightKg: 14,
			prescribedDoseMg: 68,
		});
		assert.strictEqual(valRes.isValid, false);
		assert.ok(valRes.errors.some((e) => e.includes("противопоказан детям до 4 лет")));
	});

	it("3.3 Ограничивает дозировку артикаина детям от 4 лет (до 5 мг/кг)", () => {
		const calc = calculateMedicationDosage("articaine", 20, 6);
		assert.strictEqual(calc.isContraindicated, false);
		assert.strictEqual(calc.maxDailyDoseMg, 100); // 20 кг * 5 мг/кг = 100 мг
		assert.strictEqual(calc.maxCarpules, 1); // 100 мг / 68 мг = 1.47 -> 1 карпула

		const valExceeded = validatePrescriptionDosage({
			medicationKey: "articaine",
			patientAgeYears: 6,
			patientWeightKg: 20,
			prescribedDoseMg: 150, // превышает 100 мг
		});
		assert.strictEqual(valExceeded.isValid, false);
		assert.ok(valExceeded.errors.some((e) => e.includes("превышает максимально допустимую")));
	});

	it("3.4 Проверяет дозировки амоксициллина и ибупрофена для взрослых", () => {
		const valAmoxOk = validatePrescriptionDosage({
			medicationKey: "amoxicillin",
			patientAgeYears: 30,
			prescribedDoseMg: 500,
		});
		assert.strictEqual(valAmoxOk.isValid, true);

		const valAmoxExceeded = validatePrescriptionDosage({
			medicationKey: "amoxicillin",
			patientAgeYears: 30,
			prescribedDoseMg: 2000, // разово 2000 мг — перебор
		});
		assert.strictEqual(valAmoxExceeded.isValid, false);
	});
});

describe("Стоматологические 1-клик пресеты рецептов (Пульпит, Альвеолит, Удаление)", () => {
	it("4.1 Пресеты содержат пакеты pulpitis, alveolitis, post_tooth_extraction", () => {
		const pkgKeys = DENTAL_FAST_PRESCRIPTION_PACKAGES.map((p) => p.id);
		assert.ok(pkgKeys.includes("pulpitis_acute_relief"), "Должен быть пресет острого пульпита");
		assert.ok(pkgKeys.includes("alveolitis_dry_socket"), "Должен быть пресет альвеолита (сухой лунки)");
		assert.ok(pkgKeys.includes("post_tooth_extraction"), "Должен быть пресет после удаления зуба");
	});

	it("4.2 Все препараты в пресетах соответствуют МНН из каталога", () => {
		const catalogKeys = DENTAL_MEDICATIONS_CATALOG.map((m) => m.id);

		for (const pkg of DENTAL_FAST_PRESCRIPTION_PACKAGES) {
			assert.ok(pkg.medicationIds.length > 0, `Пакет ${pkg.id} не должен быть пустым`);
			for (const medId of pkg.medicationIds) {
				assert.ok(
					catalogKeys.includes(medId),
					`Препарат ${medId} из пакета ${pkg.id} обязан присутствовать в DENTAL_MEDICATIONS_CATALOG`,
				);
			}
		}
	});

	it("4.3 Все препараты каталога имеют корректную латинскую сигнатуру Rp. и D.t.d.", () => {
		for (const med of DENTAL_MEDICATIONS_CATALOG) {
			assert.ok(
				med.latinName.startsWith("Rp.:"),
				`Препарат ${med.nameRu} обязан начинаться с Rp.: (фактически: ${med.latinName})`,
			);
			assert.ok(
				med.dispenseFormula.includes("D.t.d."),
				`Препарат ${med.nameRu} обязан содержать D.t.d. (фактически: ${med.dispenseFormula})`,
			);
			assert.ok(
				med.signaRu.length > 10,
				`Препарат ${med.nameRu} обязан иметь подробную Signa (фактически: ${med.signaRu})`,
			);
		}
	});

	it("4.4 Мандат 8d п. 7: Категорически 0 эмодзи во всех пресетах и пакетах", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const med of DENTAL_MEDICATIONS_CATALOG) {
			assert.strictEqual(
				emojiRegex.test(med.nameRu),
				false,
				`Эмодзи в nameRu: ${med.nameRu}`,
			);
			assert.strictEqual(
				emojiRegex.test(med.signaRu),
				false,
				`Эмодзи в signaRu: ${med.signaRu}`,
			);
		}

		for (const pkg of DENTAL_FAST_PRESCRIPTION_PACKAGES) {
			assert.strictEqual(
				emojiRegex.test(pkg.titleRu),
				false,
				`Эмодзи в titleRu: ${pkg.titleRu}`,
			);
			assert.strictEqual(
				emojiRegex.test(pkg.descriptionRu),
				false,
				`Эмодзи в descriptionRu: ${pkg.descriptionRu}`,
			);
		}
	});

	it("4.5 Форматирование памятки пациенту для мессенджеров без фальшивых данных", () => {
		const memo = formatPatientPrescriptionMemo({
			clinicName: "Стоматологический Центр «ДЕНТЕ»",
			clinicPhone: "+7 (495) 789-01-23",
			doctorFullName: "Смирнов Алексей Андреевич",
			patientFullName: "Соколова Екатерина Дмитриевна",
			prescriptionDate: "2026-09-25",
			medications: [
				{
					id: "amox-500",
					nameRu: "Амоксициллин 500 мг",
					signaRu: "S.: Внутрь по 1 капсуле 3 раза в день 7 дней",
				},
				{
					id: "ibu-400",
					nameRu: "Ибупрофен 400 мг",
					signaRu: "S.: По 1 таблетке при болях после еды",
				},
			],
		});

		assert.ok(memo.includes("ДЕНТЕ"));
		assert.ok(memo.includes("Соколова Екатерина Дмитриевна"));
		assert.ok(memo.includes("Амоксициллин 500 мг"));
		assert.ok(memo.includes("Ибупрофен 400 мг"));
		assert.ok(memo.includes("Приказ Минздрава 1094н"));
		assert.strictEqual(
			/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(memo),
			false,
			"В памятке пациенту не должно быть эмодзи",
		);
	});
});
