/**
 * apps/web/src/components/sanpin/kraft/kraftToolSetsCatalog.ts
 * Каталог наборов стоматологических инструментов. Мандат 8b: <= 120 строк.
 */

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
			"Зеркало стоматологическое",
			"Зонд угловой остроконечный",
			"Пинцет анатомический",
			"Гладилка двухсторонняя",
			"Штопфер шаровидный",
			"Экскаватор №2",
		],
		criticalNotesRu: "Проверка чистоты насечек пинцета перед упаковкой.",
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
			"Машинные Ni-Ti файлы",
			"Спредеры конические",
			"Плаггеры",
			"Эндодонтическая линейка 30 мм",
			"Пинцет эндодонтический",
		],
		criticalNotesRu: "Контроль целостности витков Ni-Ti файлов.",
	},
	{
		id: "set_surgical_extraction",
		nameRu: "Хирургический набор для удаления",
		shortCode: "SURG-EXT",
		categoryRu: "Хирургия / Экстракция",
		defaultMaterialId: "paper_self_seal_double",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Щипцы экстракционные",
			"Элеватор прямой",
			"Элеватор штыковидный",
			"Кюретажная хирургическая ложка",
			"Рукоятка скальпеля",
			"Иглодержатель",
		],
		criticalNotesRu: "Защита острых щечек элеваторов.",
	},
	{
		id: "set_periodontal_gracey",
		nameRu: "Пародонтологический кюретаж",
		shortCode: "PERIO-GRC",
		categoryRu: "Пародонтология / Профгигиена",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_150x250",
		typicalItemsRu: [
			"Кюреты Грейси 1/2, 7/8, 11/12, 13/14",
			"Скейлер серповидный",
			"Пародонтологический зонд ВОЗ",
		],
		criticalNotesRu: "Защита тонких граней кюрет.",
	},
	{
		id: "set_orthopedic_prep",
		nameRu: "Ортопедический препаровочный набор",
		shortCode: "ORTH-PREP",
		categoryRu: "Ортопедия / Протезирование",
		defaultMaterialId: "paper_plastic_pouch",
		defaultSizeId: "size_100x200",
		typicalItemsRu: [
			"Набор алмазных боров",
			"Ретрактор OptraGate",
			"Пинцет артикуляционный Бауша",
			"Микрометр зуботехнический",
		],
		criticalNotesRu: "Автоклавируемый органайзер боров.",
	},
];

export function getDentalToolSetDefinition(id: string): DentalToolSetDefinition {
	const found = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === id);
	return found || DENTAL_TOOL_SETS_CATALOG[0]!;
}
