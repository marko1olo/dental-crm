import type { VendorProfile } from "../types.js";

export const opendentalProfile: VendorProfile = {
	code: "opendental",
	title: "Open Dental",
	note: "Западная система на MySQL; выгрузка таблиц patient/appointment/procedurelog.",
	tableHints: {
		patient: ["patient", "patients"],
		appointment: ["appointment", "appointments", "appt"],
		payment: ["payment", "paysplit", "procedurelog"],
		doctor: ["provider", "providers"],
	},
	rules: {
		patient: [
			{
				columns: ["patnum", "patientnum", "patid"],
				targetField: "patient.externalId",
			},
			{ columns: ["lname", "lastname"], targetField: "patient.lastName" },
			{ columns: ["fname", "firstname"], targetField: "patient.firstName" },
			{
				columns: ["middlei", "midname", "middlename"],
				targetField: "patient.middleName",
			},
			{ columns: ["birthdate", "bdate"], targetField: "patient.birthDate" },
			{
				columns: ["hmphone", "wirelessphone", "phone"],
				targetField: "patient.phone",
			},
			{
				columns: ["wkphone", "workphone"],
				targetField: "patient.secondaryPhone",
			},
			{ columns: ["email"], targetField: "patient.email" },
			{ columns: ["gender"], targetField: "patient.gender" },
			{ columns: ["address", "address1"], targetField: "patient.address" },
			{ columns: ["patstatus", "status"], targetField: "patient.status" },
		],
		appointment: [
			{ columns: ["aptnum"], targetField: "appointment.externalId" },
			{ columns: ["patnum"], targetField: "appointment.patientRef" },
			{
				columns: ["provnum", "provider"],
				targetField: "appointment.doctorRef",
			},
			{
				columns: ["aptdatetime", "aptdate"],
				targetField: "appointment.startsAt",
			},
			{ columns: ["aptstatus"], targetField: "appointment.status" },
			{
				columns: ["pattern", "length"],
				targetField: "appointment.durationMinutes",
			},
			{
				columns: ["procdescript", "notes"],
				targetField: "appointment.reason",
			},
		],
		payment: [
			{ columns: ["paynum", "procnum"], targetField: "payment.externalId" },
			{ columns: ["patnum"], targetField: "payment.patientRef" },
			{
				columns: ["payamt", "procfee", "amount"],
				targetField: "payment.amountRub",
			},
			{ columns: ["paydate", "procdate"], targetField: "payment.paidAt" },
			{ columns: ["paynote", "note"], targetField: "payment.note" },
		],
	},
};

export const dentrixProfile: VendorProfile = {
	code: "dentrix",
	title: "Dentrix",
	note: "Западная система; выгрузка через отчёты в CSV.",
	tableHints: {
		patient: ["patient", "patients"],
		appointment: ["appt", "appointment"],
		payment: ["ledger", "transaction"],
	},
	rules: {
		patient: [
			{
				columns: ["patid", "patientid", "chartnumber", "chartno"],
				targetField: "patient.externalId",
			},
			{ columns: ["lastname"], targetField: "patient.lastName" },
			{ columns: ["firstname"], targetField: "patient.firstName" },
			{ columns: ["middlename", "mi"], targetField: "patient.middleName" },
			{
				columns: ["birthdate", "dateofbirth", "dob"],
				targetField: "patient.birthDate",
			},
			{
				columns: ["phone", "homephone", "cellphone"],
				targetField: "patient.phone",
			},
			{ columns: ["email", "emailaddress"], targetField: "patient.email" },
			{ columns: ["gender", "sex"], targetField: "patient.gender" },
			{ columns: ["address", "street"], targetField: "patient.address" },
		],
		appointment: [
			{
				columns: ["apptid", "appointmentid"],
				targetField: "appointment.externalId",
			},
			{
				columns: ["patid", "patientid"],
				targetField: "appointment.patientRef",
			},
			{
				columns: ["provider", "providerid"],
				targetField: "appointment.doctorRef",
			},
			{
				columns: ["startdatetime", "apptdate", "date"],
				targetField: "appointment.startsAt",
			},
			{ columns: ["enddatetime"], targetField: "appointment.endsAt" },
			{
				columns: ["status", "apptstatus"],
				targetField: "appointment.status",
			},
			{
				columns: ["reason", "description"],
				targetField: "appointment.reason",
			},
		],
	},
};
