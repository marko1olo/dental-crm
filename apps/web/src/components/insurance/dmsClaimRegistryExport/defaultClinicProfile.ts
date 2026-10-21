/**
 * defaultClinicProfile.ts — Профиль юридического лица стоматологической клиники
 */

import type { ClinicLegalProfile } from "./types.js";

export const DEFAULT_CLINIC_PROFILE: ClinicLegalProfile = {
	legalName: "ООО «Стоматологический Центр «ДЕНТЕ»",
	brandName: "Стоматологическая клиника DENTE",
	inn: "7701984210",
	ogrn: "1157746890123",
	kpp: "770101001",
	address: "107078, г. Москва, ул. Большая Спасская, д. 12, стр. 1",
	phone: "+7 (495) 789-20-20",
	licenseNumber: "ЛО41-01137-77/00589123",
	licenseDate: "15.03.2021",
	chiefDoctorFullName: "Д-р Смирнов Константин Владимирович",
	chiefAccountantFullName: "Васильева Ольга Николаевна",
	bankName: "ПАО СБЕРБАНК г. Москва",
	bankBic: "044525225",
	bankAccount: "40702810438000012345",
};
