export function createMockMedicalCard043(patientId: string) {
	return {
		patientId,
		generalInfo: {
			fullName: "Калинин Сергей Михайлович",
			birthDate: "1988-04-12",
			gender: "M",
			snils: "123-456-789 00",
			omsPolicy: "9876543210123456",
			phone: "+7 (916) 555-44-33",
			address: "г. Москва, ул. Тверская, д. 15, кв. 42",
		},
		complaints: "Острая самопроизвольная приступообразная боль в области зуба 46, усиливающаяся в ночное время",
		anamnesisMorbi: "Зуб 46 ранее лечен по поводу среднего кариеса 2 года назад. Острые боли возникли 2 дня назад",
		anamnesisVitae: "Аллергологический анамнез: непереносимость пенициллинов. Гипертония I ст.",
		statusLocalis: "Глубокая кариозная полость 46 зуба, болезненность при зондировании дна. ЭОД 35 мкА",
		diagnosisIcd10: "K04.0",
		diagnosisDescription: "Острый очаговый пульпит зуба 46",
		diagnosisTooth: "46",
		odontogram: {
			teeth: Array.from({ length: 32 }, (_, idx) => {
				const actualTooth = ((Math.floor(idx / 8) + 1) * 10) + ((idx % 8) + 1);
				if (actualTooth === 46) {
					return { toothNumber: 46, statusCode: "pulpitis_acute", surfaces: ["occlusal", "distal"], mobility: 0, notes: "Глубокая полость" };
				}
				if (actualTooth === 16) {
					return { toothNumber: 16, statusCode: "filled_satisfactory", surfaces: ["occlusal"], mobility: 0, notes: "Светоотверждаемая пломба" };
				}
				if (actualTooth === 38) {
					return { toothNumber: 38, statusCode: "extracted_absent", surfaces: [], mobility: 0, notes: "Удален" };
				}
				return { toothNumber: actualTooth, statusCode: "healthy", surfaces: [], mobility: 0, notes: "Интактен" };
			}),
			dmftIndex: { decayedCount: 1, missingCount: 1, filledCount: 1, totalDmft: 3 },
		},
		periodontalChart: { hygieneIndexOHIS: 1.2, cpitnScores: [0, 1, 2, 1, 0, 1], bleedingOnProbing: true },
		treatmentProtocol: [
			"1. Проводниковая анестезия Sol. Ubistesini 1:100000 1.7 мл",
			"2. Препарирование кариозной полости зуба 46",
			"3. Раскрытие полости, экстирпация пульпы из 3 каналов",
			"4. Механическая обработка ProTaper Gold до F2",
			"5. Медобработка 3% NaOCl + 17% EDTA",
			"6. Временная обтурация Calcept под герметичную повязку",
			"7. Назначен повторный визит",
		],
		prescriptions: [{ drugName: "Нимесулид", dosage: "100 мг", frequency: "1 пакетик при боли" }],
		version: 1,
		isDraft: true,
	};
}
