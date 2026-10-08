import type { VendorProfile } from "../types.js";

export const onecMedicineProfile: VendorProfile = {
	code: "1c_medicine",
	title: "1С:Медицина",
	note: "Выгрузка из 1С; имена колонок русские, часто с префиксом справочника.",
	tableHints: {
		patient: ["физическиелица", "пациенты", "справочникпациенты"],
		payment: ["документыоплата", "чеки", "поступлениеденег"],
		service: ["номенклатура", "услуги", "справочникноменклатура", "прайслист"],
		visit: ["приемы", "медицинскиекарты", "осмотры", "документыприем"],
	},
	rules: {
		patient: [
			{
				columns: [
					"код",
					"кодфизлица",
					"уникальныйидентификатор",
					"guid",
					"ссылка",
				],
				targetField: "patient.externalId",
			},
			{
				columns: ["наименование", "фио", "физическоелицо", "полноеимя"],
				targetField: "patient.fullName",
			},
			{ columns: ["фамилия"], targetField: "patient.lastName" },
			{ columns: ["имя"], targetField: "patient.firstName" },
			{ columns: ["отчество"], targetField: "patient.middleName" },
			{ columns: ["датарождения"], targetField: "patient.birthDate" },
			{
				columns: ["телефон", "контактныйтелефон", "телефонмобильный"],
				targetField: "patient.phone",
			},
			{
				columns: ["адресэлектроннойпочты", "email"],
				targetField: "patient.email",
			},
			{ columns: ["пол"], targetField: "patient.gender" },
			{
				columns: ["адрес", "адресфактический", "адресрегистрации"],
				targetField: "patient.address",
			},
			{
				columns: ["комментарий", "дополнительнаяинформация"],
				targetField: "patient.notes",
			},
		],
		service: [
			{
				columns: [
					"код",
					"артикул",
					"уникальныйидентификатор",
					"guid",
					"ссылка",
				],
				targetField: "service.externalId",
			},
			{
				columns: [
					"кодпономенклатуре",
					"код804н",
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
					"наименование",
					"услуга",
					"номенклатураполное",
					"наименованиеполное",
					"name",
				],
				targetField: "service.name",
			},
			{
				columns: [
					"цена",
					"стоимость",
					"сумма",
					"ценауслуги",
					"ценабазовая",
					"price",
				],
				targetField: "service.priceRub",
			},
		],
		visit: [
			{
				columns: ["номер", "номердокумента", "код", "guid", "уникальныйидентификатор"],
				targetField: "visit.externalId",
			},
			{
				columns: ["пациент", "физическоелицо", "пациентссылка", "контрагент"],
				targetField: "visit.patientRef",
			},
			{
				columns: ["дата", "датаприема", "датадокумента"],
				targetField: "visit.date",
			},
			{
				columns: ["жалобы", "жалобыпациента"],
				targetField: "visit.complaint",
			},
			{
				columns: ["анамнез", "анамнезжизни", "анамнеззаболевания"],
				targetField: "visit.anamnesis",
			},
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
				columns: ["лечение", "оказанныеуслуги", "планлечения"],
				targetField: "visit.treatmentPlan",
			},
			{
				columns: ["рекомендации", "заключение", "врачебноезаключение"],
				targetField: "visit.doctorSummary",
			},
		],
		payment: [
			{
				columns: ["номер", "номердокумента"],
				targetField: "payment.externalId",
			},
			{
				columns: ["физическоелицо", "пациент", "контрагент"],
				targetField: "payment.patientRef",
			},
			{
				columns: ["суммадокумента", "сумма"],
				targetField: "payment.amountRub",
			},
			{ columns: ["дата"], targetField: "payment.paidAt" },
			{
				columns: ["видоплаты", "способоплаты"],
				targetField: "payment.method",
			},
			{
				columns: ["комментарий", "назначениеплатежа"],
				targetField: "payment.note",
			},
		],
	},
};
