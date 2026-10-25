/**
 * apps/web/src/components/sanpin/kraft/kraftTrayConfigs.ts
 * Конфигурация стандартных наборов лотков. Мандат 8b: <= 120 строк.
 */

export interface StandardTrayConfig {
	readonly id: string;
	readonly nameRu: string;
	readonly items: readonly string[];
	readonly code: string;
}

export const STANDARD_TRAY_CONFIGS: Record<"therapy" | "surgery" | "endo", StandardTrayConfig> = {
	therapy: {
		id: "set_therapeutic_tray",
		nameRu: "Стандартный смотровой лоток (Зеркало, зонд, пинцет, гладилка)",
		items: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический", "Штопфер-гладилка", "Экскаватор"],
		code: "THER",
	},
	surgery: {
		id: "set_surgical_standard",
		nameRu: "Хирургический набор экстракционный",
		items: ["Щипцы байонетные", "Элеватор прямой", "Кюрета хирургическая", "Иглодержатель"],
		code: "SURG",
	},
	endo: {
		id: "set_endodontic_files",
		nameRu: "Эндодонтический набор файлов",
		items: ["Эндобокс", "K-файлы #15-40", "Спредер", "Плаггер", "Линейка"],
		code: "ENDO",
	},
};
