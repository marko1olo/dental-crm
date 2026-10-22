import type { KraftPackageMaterialId, KraftPackageSizeId } from "@dental/shared";

export interface DentalToolSetDefinition {
	readonly id: string;
	readonly nameRu: string;
	readonly shortCode: string;
	readonly categoryRu: string;
	readonly defaultMaterialId: KraftPackageMaterialId;
	readonly defaultSizeId: KraftPackageSizeId;
	readonly typicalItemsRu: readonly string[];
	readonly criticalNotesRu: string;
}

export const DENTAL_TOOL_SETS_CATALOG: readonly DentalToolSetDefinition[] = [
	{
		id: "set_therapeutic_tray",
		nameRu: "Терапевтический лоток смотровой",
		shortCode: "TER-TRAY",
		categoryRu: "Терапия / Первичный осмотр",
		defaultMaterialId: "paper_self_seal_single",
		defaultSizeId: "size_100x200",
		typicalItemsRu: [
			"Зеркало стоматологическое с ручкой (фронтальное родиевое)",
			"Зонд угловой стоматологический остроконечный",
			"Пинцет анатомический стоматологический",
			"Гладилка двухсторонняя серповидная",
			"Штопфер шаровидный полировочный",
			"Экскаватор стоматологический №2",
		],
		criticalNotesRu: "Проверка чистоты насечек пинцета и резьбового крепления зеркала перед запайкой.",
	},
	{
		id: "set_endodontic_burs",
		nameRu: "Эндодонтический набор боров и файлов",
		shortCode: "ENDO-SET",
		categoryRu: "Эндодонтия / Лечение каналов",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_75x150",
		typicalItemsRu: [
			"К-файлы ручные ассорти (№15–40)",
			"Машинные ротационные Ni-Ti файлы Protaper Gold",
			"Спредеры конические для латеральной конденсации",
			"Плаггеры для вертикальной горячей обтурации",
			"Эндодонтическая металлическая линейка 30 мм",
			"Пинцет эндодонтический с продольным пазом",
		],
		criticalNotesRu: "Контроль целостности витков Ni-Ti файлов. Стерилизация в прозрачном комби-пакете для визуального контроля номеров ISO.",
	},
	{
		id: "set_surgical_extraction",
		nameRu: "Хирургический набор для удаления",
		shortCode: "SURG-EXT",
		categoryRu: "Хирургия / Экстракция зубов",
		defaultMaterialId: "paper_self_seal_double",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Щипцы экстракционные верхние универсальные",
			"Щипцы байонетные (корневые) нижние",
			"Элеватор прямой Бена с рифленой рукояткой",
			"Элеватор штыковидный Леклюза",
			"Кюретажная хирургическая ложка Лукаса",
			"Рукоятка скальпеля №3 с замком под лезвия 12/15",
			"Иглодержатель сосудистый Матье",
		],
		criticalNotesRu: "Двойная упаковка обязательна для предотвращения прокола крафт-бумаги острыми щечками элеваторов.",
	},
	{
		id: "set_periodontal_gracey",
		nameRu: "Пародонтологический кюретаж Грейси",
		shortCode: "PERIO-GRC",
		categoryRu: "Пародонтология / Профгигиена",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Кюрета Грейси 1/2 (для фронтальных зубов)",
			"Кюрета Грейси 7/8 (для премоляров и щечных поверхностей)",
			"Кюрета Грейси 11/12 (для мезиальных поверхностей моляров)",
			"Кюрета Грейси 13/14 (для дистальных поверхностей моляров)",
			"Скейлер серповидный двухсторонний",
			"Пародонтологический зонд ВОЗ с шариком 0.5 мм",
		],
		criticalNotesRu: "Защита тонких режущих граней кюрет силиконовыми колпачками перед упаковкой.",
	},
	{
		id: "set_orthopedic_prep",
		nameRu: "Ортопедический препаровочный набор",
		shortCode: "ORTH-PREP",
		categoryRu: "Ортопедия / Протезирование",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_100x200",
		typicalItemsRu: [
			"Набор алмазных боров для препарирования под коронки/виниры (торпедовидные, конусные, маркеры глубины)",
			"Ретрактор губ и щек OptraGate",
			"Пинцет артикуляционный Бауша для копирки",
			"Штангенциркуль зуботехнический (микрометр)",
			"Зонд ретракционный тонкий для укладки нити",
		],
		criticalNotesRu: "Упаковка боров в специальной автоклавируемой подставке-органайзере.",
	},
];
