import type { VendorProfile } from "../types.js";

export const infodentProfile: VendorProfile = {
	code: "infodent",
	title: "Инфодент / Infodent",
	note: "Система на FoxPro; данные лежат в DBF-таблицах, текст обычно в cp866.",
	tableHints: {
		patient: ["pacient", "patient", "kart", "karta", "klient"],
		visit: ["priem", "lechenie", "visit"],
		payment: ["oplata", "kassa", "schet"],
		service: ["usl", "uslugi", "price", "cen", "nomenkl"],
	},
	rules: {
		patient: [
			{
				columns: ["nkart", "nomkart", "kod", "id", "idpac", "npac"],
				targetField: "patient.externalId",
			},
			{
				columns: ["fio", "fam_io", "pacient", "nazvanie"],
				targetField: "patient.fullName",
			},
			{
				columns: ["fam", "familia", "familiya"],
				targetField: "patient.lastName",
			},
			{ columns: ["im", "imya"], targetField: "patient.firstName" },
			{
				columns: ["ot", "otch", "otchestvo"],
				targetField: "patient.middleName",
			},
			{
				columns: ["drojd", "ddr", "datar", "datarojd", "birth"],
				targetField: "patient.birthDate",
			},
			{
				columns: ["tel", "telef", "telefon", "mobil"],
				targetField: "patient.phone",
			},
			{
				columns: ["tel2", "teldom", "telrab"],
				targetField: "patient.secondaryPhone",
			},
			{ columns: ["pol", "sex"], targetField: "patient.gender" },
			{ columns: ["adres", "adr"], targetField: "patient.address" },
			{ columns: ["prim", "primech", "zamet"], targetField: "patient.notes" },
		],
		service: [
			{
				columns: ["kod", "id", "nom", "artikul"],
				targetField: "service.externalId",
			},
			{
				columns: [
					"kod804",
					"kod804n",
					"код804н",
					"кодпономенклатуре",
					"nomenkl",
					"номенклатура",
					"shifr",
					"шифр",
					"kod",
					"код",
					"code",
				],
				targetField: "service.code",
			},
			{
				columns: ["nazv", "nazvanie", "naim", "usluga", "name"],
				targetField: "service.name",
			},
			{
				columns: ["cena", "stoim", "summa", "price"],
				targetField: "service.priceRub",
			},
		],
		visit: [
			{ columns: ["id", "kod", "nom", "npriem"], targetField: "visit.externalId" },
			{ columns: ["nkart", "npac", "idpac", "kodpac"], targetField: "visit.patientRef" },
			{ columns: ["data", "datpriem", "dat"], targetField: "visit.date" },
			{ columns: ["zhalob", "zhaloby"], targetField: "visit.complaint" },
			{ columns: ["anamn", "anamnez"], targetField: "visit.anamnesis" },
			{ columns: ["status", "stat", "osmotr"], targetField: "visit.objectiveStatus" },
			{
				columns: [
					"diagnoz",
					"diag",
					"mkb",
					"mkb10",
					"мкб",
					"мкб10",
					"koddiag",
					"icd",
					"icd10",
				],
				targetField: "visit.diagnosis",
			},
			{ columns: ["lech", "lechenie", "plan"], targetField: "visit.treatmentPlan" },
			{ columns: ["rekom", "rekomend", "itog"], targetField: "visit.doctorSummary" },
		],
		payment: [
			{ columns: ["kod", "id", "nom"], targetField: "payment.externalId" },
			{
				columns: ["nkart", "npac", "idpac", "kodpac"],
				targetField: "payment.patientRef",
			},
			{
				columns: ["summa", "sum", "cena", "itogo"],
				targetField: "payment.amountRub",
			},
			{
				columns: ["data", "datopl", "dataopl"],
				targetField: "payment.paidAt",
			},
			{ columns: ["vid", "vidopl", "sposob"], targetField: "payment.method" },
		],
	},
};
