/**
 * clinicBranches.ts — Реестр и филиалы сети клиник DENTE.
 * Лимит <= 120 строк по Мандату 8b.
 */

export type ClinicBranchId = "branch-central" | "branch-west" | "branch-north" | "branch-east";

export interface ClinicBranchInfo {
	readonly id: string;
	readonly code: string;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly addressRu: string;
	readonly chiefDoctorRu: string;
	readonly phone: string;
}

export const CLINIC_NETWORK_BRANCHES: readonly ClinicBranchInfo[] = [
	{
		id: "branch-central",
		code: "ЦЕНТР",
		nameRu: "Флагманский филиал «DENTE Центральный»",
		shortNameRu: "DENTE Центр",
		addressRu: "г. Москва, ул. Тверская, д. 12, стр. 2",
		chiefDoctorRu: "Смирнов А. П.",
		phone: "",
	},
	{
		id: "branch-west",
		code: "ЗАПАД",
		nameRu: "Филиал «DENTE Запад»",
		shortNameRu: "DENTE Запад",
		addressRu: "г. Москва, Кутузовский пр-т, д. 24",
		chiefDoctorRu: "Кузнецов И. В.",
		phone: "+7 (495) 234-56-78",
	},
	{
		id: "branch-north",
		code: "СЕВЕР",
		nameRu: "Филиал «DENTE Север»",
		shortNameRu: "DENTE Север",
		addressRu: "г. Москва, Ленинградский пр-т, д. 36",
		chiefDoctorRu: "Морозова Е. С.",
		phone: "+7 (495) 345-67-89",
	},
	{
		id: "branch-east",
		code: "ВОСТОК",
		nameRu: "Филиал «DENTE Восток»",
		shortNameRu: "DENTE Восток",
		addressRu: "г. Москва, ул. Первомайская, д. 42",
		chiefDoctorRu: "Васильев П. Н.",
		phone: "+7 (495) 456-78-90",
	},
];

export function getClinicBranch(idOrCode: string): ClinicBranchInfo {
	return CLINIC_NETWORK_BRANCHES.find((b) => b.id === idOrCode || b.code === idOrCode) || CLINIC_NETWORK_BRANCHES[0]!;
}
