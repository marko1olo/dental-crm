import assert from "node:assert";
import { describe, test } from "node:test";
import {
	// 1. Форма 043/у
	fullForm043uPayloadSchema,
	calculateDmftFromOdontogram,
	renderForm043uHtml,
	PERMANENT_FDI_TEETH,
	DECIDUOUS_FDI_TEETH,

	// 2. Рецепты 107-1/у и 148-1/у-88
	form107_1uPayloadSchema,
	form148_1u88PayloadSchema,
	renderForm107_1uHtml,
	renderForm148_1u88Html,
	generateForm107_1uPayload,
	generateForm148_1u88Payload,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	CONTROLLED_DRUG_PRESETS,
	DENTAL_DRUG_INTERACTION_RULES,
	DENTAL_DRUG_DOSAGE_LIMITS,
	evaluatePrescriptionPharmacologicalSafety,

	// 3. ИДС 1051н
	informedConsent1051nPayloadSchema,
	generateStatutoryConsent1051nPayload,
	renderInformedConsent1051nHtml,

	// 4. Договор 736 и Акт 804н
	paidServiceContract736PayloadSchema,
	renderPaidServiceContract736Html,
	actOfCompletedWorksPayloadSchema,
	renderActOfCompletedWorksHtml,

	// Реквизиты
	DEFAULT_CLINIC_LICENSE_NUMBER,
} from "../index.js";

