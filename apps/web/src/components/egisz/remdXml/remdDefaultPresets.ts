/**
 * remdDefaultPresets.ts — Statutory Dental Presets for Clinic, Doctor & Patient
 */

export const DEFAULT_EGISZ_CLINIC_PRESET = {
	clinicName: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
	clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
	clinicOgrn: "1157746123457",
	clinicInn: "7701234560",
	clinicKpp: "770101001",
	clinicAddress: "125009, г. Москва, ул. Тверская, д. 12, стр. 2",
	clinicPhone: "+7 (495) 789-45-60",
	clinicEmail: "info@dente-clinic.ru",
	chiefDoctorName: "Смирнова Елена Викторовна",
	chiefDoctorSnils: "123-456-789 64",
};

export const DEFAULT_EGISZ_DOCTOR_PRESET = {
	doctorFullName: "Иванов Сергей Павлович",
	doctorSnils: "123-456-789 64",
	doctorPosition: "Врач-стоматолог-терапевт",
	doctorPositionCode: "71",
	doctorPhone: "+7 (926) 555-12-34",
	doctorEmail: "dr.ivanov@dente-clinic.ru",
};

export const SAMPLE_043U_PATIENT_PRESET = {
	patientId: "PAT-043-8942",
	cardNumber: "043-2026/184",
	patientFullName: "Соколова Анна Владимировна",
	patientSnils: "123-456-789 64",
	patientBirthDate: "1988-06-14",
	patientGender: "female" as const,
	patientPolisOms: "1658493021948572",
	patientPassport: "4512 894512",
	patientAddress: "119049, г. Москва, Ленинский проспект, д. 24, кв. 86",
	patientPhone: "+7 (903) 123-45-67",
	patientEmail: "anna.sokolova@gmail.com",
};
