import type { WasteStorageLocationDefinition, WasteStorageLocationId } from "./medicalWasteTypes.js";

export const SANPIN_STORAGE_LOCATIONS: readonly WasteStorageLocationDefinition[] = [
	{
		id: "cabinet_room_temp",
		nameRu: "Кабинет / Накопление при комнатной температуре (+18...+25°C)",
		temperatureRangeRu: "+18...+25°C",
		maxAllowedStorageHours: 24,
		maxAllowedStorageDays: 1,
		appliesToClasses: ["class_A", "class_B", "class_G"],
		descriptionRu: "Накопление необеззараженных отходов класса Б при комнатной температуре допускается не более 24 часов.",
	},
	{
		id: "waste_refrigerator_2_8",
		nameRu: "Специализированный холодильник для отходов (+2...+5°C)",
		temperatureRangeRu: "+2...+5°C (не выше +5°C)",
		maxAllowedStorageHours: 72,
		maxAllowedStorageDays: 3,
		appliesToClasses: ["class_B"],
		descriptionRu: "При температуре не выше +5°C накопление отходов класса Б допускается не более 3 суток (72 часов) per СанПиН 2.1.3684-21 п. 174.",
	},
	{
		id: "waste_freezer_minus_18",
		nameRu: "Морозильная камера для отходов (-18°C)",
		temperatureRangeRu: "-18°C и ниже",
		maxAllowedStorageHours: 720,
		maxAllowedStorageDays: 30,
		appliesToClasses: ["class_B"],
		descriptionRu: "При использовании морозильного оборудования хранение отходов класса Б допускается до 30 суток.",
	},
	{
		id: "central_accumulation_site",
		nameRu: "Площадка временного накопления отходов клиники",
		temperatureRangeRu: "Согласно сезону / помещение с вентиляцией",
		maxAllowedStorageHours: 24,
		maxAllowedStorageDays: 1,
		appliesToClasses: ["class_A", "class_B", "class_G"],
		descriptionRu: "Изолированное помещение для сбора и передачи отходов спецтранспорту с вытяжной вентиляцией.",
	},
];

export function getWasteStorageLocation(id: WasteStorageLocationId): WasteStorageLocationDefinition {
	const found = SANPIN_STORAGE_LOCATIONS.find((l) => l.id === id);
	return found || SANPIN_STORAGE_LOCATIONS[0]!;
}
