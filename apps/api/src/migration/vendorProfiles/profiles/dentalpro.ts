import type { VendorProfile } from "../types.js";

export const dentalproProfile: VendorProfile = {
	code: "dentalpro",
	title: "DentalPRO",
	note: "Российская система; выгрузка через отчёты в XLSX/CSV.",
	tableHints: {
		patient: ["patients", "пациенты", "clients", "клиентская база"],
		visit: ["visits", "приемы", "лечение"],
		payment: ["payments", "платежи", "оплаты"],
		service: ["services", "услуги", "pricelist", "прайс", "номенклатура"],
		appointment: ["appointments", "записи", "расписание"],
	},
	rules: {
		patient: [
			{
				columns: [
					"номеркарты",
					"картномер",
					"cardnumber",
					"cardno",
					"id",
					"код",
				],
				targetField: "patient.externalId",
			},
			{
				columns: ["пациент", "фио", "фиопациента", "клиент", "fullname"],
				targetField: "patient.fullName",
			},
			{ columns: ["фамилия"], targetField: "patient.lastName" },
			{ columns: ["имя"], targetField: "patient.firstName" },
			{ columns: ["отчество"], targetField: "patient.middleName" },
			{
				columns: ["датарождения", "дррождения", "birthdate"],
				targetField: "patient.birthDate",
			},
			{
				columns: ["мобильныйтелефон", "телефон", "мобильный", "phone"],
				targetField: "patient.phone",
			},
			{
				columns: ["домашнийтелефон", "рабочийтелефон", "второйтелефон"],
				targetField: "patient.secondaryPhone",
			},
			{
				columns: ["email", "электроннаяпочта"],
				targetField: "patient.email",
			},
			{ columns: ["пол"], targetField: "patient.gender" },
			{
				columns: ["адрес", "адресрегистрации"],
				targetField: "patient.address",
			},
			{
				columns: ["заметки", "примечания", "комментарий"],
				targetField: "patient.notes",
			},
			{
				columns: ["статус", "состояниекарты"],
				targetField: "patient.status",
			},
		],
		service: [
			{
				columns: ["id", "код", "кодуслуги", "артикул", "code"],
				targetField: "service.externalId",
			},
			{
				columns: [
					"код804н",
					"кодпономенклатуре",
					"кодминздрава",
					"кодпоприказу",
					"код804",
					"номенклатура",
					"кодпосправочнику",
					"артикул",
					"кодуслуги",
					"код",
					"code",
					"shifr",
					"шифр",
				],
				targetField: "service.code",
			},
			{
				columns: [
					"название",
					"наименование",
					"наименованиеуслуги",
					"услуга",
					"name",
					"title",
				],
				targetField: "service.name",
			},
			{
				columns: ["цена", "стоимость", "прайс", "сумма", "price", "cost"],
				targetField: "service.priceRub",
			},
		],
		visit: [
			{ columns: ["id", "номерприема"], targetField: "visit.externalId" },
			{
				columns: ["пациент", "номеркарты", "картномер"],
				targetField: "visit.patientRef",
			},
			{ columns: ["дата", "датаприема"], targetField: "visit.date" },
			{ columns: ["жалобы"], targetField: "visit.complaint" },
			{ columns: ["анамнез"], targetField: "visit.anamnesis" },
			{
				columns: ["объективно", "осмотр", "статус"],
				targetField: "visit.objectiveStatus",
			},
			{
				columns: [
					"диагноз",
					"диагнозпомкб",
					"коддиагноза",
					"диагнозкод",
					"мкб",
					"мкб10",
					"icd",
					"icd10",
					"кодпоэкб",
					"заключениедиагноз",
				],
				targetField: "visit.diagnosis",
			},
			{
				columns: ["планлечения", "лечение"],
				targetField: "visit.treatmentPlan",
			},
			{
				columns: ["заключение", "рекомендации"],
				targetField: "visit.doctorSummary",
			},
		],
		payment: [
			{
				columns: ["id", "номер", "номерчека", "код"],
				targetField: "payment.externalId",
			},
			{
				columns: ["клиент", "пациент", "пациентid"],
				targetField: "payment.patientRef",
			},
			{
				columns: ["сумма", "оплачено", "стоимость", "amount"],
				targetField: "payment.amountRub",
			},
			{
				columns: ["дата", "датаоплаты", "date"],
				targetField: "payment.paidAt",
			},
			{
				columns: ["способоплаты", "видоплаты", "тип", "method"],
				targetField: "payment.method",
			},
			{
				columns: ["комментарий", "примечание", "note"],
				targetField: "payment.note",
			},
		],
	},
};
