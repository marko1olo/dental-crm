export interface ClinicalSample {
	label: string;
	code: string;
	desc: string;
}

export const CLINICAL_SAMPLES: ClinicalSample[] = [
	{
		label: "Артикаин (Честный ЗНАК МДЛП)",
		code: "0104601234567893215ABC1234567890\u001d91EE06\u001d92xyz123456",
		desc: "Карпульная анестезия 1:100000",
	},
	{
		label: "Стерилизационная упаковка",
		code: "SANPIN:CSO-2026-09-27-AUTOCLAVE-1",
		desc: "Партия стерилизации автоклава",
	},
	{
		label: "Раствор натрия хлорида (EAN-13)",
		code: "4601234567890",
		desc: "Медицинский расходный материал",
	},
	{
		label: "Талон пациента (QR)",
		code: "DENTE:PATIENT:p-2045",
		desc: "Маршрутный лист / карта пациента",
	},
];
