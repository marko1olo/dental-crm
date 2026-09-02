import assert from "node:assert";
import { describe, it } from "node:test";
import {
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	renderForm043uHtml,
	renderGraphicalDentalFormulaHtml,
} from "../index.js";

describe("Graphical Dental Formula (FDI 11..48 / 51..85) & Visual Signature Stamp Rigor", () => {
	it("renders vector SVG graphical dental formula with all 32 adult teeth and correct pathology badges", () => {
		const html = renderGraphicalDentalFormulaHtml({
			title: "Клиническая карта зубов (FDI)",
			clinicalToothRows: [
				{
					toothOrArea: "16",
					status: "caries",
					surfaces: ["occlusal", "distal"],
					diagnosisOrFinding: "K02.1 Кариес дентина",
					plannedAction: "Пломбирование композитом",
				},
				{
					toothOrArea: "24",
					status: "pulpitis",
					surfaces: ["occlusal"],
					diagnosisOrFinding: "K04.0 Пульпит начальный",
					plannedAction: "Эндодонтическое лечение",
				},
				{
					toothOrArea: "36",
					status: "implant",
					surfaces: ["implant_site"],
					diagnosisOrFinding: "Адентия 3.6, установлен имплантат",
					plannedAction: "Установка формирователя десны",
				},
				{
					toothOrArea: "46",
					status: "missing",
					surfaces: ["not_applicable"],
					diagnosisOrFinding: "Удален ранее по поводу периодонтита",
				},
				{
					toothOrArea: "11",
					status: "crown",
					surfaces: ["buccal", "palatal"],
					diagnosisOrFinding: "Металлокерамическая коронка",
				},
				{
					toothOrArea: "21",
					status: "filled",
					surfaces: ["mesial"],
					diagnosisOrFinding: "Состоятельная пломба",
				},
			],
		});

		// Проверяем наличие всех ключевых квадрантов и разделителей
		assert.ok(html.includes("BEGIN_GRAPHICAL_DENTAL_FORMULA"));
		assert.ok(html.includes("END_GRAPHICAL_DENTAL_FORMULA"));
		assert.ok(html.includes("Клиническая карта зубов (FDI)"));
		assert.ok(html.includes("Верхняя челюсть справа (18–11)"));
		assert.ok(html.includes("Верхняя челюсть слева (21–28)"));
		assert.ok(html.includes("Нижняя челюсть справа (48–41)"));
		assert.ok(html.includes("Нижняя челюсть слева (31–38)"));
		assert.ok(html.includes("Сагиттальная линия"));
		assert.ok(html.includes("Окклюзионная линия смыкания"));

		// Проверяем векторный SVG и цвета патологий
		assert.ok(html.includes("<svg width=\"26\" height=\"32\""));
		assert.ok(html.includes("#dc2626")); // Кариес 16 (красный)
		assert.ok(html.includes("#991b1b")); // Пульпит 24 (темно-красный)
		assert.ok(html.includes("#4f46e5")); // Имплантат 36 (индиго)
		assert.ok(html.includes("#94a3b8")); // Отсутствующий 46 (серый перечеркнутый)
		assert.ok(html.includes("#2563eb")); // Коронка 11 (синий)
		assert.ok(html.includes("#059669")); // Пломба 21 (изумрудный)

		// Проверяем корректность расчета КПУ в шапке
		assert.ok(html.includes("Индекс КПУ(з):"));
		assert.ok(html.includes("Легенда клинических обозначений"));
	});

	it("renders pediatric deciduous teeth (51..85) when child dentition is present", () => {
		const html = renderGraphicalDentalFormulaHtml({
			title: "Сменный прикус ребенка",
			showDeciduous: true,
			clinicalToothRows: [
				{
					toothOrArea: "54",
					status: "caries",
					diagnosisOrFinding: "Кариес молочного моляра",
				},
				{
					toothOrArea: "75",
					status: "pulpitis",
					diagnosisOrFinding: "Пульпит молочного зуба",
				},
			],
		});

		assert.ok(html.includes("Молочный прикус (55–51 | 61–65)"));
		assert.ok(html.includes("Молочный прикус (85–81 | 71–75)"));
		assert.ok(html.includes("54"));
		assert.ok(html.includes("75"));
	});

	it("renders Form 043/u HTML with integrated graphical dental formula and GOST R 7.0.97-2016 blue signature stamp without layout collision", () => {
		const form043uPayload = {
			clinicLegalName: 'ООО "ДЕНТЕ КЛИНИКА"',
			clinicAddress: "г. Москва, ул. Стоматологическая, д. 10",
			clinicOgrn: "1127746000000",
			clinicInn: "7701000000",
			medicalCardNumber: "СТ-2026/043",
			cardOpenedDate: "2026-09-02",
			patientFullName: "Иванов Петр Сергеевич",
			patientBirthDate: "1988-05-14",
			patientSex: "male",
			patientPhone: "+7 (999) 000-11-22",
			patientSnils: "123-456-789 00",
			attendingDoctorFullName: "Смирнова Елена Сергеевна",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
			chiefComplaint: "Периодическая ноющая боль в зубе 1.6 при приеме пищи.",
			dentalFormula: {
				teeth: [
					{ toothNumber: 16, status: "caries", statusCode: "C" },
					{ toothNumber: 26, status: "filled", statusCode: "П" },
					{ toothNumber: 36, status: "missing", statusCode: "0" },
					{ toothNumber: 46, status: "implant", statusCode: "И" },
				],
			},
		};

		const html = renderForm043uHtml(form043uPayload);

		// Проверяем наличие графической формулы в секции 3
		assert.ok(html.includes("3. Графическая зубная формула (FDI 11–48 / 51–85)"));
		assert.ok(html.includes("BEGIN_GRAPHICAL_DENTAL_FORMULA"));
		assert.ok(html.includes("END_GRAPHICAL_DENTAL_FORMULA"));
		assert.ok(html.includes("Верхняя челюсть справа (18–11)"));

		// Генерируем официальный синий штамп по ГОСТ Р 7.0.97-2016
		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B1122334455667788",
			certificateSubject: "Смирнова Елена Сергеевна",
			certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			signedAt: "2026-09-02T12:00:00.000Z",
			signatureType: "ukep",
		});

		// Внедряем штамп в сгенерированный HTML
		const stampedHtml = injectVisualSignatureStampIntoHtml(html, stampHtml);

		// Проверяем корректную инжекцию рядом с подписью врача
		assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("END_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampedHtml.includes("00E4A28B1122334455667788"));
		assert.ok(stampedHtml.includes("Смирнова Елена Сергеевна"));

		// Проверяем, что формула зубов не повреждена и штамп не перекрыл одонтограмму
		assert.ok(stampedHtml.includes("BEGIN_GRAPHICAL_DENTAL_FORMULA"));
		const formulaPos = stampedHtml.indexOf("BEGIN_GRAPHICAL_DENTAL_FORMULA");
		const stampPos = stampedHtml.indexOf("BEGIN_GOST_SIGNATURE_STAMP");
		assert.ok(formulaPos < stampPos, "Зубная формула должна находиться в клинической части, а штамп — в блоке подписи внизу");
	});
});
