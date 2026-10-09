import type { ToothClinicalServicePayload } from "@dental/shared";

export type ClinicalTabType = "diagnosis" | "therapy" | "endo" | "surgery";

export interface ToothClinicalProtocolService {
	serviceId: string;
	code804n: string;
	name: string;
	priceRub: number;
	quantity?: number;
	category?: string;
}

export interface ToothClinicalProtocol {
	key: "caries" | "pulpitis" | "extraction" | "hygiene";
	title: string;
	diagnosisCode: string;
	diagnosisText: string;
	toothState: "treatment" | "done" | "missing" | "watch";
	totalPriceRub: number;
	services: ToothClinicalProtocolService[];
}

export const TOOTH_CLINICAL_PROTOCOLS: Record<
	"caries" | "pulpitis" | "extraction" | "hygiene",
	ToothClinicalProtocol
> = {
	caries: {
		key: "caries",
		title: "Кариес",
		diagnosisCode: "K02.1",
		diagnosisText: "K02.1 Кариес дентина: препарирование, пломба светового отверждения",
		toothState: "done",
		totalPriceRub: 6700,
		services: [
			{
				serviceId: "anesth-inf",
				code804n: "A16.07.004",
				name: "Анестезия инфильтрационная / проводниковая",
				priceRub: 1200,
				category: "anesthesia",
			},
			{
				serviceId: "prep-cavity",
				code804n: "A16.07.002",
				name: "Препарирование кариозной полости",
				priceRub: 1000,
				category: "therapy",
			},
			{
				serviceId: "filling-light",
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой световой",
				priceRub: 4500,
				category: "therapy",
			},
		],
	},
	pulpitis: {
		key: "pulpitis",
		title: "Пульпит",
		diagnosisCode: "K04.0",
		diagnosisText: "K04.0 Острый пульпит: экстирпация, эндодонтия каналов, пломба",
		toothState: "treatment",
		totalPriceRub: 12700,
		services: [
			{
				serviceId: "anesth-inf",
				code804n: "A16.07.004",
				name: "Анестезия инфильтрационная / проводниковая",
				priceRub: 1200,
				category: "anesthesia",
			},
			{
				serviceId: "prep-canals",
				code804n: "A16.07.030",
				name: "Инструментальная и медикаментозная обработка корневого канала",
				priceRub: 3500,
				category: "endo",
			},
			{
				serviceId: "obtur-canals",
				code804n: "A16.07.008",
				name: "Пломбирование корневого канала",
				priceRub: 3500,
				category: "endo",
			},
			{
				serviceId: "filling-light",
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой световой",
				priceRub: 4500,
				category: "therapy",
			},
		],
	},
	extraction: {
		key: "extraction",
		title: "Удаление",
		diagnosisCode: "K08.1",
		diagnosisText: "K08.1 Удаление зуба по клиническим показаниям, ревизия лунки",
		toothState: "missing",
		totalPriceRub: 5500,
		services: [
			{
				serviceId: "anesth-inf",
				code804n: "A16.07.004",
				name: "Анестезия инфильтрационная / проводниковая",
				priceRub: 1200,
				category: "anesthesia",
			},
			{
				serviceId: "extract-perm",
				code804n: "A16.07.001",
				name: "Удаление постоянного зуба",
				priceRub: 3500,
				category: "surgery",
			},
			{
				serviceId: "hemostasis-socket",
				code804n: "A16.07.001.002",
				name: "Остановка луночного кровотечения / местный гемостаз",
				priceRub: 800,
				category: "surgery",
			},
		],
	},
	hygiene: {
		key: "hygiene",
		title: "Гигиена",
		diagnosisCode: "K05.3",
		diagnosisText: "K05.3 Хронический пародонтит: профессиональная гигиена и УЗ-скейлинг",
		toothState: "done",
		totalPriceRub: 7800,
		services: [
			{
				serviceId: "prof-hygiene",
				code804n: "A16.07.051",
				name: "Профессиональная гигиена полости рта и зубов",
				priceRub: 4500,
				category: "hygiene",
			},
			{
				serviceId: "scaling-us",
				code804n: "A16.07.020",
				name: "Ультразвуковое удаление зубных отложений",
				priceRub: 2500,
				category: "hygiene",
			},
			{
				serviceId: "polish-paste",
				code804n: "A16.07.053",
				name: "Полировка зубов пастами",
				priceRub: 800,
				category: "hygiene",
			},
		],
	},
};

export type ToothSurfaceKey = "M" | "O" | "D" | "B" | "L";

export interface ToothSurfaceInfo {
	key: ToothSurfaceKey;
	label: string;
	fullRu: string;
	description: string;
}

export const TOOTH_SURFACES_MODBL: ToothSurfaceInfo[] = [
	{
		key: "M",
		label: "M",
		fullRu: "Медиальная",
		description: "Аппроксимальная передняя контактная поверхность",
	},
	{
		key: "O",
		label: "O",
		fullRu: "Окклюзионная",
		description: "Жевательная поверхность / режущий край",
	},
	{
		key: "D",
		label: "D",
		fullRu: "Дистальная",
		description: "Аппроксимальная задняя контактная поверхность",
	},
	{
		key: "B",
		label: "B",
		fullRu: "Вестибулярная",
		description: "Щечная / губная поверхность",
	},
	{
		key: "L",
		label: "L",
		fullRu: "Язычная",
		description: "Язычная / нёбная поверхность",
	},
];

export interface BlackCavityPreset {
	code: string;
	name: string;
	surfaces: string[];
}

export const BLACK_CAVITY_PRESETS: BlackCavityPreset[] = [
	{ code: "O", name: "Класс I (Фиссуры/окклюзия)", surfaces: ["O"] },
	{ code: "MO", name: "Класс II (Медиально-окклюзионная)", surfaces: ["M", "O"] },
	{ code: "OD", name: "Класс II (Окклюзионно-дистальная)", surfaces: ["O", "D"] },
	{ code: "MOD", name: "Класс II (Медио-окклюзионно-дистальная)", surfaces: ["M", "O", "D"] },
	{ code: "V", name: "Класс V (Пришеечная вестибулярная)", surfaces: ["B"] },
];

export interface ToothClinicalTestsState {
	eodMicroAmperes?: number | null;
	percussion?: "negative" | "positive_vertical" | "positive_horizontal" | null;
	coldTest?: "norm" | "hypersensitive" | "negative" | "delayed_pain" | null;
	pocketDepthMm?: number | null;
	gumRecessionMm?: number | null;
	mobilityGrade?: "0" | "I" | "II" | "III" | "IV" | null;
	palpation?: "painless" | "painful" | null;
}

export interface VisitClinicalToothTabsProps {
	activeTab: ClinicalTabType;
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	code: string;
	state: string;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	selectedSurfaces: string[];
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	appendToEMKField: (field: string, text: string) => void;
	closeClinicalModal: () => void;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[] | undefined;
	onAddServiceToTooth?: ((service: ToothClinicalServicePayload) => void) | undefined;
}
