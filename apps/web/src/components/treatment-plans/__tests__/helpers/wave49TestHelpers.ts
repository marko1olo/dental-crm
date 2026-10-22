import type { ToothData } from "../../../odontogram/ToothChart";
import type { AppLogicContextType } from "../../../../contexts/AppLogicContext";

export const sampleTeethWave49: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", systemicNotes: "Глубокий кариес" } as ToothData,
	{ id: 36, toothNumber: 36, state: "Missing", systemicNotes: "Отсутствует зуб, показана имплантация" } as ToothData,
	{ id: 46, toothNumber: 46, state: "Pulpitis", systemicNotes: "Острый пульпит" } as ToothData,
];

export const mockAppContextWave49 = {
	dashboard: {
		patients: [
			{
				id: "PAT-WAVE49",
				name: "Смирнова Екатерина Васильевна",
				administrativeProfile: { curatorFullName: "Петрова Анна Сергеевна" },
			},
		],
		serviceCatalog: [],
		clinicSettings: {
			profile: { brandName: "Стоматологическая клиника «ДЕНТЕ»" },
			requisites: { inn: "7701234567" },
		},
		activePatient: {
			id: "PAT-WAVE49",
			name: "Смирнова Екатерина Васильевна",
			phone: "+7 (926) 555-12-34",
			balanceKopecks: 0,
		},
	},
	auth: {},
} as unknown as AppLogicContextType;
