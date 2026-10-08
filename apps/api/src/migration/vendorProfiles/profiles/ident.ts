import type { VendorProfile } from "../types.js";

export const identProfile: VendorProfile = {
	code: "ident",
	title: "IDENT",
	note: "Российская стоматологическая система; выгрузка обычно в XLSX либо в DBF из старых версий.",
	tableHints: {
		patient: [
			"patient",
			"patients",
			"пациент",
			"пациенты",
			"klient",
			"клиенты",
		],
		appointment: ["priem", "приемы", "raspisanie", "расписание", "visit"],
		payment: ["oplata", "оплаты", "platezh", "платежи", "kassa", "касса"],
		service: ["uslugi", "услуги", "price", "прайс", "nomenklatura", "номенклатура", "прейскурант"],
		visit: ["priem", "приемы", "ambulatory", "амбулаторная", "карта", "дневник", "осмотр"],
	},
	rules: {
		patient: [
			{
				columns: [
					"kod",
					"код",
					"id",
					"idpat",
					"kodpacienta",
					"код пациента",
					"номер карты",
					"nomerkarty",
				],
				targetField: "patient.externalId",
			},
			{
				columns: [
					"fio",
					"фио",
					"фамилия имя отчество",
					"pacient",
					"пациент",
					"полное имя",
				],
				targetField: "patient.fullName",
			},
			{
				columns: ["familiya", "фамилия", "surname", "lastname"],
				targetField: "patient.lastName",
			},
			{
				columns: ["imya", "имя", "name", "firstname"],
				targetField: "patient.firstName",
			},
			{
				columns: ["otchestvo", "отчество", "middlename", "patronymic"],
				targetField: "patient.middleName",
			},
			{
				columns: [
					"datarojd",
					"datarojdeniya",
					"дата рождения",
					"др",
					"birthday",
					"birthdate",
					"dr",
				],
				targetField: "patient.birthDate",
			},
			{
				columns: [
					"telefon",
					"телефон",
					"phone",
					"mobtel",
					"мобильный",
					"сотовый",
				],
				targetField: "patient.phone",
			},
			{
				columns: [
					"telefon2",
					"телефон2",
					"доптелефон",
					"дополнительный телефон",
				],
				targetField: "patient.secondaryPhone",
			},
			{
				columns: ["email", "эл почта", "почта", "epochta"],
				targetField: "patient.email",
			},
			{
				columns: ["pol", "пол", "gender", "sex"],
				targetField: "patient.gender",
			},
			{
				columns: ["adres", "адрес", "address", "адреспроживания"],
				targetField: "patient.address",
			},
			{
				columns: [
					"primechanie",
					"примечание",
					"коммент",
					"комментарий",
					"note",
					"notes",
				],
				targetField: "patient.notes",
			},
		],
		appointment: [
			{
				columns: ["kod", "код", "id"],
				targetField: "appointment.externalId",
			},
			{
				columns: [
					"kodpacienta",
					"код пациента",
					"idpat",
					"pacient",
					"пациент",
				],
				targetField: "appointment.patientRef",
			},
			{
				columns: ["vrach", "врач", "doctor", "kodvracha", "код врача"],
				targetField: "appointment.doctorRef",
			},
			{
				columns: [
					"datapriema",
					"дата приема",
					"data",
					"дата",
					"нач",
					"начало",
					"startdate",
				],
				targetField: "appointment.startsAt",
			},
			{
				columns: ["konec", "конец", "окончание", "enddate"],
				targetField: "appointment.endsAt",
			},
			{
				columns: ["dlitelnost", "длительность", "duration", "минут"],
				targetField: "appointment.durationMinutes",
			},
			{
				columns: ["status", "статус", "sostoyanie", "состояние"],
				targetField: "appointment.status",
			},
			{
				columns: ["povod", "повод", "prichina", "причина", "услуга"],
				targetField: "appointment.reason",
			},
			{
				columns: ["primechanie", "примечание", "коммент", "комментарий"],
				targetField: "appointment.comment",
			},
		],
		payment: [
			{ columns: ["kod", "код", "id"], targetField: "payment.externalId" },
			{
				columns: ["kodpacienta", "код пациента", "pacient", "пациент"],
				targetField: "payment.patientRef",
			},
			{
				columns: ["summa", "сумма", "amount", "оплачено", "koplate"],
				targetField: "payment.amountRub",
			},
			{
				columns: ["dataoplaty", "дата оплаты", "data", "дата"],
				targetField: "payment.paidAt",
			},
			{
				columns: [
					"vidoplaty",
					"вид оплаты",
					"sposob",
					"способ оплаты",
					"тип оплаты",
				],
				targetField: "payment.method",
			},
			{
				columns: ["primechanie", "примечание", "коммент", "назначение"],
				targetField: "payment.note",
			},
		],
		service: [
			{
				columns: ["id", "kod", "код", "артикул", "nomer", "номер"],
				targetField: "service.externalId",
			},
			{
				columns: [
					"kodpoноменклатуре",
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
					"naimenovanie",
					"наименование",
					"название",
					"услуга",
					"name",
					"title",
					"usluga",
				],
				targetField: "service.name",
			},
			{
				columns: [
					"cena",
					"цена",
					"стоимость",
					"price",
					"amount",
					"tarif",
					"тариф",
				],
				targetField: "service.priceRub",
			},
		],
		visit: [
			{
				columns: ["id", "kod", "код", "номерприема", "nomerpriema"],
				targetField: "visit.externalId",
			},
			{
				columns: ["idpat", "kodpacienta", "кодпациента", "пациент", "klient", "клиент"],
				targetField: "visit.patientRef",
			},
			{
				columns: ["data", "дата", "datapriema", "датаприема"],
				targetField: "visit.date",
			},
			{
				columns: ["zhaloby", "жалобы", "жалоба"],
				targetField: "visit.complaint",
			},
			{
				columns: ["anamnez", "анамнез"],
				targetField: "visit.anamnesis",
			},
			{
				columns: ["status", "статус", "объективно", "osmotr", "осмотр"],
				targetField: "visit.objectiveStatus",
			},
			{
				columns: [
					"diagnoz",
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
				columns: ["lechenie", "лечение", "планлечения", "planlecheniya"],
				targetField: "visit.treatmentPlan",
			},
			{
				columns: ["rekomendacii", "рекомендации", "заключение", "itog"],
				targetField: "visit.doctorSummary",
			},
		],
	},
};
