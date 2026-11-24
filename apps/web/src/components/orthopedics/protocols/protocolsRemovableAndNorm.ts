import type { OrthopedicProtocolPreset, OrthopedicServiceItem } from "./orthopedicProtocolTypes.js";

const REMOVABLE_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.035", nameRu: "Протезирование частичными съемными пластиночными протезами (термопластический / нейлоновый)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 45000, priceRub: 45000 },
	{ code: "A16.07.023", nameRu: "Протезирование зубов полными съемными пластиночными протезами", stageKind: "stage_3_orthopedics", suggestedPriceRub: 50000, priceRub: 50000 },
	{ code: "A02.07.010", nameRu: "Определение центрального соотношения челюстей восковыми базисами с валиками", stageKind: "stage_3_orthopedics", suggestedPriceRub: 4000, priceRub: 4000 },
];

const NORM_OCCLUSION_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A01.07.003", nameRu: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1500, priceRub: 1500 },
	{ code: "A02.07.010", nameRu: "Исследование зубочелюстной системы с помощью артикулятора / окклюдограммы", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1000, priceRub: 1000 },
];

export const ORTHOPEDIC_REMOVABLE_AND_NORM_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_removable_prosthetics",
		titleRu: "Съёмное протезирование (частичный/полный протез безакриловый/нейлоновый, функциональные слепки, валики, сдача)",
		shortLabel: "Съемное протезирование",
		category: "removable_prosthetics",
		defaultIcd10: "K08.4",
		defaultIcd10Label: "Частичная потеря зубов",
		anamnesis: "Жалобы на частичную или полную утрату зубов, нарушение жевания и эстетики улыбки.",
		objective: "Слизистая оболочка протезного ложа умеренно податлива, бледно-розовая, без язв. Альвеолярные отростки умеренно атрофированы.",
		treatment: "Снятие анатомических оттисков. Определение центрального соотношения челюстей валиками. Проверка восковой конструкции с гарнитурными зубами анатомической формы. Наложение и сдача готового съемного термопластического протеза. Обучение гигиене.",
		recommendations: "Ношение протеза в период адаптации. Очищение мягкой щеткой и таблетками. Явка на коррекцию при наминах.",
		clinicalServices: REMOVABLE_SERVICES,
		services: REMOVABLE_SERVICES,
		order804nServices: REMOVABLE_SERVICES,
	},
	{
		id: "ortho_norm_occlusion",
		titleRu: "Ортопедический осмотр: физиологический прикус (ортогнатический), окклюзия стабильна, патологии ВНЧС не выявлено (Норма)",
		shortLabel: "Ортопедический осмотр (Норма)",
		category: "consultation_norm",
		defaultIcd10: "Z01.2",
		defaultIcd10Label: "Стоматологическое обследование (Здоров / Физиологическая окклюзия)",
		anamnesis: "Плановый первичный / профилактический ортопедический осмотр. Жалоб нет. Соматически здоров.",
		objective: "Лицо симметрично. Открывание рта свободное. Пальпация мышц и ВНЧС безболезненна. Прикус ортогнатический.",
		treatment: "Комплексное клиническое ортопедическое обследование: пальпация мускулатуры, оценка траектории нижней челюсти, окклюдограмма артикуляционной бумагой 40 мкм. В лечении не нуждается.",
		recommendations: "Профилактический контрольный осмотр 1 раз в 12 месяцев. Соблюдение гигиены полости рта.",
		clinicalServices: NORM_OCCLUSION_SERVICES,
		services: NORM_OCCLUSION_SERVICES,
		order804nServices: NORM_OCCLUSION_SERVICES,
	},
];
