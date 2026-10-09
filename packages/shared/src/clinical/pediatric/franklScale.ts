import { z } from "zod";

// ------------------------------------------------------------------------------------------------
// FRANKL BEHAVIOR RATING SCALE (1..4) (ШКАЛА ПОВЕДЕНИЯ ФРАНКЛА)
// ------------------------------------------------------------------------------------------------

export const franklRatingSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
]);

export type FranklRating = z.infer<typeof franklRatingSchema>;

export interface FranklRatingDefinition {
	readonly rating: FranklRating;
	readonly code: string;
	readonly symbol: "--" | "-" | "+" | "++";
	readonly nameRu: string;
	readonly starClassRu: string;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly clinicalSignsRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly badgeBorder: string;
	readonly emoji: string;
	readonly managementStrategiesRu: readonly string[];
	readonly clinicalNotesTemplateRu: string;
}

export const FRANKL_SCALE_DEFINITIONS: Readonly<Record<FranklRating, FranklRatingDefinition>> = {
	1: {
		rating: 1,
		code: "frankl_1_definitely_negative",
		symbol: "--",
		nameRu: "Поведение по Франклу: Класс 1 (Абсолютно негативное)",
		starClassRu: "Класс 1 (Абсолютно негативное)",
		labelRu: "Класс 1 (--) — Абсолютно негативное",
		descriptionRu: "Отказ от лечения, выраженный страх, непрерывный плач, физическое сопротивление или агрессия.",
		clinicalSignsRu: "Ребенок отказывается садиться в кресло, плотно сжимает губы/зубы, кричит, отталкивает врача и инструменты.",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.15)",
		badgeBorder: "rgba(239, 68, 68, 0.35)",
		emoji: "",
		managementStrategiesRu: [
			"Техника «Скажи-Покажи-Сделай» (Tell-Show-Do)",
			"Поэтапная адаптация и ознакомительный визит без инвазивных вмешательств",
			"Контроль голоса (Voice Control) — спокойная, уверенная, монотонная интонация",
			"Пассивное присутствие родителей рядом с креслом для эмоциональной поддержки",
			"Рассмотрение седации закисью азота (N2O-O2) или медикаментозного сна при неотложных показаниях",
		],
		clinicalNotesTemplateRu: "Поведение по Франклу: Класс 1 (Абсолютно негативное). Контакт затруднен из-за высокого уровня тревожности, проведена психологическая адаптация.",
	},
	2: {
		rating: 2,
		code: "frankl_2_negative",
		symbol: "-",
		nameRu: "Поведение по Франклу: Класс 2 (Негативное)",
		starClassRu: "Класс 2 (Негативное)",
		labelRu: "Класс 2 (-) — Негативное",
		descriptionRu: "Неохотное принятие лечения, настороженность, капризы, замкнутость, слезы при манипуляциях.",
		clinicalSignsRu: "Ребенок садится в кресло с уговорами, скован, напряжен, плачет при виде инструментов, но дает провести минимальный осмотр.",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
		badgeBorder: "rgba(245, 158, 11, 0.35)",
		emoji: "",
		managementStrategiesRu: [
			"Техника «Скажи-Покажи-Сделай» (Tell-Show-Do)",
			"Позитивное подкрепление за каждое выполненное микро-действие",
			"Отвлечение внимания (мультфильмы, аудиотреки, яркие игрушки)",
			"Установление стоп-сигнала рукой («подними левую ручку, если захочешь сделать паузу»)",
			"Исключение триггерных слов («укол», «сверлить», «боль», «потерпи»)",
		],
		clinicalNotesTemplateRu: "Поведение по Франклу: Класс 2 (Негативное). Лечение проводится с отвлечением внимания и пошаговой адаптацией Tell-Show-Do.",
	},
	3: {
		rating: 3,
		code: "frankl_3_positive",
		symbol: "+",
		nameRu: "Поведение по Франклу: Класс 3 (Положительное)",
		starClassRu: "Класс 3 (Положительное)",
		labelRu: "Класс 3 (+) — Положительное",
		descriptionRu: "Принятие лечения с осторожностью, выполнение инструкций врача, готовность к сотрудничеству.",
		clinicalSignsRu: "Ребенок спокойно сидит в кресле, выполняет указания врача («открой рот шире»), задает вопросы, контакт продуктивный.",
		badgeColor: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.15)",
		badgeBorder: "rgba(2, 132, 199, 0.35)",
		emoji: "",
		managementStrategiesRu: [
			"Прямое словесное поощрение и похвала за сотрудничество",
			"Демонстрация результатов («посмотри в зеркальце на чистый зубик»)",
			"Игровой формат взаимодействия («считаем зубки», «моем микробиков»)",
			"Мотивация небольшим сувениром, наклейкой или грамотой за смелость в конце приема",
		],
		clinicalNotesTemplateRu: "Поведение по Франклу: Класс 3 (Положительное). Ребенок идет на контакт, аккуратно выполняет инструкции врача.",
	},
	4: {
		rating: 4,
		code: "frankl_4_definitely_positive",
		symbol: "++",
		nameRu: "Поведение по Франклу: Класс 4 (Абсолютно положительное)",
		starClassRu: "Класс 4 (Абсолютно положительное)",
		labelRu: "Класс 4 (++) — Абсолютно положительное",
		descriptionRu: "Отличный раппорт, искренний интерес к процедурам и инструментам, улыбка, полное доверие.",
		clinicalSignsRu: "Ребенок с радостью идет на прием, с интересом рассматривает инструменты, активно общается с врачом, лечение проходит комфортно.",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.15)",
		badgeBorder: "rgba(16, 185, 129, 0.35)",
		emoji: "",
		managementStrategiesRu: [
			"Полное доверительное партнерство",
			"Обучение навыкам самостоятельной гигиены полости рта на моделях",
			"Закрепление позитивного отношения к регулярным профилактическим осмотрам",
			"Вручение диплома смелого пациента",
		],
		clinicalNotesTemplateRu: "Поведение по Франклу: Класс 4 (Абсолютно положительное). Полный контакт, эмоциональный комфорт, высокая мотивация.",
	},
};

export function getFranklDefinition(rating: FranklRating): FranklRatingDefinition {
	return FRANKL_SCALE_DEFINITIONS[rating] ?? FRANKL_SCALE_DEFINITIONS[3];
}
