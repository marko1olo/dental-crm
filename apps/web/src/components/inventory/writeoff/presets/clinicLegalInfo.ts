export interface ClinicLegalInfo {
	readonly clinicNameRu: string;
	readonly okpoCode: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly kpp: string;
	readonly addressRu: string;
	readonly chiefDoctorFullName: string;
	readonly chiefDoctorPosition: string;
	readonly headNurseFullName: string;
	readonly headNursePosition: string;
}

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	clinicNameRu: "ООО «Стоматологическая клиника ДЕНТЕ»",
	okpoCode: "49201948",
	ogrn: "1187746123456",
	inn: "7704456789",
	kpp: "770401001",
	addressRu: "г. Москва, ул. Тверская, д. 24, стр. 1",
	chiefDoctorFullName: "Кузнецов Михаил Сергеевич",
	chiefDoctorPosition: "Главный врач",
	headNurseFullName: "Смирнова Анна Викторовна",
	headNursePosition: "Главная медицинская сестра",
};
