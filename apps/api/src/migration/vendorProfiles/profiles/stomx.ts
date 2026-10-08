import type { VendorProfile } from "../types.js";

export const stomxProfile: VendorProfile = {
	code: "stomx",
	title: "StomX",
	note: "Российская облачная стоматологическая система; выгрузка через отчёты и экспорт в XLSX/CSV.",
	tableHints: {
		patient: ["clients", "patients", "пациенты", "клиенты"],
		service: ["pricelist", "services", "услуги", "прайс", "номенклатура"],
		appointment: ["appointments", "записи", "расписание", "визиты"],
		visit: ["visits", "outpatient", "приемы", "дневник", "осмотры"],
		payment: ["invoices", "payments", "оплаты", "чеки", "касса"],
	},
	rules: {
		patient: [
			{
				columns: [
					"id",
					"client_id",
					"patient_id",
					"код",
					"номеркарты",
					"card_number",
					"cardno",
				],
				targetField: "patient.externalId",
			},
			{
				columns: ["fullname", "fio", "фио", "клиент", "пациент", "name"],
				targetField: "patient.fullName",
			},
			{
				columns: ["last_name", "фамилия", "surname", "lastname"],
				targetField: "patient.lastName",
			},
			{
				columns: ["first_name", "имя", "name", "firstname"],
				targetField: "patient.firstName",
			},
			{
				columns: ["patronymic", "middle_name", "отчество", "middlename"],
				targetField: "patient.middleName",
			},
			{
				columns: [
					"birth_date",
					"birthdate",
					"датарождения",
					"др",
					"birthday",
				],
				targetField: "patient.birthDate",
			},
			{
				columns: ["phone", "телефон", "мобильный", "phone_number", "тел"],
				targetField: "patient.phone",
			},
			{
				columns: [
					"second_phone",
					"второйтелефон",
					"доптелефон",
					"phone2",
				],
				targetField: "patient.secondaryPhone",
			},
			{
				columns: ["email", "почта", "электроннаяпочта", "mail"],
				targetField: "patient.email",
			},
			{
				columns: ["gender", "пол", "sex"],
				targetField: "patient.gender",
			},
			{
				columns: ["address", "адрес", "адреспроживания"],
				targetField: "patient.address",
			},
			{
				columns: ["comment", "комментарий", "примечание", "notes", "note"],
				targetField: "patient.notes",
			},
			{
				columns: ["status", "статус", "state"],
				targetField: "patient.status",
			},
		],
		service: [
			{
				columns: ["id", "service_id", "код", "артикул", "code"],
				targetField: "service.externalId",
			},
			{
				columns: [
					"code804n",
					"order804n",
					"код804н",
					"кодпономенклатуре",
					"номенклатура",
					"кодминздрава",
					"кодпоприказу",
					"код804",
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
					"title",
					"name",
					"название",
					"наименование",
					"услуга",
					"service_name",
				],
				targetField: "service.name",
			},
			{
				columns: [
					"price",
					"cost",
					"цена",
					"стоимость",
					"прайс",
					"amount",
					"base_price",
				],
				targetField: "service.priceRub",
			},
		],
		appointment: [
			{
				columns: ["id", "appointment_id", "код", "номерзаписи"],
				targetField: "appointment.externalId",
			},
			{
				columns: ["client_id", "patient_id", "пациент", "клиент"],
				targetField: "appointment.patientRef",
			},
			{
				columns: ["doctor_id", "врач", "доктор", "provider_id"],
				targetField: "appointment.doctorRef",
			},
			{
				columns: [
					"start_time",
					"start_at",
					"starts_at",
					"времяначала",
					"начало",
					"datetime",
				],
				targetField: "appointment.startsAt",
			},
			{
				columns: [
					"end_time",
					"end_at",
					"ends_at",
					"времяокончания",
					"конец",
				],
				targetField: "appointment.endsAt",
			},
			{
				columns: [
					"duration",
					"длительность",
					"duration_minutes",
					"минут",
				],
				targetField: "appointment.durationMinutes",
			},
			{
				columns: ["status", "статус", "state"],
				targetField: "appointment.status",
			},
			{
				columns: ["reason", "повод", "причина", "услуга"],
				targetField: "appointment.reason",
			},
			{
				columns: ["comment", "комментарий", "примечание", "note"],
				targetField: "appointment.comment",
			},
		],
		visit: [
			{
				columns: ["id", "visit_id", "код", "номерприема"],
				targetField: "visit.externalId",
			},
			{
				columns: ["client_id", "patient_id", "пациент", "клиент"],
				targetField: "visit.patientRef",
			},
			{
				columns: ["date", "visit_date", "дата", "датаприема"],
				targetField: "visit.date",
			},
			{
				columns: ["complaints", "complaint", "жалобы", "жалоба"],
				targetField: "visit.complaint",
			},
			{
				columns: ["anamnesis", "анамнез"],
				targetField: "visit.anamnesis",
			},
			{
				columns: [
					"status_localis",
					"objective",
					"объективно",
					"статус",
					"status",
				],
				targetField: "visit.objectiveStatus",
			},
			{
				columns: [
					"diagnosis",
					"icd10",
					"icd",
					"мкб",
					"мкб10",
					"диагноз",
					"диагнозпомкб",
					"коддиагноза",
					"диагнозкод",
					"кодпоэкб",
					"заключениедиагноз",
				],
				targetField: "visit.diagnosis",
			},
			{
				columns: ["treatment", "лечение", "планлечения"],
				targetField: "visit.treatmentPlan",
			},
			{
				columns: ["recommendations", "рекомендации", "заключение"],
				targetField: "visit.doctorSummary",
			},
		],
		payment: [
			{
				columns: ["id", "invoice_id", "payment_id", "код", "номерчека"],
				targetField: "payment.externalId",
			},
			{
				columns: ["client_id", "patient_id", "пациент", "клиент"],
				targetField: "payment.patientRef",
			},
			{
				columns: ["total", "amount", "paid", "сумма", "оплачено", "стоимость"],
				targetField: "payment.amountRub",
			},
			{
				columns: ["date", "payment_date", "paid_at", "дата", "датаоплаты"],
				targetField: "payment.paidAt",
			},
			{
				columns: [
					"payment_type",
					"type",
					"method",
					"способоплаты",
					"видоплаты",
				],
				targetField: "payment.method",
			},
			{
				columns: ["comment", "note", "комментарий", "назначение"],
				targetField: "payment.note",
			},
		],
	},
};