describe("Унифицированные медицинские бланки Минздрава РФ (834н, 1094н, 1051н, 804н, ПП РФ 736)", () => {
	const MOCK_CLINIC = {
		legalName: 'ООО "Денте Клиник"',
		fullName: 'ООО "Денте Клиник"',
		address: "г. Москва, ул. Стоматологов, д. 10",
		ogrn: "1234567890123",
		inn: "7701234567",
		phone: "+7 (495) 123-45-67",
		medicalLicenseNumber: DEFAULT_CLINIC_LICENSE_NUMBER,
	};

	const MOCK_PATIENT = {
		fullName: "Иванов Иван Иванович",
		birthDate: "1990-05-15",
		passport: "Паспорт РФ 4510 № 123456, выдан ТП № 1 ОУФМС г. Москвы 20.05.2010",
		address: "г. Москва, Проспект Мира, д. 25, кв. 14",
		phone: "+7 (999) 111-22-33",
		snils: "123-456-789 00",
		medicalCardNumber: "К-2026/043",
	};

	const MOCK_DOCTOR = {
		fullName: "Смирнова Анна Сергеевна",
		specialty: "Врач-стоматолог-терапевт",
	};

	// ─── 1. ФОРМА № 043/у (ПРИКАЗ МЗ РФ № 834н / 804н) ───────────────────────
	describe("1. Форма № 043/у — Медицинская карта стоматологического больного", () => {
		test("валидирует постоянную (32 зуба) и временную (20 зубов) зубную формулу FDI", () => {
			assert.strictEqual(PERMANENT_FDI_TEETH.length, 32);
			assert.strictEqual(DECIDUOUS_FDI_TEETH.length, 20);
			assert.ok(PERMANENT_FDI_TEETH.includes(11));
			assert.ok(PERMANENT_FDI_TEETH.includes(48));
			assert.ok(DECIDUOUS_FDI_TEETH.includes(51));
			assert.ok(DECIDUOUS_FDI_TEETH.includes(85));
		});

		test("рассчитывает индекс интенсивности кариеса КПУ / DMFT", () => {
			const teethMap: Record<number, any> = {
				16: { toothNumber: 16, statusCode: "caries_media" },
				15: { toothNumber: 15, statusCode: "pulpitis_acute" },
				14: { toothNumber: 14, statusCode: "filled_satisfactory" },
				11: { toothNumber: 11, statusCode: "healthy" },
				26: { toothNumber: 26, statusCode: "extracted_absent" },
				36: { toothNumber: 36, statusCode: "periodontitis_chronic" },
				46: { toothNumber: 46, statusCode: "filled_defective" },
			};

			const dmft = calculateDmftFromOdontogram(teethMap);
			assert.strictEqual(dmft.decayed, 3, "3 кариозных/пульпитных/периодонтитных зуба");
			assert.strictEqual(dmft.filled, 2, "2 пломбированных зуба");
			assert.strictEqual(dmft.missing, 1, "1 удаленный зуб");
			assert.strictEqual(dmft.totalDmft, 6, "Суммарный КПУ = 6");
		});

		test("рендерит эталонный HTML Формы № 043/у с лицензией, одонтограммой и дневником SOAP", () => {
			const payload = {
				organization: {
					fullName: MOCK_CLINIC.legalName,
					address: MOCK_CLINIC.address,
					ogrn: MOCK_CLINIC.ogrn,
					inn: MOCK_CLINIC.inn,
					medicalLicenseNumber: DEFAULT_CLINIC_LICENSE_NUMBER,
				},
				patient: {
					fullName: MOCK_PATIENT.fullName,
					birthDate: MOCK_PATIENT.birthDate,
					gender: "male",
					phone: MOCK_PATIENT.phone,
					address: MOCK_PATIENT.address,
					snils: MOCK_PATIENT.snils,
					medicalCardNumber: MOCK_PATIENT.medicalCardNumber,
				},
				cardRegistrationDate: "2026-08-25",
				primaryDiagnosisIcd10: "K02.1",
				primaryDiagnosisDetailed: "Кариес дентина зуба 1.6",
				concomitantDiseases: "Хронический гастрит в стадии ремиссии",
				biteType: "Ортогнатический",
				hygieneIndexOhiS: "1.2 (удовлетворительная)",
				odontogram: {
					16: { toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal"] },
					11: { toothNumber: 11, statusCode: "healthy", surfaces: [] },
				},
				diaries: [
					{
						visitDate: "2026-08-25",
						visitTime: "10:00",
						doctorFullName: MOCK_DOCTOR.fullName,
						doctorSpecialty: MOCK_DOCTOR.specialty,
						toothFdi: 16,
						subjectiveComplaints: "Кратковременные боли от холодного и сладкого в области зуба 1.6",
						objectiveStatus: "Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно",
						clinicalDiagnosisIcd10: "K02.1 Кариес дентина",
						treatmentProtocol804n: "A16.07.002.001 Препарирование и наложение пломбы светового отверждения Filtek Ultimate",
						usedMaterials: "Анестезия Артикаин 1:100000 1.7 мл, Filtek Ultimate A2/A3, бонд Single Bond Universal",
						homeCareRecommendations: "Щадящая жевательная нагрузка, контрольный осмотр через 6 месяцев",
					},
				],
			};

			const html = renderForm043uHtml(payload);
			assert.ok(html.includes("043/у"), "Содержит код формы 043/у");
			assert.ok(html.includes(DEFAULT_CLINIC_LICENSE_NUMBER), "Содержит номер лицензии ЛО41-01137-77/00368421");
			assert.ok(html.includes(MOCK_PATIENT.fullName), "Содержит ФИО пациента");
			assert.ok(html.includes("М.П."), "Содержит место печати М.П.");
			assert.ok(html.includes("A16.07.002.001"), "Содержит код номенклатуры 804н в дневнике");
		});
	});

	// ─── 2. РЕЦЕПТУРНЫЕ БЛАНКИ 107-1/у и 148-1/у-88 (ПРИКАЗ МЗ РФ № 1094н) ────
	describe("2. Рецептурные бланки № 107-1/у и № 148-1/у-88 (Приказ № 1094н)", () => {
		test("валидирует структуру и дозировки рецепта 107-1/у с генератором", () => {
			const payload = generateForm107_1uPayload({
				clinic: MOCK_CLINIC,
				patient: MOCK_PATIENT,
				doctor: MOCK_DOCTOR,
				diagnosisIcd10: "K04.4",
				drugIds: ["amoxiclav_875_125", "nimesulide_100"],
				validityDays: "60",
			});

			const parsed = form107_1uPayloadSchema.parse(payload);
			assert.strictEqual(parsed.items.length, 2);
			assert.strictEqual(parsed.validityDays, "60");

			const html = renderForm107_1uHtml(parsed);
			assert.ok(html.includes("107-1/у"), "Содержит название формы 107-1/у");
			assert.ok(html.includes("Rp.:"), "Содержит сигнатуру Rp");
			assert.ok(html.includes("<svg"), "Содержит встроенный векторный SVG QR-код");
			assert.ok(html.includes("QR для аптеки"), "Содержит метку QR для аптеки");
			assert.ok(html.includes("Для"), "Содержит штамп Для рецептов");
			assert.ok(html.includes("М.П."), "Содержит место личной печати врача М.П.");
		});

		test("валидирует бланк строгой отчетности № 148-1/у-88 (ПКУ) с QR-кодом", () => {
			const payload = generateForm148_1u88Payload({
				clinic: MOCK_CLINIC,
				patient: MOCK_PATIENT,
				doctor: MOCK_DOCTOR,
				diagnosisIcd10: "K08.1",
				explicitDrugId: "tramadol_50",
				headOfDepartmentFullName: "Петров Петр Петрович",
			});

			const parsed = form148_1u88PayloadSchema.parse(payload);
			assert.strictEqual(parsed.formNumber, "148-1/у-88");
			assert.strictEqual(parsed.validityDays, "15");

			const html = renderForm148_1u88Html(parsed);
			assert.ok(html.includes("148-1/у-88"), "Содержит заголовок 148-1/у-88");
			assert.ok(html.includes("15 дней"), "Содержит срок действия 15 дней для ПКУ");
			assert.ok(html.includes("<svg"), "Содержит векторный SVG QR-код");
			assert.ok(html.includes("СПЕЦ."), "Содержит специальную печать");
		});

		test("проверяет фармакологическую безопасность и межлекарственные взаимодействия", () => {
			assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 10, "Каталог содержит >= 10 препаратов");
			assert.ok(CONTROLLED_DRUG_PRESETS.length >= 3, "ПКУ каталог содержит >= 3 препаратов");
			assert.ok(DENTAL_DRUG_INTERACTION_RULES.length >= 3, "База взаимодействий содержит правила проверки");

			const safetyReport = evaluatePrescriptionPharmacologicalSafety({
				drugIds: ["nimesulide_100", "amoxiclav_875_125"],
				patientAgeYears: 30,
			});
			assert.strictEqual(safetyReport.isSafe, true);
			assert.strictEqual(safetyReport.hasContraindications, false);
		});
	});

	// ─── 3. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н) ─────
	describe("3. Информированное добровольное согласие (ИДС, Приказ № 1051н)", () => {
		const procedures = [
			{ type: "local_anesthesia" as const, name: "Анестезия" },
			{ type: "therapy_endo_restoration" as const, name: "Терапия и эндодонтия" },
			{ type: "surgery_extraction" as const, name: "Хирургия и удаление зубов" },
			{ type: "implantation_bone_graft" as const, name: "Имплантация и костная пластика" },
		];

		for (const proc of procedures) {
			test(`генерирует и валидирует ИДС для процедуры: ${proc.name}`, () => {
				const payload = generateStatutoryConsent1051nPayload({
					consentType: proc.type,
					patient: MOCK_PATIENT,
					doctor: MOCK_DOCTOR,
					clinic: MOCK_CLINIC,
				});

				const validated = informedConsent1051nPayloadSchema.parse(payload);
				assert.strictEqual(validated.consentType, proc.type);
				assert.ok(validated.explainedRisks.length >= 2, "Содержит перечень рисков");
				assert.ok(validated.alternatives.length >= 1, "Содержит альтернативы");
				assert.ok(validated.aftercareRequirements.length >= 1, "Содержит правила режима");
				assert.strictEqual(validated.confirmedVoluntary, true);

				const html = renderInformedConsent1051nHtml(validated);
				assert.ok(html.includes("1051н"), "Содержит ссылку на Приказ Минздрава № 1051н");
				assert.ok(html.includes("323-ФЗ"), "Содержит ссылку на 323-ФЗ ст. 20");
				assert.ok(html.includes(DEFAULT_CLINIC_LICENSE_NUMBER), "Содержит номер лицензии");
				assert.ok(html.includes(MOCK_PATIENT.fullName), "Содержит ФИО пациента");
				assert.ok(html.includes("М.П."), "Содержит место печати М.П.");
			});
		}
	});

	// ─── 4. ДОГОВОР НА ПЛАТНЫЕ УСЛУГИ (ПП РФ № 736) И АКТ (804н) ──────────────
	describe("4. Договор на платные медицинские услуги (ПП РФ № 736) и Акт (804н)", () => {
		test("валидирует и рендерит Договор по ПП РФ № 736 с уведомлением об ОМС", () => {
			const contractPayload = {
				contractNumber: "ДОГ-2026/043",
				contractDate: "2026-08-25",
				clinicLegalName: MOCK_CLINIC.legalName,
				clinicAddress: MOCK_CLINIC.address,
				clinicOgrn: MOCK_CLINIC.ogrn,
				clinicInn: MOCK_CLINIC.inn,
				medicalLicenseNumber: DEFAULT_CLINIC_LICENSE_NUMBER,
				patientFullName: MOCK_PATIENT.fullName,
				patientBirthDate: MOCK_PATIENT.birthDate,
				patientPassport: MOCK_PATIENT.passport,
				patientAddress: MOCK_PATIENT.address,
				patientPhone: MOCK_PATIENT.phone,
				patientSnils: MOCK_PATIENT.snils,
				serviceScope: "Терапевтическое лечение кариеса и профессиональная гигиена полости рта",
				estimatedTotalRub: 14500,
				doctorFullName: MOCK_DOCTOR.fullName,
			};

			const parsed = paidServiceContract736PayloadSchema.parse(contractPayload);
			assert.strictEqual(parsed.contractNumber, "ДОГ-2026/043");

			const html = renderPaidServiceContract736Html(parsed);
			assert.ok(html.includes("ПП РФ № 736"), "Содержит ссылку на Постановление Правительства РФ № 736");
			assert.ok(html.includes("УВЕДОМЛЕНИЕ О ГОСГАРАНТИЯХ"), "Содержит обязательное уведомление о госгарантиях ОМС");
			assert.ok(html.includes("14 500,00 руб."), "Содержит форматированную сумму");
			assert.ok(html.includes("Четырнадцать тысяч пятьсот рублей 00 копеек"), "Содержит сумму прописью");
			assert.ok(html.includes("М.П."), "Содержит место печати М.П.");
		});

		test("валидирует и рендерит Акт выполненных работ по Номенклатуре 804н со спецификацией", () => {
			const actPayload = {
				actNumber: "АКТ-2026/043",
				actDate: "2026-08-25",
				contractNumber: "ДОГ-2026/043",
				contractDate: "2026-08-25",
				clinicLegalName: MOCK_CLINIC.legalName,
				clinicAddress: MOCK_CLINIC.address,
				clinicOgrn: MOCK_CLINIC.ogrn,
				clinicInn: MOCK_CLINIC.inn,
				medicalLicenseNumber: DEFAULT_CLINIC_LICENSE_NUMBER,
				customerFullName: MOCK_PATIENT.fullName,
				customerPassport: MOCK_PATIENT.passport,
				patientFullName: MOCK_PATIENT.fullName,
				attendingDoctorFullName: MOCK_DOCTOR.fullName,
				attendingDoctorSpecialty: MOCK_DOCTOR.specialty,
				items: [
					{
						code804n: "A16.07.002.001",
						serviceName: "Наложение пломбы из фотополимерного композита при лечении среднего кариеса",
						toothNumber: 16,
						quantity: 1,
						unitPriceRub: 6500,
						totalRub: 6500,
					},
					{
						code804n: "A16.07.051",
						serviceName: "Профессиональная гигиена полости рта и удаление зубных отложений (Air-Flow + УЗ)",
						toothNumber: null,
						quantity: 1,
						unitPriceRub: 8000,
						totalRub: 8000,
					},
				],
				totalAmountRub: 14500,
				warrantyPeriodMonths: 12,
				warrantyTermsText: "12 месяцев на пломбу зуба 16 при явке на профилактический осмотр через 6 месяцев",
			};

			const parsed = actOfCompletedWorksPayloadSchema.parse(actPayload);
			assert.strictEqual(parsed.items.length, 2);

			const html = renderActOfCompletedWorksHtml(parsed);
			assert.ok(html.includes("804н"), "Содержит ссылку на Номенклатуру МЗ РФ № 804н");
			assert.ok(html.includes("A16.07.002.001"), "Содержит код услуги 804н");
			assert.ok(html.includes("A16.07.051"), "Содержит код профгигиены 804н");
			assert.ok(html.includes("претензий по объему, качеству и срокам оказания медицинских услуг не имеет"), "Содержит формулировку об отсутствии претензий");
			assert.ok(html.includes("Четырнадцать тысяч пятьсот рублей 00 копеек"), "Содержит сумму прописью");
			assert.ok(html.includes("М.П."), "Содержит место печати М.П.");
		});
	});
});
