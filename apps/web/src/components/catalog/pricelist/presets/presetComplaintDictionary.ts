/**
 * DENTE Dental CRM — Clinical Verbal Complaint Dictionary
 */

import type { Order804nCategory } from "./types";

export const COMPLAINT_KEYWORDS_MAP: Record<
	string,
	{ category: Order804nCategory; tags: string[] }
> = {
	боль: { category: "therapy", tags: ["кариес", "пульпит", "периодонтит"] },
	"острая боль": { category: "therapy", tags: ["пульпит", "эндодонтия", "анестезия"] },
	ноет: { category: "therapy", tags: ["кариес", "пломба"] },
	дырка: { category: "therapy", tags: ["кариес", "пломба"] },
	скол: { category: "therapy", tags: ["реставрация", "коронка", "винир"] },
	откололся: { category: "therapy", tags: ["реставрация", "коронка"] },
	"зуб мудрости": { category: "surgery", tags: ["удаление", "восьмерка", "ретинированный"] },
	удалить: { category: "surgery", tags: ["удаление", "хирургия"] },
	вырвать: { category: "surgery", tags: ["удаление"] },
	имплант: { category: "surgery", tags: ["имплантация", "имплант"] },
	кровоточат: { category: "hygiene", tags: ["гигиена", "чистка", "десна"] },
	камень: { category: "hygiene", tags: ["уз-чистка", "зубной камень", "скейлинг"] },
	налет: { category: "hygiene", tags: ["air-flow", "чистка", "полировка"] },
	"желтые зубы": { category: "hygiene", tags: ["отбеливание", "чистка"] },
	коронка: { category: "orthopedics", tags: ["коронка", "протезирование"] },
	протез: { category: "orthopedics", tags: ["протезирование", "протез"] },
	виниры: { category: "orthopedics", tags: ["винир", "эстетика"] },
	"кривые зубы": { category: "orthodontics", tags: ["брекеты", "элайнеры", "прикус"] },
	прикус: { category: "orthodontics", tags: ["ортодонтия", "прикус"] },
	снимок: { category: "radiology", tags: ["снимок", "визиограф", "рентген", "оптг"] },
	консультация: { category: "consultation", tags: ["консультация", "осмотр"] },
};
