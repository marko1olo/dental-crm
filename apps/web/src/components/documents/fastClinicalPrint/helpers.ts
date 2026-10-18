import type { FastPrintClinicInfo, FastPrintDoctorInfo } from "../FastClinicalPrintEngine";

export function getEffectiveClinic(clinic?: FastPrintClinicInfo): Required<FastPrintClinicInfo> {
	return {
		name: clinic?.name || "Стоматологическая клиника «DENTE»",
		legalName: clinic?.legalName || 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
		inn: clinic?.inn || "7704123456",
		ogrn: clinic?.ogrn || "1237700123456",
		address: clinic?.address || "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
		phone: clinic?.phone || "+7 (495) 777-88-99",
		licenseNumber: clinic?.licenseNumber || "ЛО41-01137-77/00368421 от 14.02.2023 г.",
	};
}

export function getEffectiveDoctor(doctor?: FastPrintDoctorInfo): Required<FastPrintDoctorInfo> {
	return {
		fullName: doctor?.fullName || "Смирнова Елена Александровна",
		specialty: doctor?.specialty || "Врач-стоматолог терапевт",
	};
}
