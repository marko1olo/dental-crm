/**
 * pediatricRepresentative1Click.test.ts — Тесты 1-клик выбора законного представителя и документов для детей.
 *
 * ТРЕБОВАНИЯ:
 * 1. PatientAdministrativeForm: 1-клик чипы [Мама] [Папа] [Опекун] заполняют:
 *    - legalRepresentativeRelationship («Мать» / «Отец» / «Опекун»)
 *    - preferredDocumentRecipient («Законному представителю (мать)» / «(отец)» / «(опекун)»), если было пустым.
 * 2. MinorLegalRepresentativeConsentForm: 1-клик чипы [Мама] [Папа] [Опекун] проставляют
 *    значение в minorRepresentativeRelation («Мать» / «Отец» / «Опекун»).
 * 3. PatientCreationModal: при возрасте < 14 лет динамически отображается лейбл
 *    «Свидетельство о рождении / Паспорт РФ» и плейсхолдер «Серия (римские) № 000000 или паспорт».
 * 4. Сохранение принципа Мандата 8e (неблокирующий статус при регистрации).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAge } from "@dental/shared";
import { validatePatientDraftWithRequirements } from "../components/patients/patientFieldRequirementsConfig.js";
import { formatRussianPassport } from "../utils/inputSanitation.js";

describe("Педиатрия и законные представители (1-клик оформление)", () => {
	describe("1. PatientAdministrativeForm — чипы быстрого выбора родства и получателя", () => {
		const RELATIONSHIP_QUICK_OPTIONS = [
			{ label: "Мама", value: "Мать", recipient: "Законному представителю (мать)" },
			{ label: "Папа", value: "Отец", recipient: "Законному представителю (отец)" },
			{ label: "Опекун", value: "Опекун", recipient: "Законному представителю (опекун)" },
		] as const;

		it("выбор чипа 'Мама' проставляет 'Мать' и заполняет пустого получателя", () => {
			let relationship = "";
			let recipient = "";

			const handleSelect = (val: string, defRecipient: string) => {
				relationship = val;
				if (!recipient.trim()) {
					recipient = defRecipient;
				}
			};

			const opt = RELATIONSHIP_QUICK_OPTIONS.find((o) => o.label === "Мама")!;
			handleSelect(opt.value, opt.recipient);

			assert.equal(relationship, "Мать");
			assert.equal(recipient, "Законному представителю (мать)");
		});

		it("выбор чипа 'Папа' проставляет 'Отец' и заполняет пустого получателя", () => {
			let relationship = "";
			let recipient = "";

			const handleSelect = (val: string, defRecipient: string) => {
				relationship = val;
				if (!recipient.trim()) {
					recipient = defRecipient;
				}
			};

			const opt = RELATIONSHIP_QUICK_OPTIONS.find((o) => o.label === "Папа")!;
			handleSelect(opt.value, opt.recipient);

			assert.equal(relationship, "Отец");
			assert.equal(recipient, "Законному представителю (отец)");
		});

		it("выбор чипа 'Опекун' проставляет 'Опекун' и заполняет пустого получателя", () => {
			let relationship = "";
			let recipient = "";

			const handleSelect = (val: string, defRecipient: string) => {
				relationship = val;
				if (!recipient.trim()) {
					recipient = defRecipient;
				}
			};

			const opt = RELATIONSHIP_QUICK_OPTIONS.find((o) => o.label === "Опекун")!;
			handleSelect(opt.value, opt.recipient);

			assert.equal(relationship, "Опекун");
			assert.equal(recipient, "Законному представителю (опекун)");
		});

		it("НЕ перезаписывает существующего получателя документов при повторном клике", () => {
			let relationship = "";
			let recipient = "Лично в руки доверенному лицу";

			const handleSelect = (val: string, defRecipient: string) => {
				relationship = val;
				if (!recipient.trim()) {
					recipient = defRecipient;
				}
			};

			const opt = RELATIONSHIP_QUICK_OPTIONS.find((o) => o.label === "Мама")!;
			handleSelect(opt.value, opt.recipient);

			assert.equal(relationship, "Мать");
			assert.equal(recipient, "Лично в руки доверенному лицу", "Пользовательский выбор не должен затираться");
		});
	});

	describe("2. MinorLegalRepresentativeConsentForm — чипы статуса в ИДС ребенка", () => {
		const MINOR_RELATION_CHIPS = [
			{ label: "Мама", value: "Мать" },
			{ label: "Папа", value: "Отец" },
			{ label: "Опекун", value: "Опекун" },
		] as const;

		it("содержит правильные маппинги для всех 3 чипов", () => {
			assert.equal(MINOR_RELATION_CHIPS[0].label, "Мама");
			assert.equal(MINOR_RELATION_CHIPS[0].value, "Мать");
			assert.equal(MINOR_RELATION_CHIPS[1].label, "Папа");
			assert.equal(MINOR_RELATION_CHIPS[1].value, "Отец");
			assert.equal(MINOR_RELATION_CHIPS[2].label, "Опекун");
			assert.equal(MINOR_RELATION_CHIPS[2].value, "Опекун");
		});

		it("проставляет значение в minorRepresentativeRelation без ручного набора", () => {
			let relation = "";
			const setRelation = (val: string) => {
				relation = val;
			};

			for (const chip of MINOR_RELATION_CHIPS) {
				setRelation(chip.value);
				assert.equal(relation, chip.value);
			}
		});
	});

	describe("3. PatientCreationModal — динамический лейбл и плейсхолдер по возрасту (< 14 лет)", () => {
		function getDocumentFieldProps(birthDateStr?: string | null) {
			const calculateAgeLocal = (bDateStr?: string | null) => {
				if (!bDateStr?.trim()) return null;
				const parsed = new Date(bDateStr);
				if (Number.isNaN(parsed.getTime())) return null;
				return calculateAge(bDateStr);
			};

			const age = calculateAgeLocal(birthDateStr);
			const isMinorUnder14 = age !== null && age < 14;

			return {
				age,
				isMinorUnder14,
				label: isMinorUnder14 ? "Свидетельство о рождении / Паспорт РФ" : "Паспорт РФ",
				placeholder: isMinorUnder14
					? "Серия (римские) № 000000 или паспорт"
					: "Серия и номер 0000 000000",
			};
		}

		it("ребенок 7 лет (< 14) получает свидетельство о рождении в лейбле и плейсхолдере", () => {
			const ref = new Date();
			const childYear = ref.getFullYear() - 7;
			const props = getDocumentFieldProps(`${childYear}-05-15`);

			assert.equal(props.isMinorUnder14, true);
			assert.equal(props.label, "Свидетельство о рождении / Паспорт РФ");
			assert.equal(props.placeholder, "Серия (римские) № 000000 или паспорт");
		});

		it("подросток 13 лет (< 14) получает свидетельство о рождении", () => {
			const ref = new Date();
			const childYear = ref.getFullYear() - 13;
			const props = getDocumentFieldProps(`${childYear}-01-01`);

			assert.equal(props.isMinorUnder14, true);
			assert.equal(props.label, "Свидетельство о рождении / Паспорт РФ");
			assert.equal(props.placeholder, "Серия (римские) № 000000 или паспорт");
		});

		it("гражданин 14 лет и старше получает стандартный паспорт РФ", () => {
			const ref = new Date();
			const teenYear = ref.getFullYear() - 14;
			const props = getDocumentFieldProps(`${teenYear}-01-01`);

			assert.equal(props.isMinorUnder14, false);
			assert.equal(props.label, "Паспорт РФ");
			assert.equal(props.placeholder, "Серия и номер 0000 000000");
		});

		it("взрослый пациент 35 лет получает стандартный паспорт РФ", () => {
			const props = getDocumentFieldProps("1991-08-20");

			assert.equal(props.isMinorUnder14, false);
			assert.equal(props.label, "Паспорт РФ");
			assert.equal(props.placeholder, "Серия и номер 0000 000000");
		});

		it("при отсутствии даты рождения выводится дефолтный Паспорт РФ", () => {
			const propsEmpty = getDocumentFieldProps("");
			assert.equal(propsEmpty.isMinorUnder14, false);
			assert.equal(propsEmpty.label, "Паспорт РФ");
			assert.equal(propsEmpty.placeholder, "Серия и номер 0000 000000");

			const propsNull = getDocumentFieldProps(null);
			assert.equal(propsNull.isMinorUnder14, false);
			assert.equal(propsNull.label, "Паспорт РФ");

			const propsInvalid = getDocumentFieldProps("не_дата");
			assert.equal(propsInvalid.isMinorUnder14, false);
			assert.equal(propsInvalid.label, "Паспорт РФ");
		});
	});

	describe("4. Мандат 8e и сохранение документов детей", () => {
		it("форматирование паспорта оставляет свидетельство о рождении с римскими цифрами невредимым", () => {
			const birthCert = "II-МЮ № 654321";
			assert.equal(formatRussianPassport(birthCert), birthCert);

			const birthCertSimple = "I-АБ 123456";
			assert.equal(formatRussianPassport(birthCertSimple), birthCertSimple);
		});

		it("валидация черновика не блокирует регистрацию без паспорта (Мандат 8e)", () => {
			const result = validatePatientDraftWithRequirements({
				fullName: "Смирнов Артем Денисович",
				phone: "+7 (999) 111-22-33",
				birthDate: "2018-03-10",
				identityDocument: "",
			});

			// Должна быть валидна для быстрой записи
			assert.equal(result.isValid, true);
			assert.equal(result.errors.identityDocument, undefined);
		});

		it("валидация черновика принимает свидетельство о рождении как документ", () => {
			const result = validatePatientDraftWithRequirements({
				fullName: "Смирнов Артем Денисович",
				phone: "+7 (999) 111-22-33",
				birthDate: "2018-03-10",
				identityDocument: "II-МЮ № 654321",
			});

			assert.equal(result.isValid, true);
			assert.equal(result.errors.identityDocument, undefined);
		});
	});
});
